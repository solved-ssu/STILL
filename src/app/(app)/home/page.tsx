import { ArrowRight, FilePlus2 } from "lucide-react";
import Link from "next/link";

import { KnowledgeGraphView } from "@/components/knowledge-graph";
import { PageList } from "@/components/page-list";
import { getCurrentUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/database";
import { listPageReferences, listRecentPages, listSubtopics, listTopics } from "@/lib/db/pages";

export const metadata = { title: "홈" };

export default async function HomePage() {
  const user = await getCurrentUser();
  const database = getDatabase();
  const topics = listTopics(database);
  const subtopics = listSubtopics(database);
  const recentPages = listRecentPages(database, 8);
  const graphPages = listRecentPages(database, 60);
  const graphReferences = listPageReferences(database);
  const today = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "long" }).format(new Date());

  return (
    <div className="mx-auto max-w-[1180px] px-5 py-8 md:px-9 md:py-10">
      <header className="flex flex-col gap-5 border-b border-[#dfe2de] pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs text-[#6c716d]">{today}</p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-[-.035em]">{user?.name}님의 학습 공간</h1>
          <p className="mt-2 text-sm text-[#626863]">분야를 선택해 노트의 연결 관계를 살펴보세요.</p>
        </div>
        <Link href="/editor/new" className="inline-flex h-9 items-center justify-center gap-2 self-start border border-[#315c50] bg-[#315c50] px-3 text-sm font-semibold text-white hover:bg-[#254a40] sm:self-auto"><FilePlus2 size={15} />새 문서</Link>
      </header>

      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
        <KnowledgeGraphView topics={topics} subtopics={subtopics} pages={graphPages} references={graphReferences} totalPageCount={topics.reduce((total, topic) => total + topic.pageCount, 0)} />
        <aside aria-label="분야별 노트 현황" className="border border-[#dfe2de] bg-white">
          <div className="border-b border-[#dfe2de] px-4 py-3"><h2 className="text-sm font-semibold">분야</h2></div>
          <nav aria-label="전체 분야" className="divide-y divide-[#eceeeb]">
            {topics.map((topic) => (
              <Link key={topic.slug} href={`/topics/${topic.slug}`} className="group flex items-center gap-3 px-4 py-3 hover:bg-[#f5f6f4]">
                <span className="grid h-7 w-7 place-items-center border border-[#dfe2de] bg-[#fafbfa] text-xs font-semibold text-[#315c50]">{topic.icon}</span>
                <span className="min-w-0 flex-1"><b className="block truncate text-[13px] font-medium">{topic.title}</b><small className="mt-0.5 block text-[11px] text-[#626863]">노트 {topic.pageCount}개</small></span>
                <ArrowRight size={13} className="text-[#9ba09c] group-hover:text-[#315c50]" />
              </Link>
            ))}
          </nav>
        </aside>
      </div>

      <section className="mt-10">
        <div className="mb-3 flex items-end justify-between"><div><h2 className="text-lg font-semibold tracking-[-.02em]">최근 수정</h2><p className="mt-1 text-xs text-[#626863]">최근에 공개되거나 내용이 바뀐 노트</p></div><Link href="/me/pages" className="text-xs font-medium text-[#315c50] hover:underline">내 문서 보기</Link></div>
        <PageList pages={recentPages} />
      </section>

    </div>
  );
}
