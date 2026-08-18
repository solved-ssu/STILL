import type { DatabaseSync } from "node:sqlite";

import type { UserRole } from "@/lib/auth/access";

export interface SafeUser {
  studentId: string;
  name: string;
  role: UserRole;
}

export interface UserForAuth extends SafeUser {
  passwordHash: string;
  status: "active" | "disabled";
}

export function createUsersSkippingExisting(
  database: DatabaseSync,
  users: Array<{ studentId: string; name: string; passwordHash: string; role?: UserRole }>,
): { created: number; skipped: number } {
  const statement = database.prepare(`
    INSERT OR IGNORE INTO users (student_id, name, password_hash, role, status, created_at)
    VALUES (?, ?, ?, ?, 'active', ?)
  `);
  let created = 0;
  const now = new Date().toISOString();

  database.exec("BEGIN IMMEDIATE");
  try {
    for (const user of users) {
      const result = statement.run(
        user.studentId,
        user.name,
        user.passwordHash,
        user.role ?? "member",
        now,
      );
      if (result.changes === 1) created += 1;
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }

  return { created, skipped: users.length - created };
}

export function getSafeUserByStudentId(
  database: DatabaseSync,
  studentId: string,
): SafeUser | null {
  const row = database
    .prepare("SELECT student_id, name, role FROM users WHERE student_id = ? AND status = 'active'")
    .get(studentId) as { student_id: string; name: string; role: UserRole } | undefined;
  return row ? { studentId: row.student_id, name: row.name, role: row.role } : null;
}

export function getUserForAuth(database: DatabaseSync, studentId: string): UserForAuth | null {
  const row = database
    .prepare("SELECT student_id, name, password_hash, role, status FROM users WHERE student_id = ?")
    .get(studentId) as
    | {
        student_id: string;
        name: string;
        password_hash: string;
        role: UserRole;
        status: "active" | "disabled";
      }
    | undefined;
  return row
    ? {
        studentId: row.student_id,
        name: row.name,
        passwordHash: row.password_hash,
        role: row.role,
        status: row.status,
      }
    : null;
}

export function changeUserPassword(
  database: DatabaseSync,
  studentId: string,
  passwordHash: string,
): boolean {
  database.exec("BEGIN IMMEDIATE");
  try {
    const result = database
      .prepare("UPDATE users SET password_hash = ? WHERE student_id = ? AND status = 'active'")
      .run(passwordHash, studentId);
    if (result.changes !== 1) {
      database.exec("ROLLBACK");
      return false;
    }
    database.prepare("DELETE FROM sessions WHERE user_id = ?").run(studentId);
    database.exec("COMMIT");
    return true;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function countUsers(database: DatabaseSync): number {
  const row = database.prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number };
  return row.count;
}
