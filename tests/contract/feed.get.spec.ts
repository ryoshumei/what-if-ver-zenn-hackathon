import { describe, expect, it } from "vitest";

describe("GET /api/feed", () => {
  it("should return paginated community posts", async () => {
    const response = await fetch("http://localhost:3000/api/feed");

    expect(response.status).toBe(200);

    const feed = await response.json();
    expect(feed).toMatchObject({
      items: expect.any(Array),
      nextPage: expect.any(Number) || null,
    });

    // Each item should match the CommunityPost schema
    if (feed.items.length > 0) {
      expect(feed.items[0]).toMatchObject({
        id: expect.any(String),
        generationId: expect.any(String),
        authorId: expect.any(String),
        promptSummary: expect.any(String),
        thumbnailUrl: expect.any(String),
        publishedAt: expect.any(String),
        visibility: "public",
      });
    }
  });

  it("should handle pagination parameters", async () => {
    const response = await fetch(
      "http://localhost:3000/api/feed?page=2&pageSize=5",
    );

    expect(response.status).toBe(200);

    const feed = await response.json();
    expect(feed).toMatchObject({
      items: expect.any(Array),
      nextPage: expect.any(Number) || null,
    });

    // Should not return more than pageSize items
    expect(feed.items.length).toBeLessThanOrEqual(5);
  });

  it("should handle search query", async () => {
    const response = await fetch("http://localhost:3000/api/feed?q=robot");

    expect(response.status).toBe(200);

    const feed = await response.json();
    expect(feed).toMatchObject({
      items: expect.any(Array),
      nextPage: expect.any(Number) || null,
    });
  });

  it("should reject invalid page parameter", async () => {
    const response = await fetch("http://localhost:3000/api/feed?page=0");

    expect(response.status).toBe(400);
  });

  it("should reject invalid pageSize parameter", async () => {
    const response = await fetch("http://localhost:3000/api/feed?pageSize=100");

    expect(response.status).toBe(400);
  });

  it("should use default values for missing parameters", async () => {
    const response = await fetch("http://localhost:3000/api/feed");

    expect(response.status).toBe(200);

    const feed = await response.json();
    // Should return default page size (12) or fewer items
    expect(feed.items.length).toBeLessThanOrEqual(12);
  });
});
