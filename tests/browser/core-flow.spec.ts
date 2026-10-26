import { expect, test } from "@playwright/test";

test("auth, material cards, rewards navigation and retired Campaign route work end to end", async ({
  page,
}) => {
  const pageErrors: Error[] = [];
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) =>
    failedRequests.push(`${request.url()} (${request.failure()?.errorText || "unknown"})`),
  );

  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`;
  const nickname = `browser_${suffix}`;
  const password = "BrowserPass1!";

  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
  try {
    await page.locator("#login-nick").waitFor({ state: "visible", timeout: 7_500 });
  } catch {
    throw new Error(
      `Application did not mount. pageErrors=${pageErrors.map((error) => error.message).join(" | ")} consoleErrors=${consoleErrors.join(" | ")} failedRequests=${failedRequests.join(" | ")}`,
    );
  }
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
  await expect(page.getByLabel(/Hồ sơ|Profile/i)).toBeVisible();

  const homeResources = await page.evaluate(() =>
    performance.getEntriesByType("resource").map((entry) => entry.name),
  );
  expect(homeResources.some((url) => /AIScanner|ort-wasm/i.test(url))).toBeFalsy();

  await page.goto("/cards");
  await expect(page).toHaveURL(/\/cards$/);
  await expect(page.getByText(/Bộ sưu tập/i).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /Hộ chiếu vật liệu/i })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Thử thách/i })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Đối kháng/i })).toBeVisible();
  await expect(page.getByText(/^Campaign$|^Chiến dịch$/i)).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("[object Object]");

  const cardResources = await page.evaluate(() =>
    performance.getEntriesByType("resource").map((entry) => entry.name),
  );
  expect(cardResources.some((url) => /CardBattle|RoguelikeRun/i.test(url))).toBeFalsy();

  await page.goto("/craft");
  await expect(page).toHaveURL(/\/rewards$/);
  await expect(page.getByRole("heading", { name: /^(Phần thưởng|Rewards)$/i })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("[object Object]");

  await page.goto("/world-map");
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByText(/^Campaign$|^Chiến dịch$/i)).toHaveCount(0);
  expect(pageErrors, pageErrors.map((error) => error.message).join("\n")).toEqual([]);
});

test("PWA control files and icons are served with production-safe responses", async ({
  request,
}) => {
  const [manifest, serviceWorker, cleanupWorker, icon, deepLink] = await Promise.all([
    request.get("/manifest.webmanifest"),
    request.get("/sw.js"),
    request.get("/sw-legacy-cleanup.js"),
    request.get("/icons/icon-192.png"),
    request.get("/cards"),
  ]);

  expect(manifest.ok()).toBeTruthy();
  expect(serviceWorker.ok()).toBeTruthy();
  expect(cleanupWorker.ok()).toBeTruthy();
  expect(icon.ok()).toBeTruthy();
  expect(icon.headers()["content-type"]).toMatch(/^image\/png/);
  expect(deepLink.ok()).toBeTruthy();
  expect(await deepLink.text()).toContain('<div id="root"></div>');
  expect(serviceWorker.headers()["cache-control"]).toContain("no-store");
  const [serviceWorkerSource, cleanupWorkerSource] = await Promise.all([
    serviceWorker.text(),
    cleanupWorker.text(),
  ]);
  expect(serviceWorkerSource).toContain("v6-industrial-lab");
  expect(cleanupWorkerSource).toContain("v6-industrial-lab");
  expect(cleanupWorkerSource).not.toContain('CACHE_VERSION = "v4"');
});

test("production worker installs and removes caches from an older deployment", async ({
  browser,
  baseURL,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "One real Chromium worker profile is sufficient.");
  test.setTimeout(60_000);
  expect(baseURL).toBeTruthy();

  const context = await browser.newContext({ serviceWorkers: "allow" });
  const page = await context.newPage();
  await page.goto(baseURL!);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    await caches.open("bmo-app-shell-v4");
    await caches.open("bmo-images-v5");
  });

  const cleanupNavigation = page.waitForNavigation({ waitUntil: "domcontentloaded" });
  await Promise.all([
    cleanupNavigation.catch(() => undefined),
    page
      .evaluate(async () => {
        const current = await navigator.serviceWorker.ready;
        await current.unregister();
        const next = await navigator.serviceWorker.register("/sw.js?cleanup-test=1", {
          scope: "/",
          updateViaCache: "none",
        });
        const worker = next.installing ?? next.waiting ?? next.active;
        if (worker && worker.state !== "activated") {
          await new Promise<void>((resolve, reject) => {
            const timeout = window.setTimeout(
              () => reject(new Error("Worker activation timed out")),
              20_000,
            );
            if (worker.state === "installed") worker.postMessage({ type: "SKIP_WAITING" });
            worker.addEventListener("statechange", () => {
              if (worker.state === "installed") worker.postMessage({ type: "SKIP_WAITING" });
              if (worker.state === "activated") {
                window.clearTimeout(timeout);
                resolve();
              }
            });
          });
        }
      })
      .catch(() => undefined),
  ]);
  await expect(page.locator("#root")).toBeAttached({ timeout: 10_000 });
  await expect
    .poll(
      async () => {
        try {
          return await page.evaluate(async () => caches.keys());
        } catch {
          return ["__worker_navigation_in_progress__"];
        }
      },
      { timeout: 15_000 },
    )
    .not.toEqual(expect.arrayContaining(["bmo-app-shell-v4", "bmo-images-v5"]));

  const workerState = await page.evaluate(async () => {
    const active = await navigator.serviceWorker.ready;
    const names = await caches.keys();
    return {
      scriptUrl: active.active?.scriptURL ?? "",
      cacheNames: names,
    };
  });
  expect(workerState.scriptUrl).toContain("/sw.js");
  expect(workerState.cacheNames.some((name) => name.includes("v6-industrial-lab"))).toBeTruthy();
  await context.close();
});
