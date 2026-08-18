import { Clock3, Eye, MessageCircle } from "lucide-react";
import Link from "next/link";

import type { PageSummary } from "@/lib/db/pages";

function relativeDate(value: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
  if (days === 0) return "오늘";
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(value));
}

export function PageList({ pages, empty = "아직 문서가 없습니다." }: { pages: PageSummary[]; empty?: string }) {
  if (pages.length === 0) return <div className="border border-dashed border-[#cdd1cd] px-6 py-12 text-center text-sm text-[#686e69]">{empty}</div>;
  return (
    <div className="border-y border-[#dfe2de] bg-white">
      {pages.map((page) => (
        <Link href={`/pages/${page.slug}`} key={page.id} className="group grid gap-3 border-b border-[#e8eae7] px-3 py-4 last:border-b-0 hover:bg-[#f7f8f6] sm:grid-cols-[1fr_auto]">
          <div className="flex min-w-0 gap-3">
            <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center border border-[#e1e4e0] bg-[#f7f8f6] text-base">{page.icon}</span>
            <div className="min-w-0"><h3 className="truncate text-[14px] font-semibold group-hover:text-[#315c50]">{page.title}</h3><p className="mt-1 line-clamp-1 text-[13px] text-[#656b66]">{page.excerpt}</p><div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-[#626863]"><span>{page.authorName}</span><span className="flex items-center gap-1"><Clock3 aria-hidden="true" size={11} />{relativeDate(page.updatedAt)}</span><span className="flex items-center gap-1"><Eye aria-hidden="true" size={11} />{page.viewCount}</span><span className="flex items-center gap-1"><MessageCircle aria-hidden="true" size={11} />{page.commentCount}</span></div></div>
          </div>
          <span className="self-center text-[11px] font-medium text-[#315c50]">{page.topicTitle}</span>
        </Link>
      ))}
    </div>
  );
}
