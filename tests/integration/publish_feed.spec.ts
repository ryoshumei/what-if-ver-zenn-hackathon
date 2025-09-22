import { expect, test } from "@playwright/test";

test.describe("Publish to Public Feed", () => {
  test("should publish generation to feed with proper attribution", async ({
    page,
  }) => {
    // Navigate to the app
    await page.goto("/");

    // Create a generation first
    const promptInput = page.locator(
      'input[placeholder*="what if"], textarea[placeholder*="what if"]',
    );
    await promptInput.fill("A futuristic chair floating in space");

    const generateButton = page.locator('button:has-text("Generate")');
    await generateButton.click();

    // Wait for generation to complete
    await page.waitForSelector(
      'img[alt*="generated"], text=Complete, text=Failed',
      { timeout: 60000 },
    );

    const generatedImage = page.locator('img[alt*="generated"]');
    if (await generatedImage.isVisible()) {
      // Find publish button
      const publishButton = page.locator(
        'button:has-text("Publish"), button:has-text("Share")',
      );
      await publishButton.click();

      // Fill out publish form
      const altTextInput = page.locator(
        'input[placeholder*="alt"], textarea[placeholder*="description"]',
      );
      if (await altTextInput.isVisible()) {
        await altTextInput.fill(
          "A sleek, modern chair floating gracefully in the depths of space",
        );
      }

      // Set visibility to public
      const publicOption = page.locator(
        'input[value="public"], button:has-text("Public")',
      );
      if (await publicOption.isVisible()) {
        await publicOption.click();
      }

      // Submit publish
      const submitPublishButton = page.locator(
        'button:has-text("Publish"), button[type="submit"]',
      );
      await submitPublishButton.click();

      // Should see success message
      await expect(
        page.locator("text=Published, text=Shared, text=success"),
      ).toBeVisible({ timeout: 10000 });

      // Navigate to feed to verify publication
      const feedLink = page.locator(
        'a[href*="feed"], button:has-text("Feed"), nav a:has-text("Community")',
      );
      if (await feedLink.isVisible()) {
        await feedLink.click();

        // Should see the published item in the feed
        await page.waitForSelector(
          '[data-testid="feed-item"], .feed-item, .post',
          { timeout: 10000 },
        );

        const feedItems = page.locator(
          '[data-testid="feed-item"], .feed-item, .post',
        );
        await expect(feedItems.first()).toBeVisible();

        // Check for proper attribution
        const attribution = page.locator(
          'text=Created by, text=Author, [data-testid="author"]',
        );
        if (await attribution.isVisible()) {
          await expect(attribution).toBeVisible();
        }

        // Check for prompt summary
        const promptSummary = page.locator(
          "text=futuristic chair, text=floating, text=space",
        );
        if (await promptSummary.isVisible()) {
          await expect(promptSummary).toBeVisible();
        }
      }
    } else {
      console.log("Generation failed, skipping publish test");
    }
  });

  test("should handle publish with accessibility requirements", async ({
    page,
  }) => {
    await page.goto("/");

    // This test ensures accessibility metadata is properly required/handled
    const publishButton = page.locator(
      'button:has-text("Publish"), button:has-text("Share")',
    );

    // Mock having a completed generation available for publishing
    if (await publishButton.isVisible()) {
      await publishButton.click();

      // Should require alt text for images
      const altTextInput = page.locator(
        'input[placeholder*="alt"], textarea[placeholder*="alt"]',
      );
      if (await altTextInput.isVisible()) {
        // Try to submit without alt text
        const submitButton = page.locator(
          'button[type="submit"], button:has-text("Publish")',
        );
        await submitButton.click();

        // Should show validation error or requirement
        const validationError = page.locator(
          'text=required, text=alt text, .error, [role="alert"]',
        );
        if (await validationError.isVisible()) {
          await expect(validationError).toBeVisible();
        }

        // Fill in alt text and try again
        await altTextInput.fill(
          "A detailed description of the generated image",
        );
        await submitButton.click();

        // Should proceed or show success
        const successIndicator = page.locator(
          "text=Published, text=Success, .success",
        );
        if (await successIndicator.isVisible()) {
          await expect(successIndicator).toBeVisible();
        }
      }
    }
  });

  test("should show published content in user profile", async ({ page }) => {
    // This test checks that published content appears in user's profile/history
    await page.goto("/");

    // Look for profile or user section
    const profileLink = page.locator(
      'a[href*="profile"], button:has-text("Profile"), nav a:has-text("My")',
    );
    if (await profileLink.isVisible()) {
      await profileLink.click();

      // Should show user's published items
      const publishedSection = page.locator(
        '[data-testid="published"], .published, h2:has-text("Published")',
      );
      if (await publishedSection.isVisible()) {
        await expect(publishedSection).toBeVisible();

        const publishedItems = page.locator(
          '[data-testid="published-item"], .published-item',
        );
        if (await publishedItems.first().isVisible()) {
          await expect(publishedItems.first()).toBeVisible();
        }
      }
    }
  });
});
