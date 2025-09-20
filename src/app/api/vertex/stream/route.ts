// Comments: Edge API route proxying Vertex AI streaming to the client as a ReadableStream.
export const runtime = 'edge';

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
    const location = env.GCP_LOCATION || 'us-central1';
    const model = env.VERTEX_MODEL || 'gemini-1.5-pro';

    if (!projectId) {
      return new Response(JSON.stringify({ error: 'Missing GCP_PROJECT_ID' }), { status: 500 });
    }

    const accessTokenResp = await fetch('https://oauth2.googleapis.com/token', { method: 'HEAD' });
    // Comments: In production, obtain ADC on server (workload identity / metadata). For local dev, proxy token via server env.
    const accessToken = process.env.ACCESS_TOKEN;
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Missing ACCESS_TOKEN on server' }), { status: 500 });
    }

    const vertexUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:streamGenerateContent`;

    const upstream = await fetch(vertexUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: String(prompt ?? '') }] }],
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text();
      return new Response(JSON.stringify({ error: 'Upstream error', details: text }), { status: 502 });
    }

    const readable = new ReadableStream({
      start(controller) {
        const reader = upstream.body!.getReader();
        function push() {
          reader.read().then(({ done, value }) => {
            if (done) {
              controller.close();
              return;
            }
            controller.enqueue(value);
            push();
          }).catch((err) => {
            controller.error(err);
          });
        }
        push();
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Unhandled error', details: e?.message }), { status: 500 });
  }
}


