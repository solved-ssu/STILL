import { NextResponse } from "next/server";

import { isSameOrigin } from "@/lib/auth/request-security";
import { getCurrentUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/database";
import { toggleBookmark } from "@/lib/db/pages";
import { logServerError } from "@/lib/server-log";

export async function POST(request: Request, context: { params: Promise<{ pageId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ message: "허용되지 않은 요청입니다." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  const { pageId } = await context.params;
  try {
    return NextResponse.json({ bookmarked: toggleBookmark(getDatabase(), user.studentId, pageId) });
  } catch (error) {
    logServerError("북마크 변경 실패", error);
    return NextResponse.json({ message: "북마크를 변경하지 못했습니다." }, { status: 400 });
  }
}
