import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, openStudentSession } from "./helpers";

test("auth shell has no serious accessibility violation or horizontal overflow", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("#login-nick")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const serious = result.violations.filter(
    ({ impact }) => impact === "critical" || impact === "serious",
  );
  expect(serious, serious.map(({ id, help }) => `${id}: ${help}`).join("\n")).toEqual([]);
});

test("grade 8 profile standardization is clear and works on small screens", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Đăng ký ngay|Register now/i }).click();
  const fullName = page.getByLabel(/Họ và tên|Full name/i);
  const displayName = page.getByLabel(/Tên hiển thị|Display name/i);
  const schoolClass = page.getByLabel(/^Lớp$|Class \/ Grade/i);
  await fullName.fill("Nguyễn Văn A");
  await expect(displayName).toHaveValue("Nguyễn Văn A");
  await expect(schoolClass.getByRole("option", { name: /^8A1 ·/ })).toHaveCount(1);
  const gradeEightA10 = schoolClass.getByRole("option", { name: /^8A10 ·/ });
  await expect(gradeEightA10).toHaveCount(1);
  await schoolClass.selectOption((await gradeEightA10.getAttribute("value")) || "");
  await expect(page.getByText(/Hồ sơ sai.*không được cộng điểm/i)).toBeVisible();
  const skip = page.getByRole("checkbox", { name: /Bỏ qua lúc này|Skip for now/i });
  await skip.check();
  await expect(fullName).toBeDisabled();
  await expect(schoolClass).toBeDisabled();
  await expectNoHorizontalOverflow(page);
});

test("student routes remain responsive and use the new navigation model", async ({
  page,
}, testInfo) => {
  await openStudentSession(page);
  const routes = [
    "/home",
    "/scan",
    "/cards",
    "/rewards",
    "/leaderboard",
    "/activities",
    "/profile",
    "/settings",
    "/family",
  ];

  for (const route of routes) {
    await page.goto(route);
    await page.waitForLoadState("domcontentloaded");
    await expect(page.locator("body")).not.toContainText("[object Object]");
    await expect(page.locator("body")).not.toContainText(/SyntaxError|TypeError|node_modules/);
    await expectNoHorizontalOverflow(page);
  }

  if (testInfo.project.name === "mobile-chromium") {
    await expect(
      page.getByRole("navigation", { name: /Điều hướng di động|Mobile navigation/i }),
    ).toBeVisible();
  } else {
    await expect(
      page.getByRole("navigation", { name: /Điều hướng chính|Primary navigation/i }),
    ).toBeVisible();
  }
});

test("shell scales cleanly from compact phones to wide desktops", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "The breakpoint sweep runs once on Chromium.");
  await openStudentSession(page, "Browser Responsive");

  await page.setViewportSize({ width: 320, height: 568 });
  for (const route of ["/home", "/cards", "/rewards", "/settings", "/family"]) {
    await page.goto(route);
    await expectNoHorizontalOverflow(page);
  }
  const mobileNav = page.getByRole("navigation", { name: /Điều hướng di động|Mobile navigation/i });
  await expect(mobileNav).toBeVisible();
  const mobileGeometry = await page.evaluate(() => {
    const container = document.querySelector<HTMLElement>(".page-container");
    const nav = document.querySelector<HTMLElement>(
      'nav[aria-label*="di động"], nav[aria-label*="Mobile"]',
    );
    return {
      paddingBottom: container ? Number.parseFloat(getComputedStyle(container).paddingBottom) : 0,
      navHeight: nav?.getBoundingClientRect().height ?? 0,
    };
  });
  expect(mobileGeometry.paddingBottom).toBeGreaterThanOrEqual(mobileGeometry.navHeight);

  await page.setViewportSize({ width: 1199, height: 800 });
  await page.goto("/home");
  await expectNoHorizontalOverflow(page);
  await expect(
    page.getByRole("navigation", { name: /Điều hướng chính|Primary navigation/i }),
  ).toBeVisible();
  expect(
    await page
      .locator("aside")
      .first()
      .evaluate((element) => Math.round(element.getBoundingClientRect().width)),
  ).toBe(76);
  let shellGeometry = await page.evaluate(() => ({
    sidebarRight: document.querySelector("aside")?.getBoundingClientRect().right ?? 0,
    mainLeft: document.querySelector("main")?.getBoundingClientRect().left ?? 0,
  }));
  expect(shellGeometry.mainLeft).toBeGreaterThanOrEqual(shellGeometry.sidebarRight);

  await page.setViewportSize({ width: 1200, height: 800 });
  expect(
    await page
      .locator("aside")
      .first()
      .evaluate((element) => Math.round(element.getBoundingClientRect().width)),
  ).toBe(236);
  shellGeometry = await page.evaluate(() => ({
    sidebarRight: document.querySelector("aside")?.getBoundingClientRect().right ?? 0,
    mainLeft: document.querySelector("main")?.getBoundingClientRect().left ?? 0,
  }));
  expect(shellGeometry.mainLeft).toBeGreaterThanOrEqual(shellGeometry.sidebarRight);

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/home");
  await expectNoHorizontalOverflow(page);
  expect(
    await page
      .locator(".page-container")
      .evaluate((element) => element.getBoundingClientRect().width),
  ).toBeLessThanOrEqual(1440);
});

test("scan failures are presented as safe user-facing states", async ({ page }) => {
  await openStudentSession(page, "Browser Error");
  await page.route("**/api/scan-garbage", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "TypeError: Firestore failed at node_modules/secret.ts:10" }),
    });
  });
  await page.goto("/scan");
  await page.locator('input[type="file"]').setInputFiles({
    name: "bottle.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page.getByRole("button", { name: /Phân tích vật thể/i }).click();
  await expect(page.getByRole("alert")).toContainText("Không thể kết nối máy chủ");
  await expect(page.locator("body")).not.toContainText(/Firestore|node_modules|TypeError/);
});

test("scanner gives a clear next action for non-card verdicts", async ({ page }) => {
  await openStudentSession(page, "Browser Verdicts");
  let verdict: "not_waste" | "multiple_objects" | "uncertain" = "not_waste";
  await page.route("**/api/scan-garbage", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        scan: {
          scanId: `verdict-${verdict}`,
          verdict,
          objectName: "Chưa xác định",
          category: null,
          description: "Hệ thống chưa có đủ bằng chứng để cấp quyền tạo thẻ.",
          disposalInstructions: "Kiểm tra vật thể thật và chụp lại nếu cần.",
          observedConditions: [],
          properties: [],
          uncertaintyReason: "Cần một ảnh rõ hơn.",
          eligibleForCard: false,
          knowledgeBaseVersion: "vn-waste-basics-v1",
        },
        cardPreview: null,
        rewarded: false,
        rewardAmount: 0,
        points: 0,
      }),
    });
  });
  await page.goto("/scan");

  const expectations = [
    ["not_waste", "Không phát hiện một vật thể rác"],
    ["multiple_objects", "Ảnh có nhiều vật thể"],
    ["uncertain", "Chưa đủ bằng chứng để kết luận"],
  ] as const;
  for (const [nextVerdict, title] of expectations) {
    verdict = nextVerdict;
    await page.locator('input[type="file"]').setInputFiles({
      name: `${nextVerdict}.png`,
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64",
      ),
    });
    await page.getByRole("button", { name: /Phân tích vật thể/i }).click();
    await expect(page.getByText(title)).toBeVisible();
    await expect(page.getByRole("button", { name: "Chọn ảnh khác" })).toBeVisible();
  }
});

test("reward redemption validates and submits a delivery address", async ({ page }) => {
  let submitted: Record<string, unknown> | null = null;
  let idempotencyHeader: string | undefined;
  await page.route("**/api/rewards", async (route) => {
    await route.fulfill({
      json: [
        {
          id: 901,
          name: "Sổ tay tái chế",
          desc: "Sổ ghi chép học tập.",
          cost: 500,
          imageUrl: "",
          ingredients: ["Giao tận nhà"],
        },
      ],
    });
  });
  await page.route("**/api/redemptions", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    submitted = route.request().postDataJSON() as Record<string, unknown>;
    idempotencyHeader = route.request().headers()["idempotency-key"];
    await route.fulfill({
      json: {
        success: true,
        created: true,
        points: 1_500,
        redemption: {
          id: "browser-redemption-901",
          rewardId: 901,
          status: "pending",
        },
      },
    });
  });
  await page.route("**/api/reward-history/**", async (route) => route.fulfill({ json: [] }));
  await page.route("**/api/reward-summary/**", async (route) =>
    route.fulfill({ json: { totalEarned: 0, totalSpent: 500, netChange: -500, txCount: 1 } }),
  );
  await openStudentSession(page, "Browser Rewards", 2_000);
  await page.goto("/rewards");
  await page.getByRole("button", { name: "Đổi ngay" }).click();
  await page.getByLabel("Họ và tên").fill("Nguyễn Minh QA");
  await page.getByLabel("Địa chỉ nhận quà").fill("12 Nguyễn Trãi, Phường 1, Thành phố Hồ Chí Minh");
  await page.getByRole("button", { name: "Xác nhận địa chỉ và đổi quà" }).click();
  await expect(page.getByRole("heading", { name: "Đổi quà thành công" })).toBeVisible();
  expect(submitted).toMatchObject({
    rewardId: 901,
    recipient: {
      fullName: "Nguyễn Minh QA",
      address: "12 Nguyễn Trãi, Phường 1, Thành phố Hồ Chí Minh",
    },
    idempotencyKey: expect.any(String),
  });
  expect(idempotencyHeader).toEqual(expect.any(String));
});

test("collection filters and opens a material passport without overflow", async ({ page }) => {
  const baseCard = {
    ownerId: "visual-student",
    imageUrl: null,
    rulesetVersion: "material-cards-v1",
    createdAt: 1_700_000_000_000,
    passive: {
      name: "Tách dòng",
      description: "Giữ đúng tuyến.",
      rule: "Dùng khi vật thể sạch.",
      basedOn: ["recyclable"],
    },
    active: {
      name: "Ép gọn",
      description: "Giảm tài nguyên vận chuyển.",
      rule: "Không dùng khi bẩn.",
      basedOn: ["compactable"],
    },
  };
  await page.route("**/api/material-cards?**", async (route) => {
    const category = new URL(route.request().url()).searchParams.get("category");
    const cards = [
      {
        ...baseCard,
        id: "card-plastic",
        scanId: "scan-plastic",
        objectName: "Chai nhựa PET",
        category: "plastic",
        properties: [
          {
            id: "recyclable",
            label: "Có tuyến tái chế phù hợp",
            value: true,
            source: "material_library",
            evidence: "Đối chiếu thư viện vật liệu.",
          },
        ],
      },
      {
        ...baseCard,
        id: "card-paper",
        scanId: "scan-paper",
        objectName: "Hộp giấy",
        category: "paper",
        properties: [
          {
            id: "moisture_sensitive",
            label: "Nhạy với độ ẩm",
            value: true,
            source: "material_library",
            evidence: "Giấy giảm chất lượng khi bị ướt.",
          },
        ],
      },
    ];
    await route.fulfill({
      json: {
        cards: category ? cards.filter((card) => card.category === category) : cards,
        nextCursor: null,
      },
    });
  });
  await openStudentSession(page, "Browser Collection", 100);
  await page.goto("/cards");
  await expect(page.getByText("Chai nhựa PET")).toBeVisible();
  const mobileMaterialFilter = page.getByRole("combobox", { name: "Lọc theo vật liệu" });
  if (await mobileMaterialFilter.isVisible()) {
    await mobileMaterialFilter.selectOption("paper");
  } else {
    await page.getByRole("button", { name: "Giấy" }).click();
  }
  await expect(page.getByText("Hộp giấy")).toBeVisible();
  await expect(page.getByText("Chai nhựa PET")).toHaveCount(0);
  await page.getByRole("button", { name: "Xem hộ chiếu" }).click();
  await expect(page.getByRole("dialog", { name: "Hộ chiếu Hộp giấy" })).toBeVisible();
  await page.getByText("Thông tin chi tiết").click();
  await expect(page.getByText("material-cards-v1")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("collection load failure does not also show the empty state", async ({ page }) => {
  await page.route("**/api/material-cards?**", async (route) =>
    route.fulfill({ status: 503, json: { error: "database_unavailable" } }),
  );
  await openStudentSession(page, "Browser Collection Error");
  await page.goto("/cards");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByText("Bộ sưu tập đang trống")).toHaveCount(0);
});

test("passport dialog traps focus, closes with Escape and restores focus", async ({ page }) => {
  const card = {
    id: "focus-card",
    ownerId: "focus",
    scanId: "focus-scan",
    objectName: "Lon nhôm",
    category: "metal",
    imageUrl: null,
    rulesetVersion: "material-cards-v1",
    createdAt: 1_700_000_000_000,
    properties: [
      {
        id: "recoverable_material",
        label: "Có thể thu hồi vật liệu",
        value: true,
        source: "material_library",
        evidence: "Kim loại phù hợp với tuyến thu hồi.",
      },
    ],
    passive: {
      name: "Thu hồi",
      description: "Giữ đúng tuyến.",
      rule: "Áp dụng cho vật liệu phù hợp.",
      basedOn: ["recoverable_material"],
    },
    active: {
      name: "Ép gọn",
      description: "Giảm thể tích.",
      rule: "Dùng khi vật thể sạch.",
      basedOn: ["compactable"],
    },
  };
  await page.route("**/api/material-cards?**", async (route) =>
    route.fulfill({ json: { cards: [card], nextCursor: null } }),
  );
  await openStudentSession(page, "Browser Focus");
  await page.goto("/cards");
  const opener = page.getByRole("button", { name: "Xem hộ chiếu" });
  await opener.focus();
  await opener.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test("card tabs support arrow keys", async ({ page }) => {
  await page.route("**/api/material-cards?**", async (route) =>
    route.fulfill({ json: { cards: [], nextCursor: null } }),
  );
  await openStudentSession(page, "Browser Keyboard");
  await page.goto("/cards");
  const collectionTab = page.getByRole("tab", { name: "Bộ sưu tập" });
  await collectionTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Thử thách" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("student shell remains usable at an effective 200 percent zoom", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium",
    "The zoom layout check runs once on desktop Chromium.",
  );
  await page.setViewportSize({ width: 720, height: 450 });
  await openStudentSession(page, "Browser Zoom");
  await page.goto("/home");
  await expect(
    page.getByRole("navigation", { name: /Điều hướng di động|Mobile navigation/i }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expect(page.getByRole("button", { name: "Quét rác" })).toBeVisible();
});

test("industrial visual baselines", async ({ page, browserName }) => {
  test.skip(
    Boolean(process.env.CI),
    "Repository baselines are Win32-specific; CI keeps the functional Chromium suite as its gate.",
  );
  test.skip(
    browserName !== "chromium",
    "Visual baselines are kept on the Chromium rendering engine.",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.goto("/");
  await expect(page.locator("#login-nick")).toBeVisible();
  await expect(page).toHaveScreenshot("industrial-auth.png", {
    fullPage: true,
    animations: "disabled",
  });

  await page.route("**/api/material-cards?**", async (route) =>
    route.fulfill({
      json: {
        cards: [
          {
            id: "visual-card",
            ownerId: "visual",
            scanId: "visual-scan",
            objectName: "Chai nhựa PET",
            category: "plastic",
            imageUrl: null,
            rulesetVersion: "material-cards-v1",
            createdAt: 1_700_000_000_000,
            properties: [
              {
                id: "recyclable",
                label: "Có tuyến tái chế phù hợp",
                value: true,
                source: "material_library",
                evidence: "Có tuyến tiếp nhận phù hợp.",
              },
            ],
            passive: {
              name: "Tách dòng",
              description: "Giữ đúng tuyến.",
              rule: "Dùng khi vật thể sạch.",
              basedOn: ["recyclable"],
            },
            active: {
              name: "Ép gọn",
              description: "Giảm thể tích.",
              rule: "Dùng khi sạch.",
              basedOn: ["compactable"],
            },
          },
        ],
        nextCursor: null,
      },
    }),
  );
  await page.route("**/api/rewards", async (route) =>
    route.fulfill({
      json: [
        {
          id: 901,
          name: "Sổ tay tái chế",
          desc: "Sổ ghi chép cho các buổi thực hành vật liệu.",
          cost: 500,
          imageUrl: "",
          ingredients: ["Giao tận nhà"],
        },
        {
          id: 902,
          name: "Bộ dụng cụ phân loại",
          desc: "Nhãn và dụng cụ phục vụ hoạt động phân loại tại lớp.",
          cost: 850,
          imageUrl: "",
          ingredients: ["Số lượng giới hạn"],
        },
      ],
    }),
  );
  await openStudentSession(page);
  await expect(page.getByRole("heading", { name: /Chào|Hello/i })).toBeVisible();
  await expect(page).toHaveScreenshot("industrial-home.png", {
    fullPage: true,
    animations: "disabled",
  });

  await page.route("**/api/scan-garbage", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        scan: {
          scanId: "visual-scan-01",
          verdict: "single_waste",
          objectName: "Chai nước PET",
          category: "plastic",
          description: "Một chai nhựa trong, đã sử dụng và không thấy nắp.",
          disposalInstructions: "Làm sạch, để khô và đưa tới điểm tiếp nhận nhựa phù hợp.",
          observedConditions: ["transparent", "material_code_visible"],
          properties: [
            {
              id: "transparent",
              label: "Có phần trong suốt",
              value: true,
              source: "visual_observation",
              evidence: "Thân chai trong suốt quan sát được từ ảnh.",
            },
            {
              id: "recyclable",
              label: "Có tuyến tái chế phù hợp",
              value: true,
              source: "material_library",
              evidence: "Đối chiếu thư viện vật liệu; phụ thuộc tuyến thu gom địa phương.",
            },
          ],
          uncertaintyReason: null,
          eligibleForCard: true,
          knowledgeBaseVersion: "vn-waste-basics-v1",
        },
        cardPreview: {
          scanId: "visual-scan-01",
          objectName: "Chai nước PET",
          category: "plastic",
          imageUrl: null,
          cost: 50,
          passive: {
            name: "Đọc ký hiệu",
            description: "Ưu tiên quyết định dựa trên ký hiệu vật liệu.",
            rule: "Dựa trên ký hiệu nhìn thấy và tuyến tiếp nhận.",
            basedOn: ["material_code_visible", "recyclable"],
          },
          active: {
            name: "Ép gọn",
            description: "Giảm một đơn vị tài nguyên vận chuyển.",
            rule: "Chỉ dùng khi vật thể sạch và không chứa chất nguy hiểm.",
            basedOn: ["compactable"],
          },
          propertyIds: ["transparent", "recyclable", "material_code_visible"],
          rulesetVersion: "material-cards-v1",
        },
        rewarded: true,
        rewardAmount: 50,
        points: 50,
      }),
    });
  });
  await page.goto("/scan");
  await page.locator('input[type="file"]').setInputFiles({
    name: "bottle.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page.getByRole("button", { name: /Phân tích vật thể/i }).click();
  await expect(page.getByText("Chai nước PET").first()).toBeVisible();
  await expect(page).toHaveScreenshot("industrial-passport.png", { animations: "disabled" });

  await page.goto("/cards");
  await expect(page.getByRole("heading", { name: "Hộ chiếu vật liệu" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Chai nhựa PET" })).toBeVisible();
  await expect(page).toHaveScreenshot("industrial-cards.png", {
    fullPage: true,
    animations: "disabled",
  });

  await page.goto("/rewards");
  await expect(page.getByRole("heading", { name: /^(Phần thưởng|Rewards)$/i })).toBeVisible();
  await expect(page).toHaveScreenshot("industrial-rewards.png", {
    fullPage: true,
    animations: "disabled",
    mask: [page.locator("img")],
    maskColor: "#eff1eb",
  });

  await page.evaluate(() => localStorage.clear());
  await page.goto("/impact");
  await expect(page.getByRole("heading", { name: "Báo cáo hoạt động vật liệu BMO" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("[object Object]");
  await expect(page).toHaveScreenshot("industrial-impact.png", {
    fullPage: true,
    animations: "disabled",
  });

  const adminUser = {
    account_id: "admin-visual",
    nick: "admin-visual",
    name: "Admin Material Lab",
    role: "admin",
    points: 0,
    totalExpEarned: 0,
    hasPlayed: false,
    progress: {},
  };
  await page.route("**/api/user/admin-visual", async (route) => route.fulfill({ json: adminUser }));
  await page.route("**/api/admin/stats", async (route) =>
    route.fulfill({
      json: { total: 124, admins: 2, activeUsers: 37, researchActive7d: 18, experimentCount: 3 },
    }),
  );
  await page.route("**/api/admin/users", async (route) => route.fulfill({ json: [] }));
  await page.route("**/api/experiments", async (route) => route.fulfill({ json: [] }));
  await page.evaluate((value) => {
    localStorage.setItem("auth_token", "visual-admin-session");
    localStorage.setItem("user_session", JSON.stringify(value));
  }, adminUser);
  await page.goto("/overview");
  await expect(
    page.getByRole("heading", { name: /Dashboard quản trị|Admin dashboard/i }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("industrial-admin.png", {
    fullPage: true,
    animations: "disabled",
  });
});
