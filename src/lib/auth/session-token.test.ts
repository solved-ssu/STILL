import { describe, expect, it } from "vitest";

import { createSessionToken, readSessionToken } from "./session-token";

describe("signed session token", () => {
  it("opaque id와 role을 서명해 복원한다", () => {
    const token = createSessionToken("opaque-session-id", "admin", "a-very-long-test-pepper");
    expect(readSessionToken(token, "a-very-long-test-pepper")).toEqual({
      sessionId: "opaque-session-id",
      role: "admin",
    });
  });

  it("변조되거나 다른 키로 서명된 토큰을 거부한다", () => {
    const token = createSessionToken("opaque-session-id", "member", "a-very-long-test-pepper");
    expect(readSessionToken(`${token}x`, "a-very-long-test-pepper")).toBeNull();
    expect(readSessionToken(token, "another-long-test-pepper")).toBeNull();
  });
});
