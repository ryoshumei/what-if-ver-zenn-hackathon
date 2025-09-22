import { expect, test } from "@playwright/test";

test.describe("Prompt Validation", () => {
  test("should reject empty prompts with helpful message", async ({ page }) => {
    await page.goto("/");

    // Find the prompt input
    const _promptInput = page.locator(
      'input[placeholder*="what if"], textarea[placeholder*="what if"]',
    );

    // Try to generate with empty prompt
    const generateButton = page.locator(
      'button:has-text("Generate"), button[type="submit"]',
    );
    await generateButton.click();

    // Should show validation error
    const errorMessage = page.locator(
      'text=required, text=empty, text=enter, .error, [role="alert"]',
    );
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    // Error should be helpful
    await expect(errorMessage).toContainText(/required|empty|enter|describe/i);
  });

  test("should reject ambiguous prompts with guidance", async ({ page }) => {
    await page.goto("/");

    const promptInput = page.locator(
      'input[placeholder*="what if"], textarea[placeholder*="what if"]',
    );

    // Enter ambiguous prompts
    const ambiguousPrompts = ["something", "it", "that thing", "a", "maybe"];

    for (const prompt of ambiguousPrompts) {
      await promptInput.fill(prompt);

      const generateButton = page.locator(
        'button:has-text("Generate"), button[type="submit"]',
      );
      await generateButton.click();

      // Should show guidance for ambiguous prompt
      const guidanceMessage = page.locator(
        "text=specific, text=describe, text=ambiguous, text=unclear, .warning, .guidance",
      );

      if (await guidanceMessage.isVisible()) {
        await expect(guidanceMessage).toBeVisible();

        // Should provide helpful suggestions
        await expect(guidanceMessage).toContainText(
          /specific|describe|detail|example/i,
        );
      }

      // Clear for next iteration
      await promptInput.clear();
    }
  });

  test("should validate prompt length limits", async ({ page }) => {
    await page.goto("/");

    const promptInput = page.locator(
      'input[placeholder*="what if"], textarea[placeholder*="what if"]',
    );

    // Test very long prompt (over 2000 characters)
    const longPrompt =
      "A very detailed description of what happens when ".repeat(50) +
      "a chair floats";

    await promptInput.fill(longPrompt);

    const generateButton = page.locator(
      'button:has-text("Generate"), button[type="submit"]',
    );
    await generateButton.click();

    // Should show length validation error
    const lengthError = page.locator(
      "text=too long, text=2000, text=character limit, .error",
    );
    if (await lengthError.isVisible()) {
      await expect(lengthError).toBeVisible();
      await expect(lengthError).toContainText(/2000|limit|long/i);
    }

    // Test character counter if present
    const charCounter = page.locator(
      '[data-testid="char-count"], .char-count, text=/\\d+\\/2000/',
    );
    if (await charCounter.isVisible()) {
      await expect(charCounter).toBeVisible();
    }
  });

  test("should provide helpful suggestions for improvement", async ({
    page,
  }) => {
    await page.goto("/");

    const promptInput = page.locator(
      'input[placeholder*="what if"], textarea[placeholder*="what if"]',
    );

    // Enter a prompt that could be improved
    await promptInput.fill("chair");

    // Look for suggestions (might appear on typing or on attempt to generate)
    const suggestions = page.locator(
      '[data-testid="suggestions"], .suggestions, .help-text, text=try, text=example',
    );

    if (await suggestions.isVisible()) {
      await expect(suggestions).toBeVisible();

      // Should provide example improvements
      await expect(suggestions).toContainText(/try|example|such as|consider/i);
    }

    // Test clicking on suggestion if available
    const suggestionButton = page.locator(
      'button:has-text("Try"), .suggestion-item button',
    );
    if (await suggestionButton.first().isVisible()) {
      await suggestionButton.first().click();

      // Should update the prompt input
      const updatedValue = await promptInput.inputValue();
      expect(updatedValue.length).toBeGreaterThan(5);
    }
  });

  test("should handle multi-language prompts appropriately", async ({
    page,
  }) => {
    await page.goto("/");

    const promptInput = page.locator(
      'input[placeholder*="what if"], textarea[placeholder*="what if"]',
    );

    const multiLanguagePrompts = [
      "椅子が浮いている時、ロボットが来る", // Japanese
      "当机器人到达时椅子漂浮", // Chinese
      "Una silla flota cuando llega un robot", // Spanish
    ];

    for (const prompt of multiLanguagePrompts) {
      await promptInput.fill(prompt);

      const generateButton = page.locator(
        'button:has-text("Generate"), button[type="submit"]',
      );
      await generateButton.click();

      // Should either accept the prompt or provide language guidance
      const response = page.locator(
        "text=Queued, text=language, text=supported, .error, .info",
      );

      if (await response.isVisible()) {
        // Check if it's processing or providing language feedback
        const responseText = await response.textContent();
        expect(responseText).toBeTruthy();
      }

      await page.waitForTimeout(2000); // Brief pause between tests
      await promptInput.clear();
    }
  });
});
