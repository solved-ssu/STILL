import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageList } from "./page-list";

describe("PageList", () => {
  it("문서 아이콘과 통계 아이콘을 장식으로 숨긴다", () => {
    render(<PageList pages={[{
      id: "page-1", slug: "page-1", title: "접근성 노트", icon: "✎", excerpt: "아이콘", topicSlug: "web", topicTitle: "Web",
      subtopicSlug: null, subtopicTitle: null, authorName: "부원", updatedAt: new Date().toISOString(), viewCount: 3, commentCount: 1, status: "published",
    }]} />);

    expect(screen.getByText("✎")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("3").previousElementSibling).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("1").previousElementSibling).toHaveAttribute("aria-hidden", "true");
  });
});
