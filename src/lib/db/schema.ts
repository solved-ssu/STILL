import type { DatabaseSync } from "node:sqlite";

import { parseStoredPageContent } from "@/lib/content/page-content";
import { extractInternalPageSlugs } from "@/lib/content/page-links";
import { LEGACY_SEGMENT_TREE_CONTENT, SAMPLE_PAGES } from "@/lib/db/sample-pages";

export function initializeDatabase(
  database: DatabaseSync,
  options: { seedContent?: boolean } = {},
): void {
  database.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
  const needsPageLinkBackfill = !database
    .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'page_links'")
    .get();
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      student_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(student_id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('member', 'admin')),
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS topics (
      slug TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      icon TEXT NOT NULL,
      description TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS subtopics (
      topic_slug TEXT NOT NULL REFERENCES topics(slug) ON DELETE CASCADE,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      icon TEXT NOT NULL,
      description TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (topic_slug, slug)
    );

    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '📄',
      excerpt TEXT NOT NULL DEFAULT '',
      content_json TEXT NOT NULL DEFAULT '[]',
      topic_slug TEXT NOT NULL REFERENCES topics(slug),
      author_id TEXT REFERENCES users(student_id) ON DELETE SET NULL,
      author_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
      view_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS page_subtopics (
      page_id TEXT PRIMARY KEY REFERENCES pages(id) ON DELETE CASCADE,
      topic_slug TEXT NOT NULL,
      subtopic_slug TEXT NOT NULL,
      FOREIGN KEY (topic_slug, subtopic_slug)
        REFERENCES subtopics(topic_slug, slug) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS page_links (
      source_page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      target_slug TEXT NOT NULL,
      PRIMARY KEY (source_page_id, target_slug)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES users(student_id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      user_id TEXT NOT NULL REFERENCES users(student_id) ON DELETE CASCADE,
      page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, page_id)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
      reporter_id TEXT NOT NULL REFERENCES users(student_id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS login_attempts (
      attempt_key TEXT PRIMARY KEY,
      failures INTEGER NOT NULL DEFAULT 0,
      locked_until INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_pages_topic ON pages(topic_slug, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_pages_author ON pages(author_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_page_subtopics_topic ON page_subtopics(topic_slug, subtopic_slug);
    CREATE INDEX IF NOT EXISTS idx_page_links_target ON page_links(target_slug);
    CREATE INDEX IF NOT EXISTS idx_comments_page ON comments(page_id, created_at, id);
    CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
  `);

  if (needsPageLinkBackfill) backfillPageLinks(database);

  if (options.seedContent === false) return;

  const insertTopic = database.prepare(`
    INSERT OR IGNORE INTO topics (slug, title, icon, description, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `);
  const topics = [
    ["algorithm", "알고리즘 / 자료구조", "⌁", "문제를 푸는 사고법과 핵심 자료구조", 1],
    ["ai", "AI", "✦", "머신러닝부터 생성형 AI까지", 2],
    ["programming", "Programming 언어", "{ }", "언어별 문법, 패턴, 실전 기록", 3],
    ["web", "Web", "◎", "프론트엔드와 백엔드 개발", 4],
    ["database", "Database", "▱", "데이터 모델링과 쿼리 최적화", 5],
    ["etc", "기타", "＋", "함께 나누고 싶은 모든 공부 기록", 6],
  ] as const;
  for (const topic of topics) insertTopic.run(...topic);

  const insertSubtopic = database.prepare(`
    INSERT OR IGNORE INTO subtopics (topic_slug, slug, title, icon, description, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const subtopics = [
    ["algorithm", "data-structures", "자료구조", "🌲", "배열, 트리, 힙과 같은 핵심 자료구조", 1],
    ["algorithm", "graph-search", "그래프 / 탐색", "🧭", "그래프 모델링과 탐색 알고리즘", 2],
    ["algorithm", "dynamic-programming", "동적 계획법", "∑", "부분 문제와 상태 전이로 푸는 문제", 3],
    ["ai", "machine-learning", "머신러닝", "◈", "데이터에서 규칙을 학습하는 방법", 1],
    ["ai", "deep-learning", "딥러닝", "◎", "신경망 구조와 학습 기법", 2],
    ["ai", "generative-ai", "생성형 AI", "✦", "텍스트와 이미지를 생성하는 모델", 3],
    ["programming", "cpp", "C / C++", "C++", "시스템과 알고리즘을 위한 언어", 1],
    ["programming", "java", "Java", "J", "객체지향과 JVM 생태계", 2],
    ["programming", "python", "Python", "Py", "자동화, 데이터, AI를 위한 언어", 3],
    ["web", "frontend", "프론트엔드", "◫", "브라우저 UI와 사용자 경험", 1],
    ["web", "backend", "백엔드", "◧", "서버, API와 서비스 설계", 2],
    ["database", "relational-db", "관계형 DB", "▦", "스키마, 관계와 트랜잭션", 1],
    ["database", "query-optimization", "쿼리 최적화", "⌁", "인덱스와 실행 계획 분석", 2],
    ["etc", "projects", "프로젝트", "↗", "만들며 배운 내용을 정리한 기록", 1],
    ["etc", "study-notes", "학습 기록", "✎", "세미나와 자율 학습 메모", 2],
  ] as const;
  for (const subtopic of subtopics) insertSubtopic.run(...subtopic);

  const now = Date.now();
  const insertPage = database.prepare(`
      INSERT OR IGNORE INTO pages (
        id, slug, title, icon, excerpt, content_json, topic_slug,
        author_id, author_name, status, view_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, 'published', ?, ?, ?)
    `);
  const findSeed = database.prepare("SELECT id, content_json FROM pages WHERE id = ? OR slug = ?");
  const migrateLegacySegmentTree = database.prepare(`
    UPDATE pages SET content_json = ?, updated_at = ?
    WHERE id = 'segment-tree' AND content_json = ?
  `);
  const insertPageSubtopic = database.prepare(`
    INSERT OR IGNORE INTO page_subtopics (page_id, topic_slug, subtopic_slug)
    VALUES (?, ?, ?)
  `);
  const deleteSeedLinks = database.prepare("DELETE FROM page_links WHERE source_page_id = ?");
  const insertSeedLink = database.prepare("INSERT OR IGNORE INTO page_links (source_page_id, target_slug) VALUES (?, ?)");

  SAMPLE_PAGES.forEach((page, index) => {
    const timestamp = new Date(now - index * 3_600_000).toISOString();
    const inserted = insertPage.run(
      page.id,
      page.slug,
      page.title,
      page.icon,
      page.excerpt,
      page.contentJson,
      page.topicSlug,
      "STILL 편집팀",
      page.viewCount,
      timestamp,
      timestamp,
    );
    const stored = findSeed.get(page.id, page.slug) as { id: string; content_json: string } | undefined;
    if (!stored || stored.id !== page.id) return;

    let shouldWriteLinks = inserted.changes === 1;
    if (page.id === "segment-tree" && stored.content_json === LEGACY_SEGMENT_TREE_CONTENT) {
      const migrated = migrateLegacySegmentTree.run(page.contentJson, timestamp, LEGACY_SEGMENT_TREE_CONTENT);
      shouldWriteLinks ||= migrated.changes === 1;
    }

    insertPageSubtopic.run(page.id, page.topicSlug, page.subtopicSlug);
    if (!shouldWriteLinks) return;
    deleteSeedLinks.run(page.id);
    for (const targetSlug of page.targetSlugs) insertSeedLink.run(page.id, targetSlug);
  });
}

function backfillPageLinks(database: DatabaseSync): void {
  const pages = database
    .prepare("SELECT id, slug, content_json FROM pages")
    .all() as Array<{ id: string; slug: string; content_json: string }>;
  if (pages.length === 0) return;

  database.exec("BEGIN IMMEDIATE");
  try {
    const insert = database.prepare("INSERT OR IGNORE INTO page_links (source_page_id, target_slug) VALUES (?, ?)");
    for (const page of pages) {
      const content = parseStoredPageContent(page.content_json);
      for (const targetSlug of extractInternalPageSlugs(content)) {
        if (targetSlug !== page.slug) insert.run(page.id, targetSlug);
      }
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}
