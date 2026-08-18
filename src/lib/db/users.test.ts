// @vitest-environment node
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { initializeDatabase } from "./schema";
import {
  changeUserPassword,
  countUsers,
  createUsersSkippingExisting,
  getSafeUserByStudentId,
  getUserForAuth,
} from "./users";

describe("user repository", () => {
  let database: DatabaseSync;

  beforeEach(() => {
    database = new DatabaseSync(":memory:");
    initializeDatabase(database, { seedContent: false });
  });

  afterEach(() => database.close());

  it("새 학번만 추가하고 기존 계정의 비밀번호를 덮어쓰지 않는다", () => {
    expect(
      createUsersSkippingExisting(database, [
        { studentId: "20261234", name: "김알고", passwordHash: "first-hash" },
      ]),
    ).toEqual({ created: 1, skipped: 0 });

    expect(
      createUsersSkippingExisting(database, [
        { studentId: "20261234", name: "바뀐 이름", passwordHash: "second-hash" },
        { studentId: "20261235", name: "이자료", passwordHash: "third-hash" },
      ]),
    ).toEqual({ created: 1, skipped: 1 });

    const stored = database
      .prepare("SELECT name, password_hash FROM users WHERE student_id = ?")
      .get("20261234") as { name: string; password_hash: string };
    expect(stored).toEqual({ name: "김알고", password_hash: "first-hash" });
  });

  it("화면용 사용자 정보에는 password hash가 포함되지 않는다", () => {
    createUsersSkippingExisting(database, [
      { studentId: "20261234", name: "김알고", passwordHash: "secret-hash" },
    ]);
    const user = getSafeUserByStudentId(database, "20261234");
    expect(user).toEqual({ studentId: "20261234", name: "김알고", role: "member" });
    expect(user).not.toHaveProperty("passwordHash");
    expect(countUsers(database)).toBe(1);
    expect(getUserForAuth(database, "20261234")).toMatchObject({
      studentId: "20261234",
      passwordHash: "secret-hash",
      status: "active",
    });
    expect(getUserForAuth(database, "missing")).toBeNull();
    expect(getSafeUserByStudentId(database, "missing")).toBeNull();
  });

  it("비밀번호 변경 시 기존 세션을 모두 폐기한다", () => {
    createUsersSkippingExisting(database, [
      { studentId: "20261234", name: "김알고", passwordHash: "old-hash" },
    ]);
    database.prepare(`
      INSERT INTO sessions (id_hash, user_id, role, expires_at, created_at)
      VALUES ('session-hash', '20261234', 'member', 9999999999999, 1)
    `).run();

    expect(changeUserPassword(database, "20261234", "new-hash")).toBe(true);
    expect(getUserForAuth(database, "20261234")?.passwordHash).toBe("new-hash");
    expect((database.prepare("SELECT COUNT(*) AS count FROM sessions WHERE user_id = ?").get("20261234") as { count: number }).count).toBe(0);
    expect(changeUserPassword(database, "missing", "new-hash")).toBe(false);
  });
});
