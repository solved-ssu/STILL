import { ko } from "@blocknote/core/locales";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  editor: { document: [], insertInlineContent: vi.fn(), focus: vi.fn() },
  useCreateBlockNote: vi.fn(),
}));

mocks.useCreateBlockNote.mockImplementation(() => mocks.editor);

vi.mock("@blocknote/react", () => ({
  SuggestionMenuController: () => null,
  useCreateBlockNote: mocks.useCreateBlockNote,
}));
vi.mock("@blocknote/mantine", () => ({
  BlockNoteView: () => <div role="textbox" />,
}));

import BlockEditorInner from "./block-editor-inner";

describe("BlockEditorInner", () => {
  beforeEach(() => {
    mocks.useCreateBlockNote.mockClear();
    mocks.editor.insertInlineContent.mockClear();
  });

  it("블록 메뉴와 안내 문구에 한국어 사전을 사용한다", () => {
    render(<BlockEditorInner initialContent={[]} editable />);

    expect(mocks.useCreateBlockNote).toHaveBeenCalledWith(expect.objectContaining({ dictionary: ko }));
  });

  it("대괄호 두 개로 전체 공개 노트를 검색해 표준 내부 링크를 삽입한다", async () => {
    render(<BlockEditorInner
      initialContent={[]}
      editable
      linkablePages={[
        { id: "segment-tree", slug: "segment-tree", title: "세그먼트 트리" },
        { id: "transformer", slug: "transformer-attention", title: "Transformer 어텐션" },
      ]}
    />);

    await userEvent.click(screen.getByRole("button", { name: "노트 연결" }));
    await userEvent.type(screen.getByRole("combobox", { name: "연결할 노트 검색" }), "trans");
    await userEvent.click(screen.getByRole("option", { name: "Transformer 어텐션" }));

    expect(mocks.editor.insertInlineContent).toHaveBeenCalledWith([
      { type: "link", href: "/pages/transformer-attention", content: "Transformer 어텐션" },
    ], { updateSelection: true });
  });
});
