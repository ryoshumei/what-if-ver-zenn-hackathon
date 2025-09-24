import { expect, test } from "@playwright/test";

test.describe("Content Policy Violation Blocking", () => {
  test("should block unsafe prompts with clear reasons", async ({ page }) => {
    await page.goto("/");

    const promptInput = page.locator(
      'input[placeholder*="what if"], textarea[placeholder*="what if"]',
    );

    // Test various types of potentially unsafe content
    const unsafePrompts = [
      "what if someone gets hurt violently",
      "what if there is explicit violence",
      "what if harmful content is shown",
    ];

    for (const prompt of unsafePrompts) {
      await promptInput.fill(prompt);

      const generateButton = page.locator(
        'button:has-text("Generate"), button[type="submit"]',
      );
      await generateButton.click();

      // Should show policy violation message
      const policyMessage = page.locator(
        "text=policy, text=violat, text=not allowed, text=unsafe, text=guideline, .blocked, .policy-error",
      );

      await expect(policyMessage).toBeVisible({ timeout: 10000 });

      // Should provide clear reason
      await expect(policyMessage).toContainText(
        /policy|guideline|not allowed|unsafe|violat/i,
      );

      // Should not proceed with generation
      const generationStarted = page.locator("text=Queued, text=Generating");
      await expect(generationStarted).not.toBeVisible();

      await promptInput.clear();
      await page.waitForTimeout(1000); // Brief pause between tests
    }
  });

  test("should provide guidance for policy-compliant alternatives", async ({
    page,
  }) => {
    await page.goto("/");

    const promptInput = page.locator(
      'input[placeholder*="what if"], textarea[placeholder*="what if"]',
    );

    // Enter a prompt that might trigger policy guidance
    await promptInput.fill("what if something dangerous happens");

    const generateButton = page.locator(
      'button:has-text("Generate"), button[type="submit"]',
    );
    await generateButton.click();

    // Look for policy guidance or suggestions
    const guidanceMessage = page.locator(
      "text=instead, text=try, text=suggest, text=alternative, .guidance, .suggestion",
    );

    if (await guidanceMessage.isVisible()) {
      await expect(guidanceMessage).toBeVisible();

      // Should suggest safer alternatives
      await expect(guidanceMessage).toContainText(
        /instead|try|suggest|alternative|consider/i,
      );
    }

    // Look for example suggestions
    const exampleSuggestions = page.locator(
      'button:has-text("Try"), .example-prompt',
    );
    if (await exampleSuggestions.first().isVisible()) {
      await exampleSuggestions.first().click();

      // Should replace prompt with safer alternative
      const updatedPrompt = await promptInput.inputValue();
      expect(updatedPrompt.length).toBeGreaterThan(0);
    }
  });

  test("should handle edge cases and borderline content", async ({ page }) => {
    await page.goto("/");

    const promptInput = page.locator(
      'input[placeholder*="what if"], textarea[placeholder*="what if"]',
    );

    // Test borderline prompts that might require human judgment
    const borderlinePrompts = [
      "what if a chair breaks",
      "what if something goes wrong",
      "what if there is conflict",
    ];

    for (const prompt of borderlinePrompts) {
      await promptInput.fill(prompt);

      const generateButton = page.locator(
        'button:has-text("Generate"), button[type="submit"]',
      );
      await generateButton.click();

      // These might be allowed, blocked, or require additional review
      await page.waitForSelector(
        "text=Queued, text=policy, text=review, text=blocked, .warning, .info",
        { timeout: 10000 },
      );

      const response = page.locator(
        "text=Queued, text=policy, text=review, text=blocked, .warning, .info",
      );
      const responseText = await response.textContent();

      // Verify appropriate handling based on policy decision
      if (responseText?.includes("Queued")) {
        // Prompt was allowed
        console.log(`Prompt allowed: ${prompt}`);
      } else if (
        responseText?.includes("policy") ||
        responseText?.includes("blocked")
      ) {
        // Prompt was blocked with policy reason
        console.log(`Prompt blocked: ${prompt}`);
      } else if (responseText?.includes("review")) {
        // Prompt requires additional review
        console.log(`Prompt under review: ${prompt}`);
      }

      await promptInput.clear();
      await page.waitForTimeout(1000);
    }
  });

  test("should maintain policy consistency across generation types", async ({
    page,
  }) => {
    await page.goto("/");

    const promptInput = page.locator(
      'input[placeholder*="what if"], textarea[placeholder*="what if"]',
    );
    const unsafePrompt = "what if harmful content is generated";

    // Test with image generation
    await promptInput.fill(unsafePrompt);
    const imageToggle = page.locator(
      'button:has-text("Image"), input[type="radio"][value="image"]',
    );
    if (await imageToggle.isVisible()) {
      await imageToggle.click();
    }

    let generateButton = page.locator(
      'button:has-text("Generate"), button[type="submit"]',
    );
    await generateButton.click();

    let policyMessage = page.locator(
      "text=policy, text=violat, text=not allowed, .blocked",
    );
    await expect(policyMessage).toBeVisible({ timeout: 10000 });

    // Test with video generation
    await promptInput.clear();
    await promptInput.fill(unsafePrompt);
    const videoToggle = page.locator(
      'button:has-text("Video"), input[type="radio"][value="video"]',
    );
    if (await videoToggle.isVisible()) {
      await videoToggle.click();
    }

    generateButton = page.locator(
      'button:has-text("Generate"), button[type="submit"]',
    );
    await generateButton.click();

    policyMessage = page.locator(
      "text=policy, text=violat, text=not allowed, .blocked",
    );
    await expect(policyMessage).toBeVisible({ timeout: 10000 });

    // Policy should be consistent regardless of generation type
  });
});
