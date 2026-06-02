import { initializeApp, getApps, cert, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

function formatPrivateKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  let formatted = key.trim();
  // Usuń ewentualne cudzysłowy z początku i końca (częsty przypadek przy kopiowaniu klucza)
  if (formatted.startsWith('"') && formatted.endsWith('"')) {
    formatted = formatted.substring(1, formatted.length - 1);
  }
  if (formatted.startsWith("'") && formatted.endsWith("'")) {
    formatted = formatted.substring(1, formatted.length - 1);
  }
  // Zamień znaki \n na prawdziwe nowe linie
  return formatted.replace(/\\n/g, "\n");
}

const hasAdminCredentials = !!projectId && !!clientEmail && !!privateKey;

let app;
if (getApps().length === 0) {
  if (hasAdminCredentials) {
    try {
      const formattedKey = formatPrivateKey(privateKey);
      
      // Diagnostyka bezpieczeństwa (widoczna w logach builda Vercel)
      console.log("Firebase Admin Init Diagnostics:", {
        projectId,
        clientEmail,
        hasKey: !!privateKey,
        keyLength: privateKey ? privateKey.length : 0,
        formattedKeyLength: formattedKey ? formattedKey.length : 0,
        startsWithHeader: formattedKey ? formattedKey.startsWith("-----BEGIN PRIVATE KEY-----") : false,
        endsWithFooter: formattedKey ? (formattedKey.endsWith("-----END PRIVATE KEY-----") || formattedKey.endsWith("-----END PRIVATE KEY-----\n") || formattedKey.endsWith("-----END PRIVATE KEY-----\r\n")) : false,
      });

      app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: formattedKey,
        }),
      });
    } catch (err: any) {
      console.error("CRITICAL ERROR: Failed to initialize Firebase Admin SDK!");
      console.error("Error details:", err.message || err);
      
      if (privateKey) {
        const start = privateKey.substring(0, 30);
        const end = privateKey.substring(Math.max(0, privateKey.length - 30));
        console.error(`Raw Private Key snippet: "${start}...${end}"`);
      }
      throw err;
    }
  } else {
    // Fallback dla lokalnego developmentu (np. jeśli używamy Firebase Emulator lub lokalnej konfiguracji gcloud)
    app = initializeApp({
      projectId: projectId || "timeslot-finder-mock",
    });
    if (process.env.NODE_ENV === "production") {
      console.warn("Wymagana jest pełna konfiguracja Firebase Admin w środowisku produkcyjnym!");
    }
  }
} else {
  app = getApp();
}

const adminDb = getFirestore(app);
const adminAuth = getAuth(app);

export { app as adminApp, adminDb, adminAuth, hasAdminCredentials };
