# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev      # 개발 서버 (http://localhost:3000)
pnpm build    # 프로덕션 빌드
pnpm lint     # ESLint 실행
pnpm start    # 프로덕션 서버
```

## Architecture

회사 청소 담당 관리 프로그램. 관리자 1인이 로컬에서 사용하는 Next.js 풀스택 앱.

### 기술 스택
- **Next.js 16** (App Router) + **TypeScript** (strict mode)
- **Tailwind CSS v4** — `globals.css`의 `@theme inline` 블록에서 디자인 토큰 정의 (v3의 tailwind.config.js 대체)
- **lucide-react** — 아이콘
- **JSON 파일 저장** — `data/` 디렉토리, DB 없음, 인증 없음

### 데이터 흐름
- `src/lib/storage.ts` — JSON 읽기/쓰기 (temp+rename 원자적 패턴)
- `src/lib/types.ts` — 모든 엔티티 타입 정의
- `src/app/api/` — Next.js Route Handlers (REST API)
- 페이지는 `"use client"` + `fetch`로 API 호출

### 핵심 비즈니스 로직
- `src/lib/random-assign.ts` — Fisher-Yates 셔플 기반 청소 담당 랜덤 배정. 풀 소진 시 재셔플(다른 항목 간 중복 허용)
- `src/lib/recycling-rotation.ts` — 사원 등록순으로 4명씩 4주 순환. `currentIndex`로 다음 시작점 추적

### UI 컴포넌트 시스템
`src/components/ui/` 아래 공유 컴포넌트: Button(7 variants, 3 sizes), Card, Badge, Input, Alert, EmptyState, PageHeader, Sidebar. 디자인 토큰 기반 시맨틱 색상 사용 (`primary-*`, `success-*`, `warning-*`, `danger-*`, `surface`, `text-*`).

### Path alias
`@/*` → `./src/*` (tsconfig paths)

## Conventions

- 한국어 UI/커밋 메시지
- 라이트 테마 고정 (다크모드 없음)
- 기능 로직은 `src/lib/`에 순수 함수로 분리, API/UI와 독립
- 데이터는 `data/*.json`에 저장 (gitignore 대상 아님 — 샘플 데이터 포함 가능)
