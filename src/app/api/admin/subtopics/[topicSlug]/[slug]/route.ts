import { NextResponse } from "next/server";
import { z } from "zod";

import { isSameOrigin } from "@/lib/auth/request-security";
import { getCurrentUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/database";
import { deleteSubtopic, updateSubtopic } from "@/lib/db/pages";
import { readJsonBody, RequestBodyTooLargeError } from "@/lib/http/request-body";
import { logServerError } from "@/lib/server-log";

const slugSchema = z.string().regex(/^[a-z0-9-]{2,40}$/);
const updateSchema = z.object({
  title: z.string().trim().min(1).max(60),
  icon: z.string().trim().min(1).max(8),
  description: z.string().trim().min(1).max(120),
});
type Context = { params: Promise<{ topicSlug: string; slug: string }> };

async function authorize(request: Request): Promise<NextResponse | null> {
  if (!isSameOrigin(request)) return NextResponse.json({ message: "허용되지 않은 요청입니다." }, { status: 403 });
  const user = await getCurrentUser();
  return !user || user.role !== "admin"
    ? NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 403 })
    : null;
}

async function parseParams(context: Context) {
  const params = await context.params;
  const parsed = z.object({ topicSlug: slugSchema, slug: slugSchema }).safeParse(params);
  return parsed.success ? parsed.data : null;
}

export async function PATCH(request: Request, context: Context) {
  const denied = await authorize(request);
  if (denied) return denied;
  const params = await parseParams(context);
  if (!params) return NextResponse.json({ message: "소주제 주소를 확인해 주세요." }, { status: 400 });

  let parsed: ReturnType<typeof updateSchema.safeParse>;
  try {
    parsed = updateSchema.safeParse(await readJsonBody(request, 4_000));
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ message: "요청이 너무 큽니다." }, { status: 413 });
    }
    return NextResponse.json({ message: "소주제 입력값을 확인해 주세요." }, { status: 400 });
  }
  if (!parsed.success) return NextResponse.json({ message: "소주제 입력값을 확인해 주세요." }, { status: 400 });

  try {
    const updated = updateSubtopic(getDatabase(), params.topicSlug, params.slug, parsed.data);
    return updated
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ message: "소주제를 찾을 수 없습니다." }, { status: 404 });
  } catch (error) {
    logServerError("소주제 수정 실패", error);
    return NextResponse.json({ message: "소주제를 수정하지 못했습니다." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: Context) {
  const denied = await authorize(request);
  if (denied) return denied;
  const params = await parseParams(context);
  if (!params) return NextResponse.json({ message: "소주제 주소를 확인해 주세요." }, { status: 400 });

  try {
    const result = deleteSubtopic(getDatabase(), params.topicSlug, params.slug);
    if (result === "in-use") {
      return NextResponse.json({ message: "연결된 문서를 다른 소주제로 옮긴 뒤 삭제해 주세요." }, { status: 409 });
    }
    if (result === "missing") {
      return NextResponse.json({ message: "소주제를 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    logServerError("소주제 삭제 실패", error);
    return NextResponse.json({ message: "소주제를 삭제하지 못했습니다." }, { status: 500 });
  }
}
