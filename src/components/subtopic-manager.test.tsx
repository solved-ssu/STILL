import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SubtopicSummary, TopicSummary } from "@/lib/db/pages";
import { SubtopicManager } from "./subtopic-manager";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const topics: TopicSummary[] = [
  { slug: "algorithm", title: "알고리즘", icon: "A", description: "알고리즘", pageCount: 1 },
];
const subtopics: SubtopicSummary[] = [
  { topicSlug: "algorithm", slug: "data-structures", title: "자료구조", icon: "D", description: "자료구조", pageCount: 1 },
  { topicSlug: "algorithm", slug: "graph-search", title: "그래프 / 탐색", icon: "G", description: "그래프", pageCount: 0 },
];

describe("SubtopicManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    })));
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  it("소주제 정보를 인라인으로 수정한다", async () => {
    const user = userEvent.setup();
    render(<SubtopicManager topics={topics} subtopics={subtopics} />);

    await user.click(screen.getByRole("button", { name: "그래프 / 탐색 수정" }));
    await user.clear(screen.getByLabelText("소주제 이름"));
    await user.type(screen.getByLabelText("소주제 이름"), "그래프 탐색");
    await user.click(screen.getByRole("button", { name: "변경 저장" }));

    expect(fetch).toHaveBeenCalledWith("/api/admin/subtopics/algorithm/graph-search", expect.objectContaining({
      method: "PATCH",
      body: expect.stringContaining('"title":"그래프 탐색"'),
    }));
    expect(await screen.findByRole("status")).toHaveTextContent("수정했습니다");
    expect(refresh).toHaveBeenCalled();
  });

  it("위아래 이동 시 같은 대주제의 전체 순서를 저장한다", async () => {
    const user = userEvent.setup();
    render(<SubtopicManager topics={topics} subtopics={subtopics} />);

    await user.click(screen.getByRole("button", { name: "그래프 / 탐색 위로 이동" }));

    expect(fetch).toHaveBeenCalledWith("/api/admin/subtopics/reorder", expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ topicSlug: "algorithm", orderedSlugs: ["graph-search", "data-structures"] }),
    }));
    expect(refresh).toHaveBeenCalled();
  });

  it("사용 중인 소주제 삭제 실패 이유를 보여준다", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({
      message: "연결된 문서를 다른 소주제로 옮긴 뒤 삭제해 주세요.",
    }), { status: 409, headers: { "content-type": "application/json" } }));
    const user = userEvent.setup();
    render(<SubtopicManager topics={topics} subtopics={subtopics} />);

    await user.click(screen.getByRole("button", { name: "자료구조 삭제" }));

    expect(confirm).toHaveBeenCalled();
    expect(await screen.findByRole("status")).toHaveTextContent("연결된 문서");
    expect(refresh).not.toHaveBeenCalled();
  });
});
