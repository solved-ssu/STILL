import { NextResponse } from "next/server";
import { z } from "zod";

import { isSameOrigin } from "@/lib/auth/request-security";
import { getCurrentUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/database";
import { readJsonBody, RequestBodyTooLargeError } from "@/lib/http/request-body";
import { logServerError } from "@/lib/server-log";

export const reportSchema = z.object({
  pageId: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),
  reason: z.string().trim().min(10).max(500),
});

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ message: "허용되지 않은 요청입니다." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  let parsed: ReturnType<typeof reportSchema.safeParse>;
  try {
    parsed = reportSchema.safeParse(await readJsonBody(request, 4_000));
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ message: "요청이 너무 큽니다." }, { status: 413 });
    }
    return NextResponse.json({ message: "신고 내용을 확인해 주세요." }, { status: 400 });
  }
  if (!parsed.success) return NextResponse.json({ message: "신고 사유를 10자 이상 입력해 주세요." }, { status: 400 });
  try {
    getDatabase().prepare("INSERT INTO reports (page_id, reporter_id, reason, status, created_at) VALUES (?, ?, ?, 'open', ?)").run(parsed.data.pageId, user.studentId, parsed.data.reason, new Date().toISOString());
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    logServerError("신고 접수 실패", error);
    return NextResponse.json({ message: "신고를 접수하지 못했습니다." }, { status: 400 });
  }
}
