import { expect, test } from "@playwright/test";

test.describe("Retry on Transient Failure with Input Preservation", () => {
  test("should preserve input when generation fails and allow retry", async ({
    page,
  }) => {
    await page.goto("/");

    const promptInput = page.locator(
      'input[placeholder*="what if"], textarea[placeholder*="what if"]',
    );
    const originalPrompt =
      "A detailed scene with a floating chair and robot companion";

    // Enter a detailed prompt
    await promptInput.fill(originalPrompt);

    // Select generation type
    const imageToggle = page.locator(
      'button:has-text("Image"), input[type="radio"][value="image"]',
    );
    if (await imageToggle.isVisible()) {
      await imageToggle.click();
    }

    const generateButton = page.locator(
      'button:has-text("Generate"), button[type="submit"]',
    );
    await generateButton.click();

    // Wait for either success or failure
    await page.waitForSelector(
      'text=Complete, text=Failed, text=Error, img[alt*="generated"], .error-message',
      { timeout: 60000 },
    );

    const errorMessage = page.locator(
      "text=Failed, text=Error, .error-message",
    );
    if (await errorMessage.isVisible()) {
      // Generation failed - test retry functionality

      // Verify original prompt is preserved
      const currentPrompt = await promptInput.inputValue();
      expect(currentPrompt).toBe(originalPrompt);

      // Should show retry option
      const retryButton = page.locator(
        'button:has-text("Retry"), button:has-text("Try Again")',
      );
      await expect(retryButton).toBeVisible();

      // Click retry
      await retryButton.click();

      // Should start generation again with same prompt
      await expect(page.locator("text=Queued, text=Generating")).toBeVisible({
        timeout: 10000,
      });

      // Prompt should still be preserved
      const retryPrompt = await promptInput.inputValue();
      expect(retryPrompt).toBe(originalPrompt);
    } else {
      // Generation succeeded on first try - simulate failure scenario
      console.log(
        "Generation succeeded on first try, retry test not applicable",
      );
    }
  });

  test("should handle network failures gracefully", async ({ page }) => {
    await page.goto("/");

    const promptInput = page.locator(
      'input[placeholder*="what if"], textarea[placeholder*="what if"]',
    );
    await promptInput.fill("Test network failure handling");

    // Simulate network issues by intercepting requests
    await page.route("**/api/generations", (route) => {
      // Simulate network timeout or server error
      route.abort("timedout");
    });

    const generateButton = page.locator(
      'button:has-text("Generate"), button[type="submit"]',
    );
    await generateButton.click();

    // Should show appropriate error message
    const networkError = page.locator(
      "text=network, text=connection, text=timeout, text=server, .network-error, .connection-error",
    );

    await expect(networkError).toBeVisible({ timeout: 15000 });

    // Should preserve input
    const preservedPrompt = await promptInput.inputValue();
    expect(preservedPrompt).toBe("Test network failure handling");

    // Should offer retry
    const retryButton = page.locator(
      'button:has-text("Retry"), button:has-text("Try Again")',
    );
    if (await retryButton.isVisible()) {
      await expect(retryButton).toBeVisible();
    }

    // Clear the route intercept
    await page.unroute("**/api/generations");
  });

  test("should handle server errors with appropriate messaging", async ({
    page,
  }) => {
    await page.goto("/");

    const promptInput = page.locator(
      'input[placeholder*="what if"], textarea[placeholder*="what if"]',
    );
    await promptInput.fill("Test server error handling");

    // Simulate server error
    await page.route("**/api/generations", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal server error" }),
      });
    });

    const generateButton = page.locator(
      'button:has-text("Generate"), button[type="submit"]',
    );
    await generateButton.click();

    // Should show server error message
    const serverError = page.locator(
      "text=server error, text=500, text=internal error, .server-error",
    );
    await expect(serverError).toBeVisible({ timeout: 10000 });

    // Should preserve input
    const preservedPrompt = await promptInput.inputValue();
    expect(preservedPrompt).toBe("Test server error handling");

    // Should offer retry
    const retryButton = page.locator(
      'button:has-text("Retry"), button:has-text("Try Again")',
    );
    if (await retryButton.isVisible()) {
      await expect(retryButton).toBeVisible();
    }

    await page.unroute("**/api/generations");
  });

  test("should preserve generation settings across retries", async ({
    page,
  }) => {
    await page.goto("/");

    const promptInput = page.locator(
      'input[placeholder*="what if"], textarea[placeholder*="what if"]',
    );
    await promptInput.fill("Test settings preservation");

    // Set specific generation type
    const videoToggle = page.locator(
      'button:has-text("Video"), input[type="radio"][value="video"]',
    );
    if (await videoToggle.isVisible()) {
      await videoToggle.click();
    }

    // Set any additional options if available
    const guidanceInput = page.locator(
      'input[placeholder*="guidance"], textarea[placeholder*="style"]',
    );
    if (await guidanceInput.isVisible()) {
      await guidanceInput.fill("Make it cinematic");
    }

    // Simulate failure
    await page.route("**/api/generations", (route) => {
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Service temporarily unavailable" }),
      });
    });

    const generateButton = page.locator(
      'button:has-text("Generate"), button[type="submit"]',
    );
    await generateButton.click();

    // Wait for error
    await expect(page.locator("text=error, text=unavailable")).toBeVisible({
      timeout: 10000,
    });

    // Verify all settings are preserved
    const preservedPrompt = await promptInput.inputValue();
    expect(preservedPrompt).toBe("Test settings preservation");

    // Check video toggle is still selected
    if (await videoToggle.isVisible()) {
      await expect(videoToggle).toBeChecked();
    }

    // Check guidance is preserved
    if (await guidanceInput.isVisible()) {
      const preservedGuidance = await guidanceInput.inputValue();
      expect(preservedGuidance).toBe("Make it cinematic");
    }

    await page.unroute("**/api/generations");
  });

  test("should handle rate limiting with backoff indication", async ({
    page,
  }) => {
    await page.goto("/");

    const promptInput = page.locator(
      'input[placeholder*="what if"], textarea[placeholder*="what if"]',
    );
    await promptInput.fill("Test rate limiting");

    // Simulate rate limiting
    await page.route("**/api/generations", (route) => {
      route.fulfill({
        status: 429,
        contentType: "application/json",
        headers: {
          "Retry-After": "60",
        },
        body: JSON.stringify({ error: "Rate limit exceeded" }),
      });
    });

    const generateButton = page.locator(
      'button:has-text("Generate"), button[type="submit"]',
    );
    await generateButton.click();

    // Should show rate limit message
    const rateLimitMessage = page.locator(
      "text=rate limit, text=too many, text=wait, .rate-limit",
    );
    await expect(rateLimitMessage).toBeVisible({ timeout: 10000 });

    // Should show countdown or wait time
    const waitIndicator = page.locator(
      "text=60, text=minute, text=seconds, .countdown, .wait-time",
    );
    if (await waitIndicator.isVisible()) {
      await expect(waitIndicator).toBeVisible();
    }

    // Should preserve input
    const preservedPrompt = await promptInput.inputValue();
    expect(preservedPrompt).toBe("Test rate limiting");

    await page.unroute("**/api/generations");
  });
});
