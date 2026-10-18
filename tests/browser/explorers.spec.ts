import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function connect(page: Page, profile = "newcomer") {
  await page.goto("/");
  await page.getByLabel("Explore a synthetic borrower").selectOption(profile);
  await page.getByRole("button", { name: /Build your demo/ }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Use saved records" }).click();
  await page.getByRole("button", { name: "See assessment →" }).click();
}

test.afterEach(async ({ page }) => {
  await page.request.delete("/api/data", { data: { confirm: "DELETE" } });
});

test("journey explorer supports keyboard, touch, compact screens and reduced motion", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const journey = page.getByRole("region", {
    name: "Your path from records to possibility.",
  });
  const tabs = journey.getByRole("tab");
  await expect(tabs).toHaveCount(4);
  await tabs.first().focus();
  await page.keyboard.press("End");
  await expect(tabs.last()).toBeFocused();
  await expect(tabs.last()).toHaveAttribute("aria-selected", "true");
  await expect(journey.getByRole("tabpanel")).toContainText(
    "Copies already downloaded cannot be recalled",
  );
  await page.keyboard.press("ArrowRight");
  await expect(tabs.first()).toBeFocused();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(journey.getByRole("tabpanel")).toContainText(
    "original record stays intact",
  );
  expect(
    await journey
      .locator(".flow-panel-copy")
      .evaluate((el) => getComputedStyle(el).animationDuration),
  ).toBe("0s");
  if (info.project.name === "mobile") await tabs.nth(2).tap();
  else await tabs.nth(2).click();
  await expect(journey.getByRole("tabpanel")).toContainText(
    "instead of assigning a zero",
  );
  const results = await new AxeBuilder({ page })
    .include("#how-it-works")
    .analyze();
  expect(results.violations).toEqual([]);
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const boxes = await tabs.evaluateAll((nodes) =>
      nodes.map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width };
      }),
    );
    expect(boxes[2].y).toBeGreaterThan(boxes[1].y);
    expect(boxes[2].x).toBeLessThan(boxes[3].x);
  }
});

test("evidence and sharing explorers reconcile with revision, disclosure and PDF export", async ({
  page,
}, info) => {
  await connect(page);
  await page.getByRole("button", { name: "Records", exact: true }).click();
  await page.getByRole("searchbox").fill("Returned deposit");
  await page
    .getByRole("combobox", {
      name: "Category for newcomer-correction",
      exact: true,
    })
    .selectOption("transfer");
  await page.getByText(/Saved your correction/).waitFor();
  await page.getByRole("button", { name: "See assessment →" }).click();
  const state = await (await page.request.get("/api/state")).json();
  const flow = page.getByRole("region", {
    name: "Trace your result, step by step.",
  });
  await expect(flow.getByRole("tab", { name: /Source records/ })).toContainText(
    `${state.borrower.records.length} in this workspace`,
  );
  await flow.getByRole("tab", { name: /Interpretation/ }).click();
  await expect(flow.getByRole("tabpanel")).toContainText(
    `${state.corrections.length} saved corrections`,
  );
  await flow.getByRole("tab", { name: /Assessment/ }).click();
  await expect(flow.locator(".decision-current")).toContainText(
    `Experimental index: ${state.assessment.score} / 100`,
  );
  await expect(
    new AxeBuilder({ page })
      .include(".evidence-flow-card")
      .analyze()
      .then((r) => r.violations),
  ).resolves.toEqual([]);
  await flow.getByRole("tab", { name: /Passport/ }).click();
  await flow.getByRole("button", { name: "Explore passport options" }).click();
  await page.getByText("Explore the sharing flow", { exact: true }).click();
  const sharing = page.getByRole("region", { name: "See how sharing works." });
  await page
    .getByRole("checkbox", { name: "Include factor contributions" })
    .uncheck();
  await page
    .getByRole("checkbox", { name: "Include cash-flow totals" })
    .uncheck();
  await sharing.getByRole("tab", { name: /Recipient view/ }).click();
  await expect(
    sharing.getByRole("tab", { name: /Recipient view/ }),
  ).toContainText("Preview ready");
  await expect(
    sharing.getByRole("tabpanel").getByText("Excluded", { exact: true }),
  ).toHaveCount(2);
  await sharing
    .getByRole("button", { name: "Inspect recipient preview" })
    .click();
  await expect(page.locator(".recipient-preview > summary")).toBeFocused();
  await expect(page.locator(".recipient-preview")).toHaveAttribute("open", "");
  await expect(page.locator(".recipient-preview .report-factor")).toHaveCount(
    0,
  );
  await page
    .getByRole("button", { name: "Generate passport snapshot" })
    .click();
  await expect(sharing.getByRole("tab", { name: /Snapshot/ })).toContainText(
    "1 issued",
  );
  await expect(page.locator(".recipient-preview")).toHaveAttribute("open", "");
  await expect(
    page.getByRole("button", { name: /Create .*read-only link/ }),
  ).toHaveCount(0);
  await expect(page.getByLabel("New link lifetime")).toHaveCount(0);
  await expect(page.getByLabel("New passport link")).toHaveCount(0);
  await sharing.getByRole("tab", { name: /PDF export/ }).click();
  await expect(sharing.getByRole("tabpanel")).toContainText(
    "Downloaded copies cannot be recalled",
  );
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download passport PDF ↓" }).click();
  const download = await downloadEvent;
  expect(await download.failure()).toBeNull();
  if (info.project.name === "mobile") {
    await page.setViewportSize({ width: 320, height: 844 });
    await sharing.getByRole("tab", { name: /Recipient view/ }).tap();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("unscored evidence and failed recipient previews offer truthful recovery", async ({
  page,
}) => {
  await connect(page, "limited");
  const state = await (await page.request.get("/api/state")).json();
  const flow = page.getByRole("region", {
    name: "Trace your result, step by step.",
  });
  await flow.getByRole("tab", { name: /Assessment/ }).click();
  await expect(flow.locator(".decision-current")).toContainText(
    "No index assigned",
  );
  await expect(flow.getByRole("tabpanel").locator("li")).toHaveText(
    state.assessment.missing,
  );
  await page.route("**/api/passports/preview", (route) =>
    route.fulfill({
      status: 503,
      json: { error: "Preview temporarily unavailable." },
    }),
  );
  await flow.getByRole("tab", { name: /Passport/ }).click();
  await flow.getByRole("button", { name: "Explore passport options" }).click();
  await page.getByText("Explore the sharing flow", { exact: true }).click();
  const sharing = page.getByRole("region", { name: "See how sharing works." });
  await sharing.getByRole("tab", { name: /Recipient view/ }).click();
  await expect(
    sharing.getByRole("tab", { name: /Recipient view/ }),
  ).toContainText("Preview unavailable");
  await expect(
    sharing.getByRole("button", { name: "Inspect recipient preview" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Generate passport snapshot" }),
  ).toBeDisabled();
  await page.unroute("**/api/passports/preview");
  await page.getByRole("button", { name: "Retry recipient preview" }).click();
  await expect(
    sharing.getByRole("tab", { name: /Recipient view/ }),
  ).toContainText("Preview ready");
  await expect(sharing.getByRole("tabpanel")).toContainText("Not available");
  await expect(sharing.getByRole("tabpanel")).toContainText(
    "An unscored assessment has no factor breakdown",
  );
  await expect(
    page.getByRole("button", { name: "Generate passport snapshot" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.getByRole("button", { name: "Review missing evidence" }).click();
  await expect(page.getByRole("searchbox")).toBeVisible();
});
