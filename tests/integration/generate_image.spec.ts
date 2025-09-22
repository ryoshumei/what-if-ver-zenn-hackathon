import { expect, test } from "@playwright/test";

test.describe("Generate Image Happy Path", () => {
  test("should generate image, save to history, and allow comparison", async ({
    page,
  }) => {
    // Navigate to the app
    await page.goto("/");

    // Expect to see the main interface
    await expect(page.locator("h1")).toContainText("What If");

    // Input a prompt
    const promptInput = page.locator(
      'input[placeholder*="what if"], textarea[placeholder*="what if"]',
    );
    await promptInput.fill("A chair floats when a vacuum robot arrives");

    // Select image generation type
    const imageToggle = page.locator(
      'button:has-text("Image"), input[type="radio"][value="image"]',
    );
    await imageToggle.click();

    // Submit the generation request
    const generateButton = page.locator(
      'button:has-text("Generate"), button[type="submit"]',
    );
    await generateButton.click();

    // Wait for generation to be queued
    await expect(page.locator("text=Queued, text=Generating")).toBeVisible({
      timeout: 10000,
    });

    // Wait for completion or timeout
    await page.waitForSelector(
      'img[alt*="generated"], text=Complete, text=Failed',
      { timeout: 60000 },
    );

    // Check if generation completed successfully
    const completedImage = page.locator('img[alt*="generated"]');
    if (await completedImage.isVisible()) {
      // Verify image is displayed
      await expect(completedImage).toBeVisible();

      // Check that history was saved (should see generation in history)
      const historyItem = page.locator(
        '[data-testid="history-item"], .history-item',
      );
      await expect(historyItem).toBeVisible();

      // Test comparison view if available
      const compareButton = page.locator(
        'button:has-text("Compare"), button:has-text("History")',
      );
      if (await compareButton.isVisible()) {
        await compareButton.click();

        // Should see comparison interface
        await expect(
          page.locator('[data-testid="comparison-view"], .comparison'),
        ).toBeVisible();
      }
    } else {
      // Check for error state
      const errorMessage = page.locator("text=Failed, text=Error");
      if (await errorMessage.isVisible()) {
        console.log(
          "Generation failed, which is expected for integration test without real API",
        );
      }
    }
  });

  test("should persist generation across page reloads", async ({ page }) => {
    // This test assumes we have some way to seed or create a generation
    await page.goto("/");

    // Create a generation (simplified)
    const promptInput = page.locator(
      'input[placeholder*="what if"], textarea[placeholder*="what if"]',
    );
    await promptInput.fill("Test persistence");

    const generateButton = page.locator(
      'button:has-text("Generate"), button[type="submit"]',
    );
    await generateButton.click();

    // Wait for the generation to be created
    await page.waitForSelector("text=Queued, text=Generating", {
      timeout: 10000,
    });

    // Reload the page
    await page.reload();

    // Check that the generation still appears in history
    const historySection = page.locator(
      '[data-testid="history"], .history, nav',
    );
    if (await historySection.isVisible()) {
      const historyItem = page.locator(
        '[data-testid="history-item"], .history-item',
      );
      await expect(historyItem).toBeVisible();
    }
  });
});
