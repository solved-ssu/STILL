import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DocumentActions } from "./document-actions";

describe("DocumentActions", () => {
  afterEach(() => vi.restoreAllMocks());

  it("신고 실패 시 서버가 제공한 구체적인 사유를 보여준다", async () => {
    vi.spyOn(window, "prompt").mockReturnValue("짧은 사유");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ message: "신고 사유를 10자 이상 입력해 주세요." }),
      { status: 400, headers: { "content-type": "application/json" } },
    ));
    render(<DocumentActions pageId="segment-tree" initialBookmarked={false} />);

    await userEvent.click(screen.getByRole("button", { name: "신고" }));

    expect(screen.getByText("신고 사유를 10자 이상 입력해 주세요.")).toBeInTheDocument();
  });
});
