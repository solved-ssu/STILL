import { describe, expect, it } from "vitest";

import { extractInternalPageSlugs } from "./page-links";

describe("extractInternalPageSlugs", () => {
  it("중첩된 BlockNote 링크에서 내부 문서 주소를 중복 없이 추출한다", () => {
    const content = [
      {
        type: "paragraph",
        content: [
          { type: "link", href: "/pages/segment-tree?from=graph#intro", content: "세그먼트 트리" },
          { type: "link", href: "/pages/segment-tree", content: "중복" },
        ],
        children: [{
          type: "paragraph",
          content: [{ type: "link", href: "/pages/%ED%95%9C%EA%B8%80-%EB%AC%B8%EC%84%9C", content: "한글" }],
        }],
      },
    ];

    expect(extractInternalPageSlugs(content)).toEqual(["segment-tree", "한글-문서"]);
  });

  it("외부·다른 경로·경로 순회·손상된 주소를 무시한다", () => {
    const content = [{
      type: "paragraph",
      content: [
        { type: "link", href: "https://example.com/pages/external", content: "외부" },
        { type: "link", href: "//example.com/pages/external", content: "외부" },
        { type: "link", href: "/topics/algorithm", content: "주제" },
        { type: "link", href: "/pages/a/b", content: "중첩" },
        { type: "link", href: "/pages/../admin", content: "순회" },
        { type: "link", href: "/pages/%E0%A4%A", content: "손상" },
        { type: "link", href: "/pages/", content: "빈 값" },
      ],
    }];

    expect(extractInternalPageSlugs(content)).toEqual([]);
  });
});
