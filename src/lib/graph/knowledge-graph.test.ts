import { describe, expect, it } from "vitest";

import type { PageSummary, SubtopicSummary, TopicSummary } from "@/lib/db/pages";
import { buildKnowledgeGraph } from "./knowledge-graph";

const topics: TopicSummary[] = [
  { slug: "algorithm", title: "알고리즘 / 자료구조", icon: "⌁", description: "문제 해결", pageCount: 2 },
  { slug: "ai", title: "AI", icon: "✦", description: "인공지능", pageCount: 1 },
  { slug: "web", title: "Web", icon: "◎", description: "웹 개발", pageCount: 0 },
];

const subtopics: SubtopicSummary[] = [
  { topicSlug: "algorithm", slug: "data-structures", title: "자료구조", icon: "🌲", description: "자료구조", pageCount: 1 },
  { topicSlug: "algorithm", slug: "graph-search", title: "그래프 / 탐색", icon: "🧭", description: "그래프", pageCount: 1 },
  { topicSlug: "ai", slug: "machine-learning", title: "머신러닝", icon: "◈", description: "학습", pageCount: 1 },
  { topicSlug: "web", slug: "frontend", title: "프론트엔드", icon: "◫", description: "UI", pageCount: 0 },
];

const page = (id: string, topicSlug: string, subtopicSlug: string | null, title: string): PageSummary => ({
  id,
  slug: id,
  title,
  icon: "·",
  excerpt: "설명",
  topicSlug,
  topicTitle: topics.find((topic) => topic.slug === topicSlug)?.title ?? topicSlug,
  subtopicSlug,
  subtopicTitle: subtopics.find((subtopic) => subtopic.topicSlug === topicSlug && subtopic.slug === subtopicSlug)?.title ?? null,
  authorName: "작성자",
  updatedAt: "2026-08-14T00:00:00.000Z",
  viewCount: 0,
  commentCount: 0,
  status: "published",
});

const pages = [
  page("segment-tree", "algorithm", "data-structures", "세그먼트 트리"),
  page("dijkstra", "algorithm", "graph-search", "다익스트라"),
  page("transformer", "ai", "machine-learning", "Transformer"),
];

describe("buildKnowledgeGraph", () => {
  it("STILL 루트, 대주제, 소주제, 문서를 계층적으로 연결한다", () => {
    const graph = buildKnowledgeGraph(topics, subtopics, pages);

    expect(graph.nodes.filter((node) => node.kind === "root")).toHaveLength(1);
    expect(graph.nodes.filter((node) => node.kind === "topic")).toHaveLength(3);
    expect(graph.nodes.filter((node) => node.kind === "subtopic")).toHaveLength(4);
    expect(graph.nodes.filter((node) => node.kind === "page")).toHaveLength(3);
    expect(graph.edges).toHaveLength(10);
    expect(graph.edges).toContainEqual({ source: "root", target: "topic:algorithm" });
    expect(graph.edges).toContainEqual({ source: "topic:algorithm", target: "subtopic:algorithm:data-structures" });
    expect(graph.edges).toContainEqual({ source: "subtopic:algorithm:data-structures", target: "page:segment-tree" });
    expect(graph.nodes.find((node) => node.id === "subtopic:algorithm:data-structures")).toMatchObject({
      href: "/topics/algorithm/data-structures",
      kind: "subtopic",
    });
  });

  it("빈 주제도 허브로 표시하고 실제 경로를 제공한다", () => {
    const graph = buildKnowledgeGraph(topics, subtopics, pages);
    const emptyTopic = graph.nodes.find((node) => node.id === "topic:web");

    expect(emptyTopic).toMatchObject({ href: "/topics/web", count: 0, kind: "topic" });
  });

  it("문서 표시가 제한되어도 대주제의 실제 전체 문서 수를 보여준다", () => {
    const graph = buildKnowledgeGraph(topics, subtopics, pages.slice(0, 1));
    expect(graph.nodes.find((node) => node.id === "topic:algorithm")?.count).toBe(2);
  });

  it("선택한 분야만 남기고 해당 주제를 그래프 중심에 배치한다", () => {
    const graph = buildKnowledgeGraph(topics, subtopics, pages, { activeTopic: "algorithm" });

    expect(graph.nodes.map((node) => node.id)).toEqual([
      "topic:algorithm",
      "subtopic:algorithm:data-structures",
      "subtopic:algorithm:graph-search",
      "page:segment-tree",
      "page:dijkstra",
    ]);
    expect(graph.edges).toHaveLength(4);
    expect(graph.nodes[0]).toMatchObject({ x: 480, y: 250 });
  });

  it("본문에서 참조한 두 문서를 별도 링크로 연결하고 보이지 않는 대상은 제외한다", () => {
    const graph = buildKnowledgeGraph(topics, subtopics, pages, {
      references: [
        { sourcePageId: "segment-tree", targetPageId: "dijkstra" },
        { sourcePageId: "segment-tree", targetPageId: "hidden-page" },
        { sourcePageId: "segment-tree", targetPageId: "segment-tree" },
      ],
    });

    expect(graph.edges.filter((edge) => edge.kind === "reference")).toEqual([
      { source: "page:segment-tree", target: "page:dijkstra", kind: "reference" },
    ]);
  });

  it("모든 노드를 캔버스 안에 안정적으로 배치한다", () => {
    const first = buildKnowledgeGraph(topics, subtopics, pages);
    const second = buildKnowledgeGraph(topics, subtopics, pages);

    expect(first).toEqual(second);
    for (const node of first.nodes) {
      expect(Number.isFinite(node.x) && Number.isFinite(node.y)).toBe(true);
      expect(node.x).toBeGreaterThanOrEqual(24);
      expect(node.x).toBeLessThanOrEqual(936);
      expect(node.y).toBeGreaterThanOrEqual(24);
      expect(node.y).toBeLessThanOrEqual(476);
    }
  });

  it("존재하지 않는 필터는 빈 그래프를 반환한다", () => {
    expect(buildKnowledgeGraph(topics, subtopics, pages, { activeTopic: "missing" })).toEqual({
      width: 960,
      height: 500,
      nodes: [],
      edges: [],
    });
  });
});
