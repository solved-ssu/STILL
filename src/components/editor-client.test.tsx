import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("./block-editor", () => ({ BlockEditor: () => <div>editor</div> }));

import { EditorClient } from "./editor-client";

describe("EditorClient", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("긴 제목을 입력하면 textarea 높이를 내용에 맞춘다", async () => {
    render(<EditorClient page={null} topics={[{ slug: "algorithm", title: "알고리즘", icon: "A", description: "", pageCount: 0 }]} subtopics={[]} />);
    const title = screen.getByPlaceholderText("제목 없음");
    Object.defineProperty(title, "scrollHeight", { configurable: true, value: 104 });

    await userEvent.type(title, "아주 긴 문서 제목입니다");

    expect(title).toHaveStyle({ height: "104px" });
  });

  it("선택한 대주제에 속한 소주제만 제시한다", async () => {
    render(<EditorClient
      page={null}
      topics={[
        { slug: "algorithm", title: "알고리즘", icon: "A", description: "", pageCount: 0 },
        { slug: "ai", title: "AI", icon: "B", description: "", pageCount: 0 },
      ]}
      subtopics={[
        { topicSlug: "algorithm", slug: "data-structures", title: "자료구조", icon: "D", description: "", pageCount: 0 },
        { topicSlug: "ai", slug: "machine-learning", title: "머신러닝", icon: "M", description: "", pageCount: 0 },
      ]}
    />);
    expect(screen.getByLabelText("소주제(선택)")).toHaveTextContent("자료구조");
    expect(screen.getByLabelText("소주제(선택)")).not.toHaveTextContent("머신러닝");

    await userEvent.selectOptions(screen.getByLabelText("대주제"), "ai");
    expect(screen.getByLabelText("소주제(선택)")).toHaveTextContent("머신러닝");
    expect(screen.getByLabelText("소주제(선택)")).not.toHaveTextContent("자료구조");
  });

  it("작은 화면에서도 초안을 임시저장할 수 있게 저장 버튼을 숨기지 않는다", () => {
    render(<EditorClient page={null} topics={[{ slug: "algorithm", title: "알고리즘", icon: "A", description: "", pageCount: 0 }]} subtopics={[]} />);

    expect(screen.getByRole("button", { name: "저장" })).not.toHaveClass("hidden");
  });
});
