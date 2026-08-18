import { ko } from "@blocknote/core/locales";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  editor: { document: [], insertInlineContent: vi.fn(), focus: vi.fn() },
  useCreateBlockNote: vi.fn(),
  suggestionMenuController: vi.fn(),
}));

mocks.useCreateBlockNote.mockImplementation(() => mocks.editor);

vi.mock("@blocknote/react", () => ({
  SuggestionMenuController: (props: unknown) => {
    mocks.suggestionMenuController(props);
    return null;
  },
  useCreateBlockNote: mocks.useCreateBlockNote,
}));
vi.mock("@blocknote/mantine", () => ({
  BlockNoteView: ({ children }: { children?: ReactNode }) => <><div role="textbox" />{children}</>,
}));

import BlockEditorInner from "./block-editor-inner";

describe("BlockEditorInner", () => {
  beforeEach(() => {
    mocks.useCreateBlockNote.mockClear();
    mocks.editor.insertInlineContent.mockClear();
    mocks.editor.focus.mockClear();
    mocks.suggestionMenuController.mockClear();
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

    const trigger = screen.getByRole("button", { name: "노트 연결" });
    await userEvent.click(trigger);
    const search = screen.getByRole("combobox", { name: "연결할 노트 검색" });
    await userEvent.type(search, "trans");
    await userEvent.keyboard("{ArrowDown}{Enter}");

    expect(mocks.editor.insertInlineContent).toHaveBeenCalledWith([
      { type: "link", href: "/pages/transformer-attention", content: "Transformer 어텐션" },
    ], { updateSelection: true });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(mocks.editor.focus).toHaveBeenCalled();
  });

  it("링크 피커는 listbox ARIA와 Escape 닫힘·포커스 복귀를 제공한다", async () => {
    render(<BlockEditorInner
      initialContent={[]}
      editable
      linkablePages={[{ id: "segment-tree", slug: "segment-tree", title: "세그먼트 트리" }]}
    />);

    const trigger = screen.getByRole("button", { name: "노트 연결" });
    await userEvent.click(trigger);
    const search = screen.getByRole("combobox", { name: "연결할 노트 검색" });
    expect(search).toHaveAttribute("aria-autocomplete", "list");
    expect(search).toHaveAttribute("aria-controls", "page-link-results");
    expect(screen.getByRole("listbox", { name: "연결할 노트 목록" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "세그먼트 트리" })).toHaveAttribute("aria-selected", "true");

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("listbox", { name: "연결할 노트 목록" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("실제 [[ 제안은 두 번째 대괄호에서만 공개 노트를 반환한다", async () => {
    render(<BlockEditorInner
      initialContent={[]}
      editable
      linkablePages={[{ id: "segment-tree", slug: "segment-tree", title: "세그먼트 트리" }]}
    />);

    const controllerProps = mocks.suggestionMenuController.mock.calls[0]?.[0] as {
      triggerCharacter: string;
      getItems: (query: string) => Promise<Array<{ title: string }>>;
    };

    expect(controllerProps.triggerCharacter).toBe("[[");
    await expect(controllerProps.getItems("세그")).resolves.toEqual([
      expect.objectContaining({ title: "세그먼트 트리" }),
    ]);
    await expect(controllerProps.getItems("i")).resolves.toEqual([]);
  });
});
