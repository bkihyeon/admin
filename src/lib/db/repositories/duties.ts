import { sql } from "drizzle-orm";
import { buildCards } from "@/lib/duties/cards";
import type {
  CleaningDuty,
  DutyAssignment,
  DutyWithVersionMeta,
  OfficeFreeEmployees,
  RevealState,
} from "@/lib/types";
import { db } from "../client";
import { generateId } from "../id";

// db.execute() raw row (snake_case) → CleaningDuty
function rowToDuty(row: Record<string, unknown>): CleaningDuty {
  return {
    id: row.id as string,
    month: row.month as string,
    officeId: row.office_id as string | null,
    version: Number(row.version),
    assignments: row.assignments as DutyAssignment[],
    freeEmployee: row.free_employee as OfficeFreeEmployees | null,
    revealState: row.reveal_state as RevealState[],
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

// COUNT(*)는 bigint라 드라이버가 string으로 반환 → Number 강제
function rowToMeta(row: Record<string, unknown>): DutyWithVersionMeta {
  return {
    duty: rowToDuty(row),
    totalVersions: Number(row.total_versions),
    latestVersion: Number(row.max_version),
  };
}

/**
 * (month, office)의 한 버전 조회. version 생략 시 최신.
 * window 함수는 바깥 WHERE보다 먼저 전체 매칭 row를 대상으로 평가되므로
 * total/max가 특정 버전 필터에 오염되지 않는다.
 */
export async function getDutyVersion(
  month: string,
  officeId: string,
  version?: number
): Promise<DutyWithVersionMeta | null> {
  const result = await db.execute(sql`
    SELECT * FROM (
      SELECT *,
        COUNT(*) OVER () AS total_versions,
        MAX(version) OVER () AS max_version
      FROM duties
      WHERE month = ${month} AND office_id = ${officeId}
    ) v
    WHERE version = COALESCE(${version ?? null}::int, max_version)
  `);
  const row = result.rows[0] as Record<string, unknown> | undefined;
  return row ? rowToMeta(row) : null;
}

/**
 * 이력 피드: 월별 "최신 완료 버전" 1건씩 (month DESC, before 커서).
 * 재뽑기가 진행 중이어도 직전 완료본이 피드에 남는다.
 * 3중 래핑으로 window(전체 버전 대상) → 완료 필터 → DISTINCT ON 순서를 강제.
 */
export async function listLatestCompletedDutiesPage(input: {
  officeId: string;
  limit: number;
  before?: string;
}): Promise<DutyWithVersionMeta[]> {
  const beforeFilter = input.before
    ? sql`WHERE month < ${input.before}`
    : sql``;
  const result = await db.execute(sql`
    SELECT * FROM (
      SELECT DISTINCT ON (month) * FROM (
        SELECT d.*,
          COUNT(*) OVER (PARTITION BY month) AS total_versions,
          MAX(version) OVER (PARTITION BY month) AS max_version,
          (jsonb_array_length(reveal_state) > 0 AND NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements(reveal_state) elem
            WHERE (elem->>'isFlipped')::boolean IS NOT TRUE
          )) AS is_complete
        FROM duties d
        WHERE office_id = ${input.officeId}
      ) v
      WHERE is_complete
      ORDER BY month, version DESC
    ) latest
    ${beforeFilter}
    ORDER BY month DESC
    LIMIT ${input.limit}
  `);
  return (result.rows as Record<string, unknown>[]).map(rowToMeta);
}

/**
 * 새 버전 INSERT (append-only). 이전 버전은 절대 덮어쓰지 않는다.
 * INSERT...SELECT MAX+1은 단일 statement라 Neon HTTP에서도 원자적.
 * 동시 뽑기 race는 (month, office_id, version) UNIQUE 위반(23505)으로 감지 → 재시도.
 * upsert와 달리 어느 쪽 결과도 소실되지 않는다.
 */
export async function createDutyVersion(input: {
  month: string;
  officeId: string;
  assignments: DutyAssignment[];
  freeEmployee: OfficeFreeEmployees | null;
}): Promise<DutyWithVersionMeta> {
  const cards = buildCards({
    assignments: input.assignments,
    freeEmployee: input.freeEmployee,
  });
  const initialRevealState: RevealState[] = cards.map((_, i) => ({
    cardIndex: i,
    isFlipped: false,
    flippedAt: null,
  }));

  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; ; attempt++) {
    try {
      const result = await db.execute(sql`
        INSERT INTO duties (id, month, office_id, version, assignments, free_employee, reveal_state)
        SELECT ${generateId()}, ${input.month}, ${input.officeId},
          COALESCE(MAX(version), 0) + 1,
          ${JSON.stringify(input.assignments)}::jsonb,
          ${input.freeEmployee ? JSON.stringify(input.freeEmployee) : null}::jsonb,
          ${JSON.stringify(initialRevealState)}::jsonb
        FROM duties
        WHERE month = ${input.month} AND office_id = ${input.officeId}
        RETURNING *
      `);
      const duty = rowToDuty(result.rows[0] as Record<string, unknown>);
      // DELETE 경로가 없어 버전은 1..N 연속 → 방금 넣은 버전이 곧 총 개수이자 최신
      return { duty, totalVersions: duty.version, latestVersion: duty.version };
    } catch (err) {
      if (isUniqueViolation(err) && attempt < MAX_ATTEMPTS) continue;
      throw err;
    }
  }
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}

export type FlipCardResult =
  | { kind: "flipped"; duty: DutyWithVersionMeta }
  | { kind: "idempotent"; duty: DutyWithVersionMeta }
  | { kind: "invalid-index" }
  | { kind: "no-row" };

/** 카드 공개. 항상 최신 버전만 타깃 (서브쿼리 포함 단일 statement = 동일 스냅샷). */
export async function flipCard(input: {
  month: string;
  officeId: string;
  cardIndex: number;
}): Promise<FlipCardResult> {
  if (!Number.isInteger(input.cardIndex) || input.cardIndex < 0) {
    return { kind: "invalid-index" };
  }
  const idxStr = String(input.cardIndex);
  const nowIso = new Date().toISOString();
  const result = await db.execute(sql`
    UPDATE duties
    SET reveal_state = jsonb_set(
      jsonb_set(
        reveal_state,
        ARRAY[${idxStr}, 'isFlipped'],
        'true'::jsonb,
        false
      ),
      ARRAY[${idxStr}, 'flippedAt'],
      to_jsonb(${nowIso}::text),
      false
    )
    WHERE id = (
      SELECT id FROM duties
      WHERE month = ${input.month} AND office_id = ${input.officeId}
      ORDER BY version DESC
      LIMIT 1
    )
      AND ${input.cardIndex}::int < jsonb_array_length(reveal_state)
      AND ((reveal_state -> ${input.cardIndex}::int ->> 'isFlipped')::boolean IS NOT TRUE)
    RETURNING *
  `);
  if (result.rows.length > 0) {
    const duty = rowToDuty(result.rows[0] as Record<string, unknown>);
    // UPDATE 타깃이 최신 버전이므로 그 version이 곧 최신
    return {
      kind: "flipped",
      duty: { duty, totalVersions: duty.version, latestVersion: duty.version },
    };
  }
  // 0 row affected: row 없음 / idx 범위 밖 / 이미 flipped 중 하나. SELECT로 분기.
  const current = await getDutyVersion(input.month, input.officeId);
  if (!current) return { kind: "no-row" };
  if (input.cardIndex >= current.duty.revealState.length)
    return { kind: "invalid-index" };
  return { kind: "idempotent", duty: current };
}
