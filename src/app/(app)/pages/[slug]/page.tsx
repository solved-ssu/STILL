import { ArrowLeft, Clock3, Edit3, Eye, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BlockEditor } from "@/components/block-editor";
import { CommentsSection } from "@/components/comments-section";
import { DocumentActions } from "@/components/document-actions";
import { getCurrentUser } from "@/lib/auth/session";
import { listCommentsByPage } from "@/lib/db/comments";
import { getDatabase } from "@/lib/db/database";
import { getPageBySlug, incrementPageView } from "@/lib/db/pages";
import { logServerError } from "@/lib/server-log";

type DocumentPageProps = { params: Promise<{ slug: string }> };

function decodeSlug(slug: string): string | null {
  try {
    return decodeURIComponent(slug);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: DocumentPageProps): Promise<Metadata> {
  const user = await getCurrentUser();
  const decodedSlug = decodeSlug((await params).slug);
  if (!user || !decodedSlug) return { title: "문서" };
  const page = getPageBySlug(getDatabase(), decodedSlug, user.studentId);
  if (!page || (page.status === "draft" && page.authorId !== user.studentId && user.role !== "admin")) {
    return { title: "문서" };
  }
  return { title: page.title, description: page.excerpt || undefined };
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/landing");
  const decodedSlug = decodeSlug(slug);
  if (!decodedSlug) notFound();
  const database = getDatabase();
  const page = getPageBySlug(database, decodedSlug, user.studentId);
  if (!page || (page.status === "draft" && page.authorId !== user.studentId && user.role !== "admin")) notFound();
  const canEdit = page.authorId === user.studentId || user.role === "admin";
  const comments = listCommentsByPage(database, page.id);
  let viewCount = page.viewCount;
  try {
    viewCount = incrementPageView(database, page.id) ?? page.viewCount;
  } catch (error) {
    logServerError("문서 조회수 기록 실패", error);
  }

  return <article className="mx-auto max-w-4xl px-5 py-10 md:px-12 md:py-16">
    <div className="flex flex-wrap items-center justify-between gap-4"><nav aria-label="문서 위치" className="flex items-center gap-2 text-sm font-semibold text-[#626863]"><Link href={`/topics/${page.topicSlug}`} className="inline-flex items-center gap-2 hover:text-[#315c50]"><ArrowLeft size={16} />{page.topicTitle}</Link>{page.subtopicSlug && page.subtopicTitle && <><span aria-hidden="true" className="text-[#a4a9a5]">/</span><Link href={`/topics/${page.topicSlug}/${page.subtopicSlug}`} className="hover:text-[#315c50]">{page.subtopicTitle}</Link></>}</nav>{canEdit && <Link href={`/editor/${page.id}`} className="inline-flex h-9 items-center gap-2 rounded-sm border border-[#dfe2de] px-3 text-sm font-semibold text-[#555b56] hover:bg-white"><Edit3 size={15} />편집</Link>}</div>
    <header className="mt-10 border-b border-[#dfe2de] pb-8"><div className="grid h-10 w-10 place-items-center border border-[#dfe2de] bg-white text-xl">{page.icon}</div><h1 className="mt-6 text-[36px] font-semibold leading-tight tracking-[-.04em] md:text-[46px]">{page.title}</h1><p className="mt-4 text-base leading-7 text-[#626863]">{page.excerpt}</p><div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-[#626863]"><span className="font-semibold text-[#4e544f]">{page.authorName}</span><span className="flex items-center gap-1.5"><Clock3 size={13} />{new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(page.updatedAt))}</span><span className="flex items-center gap-1.5"><Eye size={13} />{viewCount}</span><span className="flex items-center gap-1.5"><MessageCircle size={13} />{comments.length}</span></div></header>
    <div className="py-10"><BlockEditor initialContent={page.content} editable={false} /></div>
    <footer className="border-t border-stone-200 pt-6"><DocumentActions pageId={page.id} initialBookmarked={page.bookmarked} /></footer>
    <CommentsSection pageId={page.id} comments={comments} currentUser={{ studentId: user.studentId, role: user.role }} />
  </article>;
}
