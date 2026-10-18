import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("Belarus selection, private BYN context and synthetic samples stay consistent", async ({
  page,
  browser,
}, info) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Belarus · BYN", exact: true })
    .click();
  await expect(page.getByLabel("Explore a synthetic borrower")).toHaveValue(
    "farmer",
  );
  await expect(page.locator(".hero-card .score")).toContainText("85");
  await page
    .getByRole("button", { name: "Belarus · BYN", exact: true })
    .hover();
  const accessibility = await new AxeBuilder({ page })
    .include(".hero-card")
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await expect(
    page.getByLabel("Explore a synthetic borrower").locator("option"),
  ).toHaveText([
    "Alex · US newcomer",
    "Jordan · US freelancer",
    "Ales · Belarus seasonal farmer",
    "Sviatlana · Belarus small merchant",
    "Taylor · Limited evidence",
  ]);
  const owner = await browser.newContext({
    baseURL: "http://127.0.0.1:3102",
    viewport: info.project.use.viewport,
    extraHTTPHeaders: {
      "x-test-identity": `belarus-${info.project.name}-${Date.now()}`,
    },
  });
  try {
    await owner.request.post("/api/owner/start", { data: {} });
    const account = await owner.newPage();
    await account.goto("/");
    await account
      .getByLabel("Demonstration market and currency")
      .selectOption("BYN");
    await account.getByLabel("What should we call you?").fill("Ales");
    await account
      .getByRole("button", { name: "Save and add records →" })
      .click();
    const state = await (await owner.request.get("/api/state")).json();
    expect(state.borrower.currency).toBe("BYN");
    expect(state.borrower.context).toContain("Belarus");
    const refused = await owner.request.post("/api/nessie/sync", {
      data: { consent: true },
    });
    expect(refused.status()).toBe(400);
    expect((await refused.json()).error).toContain("Belarusian bank data");
    const sample = await owner.request.get("/api/sample.csv?profile=farmer");
    expect(await sample.text()).toContain('"BYN"');
    expect(
      await account.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await owner.request.delete("/api/data", { data: { confirm: "DELETE" } });
    await owner.close();
  }
});
