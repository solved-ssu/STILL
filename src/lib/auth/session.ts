import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";

import { getDatabase } from "@/lib/db/database";
import type { SafeUser } from "@/lib/db/users";
import { SESSION_COOKIE } from "./constants";
import { createSessionToken, readSessionToken } from "./session-token";

export { SESSION_COOKIE } from "./constants";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

export function getAuthSecret(): string {
  const secret = process.env.AUTH_PEPPER;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_PEPPER는 32자 이상으로 설정해야 합니다.");
  }
  return secret;
}

function sessionHash(sessionId: string): string {
  return createHash("sha256").update(sessionId).digest("hex");
}

export function createSession(user: SafeUser): string {
  const database = getDatabase();
  const sessionId = randomBytes(32).toString("base64url");
  const now = Date.now();
  database.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now);
  database
    .prepare("INSERT INTO sessions (id_hash, user_id, role, expires_at, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(sessionHash(sessionId), user.studentId, user.role, now + SESSION_SECONDS * 1000, now);
  return createSessionToken(sessionId, user.role, getAuthSecret());
}

export const getCurrentUser = cache(async (): Promise<SafeUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  let parsed: ReturnType<typeof readSessionToken>;
  try {
    parsed = readSessionToken(token, getAuthSecret());
  } catch {
    return null;
  }
  if (!parsed) return null;

  const row = getDatabase()
    .prepare(`
      SELECT u.student_id, u.name, u.role, s.role AS session_role
      FROM sessions s JOIN users u ON u.student_id = s.user_id
      WHERE s.id_hash = ? AND s.expires_at > ? AND u.status = 'active'
    `)
    .get(sessionHash(parsed.sessionId), Date.now()) as
    | { student_id: string; name: string; role: SafeUser["role"]; session_role: SafeUser["role"] }
    | undefined;
  if (!row || row.role !== parsed.role || row.session_role !== parsed.role) return null;
  return { studentId: row.student_id, name: row.name, role: row.role };
});

export async function revokeCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    const parsed = readSessionToken(token, getAuthSecret());
    if (parsed) getDatabase().prepare("DELETE FROM sessions WHERE id_hash = ?").run(sessionHash(parsed.sessionId));
  }
  cookieStore.delete(SESSION_COOKIE);
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_SECONDS,
};
