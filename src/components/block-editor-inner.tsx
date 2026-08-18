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
  const linkPickerButtonRef = useRef<HTMLButtonElement>(null);
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);
  const [linkQuery, setLinkQuery] = useState("");
  const [activeLinkIndex, setActiveLinkIndex] = useState(0);
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

  function closeLinkPicker(returnFocus = false): void {
    setLinkPickerOpen(false);
    setLinkQuery("");
    setActiveLinkIndex(0);
    if (returnFocus) linkPickerButtonRef.current?.focus();
  }

  function toggleLinkPicker(): void {
    if (linkPickerOpen) {
      closeLinkPicker();
      return;
    }
    setLinkQuery("");
    setActiveLinkIndex(0);
    setLinkPickerOpen(true);
  }

  function handleLinkPickerKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Escape") {
      event.preventDefault();
      closeLinkPicker(true);
      return;
    }
    if (linkResults.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveLinkIndex((index) => Math.min(index + 1, linkResults.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveLinkIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      insertPageLink(linkResults[activeLinkIndex] ?? linkResults[0]);
    }
  }

  return (
    <div ref={containerRef}>
      {editable && linkablePages.length > 0 && (
        <div className="relative mb-4 border-y border-[#dfe2de] bg-[#f8f9f7] px-3 py-2">
          <button
            ref={linkPickerButtonRef}
            type="button"
            aria-expanded={linkPickerOpen}
            aria-haspopup="listbox"
            aria-controls={linkPickerOpen ? "page-link-results" : undefined}
            onClick={toggleLinkPicker}
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
                aria-autocomplete="list"
                aria-activedescendant={linkResults[activeLinkIndex] ? `page-link-result-${linkResults[activeLinkIndex].id}` : undefined}
                value={linkQuery}
                onChange={(event) => {
                  setLinkQuery(event.target.value);
                  setActiveLinkIndex(0);
                }}
                onKeyDown={handleLinkPickerKeyDown}
                placeholder="제목으로 검색"
                className="h-9 w-full border border-[#d5d8d4] px-3 text-sm outline-none"
              />
              <div id="page-link-results" role="listbox" aria-label="연결할 노트 목록" className="mt-1 max-h-56 overflow-auto">
                {linkResults.map((page, index) => (
                  <button
                    key={page.id}
                    id={`page-link-result-${page.id}`}
                    type="button"
                    role="option"
                    aria-selected={activeLinkIndex === index}
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
            triggerCharacter="[["
            getItems={async (query) => {
              return searchLinkablePages(linkablePages, query).map((page) => ({
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
