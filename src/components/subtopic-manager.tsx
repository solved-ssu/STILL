"use client";

import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import type { SubtopicSummary, TopicSummary } from "@/lib/db/pages";

type EditForm = { title: string; icon: string; description: string };

async function responseMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json() as { message?: string };
    return body.message ?? fallback;
  } catch {
    return fallback;
  }
}

export function SubtopicManager({ topics, subtopics }: {
  topics: TopicSummary[];
  subtopics: SubtopicSummary[];
}) {
  const router = useRouter();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ title: "", icon: "", description: "" });
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  function keyOf(subtopic: SubtopicSummary): string {
    return `${subtopic.topicSlug}:${subtopic.slug}`;
  }

  function beginEdit(subtopic: SubtopicSummary): void {
    setEditingKey(keyOf(subtopic));
    setEditForm({ title: subtopic.title, icon: subtopic.icon, description: subtopic.description });
    setMessage("");
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>, subtopic: SubtopicSummary): Promise<void> {
    event.preventDefault();
    const key = keyOf(subtopic);
    setBusyKey(key);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/subtopics/${encodeURIComponent(subtopic.topicSlug)}/${encodeURIComponent(subtopic.slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!response.ok) {
        setMessage(await responseMessage(response, "소주제를 수정하지 못했습니다."));
        return;
      }
      setEditingKey(null);
      setMessage("소주제를 수정했습니다.");
      router.refresh();
    } catch {
      setMessage("네트워크 오류로 소주제를 수정하지 못했습니다.");
    } finally {
      setBusyKey(null);
    }
  }

  async function move(subtopic: SubtopicSummary, direction: -1 | 1): Promise<void> {
    const siblings = subtopics.filter((item) => item.topicSlug === subtopic.topicSlug);
    const index = siblings.findIndex((item) => item.slug === subtopic.slug);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= siblings.length) return;
    const reordered = [...siblings];
    [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
    const key = keyOf(subtopic);
    setBusyKey(key);
    setMessage("");
    try {
      const response = await fetch("/api/admin/subtopics/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicSlug: subtopic.topicSlug, orderedSlugs: reordered.map((item) => item.slug) }),
      });
      if (!response.ok) {
        setMessage(await responseMessage(response, "소주제 순서를 저장하지 못했습니다."));
        return;
      }
      setMessage("소주제 순서를 저장했습니다.");
      router.refresh();
    } catch {
      setMessage("네트워크 오류로 소주제 순서를 저장하지 못했습니다.");
    } finally {
      setBusyKey(null);
    }
  }

  async function remove(subtopic: SubtopicSummary): Promise<void> {
    if (!window.confirm(`‘${subtopic.title}’ 소주제를 삭제할까요?`)) return;
    const key = keyOf(subtopic);
    setBusyKey(key);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/subtopics/${encodeURIComponent(subtopic.topicSlug)}/${encodeURIComponent(subtopic.slug)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setMessage(await responseMessage(response, "소주제를 삭제하지 못했습니다."));
        return;
      }
      setMessage("소주제를 삭제했습니다.");
      router.refresh();
    } catch {
      setMessage("네트워크 오류로 소주제를 삭제하지 못했습니다.");
    } finally {
      setBusyKey(null);
    }
  }

  return <>
    <div className="mt-5 grid gap-3 lg:grid-cols-2">
      {topics.map((topic) => {
        const siblings = subtopics.filter((item) => item.topicSlug === topic.slug);
        return <section key={topic.slug} aria-labelledby={`subtopic-group-${topic.slug}`} className="border border-[#e2e4e1] bg-[#f8f9f7] p-3">
          <h3 id={`subtopic-group-${topic.slug}`} className="text-xs font-semibold text-[#4e544f]">{topic.icon} {topic.title}</h3>
          {siblings.length === 0 ? <p className="mt-3 text-xs text-[#7a807b]">등록된 소주제가 없습니다.</p> : <ol className="mt-2 space-y-2">
            {siblings.map((subtopic, index) => {
              const key = keyOf(subtopic);
              const busy = busyKey === key;
              return <li key={subtopic.slug} className="border border-[#e2e4e1] bg-white p-2">
                {editingKey === key ? <form onSubmit={(event) => saveEdit(event, subtopic)} className="grid gap-2 sm:grid-cols-[64px_1fr]">
                  <label className="text-[11px] font-semibold text-[#626863]">아이콘<input aria-label="소주제 아이콘" required maxLength={8} value={editForm.icon} onChange={(event) => setEditForm((current) => ({ ...current, icon: event.target.value }))} className="mt-1 h-9 w-full border border-[#dfe2de] px-2 text-sm" /></label>
                  <label className="text-[11px] font-semibold text-[#626863]">이름<input aria-label="소주제 이름" required maxLength={60} value={editForm.title} onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))} className="mt-1 h-9 w-full border border-[#dfe2de] px-2 text-sm" /></label>
                  <label className="text-[11px] font-semibold text-[#626863] sm:col-span-2">설명<input aria-label="소주제 설명" required maxLength={120} value={editForm.description} onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} className="mt-1 h-9 w-full border border-[#dfe2de] px-2 text-sm" /></label>
                  <div className="flex gap-2 sm:col-span-2">
                    <button disabled={busy} className="h-8 flex-1 bg-[#315c50] px-3 text-xs font-semibold text-white">변경 저장</button>
                    <button type="button" onClick={() => setEditingKey(null)} className="h-8 border border-[#dfe2de] px-3 text-xs font-semibold">취소</button>
                  </div>
                </form> : <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 text-xs text-[#4f5550]"><b className="mr-1.5 text-[#262a27]">{subtopic.icon} {subtopic.title}</b><span className="text-[#626863]">문서 {subtopic.pageCount}개</span></span>
                  <div className="flex shrink-0" aria-label={`${subtopic.title} 관리`}>
                    <button type="button" disabled={busy || index === 0} onClick={() => move(subtopic, -1)} aria-label={`${subtopic.title} 위로 이동`} className="grid h-8 w-8 place-items-center text-[#626863] hover:bg-[#edf2ef] disabled:opacity-25"><ArrowUp size={14} aria-hidden="true" /></button>
                    <button type="button" disabled={busy || index === siblings.length - 1} onClick={() => move(subtopic, 1)} aria-label={`${subtopic.title} 아래로 이동`} className="grid h-8 w-8 place-items-center text-[#626863] hover:bg-[#edf2ef] disabled:opacity-25"><ArrowDown size={14} aria-hidden="true" /></button>
                    <button type="button" disabled={busy} onClick={() => beginEdit(subtopic)} aria-label={`${subtopic.title} 수정`} className="grid h-8 w-8 place-items-center text-[#315c50] hover:bg-[#edf2ef] disabled:opacity-40"><Pencil size={14} aria-hidden="true" /></button>
                    <button type="button" disabled={busy} onClick={() => remove(subtopic)} aria-label={`${subtopic.title} 삭제`} className="grid h-8 w-8 place-items-center text-red-700 hover:bg-red-50 disabled:opacity-40"><Trash2 size={14} aria-hidden="true" /></button>
                  </div>
                </div>}
              </li>;
            })}
          </ol>}
        </section>;
      })}
    </div>
    {message && <p role="status" aria-live="polite" className="mt-3 text-sm font-medium text-[#626863]">{message}</p>}
  </>;
}
