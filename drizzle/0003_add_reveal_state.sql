-- 실시간 멀티유저 카드 뽑기 모드: duties.reveal_state 컬럼 추가 + legacy row backfill.
--
-- ALTER TABLE ADD COLUMN ... DEFAULT '[]'은 PG12+ 즉시 채움 → 기존 row의 reveal_state를 모두 '[]'로 만든다.
-- 이후 UPDATE로 buildCards 평탄화 규칙(assignedEmployeeNames 합 + freeEmployee.employeeNames)을
-- SQL 안에서 동일 적용해 카드 수만큼 isFlipped=true revealState row를 채운다 — 기존 데이터를 "완료된 게임"으로 고정.
--
-- 멱등성: 두 번째 실행 시 reveal_state가 이미 채워져 있어 WHERE reveal_state = '[]' 매치가 0건.
-- 새 게임은 upsertDuty가 INSERT 시점에 카드 수만큼 [{isFlipped:false, ...}]를 채워 넣음.

ALTER TABLE "duties" ADD COLUMN "reveal_state" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint

UPDATE duties SET reveal_state = (
  WITH assigned_count AS (
    SELECT COALESCE(SUM(jsonb_array_length(elem->'assignedEmployeeNames')), 0)::int AS c
    FROM jsonb_array_elements(assignments) AS elem
  ),
  free_count AS (
    SELECT CASE
      WHEN free_employee IS NULL THEN 0
      ELSE COALESCE(jsonb_array_length(free_employee->'employeeNames'), 0)
    END::int AS c
  ),
  total AS (
    SELECT (SELECT c FROM assigned_count) + (SELECT c FROM free_count) AS n
  )
  SELECT COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'cardIndex', i - 1,
          'isFlipped', true,
          'flippedAt', NULL
        )
      )
      FROM generate_series(1, (SELECT n FROM total)) AS i
    ),
    '[]'::jsonb
  )
)
WHERE reveal_state = '[]'::jsonb;
