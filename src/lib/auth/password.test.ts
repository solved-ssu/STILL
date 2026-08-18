import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("전화번호를 평문으로 보관하지 않고 검증할 수 있다", async () => {
    const password = "01012345678";
    const encoded = await hashPassword(password, "test-pepper");

    expect(encoded).not.toContain(password);
    await expect(verifyPassword(password, encoded, "test-pepper")).resolves.toBe(true);
    await expect(verifyPassword("01000000000", encoded, "test-pepper")).resolves.toBe(false);
  });

  it("같은 전화번호도 매번 다른 salt로 해시한다", async () => {
    const first = await hashPassword("01012345678", "test-pepper");
    const second = await hashPassword("01012345678", "test-pepper");
    expect(first).not.toBe(second);
  });
});
