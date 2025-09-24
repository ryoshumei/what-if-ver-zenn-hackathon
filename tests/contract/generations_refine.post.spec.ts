import { describe, expect, it } from "vitest";

describe("POST /api/generations/{id}/refine", () => {
  it("should accept valid refinement request and return 202", async () => {
    // First create a generation to refine
    const createResponse = await fetch(
      "http://localhost:3000/api/generations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "image",
          prompt: "A chair floats when a vacuum robot arrives",
        }),
      },
    );

    expect(createResponse.status).toBe(202);
    const generation = await createResponse.json();
    const generationId = generation.id;

    // Then refine it
    const response = await fetch(
      `http://localhost:3000/api/generations/${generationId}/refine`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          guidance: "Make the chair more modern and sleek",
        }),
      },
    );

    expect(response.status).toBe(202);

    const refinedGeneration = await response.json();
    expect(refinedGeneration).toMatchObject({
      id: expect.any(String),
      type: "image",
      status: "queued",
      model: expect.any(String),
      refinementOf: generationId,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it("should reject missing guidance", async () => {
    const response = await fetch(
      "http://localhost:3000/api/generations/some-id/refine",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      },
    );

    expect(response.status).toBe(400);
  });

  it("should reject empty guidance", async () => {
    const response = await fetch(
      "http://localhost:3000/api/generations/some-id/refine",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ guidance: "" }),
      },
    );

    expect(response.status).toBe(400);
  });

  it("should return 404 for non-existent generation ID", async () => {
    const response = await fetch(
      "http://localhost:3000/api/generations/non-existent-id/refine",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          guidance: "Valid guidance",
        }),
      },
    );

    expect(response.status).toBe(404);
  });
});
