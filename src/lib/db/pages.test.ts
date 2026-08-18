// @vitest-environment node
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getAdminStats, listReports } from "./admin";
import {
  createPage,
  createSubtopic,
  deleteSubtopic,
  getPageById,
  getPageBySlug,
  getSubtopic,
  getTopic,
  incrementPageView,
  listBookmarkedPages,
  listPagesByAuthor,
  listPagesByTopic,
  listPagesBySubtopic,
  listRecentPages,
  listSubtopics,
  listContributorStats,
  listPageReferences,
  listPublishedPageOptions,
  listTopics,
  toggleBookmark,
  reorderSubtopics,
  updateSubtopic,
  updatePage,
} from "./pages";
import { initializeDatabase } from "./schema";
import { createUsersSkippingExisting } from "./users";

describe("page and admin repositories", () => {
  let database: DatabaseSync;

  beforeEach(() => {
    database = new DatabaseSync(":memory:");
    initializeDatabase(database);
    createUsersSkippingExisting(database, [
      { studentId: "20261234", name: "김알고", passwordHash: "hash" },
      { studentId: "20260001", name: "관리자", passwordHash: "hash", role: "admin" },
    ]);
  });

  afterEach(() => database.close());

  it("초기 주제와 소주제를 제공하되 작성된 예시 문서는 만들지 않는다", () => {
    expect(listTopics(database)).toHaveLength(6);
    expect(getTopic(database, "algorithm")?.pageCount).toBe(0);
    expect(getTopic(database, "missing")).toBeNull();
    expect(listRecentPages(database, 1)).toEqual([]);
    expect(listPagesByTopic(database, "algorithm")).toEqual([]);
    expect(listSubtopics(database)).toHaveLength(15);
    expect(listSubtopics(database, "algorithm").map((subtopic) => subtopic.slug)).toEqual([
      "data-structures",
      "graph-search",
      "dynamic-programming",
    ]);
    expect(getSubtopic(database, "algorithm", "data-structures")?.pageCount).toBe(0);
    expect(getSubtopic(database, "algorithm", "missing")).toBeNull();
    expect(listPagesBySubtopic(database, "algorithm", "data-structures")).toEqual([]);
    expect(getPageBySlug(database, "missing", "20261234")).toBeNull();
  });

  it("이전 편집팀 예시만 정리하고 부원이 만든 문서는 유지한다", () => {
    const memberPage = createPage(
      database,
      { title: "부원이 쓴 노트", icon: "M", excerpt: "보존", topicSlug: "algorithm", subtopicSlug: "data-structures", content: [], status: "published" },
      { studentId: "20261234", name: "김알고" },
    );
    database.prepare(`
      INSERT INTO pages (id, slug, title, icon, excerpt, content_json, topic_slug, author_id, author_name, status, view_count, created_at, updated_at)
      VALUES ('segment-tree', 'segment-tree', '세그먼트 트리 한 번에 이해하기', '🌲', '', '[]', 'algorithm', NULL, 'STILL 편집팀', 'published', 0, ?, ?)
    `).run(new Date().toISOString(), new Date().toISOString());

    initializeDatabase(database);

    expect(getPageBySlug(database, "segment-tree", "20261234")).toBeNull();
    expect(getPageById(database, memberPage.id, "20261234")?.title).toBe("부원이 쓴 노트");
    expect(listPublishedPageOptions(database)).toEqual([
      expect.objectContaining({ id: memberPage.id, title: "부원이 쓴 노트" }),
    ]);
  });

  it("작성자만 문서를 수정하고 공개할 수 있다", () => {
    const created = createPage(
      database,
      { title: "그래프 탐색", icon: "🧭", excerpt: "BFS와 DFS", topicSlug: "algorithm", subtopicSlug: "graph-search", content: [], status: "draft" },
      { studentId: "20261234", name: "김알고" },
    );
    expect(getPageById(database, created.id, "20261234")?.status).toBe("draft");
    expect(getPageById(database, "missing", "20261234")).toBeNull();
    expect(listPagesByAuthor(database, "20261234")).toHaveLength(1);

    expect(getPageById(database, created.id, "20261234")?.subtopicSlug).toBe("graph-search");
    const input = { title: "그래프 완전 정복", icon: "🧭", excerpt: "수정", topicSlug: "algorithm", subtopicSlug: "data-structures", content: [{ type: "paragraph" }], status: "published" as const };
    expect(updatePage(database, created.id, input, { studentId: "nobody", role: "member" })).toBe(false);
    expect(updatePage(database, created.id, input, { studentId: "20261234", role: "member" })).toBe(true);
    expect(getPageById(database, created.id, "20261234")?.title).toBe("그래프 완전 정복");
    expect(getPageById(database, created.id, "20261234")?.subtopicSlug).toBe("data-structures");
  });

  it("대주제에 속하지 않는 소주제를 거부하고 문서 저장을 원자적으로 되돌린다", () => {
    expect(() => createPage(
      database,
      { title: "잘못된 연결", icon: "!", excerpt: "", topicSlug: "ai", subtopicSlug: "data-structures", content: [], status: "draft" },
      { studentId: "20261234", name: "김알고" },
    )).toThrow("선택한 소주제");
    expect(listPagesByAuthor(database, "20261234")).toEqual([]);
  });

  it("관리자가 대주제 아래에 소주제를 추가한다", () => {
    createSubtopic(database, {
      topicSlug: "algorithm",
      slug: "number-theory",
      title: "정수론",
      icon: "#",
      description: "소수와 모듈러 연산",
    });
    expect(getSubtopic(database, "algorithm", "number-theory")).toMatchObject({
      title: "정수론",
      pageCount: 0,
    });
    expect(() => createSubtopic(database, {
      topicSlug: "algorithm",
      slug: "number-theory",
      title: "중복",
      icon: "#",
      description: "중복",
    })).toThrow();
  });

  it("소주제를 수정하고 같은 대주제 안에서 순서를 원자적으로 바꾼다", () => {
    expect(updateSubtopic(database, "algorithm", "graph-search", {
      title: "그래프 탐색",
      icon: "G",
      description: "BFS, DFS와 최단 경로",
    })).toBe(true);
    expect(updateSubtopic(database, "algorithm", "missing", {
      title: "없음",
      icon: "?",
      description: "없음",
    })).toBe(false);
    expect(getSubtopic(database, "algorithm", "graph-search")).toMatchObject({
      title: "그래프 탐색",
      icon: "G",
      description: "BFS, DFS와 최단 경로",
    });

    expect(reorderSubtopics(database, "algorithm", [
      "dynamic-programming",
      "data-structures",
      "graph-search",
    ])).toBe(true);
    expect(listSubtopics(database, "algorithm").map((item) => item.slug)).toEqual([
      "dynamic-programming",
      "data-structures",
      "graph-search",
    ]);
    expect(reorderSubtopics(database, "algorithm", ["data-structures"])).toBe(false);
    expect(listSubtopics(database, "algorithm").map((item) => item.slug)).toEqual([
      "dynamic-programming",
      "data-structures",
      "graph-search",
    ]);
  });

  it("연결된 문서가 있는 소주제 삭제는 막고 비어 있는 소주제는 삭제한다", () => {
    createPage(
      database,
      { title: "자료구조 노트", icon: "D", excerpt: "", topicSlug: "algorithm", subtopicSlug: "data-structures", content: [], status: "published" },
      { studentId: "20261234", name: "김알고" },
    );
    expect(deleteSubtopic(database, "algorithm", "data-structures")).toBe("in-use");
    createSubtopic(database, {
      topicSlug: "algorithm",
      slug: "number-theory",
      title: "정수론",
      icon: "#",
      description: "소수와 모듈러 연산",
    });
    expect(deleteSubtopic(database, "algorithm", "number-theory")).toBe("deleted");
    expect(deleteSubtopic(database, "algorithm", "number-theory")).toBe("missing");
  });

  it("문서 본문의 내부 링크를 저장·갱신하고 공개 문서끼리만 연결한다", () => {
    const baselineReferences = listPageReferences(database);
    const target = createPage(
      database,
      { title: "다익스트라", icon: "D", excerpt: "최단 경로", topicSlug: "algorithm", subtopicSlug: "graph-search", content: [], status: "published" },
      { studentId: "20261234", name: "김알고" },
    );
    const source = createPage(
      database,
      {
        title: "그래프 입문",
        icon: "G",
        excerpt: "연결",
        topicSlug: "algorithm",
        subtopicSlug: "graph-search",
        content: [{ type: "paragraph", content: [
          { type: "link", href: `/pages/${target.slug}`, content: "다익스트라" },
          { type: "link", href: "/pages/not-yet-created", content: "미해결" },
        ] }],
        status: "published",
      },
      { studentId: "20261234", name: "김알고" },
    );

    expect(listPageReferences(database)).toContainEqual({
      sourcePageId: source.id,
      targetPageId: target.id,
    });
    expect(listPageReferences(database)).toHaveLength(baselineReferences.length + 1);

    expect(updatePage(database, source.id, {
      title: "그래프 입문",
      icon: "G",
      excerpt: "링크 제거",
      topicSlug: "algorithm",
      subtopicSlug: "graph-search",
      content: [],
      status: "published",
    }, { studentId: "20261234", role: "member" })).toBe(true);
    expect(listPageReferences(database)).toEqual(baselineReferences);
  });

  it("기존 문서를 보존하면서 소주제 테이블을 추가하는 전진 마이그레이션을 수행한다", () => {
    createPage(
      database,
      { title: "기존 문서", icon: "P", excerpt: "", topicSlug: "algorithm", subtopicSlug: null, content: [], status: "published" },
      { studentId: "20261234", name: "김알고" },
    );
    database.exec("DROP TABLE page_subtopics; DROP TABLE subtopics;");
    expect(database.prepare("SELECT COUNT(*) AS count FROM pages").get()).toEqual({ count: 1 });

    initializeDatabase(database, { seedContent: false });

    expect(database.prepare("SELECT COUNT(*) AS count FROM pages").get()).toEqual({ count: 1 });
    expect(database.prepare("SELECT COUNT(*) AS count FROM subtopics").get()).toEqual({ count: 0 });
  });

  it("기존 문서를 보존하면서 문서 링크 테이블을 추가하는 전진 마이그레이션을 수행한다", () => {
    const target = createPage(
      database,
      { title: "연결 대상", icon: "T", excerpt: "대상", topicSlug: "algorithm", subtopicSlug: null, content: [], status: "published" },
      { studentId: "20261234", name: "김알고" },
    );
    const source = createPage(
      database,
      { title: "연결 원본", icon: "S", excerpt: "원본", topicSlug: "algorithm", subtopicSlug: null, content: [], status: "published" },
      { studentId: "20261234", name: "김알고" },
    );
    database.prepare("UPDATE pages SET content_json = ? WHERE id = ?").run(JSON.stringify([{
      type: "paragraph",
      content: [{ type: "link", href: `/pages/${target.slug}`, content: "연결 대상" }],
    }]), source.id);
    database.exec("DROP TABLE page_links;");
    expect(database.prepare("SELECT COUNT(*) AS count FROM pages").get()).toEqual({ count: 2 });

    initializeDatabase(database, { seedContent: false });

    expect(database.prepare("SELECT COUNT(*) AS count FROM pages").get()).toEqual({ count: 2 });
    expect(listPageReferences(database)).toContainEqual({
      sourcePageId: source.id,
      targetPageId: target.id,
    });
  });

  it("북마크를 추가하고 다시 누르면 해제한다", () => {
    const page = createPage(
      database,
      { title: "북마크할 문서", icon: "B", excerpt: "", topicSlug: "algorithm", subtopicSlug: null, content: [], status: "published" },
      { studentId: "20261234", name: "김알고" },
    );
    expect(toggleBookmark(database, "20261234", page.id)).toBe(true);
    expect(listBookmarkedPages(database, "20261234")).toHaveLength(1);
    expect(getPageBySlug(database, page.slug, "20261234")?.bookmarked).toBe(true);
    expect(toggleBookmark(database, "20261234", page.id)).toBe(false);
    expect(listBookmarkedPages(database, "20261234")).toEqual([]);
  });

  it("문서 상세 조회를 기록하고 최신 조회수를 반환한다", () => {
    const page = createPage(
      database,
      { title: "조회 문서", icon: "V", excerpt: "", topicSlug: "algorithm", subtopicSlug: null, content: [], status: "published" },
      { studentId: "20261234", name: "김알고" },
    );
    expect(incrementPageView(database, page.id)).toBe(1);
    expect(getPageBySlug(database, page.slug, "20261234")?.viewCount).toBe(1);
    expect(incrementPageView(database, "missing")).toBeNull();
  });

  it("손상된 저장 콘텐츠는 빈 문서로 안전하게 복구한다", () => {
    const page = createPage(
      database,
      { title: "복구 문서", icon: "R", excerpt: "", topicSlug: "algorithm", subtopicSlug: null, content: [], status: "published" },
      { studentId: "20261234", name: "김알고" },
    );
    database.prepare("UPDATE pages SET content_json = ? WHERE id = ?").run(
      JSON.stringify([{ props: {}, content: [] }]),
      page.id,
    );
    expect(getPageBySlug(database, page.slug, "20261234")?.content).toEqual([]);
    database.prepare("UPDATE pages SET content_json = ? WHERE id = ?").run("not-json", page.id);
    expect(getPageBySlug(database, page.slug, "20261234")?.content).toEqual([]);
  });

  it("관리자 통계와 신고 목록을 제공한다", () => {
    const page = createPage(
      database,
      { title: "검토할 문서", icon: "R", excerpt: "", topicSlug: "algorithm", subtopicSlug: null, content: [], status: "published" },
      { studentId: "20261234", name: "김알고" },
    );
    database.prepare("INSERT INTO reports (page_id, reporter_id, reason, status, created_at) VALUES (?, '20261234', '설명이 정확하지 않은 것 같습니다.', 'open', ?)").run(page.id, new Date().toISOString());
    expect(getAdminStats(database)).toEqual({ users: 2, pages: 1, openReports: 1 });
    expect(listReports(database)[0]).toMatchObject({ pageTitle: "검토할 문서", reporterName: "김알고", status: "open" });
  });

  it("활성 회원별 공개 포스팅 수를 0개인 회원까지 집계한다", () => {
    const current = createPage(
      database,
      { title: "공개 기록", icon: "✎", excerpt: "공개", topicSlug: "algorithm", subtopicSlug: null, content: [], status: "published" },
      { studentId: "20261234", name: "김알고" },
    );
    const old = createPage(
      database,
      { title: "지난달 기록", icon: "✎", excerpt: "공개", topicSlug: "web", subtopicSlug: "frontend", content: [], status: "published" },
      { studentId: "20261234", name: "김알고" },
    );
    database.prepare("UPDATE pages SET created_at = ? WHERE id = ?").run("2026-07-10T00:00:00.000Z", old.id);
    createPage(
      database,
      { title: "작성 중", icon: "✎", excerpt: "초안", topicSlug: "ai", subtopicSlug: "machine-learning", content: [], status: "draft" },
      { studentId: "20261234", name: "김알고" },
    );

    expect(current.id).toBeTruthy();
    expect(listContributorStats(database, new Date("2026-08-14T00:00:00.000Z"))).toEqual([
      { studentId: "20261234", name: "김알고", monthlyPostCount: 1, postCount: 2 },
      { studentId: "20260001", name: "관리자", monthlyPostCount: 0, postCount: 0 },
    ]);
  });
});
