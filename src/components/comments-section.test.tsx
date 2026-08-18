import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { CommentsSection } from "./comments-section";

const comments = [{
  id: 1,
  pageId: "segment-tree",
  authorId: "20261234",
  authorName: "김알고",
  body: "업데이트 과정이 궁금합니다.",
  createdAt: "2026-08-14T01:00:00.000Z",
}];

describe("CommentsSection", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    refresh.mockReset();
  });

  it("댓글 목록과 개수를 보여준다", () => {
    render(<CommentsSection pageId="segment-tree" comments={comments} currentUser={{ studentId: "20265678", role: "member" }} />);
    expect(screen.getByRole("heading", { name: "질문과 댓글 1" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "김알고의 댓글" })).toHaveTextContent("업데이트 과정이 궁금합니다.");
    expect(screen.queryByRole("button", { name: "댓글 삭제" })).not.toBeInTheDocument();
  });

  it("새 질문을 작성하고 목록을 새로고침한다", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ id: 2 }), { status: 201 }));
    render(<CommentsSection pageId="segment-tree" comments={comments} currentUser={{ studentId: "20265678", role: "member" }} />);
    await userEvent.type(screen.getByLabelText("질문 또는 댓글"), "시간복잡도를 설명해 주세요.");
    await userEvent.click(screen.getByRole("button", { name: "댓글 등록" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/pages/segment-tree/comments", expect.objectContaining({ method: "POST" }));
    expect(refresh).toHaveBeenCalled();
  });

  it("작성자는 자신의 댓글을 삭제할 수 있다", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
    render(<CommentsSection pageId="segment-tree" comments={comments} currentUser={{ studentId: "20261234", role: "member" }} />);
    await userEvent.click(screen.getByRole("button", { name: "댓글 삭제" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/comments/1", { method: "DELETE" });
    expect(refresh).toHaveBeenCalled();
  });
});
