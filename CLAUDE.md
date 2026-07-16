# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev                      # 개발 서버 (http://localhost:3000)
pnpm build                    # 프로덕션 빌드
pnpm lint                     # Biome lint + format 검사
pnpm lint:fix                 # Biome lint + format auto-fix
pnpm format                   # Biome 포맷만 적용
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

사용 모델: 쓰기(사원/품목 등록, 배정 뽑기, 재활용 순환)는 사실상 관리자 1인이 수행하지만, **읽기는 여러 명이 동시에 접근 가능**한 공개 URL. 인증은 아직 없음 — 누구나 URL을 알면 수정도 가능한 상태이므로, 파괴적 작업(삭제)은 프론트 `confirm`으로만 방어 중. 재배정은 파괴적이지 않음: 같은 (month, office)의 재뽑기는 **새 버전을 append**하고 이전 버전을 보존한다 (`duties.version`, drizzle 0004). 동시 재배정 race는 `(month, office_id, version)` UNIQUE 위반 감지 + 재시도로 해소 — 어느 쪽 결과도 소실되지 않음. 다른 사무실 간에는 row 자체가 분리되어 race 자체가 없음.

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
- `src/lib/types.ts` — 모든 엔티티 인터페이스 + `MaskedDutyResponse` (UI 응답 타입). Drizzle `$type<>()` 힌트와 공유
- `src/lib/duties/` — `cards.ts` (`buildCards` 평탄화 + `groupCardsByItem` 그룹핑), `mask.ts` (`maskDuty`로 `dutyItemName` 마스킹·`revealState` 길이 검증)
- `duties.reveal_state` jsonb (drizzle 0003): `[{cardIndex, isFlipped, flippedAt}]` 배열. 길이가 카드 수와 일치해야 하며, 불일치 시 GET 500 (corruption 가드). 가드는 **최신 버전 조회에만** 적용 — superseded 버전은 게임이 없으므로 revealAll 마스킹이 revealState 인덱싱을 우회
- `duties.version` (drizzle 0004): 같은 (month, office)의 뽑기 회차. 재뽑기마다 +1로 append, 이전 버전은 불변 보존. DELETE 경로가 없어 1..N 연속 보장

### 사무실 격리 구조
- `src/contexts/OfficeContext.tsx` — 전역 사무실 선택 상태 관리 (`useOffice()` 훅). localStorage로 마지막 선택 기억
- `src/components/ClientLayout.tsx` — `OfficeProvider` + `Sidebar` + `main` 래퍼. `layout.tsx`(Server Component)에서 사용
- 사이드바에서 사무실을 선택하면 해당 사무실 데이터만 표시 (전체 보기 없음)
- API는 `?officeId=xxx` 쿼리 파라미터로 서버사이드 필터링. employees / duty_items / duties 모두 DB WHERE (`office_id` 컬럼)
- 사무실 CRUD는 `/offices` 별도 페이지에서 관리

### 데이터 흐름
- API 라우트(`src/app/api/`)는 repository 호출만 함 — raw SQL이나 db 인스턴스 직접 참조 금지
- 페이지는 `"use client"` + `fetch`로 API 호출. `useOffice()`에서 `selectedOfficeId`를 받아 API 요청에 포함
- `duties.assignments`, `recycling_state.schedule`은 JSONB로 저장 (월 단위 완결형 구조라 정규화 이득 없음)
- JSONB에는 ID뿐 아니라 사원명/품목명/officeId/officeName 스냅샷도 함께 저장됨 — **의도적 동결**. "한 번 뽑힌 담당은 바뀌지 않는다"는 요구사항을 위해, 배정 시점의 이름을 그대로 보존. 사원 개명/삭제/사무실 이동이 일어나도 과거 기록은 원형대로 유지
- "동결"은 버전 단위: 같은 사무실의 같은 월 재배정도 이전 버전을 덮지 않고 `createDutyVersion`이 새 버전을 INSERT (`INSERT ... SELECT COALESCE(MAX(version),0)+1` 단일 atomic 쿼리, 23505 시 재시도). 프론트는 `confirm` 안내 후 진행
- duties POST는 officeId 필수. 항상 새 버전 append — 다른 사무실·이전 버전 row는 영향 없음
- `recycling_state`는 `id = 1` singleton (한 행만 존재)
- `duties`에 `(month, office_id, version) UNIQUE NULLS NOT DISTINCT` 제약 (drizzle 0004에서 `(month, office_id)` UNIQUE 대체). `NULLS NOT DISTINCT`는 PG15+ 기능으로 `office_id`가 NULL인 케이스(orphan/legacy)도 강제 대상
- 조회: `GET /api/duties?month&officeId`는 최신 버전 (+`version`/`totalVersions`/`isLatest` 메타), `&version=n`으로 특정 버전. superseded 버전은 **전체 공개**(마스킹은 진행 중 게임의 장치). 이력 피드는 월별 "최신 완료 버전" 1건 (`DISTINCT ON (month)`) — 재뽑기 진행 중에도 직전 완료본이 피드에 유지됨

### 실시간 카드 뽑기 (멀티유저 동기화)
- `MaskedDutyResponse`: `dutyItemName`은 `isFlipped=false`일 때 `null`로 마스킹. `freeEmployee`는 `allFlipped=true`일 때만 노출 (superseded 버전은 둘 다 전체 공개)
- `POST /api/duties/flip` `(month, officeId, cardIndex)` — 멱등, **항상 최신 버전 타깃** (서브쿼리 포함 단일 statement). 두 번 호출해도 `flippedAt` 보존, 잘못된 인덱스는 404, 검증 실패는 400
- `POST /api/duties` 신규 게임 = 새 버전 (revealState 모든 `isFlipped=false`로 초기화)
- 클라이언트 폴링: `refetchInterval` 동적 — 데이터 없거나 진행 중이면 1.5s, `allFlipped=true`이면 멈춤 (`src/app/duties/page.tsx`). main 쿼리 `["duties", officeId, month]`는 항상 최신 버전 → 다른 탭의 재뽑기(새 버전)도 자동 감지
- 버전 탐색 UI: `DutyVersionNav`(◀ ▶) + `DutyVersionView`(read-only) + `useDutyVersion` 훅. 특정 버전은 `["duty-version", ...]` 별도 키, superseded 응답만 `staleTime: Infinity` (불변)

### 진행 중 게임 가드
- 메인 "뽑기" 버튼: `hasGame && !allFlipped`이면 `disabled` (다른 탭의 진행 중 게임도 폴링으로 감지)
- 진행 중 카드 영역: "새로 뽑기" (danger, `confirm` 후 새 버전 시작 — 중단된 게임도 이전 버전으로 보관) + "참가하기" (CardFlipModal 재오픈)
- 완료(`allFlipped=true`) 상태에서만 메인 버튼 enabled — 기존 `confirm("배정이 이미 있습니다")` 경로 유지

### 운영 토글
- `src/proxy.ts` (Next 16에서 `middleware.ts` → `proxy.ts` 리네이밍): `MAINTENANCE=1`이면 `/_next`, `/favicon`, `/maintenance` 외 모든 요청을 503 + `Retry-After:60`으로 차단. schema 마이그레이션 cutover용

### 핵심 비즈니스 로직 (DB와 독립된 순수 함수)
- `src/lib/random-assign.ts` — Fisher-Yates 셔플 기반 청소 담당 랜덤 배정. `assignDutiesForOffice()`로 단일 사무실 배정. 풀 소진 시 재셔플(다른 항목 간 중복 허용)
- `src/lib/recycling-rotation.ts` — 사원 등록순으로 4명씩 4주 순환. `currentIndex`로 다음 시작점 추적

### UI 컴포넌트 시스템
`src/components/ui/` 아래 공유 컴포넌트: Button(7 variants, 3 sizes), Card, Badge, Input, Alert, EmptyState, PageHeader, Sidebar. 디자인 토큰 기반 시맨틱 색상 사용 (`primary-*`, `success-*`, `warning-*`, `danger-*`, `surface`, `text-*`).

### 페이지 로딩 / 진입 애니메이션 패턴
모든 페이지가 따르는 cross-cutting 패턴 — 새 페이지 추가 시 그대로 따를 것.
- **BlurFade staggered 진입** (`src/components/ui/blur-fade.tsx`, motion 라이브러리): 섹션 단위 `delay={0|0.1|0.2|0.3}` stagger. 디폴트 `duration=0.5s, offset=8, direction="up"`. `useInView({once:true})`로 한 번만 트리거.
- **로딩 깜빡임 제거 3-way 분기**: `useQuery`에서 `data, isPending` 직접 받음(`= []` 디폴트 destructure 금지 — 빈 결과와 미fetched 구별 불가). `useDelayedPending(isPending)` (`src/lib/hooks/useDelayedPending.ts`, 250ms 임계)으로 짧은 로딩(<250ms)엔 아무것도 안 보임 → 깜빡임 0. PageHeader는 즉시 렌더, 본문만 `showSkeleton ? <XxxSkeleton/> : isPending ? null : <콘텐츠>` 분기.
- **`placeholderData: keepPreviousData`**: 사무실 전환 시 queryKey 바뀌어도 이전 office 데이터를 stale-while-revalidate로 유지 → blank 윈도우 제거. 6 페이지 모두 적용.
- **스켈레톤** (`src/components/skeletons/*Skeleton.tsx`): 본문만 그림(PageHeader 모사 금지 — 페이지에서 즉시 렌더하므로 중복). 그리드/높이는 본문 첫 섹션과 동일하게 → CLS 최소화.

### Path alias
`@/*` → `./src/*` (tsconfig paths)

## Conventions

- 한국어 UI/커밋 메시지. 커밋 메시지는 주요 변경 사항 위주로 심플하게
- 라이트 테마 고정 (다크모드 없음)
- 비즈니스 로직은 `src/lib/`에 순수 함수로 분리, DB/API/UI와 독립
- Lint/format은 Biome 단일 툴체인. `biome.json`은 `recommended` 룰만 명시하고, 도메인 룰(next/react/drizzle/playwright/tailwind)은 `package.json` 의존성에서 자동 감지된다. CSS는 Tailwind v4 `@theme` 디렉티브 파싱을 위해 `css.parser.tailwindDirectives: true`


## Gotchas

- Neon HTTP 드라이버는 트랜잭션 지원이 제한적. 단일 쿼리 또는 `onConflictDoUpdate` 같은 원자적 SQL로 해결할 것
