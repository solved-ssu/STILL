// @vitest-environment node
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createComment,
  deleteComment,
  isCommentRateLimited,
  listCommentsByPage,
} from "./comments";
import { createPage, getPageBySlug } from "./pages";
import { initializeDatabase } from "./schema";
import { createUsersSkippingExisting } from "./users";

describe("comment repository", () => {
  let database: DatabaseSync;

  beforeEach(() => {
    database = new DatabaseSync(":memory:");
    initializeDatabase(database);
    createUsersSkippingExisting(database, [
      { studentId: "20261234", name: "김알고", passwordHash: "hash" },
      { studentId: "20265678", name: "이질문", passwordHash: "hash" },
      { studentId: "20260001", name: "관리자", passwordHash: "hash", role: "admin" },
    ]);
  });

  afterEach(() => database.close());

  it("공개 문서에 댓글을 작성하고 시간순으로 조회한다", () => {
    const first = createComment(database, "segment-tree", "  이 부분의 시간복잡도가 궁금합니다.  ", {
      studentId: "20261234",
      role: "member",
    }, new Date("2026-08-14T01:00:00.000Z"));
    const second = createComment(database, "segment-tree", "답변을 기다리고 있습니다.", {
      studentId: "20265678",
      role: "member",
    }, new Date("2026-08-14T01:01:00.000Z"));

    expect(first).toEqual({ id: 1 });
    expect(second).toEqual({ id: 2 });
    expect(listCommentsByPage(database, "segment-tree")).toEqual([
      expect.objectContaining({ id: 1, authorId: "20261234", authorName: "김알고", body: "이 부분의 시간복잡도가 궁금합니다." }),
      expect.objectContaining({ id: 2, authorId: "20265678", authorName: "이질문", body: "답변을 기다리고 있습니다." }),
    ]);
    expect(getPageBySlug(database, "segment-tree", "20261234")?.commentCount).toBe(2);
  });

  it("접근할 수 없는 문서에는 댓글을 만들지 않는다", () => {
    const draft = createPage(
      database,
      { title: "개인 초안", icon: "✎", excerpt: "초안", topicSlug: "ai", subtopicSlug: null, content: [], status: "draft" },
      { studentId: "20261234", name: "김알고" },
    );

    expect(createComment(database, draft.id, "볼 수 없는 초안", { studentId: "20265678", role: "member" })).toBeNull();
    expect(createComment(database, draft.id, "내 초안 메모", { studentId: "20261234", role: "member" })).not.toBeNull();
    expect(createComment(database, "missing", "없는 글", { studentId: "20260001", role: "admin" })).toBeNull();
  });

  it("댓글은 작성자 또는 관리자만 삭제한다", () => {
    const comment = createComment(database, "segment-tree", "삭제 권한 확인", { studentId: "20261234", role: "member" });
    expect(comment).not.toBeNull();
    expect(deleteComment(database, comment!.id, { studentId: "20265678", role: "member" })).toBe(false);
    expect(deleteComment(database, comment!.id, { studentId: "20260001", role: "admin" })).toBe(true);
    expect(listCommentsByPage(database, "segment-tree")).toEqual([]);
  });

  it("최근 1분 동안 작성한 댓글이 5개면 제한한다", () => {
    const now = new Date("2026-08-14T01:00:00.000Z");
    for (let index = 0; index < 5; index += 1) {
      createComment(database, "segment-tree", `댓글 ${index}`, { studentId: "20261234", role: "member" }, now);
    }
    expect(isCommentRateLimited(database, "20261234", now)).toBe(true);
    expect(isCommentRateLimited(database, "20265678", now)).toBe(false);
  });
});
