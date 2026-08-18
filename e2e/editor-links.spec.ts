import { expect, test } from "@playwright/test";

const adminId = process.env.E2E_ADMIN_ID ?? "20269999";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "e2e-admin-2026";

test("실제 편집기에서 [[로 노트를 제안·선택하고 단일 대괄호는 무시한다", async ({ page }, testInfo) => {
  const targetTitle = `링크 대상 ${testInfo.project.name}`;
  const sourceTitle = `링크 원본 ${testInfo.project.name}`;

  await page.goto("/landing");
  await page.getByLabel("학번").fill(adminId);
  await page.getByLabel("비밀번호").fill(adminPassword);
  await page.getByRole("button", { name: "STILL 시작하기" }).click();
  await page.getByRole("link", { name: "새 문서", exact: true }).first().click();
  await page.getByPlaceholder("제목 없음").fill(targetTitle);
  await page.locator("[contenteditable='true']").first().fill("연결 대상입니다.");
  await page.getByRole("button", { name: "공개" }).click();

  await page.goto("/editor/new");
  await page.getByPlaceholder("제목 없음").fill(sourceTitle);
  const editor = page.locator("[contenteditable='true']").first();
  await editor.fill("arr[i]");
  await expect(page.getByText(targetTitle, { exact: true })).toHaveCount(0);

  await editor.fill(`[[${targetTitle}`);
  const suggestion = page.getByText(targetTitle, { exact: true });
  await expect(suggestion).toBeVisible();
  await suggestion.click();
  await expect(editor).toContainText(targetTitle);
});
