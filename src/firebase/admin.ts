import { initializeApp, getApps, cert, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

const hasAdminCredentials = !!projectId && !!clientEmail && !!privateKey;

let app;
if (getApps().length === 0) {
  if (hasAdminCredentials) {
    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        // Zastępujemy znaki nowej linii, które mogą być w pliku .env
        privateKey: privateKey!.replace(/\\n/g, "\n"),
      }),
    });
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
