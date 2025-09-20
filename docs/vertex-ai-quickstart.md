# Vertex AI Quickstart (Gemini)

## 1) Set up ADC (local)

- Install: gcloud CLI
- Login: `gcloud auth login`
- Select project: `gcloud config set project <GCP_PROJECT_ID>`
- Issue Application Default Credentials: `gcloud auth application-default login`
- Verify: `gcloud auth application-default print-access-token`

## 2) Minimal cURL example (text)

```bash
ACCESS_TOKEN="$(gcloud auth application-default print-access-token)"
PROJECT_ID="<your-project>"
LOCATION="us-central1"
MODEL="gemini-1.5-pro"

curl -s -X POST \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  "https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent" \
  -d '{
    "contents": [{"role":"user","parts":[{"text":"Say hello from Vertex AI."}]}]
  }' | jq .
```

## 3) Node.js minimal example (JavaScript)

```js
// docs/examples/vertex_gemini_min.js
// Comments: Minimal text generation using Vertex AI Gemini.
async function main() {
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
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

Run:

```bash
export ACCESS_TOKEN="$(gcloud auth application-default print-access-token)"
export GCP_PROJECT_ID="<your-project>"
node docs/examples/vertex_gemini_min.js
```

## 4) Troubleshooting
- 403: Missing IAM perms → grant Vertex AI User
- 404: Wrong model/location → review `MODEL`, `LOCATION`
- Network blocked: check CI/firewall/proxy
