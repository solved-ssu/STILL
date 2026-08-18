import { expect, test } from "@playwright/test";

const adminId = process.env.E2E_ADMIN_ID ?? "20269999";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "e2e-admin-2026";

test.beforeEach(async ({ page }) => {
  await page.goto("/landing");
  await page.getByLabel("학번").fill(adminId);
  await page.getByLabel("비밀번호").fill(adminPassword);
  await page.getByRole("button", { name: "STILL 시작하기" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.getByRole("button", { name: "그래프 움직임 정지" }).click();
});

test("검색한 그래프 노드로 카메라와 키보드 포커스를 이동한다", async ({ page }) => {
  const search = page.getByRole("combobox", { name: "그래프 노드 검색" });
  await search.fill("알고");
  await search.press("ArrowDown");
  await search.press("Enter");

  const selectedNode = page.getByRole("link", { name: "알고리즘 / 자료구조 분야 보기" });
  await expect(selectedNode).toHaveAttribute("aria-current", "location");
  await expect(selectedNode).toBeFocused();
  await expect(page.getByText("160%", { exact: true })).toBeVisible();
});

test("두 포인터 핀치가 중점을 유지하고 취소 뒤 정상 종료된다", async ({ page }) => {
  const graph = page.getByRole("group", { name: "분야와 문서 사이의 관계를 나타내는 노트 그래프" });
  const box = await graph.boundingBox();
  expect(box).not.toBeNull();
  const centerX = box!.x + box!.width / 2;
  const centerY = box!.y + box!.height / 2;

  await graph.dispatchEvent("pointerdown", { pointerId: 41, pointerType: "touch", button: 0, clientX: centerX - 100, clientY: centerY });
  await graph.dispatchEvent("pointerdown", { pointerId: 42, pointerType: "touch", button: 0, clientX: centerX + 100, clientY: centerY });
  await graph.dispatchEvent("pointermove", { pointerId: 41, pointerType: "touch", button: 0, clientX: centerX - 150, clientY: centerY });
  await graph.dispatchEvent("pointermove", { pointerId: 42, pointerType: "touch", button: 0, clientX: centerX + 150, clientY: centerY });

  await expect(page.getByText("150%", { exact: true })).toBeVisible();
  await expect(graph).toHaveAttribute("data-dragging", "pinch");
  await graph.dispatchEvent("pointercancel", { pointerId: 41, pointerType: "touch", button: 0, clientX: centerX - 150, clientY: centerY });
  await expect(graph).not.toHaveAttribute("data-dragging");
});
