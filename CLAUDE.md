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
pnpm tsx scripts/migrate-json-to-db.ts  # 일회성: data/*.json → DB 이관
```

환경변수는 `.env.local`의 `DATABASE_URL` 하나. Neon pooled connection string 사용.

## Architecture

회사 청소 담당 관리 프로그램. 관리자 1인이 사용하는 Next.js 풀스택 앱. Vercel + Neon Postgres 배포.

### 기술 스택
- **Next.js 16** (App Router) + **TypeScript** (strict mode)
- **Tailwind CSS v4** — `globals.css`의 `@theme inline` 블록에서 디자인 토큰 정의 (v3의 tailwind.config.js 대체)
- **lucide-react** — 아이콘
- **Neon Postgres** + **Drizzle ORM** (HTTP 드라이버). 인증 없음

### 데이터 레이어
- `src/lib/db/schema.ts` — Drizzle 테이블 정의 (employees, duty_items, duties, recycling_state)
- `src/lib/db/client.ts` — Neon HTTP 드라이버 + Drizzle 인스턴스. `DATABASE_URL`을 모듈 로드 시점에 읽음
- `src/lib/db/repositories/` — 엔티티별 CRUD 함수. API 라우트는 여기만 호출 (Drizzle 타입은 외부로 노출하지 않음)
- `src/lib/db/id.ts` — `generateId()` (8자리 UUID 슬라이스)
- `src/lib/types.ts` — 모든 엔티티 인터페이스. Drizzle `$type<>()` 힌트와 공유

### 데이터 흐름
- API 라우트(`src/app/api/`)는 repository 호출만 함 — raw SQL이나 db 인스턴스 직접 참조 금지
- 페이지는 `"use client"` + `fetch`로 API 호출
- `duties.assignments`, `recycling_state.schedule`은 JSONB로 저장 (월 단위 완결형 구조라 정규화 이득 없음)
- `recycling_state`는 `id = 1` singleton (한 행만 존재)
- `duties.month`에 UNIQUE 제약 — 월별 중복은 DB가 강제, `upsertDuty`가 `ON CONFLICT DO UPDATE` 사용

### 핵심 비즈니스 로직 (DB와 독립된 순수 함수)
- `src/lib/random-assign.ts` — Fisher-Yates 셔플 기반 청소 담당 랜덤 배정. 풀 소진 시 재셔플(다른 항목 간 중복 허용)
- `src/lib/recycling-rotation.ts` — 사원 등록순으로 4명씩 4주 순환. `currentIndex`로 다음 시작점 추적

### UI 컴포넌트 시스템
`src/components/ui/` 아래 공유 컴포넌트: Button(7 variants, 3 sizes), Card, Badge, Input, Alert, EmptyState, PageHeader, Sidebar. 디자인 토큰 기반 시맨틱 색상 사용 (`primary-*`, `success-*`, `warning-*`, `danger-*`, `surface`, `text-*`).

### Path alias
`@/*` → `./src/*` (tsconfig paths)

## Conventions

- 한국어 UI/커밋 메시지. 커밋 메시지는 주요 변경 사항 위주로 심플하게
- 라이트 테마 고정 (다크모드 없음)
- 비즈니스 로직은 `src/lib/`에 순수 함수로 분리, DB/API/UI와 독립
- `data/*.json`은 마이그레이션 이전의 레거시 저장소. 이관 완료됨. 더 이상 읽지 않음

## Gotchas

- `scripts/migrate-json-to-db.ts`는 의도적으로 `src/lib/db/client.ts`를 import하지 않음. client.ts가 모듈 로드 시점에 `neon(process.env.DATABASE_URL)`을 호출하기 때문에, dotenv로 `.env.local`을 먼저 로드한 뒤 neon을 초기화해야 함. 스크립트 안에서 직접 `neon()`을 호출하는 것은 이 hoisting 문제 회피용
- Neon HTTP 드라이버는 트랜잭션 지원이 제한적. 단일 쿼리 또는 `onConflictDoUpdate` 같은 원자적 SQL로 해결할 것
