// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  changeUserPassword: vi.fn(),
  clearLoginFailures: vi.fn(),
  createSession: vi.fn(),
  getAuthSecret: vi.fn(),
  getCurrentUser: vi.fn(),
  getDatabase: vi.fn(() => ({})),
  getUserForAuth: vi.fn(),
  hashPassword: vi.fn(),
  isLoginLocked: vi.fn(),
  isSameOrigin: vi.fn(),
  recordLoginFailure: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock("@/lib/auth/password", () => ({
  hashPassword: mocks.hashPassword,
  verifyPassword: mocks.verifyPassword,
}));
vi.mock("@/lib/auth/request-security", () => ({
  clearLoginFailures: mocks.clearLoginFailures,
  isLoginLocked: mocks.isLoginLocked,
  isSameOrigin: mocks.isSameOrigin,
  recordLoginFailure: mocks.recordLoginFailure,
}));
vi.mock("@/lib/auth/session", () => ({
  createSession: mocks.createSession,
  getAuthSecret: mocks.getAuthSecret,
  getCurrentUser: mocks.getCurrentUser,
  SESSION_COOKIE: "still_session",
  sessionCookieOptions: { httpOnly: true, path: "/", sameSite: "lax", secure: false },
}));
vi.mock("@/lib/db/database", () => ({ getDatabase: mocks.getDatabase }));
vi.mock("@/lib/db/users", () => ({
  changeUserPassword: mocks.changeUserPassword,
  getUserForAuth: mocks.getUserForAuth,
}));

import { POST } from "./route";

function request(body: unknown) {
  return new Request("http://localhost/api/auth/password", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost", host: "localhost" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  currentPassword: "01012345678",
  newPassword: "still-study-2026",
  confirmPassword: "still-study-2026",
};

describe("POST /api/auth/password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isSameOrigin.mockReturnValue(true);
    mocks.getCurrentUser.mockResolvedValue({ studentId: "20261234", name: "김알고", role: "member" });
    mocks.getUserForAuth.mockReturnValue({ studentId: "20261234", name: "김알고", role: "member", status: "active", passwordHash: "old-hash" });
    mocks.getAuthSecret.mockReturnValue("test-pepper");
    mocks.isLoginLocked.mockReturnValue(false);
    mocks.verifyPassword.mockResolvedValue(true);
    mocks.hashPassword.mockResolvedValue("new-hash");
    mocks.changeUserPassword.mockReturnValue(true);
    mocks.createSession.mockReturnValue("new-session-token");
  });

  it("현재 비밀번호를 확인하고 모든 기존 세션을 폐기한 뒤 새 세션을 발급한다", async () => {
    const response = await POST(request(validBody));

    expect(response.status).toBe(200);
    expect(mocks.changeUserPassword).toHaveBeenCalledWith(expect.anything(), "20261234", "new-hash");
    expect(mocks.createSession).toHaveBeenCalledWith(expect.objectContaining({ studentId: "20261234" }));
    expect(response.headers.get("set-cookie")).toContain("still_session=new-session-token");
  });

  it("현재 비밀번호가 틀리면 변경하지 않고 실패 횟수를 기록한다", async () => {
    mocks.verifyPassword.mockResolvedValue(false);

    const response = await POST(request(validBody));

    expect(response.status).toBe(401);
    expect(mocks.recordLoginFailure).toHaveBeenCalled();
    expect(mocks.changeUserPassword).not.toHaveBeenCalled();
  });

  it("비로그인 요청과 약한 새 비밀번호를 거부한다", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await POST(request(validBody))).status).toBe(401);
    mocks.getCurrentUser.mockResolvedValue({ studentId: "20261234", name: "김알고", role: "member" });
    expect((await POST(request({ ...validBody, newPassword: "01099999999", confirmPassword: "01099999999" }))).status).toBe(400);
  });
});
