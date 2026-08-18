import { ko } from "@blocknote/core/locales";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useCreateBlockNote: vi.fn(() => ({ document: [] })),
}));

vi.mock("@blocknote/react", () => ({ useCreateBlockNote: mocks.useCreateBlockNote }));
vi.mock("@blocknote/mantine", () => ({
  BlockNoteView: () => <div role="textbox" />,
}));

import BlockEditorInner from "./block-editor-inner";

describe("BlockEditorInner", () => {
  beforeEach(() => mocks.useCreateBlockNote.mockClear());

  it("블록 메뉴와 안내 문구에 한국어 사전을 사용한다", () => {
    render(<BlockEditorInner initialContent={[]} editable />);

    expect(mocks.useCreateBlockNote).toHaveBeenCalledWith(expect.objectContaining({ dictionary: ko }));
  });
});
