// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createComment: vi.fn(),
  getCurrentUser: vi.fn(),
  getDatabase: vi.fn(() => ({})),
  isCommentRateLimited: vi.fn(),
  isSameOrigin: vi.fn(),
}));

vi.mock("@/lib/db/comments", () => ({
  createComment: mocks.createComment,
  isCommentRateLimited: mocks.isCommentRateLimited,
}));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/db/database", () => ({ getDatabase: mocks.getDatabase }));
vi.mock("@/lib/auth/request-security", () => ({ isSameOrigin: mocks.isSameOrigin }));

import { POST } from "./route";

function request(body: unknown) {
  return new Request("http://localhost/api/pages/segment-tree/comments", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost", host: "localhost" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/pages/[pageId]/comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isSameOrigin.mockReturnValue(true);
    mocks.getCurrentUser.mockResolvedValue({ studentId: "20261234", name: "김알고", role: "member" });
    mocks.isCommentRateLimited.mockReturnValue(false);
    mocks.createComment.mockReturnValue({ id: 7 });
  });

  it("로그인 사용자의 검증된 댓글을 저장한다", async () => {
    const response = await POST(request({ body: "  질문이 있습니다.  " }), { params: Promise.resolve({ pageId: "segment-tree" }) });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: 7 });
    expect(mocks.createComment).toHaveBeenCalledWith(expect.anything(), "segment-tree", "질문이 있습니다.", expect.objectContaining({ studentId: "20261234" }));
  });

  it("외부 출처, 비로그인, 빈 댓글을 거부한다", async () => {
    mocks.isSameOrigin.mockReturnValue(false);
    expect((await POST(request({ body: "질문" }), { params: Promise.resolve({ pageId: "segment-tree" }) })).status).toBe(403);
    mocks.isSameOrigin.mockReturnValue(true);
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await POST(request({ body: "질문" }), { params: Promise.resolve({ pageId: "segment-tree" }) })).status).toBe(401);
    mocks.getCurrentUser.mockResolvedValue({ studentId: "20261234", name: "김알고", role: "member" });
    expect((await POST(request({ body: "   " }), { params: Promise.resolve({ pageId: "segment-tree" }) })).status).toBe(400);
    expect((await POST(request({ body: "가".repeat(1_001) }), { params: Promise.resolve({ pageId: "segment-tree" }) })).status).toBe(400);
  });

  it("작성 속도와 문서 접근 권한을 확인한다", async () => {
    mocks.isCommentRateLimited.mockReturnValue(true);
    expect((await POST(request({ body: "질문" }), { params: Promise.resolve({ pageId: "segment-tree" }) })).status).toBe(429);
    mocks.isCommentRateLimited.mockReturnValue(false);
    mocks.createComment.mockReturnValue(null);
    expect((await POST(request({ body: "질문" }), { params: Promise.resolve({ pageId: "private" }) })).status).toBe(403);
  });
});
