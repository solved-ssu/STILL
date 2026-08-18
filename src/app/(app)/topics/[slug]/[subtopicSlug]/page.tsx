import { ArrowLeft, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageList } from "@/components/page-list";
import { getDatabase } from "@/lib/db/database";
import { getSubtopic, getTopic, listPagesBySubtopic } from "@/lib/db/pages";

type SubtopicPageProps = { params: Promise<{ slug: string; subtopicSlug: string }> };

export async function generateMetadata({ params }: SubtopicPageProps): Promise<Metadata> {
  const { slug, subtopicSlug } = await params;
  const subtopic = getSubtopic(getDatabase(), slug, subtopicSlug);
  return subtopic
    ? { title: subtopic.title, description: subtopic.description }
    : { title: "소주제" };
}

export default async function SubtopicPage({ params }: SubtopicPageProps) {
  const { slug, subtopicSlug } = await params;
  const database = getDatabase();
  const topic = getTopic(database, slug);
  const subtopic = getSubtopic(database, slug, subtopicSlug);
  if (!topic || !subtopic) notFound();
  const pages = listPagesBySubtopic(database, slug, subtopicSlug);

  return (
    <div className="mx-auto max-w-[980px] px-5 py-9 md:px-10 md:py-12">
      <Link href={`/topics/${slug}`} className="inline-flex items-center gap-2 text-xs font-medium text-[#676d68] hover:text-[#315c50]"><ArrowLeft aria-hidden="true" size={14} />{topic.title}</Link>
      <header className="mt-7 flex flex-col gap-5 border-b border-[#dfe2de] pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div><div className="flex items-center gap-3"><span aria-hidden="true" className="grid h-9 min-w-9 place-items-center border border-[#dfe2de] bg-white text-sm font-semibold text-[#315c50]">{subtopic.icon}</span><span className="text-xs text-[#626863]">{topic.title} · 노트 {pages.length}개</span></div><h1 className="mt-4 text-[32px] font-semibold tracking-[-.035em]">{subtopic.title}</h1><p className="mt-2 text-sm text-[#626863]">{subtopic.description}</p></div>
        <Link href="/editor/new" className="inline-flex h-9 items-center justify-center gap-2 border border-[#315c50] bg-[#315c50] px-3 text-sm font-semibold text-white"><Plus aria-hidden="true" size={15} />문서 작성</Link>
      </header>
      <section className="mt-7"><PageList pages={pages} empty="이 소주제의 첫 문서를 작성해 보세요." /></section>
    </div>
  );
}
