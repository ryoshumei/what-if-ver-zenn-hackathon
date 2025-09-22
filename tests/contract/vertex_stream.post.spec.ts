import { describe, expect, it } from "vitest";

describe("POST /api/vertex/stream", () => {
  it("should accept valid prompt and return streaming response", async () => {
    const response = await fetch("http://localhost:3000/api/vertex/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt:
          "Help me plan an image about a floating chair when a robot arrives.",
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");

    // Response should be a readable stream
    expect(response.body).toBeDefined();
  });

  it("should reject missing prompt", async () => {
    const response = await fetch("http://localhost:3000/api/vertex/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
  });

  it("should reject empty prompt", async () => {
    const response = await fetch("http://localhost:3000/api/vertex/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: "" }),
    });

    expect(response.status).toBe(400);
  });
});
