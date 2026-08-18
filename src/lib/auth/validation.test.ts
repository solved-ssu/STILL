import { describe, expect, it } from "vitest";

import {
  changePasswordSchema,
  loginSchema,
  normalizePhone,
  normalizeStudentId,
} from "./validation";

describe("account input validation", () => {
  it("학번의 공백을 제거하고 숫자 형식만 허용한다", () => {
    expect(normalizeStudentId(" 20261234 ")).toBe("20261234");
    expect(loginSchema.safeParse({ studentId: "abc", password: "01012345678" }).success).toBe(false);
  });

  it("전화번호의 하이픈을 제거한다", () => {
    expect(normalizePhone("010-1234-5678")).toBe("01012345678");
  });

  it("엑셀에서 숫자로 읽힌 10자리 휴대전화 앞에 0을 복원한다", () => {
    expect(normalizePhone(1012345678)).toBe("01012345678");
  });

  it("010으로 시작하는 11자리 번호만 초기 비밀번호로 받는다", () => {
    expect(loginSchema.safeParse({ studentId: "20261234", password: "01012345678" }).success).toBe(true);
    expect(loginSchema.safeParse({ studentId: "20261234", password: "0212345678" }).success).toBe(false);
  });

  it("변경한 영문·숫자 비밀번호로도 로그인할 수 있다", () => {
    expect(loginSchema.parse({ studentId: "20261234", password: "study-log-2026" })).toEqual({
      studentId: "20261234",
      password: "study-log-2026",
    });
  });

  it("새 비밀번호의 강도와 확인값을 검증한다", () => {
    expect(changePasswordSchema.safeParse({
      currentPassword: "01012345678",
      newPassword: "still-study-2026",
      confirmPassword: "still-study-2026",
    }).success).toBe(true);
    expect(changePasswordSchema.safeParse({
      currentPassword: "01012345678",
      newPassword: "01099999999",
      confirmPassword: "01099999999",
    }).success).toBe(false);
    expect(changePasswordSchema.safeParse({
      currentPassword: "same-password-1",
      newPassword: "same-password-1",
      confirmPassword: "same-password-1",
    }).success).toBe(false);
    expect(changePasswordSchema.parse({
      currentPassword: "010-1234-5678",
      newPassword: "next-password-2026",
      confirmPassword: "next-password-2026",
    }).currentPassword).toBe("01012345678");
  });
});
