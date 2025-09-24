import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize only in browser with valid config to avoid build-time errors
const isBrowser = typeof window !== "undefined";
const hasApiKey = !!firebaseConfig.apiKey;
const app =
  isBrowser && hasApiKey
    ? getApps().length === 0
      ? initializeApp(firebaseConfig)
      : getApps()[0]
    : undefined;

// Export services lazily-safe for SSR/build (will be proper instances in browser)
export const auth = app ? getAuth(app) : ({} as unknown as ReturnType<typeof getAuth>);
export const db = app ? getFirestore(app) : ({} as unknown as ReturnType<typeof getFirestore>);
export const storage = app ? getStorage(app) : ({} as unknown as ReturnType<typeof getStorage>);

export { app };
