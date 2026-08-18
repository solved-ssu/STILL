import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PasswordChangeForm } from "./password-change-form";

describe("PasswordChangeForm", () => {
  afterEach(() => vi.restoreAllMocks());

  it("비밀번호 변경 성공을 안내하고 입력값을 지운다", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ message: "비밀번호를 변경했습니다." }),
      { status: 200, headers: { "content-type": "application/json" } },
    ));
    render(<PasswordChangeForm />);

    await userEvent.type(screen.getByLabelText("현재 비밀번호"), "01012345678");
    await userEvent.type(screen.getByLabelText("새 비밀번호"), "still-study-2026");
    await userEvent.type(screen.getByLabelText("새 비밀번호 확인"), "still-study-2026");
    await userEvent.click(screen.getByRole("button", { name: "비밀번호 변경" }));

    expect(screen.getByRole("status")).toHaveTextContent("비밀번호를 변경했습니다.");
    expect(screen.getByLabelText("현재 비밀번호")).toHaveValue("");
  });
});
