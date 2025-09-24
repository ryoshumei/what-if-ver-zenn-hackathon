import { describe, expect, it } from "vitest";

describe("POST /api/feedback", () => {
  it("should accept valid feedback and return 204", async () => {
    const response = await fetch("http://localhost:3000/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        generationId: "some-generation-id",
        matchesIntent: true,
        note: "Perfect match for my vision!",
      }),
    });

    expect(response.status).toBe(204);
  });

  it("should accept feedback without note", async () => {
    const response = await fetch("http://localhost:3000/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        generationId: "some-generation-id",
        matchesIntent: false,
      }),
    });

    expect(response.status).toBe(204);
  });

  it("should reject missing generationId", async () => {
    const response = await fetch("http://localhost:3000/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        matchesIntent: true,
      }),
    });

    expect(response.status).toBe(400);
  });

  it("should reject missing matchesIntent", async () => {
    const response = await fetch("http://localhost:3000/api/feedback", {
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

  it("should reject invalid matchesIntent type", async () => {
    const response = await fetch("http://localhost:3000/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        generationId: "some-generation-id",
        matchesIntent: "not-a-boolean",
      }),
    });

    expect(response.status).toBe(400);
  });
});
