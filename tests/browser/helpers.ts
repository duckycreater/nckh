import { expect, type Page } from "@playwright/test";

export async function registerStudent(page: Page, label = "Browser Visual") {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`;
  const nickname = `visual_${suffix}`;
  const password = "BrowserPass1!";

  await page.goto("/");
  await page.getByRole("button", { name: /Đăng ký ngay|Register now/i }).click();
  await page.locator("#reg-name").fill(label);
  await page.locator("#reg-full-name").fill("Nguyễn Minh QA");
  await page.locator("#reg-class").selectOption("10");
  await page.locator("#reg-nick").fill(nickname);
  await page.locator("#reg-email").fill(`${nickname}@example.test`);
  await page.locator("#reg-pass").fill(password);
  await page.locator('form:has(#reg-nick) button[type="submit"]').click();

  await expect(page.locator("#login-nick")).toBeVisible();
  await page.locator("#login-nick").fill(nickname);
  await page.locator("#login-pass").fill(password);
  await page.locator('form:has(#login-nick) button[type="submit"]').click();
  await expect(page).toHaveURL(/\/home$/);
  return { nickname, password };
}

export async function openStudentSession(page: Page, label = "Browser Visual", points = 0) {
  const user = {
    account_id: "visual-student",
    nick: "visual-student",
    name: label,
    role: "user",
    points,
    totalExpEarned: points,
    hasPlayed: false,
    progress: {},
    fullName: "Nguyễn Minh QA",
    classGrade: "10",
  };
  await page.route("**/api/user/visual-student", async (route) => route.fulfill({ json: user }));
  await page.goto("/");
  await page.evaluate((value) => {
    localStorage.setItem("auth_token", "visual-student-session");
    localStorage.setItem("user_session", JSON.stringify(value));
  }, user);
  await page.goto("/home");
  await expect(page).toHaveURL(/\/home$/);
  return user;
}

export async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}
