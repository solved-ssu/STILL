import type { PageReference, PageSummary, SubtopicSummary, TopicSummary } from "@/lib/db/pages";

export type GraphNodeKind = "root" | "topic" | "subtopic" | "page";

export interface KnowledgeGraphNode {
  id: string;
  kind: GraphNodeKind;
  label: string;
  topicSlug: string | null;
  subtopicSlug: string | null;
  href: string;
  x: number;
  y: number;
  count?: number;
}

export interface KnowledgeGraphEdge {
  source: string;
  target: string;
  kind?: "hierarchy" | "reference";
}

export interface KnowledgeGraph {
  width: number;
  height: number;
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
}

const WIDTH = 960;
const HEIGHT = 500;
const PADDING = 24;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function orbitPosition(
  center: { x: number; y: number },
  index: number,
  total: number,
  anchorAngle: number,
  distance: number,
) {
  const spread = Math.min(Math.PI * 1.35, 0.64 * Math.max(total - 1, 1));
  const offset = total === 1 ? 0 : (index / (total - 1) - 0.5) * spread;
  const angle = anchorAngle + offset;
  return {
    x: clamp(center.x + Math.cos(angle) * distance, PADDING, WIDTH - PADDING),
    y: clamp(center.y + Math.sin(angle) * distance, PADDING, HEIGHT - PADDING),
  };
}

function createSubtopicNode(subtopic: SubtopicSummary, position: { x: number; y: number }): KnowledgeGraphNode {
  return {
    id: `subtopic:${subtopic.topicSlug}:${subtopic.slug}`,
    kind: "subtopic",
    label: subtopic.title,
    topicSlug: subtopic.topicSlug,
    subtopicSlug: subtopic.slug,
    href: `/topics/${subtopic.topicSlug}/${subtopic.slug}`,
    count: subtopic.pageCount,
    ...position,
  };
}

function createPageNode(page: PageSummary, position: { x: number; y: number }): KnowledgeGraphNode {
  return {
    id: `page:${page.id}`,
    kind: "page",
    label: page.title,
    topicSlug: page.topicSlug,
    subtopicSlug: page.subtopicSlug,
    href: `/pages/${page.slug}`,
    ...position,
  };
}

export function buildKnowledgeGraph(
  topics: TopicSummary[],
  subtopics: SubtopicSummary[],
  pages: PageSummary[],
  options: { activeTopic?: string | null; references?: PageReference[] } = {},
): KnowledgeGraph {
  const activeTopic = options.activeTopic ?? null;
  if (activeTopic) {
    const topic = topics.find((candidate) => candidate.slug === activeTopic);
    if (!topic) return { width: WIDTH, height: HEIGHT, nodes: [], edges: [] };

    const topicPages = pages.filter((page) => page.topicSlug === topic.slug);
    const topicSubtopics = subtopics.filter((subtopic) => subtopic.topicSlug === topic.slug);
    const topicNode: KnowledgeGraphNode = {
      id: `topic:${topic.slug}`,
      kind: "topic",
      label: topic.title,
      topicSlug: topic.slug,
      subtopicSlug: null,
      href: `/topics/${topic.slug}`,
      x: WIDTH / 2,
      y: HEIGHT / 2,
      count: topic.pageCount,
    };
    const subtopicNodes = topicSubtopics.map((subtopic, index) => createSubtopicNode(
      subtopic,
      orbitPosition(topicNode, index, topicSubtopics.length, -Math.PI / 2, 135),
    ));
    const subtopicBySlug = new Map(subtopicNodes.map((node) => [node.subtopicSlug, node]));
    const pageNodes = topicPages.map((page, index) => {
      const parent = page.subtopicSlug ? subtopicBySlug.get(page.subtopicSlug) : undefined;
      const siblings = parent
        ? topicPages.filter((candidate) => candidate.subtopicSlug === page.subtopicSlug)
        : topicPages.filter((candidate) => !candidate.subtopicSlug);
      const siblingIndex = siblings.findIndex((candidate) => candidate.id === page.id);
      return createPageNode(
        page,
        orbitPosition(parent ?? topicNode, siblingIndex, siblings.length, -Math.PI / 2 + index * 0.35, parent ? 64 : 92),
      );
    });
    const edges: KnowledgeGraphEdge[] = subtopicNodes.map((node) => ({ source: topicNode.id, target: node.id }));
    for (const node of pageNodes) {
      const parent = node.subtopicSlug ? subtopicBySlug.get(node.subtopicSlug) : undefined;
      edges.push({ source: parent?.id ?? topicNode.id, target: node.id });
    }
    const nodes = [topicNode, ...subtopicNodes, ...pageNodes];
    appendReferenceEdges(edges, nodes, options.references ?? []);
    return { width: WIDTH, height: HEIGHT, nodes, edges };
  }

  const root: KnowledgeGraphNode = {
    id: "root",
    kind: "root",
    label: "STILL",
    topicSlug: null,
    subtopicSlug: null,
    href: "/home",
    x: WIDTH / 2,
    y: HEIGHT / 2,
  };
  const nodes: KnowledgeGraphNode[] = [root];
  const edges: KnowledgeGraphEdge[] = [];

  topics.forEach((topic, topicIndex) => {
    const angle = -Math.PI / 2 + (topicIndex / Math.max(topics.length, 1)) * Math.PI * 2;
    const topicPages = pages.filter((page) => page.topicSlug === topic.slug);
    const topicSubtopics = subtopics.filter((subtopic) => subtopic.topicSlug === topic.slug);
    const center = {
      x: WIDTH / 2 + Math.cos(angle) * 285,
      y: HEIGHT / 2 + Math.sin(angle) * 160,
    };
    const topicNode: KnowledgeGraphNode = {
      id: `topic:${topic.slug}`,
      kind: "topic",
      label: topic.title,
      topicSlug: topic.slug,
      subtopicSlug: null,
      href: `/topics/${topic.slug}`,
      x: center.x,
      y: center.y,
      count: topic.pageCount,
    };
    nodes.push(topicNode);
    edges.push({ source: root.id, target: topicNode.id });

    const subtopicNodes = topicSubtopics.map((subtopic, index) => createSubtopicNode(
      subtopic,
      orbitPosition(center, index, topicSubtopics.length, angle, 74),
    ));
    nodes.push(...subtopicNodes);
    for (const node of subtopicNodes) edges.push({ source: topicNode.id, target: node.id });
    const subtopicBySlug = new Map(subtopicNodes.map((node) => [node.subtopicSlug, node]));

    topicPages.forEach((page, pageIndex) => {
      const parent = page.subtopicSlug ? subtopicBySlug.get(page.subtopicSlug) : undefined;
      const siblings = parent
        ? topicPages.filter((candidate) => candidate.subtopicSlug === page.subtopicSlug)
        : topicPages.filter((candidate) => !candidate.subtopicSlug);
      const siblingIndex = siblings.findIndex((candidate) => candidate.id === page.id);
      const pageNode = createPageNode(
        page,
        orbitPosition(parent ?? center, siblingIndex, siblings.length, angle + pageIndex * 0.26, parent ? 48 : 70),
      );
      nodes.push(pageNode);
      edges.push({ source: parent?.id ?? topicNode.id, target: pageNode.id });
    });
  });

  appendReferenceEdges(edges, nodes, options.references ?? []);
  return { width: WIDTH, height: HEIGHT, nodes, edges };
}

function appendReferenceEdges(
  edges: KnowledgeGraphEdge[],
  nodes: KnowledgeGraphNode[],
  references: PageReference[],
): void {
  const visibleNodes = new Set(nodes.filter((node) => node.kind === "page").map((node) => node.id));
  const connectedPairs = new Set<string>();
  for (const reference of references) {
    const source = `page:${reference.sourcePageId}`;
    const target = `page:${reference.targetPageId}`;
    if (source === target || !visibleNodes.has(source) || !visibleNodes.has(target)) continue;
    const pair = [source, target].sort().join("\u0000");
    if (connectedPairs.has(pair)) continue;
    connectedPairs.add(pair);
    edges.push({ source, target, kind: "reference" });
  }
}
