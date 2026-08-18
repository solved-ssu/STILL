import { createHash } from "node:crypto";

import { getDatabase } from "@/lib/db/database";

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") !== "cross-site";
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const forwardedProtocol = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  if (!forwardedHost) return false;
  return origin === `${forwardedProtocol}://${forwardedHost}`;
}

function attemptKey(ip: string, studentId: string): string {
  return createHash("sha256").update(`${ip.slice(0, 100)}\u0000${studentId}`).digest("hex");
}

export function isLoginLocked(ip: string, studentId: string): boolean {
  const row = getDatabase()
    .prepare("SELECT locked_until FROM login_attempts WHERE attempt_key = ?")
    .get(attemptKey(ip, studentId)) as { locked_until: number } | undefined;
  return Boolean(row && row.locked_until > Date.now());
}

export function recordLoginFailure(ip: string, studentId: string): void {
  const database = getDatabase();
  const key = attemptKey(ip, studentId);
  const now = Date.now();
  const previous = database
    .prepare("SELECT failures, updated_at FROM login_attempts WHERE attempt_key = ?")
    .get(key) as { failures: number; updated_at: number } | undefined;
  const recentFailures = previous && previous.updated_at > now - 15 * 60_000 ? previous.failures : 0;
  const failures = recentFailures + 1;
  const lockedUntil = failures >= 5 ? now + 15 * 60_000 : 0;
  database
    .prepare(`
      INSERT INTO login_attempts (attempt_key, failures, locked_until, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(attempt_key) DO UPDATE SET failures = excluded.failures, locked_until = excluded.locked_until, updated_at = excluded.updated_at
    `)
    .run(key, failures, lockedUntil, now);
}

export function clearLoginFailures(ip: string, studentId: string): void {
  getDatabase().prepare("DELETE FROM login_attempts WHERE attempt_key = ?").run(attemptKey(ip, studentId));
}
