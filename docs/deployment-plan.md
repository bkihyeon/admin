# 원격 배포 마이그레이션 플랜

> **목표**: 로컬 JSON 파일 기반 데이터를 원격 배포 가능한 구조로 전환
> **선택 스택**: Vercel (호스팅) + Neon Postgres (DB) + Drizzle ORM
> **작성일**: 2026-04-15

---

## 1. 배경

현재 `src/lib/storage.ts`는 `fs.writeFileSync` 기반의 파일 저장을 사용한다. Vercel·Netlify 등 서버리스 환경은 파일시스템이 ephemeral(요청마다 초기화)이므로 그대로 배포하면 데이터가 영속되지 않는다. 따라서 외부 영속 스토리지로 분리해야 한다.

## 2. 스택 선정 근거

### 왜 Vercel + Neon Postgres인가

1. **데이터 모델이 관계형에 맞음**
   - `employees`, `duty-items`, `duties`, `recycling` 4개 엔티티
   - `DutyAssignment`가 사원·품목을 참조하는 명확한 FK 구조
   - `types.ts`가 이미 사실상 스키마 역할
2. **Next.js 공식 스택 정렬** — Vercel이 Neon을 퍼스트파티로 채택, 대시보드 원클릭 연결
3. **무료 한도가 넉넉**
   - Neon Free: 0.5 GB 저장, 브랜치 10개, **일시정지 없음**
   - 예상 데이터량은 수백 KB 수준 → 한도의 0.1% 미만
4. **타입 안전성 향상** — Drizzle ORM으로 컴파일 타임 쿼리 검증
5. **확장 경로 확보** — 추후 인증·집계·리포트 기능 추가 시 SQL이 유리

### 대안 비교

| 방안 | 작업량 | 쿼리 능력 | 확장성 | 비고 |
|---|---|---|---|---|
| **1. Neon Postgres (채택)** | 중간 | SQL 전체 | 높음 | 장기 최적 |
| 2. Supabase | 중간 | SQL 전체 | 높음 | 7일 미사용 시 pause |
| 3. Vercel Blob | 최소 | 전체 로드만 | 낮음 | 단기 편의 최상 |
| 4. Cloudflare D1 | 중간 | SQL | 높음 | 어댑터 제약 |
| 5. Railway Volume | 없음 | 파일 그대로 | 낮음 | 실질 무료, 콜드스타트 |
| 6. GitHub as DB | 최소 | 없음 | 매우 낮음 | 실험용 |

---

## 3. 타겟 아키텍처

```
┌─────────────┐      ┌──────────────┐      ┌──────────────┐
│   Browser   │ ───▶ │ Vercel Edge  │ ───▶ │ Neon Postgres│
│  (Next.js)  │      │ (App Router) │      │   (Serverless│
└─────────────┘      └──────────────┘      │    Postgres) │
                            │               └──────────────┘
                            ▼
                     Drizzle ORM
                     (쿼리 빌더)
```

- API Route Handlers는 그대로 유지, 내부 구현만 교체
- `src/lib/storage.ts` → `src/lib/db/` 디렉토리로 이관
- 환경변수 `DATABASE_URL`로 연결 (Vercel 통합 시 자동 주입)

---

## 4. 데이터베이스 스키마

```sql
CREATE TABLE employees (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE duty_items (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  required_count  INTEGER NOT NULL CHECK (required_count > 0)
);

CREATE TABLE duties (
  id                   TEXT PRIMARY KEY,
  month                TEXT NOT NULL UNIQUE,       -- "YYYY-MM"
  assignments          JSONB NOT NULL,             -- DutyAssignment[]
  free_employee_names  JSONB NOT NULL DEFAULT '[]',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE recycling_state (
  id              INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  current_index   INTEGER NOT NULL DEFAULT 0,
  schedule        JSONB NOT NULL DEFAULT '[]',     -- RecyclingWeek[]
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 설계 결정
- **`duties.assignments`를 JSONB로 유지**: 구조가 월 단위로 완결형이라 정규화 이득이 작음. 조회·수정은 월 단위 전체가 대부분.
- **`recycling_state`는 단일 행**: `id = 1` 제약으로 singleton 강제. 기존 JSON 파일 하나 구조와 동일.
- **`employees`, `duty_items`는 정규화**: 개별 CRUD가 있고 참조 무결성이 필요.

---

## 5. 마이그레이션 단계

### Phase 1 — 로컬 개발 환경 준비 (30분)
- [ ] Neon 프로젝트 생성, 개발용 브랜치 `dev` 발급
- [ ] `.env.local`에 `DATABASE_URL` 추가, `.gitignore` 확인
- [ ] 의존성 추가
  ```bash
  pnpm add drizzle-orm @neondatabase/serverless
  pnpm add -D drizzle-kit
  ```

### Phase 2 — 스키마·ORM 레이어 (1시간)
- [ ] `src/lib/db/schema.ts` 작성 (위 스키마를 Drizzle로 정의)
- [ ] `src/lib/db/client.ts` 작성 (Neon HTTP 드라이버)
- [ ] `drizzle.config.ts` 작성
- [ ] 초기 마이그레이션 생성·적용
  ```bash
  pnpm drizzle-kit generate
  pnpm drizzle-kit migrate
  ```

### Phase 3 — storage 레이어 교체 (1~2시간)
- [ ] `src/lib/db/repositories/` 디렉토리 생성
  - `employees.ts` — list/create/update/delete
  - `duty-items.ts` — list/create/update/delete
  - `duties.ts` — getByMonth/upsert/list
  - `recycling.ts` — get/update
- [ ] `src/lib/storage.ts`를 참조하는 API 라우트 전부 repository 호출로 교체
- [ ] 기존 `storage.ts` 제거

### Phase 4 — 데이터 이관 (30분)
- [ ] 이관 스크립트 `scripts/migrate-json-to-db.ts` 작성
  - `data/*.json`을 읽어 각 테이블에 INSERT
  - 멱등성 보장(ON CONFLICT DO NOTHING 또는 UPSERT)
- [ ] 로컬 개발 DB에서 실행·검증

### Phase 5 — 검증 (30분)
- [ ] 사원 CRUD · 청소 품목 CRUD 동작 확인
- [ ] 월별 배정 생성·조회 확인
- [ ] 재활용 순환 인덱스 증가 확인
- [ ] `pnpm build` 성공 확인
- [ ] `pnpm lint` 통과 확인

### Phase 6 — 배포 (30분)
- [ ] GitHub 저장소 푸시
- [ ] Vercel 프로젝트 연결
- [ ] Vercel ↔ Neon Integration 활성화 (`DATABASE_URL` 자동 주입)
- [ ] Production 브랜치에서 마이그레이션 실행 (CI 혹은 수동)
- [ ] 배포 URL에서 전체 동작 스모크 테스트

### Phase 7 — 뒷정리
- [ ] `data/` 디렉토리를 `.gitignore`로 이동하거나 README에 "레거시" 명시
- [ ] `CLAUDE.md`의 "JSON 파일 저장" 섹션을 DB 기반으로 갱신

---

## 6. 파일 영향 범위

| 파일 | 변경 유형 |
|---|---|
| `src/lib/storage.ts` | **제거** |
| `src/lib/db/schema.ts` | 신규 |
| `src/lib/db/client.ts` | 신규 |
| `src/lib/db/repositories/*.ts` | 신규 |
| `src/app/api/**/route.ts` | 내부 호출만 교체 |
| `src/lib/random-assign.ts` | 변경 없음 (순수 함수) |
| `src/lib/recycling-rotation.ts` | 변경 없음 (순수 함수) |
| `drizzle.config.ts` | 신규 |
| `scripts/migrate-json-to-db.ts` | 신규(1회성) |
| `package.json` | 의존성 추가 |
| `.env.local` | `DATABASE_URL` 추가 |

**핵심**: 비즈니스 로직(`random-assign`, `recycling-rotation`)과 UI는 무변경. 데이터 계층만 교체된다.

---

## 7. 리스크와 대응

| 리스크 | 가능성 | 영향 | 대응 |
|---|---|---|---|
| Neon 콜드스타트 지연 | 중 | 낮음 | HTTP 드라이버는 < 100ms, 실사용 영향 미미 |
| Drizzle 마이그레이션 실수 | 중 | 중 | `dev` 브랜치에서 먼저 실행, Neon 브랜치로 롤백 |
| 기존 JSON과 DB 스키마 불일치 | 낮음 | 중 | 이관 스크립트에서 타입 검증 후 삽입 |
| 환경변수 누락 | 낮음 | 높음 | Vercel Integration 사용해 자동 주입 |
| 단일 관리자 동시성 | 매우 낮음 | 낮음 | Postgres 트랜잭션으로 자연 해결 |

---

## 8. 작업량 추정

- **총 예상 소요**: 4~5시간 (테스트 포함)
- **되돌리기 난이도**: 낮음 — `storage.ts`가 Git 히스토리에 있고 `data/*.json`도 보존됨

---

## 9. 완료 기준 (Definition of Done)

- [ ] 원격 Vercel URL에서 사원 등록, 청소 품목 등록, 월별 배정, 재활용 순환이 모두 동작
- [ ] 브라우저 새로고침 후에도 데이터가 유지됨
- [ ] `pnpm build` 및 `pnpm lint` 성공
- [ ] `data/*.json`의 기존 데이터가 DB에 1:1 이관됨
- [ ] `CLAUDE.md`가 새 아키텍처를 반영
