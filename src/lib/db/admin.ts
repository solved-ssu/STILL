import type { DatabaseSync } from "node:sqlite";

export interface AdminReport {
  id: number;
  pageTitle: string;
  reporterName: string;
  reason: string;
  status: "open" | "resolved";
  createdAt: string;
}

export function getAdminStats(database: DatabaseSync) {
  const value = (sql: string) => (database.prepare(sql).get() as { count: number }).count;
  return {
    users: value("SELECT COUNT(*) AS count FROM users"),
    pages: value("SELECT COUNT(*) AS count FROM pages"),
    openReports: value("SELECT COUNT(*) AS count FROM reports WHERE status = 'open'"),
  };
}

export function listReports(database: DatabaseSync): AdminReport[] {
  const rows = database.prepare(`
    SELECT r.id, p.title AS page_title, u.name AS reporter_name, r.reason, r.status, r.created_at
    FROM reports r JOIN pages p ON p.id = r.page_id JOIN users u ON u.student_id = r.reporter_id
    ORDER BY CASE r.status WHEN 'open' THEN 0 ELSE 1 END, r.created_at DESC LIMIT 100
  `).all() as Array<{ id: number; page_title: string; reporter_name: string; reason: string; status: "open" | "resolved"; created_at: string }>;
  return rows.map((row) => ({ id: row.id, pageTitle: row.page_title, reporterName: row.reporter_name, reason: row.reason, status: row.status, createdAt: row.created_at }));
}
