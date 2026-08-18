import { ArrowRight, FilePlus2, Network } from "lucide-react";
import Link from "next/link";

import { KnowledgeGraphView } from "@/components/knowledge-graph";
import { PageList } from "@/components/page-list";
import { WritingGuide } from "@/components/writing-guide";
import { getCurrentUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/database";
import { listPageReferences, listRecentPages, listSubtopics, listTopics } from "@/lib/db/pages";
import { rankConnectedPages } from "@/lib/graph/graph-insights";

export const metadata = { title: "홈" };

export default async function HomePage() {
  const user = await getCurrentUser();
  const database = getDatabase();
  const topics = listTopics(database);
  const subtopics = listSubtopics(database);
  const recentPages = listRecentPages(database, 8);
  const graphPages = listRecentPages(database, 60);
  const graphReferences = listPageReferences(database);
  const totalPageCount = topics.reduce((total, topic) => total + topic.pageCount, 0);
  const activeTopicCount = topics.filter((topic) => topic.pageCount > 0).length;
  const connectedPageCount = new Set(
    graphReferences.flatMap((reference) => [reference.sourcePageId, reference.targetPageId]),
  ).size;
  const connectedPages = rankConnectedPages(graphPages, graphReferences, 3);
  const today = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "long" }).format(new Date());

  return (
    <div className="mx-auto max-w-[1180px] px-5 py-8 md:px-9 md:py-10">
      <header className="flex flex-col gap-5 border-b border-[#dfe2de] pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs text-[#6c716d]">{today}</p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-[-.035em]">학습 공간</h1>
          <p className="mt-2 text-sm text-[#626863]">{user?.name}님, 분야와 노트 사이의 연결을 따라 오늘의 학습을 이어가세요.</p>
        </div>
        <Link href="/editor/new" className="inline-flex h-9 items-center justify-center gap-2 self-start border border-[#315c50] bg-[#315c50] px-3 text-sm font-semibold text-white hover:bg-[#254a40] sm:self-auto"><FilePlus2 aria-hidden="true" size={15} />새 문서</Link>
      </header>

      <dl aria-label="워크스페이스 현황" className="mt-5 grid grid-cols-3 border-y border-[#dfe2de] bg-white">
        <div className="px-3 py-3 sm:px-4"><dt className="text-[11px] text-[#626863]">공개 노트</dt><dd className="mt-1 text-lg font-semibold tabular-nums text-[#202522]">{totalPageCount}</dd></div>
        <div className="border-x border-[#e4e7e3] px-3 py-3 sm:px-4"><dt className="text-[11px] text-[#626863]">연결된 노트</dt><dd className="mt-1 text-lg font-semibold tabular-nums text-[#202522]">{connectedPageCount}</dd></div>
        <div className="px-3 py-3 sm:px-4"><dt className="text-[11px] text-[#626863]">활성 분야</dt><dd className="mt-1 text-lg font-semibold tabular-nums text-[#202522]">{activeTopicCount}</dd></div>
      </dl>

      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
        <KnowledgeGraphView topics={topics} subtopics={subtopics} pages={graphPages} references={graphReferences} totalPageCount={totalPageCount} />
        <aside aria-label="분야별 노트 현황" className="border border-[#dfe2de] bg-white">
          <div className="border-b border-[#dfe2de] px-4 py-3"><h2 className="text-sm font-semibold">분야</h2></div>
          <nav aria-label="전체 분야" className="divide-y divide-[#eceeeb]">
            {topics.map((topic) => (
              <Link key={topic.slug} href={`/topics/${topic.slug}`} className="group flex items-center gap-3 px-4 py-3 hover:bg-[#f5f6f4]">
                <span aria-hidden="true" className="grid h-7 w-7 place-items-center border border-[#dfe2de] bg-[#fafbfa] text-xs font-semibold text-[#315c50]">{topic.icon}</span>
                <span className="min-w-0 flex-1"><b className="block truncate text-[13px] font-medium">{topic.title}</b><small className="mt-0.5 block text-[11px] text-[#626863]">노트 {topic.pageCount}개</small></span>
                <ArrowRight aria-hidden="true" size={13} className="text-[#9ba09c] group-hover:text-[#315c50]" />
              </Link>
            ))}
          </nav>
        </aside>
      </div>

      <section className="mt-10">
        <WritingGuide />
      </section>

      {connectedPages.length > 0 && (
        <section className="mt-10" aria-labelledby="connected-pages-title">
          <div className="mb-3 flex items-end justify-between">
            <div><h2 id="connected-pages-title" className="text-lg font-semibold tracking-[-.02em]">연결 따라 읽기</h2><p className="mt-1 text-xs text-[#626863]">다른 노트와 많이 이어진 길잡이 노트</p></div>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-[#626863]"><Network aria-hidden="true" size={13} />내부 링크 기준</span>
          </div>
          <div className="grid border-y border-[#dfe2de] bg-white md:grid-cols-3">
            {connectedPages.map(({ page, connectionCount }, index) => (
              <Link key={page.id} href={`/pages/${page.slug}`} className={`group flex min-w-0 items-center gap-3 px-4 py-4 hover:bg-[#f5f6f4] ${index > 0 ? "border-t border-[#e8eae7] md:border-l md:border-t-0" : ""}`}>
                <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center border border-[#dfe2de] bg-[#f7f8f6] text-sm">{page.icon}</span>
                <span className="min-w-0 flex-1"><b className="block truncate text-[13px] font-semibold group-hover:text-[#315c50]">{page.title}</b><small className="mt-1 block text-[11px] text-[#626863]">{page.topicTitle} · 연결 {connectionCount}개</small></span>
                <ArrowRight aria-hidden="true" size={13} className="shrink-0 text-[#9ba09c] group-hover:text-[#315c50]" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <div className="mb-3 flex items-end justify-between"><div><h2 className="text-lg font-semibold tracking-[-.02em]">최근 수정</h2><p className="mt-1 text-xs text-[#626863]">최근에 공개되거나 내용이 바뀐 노트</p></div><Link href="/me/pages" className="text-xs font-medium text-[#315c50] hover:underline">내 문서 보기</Link></div>
        <PageList pages={recentPages} />
      </section>

    </div>
  );
}
