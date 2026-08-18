"use client";

import { Bookmark, Flag, LoaderCircle } from "lucide-react";
import { useState } from "react";

export function DocumentActions({ pageId, initialBookmarked }: { pageId: string; initialBookmarked: boolean }) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function bookmark() {
    setPending(true);
    const response = await fetch(`/api/bookmarks/${pageId}`, { method: "POST" });
    const result = (await response.json()) as { bookmarked?: boolean };
    if (response.ok) setBookmarked(Boolean(result.bookmarked));
    setPending(false);
  }

  async function report() {
    const reason = window.prompt("신고 사유를 입력해 주세요. (10자 이상)");
    if (!reason) return;
    setMessage("");
    try {
      const response = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pageId, reason }) });
      const result = await response.json().catch(() => ({})) as { message?: string };
      setMessage(response.ok ? "신고가 접수되었습니다." : (result.message ?? "신고를 접수하지 못했습니다."));
    } catch {
      setMessage("서버에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
    }
  }

  return <div className="flex flex-wrap items-center gap-2"><button onClick={bookmark} disabled={pending} className={`inline-flex h-9 items-center gap-2 rounded-sm border px-3 text-sm font-semibold transition ${bookmarked ? "border-amber-200 bg-amber-50 text-amber-800" : "border-[#dfe2de] text-[#626863] hover:bg-white"}`}>{pending ? <LoaderCircle size={15} className="animate-spin" /> : <Bookmark size={15} fill={bookmarked ? "currentColor" : "none"} />}{bookmarked ? "저장됨" : "북마크"}</button><button onClick={report} className="inline-flex h-9 items-center gap-2 rounded-sm border border-[#dfe2de] px-3 text-sm font-semibold text-[#626863] hover:bg-white"><Flag size={14} />신고</button>{message && <span className="text-xs text-[#626863]">{message}</span>}</div>;
}
