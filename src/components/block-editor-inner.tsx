"use client";

import type { PartialBlock } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { useEffect, useRef } from "react";

export default function BlockEditorInner({
  initialContent,
  editable,
  onChange,
}: {
  initialContent: unknown[];
  editable: boolean;
  onChange?: (blocks: unknown[]) => void;
}) {
  const editor = useCreateBlockNote(
    initialContent.length > 0 ? { initialContent: initialContent as PartialBlock[] } : {},
  );
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const textBox = containerRef.current?.querySelector<HTMLElement>("[role='textbox']");
    textBox?.setAttribute("aria-label", editable ? "문서 편집기" : "문서 내용");
  }, [editable]);
  return (
    <div ref={containerRef}>
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme="light"
        onChange={() => onChange?.(editor.document)}
      />
    </div>
  );
}
