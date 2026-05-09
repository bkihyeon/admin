-- 정규화 마이그레이션: duties (month UNIQUE) → (month, office_id) UNIQUE NULLS NOT DISTINCT.
-- swap-rename 패턴으로 새 테이블에 데이터를 펼친 뒤 atomic rename.
-- generated drizzle-kit ALTER 형식은 데이터 마이그레이션이 없어 정보 손실 — 본 form으로 교체.
--
-- 실행 사전조건: 트래픽 0 (maintenance window). middleware.ts가 503 토글 ON이거나
--   T2(swap-rename Neon HTTP probe) PASS로 단일 트랜잭션 가능 확인 (T2 결과: PASS).
-- 멱등성: DROP TABLE IF EXISTS duties_new가 중도 실패 후 재실행 보장.

-- pgcrypto 확장 명시 enable. PG 13+ core에 gen_random_uuid()가 빌트인이지만,
-- 본 코드베이스가 pgcrypto를 한 번도 enable한 적이 없으므로 첫 statement로 명시 호출한다.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";--> statement-breakpoint

-- 멱등 시작
DROP TABLE IF EXISTS duties_new;--> statement-breakpoint

CREATE TABLE duties_new (
  id text PRIMARY KEY,
  month text NOT NULL,
  office_id text,
  assignments jsonb NOT NULL,
  free_employee jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

-- step 1: assignments 펼치기. (month, officeId)당 GROUP BY로 묶음.
-- id는 pgcrypto의 gen_random_uuid()::text 8자리 슬라이스 — 기존 generateId() 컨벤션 유지.
-- 단일 row 스키마에서 month당 created_at은 1개이므로 GROUP BY에 d.created_at 포함해도 정합.
INSERT INTO duties_new (id, month, office_id, assignments, free_employee, created_at)
SELECT
  substring(gen_random_uuid()::text for 8) AS id,
  d.month,
  elem->>'officeId' AS office_id,
  jsonb_agg(elem) AS assignments,
  NULL::jsonb AS free_employee,
  d.created_at
FROM duties d, jsonb_array_elements(d.assignments) elem
GROUP BY d.month, elem->>'officeId', d.created_at;--> statement-breakpoint

-- UNIQUE 제약을 step 2 이전에 생성 (step 2의 ON CONFLICT가 이 제약에 의존, PG15+ NULLS NOT DISTINCT)
ALTER TABLE duties_new
  ADD CONSTRAINT duties_month_office_unique UNIQUE NULLS NOT DISTINCT (month, office_id);--> statement-breakpoint

-- step 2: free_employees 펼쳐 (month, officeId)별로 free_employee 단수 객체로 확정.
-- 같은 (month, officeId)면 step 1 row에 free_employee를 채우고, 없으면 신규 row 생성.
INSERT INTO duties_new (id, month, office_id, assignments, free_employee, created_at)
SELECT
  substring(gen_random_uuid()::text for 8) AS id,
  d.month,
  felem->>'officeId' AS office_id,
  '[]'::jsonb AS assignments,
  felem AS free_employee,
  d.created_at
FROM duties d, jsonb_array_elements(d.free_employees) felem
ON CONFLICT (month, office_id) DO UPDATE
SET free_employee = EXCLUDED.free_employee;--> statement-breakpoint

CREATE INDEX duties_month_idx ON duties_new (month);--> statement-breakpoint
CREATE INDEX duties_office_idx ON duties_new (office_id);--> statement-breakpoint

-- step 3: swap-rename. T2 PASS 결과 — Neon HTTP가 단일 ALTER RENAME을 atomic 처리.
-- 트래픽 0 (maintenance window) 하에서만 실행. legacy 테이블은 롤백 안전망.
ALTER TABLE duties RENAME TO duties_legacy_20260509;--> statement-breakpoint
ALTER TABLE duties_new RENAME TO duties;
