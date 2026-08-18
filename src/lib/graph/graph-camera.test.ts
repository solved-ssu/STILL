import { describe, expect, it } from "vitest";

import {
  GRAPH_ZOOM_MAX,
  GRAPH_ZOOM_MIN,
  graphViewBox,
  normalizeGraphCamera,
} from "./graph-camera";

describe("graph camera", () => {
  it("비정상 확대율과 팬 좌표를 안전한 기본값으로 복구한다", () => {
    expect(normalizeGraphCamera(
      { zoom: Number.POSITIVE_INFINITY, pan: { x: Number.NaN, y: Number.NEGATIVE_INFINITY } },
      960,
      500,
    )).toEqual({ zoom: 1, pan: { x: 0, y: 0 } });
  });

  it("과도한 확대·축소와 팬을 그래프가 보이는 범위로 제한한다", () => {
    const zoomedIn = normalizeGraphCamera({ zoom: 99, pan: { x: 100_000, y: -100_000 } }, 960, 500);
    expect(zoomedIn.zoom).toBe(GRAPH_ZOOM_MAX);
    expect(Math.abs(zoomedIn.pan.x)).toBeLessThan(400);
    expect(Math.abs(zoomedIn.pan.y)).toBeLessThan(220);

    const zoomedOut = normalizeGraphCamera({ zoom: -99, pan: { x: 100_000, y: 100_000 } }, 960, 500);
    expect(zoomedOut.zoom).toBe(GRAPH_ZOOM_MIN);
    expect(Math.abs(zoomedOut.pan.x)).toBeLessThan(100);
    expect(Math.abs(zoomedOut.pan.y)).toBeLessThan(60);
  });

  it("항상 유한한 SVG viewBox를 만든다", () => {
    const viewBox = graphViewBox(
      { zoom: Number.NaN, pan: { x: Number.POSITIVE_INFINITY, y: Number.NaN } },
      960,
      500,
    );
    expect(viewBox.split(" ").map(Number).every(Number.isFinite)).toBe(true);
  });
});
