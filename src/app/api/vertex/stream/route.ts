// Comments: Node runtime proxying Vertex AI streaming to the client as a ReadableStream via ADC.
export const runtime = "nodejs";
import { GoogleAuth } from "google-auth-library";

type Env = {
  GCP_PROJECT_ID?: string;
  GCP_LOCATION?: string;
  VERTEX_MODEL?: string;
};

export async function POST(request: Request) {
  try {
    const env = process.env as Env;
    const { prompt } = await request.json();
    const projectId = env.GCP_PROJECT_ID;
    const location = env.GCP_LOCATION || "us-central1";
    const model = env.VERTEX_MODEL || "gemini-1.5-pro";

    if (!projectId) {
      return new Response(JSON.stringify({ error: "Missing GCP_PROJECT_ID" }), {
        status: 500,
      });
    }

    // Validate prompt
    if (!prompt || !String(prompt).trim()) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
      });
    }

    // Obtain access token via ADC (service account or user creds)
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const client = await auth.getClient();
    const headers = await (client as any).getRequestHeaders();
    const authHeader = (headers.Authorization || headers.authorization) as
      | string
      | undefined;
    const accessToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : (await (client as any).getAccessToken()).token || undefined;
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "Failed to acquire access token via ADC" }),
        { status: 500 },
      );
    }

    const vertexUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:streamGenerateContent`;

    const upstream = await fetch(vertexUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "x-goog-user-project": projectId,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: String(prompt ?? "") }] }],
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text();
      return new Response(
        JSON.stringify({ error: "Upstream error", details: text }),
        { status: 502 },
      );
    }

    const readable = new ReadableStream({
      start(controller) {
        const reader = upstream.body?.getReader();
        if (!reader) {
          controller.error(
            new Error("Failed to get reader from upstream body"),
          );
          return;
        }

        const safeReader = reader; // TypeScript workaround
        function push() {
          safeReader
            .read()
            .then(({ done, value }) => {
              if (done) {
                controller.close();
                return;
              }
              controller.enqueue(value);
              push();
            })
            .catch((err) => {
              controller.error(err);
            });
        }
        push();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Unhandled error", details: errorMessage }),
      { status: 500 },
    );
  }
}
