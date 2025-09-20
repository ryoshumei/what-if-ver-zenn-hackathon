// Comments: Minimal text generation using Vertex AI Gemini.
(async function main() {
  const accessToken = process.env.ACCESS_TOKEN; // or via gcloud ADC call
  const projectId = process.env.GCP_PROJECT_ID;
  const location = process.env.GCP_LOCATION || 'us-central1';
  const model = process.env.VERTEX_MODEL || 'gemini-1.5-pro';

  if (!accessToken || !projectId) {
    throw new Error('ACCESS_TOKEN and GCP_PROJECT_ID are required');
  }

  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        { role: 'user', parts: [{ text: 'Say hello from Vertex AI (Node).' }] },
      ],
    }),
  });
  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});


