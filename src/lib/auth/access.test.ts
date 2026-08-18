import { describe, expect, it } from "vitest";

import { decideRouteAccess } from "./access";

describe("decideRouteAccess", () => {
  it("로그인하지 않은 사용자는 landing만 볼 수 있다", () => {
    expect(decideRouteAccess("/landing", null)).toEqual({ kind: "allow" });
    expect(decideRouteAccess("/home", null)).toEqual({
      kind: "redirect",
      destination: "/landing",
    });
    expect(decideRouteAccess("/pages/segment-tree", null)).toEqual({
      kind: "redirect",
      destination: "/landing",
    });
  });

  it("로그인한 사용자를 landing과 루트에서 home으로 보낸다", () => {
    expect(decideRouteAccess("/landing", "member")).toEqual({
      kind: "redirect",
      destination: "/home",
    });
    expect(decideRouteAccess("/", "member")).toEqual({
      kind: "redirect",
      destination: "/home",
    });
  });

  it("일반 회원의 관리자 화면 접근을 차단한다", () => {
    expect(decideRouteAccess("/admin", "member")).toEqual({
      kind: "redirect",
      destination: "/home",
    });
    expect(decideRouteAccess("/admin", "admin")).toEqual({ kind: "allow" });
    expect(decideRouteAccess("/admin/reports", "admin")).toEqual({ kind: "allow" });
  });
});
