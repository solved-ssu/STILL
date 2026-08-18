import { describe, expect, it } from "vitest";

import { pageContentSchema, parseStoredPageContent } from "./page-content";

describe("page content validation", () => {
  it("BlockNote 기본 블록 구조를 허용한다", () => {
    const content = [{
      id: "block-1",
      type: "paragraph",
      props: { textColor: "default" },
      content: [{ type: "text", text: "안녕하세요", styles: {} }],
      children: [],
    }];
    expect(pageContentSchema.safeParse(content).success).toBe(true);
    expect(parseStoredPageContent(JSON.stringify(content))).toEqual(content);
  });

  it("타입이 없거나 알 수 없는 블록과 손상된 JSON을 거부한다", () => {
    expect(pageContentSchema.safeParse([{ props: {}, content: [] }]).success).toBe(false);
    expect(pageContentSchema.safeParse([{ type: "script", content: [] }]).success).toBe(false);
    expect(pageContentSchema.safeParse([{ type: "paragraph", content: [42] }]).success).toBe(false);
    expect(parseStoredPageContent("not-json")).toEqual([]);
  });
});
