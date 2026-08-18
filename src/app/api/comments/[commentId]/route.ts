import { NextResponse } from "next/server";

import { isSameOrigin } from "@/lib/auth/request-security";
import { getCurrentUser } from "@/lib/auth/session";
import { deleteComment } from "@/lib/db/comments";
import { getDatabase } from "@/lib/db/database";

export async function DELETE(request: Request, context: { params: Promise<{ commentId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ message: "허용되지 않은 요청입니다." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  const { commentId: rawCommentId } = await context.params;
  const commentId = Number(rawCommentId);
  if (!Number.isSafeInteger(commentId) || commentId <= 0) {
    return NextResponse.json({ message: "댓글 번호를 확인해 주세요." }, { status: 400 });
  }
  return deleteComment(getDatabase(), commentId, user)
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ message: "삭제 권한이 없거나 댓글이 없습니다." }, { status: 403 });
}
