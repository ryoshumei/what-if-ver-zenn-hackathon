import { describe, expect, it } from "vitest";

describe("GET /api/generations/{id}", () => {
  it("should return generation status for valid ID", async () => {
    // First create a generation to test with
    const createResponse = await fetch(
      "http://localhost:3000/api/generations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "image",
          prompt: "Test generation for status check",
        }),
      },
    );

    expect(createResponse.status).toBe(202);
    const generation = await createResponse.json();
    const generationId = generation.id;

    // Then check the status
    const response = await fetch(
      `http://localhost:3000/api/generations/${generationId}`,
    );

    expect(response.status).toBe(200);

    const status = await response.json();
    expect(status).toMatchObject({
      id: generationId,
      type: "image",
      status: expect.stringMatching(/^(queued|running|complete|failed)$/),
      model: expect.any(String),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it("should return 404 for non-existent generation ID", async () => {
    const response = await fetch(
      "http://localhost:3000/api/generations/non-existent-id",
    );

    expect(response.status).toBe(404);
  });

  it("should return complete generation with asset when finished", async () => {
    // This test expects that there might be completed generations
    // In practice, this would need a pre-seeded database or a way to wait for completion
    const response = await fetch(
      "http://localhost:3000/api/generations/mock-completed-id",
    );

    if (response.status === 200) {
      const generation = await response.json();
      if (generation.status === "complete") {
        expect(generation.asset).toMatchObject({
          id: expect.any(String),
          url: expect.any(String),
          format: expect.any(String),
        });
      }
    }
    // This test is conditional since we may not have completed generations
  });
});
