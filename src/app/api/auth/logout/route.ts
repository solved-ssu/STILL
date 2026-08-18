import { NextResponse } from "next/server";

import { isSameOrigin } from "@/lib/auth/request-security";
import { revokeCurrentSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ message: "허용되지 않은 요청입니다." }, { status: 403 });
  }
  await revokeCurrentSession();
  return NextResponse.json({ ok: true });
}
