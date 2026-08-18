import type { GraphNodeKind, KnowledgeGraphEdge } from "./knowledge-graph";

export interface ForceSimulationNode {
  id: string;
  kind: GraphNodeKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface StepOptions {
  width: number;
  height: number;
  alpha: number;
  timeMs: number;
  fixedNodeId?: string | null;
}

const PADDING = 24;
const MAX_REPULSION_COMPARISONS = 16_000;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

export function estimateRepulsionComparisons(nodeCount: number): number {
  const count = Math.max(0, Math.floor(finiteOr(nodeCount, 0)));
  const exact = count * (count - 1) / 2;
  if (exact <= MAX_REPULSION_COMPARISONS) return exact;
  return count * Math.max(1, Math.floor(MAX_REPULSION_COMPARISONS / count));
}

function linkDistance(source: GraphNodeKind, target: GraphNodeKind): number {
  if (source === "page" || target === "page") return 66;
  if (source === "subtopic" || target === "subtopic") return 92;
  return 138;
}

export function initializeForceNodes(
  nodes: Array<{ id: string; kind: GraphNodeKind; x: number; y: number }>,
): ForceSimulationNode[] {
  return nodes.map((node, index) => ({
    ...node,
    vx: Math.sin(index * 1.7) * 0.08,
    vy: Math.cos(index * 1.3) * 0.08,
  }));
}

export function stepForceSimulation(
  nodes: ForceSimulationNode[],
  edges: KnowledgeGraphEdge[],
  options: StepOptions,
): ForceSimulationNode[] {
  const centerX = options.width / 2;
  const centerY = options.height / 2;
  const next = nodes.map((node) => ({
    ...node,
    x: finiteOr(node.x, centerX),
    y: finiteOr(node.y, centerY),
    vx: finiteOr(node.vx, 0),
    vy: finiteOr(node.vy, 0),
  }));
  const nodeIndex = new Map(next.map((node, index) => [node.id, index]));
  const alpha = clamp(options.alpha, 0, 1.2);

  function applyRepulsion(left: number, right: number) {
      const a = next[left];
      const b = next[right];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let distanceSquared = dx * dx + dy * dy;
      if (distanceSquared < 0.01) {
        const direction = ((left + 1) * 1.618 + right) * Math.PI;
        dx = Math.cos(direction) * 0.1;
        dy = Math.sin(direction) * 0.1;
        distanceSquared = 0.01;
      }
      const distance = Math.sqrt(distanceSquared);
      const repel = Math.min(1.8, (440 * alpha) / distanceSquared);
      const fx = (dx / distance) * repel;
      const fy = (dy / distance) * repel;
      a.vx -= fx;
      a.vy -= fy;
      b.vx += fx;
      b.vy += fy;
  }

  const exactComparisons = next.length * (next.length - 1) / 2;
  if (exactComparisons <= MAX_REPULSION_COMPARISONS) {
    for (let left = 0; left < next.length; left += 1) {
      for (let right = left + 1; right < next.length; right += 1) applyRepulsion(left, right);
    }
  } else {
    const comparisonsPerNode = Math.max(1, Math.floor(MAX_REPULSION_COMPARISONS / next.length));
    const stride = Math.max(1, Math.floor((next.length - 1) / comparisonsPerNode));
    const phase = Math.abs(Math.floor(finiteOr(options.timeMs, 0) / 16));
    for (let left = 0; left < next.length; left += 1) {
      for (let sample = 0; sample < comparisonsPerNode; sample += 1) {
        const offset = 1 + ((phase + sample * stride) % (next.length - 1));
        applyRepulsion(left, (left + offset) % next.length);
      }
    }
  }

  for (const edge of edges) {
    const sourceIndex = nodeIndex.get(edge.source);
    const targetIndex = nodeIndex.get(edge.target);
    if (sourceIndex === undefined || targetIndex === undefined) continue;
    const source = next[sourceIndex];
    const target = next[targetIndex];
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.max(Math.hypot(dx, dy), 0.1);
    const spring = (distance - linkDistance(source.kind, target.kind)) * 0.018 * alpha;
    const fx = (dx / distance) * spring;
    const fy = (dy / distance) * spring;
    source.vx += fx;
    source.vy += fy;
    target.vx -= fx;
    target.vy -= fy;
  }

  next.forEach((node, index) => {
    if (node.id === options.fixedNodeId) {
      node.vx = 0;
      node.vy = 0;
      return;
    }
    const centerStrength = node.kind === "root" ? 0.012 : 0.0015;
    node.vx += (centerX - node.x) * centerStrength * alpha;
    node.vy += (centerY - node.y) * centerStrength * alpha;
    const phase = options.timeMs / 950 + index * 1.73;
    node.vx += Math.sin(phase) * 0.012 * alpha;
    node.vy += Math.cos(phase * 0.91) * 0.012 * alpha;
    node.vx *= 0.88;
    node.vy *= 0.88;
    node.x = clamp(node.x + node.vx, PADDING, options.width - PADDING);
    node.y = clamp(node.y + node.vy, PADDING, options.height - PADDING);
    if (node.x === PADDING || node.x === options.width - PADDING) node.vx *= -0.35;
    if (node.y === PADDING || node.y === options.height - PADDING) node.vy *= -0.35;
  });

  return next;
}
