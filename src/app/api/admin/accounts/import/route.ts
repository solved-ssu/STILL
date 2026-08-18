import { NextResponse } from "next/server";

import { hashPassword } from "@/lib/auth/password";
import { isSameOrigin } from "@/lib/auth/request-security";
import { getAuthSecret, getCurrentUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/database";
import { createUsersSkippingExisting } from "@/lib/db/users";
import { parseAccountWorkbook } from "@/lib/import/accounts";
import { logServerError } from "@/lib/server-log";

const MAX_FILE_SIZE = 2 * 1024 * 1024;

async function hashAccounts(
  accounts: Awaited<ReturnType<typeof parseAccountWorkbook>>["accounts"],
) {
  const output: Array<{ studentId: string; name: string; passwordHash: string }> = [];
  const secret = getAuthSecret();
  for (let index = 0; index < accounts.length; index += 4) {
    const chunk = accounts.slice(index, index + 4);
    output.push(
      ...(await Promise.all(
        chunk.map(async ({ studentId, name, initialPassword }) => ({
          studentId,
          name,
          passwordHash: await hashPassword(initialPassword, secret),
        })),
      )),
    );
  }
  return output;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ message: "허용되지 않은 요청입니다." }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ message: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const declaredSize = Number(request.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_FILE_SIZE + 100_000) {
    return NextResponse.json({ message: "파일은 2MB 이하여야 합니다." }, { status: 413 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".xlsx") || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ message: "2MB 이하의 .xlsx 파일만 업로드할 수 있습니다." }, { status: 400 });
  }

  try {
    const parsed = await parseAccountWorkbook(Buffer.from(await file.arrayBuffer()));
    const hashedAccounts = await hashAccounts(parsed.accounts);
    const result = createUsersSkippingExisting(getDatabase(), hashedAccounts);
    return NextResponse.json({ ...result, invalid: parsed.issues.length, issues: parsed.issues.slice(0, 50) });
  } catch (error) {
    logServerError("계정 Excel 가져오기 실패", error);
    return NextResponse.json({ message: "엑셀 파일을 읽지 못했습니다. 형식과 내용을 확인해 주세요." }, { status: 400 });
  }
}
