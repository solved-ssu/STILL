export interface GraphPoint {
  x: number;
  y: number;
}

export interface GraphCamera {
  zoom: number;
  pan: GraphPoint;
}

export const GRAPH_ZOOM_MIN = 0.6;
export const GRAPH_ZOOM_MAX = 2.4;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function panLimit(dimension: number, zoom: number): number {
  const viewportDimension = dimension / zoom;
  const zoomedInset = Math.max(0, (dimension - viewportDimension) / 2);
  return zoomedInset + dimension * 0.04;
}

export function normalizeGraphCamera(camera: GraphCamera, width: number, height: number): GraphCamera {
  const safeWidth = Math.max(1, finiteOr(width, 1));
  const safeHeight = Math.max(1, finiteOr(height, 1));
  const rawZoom = finiteOr(camera.zoom, 1);
  const zoom = Math.round(clamp(rawZoom, GRAPH_ZOOM_MIN, GRAPH_ZOOM_MAX) * 100) / 100;
  const maximumPanX = panLimit(safeWidth, zoom);
  const maximumPanY = panLimit(safeHeight, zoom);
  return {
    zoom,
    pan: {
      x: clamp(finiteOr(camera.pan.x, 0), -maximumPanX, maximumPanX),
      y: clamp(finiteOr(camera.pan.y, 0), -maximumPanY, maximumPanY),
    },
  };
}

export function graphViewBox(camera: GraphCamera, width: number, height: number): string {
  const normalized = normalizeGraphCamera(camera, width, height);
  const safeWidth = Math.max(1, finiteOr(width, 1));
  const safeHeight = Math.max(1, finiteOr(height, 1));
  const viewWidth = safeWidth / normalized.zoom;
  const viewHeight = safeHeight / normalized.zoom;
  return `${(safeWidth - viewWidth) / 2 - normalized.pan.x} ${(safeHeight - viewHeight) / 2 - normalized.pan.y} ${viewWidth} ${viewHeight}`;
}
