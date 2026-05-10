import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// MAINTENANCE 환경변수가 "1"이면 모든 요청을 503으로 차단.
// schema 마이그레이션의 swap-rename cutover 동안 트래픽 0을 강제하기 위한 토글.
// 절차: Vercel env에서 MAINTENANCE=1 배포 → migrate 실행 → 신코드 배포 → MAINTENANCE 제거.
//
// 정적 자산 / Next 내부 경로는 통과시켜 503 페이지 자체가 빈 화면이 되지 않게 한다.
export function proxy(request: NextRequest) {
  if (process.env.MAINTENANCE !== "1") {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/maintenance"
  ) {
    return NextResponse.next();
  }

  return new NextResponse(
    "<!doctype html><title>점검 중</title><h1>점검 중</h1><p>스키마 마이그레이션 작업 중입니다. 잠시 후 다시 시도해주세요.</p>",
    {
      status: 503,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "retry-after": "60",
      },
    }
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
