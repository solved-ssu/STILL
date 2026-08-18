import { NextResponse } from "next/server";
import { z } from "zod";

import { isSameOrigin } from "@/lib/auth/request-security";
import { getCurrentUser } from "@/lib/auth/session";
import { createComment, isCommentRateLimited } from "@/lib/db/comments";
import { getDatabase } from "@/lib/db/database";
import { readJsonBody, RequestBodyTooLargeError } from "@/lib/http/request-body";
import { logServerError } from "@/lib/server-log";

const MAX_COMMENT_BODY_BYTES = 4_000;

const commentInputSchema = z.object({ body: z.string().trim().min(1).max(1_000) });

export async function POST(request: Request, context: { params: Promise<{ pageId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ message: "허용되지 않은 요청입니다." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  let parsed: ReturnType<typeof commentInputSchema.safeParse>;
  try {
    parsed = commentInputSchema.safeParse(await readJsonBody(request, MAX_COMMENT_BODY_BYTES));
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ message: "댓글이 너무 큽니다." }, { status: 413 });
    }
    return NextResponse.json({ message: "댓글은 1자 이상 1,000자 이하로 작성해 주세요." }, { status: 400 });
  }
  if (!parsed.success) return NextResponse.json({ message: "댓글은 1자 이상 1,000자 이하로 작성해 주세요." }, { status: 400 });

  const database = getDatabase();
  if (isCommentRateLimited(database, user.studentId)) {
    return NextResponse.json({ message: "잠시 후 다시 작성해 주세요." }, { status: 429 });
  }
  const { pageId } = await context.params;
  try {
    const comment = createComment(database, pageId, parsed.data.body, user);
    return comment
      ? NextResponse.json(comment, { status: 201 })
      : NextResponse.json({ message: "이 문서에는 댓글을 작성할 수 없습니다." }, { status: 403 });
  } catch (error) {
    logServerError("댓글 생성 실패", error);
    return NextResponse.json({ message: "댓글을 저장하지 못했습니다." }, { status: 400 });
  }
}
