import { initializeApp, getApps, cert, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

function formatPrivateKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  
  let formatted = key.trim();
  
  // Usuń cudzysłowy (częsty błąd przy kopiowaniu z JSON)
  if (formatted.startsWith('"') && formatted.endsWith('"')) {
    formatted = formatted.substring(1, formatted.length - 1);
  }
  if (formatted.startsWith("'") && formatted.endsWith("'")) {
    formatted = formatted.substring(1, formatted.length - 1);
  }
  
  // Zamień tekstowe \n na prawdziwe znaki nowej linii
  formatted = formatted.replace(/\\n/g, "\n");
  
  const header = "-----BEGIN PRIVATE KEY-----";
  const footer = "-----END PRIVATE KEY-----";
  
  // Jeśli klucz zawiera nagłówek i stopkę, rekonstruujemy go do idealnego formatu PEM
  // (rozwiązuje to problemy ze spłaszczeniem klucza do jednej linii lub niepoprawnymi spacjami na Vercelu)
  if (formatted.includes(header) && formatted.includes(footer)) {
    // Wyciągamy samą zawartość base64 klucza (bez nagłówka, stopki i jakichkolwiek białych znaków)
    const base64Content = formatted
      .replace(header, "")
      .replace(footer, "")
      .replace(/\s+/g, ""); // usuwa spacje, taby, nowe linie
      
    // Dzielimy zawartość base64 na standardowe linie o długości 64 znaków
    const chunks = [];
    for (let i = 0; i < base64Content.length; i += 64) {
      chunks.push(base64Content.slice(i, i + 64));
    }
    
    // Zwracamy idealnie sformatowany klucz PEM PKCS#8
    return `${header}\n${chunks.join("\n")}\n${footer}\n`;
  }
  
  return formatted;
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
