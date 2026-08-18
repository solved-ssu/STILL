import { NextResponse } from "next/server";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  clearLoginFailures,
  isLoginLocked,
  isSameOrigin,
  recordLoginFailure,
} from "@/lib/auth/request-security";
import {
  createSession,
  getAuthSecret,
  getCurrentUser,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { changePasswordSchema } from "@/lib/auth/validation";
import { getDatabase } from "@/lib/db/database";
import { changeUserPassword, getUserForAuth } from "@/lib/db/users";
import { readJsonBody, RequestBodyTooLargeError } from "@/lib/http/request-body";
import { logServerError } from "@/lib/server-log";

const MAX_PASSWORD_BODY_BYTES = 4_000;

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ message: "허용되지 않은 요청입니다." }, { status: 403 });
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  }

  let parsed: ReturnType<typeof changePasswordSchema.safeParse>;
  try {
    parsed = changePasswordSchema.safeParse(await readJsonBody(request, MAX_PASSWORD_BODY_BYTES));
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ message: "요청이 너무 큽니다." }, { status: 413 });
    }
    return NextResponse.json({ message: "비밀번호 입력값을 확인해 주세요." }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "비밀번호 입력값을 확인해 주세요." },
      { status: 400 },
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const attemptSubject = `password-change:${currentUser.studentId}`;
  if (isLoginLocked(ip, attemptSubject)) {
    return NextResponse.json(
      { message: "확인 시도가 너무 많습니다. 15분 뒤 다시 시도해 주세요." },
      { status: 429 },
    );
  }

  try {
    const database = getDatabase();
    const authUser = getUserForAuth(database, currentUser.studentId);
    const secret = getAuthSecret();
    const currentPasswordIsValid = Boolean(
      authUser?.status === "active"
      && await verifyPassword(parsed.data.currentPassword, authUser.passwordHash, secret),
    );
    if (!authUser || !currentPasswordIsValid) {
      recordLoginFailure(ip, attemptSubject);
      return NextResponse.json({ message: "현재 비밀번호가 올바르지 않습니다." }, { status: 401 });
    }

    const passwordHash = await hashPassword(parsed.data.newPassword, secret);
    if (!changeUserPassword(database, currentUser.studentId, passwordHash)) {
      return NextResponse.json({ message: "비밀번호를 변경할 수 없는 계정입니다." }, { status: 409 });
    }

    clearLoginFailures(ip, attemptSubject);
    const token = createSession(currentUser);
    const response = NextResponse.json({ message: "비밀번호를 변경했습니다." });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return response;
  } catch (error) {
    logServerError("비밀번호 변경 실패", error);
    return NextResponse.json(
      { message: "비밀번호를 변경하지 못했습니다. 잠시 뒤 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
