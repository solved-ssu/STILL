import { NextResponse } from "next/server";

import { isSameOrigin } from "@/lib/auth/request-security";
import { getCurrentUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/database";
import { updatePage } from "@/lib/db/pages";
import { readJsonBody, RequestBodyTooLargeError } from "@/lib/http/request-body";
import { logServerError } from "@/lib/server-log";
import { MAX_PAGE_BODY_BYTES, pageInputSchema } from "../route";

export async function PATCH(request: Request, context: { params: Promise<{ pageId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ message: "허용되지 않은 요청입니다." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  let parsed: ReturnType<typeof pageInputSchema.safeParse>;
  try {
    parsed = pageInputSchema.safeParse(await readJsonBody(request, MAX_PAGE_BODY_BYTES));
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ message: "문서가 너무 큽니다." }, { status: 413 });
    }
    return NextResponse.json({ message: "문서 내용을 확인해 주세요." }, { status: 400 });
  }
  if (!parsed.success) return NextResponse.json({ message: "문서 내용을 확인해 주세요." }, { status: 400 });
  const { pageId } = await context.params;
  try {
    const updated = updatePage(getDatabase(), pageId, parsed.data, user);
    return updated
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ message: "수정 권한이 없거나 문서가 없습니다." }, { status: 403 });
  } catch (error) {
    logServerError("문서 수정 실패", error);
    return NextResponse.json({ message: "문서를 저장하지 못했습니다." }, { status: 400 });
  }
}
