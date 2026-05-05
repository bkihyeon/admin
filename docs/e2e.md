# E2E 테스트 (Playwright + Neon test branch)

## 환경 변수 설정

1. Neon 대시보드에서 별도의 **test branch**를 생성한다 (이름·connection string에 `test` 키워드 포함 필수).
2. 루트에 `.env.test` 파일을 만든다 (gitignore 처리됨).

```bash
cp .env.test.example .env.test
# .env.test 의 두 변수에 같은 test branch URL을 채워 넣는다
#   - DATABASE_URL_TEST
#   - DATABASE_URL
```

> **왜 둘 다 필요한가?**
> - `DATABASE_URL_TEST`: `playwright.config.ts`의 `webServer.env`가 Next dev 서버에 명시 주입한다. 이걸로 `.env.local`의 prod URL을 override한다.
> - `DATABASE_URL`: fixture(테스트 프로세스 자체)가 repository를 호출할 때 `src/lib/db/client.ts`가 읽는 값. truncate/seed 모두 이 URL을 사용.

## 로컬 실행

```bash
pnpm test:e2e            # 헤드리스
pnpm test:e2e:ui         # Playwright UI
pnpm test:e2e:report     # 직전 실행의 HTML report 열기
```

## Project 구조

`playwright.config.ts`는 두 project로 분리되어 있다.

| Project | workers | spec | 의도 |
|---|---|---|---|
| `db-writes` | 1 | golden-path / duties-rerun-warnings / office-isolation | `duties.month` UNIQUE 충돌·cross-office 상태 공유 가능성이 있는 spec은 직렬화 |
| `read-mostly` | 4 | crud-employees / crud-duty-items / crud-offices | 각자 자기 사무실에서 격리된 CRUD — 4× 가속 |

```bash
pnpm playwright test --project=db-writes
pnpm playwright test --project=read-mostly
```

## Dialog 헬퍼

네이티브 `confirm`/`alert`는 반드시 `e2e/fixtures/test.ts`의 헬퍼로만 처리한다.

```ts
import { acceptDialog, dismissDialog } from "../fixtures/test";

acceptDialog(page, "삭제하시겠습니까");   // 다음에 뜨는 dialog만 자동 accept
await page.getByRole("button", { name: "삭제" }).click();
```

직접 `page.on('dialog', ...)` 사용 금지 — 누수로 다른 spec에 영향을 준다.

## Safety 가드

`e2e/fixtures/db.ts` 최상단에서 `process.env.DATABASE_URL`이 `'test'` 키워드를 포함하지 않으면 즉시 throw한다.
이는 fixture가 실수로 prod DB를 truncate하는 것을 코드 레벨에서 차단한다.

추가로 `playwright.config.ts`의 `webServer.env`에서 dev 서버에도 `DATABASE_URL_TEST`를 명시 주입하므로, `.env.local`이 남아있어도 dev 서버가 prod DB를 보지 않는다.

## reuseExistingServer 주의사항

로컬에서 이미 `pnpm dev`를 띄워둔 상태에서 `pnpm test:e2e`를 실행하면, Playwright는 기존 서버를 그대로 사용하고 `webServer.env`는 무시된다 (이미 띄워진 서버의 환경변수는 변경 불가).

이 경우 dev 서버가 `.env.local`의 prod `DATABASE_URL`을 보고 있을 수 있다. 의심되면 dev 서버를 종료한 뒤 e2e를 재실행하자.

CI에서는 `process.env.CI`가 truthy라 `reuseExistingServer: false`로 동작 → 항상 새 서버를 띄운다.

## 신규 spec 추가

- DB 쓰기·UNIQUE 충돌 가능성 있음 → 파일명을 `db-writes` project 매칭 패턴(`golden-path|duties-rerun-warnings|office-isolation`)에 추가하거나, 패턴 자체를 확장한다.
- 자기 사무실 안에서만 CRUD하고 다른 spec과 데이터 격리됨 → `crud-*.spec.ts` 명명 규칙으로 두면 read-mostly에 자동 매칭.
- 모든 spec은 `import { test, expect } from '../fixtures/test'`. `db.truncate()` + `localStorage.clear()`는 `beforeEach`가 자동 처리.

## 알려진 주의

- **TanStack Query staleTime 30s**: mutation 후 expect는 polling이라 대부분 자연 해결. flaky가 보이면 `await page.waitForResponse(/\/api\//)`로 명시 동기화.
- **분리수거 시나리오 미포함**: UI 노출 제거 대상이라 spec 작성 금지.
