// Test environment setup
process.env.NODE_ENV = 'test';

// Mock required environment variables
process.env.GCP_PROJECT_ID = 'test-project';
process.env.GCP_LOCATION = 'us-central1';
process.env.VERTEX_CHAT_MODEL = 'gemini-2.5-flash';
process.env.VERTEX_PLAN_MODEL = 'gemini-2.5-flash';
process.env.VERTEX_IMAGE_MODEL = 'imagen-4.0-generate-001';
process.env.VERTEX_VIDEO_MODEL = 'veo-3.0-fast-generate-001';
process.env.VERTEX_VIDEO_LRO_MODE = 'mock';
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test.appspot.com';
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = 'test-app-id';

// Prevent actual network calls in tests
global.fetch = globalThis.fetch = undefined as any;

// Mock Vertex AI adapter
import { vi } from 'vitest';

vi.mock('../src/lib/adapters/vertex', () => ({
  vertexAdapter: {
    chat: vi.fn().mockImplementation(({ prompt }: { prompt: string }) => {
      // Handle different types of LLM calls
      if (prompt.includes('confidence score between 0.0 and 1.0')) {
        // Confidence evaluation - return varying scores based on prompt length
        const promptMatch = prompt.match(/Prompt to evaluate: "(.*?)"/);
        const evaluatedPrompt = promptMatch ? promptMatch[1] : '';
        const confidence = evaluatedPrompt.length > 50 ? '0.8' : '0.6';
        return Promise.resolve({ text: confidence });
      }

      if (prompt.includes('improvement suggestions')) {
        // Suggestions generation - return JSON array
        return Promise.resolve({
          text: '["Add more lighting details", "Specify camera angle", "Include color descriptions"]'
        });
      }

      if (prompt.includes('incorporating the provided suggestions')) {
        // Prompt refinement with suggestions
        const promptMatch = prompt.match(/Current prompt: "(.*?)"/);
        const originalPrompt = promptMatch ? promptMatch[1] : 'test prompt';
        return Promise.resolve({
          text: `${originalPrompt}, with enhanced lighting, professional camera angle, and vivid colors`
        });
      }

      // Default enhancement behavior
      const match = prompt.match(/User prompt: "(.*?)"/);
      const userPrompt = match ? match[1] : 'test prompt';
      return Promise.resolve({
        text: `${userPrompt}, highly detailed, photorealistic`
      });
    }),
    generateImage: vi.fn().mockResolvedValue({
      success: true,
      imageUrl: 'data:image/png;base64,mockdata'
    }),
    generateVideo: vi.fn().mockResolvedValue({
      success: true,
      jobId: 'mock-job-id'
    }),
    pollJobStatus: vi.fn().mockResolvedValue({
      status: 'complete',
      result: { urls: ['gs://mock-bucket/video.mp4'] }
    })
  }
}));