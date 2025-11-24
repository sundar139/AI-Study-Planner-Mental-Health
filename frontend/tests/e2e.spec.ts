// End-to-End tests using Playwright
import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
    const email = "test@example.com";
    const fullName = "Test User";
    const password = "testpass";

    await page.goto("http://localhost:3000/register");
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Full Name', { exact: true }).fill(fullName);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm Password', { exact: true }).fill(password);
    await page.getByRole("button", { name: /create account/i }).click();
    // After register, page redirects to login; if already exists, navigate explicitly
    await page.goto("http://localhost:3000/login");
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL("/");
});

test.describe("AssignWell core pages", () => {
    test("Home page loads", async ({ page }) => {
        await page.goto("http://localhost:3000");
        await expect(page).toHaveURL("/");
        await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
    });

    test("Assignments page loads", async ({ page }) => {
        await page.goto("http://localhost:3000/assignments");
        await expect(page.getByRole("heading", { name: /assignments/i })).toBeVisible();
    });

    test("Peer Support page loads and can create group", async ({ page }) => {
        await page.goto("http://localhost:3000/peer-support");
        await expect(page.getByRole("heading", { name: /peer support hub/i })).toBeVisible();
        // Open create group dialog
        await page.getByRole("button", { name: /create group/i }).click();
        await page.getByLabel(/group name/i).fill("Test Group");
        await page.getByLabel(/description/i).fill("Testing group creation");
        await page.getByRole("button", { name: /create group/i }).click();
        // Verify new group appears
        await expect(page.getByText("Test Group")).toBeVisible();
    });

    test("AI Chat drawer works", async ({ page }) => {
        await page.goto("http://localhost:3000");
        // Open chat drawer
        await page.getByRole("button", { name: /message square/i }).click();
        await expect(page.getByText(/ai assistant/i)).toBeVisible();
        await page.getByPlaceholder("type a message...").fill("Hello");
        await page.getByRole("button", { name: /send/i }).click();
        // Wait for assistant response
        await expect(page.getByText(/assignwell assistant/i)).toBeVisible({ timeout: 5000 });
    });
});
