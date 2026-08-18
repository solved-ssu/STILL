// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSubtopic: vi.fn(),
  getCurrentUser: vi.fn(),
  getDatabase: vi.fn(() => ({})),
  isSameOrigin: vi.fn(),
}));

vi.mock("@/lib/auth/request-security", () => ({ isSameOrigin: mocks.isSameOrigin }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/db/database", () => ({ getDatabase: mocks.getDatabase }));
vi.mock("@/lib/db/pages", () => ({ createSubtopic: mocks.createSubtopic }));

import { POST } from "./route";

function request(body: unknown) {
  return new Request("http://localhost/api/admin/subtopics", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost", host: "localhost" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  topicSlug: "algorithm",
  slug: "number-theory",
  title: "정수론",
  icon: "#",
  description: "소수와 모듈러 연산",
};

describe("POST /api/admin/subtopics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isSameOrigin.mockReturnValue(true);
    mocks.getCurrentUser.mockResolvedValue({ studentId: "20260001", name: "관리자", role: "admin" });
  });

  it("관리자가 검증된 소주제를 대주제 안에 추가한다", async () => {
    const response = await POST(request(validBody));
    expect(response.status).toBe(201);
    expect(mocks.createSubtopic).toHaveBeenCalledWith(expect.anything(), validBody);
  });

  it("일반 회원과 잘못된 입력을 거부한다", async () => {
    mocks.getCurrentUser.mockResolvedValue({ studentId: "20261234", name: "회원", role: "member" });
    expect((await POST(request(validBody))).status).toBe(403);
    mocks.getCurrentUser.mockResolvedValue({ studentId: "20260001", name: "관리자", role: "admin" });
    expect((await POST(request({ ...validBody, slug: "한글 주소" }))).status).toBe(400);
  });
});
