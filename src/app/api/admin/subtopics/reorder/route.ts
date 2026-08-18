import { NextResponse } from "next/server";
import { z } from "zod";

import { isSameOrigin } from "@/lib/auth/request-security";
import { getCurrentUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/database";
import { reorderSubtopics } from "@/lib/db/pages";
import { readJsonBody, RequestBodyTooLargeError } from "@/lib/http/request-body";
import { logServerError } from "@/lib/server-log";

const slugSchema = z.string().regex(/^[a-z0-9-]{2,40}$/);
const reorderSchema = z.object({
  topicSlug: slugSchema,
  orderedSlugs: z.array(slugSchema).min(1).max(100),
}).refine((value) => new Set(value.orderedSlugs).size === value.orderedSlugs.length, {
  path: ["orderedSlugs"],
  message: "소주제 주소가 중복되었습니다.",
});

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ message: "허용되지 않은 요청입니다." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 403 });

  let parsed: ReturnType<typeof reorderSchema.safeParse>;
  try {
    parsed = reorderSchema.safeParse(await readJsonBody(request, 8_000));
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ message: "요청이 너무 큽니다." }, { status: 413 });
    }
    return NextResponse.json({ message: "소주제 순서를 확인해 주세요." }, { status: 400 });
  }
  if (!parsed.success) return NextResponse.json({ message: "소주제 순서를 확인해 주세요." }, { status: 400 });

  try {
    return reorderSubtopics(getDatabase(), parsed.data.topicSlug, parsed.data.orderedSlugs)
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ message: "소주제 목록이 변경되었습니다. 새로고침 후 다시 시도해 주세요." }, { status: 409 });
  } catch (error) {
    logServerError("소주제 순서 변경 실패", error);
    return NextResponse.json({ message: "소주제 순서를 저장하지 못했습니다." }, { status: 500 });
  }
}
