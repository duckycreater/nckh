import { expect, test } from "@playwright/test";

test("auth, cards, rewards navigation and retired Campaign route work end to end", async ({
  page,
}) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));

  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`;
  const nickname = `browser_${suffix}`;
  const password = "BrowserPass1!";

  await page.goto("/");
  await expect(page.locator("#login-nick")).toBeVisible();
  await page.getByRole("button", { name: /Đăng ký ngay|Register now/i }).click();

  await page.locator("#reg-name").fill("Browser QA");
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
  await expect(page.getByRole("button", { name: /Mở hồ sơ cá nhân|Open profile/i })).toBeVisible();

  const homeResources = await page.evaluate(() =>
    performance.getEntriesByType("resource").map((entry) => entry.name),
  );
  expect(homeResources.some((url) => /AIScanner|ort-wasm/i.test(url))).toBeFalsy();

  await page.goto("/cards");
  await expect(page).toHaveURL(/\/cards$/);
  await expect(page.getByText(/Bộ sưu tập/i).first()).toBeVisible();
  await expect(page.getByText(/^Campaign$|^Chiến dịch$/i)).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("[object Object]");

  const cardResources = await page.evaluate(() =>
    performance.getEntriesByType("resource").map((entry) => entry.name),
  );
  expect(cardResources.some((url) => /CardBattle|RoguelikeRun/i.test(url))).toBeFalsy();

  await page.goto("/craft");
  await expect(page).toHaveURL(/\/craft$/);
  await expect(page.locator("body")).not.toContainText("[object Object]");

  await page.goto("/world-map");
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByText(/^Campaign$|^Chiến dịch$/i)).toHaveCount(0);
  expect(pageErrors, pageErrors.map((error) => error.message).join("\n")).toEqual([]);
});

test("PWA control files and icons are served with production-safe responses", async ({
  request,
}) => {
  const [manifest, serviceWorker, icon, deepLink] = await Promise.all([
    request.get("/manifest.webmanifest"),
    request.get("/sw.js"),
    request.get("/icons/icon-192.png"),
    request.get("/cards"),
  ]);

  expect(manifest.ok()).toBeTruthy();
  expect(serviceWorker.ok()).toBeTruthy();
  expect(icon.ok()).toBeTruthy();
  expect(icon.headers()["content-type"]).toMatch(/^image\/png/);
  expect(deepLink.ok()).toBeTruthy();
  expect(await deepLink.text()).toContain('<div id="root"></div>');
  expect(serviceWorker.headers()["cache-control"]).toContain("no-store");
});
