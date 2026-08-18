"use client";

import type { PartialBlock } from "@blocknote/core";
import { ko } from "@blocknote/core/locales";
import { BlockNoteView } from "@blocknote/mantine";
import { SuggestionMenuController, useCreateBlockNote } from "@blocknote/react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { PageLinkOption } from "@/lib/db/pages";

function searchLinkablePages(pages: PageLinkOption[], query: string): PageLinkOption[] {
  const normalized = query.trim().toLocaleLowerCase("ko-KR");
  return pages
    .filter((page) => !normalized || page.title.toLocaleLowerCase("ko-KR").includes(normalized))
    .sort((left, right) => left.title.localeCompare(right.title, "ko-KR"))
    .slice(0, 8);
}

export default function BlockEditorInner({
  initialContent,
  editable,
  onChange,
  linkablePages = [],
}: {
  initialContent: unknown[];
  editable: boolean;
  onChange?: (blocks: unknown[]) => void;
  linkablePages?: PageLinkOption[];
}) {
  const editor = useCreateBlockNote(
    initialContent.length > 0
      ? { initialContent: initialContent as PartialBlock[], dictionary: ko }
      : { dictionary: ko },
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);
  const [linkQuery, setLinkQuery] = useState("");
  const linkResults = useMemo(() => searchLinkablePages(linkablePages, linkQuery), [linkQuery, linkablePages]);
  useEffect(() => {
    const textBox = containerRef.current?.querySelector<HTMLElement>("[role='textbox']");
    textBox?.setAttribute("aria-label", editable ? "문서 편집기" : "문서 내용");
  }, [editable]);

  useEffect(() => {
    if (linkPickerOpen) searchInputRef.current?.focus();
  }, [linkPickerOpen]);

  function insertPageLink(page: PageLinkOption): void {
    editor.insertInlineContent([
      { type: "link", href: `/pages/${page.slug}`, content: page.title },
    ], { updateSelection: true });
    onChange?.(editor.document);
    setLinkPickerOpen(false);
    setLinkQuery("");
    editor.focus();
  }

  return (
    <div ref={containerRef}>
      {editable && linkablePages.length > 0 && (
        <div className="relative mb-4 border-y border-[#dfe2de] bg-[#f8f9f7] px-3 py-2">
          <button
            type="button"
            aria-expanded={linkPickerOpen}
            onClick={() => setLinkPickerOpen((open) => !open)}
            className="text-xs font-semibold text-[#315c50] hover:underline"
          >
            노트 연결 <span aria-hidden="true" className="font-normal text-[#717772]">[[</span>
          </button>
          {linkPickerOpen && (
            <div className="absolute left-3 top-10 z-30 w-[min(360px,calc(100vw-40px))] border border-[#cfd3cf] bg-white p-2">
              <label htmlFor="page-link-search" className="sr-only">연결할 노트 검색</label>
              <input
                ref={searchInputRef}
                id="page-link-search"
                type="search"
                role="combobox"
                aria-label="연결할 노트 검색"
                aria-expanded="true"
                aria-controls="page-link-results"
                value={linkQuery}
                onChange={(event) => setLinkQuery(event.target.value)}
                placeholder="제목으로 검색"
                className="h-9 w-full border border-[#d5d8d4] px-3 text-sm outline-none"
              />
              <div id="page-link-results" role="listbox" className="mt-1 max-h-56 overflow-auto">
                {linkResults.map((page) => (
                  <button
                    key={page.id}
                    type="button"
                    role="option"
                    aria-selected="false"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => insertPageLink(page)}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-[#eef2ef]"
                  >
                    {page.title}
                  </button>
                ))}
                {linkResults.length === 0 && <p className="px-3 py-3 text-xs text-[#6a706b]">일치하는 공개 노트가 없습니다.</p>}
              </div>
            </div>
          )}
        </div>
      )}
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme="light"
        onChange={() => onChange?.(editor.document)}
      >
        {editable && linkablePages.length > 0 && (
          <SuggestionMenuController
            triggerCharacter="["
            minQueryLength={1}
            getItems={async (query) => {
              if (!query.startsWith("[")) return [];
              return searchLinkablePages(linkablePages, query.slice(1)).map((page) => ({
                title: page.title,
                subtext: `/pages/${page.slug}`,
                aliases: [page.slug],
                onItemClick: () => insertPageLink(page),
              }));
            }}
          />
        )}
      </BlockNoteView>
    </div>
  );
}
