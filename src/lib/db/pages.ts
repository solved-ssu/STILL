import type { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";

import { parseStoredPageContent } from "@/lib/content/page-content";
import { extractInternalPageSlugs } from "@/lib/content/page-links";

export interface TopicSummary {
  slug: string;
  title: string;
  icon: string;
  description: string;
  pageCount: number;
}

export interface SubtopicSummary {
  topicSlug: string;
  slug: string;
  title: string;
  icon: string;
  description: string;
  pageCount: number;
}

export interface PageSummary {
  id: string;
  slug: string;
  title: string;
  icon: string;
  excerpt: string;
  topicSlug: string;
  topicTitle: string;
  subtopicSlug: string | null;
  subtopicTitle: string | null;
  authorName: string;
  updatedAt: string;
  viewCount: number;
  commentCount: number;
  status: "draft" | "published";
}

export interface ContributorStat {
  studentId: string;
  name: string;
  monthlyPostCount: number;
  postCount: number;
}

export interface PageDetail extends PageSummary {
  content: unknown[];
  authorId: string | null;
  bookmarked: boolean;
}

export interface PageReference {
  sourcePageId: string;
  targetPageId: string;
}

export interface PageLinkOption {
  id: string;
  slug: string;
  title: string;
}

type PageRow = {
  id: string;
  slug: string;
  title: string;
  icon: string;
  excerpt: string;
  topic_slug: string;
  topic_title: string;
  subtopic_slug: string | null;
  subtopic_title: string | null;
  author_name: string;
  author_id: string | null;
  content_json?: string;
  updated_at: string;
  view_count: number;
  comment_count: number;
  status: "draft" | "published";
  bookmarked?: number;
};

function summary(row: PageRow): PageSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    icon: row.icon,
    excerpt: row.excerpt,
    topicSlug: row.topic_slug,
    topicTitle: row.topic_title,
    subtopicSlug: row.subtopic_slug,
    subtopicTitle: row.subtopic_title,
    authorName: row.author_name,
    updatedAt: row.updated_at,
    viewCount: row.view_count,
    commentCount: row.comment_count,
    status: row.status,
  };
}

const pageSelect = `
  SELECT p.*, t.title AS topic_title, ps.subtopic_slug, st.title AS subtopic_title,
    (SELECT COUNT(*) FROM comments c WHERE c.page_id = p.id) AS comment_count
  FROM pages p JOIN topics t ON t.slug = p.topic_slug
  LEFT JOIN page_subtopics ps ON ps.page_id = p.id
  LEFT JOIN subtopics st ON st.topic_slug = ps.topic_slug AND st.slug = ps.subtopic_slug
`;

function koreaMonthRange(now: Date): { start: string; end: string } {
  const koreaTime = new Date(now.getTime() + 9 * 60 * 60_000);
  const year = koreaTime.getUTCFullYear();
  const month = koreaTime.getUTCMonth();
  return {
    start: new Date(Date.UTC(year, month, 1) - 9 * 60 * 60_000).toISOString(),
    end: new Date(Date.UTC(year, month + 1, 1) - 9 * 60 * 60_000).toISOString(),
  };
}

export function listContributorStats(database: DatabaseSync, now = new Date()): ContributorStat[] {
  const { start, end } = koreaMonthRange(now);
  const rows = database
    .prepare(`
      SELECT u.student_id, u.name, COUNT(p.id) AS post_count,
        SUM(CASE WHEN p.created_at >= ? AND p.created_at < ? THEN 1 ELSE 0 END) AS monthly_post_count
      FROM users u
      LEFT JOIN pages p ON p.author_id = u.student_id AND p.status = 'published'
      WHERE u.status = 'active'
      GROUP BY u.student_id, u.name
      ORDER BY monthly_post_count DESC, post_count DESC, u.name COLLATE NOCASE, u.student_id
    `)
    .all(start, end) as Array<{ student_id: string; name: string; monthly_post_count: number; post_count: number }>;
  return rows.map((row) => ({
    studentId: row.student_id,
    name: row.name,
    monthlyPostCount: row.monthly_post_count,
    postCount: row.post_count,
  }));
}

export function listTopics(database: DatabaseSync): TopicSummary[] {
  const rows = database
    .prepare(`
      SELECT t.slug, t.title, t.icon, t.description, COUNT(p.id) AS page_count
      FROM topics t LEFT JOIN pages p ON p.topic_slug = t.slug AND p.status = 'published'
      GROUP BY t.slug ORDER BY t.sort_order, t.title
    `)
    .all() as Array<{ slug: string; title: string; icon: string; description: string; page_count: number }>;
  return rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    icon: row.icon,
    description: row.description,
    pageCount: row.page_count,
  }));
}

export function getTopic(database: DatabaseSync, slug: string): TopicSummary | null {
  return listTopics(database).find((topic) => topic.slug === slug) ?? null;
}

export function listSubtopics(database: DatabaseSync, topicSlug?: string): SubtopicSummary[] {
  const where = topicSlug ? "WHERE s.topic_slug = ?" : "";
  const rows = database
    .prepare(`
      SELECT s.topic_slug, s.slug, s.title, s.icon, s.description,
        COUNT(CASE WHEN p.status = 'published' THEN p.id END) AS page_count
      FROM subtopics s
      LEFT JOIN page_subtopics ps
        ON ps.topic_slug = s.topic_slug AND ps.subtopic_slug = s.slug
      LEFT JOIN pages p ON p.id = ps.page_id
      ${where}
      GROUP BY s.topic_slug, s.slug
      ORDER BY s.topic_slug, s.sort_order, s.title
    `);
  const result = (topicSlug ? rows.all(topicSlug) : rows.all()) as Array<{
    topic_slug: string;
    slug: string;
    title: string;
    icon: string;
    description: string;
    page_count: number;
  }>;
  return result.map((row) => ({
    topicSlug: row.topic_slug,
    slug: row.slug,
    title: row.title,
    icon: row.icon,
    description: row.description,
    pageCount: row.page_count,
  }));
}

export function getSubtopic(database: DatabaseSync, topicSlug: string, slug: string): SubtopicSummary | null {
  return listSubtopics(database, topicSlug).find((subtopic) => subtopic.slug === slug) ?? null;
}

export function createSubtopic(
  database: DatabaseSync,
  input: { topicSlug: string; slug: string; title: string; icon: string; description: string },
): void {
  const row = database
    .prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 AS value FROM subtopics WHERE topic_slug = ?")
    .get(input.topicSlug) as { value: number };
  database.prepare(`
    INSERT INTO subtopics (topic_slug, slug, title, icon, description, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(input.topicSlug, input.slug, input.title, input.icon, input.description, row.value);
}

export function updateSubtopic(
  database: DatabaseSync,
  topicSlug: string,
  slug: string,
  input: { title: string; icon: string; description: string },
): boolean {
  const result = database.prepare(`
    UPDATE subtopics SET title = ?, icon = ?, description = ?
    WHERE topic_slug = ? AND slug = ?
  `).run(input.title, input.icon, input.description, topicSlug, slug);
  return result.changes === 1;
}

export type DeleteSubtopicResult = "deleted" | "in-use" | "missing";

export function deleteSubtopic(database: DatabaseSync, topicSlug: string, slug: string): DeleteSubtopicResult {
  database.exec("BEGIN IMMEDIATE");
  try {
    const subtopic = database
      .prepare("SELECT 1 FROM subtopics WHERE topic_slug = ? AND slug = ?")
      .get(topicSlug, slug);
    if (!subtopic) {
      database.exec("ROLLBACK");
      return "missing";
    }
    const usage = database
      .prepare("SELECT COUNT(*) AS count FROM page_subtopics WHERE topic_slug = ? AND subtopic_slug = ?")
      .get(topicSlug, slug) as { count: number };
    if (usage.count > 0) {
      database.exec("ROLLBACK");
      return "in-use";
    }
    database.prepare("DELETE FROM subtopics WHERE topic_slug = ? AND slug = ?").run(topicSlug, slug);
    database.exec("COMMIT");
    return "deleted";
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function reorderSubtopics(database: DatabaseSync, topicSlug: string, orderedSlugs: string[]): boolean {
  if (orderedSlugs.length === 0 || new Set(orderedSlugs).size !== orderedSlugs.length) return false;
  database.exec("BEGIN IMMEDIATE");
  try {
    const rows = database
      .prepare("SELECT slug FROM subtopics WHERE topic_slug = ? ORDER BY sort_order, title")
      .all(topicSlug) as Array<{ slug: string }>;
    const current = new Set(rows.map((row) => row.slug));
    if (current.size !== orderedSlugs.length || orderedSlugs.some((slug) => !current.has(slug))) {
      database.exec("ROLLBACK");
      return false;
    }
    const update = database.prepare("UPDATE subtopics SET sort_order = ? WHERE topic_slug = ? AND slug = ?");
    orderedSlugs.forEach((slug, index) => update.run(index + 1, topicSlug, slug));
    database.exec("COMMIT");
    return true;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function listRecentPages(database: DatabaseSync, limit = 8): PageSummary[] {
  const rows = database
    .prepare(`${pageSelect} WHERE p.status = 'published' ORDER BY p.updated_at DESC LIMIT ?`)
    .all(limit) as unknown as PageRow[];
  return rows.map(summary);
}

export function listPageReferences(database: DatabaseSync): PageReference[] {
  const rows = database.prepare(`
    SELECT links.source_page_id, target.id AS target_page_id
    FROM page_links links
    JOIN pages source ON source.id = links.source_page_id AND source.status = 'published'
    JOIN pages target ON target.slug = links.target_slug AND target.status = 'published'
    ORDER BY links.source_page_id, target.id
  `).all() as Array<{ source_page_id: string; target_page_id: string }>;
  return rows.map((row) => ({ sourcePageId: row.source_page_id, targetPageId: row.target_page_id }));
}

export function listPublishedPageOptions(database: DatabaseSync): PageLinkOption[] {
  const rows = database.prepare(`
    SELECT id, slug, title
    FROM pages
    WHERE status = 'published'
    ORDER BY title COLLATE NOCASE, id
  `).all() as Array<{ id: string; slug: string; title: string }>;
  return rows.map((row) => ({ id: row.id, slug: row.slug, title: row.title }));
}

export function listPagesByTopic(database: DatabaseSync, topicSlug: string): PageSummary[] {
  const rows = database
    .prepare(`${pageSelect} WHERE p.topic_slug = ? AND p.status = 'published' ORDER BY p.updated_at DESC`)
    .all(topicSlug) as unknown as PageRow[];
  return rows.map(summary);
}

export function listPagesBySubtopic(database: DatabaseSync, topicSlug: string, subtopicSlug: string): PageSummary[] {
  const rows = database
    .prepare(`${pageSelect} WHERE ps.topic_slug = ? AND ps.subtopic_slug = ? AND p.status = 'published' ORDER BY p.updated_at DESC`)
    .all(topicSlug, subtopicSlug) as unknown as PageRow[];
  return rows.map(summary);
}

export function getPageBySlug(
  database: DatabaseSync,
  slug: string,
  viewerId: string,
): PageDetail | null {
  const row = database
    .prepare(`
      SELECT p.*, t.title AS topic_title, ps.subtopic_slug, st.title AS subtopic_title,
        (SELECT COUNT(*) FROM comments c WHERE c.page_id = p.id) AS comment_count,
        EXISTS(SELECT 1 FROM bookmarks b WHERE b.page_id = p.id AND b.user_id = ?) AS bookmarked
      FROM pages p JOIN topics t ON t.slug = p.topic_slug
      LEFT JOIN page_subtopics ps ON ps.page_id = p.id
      LEFT JOIN subtopics st ON st.topic_slug = ps.topic_slug AND st.slug = ps.subtopic_slug
      WHERE p.slug = ?
    `)
    .get(viewerId, slug) as PageRow | undefined;
  if (!row) return null;
  return {
    ...summary(row),
    authorId: row.author_id,
    content: parseStoredPageContent(row.content_json ?? "[]"),
    bookmarked: Boolean(row.bookmarked),
  };
}

export function getPageById(database: DatabaseSync, id: string, viewerId: string): PageDetail | null {
  const row = database
    .prepare(`
      SELECT p.*, t.title AS topic_title, ps.subtopic_slug, st.title AS subtopic_title,
        (SELECT COUNT(*) FROM comments c WHERE c.page_id = p.id) AS comment_count,
        EXISTS(SELECT 1 FROM bookmarks b WHERE b.page_id = p.id AND b.user_id = ?) AS bookmarked
      FROM pages p JOIN topics t ON t.slug = p.topic_slug
      LEFT JOIN page_subtopics ps ON ps.page_id = p.id
      LEFT JOIN subtopics st ON st.topic_slug = ps.topic_slug AND st.slug = ps.subtopic_slug
      WHERE p.id = ?
    `)
    .get(viewerId, id) as PageRow | undefined;
  if (!row) return null;
  return {
    ...summary(row),
    authorId: row.author_id,
    content: parseStoredPageContent(row.content_json ?? "[]"),
    bookmarked: Boolean(row.bookmarked),
  };
}

export function incrementPageView(database: DatabaseSync, pageId: string): number | null {
  const row = database
    .prepare("UPDATE pages SET view_count = view_count + 1 WHERE id = ? RETURNING view_count")
    .get(pageId) as { view_count: number } | undefined;
  return row?.view_count ?? null;
}

export function listPagesByAuthor(database: DatabaseSync, userId: string): PageSummary[] {
  return (database
    .prepare(`${pageSelect} WHERE p.author_id = ? ORDER BY p.updated_at DESC`)
    .all(userId) as unknown as PageRow[]).map(summary);
}

export function listBookmarkedPages(database: DatabaseSync, userId: string): PageSummary[] {
  return (database
    .prepare(`${pageSelect} JOIN bookmarks b ON b.page_id = p.id WHERE b.user_id = ? ORDER BY b.created_at DESC`)
    .all(userId) as unknown as PageRow[]).map(summary);
}

function slugify(title: string): string {
  const cleaned = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${cleaned || "page"}-${randomUUID().slice(0, 6)}`;
}

export function createPage(
  database: DatabaseSync,
  input: { title: string; icon: string; excerpt: string; topicSlug: string; subtopicSlug: string | null; content: unknown[]; status: "draft" | "published" },
  author: { studentId: string; name: string },
): { id: string; slug: string } {
  const id = randomUUID();
  const slug = slugify(input.title);
  const now = new Date().toISOString();
  database.exec("BEGIN IMMEDIATE");
  try {
    validateSubtopic(database, input.topicSlug, input.subtopicSlug);
    database
      .prepare(`
        INSERT INTO pages (id, slug, title, icon, excerpt, content_json, topic_slug, author_id, author_name, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(id, slug, input.title, input.icon, input.excerpt, JSON.stringify(input.content), input.topicSlug, author.studentId, author.name, input.status, now, now);
    setPageSubtopic(database, id, input.topicSlug, input.subtopicSlug);
    setPageLinks(database, id, slug, input.content);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
  return { id, slug };
}

export function updatePage(
  database: DatabaseSync,
  id: string,
  input: { title: string; icon: string; excerpt: string; topicSlug: string; subtopicSlug: string | null; content: unknown[]; status: "draft" | "published" },
  actor: { studentId: string; role: "member" | "admin" },
): boolean {
  database.exec("BEGIN IMMEDIATE");
  try {
    validateSubtopic(database, input.topicSlug, input.subtopicSlug);
    const result = database
      .prepare(`
        UPDATE pages SET title = ?, icon = ?, excerpt = ?, content_json = ?, topic_slug = ?, status = ?, updated_at = ?
        WHERE id = ? AND (author_id = ? OR ? = 'admin')
      `)
      .run(input.title, input.icon, input.excerpt, JSON.stringify(input.content), input.topicSlug, input.status, new Date().toISOString(), id, actor.studentId, actor.role);
    if (result.changes !== 1) {
      database.exec("ROLLBACK");
      return false;
    }
    setPageSubtopic(database, id, input.topicSlug, input.subtopicSlug);
    const page = database.prepare("SELECT slug FROM pages WHERE id = ?").get(id) as { slug: string };
    setPageLinks(database, id, page.slug, input.content);
    database.exec("COMMIT");
    return true;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function validateSubtopic(database: DatabaseSync, topicSlug: string, subtopicSlug: string | null): void {
  if (!subtopicSlug) return;
  const exists = database
    .prepare("SELECT 1 FROM subtopics WHERE topic_slug = ? AND slug = ?")
    .get(topicSlug, subtopicSlug);
  if (!exists) throw new Error("선택한 소주제가 대주제에 속하지 않습니다.");
}

function setPageSubtopic(database: DatabaseSync, pageId: string, topicSlug: string, subtopicSlug: string | null): void {
  if (!subtopicSlug) {
    database.prepare("DELETE FROM page_subtopics WHERE page_id = ?").run(pageId);
    return;
  }
  database.prepare(`
    INSERT INTO page_subtopics (page_id, topic_slug, subtopic_slug)
    VALUES (?, ?, ?)
    ON CONFLICT(page_id) DO UPDATE SET topic_slug = excluded.topic_slug, subtopic_slug = excluded.subtopic_slug
  `).run(pageId, topicSlug, subtopicSlug);
}

function setPageLinks(database: DatabaseSync, pageId: string, ownSlug: string, content: unknown[]): void {
  database.prepare("DELETE FROM page_links WHERE source_page_id = ?").run(pageId);
  const insert = database.prepare("INSERT INTO page_links (source_page_id, target_slug) VALUES (?, ?)");
  for (const targetSlug of extractInternalPageSlugs(content)) {
    if (targetSlug !== ownSlug) insert.run(pageId, targetSlug);
  }
}

export function toggleBookmark(database: DatabaseSync, userId: string, pageId: string): boolean {
  const existing = database
    .prepare("SELECT 1 FROM bookmarks WHERE user_id = ? AND page_id = ?")
    .get(userId, pageId);
  if (existing) {
    database.prepare("DELETE FROM bookmarks WHERE user_id = ? AND page_id = ?").run(userId, pageId);
    return false;
  }
  database
    .prepare("INSERT INTO bookmarks (user_id, page_id, created_at) VALUES (?, ?, ?)")
    .run(userId, pageId, new Date().toISOString());
  return true;
}
