import { NextResponse } from "next/server";
import { z } from "zod";

import { isSameOrigin } from "@/lib/auth/request-security";
import { getCurrentUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/database";
import { createSubtopic } from "@/lib/db/pages";
import { readJsonBody, RequestBodyTooLargeError } from "@/lib/http/request-body";
import { logServerError } from "@/lib/server-log";

const subtopicSchema = z.object({
  topicSlug: z.string().regex(/^[a-z0-9-]{2,40}$/),
  slug: z.string().regex(/^[a-z0-9-]{2,40}$/),
  title: z.string().trim().min(1).max(60),
  icon: z.string().trim().min(1).max(8),
  description: z.string().trim().min(1).max(120),
});

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ message: "허용되지 않은 요청입니다." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 403 });
  let parsed: ReturnType<typeof subtopicSchema.safeParse>;
  try {
    parsed = subtopicSchema.safeParse(await readJsonBody(request, 4_000));
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ message: "요청이 너무 큽니다." }, { status: 413 });
    }
    return NextResponse.json({ message: "소주제 입력값을 확인해 주세요." }, { status: 400 });
  }
  if (!parsed.success) return NextResponse.json({ message: "소주제 입력값을 확인해 주세요." }, { status: 400 });
  try {
    createSubtopic(getDatabase(), parsed.data);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    logServerError("소주제 생성 실패", error);
    return NextResponse.json({ message: "대주제를 찾을 수 없거나 이미 존재하는 주소입니다." }, { status: 409 });
  }
}
