import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { getEnv } from "../config/env";

let adminApp: ReturnType<typeof initializeApp> | null = null;

function getAdminApp() {
  if (adminApp) {
    return adminApp;
  }

  const env = getEnv();

  // Check if app is already initialized
  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    return adminApp;
  }

  try {
    // For production, use Application Default Credentials (ADC)
    // For development, you may need to set GOOGLE_APPLICATION_CREDENTIALS
    adminApp = initializeApp({
      projectId: env.GCP_PROJECT_ID,
      storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
    throw error;
  }

  return adminApp;
}

// Lazy initialization of services
export function getAdminFirestore() {
  return getFirestore(getAdminApp());
}

export function getAdminStorage() {
  return getStorage(getAdminApp());
}

export { getAdminApp };
