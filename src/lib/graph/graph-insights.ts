import type { PageReference, PageSummary } from "@/lib/db/pages";

export interface ConnectedPageInsight {
  page: PageSummary;
  connectionCount: number;
}

export function rankConnectedPages(
  pages: PageSummary[],
  references: PageReference[],
  limit: number,
): ConnectedPageInsight[] {
  if (!Number.isFinite(limit) || limit <= 0) return [];

  const pageById = new Map(pages.map((page) => [page.id, page]));
  const neighbors = new Map(pages.map((page) => [page.id, new Set<string>()]));

  for (const reference of references) {
    const { sourcePageId, targetPageId } = reference;
    if (sourcePageId === targetPageId || !pageById.has(sourcePageId) || !pageById.has(targetPageId)) continue;
    neighbors.get(sourcePageId)?.add(targetPageId);
    neighbors.get(targetPageId)?.add(sourcePageId);
  }

  return pages
    .map((page) => ({ page, connectionCount: neighbors.get(page.id)?.size ?? 0 }))
    .filter((insight) => insight.connectionCount > 0)
    .sort((left, right) => right.connectionCount - left.connectionCount || left.page.title.localeCompare(right.page.title, "ko"))
    .slice(0, Math.floor(limit));
}
