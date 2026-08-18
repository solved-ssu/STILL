// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteSubtopic: vi.fn(),
  getCurrentUser: vi.fn(),
  getDatabase: vi.fn(() => ({})),
  isSameOrigin: vi.fn(),
  updateSubtopic: vi.fn(),
}));

vi.mock("@/lib/auth/request-security", () => ({ isSameOrigin: mocks.isSameOrigin }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/db/database", () => ({ getDatabase: mocks.getDatabase }));
vi.mock("@/lib/db/pages", () => ({
  deleteSubtopic: mocks.deleteSubtopic,
  updateSubtopic: mocks.updateSubtopic,
}));

import { DELETE, PATCH } from "./route";

const params = { params: Promise.resolve({ topicSlug: "algorithm", slug: "graph-search" }) };
const validBody = { title: "그래프 탐색", icon: "G", description: "BFS, DFS와 최단 경로" };

function request(method: "PATCH" | "DELETE", body?: unknown) {
  return new Request("http://localhost/api/admin/subtopics/algorithm/graph-search", {
    method,
    headers: { "content-type": "application/json", origin: "http://localhost", host: "localhost" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("/api/admin/subtopics/[topicSlug]/[slug]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isSameOrigin.mockReturnValue(true);
    mocks.getCurrentUser.mockResolvedValue({ studentId: "20260001", name: "관리자", role: "admin" });
    mocks.updateSubtopic.mockReturnValue(true);
    mocks.deleteSubtopic.mockReturnValue("deleted");
  });

  it("검증된 소주제를 수정한다", async () => {
    const response = await PATCH(request("PATCH", validBody), params);

    expect(response.status).toBe(200);
    expect(mocks.updateSubtopic).toHaveBeenCalledWith(expect.anything(), "algorithm", "graph-search", validBody);
  });

  it("잘못된 입력과 존재하지 않는 소주제를 구분한다", async () => {
    expect((await PATCH(request("PATCH", { ...validBody, title: "" }), params)).status).toBe(400);
    mocks.updateSubtopic.mockReturnValue(false);
    expect((await PATCH(request("PATCH", validBody), params)).status).toBe(404);
  });

  it("사용 중인 소주제는 보존하고 비어 있는 소주제만 삭제한다", async () => {
    mocks.deleteSubtopic.mockReturnValue("in-use");
    expect((await DELETE(request("DELETE"), params)).status).toBe(409);
    mocks.deleteSubtopic.mockReturnValue("missing");
    expect((await DELETE(request("DELETE"), params)).status).toBe(404);
    mocks.deleteSubtopic.mockReturnValue("deleted");
    expect((await DELETE(request("DELETE"), params)).status).toBe(200);
  });

  it("교차 출처 요청과 일반 회원을 거부한다", async () => {
    mocks.isSameOrigin.mockReturnValue(false);
    expect((await DELETE(request("DELETE"), params)).status).toBe(403);
    mocks.isSameOrigin.mockReturnValue(true);
    mocks.getCurrentUser.mockResolvedValue({ studentId: "20261234", name: "회원", role: "member" });
    expect((await PATCH(request("PATCH", validBody), params)).status).toBe(403);
  });
});
