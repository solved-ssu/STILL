import { NextResponse } from "next/server";
import { z } from "zod";

import { isSameOrigin } from "@/lib/auth/request-security";
import { getCurrentUser } from "@/lib/auth/session";
import { pageContentSchema } from "@/lib/content/page-content";
import { getDatabase } from "@/lib/db/database";
import { createPage } from "@/lib/db/pages";
import { readJsonBody, RequestBodyTooLargeError } from "@/lib/http/request-body";
import { logServerError } from "@/lib/server-log";

export const MAX_PAGE_BODY_BYTES = 600_000;

export const pageInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  icon: z.string().trim().min(1).max(8),
  excerpt: z.string().trim().max(240),
  topicSlug: z.string().regex(/^[a-z0-9-]{1,40}$/),
  subtopicSlug: z.string().regex(/^[a-z0-9-]{1,40}$/).nullable().default(null),
  content: pageContentSchema,
  status: z.enum(["draft", "published"]),
});

export async function POST(request: Request) {
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

  try {
    const page = createPage(getDatabase(), parsed.data, user);
    return NextResponse.json(page, { status: 201 });
  } catch (error) {
    logServerError("문서 생성 실패", error);
    return NextResponse.json({ message: "문서를 저장하지 못했습니다." }, { status: 400 });
  }
}
