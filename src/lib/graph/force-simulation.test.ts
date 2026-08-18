import { describe, expect, it } from "vitest";

import { estimateRepulsionComparisons, initializeForceNodes, stepForceSimulation } from "./force-simulation";

const node = (id: string, kind: "root" | "topic" | "subtopic" | "page", x: number, y: number) => ({
  id,
  kind,
  x,
  y,
});

describe("force simulation", () => {
  it("연결된 노드는 목표 거리 쪽으로 당긴다", () => {
    let nodes = initializeForceNodes([node("a", "topic", 80, 150), node("b", "subtopic", 320, 150)]);
    const before = Math.abs(nodes[1].x - nodes[0].x);
    for (let index = 0; index < 20; index += 1) {
      nodes = stepForceSimulation(nodes, [{ source: "a", target: "b" }], { width: 400, height: 300, alpha: 1, timeMs: index * 16 });
    }
    expect(Math.abs(nodes[1].x - nodes[0].x)).toBeLessThan(before);
  });

  it("겹친 비연결 노드는 서로 밀어내고 좌표를 캔버스 안에 둔다", () => {
    const stepped = stepForceSimulation(
      initializeForceNodes([node("a", "page", 200, 150), node("b", "page", 200, 150)]),
      [],
      { width: 400, height: 300, alpha: 1, timeMs: 16 },
    );
    expect(Math.hypot(stepped[0].x - stepped[1].x, stepped[0].y - stepped[1].y)).toBeGreaterThan(0);
    for (const current of stepped) {
      expect(Number.isFinite(current.x) && Number.isFinite(current.y)).toBe(true);
      expect(current.x).toBeGreaterThanOrEqual(24);
      expect(current.x).toBeLessThanOrEqual(376);
      expect(current.y).toBeGreaterThanOrEqual(24);
      expect(current.y).toBeLessThanOrEqual(276);
    }
  });

  it("드래그 중 고정한 노드는 시뮬레이션이 움직이지 않는다", () => {
    const nodes = initializeForceNodes([node("fixed", "topic", 100, 100), node("free", "page", 300, 220)]);
    const stepped = stepForceSimulation(nodes, [{ source: "fixed", target: "free" }], {
      width: 400,
      height: 300,
      alpha: 1,
      timeMs: 32,
      fixedNodeId: "fixed",
    });
    expect(stepped[0]).toMatchObject({ x: 100, y: 100, vx: 0, vy: 0 });
  });

  it("노드가 매우 많아져도 척력 계산량을 선형 예산 안에 제한한다", () => {
    expect(estimateRepulsionComparisons(5_000)).toBeLessThanOrEqual(20_000);
    expect(estimateRepulsionComparisons(20)).toBe(190);
  });

  it("천 개 노드가 겹쳐도 한 프레임 뒤 좌표가 모두 유한하다", () => {
    const crowded = initializeForceNodes(Array.from({ length: 1_000 }, (_, index) => (
      node(`node-${index}`, "page", 200, 150)
    )));
    const stepped = stepForceSimulation(crowded, [], { width: 400, height: 300, alpha: 1, timeMs: 16 });
    expect(stepped).toHaveLength(1_000);
    expect(stepped.every((current) => Number.isFinite(current.x) && Number.isFinite(current.y))).toBe(true);
  });

  it("손상된 비유한 좌표도 안전한 캔버스 좌표로 복구한다", () => {
    const broken = initializeForceNodes([
      node("infinite", "page", Number.POSITIVE_INFINITY, Number.NaN),
      node("valid", "topic", 100, 100),
    ]);
    const stepped = stepForceSimulation(broken, [], { width: 400, height: 300, alpha: 1, timeMs: 16 });
    expect(stepped.every((current) => Number.isFinite(current.x) && Number.isFinite(current.y))).toBe(true);
  });
});
