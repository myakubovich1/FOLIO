import { test, expect } from "@playwright/test";
test("borrower, connect, correction, assessment, passport, recipient and revoke", async ({
  page,
  context,
}, info) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Credit beyond/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Build your demo/ }).click();
  await expect(
    page.getByRole("button", { name: "Use saved records" }),
  ).toBeDisabled();
  await page.getByRole("checkbox").focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("checkbox")).toBeChecked();
  await page.getByRole("button", { name: "Use saved records" }).click();
  await page.getByRole("searchbox").fill("Returned deposit");
  await page
    .getByRole("combobox", { name: "Category for newcomer-correction" })
    .selectOption("transfer");
  await page.getByRole("button", { name: "See assessment →" }).click();
  await expect(page.locator(".score")).toContainText("70");
  await expect(page.getByText("$50,400", { exact: true })).toBeVisible();
  await page.screenshot({
    path: `test-results/${info.project.name}-assessment.png`,
    fullPage: true,
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Understand your score →", exact: true })
    .click();
  await expect(page.getByText("$50,400", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Report", exact: true }).click();
  await page
    .getByRole("button", { name: "Generate passport snapshot" })
    .click();
  await page
    .getByRole("button", { name: "Create 7-day read-only link" })
    .click();
  const link = await page.getByLabel("New passport link").inputValue();
  await page
    .getByRole("button", { name: "Create 7-day read-only link" })
    .click();
  await expect(page.getByLabel("New passport link")).toHaveCount(2);
  await expect(page.getByLabel("New passport link").last()).toHaveValue(link);
  const recipient = await context.newPage();
  const sharedHtml = await recipient.goto(link);
  expect(sharedHtml!.headers()["cache-control"]).toBe("no-store");
  expect(sharedHtml!.headers()["x-robots-tag"]).toBe("noindex");
  expect(sharedHtml!.headers()["referrer-policy"]).toBe("no-referrer");
  await expect(
    recipient.getByRole("heading", { name: "Folio Credit Index" }),
  ).toBeVisible();
  await expect(recipient.getByText("$50,400", { exact: true })).toBeVisible();
  await recipient.screenshot({
    path: `test-results/${info.project.name}-passport.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("button", { name: "Revoke link", exact: true })
    .last()
    .click();
  await recipient.reload();
  await expect(recipient.locator('.error[role="alert"]')).toContainText(
    "expired, revoked",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("limited evidence abstains and network failures recover", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.getByLabel("Explore a synthetic borrower").selectOption("limited");
  await page.getByRole("button", { name: /Build your demo/ }).click();
  await page.getByRole("checkbox").check();
  await page.route("**/api/connect", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Provider unavailable. Retry saved records.",
      }),
    }),
  );
  await page.getByRole("button", { name: "Use saved records" }).click();
  await expect(page.locator('.error[role="alert"]')).toContainText(
    "Retry saved records",
  );
  await page.unroute("**/api/connect");
  await page.getByRole("button", { name: "Use saved records" }).click();
  await page.getByRole("button", { name: "See assessment →" }).click();
  await expect(
    page.getByRole("heading", { name: "More evidence needed" }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/${info.project.name}-abstention.png`,
    fullPage: true,
  });
});

test("profile switches keep currency and assessment attached to the selected borrower", async ({
  page,
}) => {
  for (const [profile, score, currency] of [
    ["newcomer", "71", "USD"],
    ["freelancer", "88", "USD"],
    ["farmer", "85", "KES"],
    ["merchant", "56", "KES"],
  ] as const) {
    await page.goto("/");
    await expect(
      page
        .getByRole("button", { name: /Build your demo/ })
        .or(page.getByRole("button", { name: "Choose another profile" })),
    ).toBeVisible();
    if (
      await page
        .getByRole("button", { name: "Choose another profile" })
        .isVisible()
    )
      await page
        .getByRole("button", { name: "Choose another profile" })
        .click();
    await page.getByLabel("Explore a synthetic borrower").selectOption(profile);
    await page.getByRole("button", { name: /Build your demo/ }).click();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Use saved records" }).click();
    await page.getByRole("button", { name: "See assessment →" }).click();
    await expect(page.locator(".score")).toContainText(score);
    await expect(page.getByText(`${currency} · revision 1`)).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("loading, empty search, contradictory correction and profile-choice refresh recover", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Build your demo/ }).click();
  await page.getByRole("checkbox").check();
  await page.route("**/api/connect", async (route) => {
    await new Promise((r) => setTimeout(r, 500));
    await route.continue();
  });
  await page.getByRole("button", { name: "Use saved records" }).click();
  await expect(page.locator(".processing")).toContainText("Processing");
  await page.getByRole("searchbox").fill("no matching synthetic record");
  await expect(
    page.getByRole("heading", { name: "No matching records." }),
  ).toBeVisible();
  await page.getByRole("searchbox").fill("Returned deposit");
  await page
    .getByRole("combobox", { name: "Category for newcomer-correction" })
    .selectOption("expense");
  await page.getByRole("button", { name: "See assessment →" }).click();
  await expect(
    page.getByRole("heading", { name: "More evidence needed" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Resolve classifications that conflict with payment direction",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Choose another profile" }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /Credit beyond/ }),
  ).toBeVisible();
});
