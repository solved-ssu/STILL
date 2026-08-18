/** @vitest-environment node */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthSecret: vi.fn(),
  getDatabase: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getAuthSecret: mocks.getAuthSecret,
}));

vi.mock("@/lib/db/database", () => ({
  getDatabase: mocks.getDatabase,
}));

import { GET } from "./route";

describe("GET /api/health", () => {
  beforeEach(() => {
    mocks.getAuthSecret.mockReset().mockReturnValue("a".repeat(32));
    mocks.getDatabase.mockReset().mockReturnValue({
      prepare: vi.fn().mockReturnValue({
        get: vi.fn().mockReturnValue({ quick_check: "ok" }),
      }),
    });
  });

  it("reports healthy only when configuration and SQLite are ready", async () => {
    const response = GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("does not expose configuration failures", async () => {
    mocks.getAuthSecret.mockImplementation(() => {
      throw new Error("AUTH_PEPPER contains a secret value");
    });

    const response = GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: "unavailable" });
  });

  it("reports unavailable when SQLite integrity checking fails", async () => {
    mocks.getDatabase.mockReturnValue({
      prepare: vi.fn().mockReturnValue({
        get: vi.fn().mockReturnValue({ quick_check: "database disk image is malformed" }),
      }),
    });

    const response = GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: "unavailable" });
  });
});
