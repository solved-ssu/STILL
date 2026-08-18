import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageList } from "@/components/page-list";
import { getDatabase } from "@/lib/db/database";
import { getTopic, listPagesByTopic, listSubtopics } from "@/lib/db/pages";

type TopicPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const { slug } = await params;
  const topic = getTopic(getDatabase(), slug);
  return topic
    ? { title: topic.title, description: topic.description }
    : { title: "주제" };
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { slug } = await params;
  const database = getDatabase();
  const topic = getTopic(database, slug);
  if (!topic) notFound();
  const pages = listPagesByTopic(database, slug);
  const subtopics = listSubtopics(database, slug);

  return (
    <div className="mx-auto max-w-[980px] px-5 py-9 md:px-10 md:py-12">
      <Link href="/home" className="inline-flex items-center gap-2 text-xs font-medium text-[#676d68] hover:text-[#315c50]"><ArrowLeft aria-hidden="true" size={14} />홈</Link>
      <header className="mt-7 flex flex-col gap-5 border-b border-[#dfe2de] pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div><div className="flex items-center gap-3"><span aria-hidden="true" className="grid h-9 min-w-9 place-items-center border border-[#dfe2de] bg-white text-sm font-semibold text-[#315c50]">{topic.icon}</span><span className="text-xs text-[#626863]">분야 · 노트 {pages.length}개</span></div><h1 className="mt-4 text-[32px] font-semibold tracking-[-.035em]">{topic.title}</h1><p className="mt-2 text-sm text-[#626863]">{topic.description}</p></div>
        <Link href="/editor/new" className="inline-flex h-9 items-center justify-center gap-2 border border-[#315c50] bg-[#315c50] px-3 text-sm font-semibold text-white"><Plus aria-hidden="true" size={15} />문서 작성</Link>
      </header>
      {subtopics.length > 0 && <section className="mt-7" aria-labelledby="subtopics-title"><div className="flex items-end justify-between"><div><h2 id="subtopics-title" className="text-lg font-semibold tracking-[-.02em]">소주제</h2><p className="mt-1 text-xs text-[#626863]">관심 영역을 선택해 문서를 좁혀 보세요.</p></div><span className="text-xs text-[#626863]">{subtopics.length}개</span></div><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{subtopics.map((subtopic) => <Link key={subtopic.slug} href={`/topics/${slug}/${subtopic.slug}`} className="group flex min-h-28 flex-col border border-[#dfe2de] bg-white p-4 hover:border-[#91a39b] hover:bg-[#fbfcfa]"><div className="flex items-start justify-between"><span aria-hidden="true" className="grid h-8 min-w-8 place-items-center border border-[#dfe2de] bg-[#f7f8f6] text-sm font-semibold text-[#315c50]">{subtopic.icon}</span><ArrowRight aria-hidden="true" size={14} className="text-[#a0a5a1] group-hover:text-[#315c50]" /></div><b className="mt-3 text-sm">{subtopic.title}</b><span className="mt-1 line-clamp-2 text-xs leading-5 text-[#626863]">{subtopic.description}</span><small className="mt-auto pt-3 text-[11px] text-[#737975]">노트 {subtopic.pageCount}개</small></Link>)}</div></section>}
      <section className="mt-9"><h2 className="mb-3 text-lg font-semibold tracking-[-.02em]">전체 문서</h2><PageList pages={pages} empty="이 분야의 첫 문서를 작성해 보세요." /></section>
    </div>
  );
}
