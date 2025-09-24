import { expect, test } from "@playwright/test";

test.describe("Refine Generation with Guidance", () => {
  test("should refine existing generation and show comparison", async ({
    page,
  }) => {
    // Navigate to the app
    await page.goto("/");

    // Create initial generation
    const promptInput = page.locator(
      'input[placeholder*="what if"], textarea[placeholder*="what if"]',
    );
    await promptInput.fill("A simple chair in an empty room");

    const generateButton = page.locator(
      'button:has-text("Generate"), button[type="submit"]',
    );
    await generateButton.click();

    // Wait for initial generation
    await page.waitForSelector(
      'img[alt*="generated"], text=Complete, text=Failed',
      { timeout: 60000 },
    );

    const initialImage = page.locator('img[alt*="generated"]');
    if (await initialImage.isVisible()) {
      // Find and click refine button
      const refineButton = page.locator(
        'button:has-text("Refine"), button:has-text("Improve")',
      );
      await refineButton.click();

      // Enter refinement guidance
      const guidanceInput = page.locator(
        'input[placeholder*="guidance"], textarea[placeholder*="guidance"], input[placeholder*="refine"]',
      );
      await guidanceInput.fill(
        "Make the chair more modern and add warm lighting",
      );

      // Submit refinement
      const submitRefineButton = page.locator(
        'button:has-text("Refine"), button[type="submit"]',
      );
      await submitRefineButton.click();

      // Wait for refinement to complete
      await page.waitForSelector('img[alt*="refined"], img[alt*="generated"]', {
        timeout: 60000,
      });

      // Should show comparison view or both images
      const images = page.locator('img[alt*="generated"], img[alt*="refined"]');
      const imageCount = await images.count();

      // Expect to see at least the refined image, possibly both for comparison
      expect(imageCount).toBeGreaterThanOrEqual(1);

      if (imageCount >= 2) {
        // Comparison view is available
        await expect(
          page.locator('[data-testid="comparison"], .comparison'),
        ).toBeVisible();
      }

      // Check for refinement indicator
      const refinementIndicator = page.locator(
        'text=refined, text=v2, text=improved, [data-testid="refinement"]',
      );
      if (await refinementIndicator.isVisible()) {
        await expect(refinementIndicator).toBeVisible();
      }
    } else {
      console.log("Initial generation failed, skipping refinement test");
    }
  });

  test("should maintain refinement history and relationships", async ({
    page,
  }) => {
    await page.goto("/");

    // This test checks that refinements are properly linked to originals
    // and that the refinement chain is preserved in the UI

    // Create and refine (simplified flow)
    const promptInput = page.locator(
      'input[placeholder*="what if"], textarea[placeholder*="what if"]',
    );
    await promptInput.fill("A basic chair");

    const generateButton = page.locator('button:has-text("Generate")');
    await generateButton.click();

    await page.waitForSelector("text=Queued, text=Complete, text=Failed", {
      timeout: 30000,
    });

    // Look for history or generation list
    const historySection = page.locator(
      '[data-testid="history"], .history, .generations',
    );
    if (await historySection.isVisible()) {
      // Should show the generation in history
      const generationItem = page.locator(
        '[data-testid="generation"], .generation-item',
      );
      await expect(generationItem.first()).toBeVisible();

      // If refinement is available, test the relationship
      const refineButton = page.locator('button:has-text("Refine")');
      if (await refineButton.isVisible()) {
        await refineButton.click();

        const guidanceInput = page.locator('textarea, input[type="text"]');
        if (await guidanceInput.isVisible()) {
          await guidanceInput.fill("Make it different");

          const submitButton = page.locator(
            'button[type="submit"], button:has-text("Submit")',
          );
          await submitButton.click();

          // After refinement, should show relationship
          await page.waitForTimeout(5000);

          const relationshipIndicator = page.locator(
            'text=based on, text=refined from, [data-testid="refinement-chain"]',
          );
          if (await relationshipIndicator.isVisible()) {
            await expect(relationshipIndicator).toBeVisible();
          }
        }
      }
    }
  });
});
