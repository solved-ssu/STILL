// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getDatabase: vi.fn(() => ({})),
  isSameOrigin: vi.fn(),
  reorderSubtopics: vi.fn(),
}));

vi.mock("@/lib/auth/request-security", () => ({ isSameOrigin: mocks.isSameOrigin }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/db/database", () => ({ getDatabase: mocks.getDatabase }));
vi.mock("@/lib/db/pages", () => ({ reorderSubtopics: mocks.reorderSubtopics }));

import { PATCH } from "./route";

function request(body: unknown) {
  return new Request("http://localhost/api/admin/subtopics/reorder", {
    method: "PATCH",
    headers: { "content-type": "application/json", origin: "http://localhost", host: "localhost" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/admin/subtopics/reorder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isSameOrigin.mockReturnValue(true);
    mocks.getCurrentUser.mockResolvedValue({ studentId: "20260001", name: "관리자", role: "admin" });
    mocks.reorderSubtopics.mockReturnValue(true);
  });

  it("한 대주제의 전체 소주제 순서를 저장한다", async () => {
    const body = { topicSlug: "algorithm", orderedSlugs: ["graph-search", "data-structures"] };
    const response = await PATCH(request(body));

    expect(response.status).toBe(200);
    expect(mocks.reorderSubtopics).toHaveBeenCalledWith(expect.anything(), body.topicSlug, body.orderedSlugs);
  });

  it("중복·빈 순서와 저장 시점에 달라진 목록을 거부한다", async () => {
    expect((await PATCH(request({ topicSlug: "algorithm", orderedSlugs: [] }))).status).toBe(400);
    expect((await PATCH(request({ topicSlug: "algorithm", orderedSlugs: ["same", "same"] }))).status).toBe(400);
    mocks.reorderSubtopics.mockReturnValue(false);
    expect((await PATCH(request({ topicSlug: "algorithm", orderedSlugs: ["graph-search"] }))).status).toBe(409);
  });
});
