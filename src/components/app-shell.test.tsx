import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TopicSummary } from "@/lib/db/pages";
import { AppShell } from "./app-shell";

vi.mock("./logout-button", () => ({ LogoutButton: () => <button type="button">로그아웃</button> }));

const topics: TopicSummary[] = [
  { slug: "algorithm", title: "알고리즘 / 자료구조", icon: "⌁", description: "문제 해결", pageCount: 3 },
  { slug: "ai", title: "AI", icon: "✦", description: "인공지능", pageCount: 3 },
  { slug: "programming", title: "Programming 언어", icon: "{ }", description: "언어", pageCount: 3 },
  { slug: "web", title: "Web", icon: "◎", description: "웹", pageCount: 2 },
  { slug: "database", title: "Database", icon: "▱", description: "데이터", pageCount: 2 },
  { slug: "etc", title: "기타", icon: "＋", description: "기록", pageCount: 2 },
];

describe("AppShell", () => {
  it("데스크톱에서 데이터베이스의 모든 주제를 바로가기로 제공한다", () => {
    render(<AppShell user={{ studentId: "20261234", name: "김학습", role: "member" }} topics={topics}><p>본문</p></AppShell>);

    const topicNavigation = screen.getByRole("navigation", { name: "워크스페이스 주제" });
    for (const topic of topics) {
      expect(within(topicNavigation).getByRole("link", { name: new RegExp(topic.title) })).toHaveAttribute("href", `/topics/${topic.slug}`);
    }
  });

  it("모바일에서도 홈·내 문서·북마크·설정으로 이동할 수 있다", () => {
    render(<AppShell user={{ studentId: "20261234", name: "김학습", role: "member" }} topics={topics}><p>본문</p></AppShell>);

    const mobileNavigation = screen.getByRole("navigation", { name: "모바일 주 탐색" });
    expect(within(mobileNavigation).getByRole("link", { name: "홈" })).toHaveAttribute("href", "/home");
    expect(within(mobileNavigation).getByRole("link", { name: "내 문서" })).toHaveAttribute("href", "/me/pages");
    expect(within(mobileNavigation).getByRole("link", { name: "북마크" })).toHaveAttribute("href", "/me/bookmarks");
    expect(within(mobileNavigation).getByRole("link", { name: "설정" })).toHaveAttribute("href", "/me/settings");
  });
});
