import { expect, type Page } from "@playwright/test";

/** Seed historical-link coverage via API; the product no longer offers link creation. */
export async function legacyShare(page: Page) {
  await expect(page.locator(".issued-passport").first()).toBeVisible();
  const state = await (await page.request.get("/api/state")).json();
  const response = await page.request.post("/api/shares", {
    data: { passportId: state.passports[0].id, days: 7 },
  });
  expect(response.status()).toBe(200);
  const share = await response.json();
  return { ...share, url: new URL(`/shared/${share.token}`, page.url()).href };
}
