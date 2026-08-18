"use client";

import { Check, ChevronLeft, Cloud, LoaderCircle, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";

import type { PageDetail, PageLinkOption, SubtopicSummary, TopicSummary } from "@/lib/db/pages";
import { BlockEditor } from "./block-editor";
import { WritingGuide } from "./writing-guide";

export function EditorClient({ page, topics, subtopics, linkablePages = [] }: { page: PageDetail | null; topics: TopicSummary[]; subtopics: SubtopicSummary[]; linkablePages?: PageLinkOption[] }) {
  const router = useRouter();
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const [title, setTitle] = useState(page?.title ?? "");
  const [icon, setIcon] = useState(page?.icon ?? "📄");
  const [excerpt, setExcerpt] = useState(page?.excerpt ?? "");
  const [topicSlug, setTopicSlug] = useState(page?.topicSlug ?? topics[0]?.slug ?? "algorithm");
  const [subtopicSlug, setSubtopicSlug] = useState(page?.subtopicSlug ?? "");
  const [content, setContent] = useState<unknown[]>(page?.content ?? []);
  const [status, setStatus] = useState<"draft" | "published">(page?.status ?? "draft");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useLayoutEffect(() => {
    const titleElement = titleRef.current;
    if (!titleElement) return;
    titleElement.style.height = "auto";
    titleElement.style.height = `${Math.max(titleElement.scrollHeight, 52)}px`;
  }, [title]);

  async function save(nextStatus = status) {
    if (!title.trim()) { setMessage("제목을 입력해 주세요."); return; }
    setSaving(true); setMessage("");
    const response = await fetch(page ? `/api/pages/${page.id}` : "/api/pages", {
      method: page ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, icon, excerpt, topicSlug, subtopicSlug: subtopicSlug || null, content, status: nextStatus }),
    });
    const result = (await response.json()) as { id?: string; message?: string };
    setSaving(false);
    if (!response.ok) { setMessage(result.message ?? "저장하지 못했습니다."); return; }
    setStatus(nextStatus);
    setMessage(nextStatus === "published" ? "공개했습니다." : "저장했습니다.");
    if (!page && result.id) { router.replace(`/editor/${result.id}`); router.refresh(); }
  }

  return <div className="min-h-screen bg-[#fffefa]">
    <header className="sticky top-0 z-20 flex h-13 items-center gap-2 border-b border-[#dfe2de] bg-[#fff] px-3 md:gap-3 md:px-7"><Link href="/me/pages" aria-label="내 문서로 돌아가기" className="p-2 text-[#626863] hover:bg-[#f0f2ef]"><ChevronLeft aria-hidden="true" size={18} /></Link><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold">{title || "제목 없는 문서"}</p><p className="flex items-center gap-1 text-[10px] text-[#626863]"><Cloud aria-hidden="true" size={10} />{message || (page ? "저장된 문서" : "새 문서")}</p></div><button type="button" onClick={() => save("draft")} disabled={saving} className="flex h-8 items-center gap-1.5 border border-[#d5d8d4] px-2.5 text-xs font-semibold text-[#555b56] hover:bg-[#f5f6f4]">{saving ? <LoaderCircle aria-hidden="true" size={14} className="animate-spin" /> : <Check aria-hidden="true" size={14} />}저장</button><button type="button" onClick={() => save("published")} disabled={saving} className="flex h-8 items-center gap-1.5 bg-[#315c50] px-2.5 text-xs font-semibold text-white"><Send aria-hidden="true" size={14} />공개</button></header>
    <h1 className="sr-only">{title.trim() || "새 문서 작성"}</h1>
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-12 md:px-12 md:pt-16">
      <input value={icon} onChange={(event) => setIcon(event.target.value.slice(0, 8))} aria-label="문서 아이콘" className="h-14 w-20 border-0 bg-transparent text-5xl outline-none" />
      <textarea ref={titleRef} value={title} onChange={(event) => setTitle(event.target.value)} rows={1} aria-label="문서 제목" placeholder="제목 없음" maxLength={120} className="mt-4 min-h-13 w-full resize-none overflow-hidden border-0 bg-transparent text-[38px] font-semibold leading-tight tracking-[-.04em] outline-none placeholder:text-stone-300 md:text-[44px]" />
      <div className="mt-6 grid gap-3 border-y border-[#dfe2de] bg-[#f8f9f7] p-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-[#626863]">대주제<select value={topicSlug} onChange={(event) => { setTopicSlug(event.target.value); setSubtopicSlug(""); }} className="mt-2 h-9 w-full border border-[#d5d8d4] bg-white px-3 text-sm font-medium text-[#424743] outline-none">{topics.map((topic) => <option key={topic.slug} value={topic.slug}>{topic.title}</option>)}</select></label>
        <label className="text-xs font-semibold text-[#626863]">소주제(선택)<select value={subtopicSlug} onChange={(event) => setSubtopicSlug(event.target.value)} className="mt-2 h-9 w-full border border-[#d5d8d4] bg-white px-3 text-sm font-medium text-[#424743] outline-none"><option value="">소주제 없음</option>{subtopics.filter((subtopic) => subtopic.topicSlug === topicSlug).map((subtopic) => <option key={subtopic.slug} value={subtopic.slug}>{subtopic.title}</option>)}</select></label>
        <label className="text-xs font-semibold text-[#626863] sm:col-span-2">한 줄 요약<input value={excerpt} onChange={(event) => setExcerpt(event.target.value)} maxLength={240} placeholder="문서에서 배울 수 있는 내용" className="mt-2 h-9 w-full border border-[#d5d8d4] bg-white px-3 text-sm font-normal text-[#424743] outline-none" /></label>
      </div>
      {message && message.includes("못") && <p role="alert" className="mt-3 text-sm text-red-700">{message}</p>}
      <div className="mt-7"><WritingGuide variant="compact" /></div>
      <div className="mt-9 min-h-72"><BlockEditor initialContent={page?.content ?? []} editable onChange={setContent} linkablePages={linkablePages} /></div>
    </div>
  </div>;
}
