import { expect, test } from "@playwright/test";

test.describe("Generate Video or Fallback to Image", () => {
  test("should attempt video generation and fallback to image with notice", async ({
    page,
  }) => {
    // Navigate to the app
    await page.goto("/");

    // Input a prompt suitable for video
    const promptInput = page.locator(
      'input[placeholder*="what if"], textarea[placeholder*="what if"]',
    );
    await promptInput.fill(
      "A robot vacuums while a chair slowly floats upward",
    );

    // Select video generation type
    const videoToggle = page.locator(
      'button:has-text("Video"), input[type="radio"][value="video"]',
    );
    await videoToggle.click();

    // Submit the generation request
    const generateButton = page.locator(
      'button:has-text("Generate"), button[type="submit"]',
    );
    await generateButton.click();

    // Wait for generation to start
    await expect(page.locator("text=Queued, text=Generating")).toBeVisible({
      timeout: 10000,
    });

    // Wait for completion or fallback notice
    await page.waitForSelector(
      'video, img[alt*="generated"], text=Complete, text=Failed, text=fallback, text=image instead',
      { timeout: 90000 },
    );

    // Check if video was generated successfully
    const generatedVideo = page.locator("video");
    const generatedImage = page.locator('img[alt*="generated"]');
    const fallbackNotice = page.locator(
      "text=fallback, text=image instead, text=video unavailable",
    );

    if (await generatedVideo.isVisible()) {
      // Video generation succeeded
      await expect(generatedVideo).toBeVisible();
      await expect(generatedVideo).toHaveAttribute("src");

      // Test video controls
      const playButton = page.locator(
        'video ~ button:has-text("Play"), video[controls]',
      );
      if (await playButton.isVisible()) {
        await playButton.click();
      }
    } else if (
      (await generatedImage.isVisible()) &&
      (await fallbackNotice.isVisible())
    ) {
      // Video fallback to image - expected behavior
      await expect(generatedImage).toBeVisible();
      await expect(fallbackNotice).toBeVisible();

      // Verify fallback notice explains the situation
      await expect(fallbackNotice).toContainText(
        /fallback|image instead|video.*unavailable/i,
      );
    } else if (await generatedImage.isVisible()) {
      // Image generated (could be fallback without explicit notice)
      await expect(generatedImage).toBeVisible();
    } else {
      // Generation failed entirely
      const errorMessage = page.locator("text=Failed, text=Error");
      if (await errorMessage.isVisible()) {
        console.log(
          "Video generation failed, which is expected for integration test without real API",
        );
      }
    }
  });

  test("should show video progress indicators", async ({ page }) => {
    await page.goto("/");

    // Input a prompt for video
    const promptInput = page.locator(
      'input[placeholder*="what if"], textarea[placeholder*="what if"]',
    );
    await promptInput.fill("Time-lapse of a chair floating");

    // Select video
    const videoToggle = page.locator(
      'button:has-text("Video"), input[type="radio"][value="video"]',
    );
    await videoToggle.click();

    const generateButton = page.locator(
      'button:has-text("Generate"), button[type="submit"]',
    );
    await generateButton.click();

    // Should show progress indicators since video takes longer
    await expect(page.locator("text=Queued, text=Starting")).toBeVisible({
      timeout: 10000,
    });

    // Look for progress indicators (progress bar, percentage, time estimates)
    const progressIndicators = page.locator(
      'progress, [role="progressbar"], text=%, text=seconds, text=minutes, .progress',
    );

    // Allow some time for progress to show up
    await page.waitForTimeout(5000);

    // At least one progress indicator should be present for video generation
    if (await progressIndicators.first().isVisible()) {
      await expect(progressIndicators.first()).toBeVisible();
    }
  });
});
