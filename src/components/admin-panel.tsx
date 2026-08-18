"use client";

import { CheckCircle2, FileSpreadsheet, LoaderCircle, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import type { AdminReport } from "@/lib/db/admin";
import type { SubtopicSummary, TopicSummary } from "@/lib/db/pages";
import { SubtopicManager } from "@/components/subtopic-manager";

export function AdminPanel({ topics, subtopics, reports }: { topics: TopicSummary[]; subtopics: SubtopicSummary[]; reports: AdminReport[] }) {
  const router = useRouter();
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [topicMessage, setTopicMessage] = useState("");
  const [subtopicMessage, setSubtopicMessage] = useState("");

  async function importAccounts(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setImporting(true); setImportMessage("");
    const form = event.currentTarget;
    const response = await fetch("/api/admin/accounts/import", { method: "POST", body: new FormData(form) });
    const result = (await response.json()) as { created?: number; skipped?: number; invalid?: number; message?: string };
    setImporting(false);
    if (!response.ok) { setImportMessage(result.message ?? "등록하지 못했습니다."); return; }
    setImportMessage(`${result.created}명 등록 · ${result.skipped}명 기존 계정 · ${result.invalid}행 제외`);
    form.reset(); router.refresh();
  }

  async function addTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setTopicMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/admin/topics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(data)) });
    const result = (await response.json()) as { message?: string };
    setTopicMessage(response.ok ? "주제를 추가했습니다." : (result.message ?? "추가하지 못했습니다."));
    if (response.ok) { form.reset(); router.refresh(); }
  }

  async function addSubtopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubtopicMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/admin/subtopics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(data)) });
    const result = (await response.json()) as { message?: string };
    setSubtopicMessage(response.ok ? "소주제를 추가했습니다." : (result.message ?? "추가하지 못했습니다."));
    if (response.ok) { form.reset(); router.refresh(); }
  }

  async function resolveReport(id: number) {
    await fetch(`/api/admin/reports/${id}`, { method: "PATCH" });
    router.refresh();
  }

  return <div className="mt-10 grid gap-6 xl:grid-cols-2">
    <section className="border border-[#dfe2de] bg-white p-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center border border-[#dfe2de] text-[#315c50]"><FileSpreadsheet size={19} /></span><div><h2 className="font-semibold">회원 계정 등록</h2><p className="text-sm text-[#626863]">Excel(.xlsx)에서 이름·학번·전화번호를 읽습니다.</p></div></div><form onSubmit={importAccounts} className="mt-6"><label className="block border border-dashed border-[#c8cdc8] bg-[#f6f7f5] px-5 py-8 text-center text-sm text-[#626863]"><input name="file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required className="mx-auto block max-w-full text-sm file:mr-3 file:rounded-sm file:border-0 file:bg-[#315c50] file:px-3 file:py-2 file:font-semibold file:text-white" /><span className="mt-3 block text-xs">최대 2MB · 첫 행 헤더: 이름 / 학번 / 전화번호</span></label><button disabled={importing} className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-sm bg-[#315c50] text-sm font-semibold text-white">{importing ? <LoaderCircle size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}계정 가져오기</button>{importMessage && <p className="mt-3 text-sm font-semibold text-[#626863]">{importMessage}</p>}</form><div className="mt-5 border-l-2 border-amber-600 bg-amber-50 p-4 text-xs leading-5 text-amber-900"><strong>보안 안내</strong><br />전화번호 원문은 저장하지 않고 즉시 scrypt 해시로 변환합니다. 기존 학번의 비밀번호는 Excel 재업로드로 바뀌지 않습니다.</div></section>

    <section className="border border-[#dfe2de] bg-white p-6"><div className="flex items-center justify-between"><div><h2 className="font-semibold">대주제 관리</h2><p className="text-sm text-[#626863]">현재 {topics.length}개 주제</p></div><Plus size={19} className="text-[#315c50]" /></div><div className="mt-5 flex flex-wrap gap-2">{topics.map((topic) => <span key={topic.slug} className="border border-[#dfe2de] bg-[#f6f7f5] px-3 py-1.5 text-sm"><b className="mr-1.5">{topic.icon}</b>{topic.title}</span>)}</div><form onSubmit={addTopic} className="mt-6 grid gap-3 sm:grid-cols-[70px_1fr]"><input name="icon" required maxLength={8} placeholder="✦" className="h-10 rounded-sm border border-[#dfe2de] px-3 outline-none" /><input name="title" required maxLength={60} placeholder="주제 이름" className="h-10 rounded-sm border border-[#dfe2de] px-3 outline-none" /><input name="slug" required pattern="[a-z0-9-]+" maxLength={40} placeholder="영문 주소 (예: cloud)" className="h-10 rounded-sm border border-[#dfe2de] px-3 outline-none sm:col-span-2" /><input name="description" required maxLength={120} placeholder="주제 설명" className="h-10 rounded-sm border border-[#dfe2de] px-3 outline-none sm:col-span-2" /><button className="h-10 rounded-sm border border-[#315c50]/20 bg-[#edf2ef] text-sm font-semibold text-[#315c50] sm:col-span-2">주제 추가</button>{topicMessage && <p className="text-sm text-[#626863] sm:col-span-2">{topicMessage}</p>}</form></section>

    <section className="border border-[#dfe2de] bg-white p-6 xl:col-span-2"><div className="flex items-center justify-between"><div><h2 className="font-semibold">소주제 관리</h2><p className="text-sm text-[#626863]">대주제 안에 {subtopics.length}개 소주제</p></div><Plus size={19} className="text-[#315c50]" /></div><SubtopicManager topics={topics} subtopics={subtopics} /><form onSubmit={addSubtopic} className="mt-6 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-[#626863] sm:col-span-2">상위 대주제<select name="topicSlug" required className="mt-2 h-10 w-full border border-[#dfe2de] bg-white px-3 text-sm">{topics.map((topic) => <option key={topic.slug} value={topic.slug}>{topic.title}</option>)}</select></label><input name="icon" required maxLength={8} placeholder="아이콘 (예: ◈)" className="h-10 rounded-sm border border-[#dfe2de] px-3 outline-none" /><input name="title" required maxLength={60} placeholder="소주제 이름" className="h-10 rounded-sm border border-[#dfe2de] px-3 outline-none" /><input name="slug" required pattern="[a-z0-9-]+" maxLength={40} placeholder="영문 주소 (예: number-theory)" className="h-10 rounded-sm border border-[#dfe2de] px-3 outline-none sm:col-span-2" /><input name="description" required maxLength={120} placeholder="소주제 설명" className="h-10 rounded-sm border border-[#dfe2de] px-3 outline-none sm:col-span-2" /><button className="h-10 rounded-sm border border-[#315c50]/20 bg-[#edf2ef] text-sm font-semibold text-[#315c50] sm:col-span-2">소주제 추가</button>{subtopicMessage && <p className="text-sm text-[#626863] sm:col-span-2">{subtopicMessage}</p>}</form></section>

    <section className="border border-[#dfe2de] bg-white p-6 xl:col-span-2"><h2 className="font-semibold">신고 관리</h2><p className="mt-1 text-sm text-[#626863]">접수된 문서를 검토하고 처리 상태를 변경합니다.</p><div className="mt-5 divide-y divide-[#e7e9e6]">{reports.length === 0 ? <p className="py-8 text-center text-sm text-[#626863]">접수된 신고가 없습니다.</p> : reports.map((report) => <div key={report.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className={`px-2 py-0.5 text-[11px] font-semibold ${report.status === "open" ? "bg-red-50 text-red-700" : "bg-[#f0f2ef] text-[#626863]"}`}>{report.status === "open" ? "검토 필요" : "처리 완료"}</span><b className="truncate text-sm">{report.pageTitle}</b></div><p className="mt-2 text-sm text-[#4f5550]">{report.reason}</p><p className="mt-1 text-xs text-[#626863]">신고자 {report.reporterName}</p></div>{report.status === "open" && <button onClick={() => resolveReport(report.id)} className="inline-flex h-9 items-center justify-center gap-2 rounded-sm border border-[#dfe2de] px-3 text-sm font-semibold text-[#4f5550]"><CheckCircle2 size={15} />처리 완료</button>}</div>)}</div></section>
  </div>;
}
