# 청소 담당 관리

회사 사무실의 월별 청소 담당을 랜덤 뽑기로 배정하는 풀스택 앱.
사무실별로 사원/청소 품목을 등록하면 매월 카드 뽑기 모드(멀티유저 폴링 동기화)로 배정 결과를 공개한다.

## 기술 스택

- Next.js 16 (App Router) + TypeScript strict
- Tailwind CSS v4
- Neon Postgres + Drizzle ORM (HTTP 드라이버)
- Vercel 배포

## 시작하기

```bash
pnpm install
cp .env.example .env.local        # DATABASE_URL 채우기 (Neon pooled connection string)
pnpm drizzle-kit migrate
pnpm dev                          # http://localhost:3000
```

## 주요 명령어

| 명령 | 설명 |
|---|---|
| `pnpm dev` | 개발 서버 |
| `pnpm build` / `pnpm start` | 프로덕션 |
| `pnpm lint` / `pnpm lint:fix` / `pnpm format` | Biome (lint + format) |
| `pnpm test:e2e` | Playwright E2E (`docs/e2e.md` 참조) |
| `pnpm drizzle-kit generate` | schema.ts → 마이그레이션 SQL 생성 |
| `pnpm drizzle-kit migrate` | 마이그레이션 적용 |

## 문서

- [`CLAUDE.md`](./CLAUDE.md) — 아키텍처 / 데이터 모델 / 관례
- [`docs/e2e.md`](./docs/e2e.md) — E2E 테스트 가이드
- [`docs/deployment-plan.md`](./docs/deployment-plan.md) — 배포 계획
