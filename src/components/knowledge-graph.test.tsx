import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { PageSummary, SubtopicSummary, TopicSummary } from "@/lib/db/pages";
import { KnowledgeGraphView } from "./knowledge-graph";

const topics: TopicSummary[] = [
  { slug: "algorithm", title: "알고리즘", icon: "⌁", description: "문제 해결", pageCount: 1 },
  { slug: "ai", title: "AI", icon: "✦", description: "인공지능", pageCount: 1 },
];
const subtopics: SubtopicSummary[] = [
  { topicSlug: "algorithm", slug: "data-structures", title: "자료구조", icon: "🌲", description: "자료구조", pageCount: 1 },
  { topicSlug: "ai", slug: "machine-learning", title: "머신러닝", icon: "◈", description: "학습", pageCount: 1 },
];
const pages: PageSummary[] = [
  { id: "segment-tree", slug: "segment-tree", title: "세그먼트 트리", icon: "·", excerpt: "", topicSlug: "algorithm", topicTitle: "알고리즘", subtopicSlug: "data-structures", subtopicTitle: "자료구조", authorName: "작성자", updatedAt: "2026-08-14T00:00:00Z", viewCount: 0, commentCount: 0, status: "published" },
  { id: "transformer", slug: "transformer", title: "Transformer", icon: "·", excerpt: "", topicSlug: "ai", topicTitle: "AI", subtopicSlug: "machine-learning", subtopicTitle: "머신러닝", authorName: "작성자", updatedAt: "2026-08-14T00:00:00Z", viewCount: 0, commentCount: 0, status: "published" },
];

describe("KnowledgeGraphView", () => {
  it("분야와 문서를 이동 가능한 그래프 노드로 표시한다", () => {
    render(<KnowledgeGraphView topics={topics} subtopics={subtopics} pages={pages} />);
    expect(screen.getByRole("link", { name: "알고리즘 분야 보기" })).toHaveAttribute("href", "/topics/algorithm");
    expect(screen.getByRole("link", { name: "자료구조 소주제 보기" })).toHaveAttribute("href", "/topics/algorithm/data-structures");
    expect(screen.getByRole("link", { name: "세그먼트 트리 문서 보기" })).toHaveAttribute("href", "/pages/segment-tree");
  });

  it("분야 필터를 누르면 해당 분야의 문서만 남긴다", async () => {
    render(<KnowledgeGraphView topics={topics} subtopics={subtopics} pages={pages} />);
    await userEvent.click(screen.getByRole("button", { name: "AI 분야만 보기" }));

    expect(screen.getByRole("link", { name: "Transformer 문서 보기" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "세그먼트 트리 문서 보기" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AI 분야만 보기" })).toHaveAttribute("aria-pressed", "true");
  });

  it("확대·축소 버튼의 현재 배율을 안내한다", async () => {
    render(<KnowledgeGraphView topics={topics} subtopics={subtopics} pages={pages} />);
    const zoom = screen.getByText("100%");
    await userEvent.click(screen.getByRole("button", { name: "그래프 확대" }));
    expect(zoom).toHaveTextContent("115%");
    await userEvent.click(screen.getByRole("button", { name: "그래프 축소" }));
    expect(zoom).toHaveTextContent("100%");
  });

  it("포인터로 노드를 드래그해 위치를 바꾸고 초기화할 수 있다", async () => {
    render(<KnowledgeGraphView topics={topics} subtopics={subtopics} pages={pages} />);
    await userEvent.click(screen.getByRole("button", { name: "그래프 움직임 정지" }));
    const graph = screen.getByRole("group", { name: "분야와 문서 사이의 관계를 나타내는 노트 그래프" });
    Object.defineProperty(graph, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ x: 0, y: 0, left: 0, top: 0, right: 960, bottom: 500, width: 960, height: 500, toJSON: () => ({}) }),
    });
    const node = screen.getByRole("link", { name: "세그먼트 트리 문서 보기" });
    const circle = node.querySelector("circle");
    const initialX = circle?.getAttribute("cx");

    fireEvent.pointerDown(circle!, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(graph, { pointerId: 1, clientX: 150, clientY: 125 });
    fireEvent.pointerUp(graph, { pointerId: 1, clientX: 150, clientY: 125 });

    expect(circle).not.toHaveAttribute("cx", initialX);
    await userEvent.click(screen.getByRole("button", { name: "그래프 초기화" }));
    expect(circle).toHaveAttribute("cx", "480");
  });

  it("키보드 방향키로 포커스한 노드를 이동한다", async () => {
    render(<KnowledgeGraphView topics={topics} subtopics={subtopics} pages={pages} />);
    await userEvent.click(screen.getByRole("button", { name: "그래프 움직임 정지" }));
    const node = screen.getByRole("link", { name: "AI 분야 보기" });
    const circle = node.querySelector("circle");
    const initialX = Number(circle?.getAttribute("cx"));

    node.focus();
    await userEvent.keyboard("{ArrowRight}");

    expect(Number(circle?.getAttribute("cx"))).toBeGreaterThan(initialX);
    expect(screen.getByText(/직접 드래그하거나 방향키로 옮기고/)).toBeInTheDocument();
  });

  it("빈 공간을 드래그해 화면을 이동하고 휠로 확대한다", () => {
    render(<KnowledgeGraphView topics={topics} subtopics={subtopics} pages={pages} />);
    const graph = screen.getByRole("group", { name: "분야와 문서 사이의 관계를 나타내는 노트 그래프" });
    Object.defineProperty(graph, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ x: 0, y: 0, left: 0, top: 0, right: 960, bottom: 500, width: 960, height: 500, toJSON: () => ({}) }),
    });
    const background = graph.querySelector("rect")!;
    const initialViewBox = graph.getAttribute("viewBox");

    fireEvent.pointerDown(background, { pointerId: 2, clientX: 300, clientY: 200 });
    fireEvent.pointerMove(graph, { pointerId: 2, clientX: 350, clientY: 230 });
    fireEvent.pointerUp(graph, { pointerId: 2, clientX: 350, clientY: 230 });

    expect(graph).not.toHaveAttribute("viewBox", initialViewBox);
    fireEvent.wheel(graph, { deltaY: -100 });
    expect(screen.getByText("108%")).toBeInTheDocument();
  });

  it("그래프의 자동 움직임을 정지하고 다시 재생할 수 있다", async () => {
    render(<KnowledgeGraphView topics={topics} subtopics={subtopics} pages={pages} />);
    const pause = screen.getByRole("button", { name: "그래프 움직임 정지" });
    expect(pause).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(pause);
    expect(screen.getByRole("button", { name: "그래프 움직임 재생" })).toHaveAttribute("aria-pressed", "true");
  });

  it("전체 문서보다 일부만 표시할 때 그래프 제한을 명확히 안내한다", () => {
    render(<KnowledgeGraphView topics={topics} subtopics={subtopics} pages={pages} totalPageCount={90} />);
    expect(screen.getByText(/노트 2개 표시 \/ 전체 90개/)).toBeInTheDocument();
  });

  it("반복 확대를 상한에서 멈추고 과도한 팬에도 그래프를 유한한 범위에 둔다", async () => {
    render(<KnowledgeGraphView topics={topics} subtopics={subtopics} pages={pages} />);
    await userEvent.click(screen.getByRole("button", { name: "그래프 움직임 정지" }));
    const zoomIn = screen.getByRole("button", { name: "그래프 확대" });
    for (let index = 0; index < 10; index += 1) await userEvent.click(zoomIn);
    expect(zoomIn).toBeDisabled();
    expect(screen.getByText("240%")).toBeInTheDocument();

    const graph = screen.getByRole("group", { name: "분야와 문서 사이의 관계를 나타내는 노트 그래프" });
    Object.defineProperty(graph, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ x: 0, y: 0, left: 0, top: 0, right: 960, bottom: 500, width: 960, height: 500, toJSON: () => ({}) }),
    });
    const background = graph.querySelector("rect")!;
    fireEvent.pointerDown(background, { pointerId: 8, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(graph, { pointerId: 8, clientX: 100_000, clientY: -100_000 });
    fireEvent.pointerUp(graph, { pointerId: 8, clientX: 100_000, clientY: -100_000 });

    const viewBox = graph.getAttribute("viewBox")!.split(" ").map(Number);
    expect(viewBox.every(Number.isFinite)).toBe(true);
    expect(Math.abs(viewBox[0])).toBeLessThan(1_000);
    expect(Math.abs(viewBox[1])).toBeLessThan(600);
  });

  it("두 손가락의 중점을 유지하며 핀치 확대하고 취소 뒤 입력 상태를 정리한다", async () => {
    render(<KnowledgeGraphView topics={topics} subtopics={subtopics} pages={pages} />);
    await userEvent.click(screen.getByRole("button", { name: "그래프 움직임 정지" }));
    const graph = screen.getByRole("group", { name: "분야와 문서 사이의 관계를 나타내는 노트 그래프" });
    Object.defineProperty(graph, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ x: 0, y: 0, left: 0, top: 0, right: 960, bottom: 500, width: 960, height: 500, toJSON: () => ({}) }),
    });
    const background = graph.querySelector("rect")!;

    fireEvent.pointerDown(background, { pointerId: 11, pointerType: "touch", clientX: 300, clientY: 200 });
    fireEvent.pointerDown(background, { pointerId: 12, pointerType: "touch", clientX: 500, clientY: 200 });
    fireEvent.pointerMove(graph, { pointerId: 11, pointerType: "touch", clientX: 250, clientY: 200 });
    fireEvent.pointerMove(graph, { pointerId: 12, pointerType: "touch", clientX: 550, clientY: 200 });

    expect(screen.getByText("150%")).toBeInTheDocument();
    const [left, , width] = graph.getAttribute("viewBox")!.split(" ").map(Number);
    expect(left + width * (400 / 960)).toBeCloseTo(400, 1);
    expect(graph).toHaveAttribute("data-dragging", "pinch");

    fireEvent.pointerCancel(graph, { pointerId: 11, pointerType: "touch", clientX: 250, clientY: 200 });
    expect(graph).not.toHaveAttribute("data-dragging");
    fireEvent.pointerDown(background, { pointerId: 13, pointerType: "touch", clientX: 180, clientY: 160 });
    expect(graph).toHaveAttribute("data-dragging", "pan");
    fireEvent.pointerUp(graph, { pointerId: 13, pointerType: "touch", clientX: 180, clientY: 160 });
    expect(graph).not.toHaveAttribute("data-dragging");
  });

  it("노드를 검색하고 선택하면 해당 노드로 카메라와 접근성 포커스를 이동한다", async () => {
    render(<KnowledgeGraphView topics={topics} subtopics={subtopics} pages={pages} />);
    await userEvent.click(screen.getByRole("button", { name: "그래프 움직임 정지" }));
    const search = screen.getByRole("combobox", { name: "그래프 노드 검색" });

    await userEvent.type(search, "trans");
    const result = screen.getByRole("option", { name: "Transformer · 노트" });
    await userEvent.click(result);

    expect(screen.getByText("160%")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Transformer 문서 보기" })).toHaveAttribute("aria-current", "location");
    expect(screen.getByText("Transformer 노드로 이동했습니다.")).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Transformer 문서 보기" }));
  });

  it("키보드로 검색 결과를 선택하고 Escape로 결과를 닫는다", async () => {
    render(<KnowledgeGraphView topics={topics} subtopics={subtopics} pages={pages} />);
    const search = screen.getByRole("combobox", { name: "그래프 노드 검색" });

    await userEvent.type(search, "알고");
    expect(search).toHaveAttribute("aria-expanded", "true");
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(screen.getByRole("link", { name: "알고리즘 분야 보기" })).toHaveAttribute("aria-current", "location");

    search.focus();
    await userEvent.clear(search);
    await userEvent.type(search, "자료");
    await userEvent.keyboard("{Escape}");
    expect(search).toHaveAttribute("aria-expanded", "false");
  });

  it("문서 사이 참조 연결을 계층선과 구분해 표시한다", () => {
    const { container } = render(
      <KnowledgeGraphView
        topics={topics}
        subtopics={subtopics}
        pages={pages}
        references={[{ sourcePageId: "segment-tree", targetPageId: "transformer" }]}
      />,
    );

    expect(container.querySelector("line[data-edge-kind='reference']")).toHaveAttribute("stroke-dasharray", "5 4");
    expect(screen.getByText("문서 링크")).toBeInTheDocument();
  });

  it("노드에 머물면 종류와 연결 수를 보여 주는 탐색 정보를 제공한다", () => {
    render(
      <KnowledgeGraphView
        topics={topics}
        subtopics={subtopics}
        pages={pages}
        references={[{ sourcePageId: "segment-tree", targetPageId: "transformer" }]}
      />,
    );

    fireEvent.mouseEnter(screen.getByRole("link", { name: "세그먼트 트리 문서 보기" }));
    const inspector = screen.getByRole("status", { name: "선택한 노드 정보" });
    expect(inspector).toHaveTextContent("세그먼트 트리");
    expect(inspector).toHaveTextContent("노트");
    expect(inspector).toHaveTextContent("연결 2개");
  });
});
