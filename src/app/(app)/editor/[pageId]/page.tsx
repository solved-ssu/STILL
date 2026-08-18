import { notFound, redirect } from "next/navigation";

import { EditorClient } from "@/components/editor-client";
import { getCurrentUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/database";
import { getPageById, listSubtopics, listTopics } from "@/lib/db/pages";

export const metadata = { title: "문서 편집" };

export default async function EditorPage({ params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/landing");
  const database = getDatabase();
  const page = pageId === "new" ? null : getPageById(database, pageId, user.studentId);
  if (pageId !== "new" && !page) notFound();
  if (page && page.authorId !== user.studentId && user.role !== "admin") redirect(`/pages/${page.slug}`);
  return <EditorClient page={page} topics={listTopics(database)} subtopics={listSubtopics(database)} />;
}
