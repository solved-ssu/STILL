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

  it("초기 주제와 예시 문서를 조회한다", () => {
    expect(listTopics(database)).toHaveLength(6);
    expect(getTopic(database, "algorithm")?.pageCount).toBe(3);
    expect(getTopic(database, "missing")).toBeNull();
    expect(listRecentPages(database, 1)[0]?.slug).toBe("segment-tree");
    expect(listPagesByTopic(database, "algorithm")).toHaveLength(3);
    expect(getPageBySlug(database, "segment-tree", "20261234")?.bookmarked).toBe(false);
    expect(listSubtopics(database)).toHaveLength(15);
    expect(listSubtopics(database, "algorithm").map((subtopic) => subtopic.slug)).toEqual([
      "data-structures",
      "graph-search",
      "dynamic-programming",
    ]);
    expect(getSubtopic(database, "algorithm", "data-structures")?.pageCount).toBe(1);
    expect(getSubtopic(database, "algorithm", "missing")).toBeNull();
    expect(listPagesBySubtopic(database, "algorithm", "data-structures")).toHaveLength(1);
    expect(getPageBySlug(database, "segment-tree", "20261234")).toMatchObject({
      subtopicSlug: "data-structures",
      subtopicTitle: "자료구조",
    });
    expect(getPageBySlug(database, "missing", "20261234")).toBeNull();
  });

  it("모든 소주제에 중복 없이 연결된 가이드 노트를 제공한다", () => {
    const topics = listTopics(database);
    const subtopics = listSubtopics(database);
    const references = listPageReferences(database);

    expect(topics.map((topic) => topic.pageCount)).toEqual([3, 3, 3, 2, 2, 2]);
    expect(subtopics).toHaveLength(15);
    expect(subtopics.every((subtopic) => subtopic.pageCount >= 1)).toBe(true);
    expect(listRecentPages(database, 30)).toHaveLength(15);
    expect(references.length).toBeGreaterThanOrEqual(15);
    expect(new Set(references.map((reference) => `${reference.sourcePageId}:${reference.targetPageId}`)).size).toBe(references.length);

    initializeDatabase(database);
    expect(listRecentPages(database, 30)).toHaveLength(15);
    expect(listPageReferences(database)).toEqual(references);
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
    expect(listPageReferences(database)).toHaveLength(1);

    expect(updatePage(database, source.id, {
      title: "그래프 입문",
      icon: "G",
      excerpt: "링크 제거",
      topicSlug: "algorithm",
      subtopicSlug: "graph-search",
      content: [],
      status: "published",
    }, { studentId: "20261234", role: "member" })).toBe(true);
    expect(listPageReferences(database)).toEqual([]);
  });

  it("기존 문서를 보존하면서 소주제 테이블을 추가하는 전진 마이그레이션을 수행한다", () => {
    database.exec("DROP TABLE page_subtopics; DROP TABLE subtopics;");
    expect(database.prepare("SELECT COUNT(*) AS count FROM pages").get()).toEqual({ count: 15 });

    initializeDatabase(database, { seedContent: false });

    expect(database.prepare("SELECT COUNT(*) AS count FROM pages").get()).toEqual({ count: 15 });
    expect(database.prepare("SELECT COUNT(*) AS count FROM subtopics").get()).toEqual({ count: 0 });
  });

  it("기존 문서를 보존하면서 문서 링크 테이블을 추가하는 전진 마이그레이션을 수행한다", () => {
    const target = createPage(
      database,
      { title: "연결 대상", icon: "T", excerpt: "대상", topicSlug: "algorithm", subtopicSlug: null, content: [], status: "published" },
      { studentId: "20261234", name: "김알고" },
    );
    database.prepare("UPDATE pages SET content_json = ? WHERE id = 'segment-tree'").run(JSON.stringify([{
      type: "paragraph",
      content: [{ type: "link", href: `/pages/${target.slug}`, content: "연결 대상" }],
    }]));
    database.exec("DROP TABLE page_links;");
    expect(database.prepare("SELECT COUNT(*) AS count FROM pages").get()).toEqual({ count: 16 });

    initializeDatabase(database, { seedContent: false });

    expect(database.prepare("SELECT COUNT(*) AS count FROM pages").get()).toEqual({ count: 16 });
    expect(listPageReferences(database)).toContainEqual({
      sourcePageId: "segment-tree",
      targetPageId: target.id,
    });
  });

  it("북마크를 추가하고 다시 누르면 해제한다", () => {
    expect(toggleBookmark(database, "20261234", "segment-tree")).toBe(true);
    expect(listBookmarkedPages(database, "20261234")).toHaveLength(1);
    expect(getPageBySlug(database, "segment-tree", "20261234")?.bookmarked).toBe(true);
    expect(toggleBookmark(database, "20261234", "segment-tree")).toBe(false);
    expect(listBookmarkedPages(database, "20261234")).toEqual([]);
  });

  it("문서 상세 조회를 기록하고 최신 조회수를 반환한다", () => {
    expect(incrementPageView(database, "segment-tree")).toBe(129);
    expect(getPageBySlug(database, "segment-tree", "20261234")?.viewCount).toBe(129);
    expect(incrementPageView(database, "missing")).toBeNull();
  });

  it("손상된 저장 콘텐츠는 빈 문서로 안전하게 복구한다", () => {
    database.prepare("UPDATE pages SET content_json = ? WHERE id = 'segment-tree'").run(
      JSON.stringify([{ props: {}, content: [] }]),
    );
    expect(getPageBySlug(database, "segment-tree", "20261234")?.content).toEqual([]);
    database.prepare("UPDATE pages SET content_json = ? WHERE id = 'segment-tree'").run("not-json");
    expect(getPageBySlug(database, "segment-tree", "20261234")?.content).toEqual([]);
  });

  it("관리자 통계와 신고 목록을 제공한다", () => {
    database.prepare("INSERT INTO reports (page_id, reporter_id, reason, status, created_at) VALUES ('segment-tree', '20261234', '설명이 정확하지 않은 것 같습니다.', 'open', ?)").run(new Date().toISOString());
    expect(getAdminStats(database)).toEqual({ users: 2, pages: 15, openReports: 1 });
    expect(listReports(database)[0]).toMatchObject({ pageTitle: "세그먼트 트리 한 번에 이해하기", reporterName: "김알고", status: "open" });
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
