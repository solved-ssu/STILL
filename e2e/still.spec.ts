import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const adminId = process.env.E2E_ADMIN_ID ?? "20269999";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "e2e-admin-2026";

test("비로그인 사용자는 landing으로 이동하고 잘못된 로그인을 안내한다", async ({ page }) => {
  await page.goto("/home");
  await expect(page).toHaveURL(/\/landing$/);
  await expect(page.getByRole("heading", { name: "STILL · Solved Today I Learned Log 오늘 공부한걸 기록하세요" })).toBeVisible();
  await page.getByLabel("학번").fill("20260000");
  await page.getByLabel("비밀번호").fill("01000000000");
  await page.getByRole("button", { name: "STILL 시작하기" }).click();
  await expect(page.getByText("학번 또는 비밀번호를 확인해 주세요.", { exact: true })).toBeVisible();
});

test("관리자 로그인부터 문서 작성·공개·북마크까지 동작한다", async ({ page }, testInfo) => {
  const noteTitle = `E2E ${testInfo.project.name} 학습 노트`;
  await page.goto("/landing");
  await page.getByLabel("학번").fill(adminId);
  await page.getByLabel("비밀번호").fill(adminPassword);
  await page.getByRole("button", { name: "STILL 시작하기" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("heading", { name: /학습 공간/ })).toBeVisible();
  await expect(page.getByText("Solved Today I Learned Log", { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "작성 현황" })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "분야와 문서 사이의 관계를 나타내는 노트 그래프" })).toBeVisible();
  await expect(page.getByRole("link", { name: "자료구조 소주제 보기" })).toBeVisible();
  await page.getByRole("link", { name: "자료구조 소주제 보기" }).click();
  await expect(page).toHaveURL(/\/topics\/algorithm\/data-structures$/);
  await expect(page.getByRole("heading", { name: "자료구조" })).toBeVisible();
  await page.goto("/home");
  await page.getByRole("button", { name: "AI 분야만 보기" }).click();
  await expect(page.getByRole("button", { name: "AI 분야만 보기" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "그래프 초기화" }).click();
  const fontFamily = await page.locator("body").evaluate((element) => getComputedStyle(element).fontFamily);
  expect(fontFamily).toContain("Pretendard");

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "작성 현황" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "소주제 관리" })).toBeVisible();
  await expect(page.getByLabel(/E2E 관리자: 이번 달 \d+개, 전체 \d+개/)).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("admin-dashboard.png"), fullPage: true });
  await page.goto("/home");

  await page.getByRole("link", { name: "새 문서", exact: true }).first().click();
  await expect(page).toHaveURL(/\/editor\/new$/);
  await page.getByPlaceholder("제목 없음").fill(noteTitle);
  await page.getByLabel("소주제(선택)").selectOption("data-structures");
  await page.getByPlaceholder("문서에서 배울 수 있는 내용").fill("브라우저에서 작성과 공개 흐름을 검증합니다.");
  await page.locator("[contenteditable='true']").first().fill("테스트로 남긴 첫 번째 학습 문단입니다.");
  await page.getByRole("button", { name: "공개" }).click();
  await expect(page).toHaveURL(/\/editor\/[0-9a-f-]+$/);

  await page.goto("/me/pages");
  await page.getByRole("link", { name: new RegExp(noteTitle) }).click();
  await expect(page.getByRole("heading", { name: noteTitle })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "문서 위치" })).toContainText("자료구조");
  const question = `${testInfo.project.name}에서 남긴 질문입니다.`;
  await page.getByLabel("질문 또는 댓글").fill(question);
  await page.getByRole("button", { name: "댓글 등록" }).click();
  await expect(page.getByRole("article", { name: "E2E 관리자의 댓글" })).toContainText(question);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("document-comments.png"), fullPage: true });
  await page.getByRole("button", { name: "북마크" }).click();
  await expect(page.getByRole("button", { name: "저장됨" })).toBeVisible();

  await page.goto("/me/bookmarks");
  await expect(page.getByText(noteTitle)).toBeVisible();
});

test("landing과 home에 자동 탐지 가능한 심각한 접근성 위반이 없다", async ({ page }, testInfo) => {
  await page.goto("/landing");
  const landing = await new AxeBuilder({ page }).analyze();
  expect(landing.violations).toEqual([]);

  await page.getByLabel("학번").fill(adminId);
  await page.getByLabel("비밀번호").fill(adminPassword);
  await page.getByRole("button", { name: "STILL 시작하기" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page).toHaveTitle("홈 · STILL");
  const home = await new AxeBuilder({ page }).analyze();
  expect(home.violations).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("home.png"), fullPage: true });
});

test("관리자가 빈 소주제를 추가·수정·정렬·삭제한다", async ({ page }, testInfo) => {
  const slug = `e2e-${testInfo.project.name}`;
  const initialTitle = `E2E ${testInfo.project.name}`;
  const updatedTitle = `${initialTitle} 수정`;
  await page.goto("/landing");
  await page.getByLabel("학번").fill(adminId);
  await page.getByLabel("비밀번호").fill(adminPassword);
  await page.getByRole("button", { name: "STILL 시작하기" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.goto("/admin");

  const createForm = page.locator("form").filter({ has: page.getByRole("button", { name: "소주제 추가" }) });
  await createForm.getByLabel("상위 대주제").selectOption("algorithm");
  await createForm.getByPlaceholder("아이콘 (예: ◈)").fill("E");
  await createForm.getByPlaceholder("소주제 이름").fill(initialTitle);
  await createForm.getByPlaceholder("영문 주소 (예: number-theory)").fill(slug);
  await createForm.getByPlaceholder("소주제 설명").fill("관리 기능 E2E 검증용 빈 소주제");
  await createForm.getByRole("button", { name: "소주제 추가" }).click();
  await expect(page.getByText("소주제를 추가했습니다.")).toBeVisible();

  await page.getByRole("button", { name: `${initialTitle} 수정` }).click();
  await page.getByLabel("소주제 이름").fill(updatedTitle);
  await page.getByRole("button", { name: "변경 저장" }).click();
  await expect(page.getByRole("status")).toHaveText("소주제를 수정했습니다.");

  await page.getByRole("button", { name: `${updatedTitle} 위로 이동` }).click();
  await expect(page.getByRole("status")).toHaveText("소주제 순서를 저장했습니다.");

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: `${updatedTitle} 삭제` }).click();
  await expect(page.getByRole("status")).toHaveText("소주제를 삭제했습니다.");
  await expect(page.getByRole("button", { name: `${updatedTitle} 수정` })).toHaveCount(0);
});

test("키보드로 이동할 때 입력 필드의 포커스가 뚜렷하게 보인다", async ({ page }) => {
  await page.goto("/landing");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("학번")).toBeFocused();
  const focusStyle = await page.getByLabel("학번").evaluate((element) => {
    const style = getComputedStyle(element);
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  expect(focusStyle.outlineStyle).not.toBe("none");
  expect(Number.parseFloat(focusStyle.outlineWidth)).toBeGreaterThanOrEqual(2);
});

test("홈 그래프가 움직이고 사용자가 정지하거나 노드를 직접 옮길 수 있다", async ({ page }) => {
  await page.goto("/landing");
  await page.getByLabel("학번").fill(adminId);
  await page.getByLabel("비밀번호").fill(adminPassword);
  await page.getByRole("button", { name: "STILL 시작하기" }).click();
  await expect(page).toHaveURL(/\/home$/);

  const node = page.locator("[data-graph-node-id='topic:ai']");
  const circle = node.locator("circle").first();
  const movingX = await circle.getAttribute("cx");
  await page.waitForTimeout(350);
  await expect(circle).not.toHaveAttribute("cx", movingX!);

  await page.getByRole("button", { name: "그래프 움직임 정지" }).click();
  const pausedX = await circle.getAttribute("cx");
  await page.waitForTimeout(250);
  await expect(circle).toHaveAttribute("cx", pausedX!);

  const bounds = await circle.boundingBox();
  expect(bounds).not.toBeNull();
  const initialX = pausedX;
  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds!.x + bounds!.width / 2 + 70, bounds!.y + bounds!.height / 2 + 35, { steps: 5 });
  await page.mouse.up();

  await expect(circle).not.toHaveAttribute("cx", initialX!);
  await expect(page).toHaveURL(/\/home$/);
  await page.getByRole("button", { name: "그래프 초기화" }).click();
  await expect(circle).not.toHaveAttribute("cx", initialX!);
});

test("그래프를 반복 확대하고 강하게 이동해도 화면 밖으로 유실되지 않는다", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/landing");
  await page.getByLabel("학번").fill(adminId);
  await page.getByLabel("비밀번호").fill(adminPassword);
  await page.getByRole("button", { name: "STILL 시작하기" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.getByRole("button", { name: "그래프 움직임 정지" }).click();

  const zoomIn = page.getByRole("button", { name: "그래프 확대" });
  for (let index = 0; index < 10; index += 1) await zoomIn.click();
  await expect(zoomIn).toBeDisabled();
  await expect(page.getByText("240%", { exact: true })).toBeVisible();

  const graph = page.getByRole("group", { name: "분야와 문서 사이의 관계를 나타내는 노트 그래프" });
  const background = graph.locator("rect").first();
  await background.dispatchEvent("pointerdown", { pointerId: 88, button: 0, clientX: 100, clientY: 100 });
  await graph.dispatchEvent("pointermove", { pointerId: 88, button: 0, clientX: 100_000, clientY: -100_000 });
  await graph.dispatchEvent("pointerup", { pointerId: 88, button: 0, clientX: 100_000, clientY: -100_000 });
  const viewBox = (await graph.getAttribute("viewBox"))!.split(" ").map(Number);
  expect(viewBox.every(Number.isFinite)).toBe(true);
  expect(Math.abs(viewBox[0])).toBeLessThan(1_000);
  expect(Math.abs(viewBox[1])).toBeLessThan(600);
  expect(pageErrors).toEqual([]);
});

test("사용자가 비밀번호를 변경하고 새 비밀번호로 다시 로그인한다", async ({ page }, testInfo) => {
  const changedPassword = `still-${testInfo.project.name}-2026`;
  await page.goto("/landing");
  await page.getByLabel("학번").fill(adminId);
  await page.getByLabel("비밀번호").fill(adminPassword);
  await page.getByRole("button", { name: "STILL 시작하기" }).click();
  await expect(page).toHaveURL(/\/home$/);

  await page.goto("/me/settings");
  await page.getByLabel("현재 비밀번호").fill(adminPassword);
  await page.getByLabel("새 비밀번호", { exact: true }).fill(changedPassword);
  await page.getByLabel("새 비밀번호 확인").fill(changedPassword);
  await page.getByRole("button", { name: "비밀번호 변경" }).click();
  await expect(page.getByRole("status")).toHaveText("비밀번호를 변경했습니다.");
  await page.getByRole("button", { name: "로그아웃" }).click();

  await page.getByLabel("학번").fill(adminId);
  await page.getByLabel("비밀번호").fill(changedPassword);
  await page.getByRole("button", { name: "STILL 시작하기" }).click();
  await expect(page).toHaveURL(/\/home$/);

  // 다음 프로젝트도 같은 테스트 계정을 사용할 수 있도록 초기 비밀번호로 복구한다.
  await page.goto("/me/settings");
  await page.getByLabel("현재 비밀번호").fill(changedPassword);
  await page.getByLabel("새 비밀번호", { exact: true }).fill(adminPassword);
  await page.getByLabel("새 비밀번호 확인").fill(adminPassword);
  await page.getByRole("button", { name: "비밀번호 변경" }).click();
  await expect(page.getByRole("status")).toHaveText("비밀번호를 변경했습니다.");
});
