import { describe, expect, it } from "vitest";

describe("POST /api/generations", () => {
  it("should accept valid image generation request and return 202", async () => {
    const response = await fetch("http://localhost:3000/api/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "image",
        prompt: "A chair floats when a vacuum robot arrives",
        language: "en",
      }),
    });

    expect(response.status).toBe(202);

    const generation = await response.json();
    expect(generation).toMatchObject({
      id: expect.any(String),
      type: "image",
      status: "queued",
      model: expect.any(String),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it("should accept valid video generation request and return 202", async () => {
    const response = await fetch("http://localhost:3000/api/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "video",
        prompt: "A chair floats when a vacuum robot arrives",
        language: "en",
      }),
    });

    expect(response.status).toBe(202);

    const generation = await response.json();
    expect(generation).toMatchObject({
      id: expect.any(String),
      type: "video",
      status: "queued",
      model: expect.any(String),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it("should reject missing required fields", async () => {
    const response = await fetch("http://localhost:3000/api/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: "Missing type field",
      }),
    });

    expect(response.status).toBe(400);
  });

  it("should reject invalid type", async () => {
    const response = await fetch("http://localhost:3000/api/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "invalid",
        prompt: "Valid prompt",
      }),
    });

    expect(response.status).toBe(400);
  });

  it("should reject prompt longer than 2000 characters", async () => {
    const longPrompt = "A".repeat(2001);

    const response = await fetch("http://localhost:3000/api/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "image",
        prompt: longPrompt,
      }),
    });

    expect(response.status).toBe(400);
  });
});
