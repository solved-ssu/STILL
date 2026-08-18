import { getAuthSecret } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/database";

export const dynamic = "force-dynamic";

const responseHeaders = {
  "Cache-Control": "no-store",
};

export function GET() {
  try {
    getAuthSecret();
    const result = getDatabase().prepare("PRAGMA quick_check").get() as
      | { quick_check?: string }
      | undefined;

    if (result?.quick_check !== "ok") {
      throw new Error("SQLite integrity check failed");
    }

    return Response.json({ status: "ok" }, { headers: responseHeaders });
  } catch {
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: responseHeaders },
    );
  }
}
