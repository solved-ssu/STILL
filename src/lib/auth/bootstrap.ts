import "server-only";

import { hashPassword } from "./password";
import { loginSchema } from "./validation";
import { getAuthSecret } from "./session";
import { getDatabase } from "@/lib/db/database";
import { countUsers, createUsersSkippingExisting } from "@/lib/db/users";

export async function ensureBootstrapAdmin(): Promise<void> {
  const database = getDatabase();
  if (countUsers(database) > 0) return;
  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim();
  const parsed = loginSchema.safeParse({
    studentId: process.env.BOOTSTRAP_ADMIN_ID,
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
  });
  if (!name || !parsed.success) return;

  createUsersSkippingExisting(database, [
    {
      studentId: parsed.data.studentId,
      name,
      passwordHash: await hashPassword(parsed.data.password, getAuthSecret()),
      role: "admin",
    },
  ]);
}
