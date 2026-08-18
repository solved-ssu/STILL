// @vitest-environment node
import { describe, expect, it } from "vitest";

import { RequestBodyTooLargeError, readJsonBody } from "./request-body";

describe("bounded request body reader", () => {
  it("Content-Length가 없어도 실제 UTF-8 바이트 크기를 제한한다", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({ value: "가나다" }),
    });
    await expect(readJsonBody(request, 10)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });

  it("제한 안의 JSON을 파싱한다", async () => {
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({ ok: true }),
    });
    await expect(readJsonBody(request, 100)).resolves.toEqual({ ok: true });
  });
});
