import { neon } from "@neondatabase/serverless";
import { createDutyItem } from "@/lib/db/repositories/duty-items";
import { createEmployee } from "@/lib/db/repositories/employees";
import { createOffice } from "@/lib/db/repositories/offices";
import type { Office } from "@/lib/types";

// =====================================================
// Safety guard: prod DB 보호 (blocker)
// =====================================================
// Next dev 서버는 webServer.env로 DATABASE_URL이 주입되지만,
// fixture(테스트 프로세스)는 dotenv-cli + .env.test로 DATABASE_URL을 받는다.
// 둘 다 'test' 키워드가 포함된 URL이어야만 진행한다.
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    `[E2E SAFETY] DATABASE_URL is not set. ` +
      `Set DATABASE_URL_TEST in .env.test (see .env.test.example).`
  );
}
// Neon endpoint hostname은 branch 이름과 별개라 connection string에 'test'가
// 자동 포함되지 않음. 다음 둘 중 하나가 만족되어야 진행:
//   (1) URL에 'test' 키워드가 있거나 (옵션: branch endpoint/db명을 'test*'로 지은 경우)
//   (2) E2E_DB_CONFIRMED=1 토큰을 .env.test에 명시한 경우
// prod에는 토큰이 없으므로 자연스럽게 차단됨.
const confirmed = process.env.E2E_DB_CONFIRMED === "1";
if (!url.includes("test") && !confirmed) {
  throw new Error(
    `[E2E SAFETY] refusing to run e2e: DATABASE_URL does not contain 'test' keyword ` +
      `and E2E_DB_CONFIRMED is not set. ` +
      `Either use a test branch URL or add E2E_DB_CONFIRMED=1 to .env.test ` +
      `to explicitly confirm this is a non-prod DB. ` +
      `(URL host/credentials intentionally not echoed.)`
  );
}

const sql = neon(url);

/**
 * 모든 도메인 테이블을 한 번에 비운다.
 * Neon HTTP 드라이버는 트랜잭션 지원이 제한적이라 단일 문장으로 처리.
 * recycling_state는 id=1 singleton — RESTART IDENTITY 불필요.
 */
export async function truncateAll(): Promise<void> {
  await sql`TRUNCATE TABLE duties, duty_items, employees, offices, recycling_state CASCADE`;
}

export async function seedOffice(name: string) {
  return createOffice(name);
}

export async function seedEmployees(
  officeId: string,
  names: string[]
): Promise<void> {
  for (const name of names) {
    await createEmployee({ name, officeId });
  }
}

export async function seedDutyItems(
  officeId: string,
  items: { name: string; requiredCount: number }[]
): Promise<void> {
  for (const item of items) {
    await createDutyItem({
      name: item.name,
      requiredCount: item.requiredCount,
      officeId,
    });
  }
}

/**
 * AC-15 검증용: revealState 길이를 의도적으로 카드 수와 다르게 만든다.
 * length-mismatch row가 GET 응답에서 500을 반환하는지 검증하기 위해 사용.
 * 길이 가드는 최신 버전 조회에만 적용되므로 최신 버전만 corrupt.
 */
export async function corruptRevealState(
  month: string,
  officeId: string
): Promise<void> {
  await sql`
    UPDATE duties
    SET reveal_state = '[{"cardIndex":0,"isFlipped":false,"flippedAt":null}]'::jsonb
    WHERE id = (
      SELECT id FROM duties
      WHERE month = ${month} AND office_id = ${officeId}
      ORDER BY version DESC
      LIMIT 1
    )
  `;
}

export type { Office };
