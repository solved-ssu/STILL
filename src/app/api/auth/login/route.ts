import { NextResponse } from "next/server";

import { ensureBootstrapAdmin } from "@/lib/auth/bootstrap";
import { verifyPassword } from "@/lib/auth/password";
import {
  clearLoginFailures,
  isLoginLocked,
  isSameOrigin,
  recordLoginFailure,
} from "@/lib/auth/request-security";
import { createSession, getAuthSecret, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { loginSchema } from "@/lib/auth/validation";
import { getDatabase } from "@/lib/db/database";
import { getUserForAuth } from "@/lib/db/users";
import { readJsonBody, RequestBodyTooLargeError } from "@/lib/http/request-body";
import { logServerError } from "@/lib/server-log";

const MAX_LOGIN_BODY_BYTES = 4_000;

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ message: "허용되지 않은 요청입니다." }, { status: 403 });
  }

  let parsed: ReturnType<typeof loginSchema.safeParse>;
  try {
    parsed = loginSchema.safeParse(await readJsonBody(request, MAX_LOGIN_BODY_BYTES));
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ message: "요청이 너무 큽니다." }, { status: 413 });
    }
    return NextResponse.json({ message: "학번 또는 비밀번호를 확인해 주세요." }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ message: "학번 또는 비밀번호를 확인해 주세요." }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (isLoginLocked(ip, parsed.data.studentId)) {
    return NextResponse.json(
      { message: "로그인 시도가 너무 많습니다. 15분 뒤 다시 시도해 주세요." },
      { status: 429 },
    );
  }

  try {
    await ensureBootstrapAdmin();
    const user = getUserForAuth(getDatabase(), parsed.data.studentId);
    const valid =
      user?.status === "active" &&
      (await verifyPassword(parsed.data.password, user.passwordHash, getAuthSecret()));
    if (!user || !valid) {
      recordLoginFailure(ip, parsed.data.studentId);
      return NextResponse.json({ message: "학번 또는 비밀번호를 확인해 주세요." }, { status: 401 });
    }

    clearLoginFailures(ip, parsed.data.studentId);
    const token = createSession({ studentId: user.studentId, name: user.name, role: user.role });
    const response = NextResponse.json({ user: { name: user.name, role: user.role } });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return response;
  } catch (error) {
    logServerError("로그인 처리 실패", error);
    return NextResponse.json(
      { message: "서버 인증 설정을 확인해 주세요. 관리자에게 문의해 주세요." },
      { status: 503 },
    );
  }
}
