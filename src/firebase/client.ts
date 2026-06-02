import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

function cleanEnvValue(value: string | undefined): string | undefined {
  if (!value) return undefined;
  let val = value.trim();
  
  while (
    val.startsWith('"') || val.startsWith("'") || 
    val.endsWith('"') || val.endsWith("'") || val.endsWith(',')
  ) {
    if (val.startsWith('"') || val.startsWith("'")) {
      val = val.substring(1);
    }
    if (val.endsWith('"') || val.endsWith("'") || val.endsWith(',')) {
      val = val.substring(0, val.length - 1);
    }
    val = val.trim();
  }
  return val;
}

const isConfigured = typeof window !== "undefined"
  ? !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  : !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

// Jeśli nie jesteśmy skonfigurowani (np. podczas builda bez zmiennych środowiskowych),
// używamy atrap danych, aby Firebase SDK nie rzuciło wyjątku 'auth/invalid-api-key' i nie zepsuło buildu.
const firebaseConfig = isConfigured
  ? {
      apiKey: cleanEnvValue(process.env.NEXT_PUBLIC_FIREBASE_API_KEY) || "",
      authDomain: cleanEnvValue(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) || "",
      projectId: cleanEnvValue(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) || "",
      storageBucket: cleanEnvValue(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) || "",
      messagingSenderId: cleanEnvValue(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) || "",
      appId: cleanEnvValue(process.env.NEXT_PUBLIC_FIREBASE_APP_ID) || "",
    }
  : {
      apiKey: "dummy-api-key-for-build-purposes",
      authDomain: "dummy-auth-domain.firebaseapp.com",
      projectId: "dummy-project-id",
      storageBucket: "dummy-storage-bucket.appspot.com",
      messagingSenderId: "123456789",
      appId: "1:123456789:web:dummy-app-id",
    };

if (!isConfigured && typeof window !== "undefined") {
  console.warn(
    "Firebase API Key is missing. Please configure your environment variables in .env.local"
  );
}

// Inicjalizacja Firebase (zapobiegamy podwójnej inicjalizacji w Next.js HMR)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db, isConfigured };
