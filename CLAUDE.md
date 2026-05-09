# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev                      # 개발 서버 (http://localhost:3000)
pnpm build                    # 프로덕션 빌드
pnpm lint                     # ESLint 실행
pnpm start                    # 프로덕션 서버

# DB (Drizzle + Neon Postgres)
pnpm drizzle-kit generate     # schema.ts 변경 → SQL 마이그레이션 생성
pnpm drizzle-kit migrate      # 마이그레이션을 Neon에 적용

# E2E (Playwright + Neon test branch)
pnpm test:e2e                 # 헤드리스 실행
pnpm test:e2e:ui              # Playwright UI
pnpm test:e2e:report          # 직전 실행 HTML report
```

환경변수는 `.env.local`의 `DATABASE_URL` 하나. Neon pooled connection string 사용.

### E2E 테스트
- 자세한 가이드: `docs/e2e.md`
- E2E는 **`.env.test`의 `DATABASE_URL_TEST`만 사용**한다. prod URL 절대 금지. `e2e/fixtures/db.ts`의 safety 가드가 `'test'` 키워드를 강제 검사.
- `playwright.config.ts`의 `webServer.env`가 dev 서버에 `DATABASE_URL`을 명시 주입 → `.env.local`의 prod 값을 override.
- Top-level `workers: 1` 단일 구성. 모든 spec이 공유 DB를 truncate하므로 전역 직렬화 (project 분리 시 project 간 병렬에서 race 잔존 → 통일). 사유는 `playwright.config.ts:11-14` 주석 참조.
- 로컬에서 `pnpm dev`를 띄워둔 상태로 e2e를 실행하면 `reuseExistingServer`가 적용되어 `webServer.env`가 무시된다 — 의심 시 dev 서버 종료 후 재실행.

## Architecture

회사 청소 담당 관리 프로그램. Next.js 풀스택 앱. Vercel + Neon Postgres 배포.

사용 모델: 쓰기(사원/품목 등록, 배정 뽑기, 재활용 순환)는 사실상 관리자 1인이 수행하지만, **읽기는 여러 명이 동시에 접근 가능**한 공개 URL. 인증은 아직 없음 — 누구나 URL을 알면 수정도 가능한 상태이므로, 파괴적 작업(삭제/재배정)은 프론트 `confirm`으로만 방어 중. 추후 인증 도입 전까지는 같은 월 동시 재배정 같은 레이스는 `upsertDuty`의 원자성에 의존.

### 기술 스택
- **Next.js 16** (App Router) + **TypeScript** (strict mode)
- **Tailwind CSS v4** — `globals.css`의 `@theme inline` 블록에서 디자인 토큰 정의 (v3의 tailwind.config.js 대체)
- **lucide-react** — 아이콘
- **Neon Postgres** + **Drizzle ORM** (HTTP 드라이버). 인증 없음

### 데이터 레이어
- `src/lib/db/schema.ts` — Drizzle 테이블 정의 (offices, employees, duty_items, duties, recycling_state)
- `src/lib/db/client.ts` — Neon HTTP 드라이버 + Drizzle 인스턴스. `DATABASE_URL`을 모듈 로드 시점에 읽음
- `src/lib/db/repositories/` — 엔티티별 CRUD 함수. API 라우트는 여기만 호출 (Drizzle 타입은 외부로 노출하지 않음)
- `src/lib/db/id.ts` — `generateId()` (8자리 UUID 슬라이스)
- `src/lib/types.ts` — 모든 엔티티 인터페이스. Drizzle `$type<>()` 힌트와 공유

### 사무실 격리 구조
- `src/contexts/OfficeContext.tsx` — 전역 사무실 선택 상태 관리 (`useOffice()` 훅). localStorage로 마지막 선택 기억
- `src/components/ClientLayout.tsx` — `OfficeProvider` + `Sidebar` + `main` 래퍼. `layout.tsx`(Server Component)에서 사용
- 사이드바에서 사무실을 선택하면 해당 사무실 데이터만 표시 (전체 보기 없음)
- API는 `?officeId=xxx` 쿼리 파라미터로 서버사이드 필터링. employees, duty-items는 DB WHERE, duties는 JSONB 앱 레벨 필터
- 사무실 CRUD는 `/offices` 별도 페이지에서 관리

### 데이터 흐름
- API 라우트(`src/app/api/`)는 repository 호출만 함 — raw SQL이나 db 인스턴스 직접 참조 금지
- 페이지는 `"use client"` + `fetch`로 API 호출. `useOffice()`에서 `selectedOfficeId`를 받아 API 요청에 포함
- `duties.assignments`, `recycling_state.schedule`은 JSONB로 저장 (월 단위 완결형 구조라 정규화 이득 없음)
- JSONB에는 ID뿐 아니라 사원명/품목명/officeId/officeName 스냅샷도 함께 저장됨 — **의도적 동결**. "한 번 뽑힌 담당은 바뀌지 않는다"는 요구사항을 위해, 배정 시점의 이름을 그대로 보존. 사원 개명/삭제/사무실 이동이 일어나도 과거 기록은 원형대로 유지
- 단, "동결"은 **다른 월**에 한정. 같은 월 재배정은 `upsertDuty`가 덮어씀 (프론트 `src/app/duties/page.tsx`에서 `confirm` 경고 후 진행)
- duties POST는 officeId 필수. 해당 사무실 배정만 교체하고 다른 사무실 배정은 유지 (JSONB merge 패턴)
- `recycling_state`는 `id = 1` singleton (한 행만 존재)
- `duties.month`에 UNIQUE 제약 — 월별 중복은 DB가 강제, `upsertDuty`가 `ON CONFLICT DO UPDATE` 사용

### 핵심 비즈니스 로직 (DB와 독립된 순수 함수)
- `src/lib/random-assign.ts` — Fisher-Yates 셔플 기반 청소 담당 랜덤 배정. `assignDutiesForOffice()`로 단일 사무실 배정. 풀 소진 시 재셔플(다른 항목 간 중복 허용)
- `src/lib/recycling-rotation.ts` — 사원 등록순으로 4명씩 4주 순환. `currentIndex`로 다음 시작점 추적

### UI 컴포넌트 시스템
`src/components/ui/` 아래 공유 컴포넌트: Button(7 variants, 3 sizes), Card, Badge, Input, Alert, EmptyState, PageHeader, Sidebar. 디자인 토큰 기반 시맨틱 색상 사용 (`primary-*`, `success-*`, `warning-*`, `danger-*`, `surface`, `text-*`).

### Path alias
`@/*` → `./src/*` (tsconfig paths)

## Conventions

- 한국어 UI/커밋 메시지. 커밋 메시지는 주요 변경 사항 위주로 심플하게
- 라이트 테마 고정 (다크모드 없음)
- 비즈니스 로직은 `src/lib/`에 순수 함수로 분리, DB/API/UI와 독립


## Gotchas

- Neon HTTP 드라이버는 트랜잭션 지원이 제한적. 단일 쿼리 또는 `onConflictDoUpdate` 같은 원자적 SQL로 해결할 것
