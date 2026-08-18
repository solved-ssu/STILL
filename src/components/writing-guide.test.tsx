import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WritingGuide } from "./writing-guide";

describe("WritingGuide", () => {
  it("예시 문서를 만들지 않고 부원이 따라 쓸 작성 기준을 안내한다", () => {
    render(<WritingGuide />);

    expect(screen.getByRole("heading", { name: "문서 작성 가이드" })).toBeInTheDocument();
    expect(screen.getByText("주제와 질문을 하나로 정하기")).toBeInTheDocument();
    expect(screen.getByText("권장 문서 구조")).toBeInTheDocument();
    expect(screen.getByText("근거와 출처 남기기")).toBeInTheDocument();
    expect(screen.getByText("노트 연결하기")).toBeInTheDocument();
    expect(screen.getByText("저장·공개 전 확인")).toBeInTheDocument();
    expect(screen.queryByText("MEMBER WRITING")).not.toBeInTheDocument();
  });
});
