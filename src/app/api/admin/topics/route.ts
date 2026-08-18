import { NextResponse } from "next/server";
import { z } from "zod";

import { isSameOrigin } from "@/lib/auth/request-security";
import { getCurrentUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/database";
import { readJsonBody, RequestBodyTooLargeError } from "@/lib/http/request-body";
import { logServerError } from "@/lib/server-log";

const topicSchema = z.object({ slug: z.string().regex(/^[a-z0-9-]{2,40}$/), title: z.string().trim().min(1).max(60), icon: z.string().trim().min(1).max(8), description: z.string().trim().min(1).max(120) });

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ message: "허용되지 않은 요청입니다." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 403 });
  let parsed: ReturnType<typeof topicSchema.safeParse>;
  try {
    parsed = topicSchema.safeParse(await readJsonBody(request, 4_000));
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ message: "요청이 너무 큽니다." }, { status: 413 });
    }
    return NextResponse.json({ message: "주제 입력값을 확인해 주세요." }, { status: 400 });
  }
  if (!parsed.success) return NextResponse.json({ message: "주제 입력값을 확인해 주세요." }, { status: 400 });
  try {
    const sort = (getDatabase().prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 AS value FROM topics").get() as { value: number }).value;
    getDatabase().prepare("INSERT INTO topics (slug, title, icon, description, sort_order) VALUES (?, ?, ?, ?, ?)").run(parsed.data.slug, parsed.data.title, parsed.data.icon, parsed.data.description, sort);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    logServerError("주제 생성 실패", error);
    return NextResponse.json({ message: "이미 존재하는 주소이거나 저장할 수 없습니다." }, { status: 409 });
  }
}
