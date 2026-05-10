# E2E 테스트 (Playwright + Neon test branch)

## 환경 변수 설정

1. Neon 대시보드에서 별도의 **test branch**를 생성한다 (이름·connection string에 `test` 키워드 포함 권장).
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

## 실행 모델

`playwright.config.ts`는 **top-level `workers: 1`** 단일 구성. 모든 spec이 공유 DB를 truncate하므로 전역 직렬화한다 (project 분리 시 project 간 병렬에서 race 잔존 → 통일). 사유는 `playwright.config.ts:11-14` 주석 참조.

## Spec 분류

| Spec | 검증 |
|---|---|
| `golden-path` | 사무실 → 사원 → 품목 → 뽑기 행복 경로 |
| `office-isolation` | `?officeId=` 격리 |
| `crud-*` | 엔티티별 CRUD (offices/employees/duty-items) |
| `duties-cross-office-race` | 다른 사무실 동시 뽑기 race 없음 |
| `duties-rerun-warnings` | 완료 게임 재뽑기 confirm + warning Alert + 프리 영역 |
| `duties-in-progress-guard` | 진행 중 가드 (메인 disabled, 새로 뽑기/참가하기, cross-tab 동기화) |
| `draw-realtime` | flip API 멱등 + 1.5s 폴링 동기화 + revealState 복원 |

## Dialog 헬퍼

네이티브 `confirm`/`alert`는 반드시 `e2e/fixtures/test.ts` 헬퍼로만 처리한다.

```ts
import { acceptDialog } from "../fixtures/test";

acceptDialog(page, "삭제하시겠습니까");   // 다음에 뜨는 dialog만 자동 accept
await page.getByRole("button", { name: "삭제" }).click();
```

직접 `page.on('dialog', ...)` 사용 금지 — 누수로 다른 spec에 영향을 준다.

## 모달 헬퍼

CardFlipModal 동선을 위한 두 헬퍼:

- `closeFlipModalOnly(page)` — flip 없이 X 버튼만 클릭. **in-progress 상태 유지** (`allFlipped=false`).
- `completeFlipModal(page)` — 모든 카드 순차 flip 후 "확인" 클릭. **`allFlipped=true`**로 종료.

## Cross-tab / 폴링 패턴

`draw-realtime`, `duties-in-progress-guard`에서 사용:

- `browser.newContext()` × 2로 탭 분리 후 동일 office에 진입
- 폴링 RTT 변동 흡수: `expect.poll(fn, { timeout: 10000, intervals: [500, 1000, 1500] })`
- 도입기 한정 flake guard: `test.describe.configure({ retries: 1 })` — CI 안정화 후 제거 (TODO 주석으로 표시)

## Safety 가드

`e2e/fixtures/db.ts:13-34`에 두 단계:
1. `DATABASE_URL`이 `'test'` 키워드를 포함하면 통과
2. 미포함 시 `E2E_DB_CONFIRMED=1` 토큰이 있으면 통과 (Neon endpoint hostname이 branch 이름과 별개라 명시 확인용)
3. 둘 다 실패하면 즉시 throw — 실수로 prod DB를 truncate하는 것을 코드 레벨에서 차단

추가로 `playwright.config.ts`의 `webServer.env`가 dev 서버에도 `DATABASE_URL_TEST`를 명시 주입하므로, `.env.local`이 남아있어도 dev 서버가 prod DB를 보지 않는다.

## reuseExistingServer 주의

로컬에서 이미 `pnpm dev`를 띄워둔 상태로 e2e를 실행하면 Playwright가 기존 서버를 재사용하고 `webServer.env`는 무시된다 (이미 띄워진 서버의 환경변수는 변경 불가). 이 경우 dev 서버가 `.env.local`의 prod URL을 보고 있을 수 있으므로, 의심 시 dev 서버 종료 후 재실행.

CI에서는 `process.env.CI`가 truthy라 `reuseExistingServer: false`로 동작 → 항상 새 서버를 띄운다.

## 신규 spec 추가

- 파일은 `e2e/specs/` 아래 자유 명명. 모든 project 매칭 패턴이 폐기되어 자동으로 단일 워커 큐에 합류한다.
- `import { test, expect } from "../fixtures/test"`로 시작.
- `db.truncate()` + `localStorage.clear()`는 `beforeEach`가 자동 처리하므로 셋업은 시드만 작성.

## 알려진 주의

- **TanStack Query staleTime 30s**: mutation 후 expect는 폴링이라 대부분 자연 해결. flaky가 보이면 `await page.waitForResponse(/\/api\//)`로 명시 동기화.
- **`placeholderData: keepPreviousData`**: 사무실 전환 직후 이전 office 데이터가 잠깐 유지됨 (stale-while-revalidate). 사무실 전환을 끼는 시나리오는 단언 전에 새 office 데이터를 명시 대기 (`expect.poll` 또는 `waitForResponse`).
- **`useDelayedPending` 250ms 지연 스켈레톤**: 첫 진입 후 250ms 동안 본문이 빈 영역 → 0~250ms 사이에 본문 단언을 걸면 잠깐 비어 보일 수 있음. PageHeader는 즉시 렌더되므로 PageHeader 기준 단언 또는 `expect.poll`로 본문 도착 대기.
- **분리수거 시나리오 미포함**: UI 노출 제거 대상이라 spec 작성 금지.
