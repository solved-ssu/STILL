import type { DatabaseSync } from "node:sqlite";

import type { UserRole } from "@/lib/auth/access";

export interface CommentItem {
  id: number;
  pageId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export function listCommentsByPage(database: DatabaseSync, pageId: string): CommentItem[] {
  const rows = database
    .prepare(`
      SELECT c.id, c.page_id, c.author_id, u.name AS author_name, c.body, c.created_at
      FROM comments c JOIN users u ON u.student_id = c.author_id
      WHERE c.page_id = ?
      ORDER BY c.created_at, c.id
    `)
    .all(pageId) as Array<{
      id: number;
      page_id: string;
      author_id: string;
      author_name: string;
      body: string;
      created_at: string;
    }>;
  return rows.map((row) => ({
    id: row.id,
    pageId: row.page_id,
    authorId: row.author_id,
    authorName: row.author_name,
    body: row.body,
    createdAt: row.created_at,
  }));
}

export function createComment(
  database: DatabaseSync,
  pageId: string,
  body: string,
  actor: { studentId: string; role: UserRole },
  now = new Date(),
): { id: number } | null {
  const result = database
    .prepare(`
      INSERT INTO comments (page_id, author_id, body, created_at)
      SELECT p.id, ?, ?, ? FROM pages p
      WHERE p.id = ? AND (p.status = 'published' OR p.author_id = ? OR ? = 'admin')
    `)
    .run(actor.studentId, body.trim(), now.toISOString(), pageId, actor.studentId, actor.role);
  return result.changes === 1 ? { id: Number(result.lastInsertRowid) } : null;
}

export function deleteComment(
  database: DatabaseSync,
  commentId: number,
  actor: { studentId: string; role: UserRole },
): boolean {
  const result = database
    .prepare("DELETE FROM comments WHERE id = ? AND (author_id = ? OR ? = 'admin')")
    .run(commentId, actor.studentId, actor.role);
  return result.changes === 1;
}

export function isCommentRateLimited(database: DatabaseSync, userId: string, now = new Date()): boolean {
  const threshold = new Date(now.getTime() - 60_000).toISOString();
  const row = database
    .prepare("SELECT COUNT(*) AS count FROM comments WHERE author_id = ? AND created_at >= ?")
    .get(userId, threshold) as { count: number };
  return row.count >= 5;
}
