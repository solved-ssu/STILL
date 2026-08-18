import { createHmac, timingSafeEqual } from "node:crypto";

import type { UserRole } from "./access";

function signature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createSessionToken(
  sessionId: string,
  role: UserRole,
  secret: string,
): string {
  const payload = Buffer.from(JSON.stringify({ sessionId, role }), "utf8").toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}

export function readSessionToken(
  token: string,
  secret: string,
): { sessionId: string; role: UserRole } | null {
  const [payload, providedSignature, extra] = token.split(".");
  if (!payload || !providedSignature || extra) return null;

  const expected = Buffer.from(signature(payload, secret));
  const provided = Buffer.from(providedSignature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sessionId?: unknown;
      role?: unknown;
    };
    if (
      typeof parsed.sessionId !== "string" ||
      (parsed.role !== "member" && parsed.role !== "admin")
    ) {
      return null;
    }
    return { sessionId: parsed.sessionId, role: parsed.role };
  } catch {
    return null;
  }
}
