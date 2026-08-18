import { NextResponse } from "next/server";

import { isSameOrigin } from "@/lib/auth/request-security";
import { getCurrentUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/database";

export async function PATCH(request: Request, context: { params: Promise<{ reportId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ message: "허용되지 않은 요청입니다." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 403 });
  const { reportId } = await context.params;
  if (!/^\d+$/.test(reportId)) return NextResponse.json({ message: "잘못된 신고 번호입니다." }, { status: 400 });
  const result = getDatabase().prepare("UPDATE reports SET status = 'resolved' WHERE id = ?").run(Number(reportId));
  return result.changes ? NextResponse.json({ ok: true }) : NextResponse.json({ message: "신고를 찾을 수 없습니다." }, { status: 404 });
}
