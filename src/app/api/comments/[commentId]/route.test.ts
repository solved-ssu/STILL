// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteComment: vi.fn(),
  getCurrentUser: vi.fn(),
  getDatabase: vi.fn(() => ({})),
  isSameOrigin: vi.fn(),
}));

vi.mock("@/lib/db/comments", () => ({ deleteComment: mocks.deleteComment }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/db/database", () => ({ getDatabase: mocks.getDatabase }));
vi.mock("@/lib/auth/request-security", () => ({ isSameOrigin: mocks.isSameOrigin }));

import { DELETE } from "./route";

const request = new Request("http://localhost/api/comments/7", {
  method: "DELETE",
  headers: { origin: "http://localhost", host: "localhost" },
});

describe("DELETE /api/comments/[commentId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isSameOrigin.mockReturnValue(true);
    mocks.getCurrentUser.mockResolvedValue({ studentId: "20261234", name: "김알고", role: "member" });
    mocks.deleteComment.mockReturnValue(true);
  });

  it("본인 댓글을 삭제한다", async () => {
    const response = await DELETE(request, { params: Promise.resolve({ commentId: "7" }) });
    expect(response.status).toBe(200);
    expect(mocks.deleteComment).toHaveBeenCalledWith(expect.anything(), 7, expect.objectContaining({ studentId: "20261234" }));
  });

  it("잘못된 번호와 권한 없는 삭제를 거부한다", async () => {
    expect((await DELETE(request, { params: Promise.resolve({ commentId: "nope" }) })).status).toBe(400);
    mocks.deleteComment.mockReturnValue(false);
    expect((await DELETE(request, { params: Promise.resolve({ commentId: "7" }) })).status).toBe(403);
  });

  it("외부 출처와 비로그인 삭제를 거부한다", async () => {
    mocks.isSameOrigin.mockReturnValue(false);
    expect((await DELETE(request, { params: Promise.resolve({ commentId: "7" }) })).status).toBe(403);
    mocks.isSameOrigin.mockReturnValue(true);
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await DELETE(request, { params: Promise.resolve({ commentId: "7" }) })).status).toBe(401);
  });
});
