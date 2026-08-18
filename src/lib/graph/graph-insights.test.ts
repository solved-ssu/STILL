import { describe, expect, it } from "vitest";

import type { PageReference, PageSummary } from "@/lib/db/pages";
import { rankConnectedPages } from "./graph-insights";

function page(id: string, title = id): PageSummary {
  return {
    id,
    slug: id,
    title,
    icon: "·",
    excerpt: `${title} 설명`,
    topicSlug: "algorithm",
    topicTitle: "알고리즘",
    subtopicSlug: null,
    subtopicTitle: null,
    authorName: "STILL 편집팀",
    updatedAt: "2026-08-18T00:00:00.000Z",
    viewCount: 0,
    commentCount: 0,
    status: "published",
  };
}

describe("rankConnectedPages", () => {
  it("들어오고 나가는 고유 문서 연결 수가 많은 순서로 노트를 추천한다", () => {
    const pages = [page("a", "A"), page("b", "B"), page("c", "C"), page("d", "D")];
    const references: PageReference[] = [
      { sourcePageId: "a", targetPageId: "b" },
      { sourcePageId: "a", targetPageId: "c" },
      { sourcePageId: "d", targetPageId: "a" },
      { sourcePageId: "b", targetPageId: "a" },
      { sourcePageId: "a", targetPageId: "b" },
      { sourcePageId: "a", targetPageId: "missing" },
    ];

    expect(rankConnectedPages(pages, references, 3).map(({ page: item, connectionCount }) => [item.id, connectionCount])).toEqual([
      ["a", 3],
      ["b", 1],
      ["c", 1],
    ]);
  });

  it("연결이 없는 노트는 추천에서 제외하고 잘못된 제한값은 빈 배열로 처리한다", () => {
    expect(rankConnectedPages([page("alone")], [], 3)).toEqual([]);
    expect(rankConnectedPages([page("a"), page("b")], [{ sourcePageId: "a", targetPageId: "b" }], 0)).toEqual([]);
  });
});
