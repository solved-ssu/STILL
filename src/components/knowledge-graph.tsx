"use client";

import { Minus, Pause, Play, Plus, RotateCcw, Search } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import type { PageReference, PageSummary, SubtopicSummary, TopicSummary } from "@/lib/db/pages";
import { initializeForceNodes, nextSimulationAlpha, stepForceSimulation, type ForceSimulationNode } from "@/lib/graph/force-simulation";
import { GRAPH_ZOOM_MAX, GRAPH_ZOOM_MIN, graphViewBox, normalizeGraphCamera } from "@/lib/graph/graph-camera";
import { buildKnowledgeGraph, type KnowledgeGraphNode } from "@/lib/graph/knowledge-graph";

const topicColors = ["#315c50", "#6b5a3d", "#49647b", "#74525d", "#546b45", "#675b78"];
const NODE_PADDING = 24;

type Point = { x: number; y: number };
type DraggingMode = "node" | "pan" | "pinch";
type DragState = {
  mode: "node" | "pan";
  pointerId: number;
  nodeId?: string;
  startClient: Point;
  startPoint: Point;
  moved: boolean;
};
type PinchState = {
  pointerIds: [number, number];
  startDistance: number;
  startZoom: number;
  anchorGraph: Point;
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function nodeColor(node: KnowledgeGraphNode, topics: TopicSummary[]): string {
  if (node.kind === "root") return "#202522";
  const topicIndex = Math.max(0, topics.findIndex((topic) => topic.slug === node.topicSlug));
  return topicColors[topicIndex % topicColors.length];
}

function shortLabel(label: string, maximum = 17): string {
  return label.length > maximum ? `${label.slice(0, maximum)}…` : label;
}

function positionsFromSimulation(nodes: ForceSimulationNode[]): Record<string, Point> {
  return Object.fromEntries(nodes.map((node) => [node.id, { x: node.x, y: node.y }]));
}

function distanceBetween(first: Point, second: Point): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function graphKindLabel(node: KnowledgeGraphNode): string {
  if (node.kind === "topic") return "대주제";
  if (node.kind === "subtopic") return "소주제";
  if (node.kind === "page") return "노트";
  return "홈";
}

function searchGraphNodes(nodes: KnowledgeGraphNode[], query: string): KnowledgeGraphNode[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
  if (!normalizedQuery) return [];
  return nodes
    .filter((node) => node.label.toLocaleLowerCase("ko-KR").includes(normalizedQuery))
    .sort((left, right) => {
      const leftStarts = left.label.toLocaleLowerCase("ko-KR").startsWith(normalizedQuery);
      const rightStarts = right.label.toLocaleLowerCase("ko-KR").startsWith(normalizedQuery);
      if (leftStarts !== rightStarts) return leftStarts ? -1 : 1;
      return left.label.localeCompare(right.label, "ko-KR");
    })
    .slice(0, 8);
}

function capturePointer(element: SVGSVGElement, pointerId: number): void {
  try {
    if (!element.hasPointerCapture?.(pointerId)) element.setPointerCapture?.(pointerId);
  } catch {
    // The browser can release a fast pointer before React handles its move event.
  }
}

function releasePointer(element: SVGSVGElement, pointerId: number): void {
  try {
    if (element.hasPointerCapture?.(pointerId)) element.releasePointerCapture(pointerId);
  } catch {
    // A cancelled touch or pointer may already have released capture.
  }
}

export function KnowledgeGraphView({
  topics,
  subtopics,
  pages,
  references = [],
  totalPageCount = pages.length,
}: {
  topics: TopicSummary[];
  subtopics: SubtopicSummary[];
  pages: PageSummary[];
  references?: PageReference[];
  totalPageCount?: number;
}) {
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [nodePositions, setNodePositions] = useState<Record<string, Point>>({});
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<DraggingMode | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const [isInViewport, setIsInViewport] = useState(true);
  const [layoutRevision, setLayoutRevision] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDismissed, setSearchDismissed] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectionAnnouncement, setSelectionAnnouncement] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const pinchRef = useRef<PinchState | null>(null);
  const activePointersRef = useRef(new Map<number, Point>());
  const nodeElementsRef = useRef(new Map<string, HTMLElement>());
  const fixedNodeRef = useRef<string | null>(null);
  const simulationRef = useRef<ForceSimulationNode[]>([]);
  const alphaRef = useRef(1);
  const suppressClickRef = useRef<{ nodeId: string } | null>(null);
  const graph = useMemo(
    () => buildKnowledgeGraph(topics, subtopics, pages, { activeTopic, references }),
    [topics, subtopics, pages, activeTopic, references],
  );

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) return;
    const updatePreference = () => {
      setPrefersReducedMotion(media.matches);
      if (media.matches) setIsPlaying(false);
    };
    updatePreference();
    media.addEventListener?.("change", updatePreference);
    return () => media.removeEventListener?.("change", updatePreference);
  }, []);

  useEffect(() => {
    const updateVisibility = () => setIsDocumentVisible(document.visibilityState !== "hidden");
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setIsInViewport(entry?.isIntersecting ?? true), {
      rootMargin: "80px 0px",
      threshold: 0,
    });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const initial = initializeForceNodes(graph.nodes);
    simulationRef.current = initial;
    alphaRef.current = 1;
  }, [graph, layoutRevision]);

  useEffect(() => {
    if (!isPlaying || prefersReducedMotion || !isDocumentVisible || !isInViewport || graph.nodes.length === 0) return;
    let frameId = 0;
    let previousStep = 0;
    const animate = (timeMs: number) => {
      frameId = window.requestAnimationFrame(animate);
      if (timeMs - previousStep < 30) return;
      previousStep = timeMs;
      alphaRef.current = nextSimulationAlpha(alphaRef.current);
      const next = stepForceSimulation(simulationRef.current, graph.edges, {
        width: graph.width,
        height: graph.height,
        alpha: alphaRef.current,
        timeMs,
        fixedNodeId: fixedNodeRef.current,
      });
      simulationRef.current = next;
      setNodePositions(positionsFromSimulation(next));
    };
    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, [graph, isDocumentVisible, isInViewport, isPlaying, prefersReducedMotion, layoutRevision]);

  const positionedNodes = useMemo(
    () => graph.nodes.map((node) => ({ ...node, ...(nodePositions[node.id] ?? {}) })),
    [graph.nodes, nodePositions],
  );
  const nodeById = useMemo(
    () => new Map(positionedNodes.map((node) => [node.id, node])),
    [positionedNodes],
  );
  const connectedNodes = useMemo(() => {
    if (!hoveredNode) return null;
    const connected = new Set([hoveredNode]);
    for (const edge of graph.edges) {
      if (edge.source === hoveredNode) connected.add(edge.target);
      if (edge.target === hoveredNode) connected.add(edge.source);
    }
    return connected;
  }, [graph.edges, hoveredNode]);
  const connectionCounts = useMemo(() => {
    const connections = new Map<string, Set<string>>();
    for (const edge of graph.edges) {
      const source = connections.get(edge.source) ?? new Set<string>();
      const target = connections.get(edge.target) ?? new Set<string>();
      source.add(edge.target);
      target.add(edge.source);
      connections.set(edge.source, source);
      connections.set(edge.target, target);
    }
    return new Map([...connections].map(([nodeId, connected]) => [nodeId, connected.size]));
  }, [graph.edges]);
  const referenceConnectionCounts = useMemo(() => {
    const connections = new Map<string, Set<string>>();
    for (const edge of graph.edges) {
      if (edge.kind !== "reference") continue;
      const source = connections.get(edge.source) ?? new Set<string>();
      const target = connections.get(edge.target) ?? new Set<string>();
      source.add(edge.target);
      target.add(edge.source);
      connections.set(edge.source, source);
      connections.set(edge.target, target);
    }
    return new Map([...connections].map(([nodeId, connected]) => [nodeId, connected.size]));
  }, [graph.edges]);
  const inspectedNode = nodeById.get(hoveredNode ?? selectedNodeId ?? "");
  const camera = useMemo(
    () => normalizeGraphCamera({ zoom, pan }, graph.width, graph.height),
    [graph.height, graph.width, pan, zoom],
  );
  const viewWidth = graph.width / camera.zoom;
  const viewHeight = graph.height / camera.zoom;
  const viewBox = graphViewBox(camera, graph.width, graph.height);
  const searchResults = useMemo(
    () => searchGraphNodes(graph.nodes, searchQuery),
    [graph.nodes, searchQuery],
  );
  const searchOpen = !searchDismissed && searchResults.length > 0;

  function adjustZoom(next: number) {
    const nextCamera = normalizeGraphCamera({ zoom: next, pan }, graph.width, graph.height);
    setZoom(nextCamera.zoom);
    setPan(nextCamera.pan);
  }

  function toggleMotion() {
    setIsPlaying((playing) => {
      if (!playing) alphaRef.current = 1;
      return !playing;
    });
  }

  function resetGraph() {
    setZoom(1);
    setActiveTopic(null);
    setPan({ x: 0, y: 0 });
    setNodePositions({});
    setSelectedNodeId(null);
    setSearchQuery("");
    setSearchDismissed(false);
    setActiveSearchIndex(-1);
    setSelectionAnnouncement("");
    setLayoutRevision((revision) => revision + 1);
  }

  function selectTopic(topicSlug: string | null) {
    setActiveTopic(topicSlug);
    setNodePositions({});
    setPan({ x: 0, y: 0 });
    setSelectedNodeId(null);
    alphaRef.current = 1;
  }

  function focusGraphNode(node: KnowledgeGraphNode) {
    const positionedNode = nodeById.get(node.id) ?? node;
    const nextCamera = normalizeGraphCamera({
      zoom: Math.max(camera.zoom, 1.6),
      pan: {
        x: graph.width / 2 - positionedNode.x,
        y: graph.height / 2 - positionedNode.y,
      },
    }, graph.width, graph.height);
    setZoom(nextCamera.zoom);
    setPan(nextCamera.pan);
    setSelectedNodeId(node.id);
    setHoveredNode(node.id);
    setSearchQuery(node.label);
    setSearchDismissed(true);
    setActiveSearchIndex(-1);
    setSelectionAnnouncement(`${node.label} 노드로 이동했습니다.`);
    nodeElementsRef.current.get(node.id)?.focus();
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setSearchDismissed(true);
      setActiveSearchIndex(-1);
      return;
    }
    if (searchResults.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSearchDismissed(false);
      setActiveSearchIndex((index) => Math.min(index + 1, searchResults.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSearchDismissed(false);
      setActiveSearchIndex((index) => index <= 0 ? searchResults.length - 1 : index - 1);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      focusGraphNode(searchResults[Math.max(0, activeSearchIndex)]);
    }
  }

  function setSimulationPosition(nodeId: string, position: Point) {
    simulationRef.current = simulationRef.current.map((node) => node.id === nodeId
      ? { ...node, ...position, vx: 0, vy: 0 }
      : node);
    setNodePositions((current) => ({ ...current, [nodeId]: position }));
  }

  function moveNode(node: KnowledgeGraphNode, delta: Point) {
    const current = nodePositions[node.id] ?? { x: node.x, y: node.y };
    const position = {
      x: clamp(current.x + delta.x, NODE_PADDING, graph.width - NODE_PADDING),
      y: clamp(current.y + delta.y, NODE_PADDING, graph.height - NODE_PADDING),
    };
    setSimulationPosition(node.id, position);
    alphaRef.current = 0.75;
  }

  function pointerDelta(clientX: number, clientY: number, startClient: Point): Point {
    const bounds = svgRef.current?.getBoundingClientRect();
    const width = bounds?.width || graph.width;
    const height = bounds?.height || graph.height;
    return {
      x: (clientX - startClient.x) * viewWidth / width,
      y: (clientY - startClient.y) * viewHeight / height,
    };
  }

  function graphPointAtClient(point: Point): Point {
    const bounds = svgRef.current?.getBoundingClientRect();
    const width = bounds?.width || graph.width;
    const height = bounds?.height || graph.height;
    const ratioX = clamp((point.x - (bounds?.left ?? 0)) / width, 0, 1);
    const ratioY = clamp((point.y - (bounds?.top ?? 0)) / height, 0, 1);
    const left = (graph.width - viewWidth) / 2 - camera.pan.x;
    const top = (graph.height - viewHeight) / 2 - camera.pan.y;
    return { x: left + ratioX * viewWidth, y: top + ratioY * viewHeight };
  }

  function startPinching(element: SVGSVGElement) {
    const pointers = [...activePointersRef.current.entries()].slice(0, 2);
    if (pointers.length < 2) return;
    const [[firstId, first], [secondId, second]] = pointers;
    const midpoint = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
    pinchRef.current = {
      pointerIds: [firstId, secondId],
      startDistance: Math.max(1, distanceBetween(first, second)),
      startZoom: camera.zoom,
      anchorGraph: graphPointAtClient(midpoint),
    };
    dragRef.current = null;
    fixedNodeRef.current = null;
    capturePointer(element, firstId);
    capturePointer(element, secondId);
    setDragging("pinch");
  }

  function continuePinching(event: ReactPointerEvent<SVGSVGElement>): boolean {
    const pinch = pinchRef.current;
    if (!pinch || !pinch.pointerIds.includes(event.pointerId)) return false;
    const first = activePointersRef.current.get(pinch.pointerIds[0]);
    const second = activePointersRef.current.get(pinch.pointerIds[1]);
    if (!first || !second) return true;
    event.preventDefault();
    const bounds = svgRef.current?.getBoundingClientRect();
    const width = bounds?.width || graph.width;
    const height = bounds?.height || graph.height;
    const midpoint = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
    const ratioX = clamp((midpoint.x - (bounds?.left ?? 0)) / width, 0, 1);
    const ratioY = clamp((midpoint.y - (bounds?.top ?? 0)) / height, 0, 1);
    const nextZoom = pinch.startZoom * distanceBetween(first, second) / pinch.startDistance;
    const normalizedZoom = normalizeGraphCamera(
      { zoom: nextZoom, pan: { x: 0, y: 0 } },
      graph.width,
      graph.height,
    ).zoom;
    const nextViewWidth = graph.width / normalizedZoom;
    const nextViewHeight = graph.height / normalizedZoom;
    const nextCamera = normalizeGraphCamera({
      zoom: normalizedZoom,
      pan: {
        x: (graph.width - nextViewWidth) / 2 + ratioX * nextViewWidth - pinch.anchorGraph.x,
        y: (graph.height - nextViewHeight) / 2 + ratioY * nextViewHeight - pinch.anchorGraph.y,
      },
    }, graph.width, graph.height);
    setZoom(nextCamera.zoom);
    setPan(nextCamera.pan);
    return true;
  }

  function startDragging(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.button > 0) return;
    activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (activePointersRef.current.size >= 2) {
      startPinching(event.currentTarget);
      return;
    }
    const nodeElement = (event.target as Element).closest<SVGAElement>("[data-graph-node-id]");
    const nodeId = nodeElement?.dataset.graphNodeId;
    const node = nodeId ? nodeById.get(nodeId) : undefined;
    dragRef.current = {
      mode: node ? "node" : "pan",
      pointerId: event.pointerId,
      nodeId: node?.id,
      startClient: { x: event.clientX, y: event.clientY },
      startPoint: node ? { x: node.x, y: node.y } : pan,
      moved: false,
    };
    fixedNodeRef.current = node?.id ?? null;
    setDragging(node ? "node" : "pan");
  }

  function continueDragging(event: ReactPointerEvent<SVGSVGElement>) {
    if (activePointersRef.current.has(event.pointerId)) {
      activePointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    if (continuePinching(event)) return;
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const delta = pointerDelta(event.clientX, event.clientY, drag.startClient);
    if (Math.hypot(event.clientX - drag.startClient.x, event.clientY - drag.startClient.y) > 3) {
      drag.moved = true;
      capturePointer(event.currentTarget, event.pointerId);
    }
    if (drag.mode === "node" && drag.nodeId) {
      setSimulationPosition(drag.nodeId, {
        x: clamp(drag.startPoint.x + delta.x, NODE_PADDING, graph.width - NODE_PADDING),
        y: clamp(drag.startPoint.y + delta.y, NODE_PADDING, graph.height - NODE_PADDING),
      });
    } else {
      setPan(normalizeGraphCamera({
        zoom: camera.zoom,
        pan: { x: drag.startPoint.x + delta.x, y: drag.startPoint.y + delta.y },
      }, graph.width, graph.height).pan);
    }
  }

  function stopDragging(event: ReactPointerEvent<SVGSVGElement>) {
    activePointersRef.current.delete(event.pointerId);
    const pinch = pinchRef.current;
    if (pinch?.pointerIds.includes(event.pointerId)) {
      for (const pointerId of pinch.pointerIds) activePointersRef.current.delete(pointerId);
      pinchRef.current = null;
      dragRef.current = null;
      fixedNodeRef.current = null;
      setDragging(null);
      for (const pointerId of pinch.pointerIds) releasePointer(event.currentTarget, pointerId);
      return;
    }
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.mode === "node" && drag.nodeId && drag.moved) {
      suppressClickRef.current = { nodeId: drag.nodeId };
    }
    dragRef.current = null;
    fixedNodeRef.current = null;
    alphaRef.current = 0.9;
    setDragging(null);
    releasePointer(event.currentTarget, event.pointerId);
  }

  return (
    <section ref={sectionRef} className="knowledge-graph" aria-labelledby="knowledge-graph-title">
      <header className="knowledge-graph__header">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#676c68]">
            <span className="h-2 w-2 rounded-full bg-[#315c50]" />
            {totalPageCount > pages.length
              ? <>노트 {pages.length}개 표시 / 전체 {totalPageCount}개</>
              : <>노트 {pages.length}개</>} · 대주제 {topics.length}개 · 소주제 {subtopics.length}개
          </div>
          <h2 id="knowledge-graph-title" className="mt-1 text-lg font-semibold tracking-[-.02em]">노트 그래프</h2>
        </div>
        <div className="flex items-center border border-[#d8dad7] bg-white" aria-label="그래프 제어">
          <button
            type="button"
            onClick={toggleMotion}
            aria-label={isPlaying ? "그래프 움직임 정지" : "그래프 움직임 재생"}
            aria-pressed={!isPlaying}
            className="grid h-8 w-8 place-items-center text-[#626763] hover:bg-[#f0f1ef]"
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <button type="button" disabled={camera.zoom <= GRAPH_ZOOM_MIN} onClick={() => adjustZoom(camera.zoom - 0.15)} aria-label="그래프 축소" className="grid h-8 w-8 place-items-center border-l border-[#e2e3e1] text-[#626763] hover:bg-[#f0f1ef] disabled:cursor-not-allowed disabled:opacity-35"><Minus size={14} /></button>
          <span aria-live="polite" className="w-11 border-x border-[#e2e3e1] text-center text-[11px] tabular-nums text-[#626763]">{Math.round(camera.zoom * 100)}%</span>
          <button type="button" disabled={camera.zoom >= GRAPH_ZOOM_MAX} onClick={() => adjustZoom(camera.zoom + 0.15)} aria-label="그래프 확대" className="grid h-8 w-8 place-items-center text-[#626763] hover:bg-[#f0f1ef] disabled:cursor-not-allowed disabled:opacity-35"><Plus size={14} /></button>
          <button type="button" onClick={resetGraph} aria-label="그래프 초기화" className="grid h-8 w-8 place-items-center border-l border-[#e2e3e1] text-[#626763] hover:bg-[#f0f1ef]"><RotateCcw size={13} /></button>
        </div>
      </header>

      <div className="relative border-x border-[#d8dad7] bg-[#f7f8f6] px-3 pb-2 pt-1">
        <label htmlFor="knowledge-graph-search" className="sr-only">그래프 노드 검색</label>
        <div className="relative max-w-sm">
          <Search aria-hidden="true" size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#777c78]" />
          <input
            id="knowledge-graph-search"
            type="search"
            role="combobox"
            aria-label="그래프 노드 검색"
            aria-autocomplete="list"
            aria-controls="knowledge-graph-search-results"
            aria-expanded={searchOpen}
            aria-activedescendant={searchOpen && activeSearchIndex >= 0 ? `knowledge-graph-result-${activeSearchIndex}` : undefined}
            value={searchQuery}
            placeholder="노드 이름으로 찾기"
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setSearchDismissed(false);
              setActiveSearchIndex(-1);
            }}
            onFocus={() => setSearchDismissed(false)}
            onKeyDown={handleSearchKeyDown}
            className="h-8 w-full border border-[#d8dad7] bg-white pl-8 pr-3 text-xs text-[#303532] outline-none transition focus:border-[#61766d] focus:ring-2 focus:ring-[#61766d]/15"
          />
          {searchOpen && (
            <ul id="knowledge-graph-search-results" role="listbox" className="absolute z-20 mt-1 max-h-56 w-full overflow-auto border border-[#d8dad7] bg-white p-1">
              {searchResults.map((node, index) => (
                <li
                  key={node.id}
                  id={`knowledge-graph-result-${index}`}
                  role="option"
                  aria-label={`${node.label} · ${graphKindLabel(node)}`}
                  aria-selected={selectedNodeId === node.id}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => focusGraphNode(node)}
                  className={`flex cursor-pointer items-center justify-between px-2 py-1.5 text-xs ${activeSearchIndex === index ? "bg-[#e9eeeb]" : "hover:bg-[#f0f2ef]"}`}
                >
                  <span className="truncate font-medium text-[#303532]">{node.label}</span>
                  <span className="ml-3 shrink-0 text-[10px] text-[#777c78]">{graphKindLabel(node)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p aria-live="polite" className="sr-only">{selectionAnnouncement}</p>
      </div>

      <div className="knowledge-graph__filters" aria-label="분야 필터">
        <button type="button" aria-pressed={activeTopic === null} onClick={() => selectTopic(null)} className="graph-filter">전체</button>
        {topics.map((topic) => (
          <button key={topic.slug} type="button" aria-label={`${topic.title} 분야만 보기`} aria-pressed={activeTopic === topic.slug} onClick={() => selectTopic(topic.slug)} className="graph-filter">
            {topic.title}<span>{pages.filter((page) => page.topicSlug === topic.slug).length}</span>
          </button>
        ))}
      </div>

      <div className="knowledge-graph__stage">
        {graph.nodes.length === 0 ? (
          <p className="grid h-full place-items-center text-sm text-[#6d726e]">표시할 노트가 없습니다.</p>
        ) : (
          <svg
            ref={svgRef}
            viewBox={viewBox}
            role="group"
            aria-label="분야와 문서 사이의 관계를 나타내는 노트 그래프"
            aria-describedby="knowledge-graph-help"
            className="h-full w-full"
            style={{ touchAction: "none" }}
            data-dragging={dragging ?? undefined}
            data-motion={!isPlaying ? "paused" : prefersReducedMotion || !isDocumentVisible || !isInViewport ? "suspended" : "playing"}
            onPointerDown={startDragging}
            onPointerMove={continueDragging}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
            onWheel={(event) => {
              event.preventDefault();
              adjustZoom(camera.zoom + (event.deltaY > 0 ? -0.08 : 0.08));
            }}
          >
            <defs>
              <pattern id="graph-dots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.8" fill="#d8dbd7" /></pattern>
            </defs>
            <rect x={-graph.width} y={-graph.height} width={graph.width * 3} height={graph.height * 3} fill="url(#graph-dots)" />
            <g aria-hidden="true">
              {graph.edges.map((edge) => {
                const source = nodeById.get(edge.source);
                const target = nodeById.get(edge.target);
                if (!source || !target) return null;
                const active = hoveredNode === source.id || hoveredNode === target.id;
                const isReference = edge.kind === "reference";
                return <line key={`${edge.source}:${edge.target}`} data-edge-kind={isReference ? "reference" : "hierarchy"} x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke={isReference ? (active ? "#69577c" : "#a69bad") : (active ? "#68736d" : "#c9ceca")} strokeWidth={active ? 1.9 : isReference ? 1.2 : 1} strokeDasharray={isReference ? "5 4" : undefined} opacity={connectedNodes && !active ? 0.25 : isReference ? 0.72 : 1} />;
              })}
            </g>
            <g>
              {positionedNodes.map((node) => {
                const color = nodeColor(node, topics);
                const isHovered = hoveredNode === node.id;
                const isSelected = selectedNodeId === node.id;
                const isDimmed = connectedNodes !== null && !connectedNodes.has(node.id);
                const connectionCount = connectionCounts.get(node.id) ?? 0;
                const radius = node.kind === "root"
                  ? 14
                  : node.kind === "topic"
                    ? 11 + Math.min(3, connectionCount * 0.25)
                    : node.kind === "subtopic"
                      ? 8.5 + Math.min(2, connectionCount * 0.2)
                      : 6 + Math.min(2.5, Math.max(0, connectionCount - 1) * 0.7);
                const fill = node.kind === "page" ? "#f7f8f6" : node.kind === "subtopic" ? "#fffefa" : color;
                const showLabel = node.kind !== "page" || isHovered || isSelected || activeTopic !== null || camera.zoom >= 1.25;
                const label = node.kind === "topic"
                  ? `${node.label} 분야 보기`
                  : node.kind === "subtopic"
                    ? `${node.label} 소주제 보기`
                    : node.kind === "page"
                      ? `${node.label} 문서 보기`
                      : "STILL 홈";
                return (
                  <a
                    key={node.id}
                    ref={(element) => {
                      if (element) nodeElementsRef.current.set(node.id, element);
                      else nodeElementsRef.current.delete(node.id);
                    }}
                    href={node.href}
                    data-graph-node-id={node.id}
                    data-connection-count={connectionCount}
                    data-selected={isSelected || undefined}
                    aria-label={label}
                    aria-current={isSelected ? "location" : undefined}
                    style={{ opacity: isDimmed ? 0.28 : 1 }}
                    onClick={(event) => {
                      const suppression = suppressClickRef.current;
                      if (suppression?.nodeId === node.id) {
                        event.preventDefault();
                        suppressClickRef.current = null;
                      }
                    }}
                    onKeyDown={(event) => {
                      const distance = 12 / camera.zoom;
                      const deltaByKey: Partial<Record<string, Point>> = {
                        ArrowLeft: { x: -distance, y: 0 },
                        ArrowRight: { x: distance, y: 0 },
                        ArrowUp: { x: 0, y: -distance },
                        ArrowDown: { x: 0, y: distance },
                      };
                      const delta = deltaByKey[event.key];
                      if (!delta) return;
                      event.preventDefault();
                      moveNode(node, delta);
                    }}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    onFocus={() => setHoveredNode(node.id)}
                    onBlur={() => setHoveredNode(null)}
                  >
                    {isSelected && <circle cx={node.x} cy={node.y} r={radius + 7} fill="none" stroke={color} strokeWidth="2" opacity=".42" />}
                    <circle cx={node.x} cy={node.y} r={radius + (isHovered ? 3 : 0)} fill={fill} stroke={color} strokeWidth={node.kind === "page" ? 2.2 : node.kind === "subtopic" ? 2 : 1.5} />
                    {node.kind === "topic" && <circle cx={node.x} cy={node.y} r="3" fill="#fff" opacity=".9" />}
                    {node.kind === "subtopic" && <circle cx={node.x} cy={node.y} r="2" fill={color} opacity=".8" />}
                    {showLabel && <text x={node.x} y={node.y + radius + 16} textAnchor="middle" fill="#313632" fontSize={node.kind === "page" ? 10.5 : node.kind === "subtopic" ? 11 : 12} fontWeight={node.kind === "page" ? 500 : 700} paintOrder="stroke" stroke="#f7f8f6" strokeWidth="4" strokeLinejoin="round">
                      {shortLabel(node.label)}
                    </text>}
                    {(node.kind === "topic" || node.kind === "subtopic") && <text x={node.x + radius + 3} y={node.y - radius} fill="#6a706c" fontSize="9">{node.count}</text>}
                    <title>{node.label}</title>
                  </a>
                );
              })}
            </g>
          </svg>
        )}
        {inspectedNode && (
          <div role="status" aria-label="선택한 노드 정보" className="knowledge-graph__inspector">
            <span className="knowledge-graph__inspector-kind">{graphKindLabel(inspectedNode)}</span>
            <strong>{inspectedNode.label}</strong>
            <span>{inspectedNode.kind === "page"
              ? `문서 링크 ${referenceConnectionCounts.get(inspectedNode.id) ?? 0}개`
              : `그래프 연결 ${connectionCounts.get(inspectedNode.id) ?? 0}개`}</span>
            {inspectedNode.kind === "page" && (referenceConnectionCounts.get(inspectedNode.id) ?? 0) === 0 && (
              <span className="knowledge-graph__inspector-empty">아직 문서 링크가 없습니다</span>
            )}
          </div>
        )}
      </div>
      <footer className="knowledge-graph__legend"><span><i className="graph-dot graph-dot--field" />대주제</span><span><i className="graph-dot graph-dot--subtopic" />소주제</span><span><i className="graph-dot graph-dot--note" />노트</span><span><i className="inline-block h-px w-4 border-t border-dashed border-[#78668c]" />문서 링크</span><p id="knowledge-graph-help">노드는 연결 관계에 따라 움직입니다. 직접 드래그하거나 방향키로 옮기고, 빈 공간을 드래그해 화면을 이동하거나 두 손가락으로 확대하세요.</p></footer>
    </section>
  );
}
