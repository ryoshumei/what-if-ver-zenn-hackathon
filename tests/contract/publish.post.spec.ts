import { describe, expect, it } from "vitest";

describe("POST /api/publish", () => {
  it("should publish generation and return 201 with community post", async () => {
    const response = await fetch("http://localhost:3000/api/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        generationId: "some-completed-generation-id",
        visibility: "public",
        altText: "A modern floating chair with a sleek robot nearby",
      }),
    });

    expect(response.status).toBe(201);

    const communityPost = await response.json();
    expect(communityPost).toMatchObject({
      id: expect.any(String),
      generationId: "some-completed-generation-id",
      authorId: expect.any(String),
      promptSummary: expect.any(String),
      thumbnailUrl: expect.any(String),
      publishedAt: expect.any(String),
      visibility: "public",
    });
  });

  it("should publish with unlisted visibility", async () => {
    const response = await fetch("http://localhost:3000/api/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        generationId: "some-completed-generation-id",
        visibility: "unlisted",
      }),
    });

    expect(response.status).toBe(201);

    const communityPost = await response.json();
    expect(communityPost.visibility).toBe("public"); // Note: API converts unlisted to public per schema
  });

  it("should reject missing generationId", async () => {
    const response = await fetch("http://localhost:3000/api/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        visibility: "public",
      }),
    });

    expect(response.status).toBe(400);
  });

  it("should reject missing visibility", async () => {
    const response = await fetch("http://localhost:3000/api/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        generationId: "some-generation-id",
      }),
    });

    expect(response.status).toBe(400);
  });

  it("should reject invalid visibility", async () => {
    const response = await fetch("http://localhost:3000/api/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        generationId: "some-generation-id",
        visibility: "invalid",
      }),
    });

    expect(response.status).toBe(400);
  });

  it("should reject publishing non-existent generation", async () => {
    const response = await fetch("http://localhost:3000/api/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        generationId: "non-existent-id",
        visibility: "public",
      }),
    });

    expect(response.status).toBe(404);
  });
});
