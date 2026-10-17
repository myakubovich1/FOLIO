import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { sampleCsv } from "../../server/imports.js";
import { mkdirSync, writeFileSync } from "node:fs";
const out = "output/screenshots";
mkdirSync(out, { recursive: true });
test("private owner upload, correction, explanation, disclosure, PDF and deletion", async ({
  browser,
}, info) => {
  const owner = await browser.newContext({
    baseURL: "http://127.0.0.1:3102",
    viewport: info.project.use.viewport,
    extraHTTPHeaders: {
      "x-test-identity": `browser-${info.project.name}-${Date.now()}`,
    },
  });
  const page = await owner.newPage();
  const failures: string[] = [];
  page.on("pageerror", (e) => failures.push(e.message));
  await owner.request.post("/api/owner/start", { data: {} });
  await page.goto("/");
  await page.screenshot({
    path: `${out}/${info.project.name}-owner-context.png`,
    fullPage: true,
  });
  await page.getByLabel("What should we call you?").fill("Alex");
  await page.getByRole("button", { name: "Save and add records →" }).click();
  await page.getByLabel("Choose a CSV or PDF statement").setInputFiles({
    name: "statement.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      sampleCsv().replaceAll("synthetic-newcomer", "owner-account"),
    ),
  });
  await page.getByRole("checkbox", { name: /permission to process/ }).check();
  await page.getByRole("button", { name: "Preview and validate file" }).click();
  await expect(
    page.getByText(
      "Opening balance plus posted source movements equals closing balance.",
    ),
  ).toBeVisible();
  await page.screenshot({
    path: `${out}/${info.project.name}-upload-preview.png`,
    fullPage: true,
  });
  await page.reload();
  await page.getByRole("button", { name: "Records", exact: true }).click();
  await page.getByRole("checkbox", { name: /I have reviewed/ }).check();
  await page.getByRole("button", { name: /Import \d+ records/ }).click();
  await page.getByRole("searchbox").fill("Returned deposit");
  await page
    .getByRole("combobox", { name: /Category for record:/ })
    .selectOption("transfer");
  await page.screenshot({
    path: `${out}/${info.project.name}-records.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "See assessment →" }).click();
  await expect(page.getByText("$50,400", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Explain my evidence" }).click();
  await expect(
    page.getByText(/Calculated explanation · no AI request/),
  ).toBeVisible();
  const proofButton = page
    .getByRole("button", { name: /Inspect \d+ supporting references/ })
    .first();
  await proofButton.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(proofButton).toBeFocused();
  await page.getByLabel(/Add to closing liquid balance/).fill("1000.25");
  await page.getByRole("button", { name: "Calculate scenario" }).click();
  await expect(page.locator(".scenario-result")).toContainText(
    "Conditional model result",
  );
  await page.route("**/api/passports/preview", (r) =>
    r.fulfill({
      status: 503,
      json: { error: "Recipient preview temporarily unavailable." },
    }),
  );
  await page.getByRole("button", { name: "Report", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Retry recipient preview" }),
  ).toBeVisible();
  await page.unroute("**/api/passports/preview");
  await page.getByRole("button", { name: "Retry recipient preview" }).click();
  await expect(
    page.getByRole("button", { name: "Generate passport snapshot" }),
  ).toBeEnabled();
  await page
    .getByRole("checkbox", { name: "Include cash-flow totals" })
    .uncheck();
  await page
    .getByRole("checkbox", { name: "Include factor contributions" })
    .uncheck();
  await page
    .getByRole("button", { name: "Generate passport snapshot" })
    .click();
  await page
    .getByRole("button", { name: "Create 7-day read-only link" })
    .click();
  const url = await page.getByLabel(/New passport link/).inputValue();
  const clean = await browser.newContext();
  const recipient = await clean.newPage();
  await recipient.goto(url);
  await expect(
    recipient.getByRole("heading", { name: "Folio Credit Index" }),
  ).toBeVisible();
  await expect(recipient.getByText("$50,400", { exact: true })).toHaveCount(0);
  const pdf = await clean.request.get(
    url.replace("/shared/", "/api/shared/") + "/pdf",
  );
  expect(pdf.status()).toBe(200);
  expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");
  const other = await browser.newContext({
    baseURL: "http://127.0.0.1:3102",
    extraHTTPHeaders: { "x-test-identity": "other-browser" },
  });
  const state = await (await owner.request.get("/api/state")).json();
  expect(
    (
      await other.request.get(`/api/passports/${state.passports[0].id}/pdf`)
    ).status(),
  ).toBe(404);
  expect(
    (
      await other.request.patch(
        `/api/records/${state.borrower.records[0].id}`,
        { data: { category: "income" } },
      )
    ).status(),
  ).toBe(404);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.screenshot({
    path: `${out}/${info.project.name}-settings.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Delete my Folio data" }).click();
  await page.getByLabel(/Type DELETE/).fill("DELETE");
  await page
    .getByRole("button", { name: "Permanently delete workspace data" })
    .click();
  await recipient.reload();
  await expect(recipient.locator(".error")).toContainText("expired, revoked");
  expect(
    (
      await clean.request.get(url.replace("/shared/", "/api/shared/") + "/pdf")
    ).status(),
  ).toBe(410);
  expect(failures).toEqual([]);
  await owner.close();
  await clean.close();
  await other.close();
});

test("responsive visual and accessibility pass", async ({ page }, info) => {
  test.setTimeout(60000);
  const violations: unknown[] = [];
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Credit beyond/ }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `${out}/landing-${width}.png`,
      fullPage: true,
    });
    if (width === 390) {
      const r = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      violations.push(...r.violations);
    }
  }
  await page.getByRole("button", { name: /Build your demo/ }).click();
  await page.screenshot({
    path: `${out}/${info.project.name}-sources.png`,
    fullPage: true,
  });
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Use saved records" }).click();
  await page.getByRole("button", { name: "See assessment →" }).click();
  await page.getByRole("button", { name: "Explain my evidence" }).click();
  const r = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  violations.push(...r.violations);
  await page.screenshot({ path: `${out}/assessment-320.png`, fullPage: true });
  // At 200% zoom, a 1440px desktop viewport has 720 CSS pixels of layout space.
  await page.setViewportSize({ width: 720, height: 500 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `${out}/assessment-200pct-equivalent.png`,
    fullPage: true,
  });
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole("button", { name: "Records", exact: true }).click();
    await page.screenshot({
      path: `${out}/records-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "See assessment →" }).click();
    await page.screenshot({
      path: `${out}/assessment-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByRole("button", { name: "Report", exact: true }).click();
  await page
    .getByRole("button", { name: "Generate passport snapshot" })
    .click();
  await page
    .getByRole("button", { name: "Create 7-day read-only link" })
    .click();
  const link = await page.getByLabel(/New passport link/).inputValue();
  await page.goto(link);
  await expect(
    page.getByRole("heading", { name: "Folio Credit Index" }),
  ).toBeVisible();
  const sharedAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  violations.push(...sharedAxe.violations);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({
      path: `${out}/shared-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  writeFileSync(
    `output/${info.project.name}-axe.json`,
    JSON.stringify(violations, null, 2),
  );
  expect(violations).toEqual([]);
});

test("Nessie and Gemini failures have visible recovery without invented provider success", async ({
  page,
}) => {
  await page.route("**/api/health", (r) =>
    r.fulfill({
      json: {
        ok: true,
        storage: "Test fixture",
        providers: { auth0: false, tiger: false, nessie: false, gemini: false },
        publicSandbox: true,
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Build your demo/ }).click();
  await page
    .getByRole("button", { name: "Nessie simulation", exact: true })
    .click();
  await page.getByRole("checkbox", { name: /permit reading/ }).check();
  await page.route("**/api/nessie/sync", (r) =>
    r.fulfill({
      status: 503,
      json: {
        error:
          "The Nessie service is unavailable. Retry or use saved synthetic records.",
      },
    }),
  );
  await page
    .getByRole("button", { name: "Synchronize Nessie records" })
    .click();
  await expect(page.locator(".error")).toContainText(
    "Nessie service is unavailable",
  );
  await page.getByRole("button", { name: "Saved demo", exact: true }).click();
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Use saved records" }).click();
  await page.getByRole("button", { name: "See assessment →" }).click();
  await page.getByRole("checkbox", { name: /Use Gemini for/ }).check();
  await page
    .getByRole("checkbox", { name: /Send only the current metrics/ })
    .check();
  await page.route("**/api/explanation", (r) =>
    r.fulfill({
      status: 503,
      json: { error: "Gemini is temporarily unavailable." },
    }),
  );
  await page.getByRole("button", { name: "Explain my evidence" }).click();
  await expect(page.locator(".error")).toContainText(
    "Gemini is temporarily unavailable",
  );
  await page.unroute("**/api/explanation");
  await page.getByRole("checkbox", { name: /Use Gemini for/ }).uncheck();
  await page.getByRole("button", { name: "Explain my evidence" }).click();
  await expect(
    page.getByText(/Calculated explanation · no AI request/),
  ).toBeVisible();
});
