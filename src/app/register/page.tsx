"use client";

import React, { useState, useEffect } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, isConfigured } from "@/firebase/client";
import { useRouter } from "next/navigation";
import { useAuth, initializeUserProfile } from "@/context/AuthContext";
import Link from "next/link";
import { UserPlus, AlertCircle } from "lucide-react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Przekieruj jeśli zalogowany
  useEffect(() => {
    if (!authLoading && user) {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
      setError("Wypełnij wszystkie pola");
      return;
    }

    if (password.length < 6) {
      setError("Hasło musi mieć co najmniej 6 znaków");
      return;
    }

    if (password !== confirmPassword) {
      setError("Hasła nie są identyczne");
      return;
    }

    if (!isConfigured) {
      setError("Konfiguracja Firebase jest niekompletna. Sprawdź plik .env.local.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // 1. Stworzenie konta użytkownika w Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // 2. Inicjalizacja domyślnego profilu i ustawień w Firestore
      await initializeUserProfile(userCredential.user.uid, email);

      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setError("Ten adres e-mail jest już zarejestrowany.");
      } else if (err.code === "auth/invalid-email") {
        setError("Niepoprawny format adresu e-mail.");
      } else if (err.code === "auth/weak-password") {
        setError("Podane hasło jest za słabe.");
      } else {
        setError("Wystąpił błąd podczas rejestracji: " + (err.message || err.code));
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <div className="btn-secondary" style={{ padding: "20px 40px", borderRadius: "var(--radius-md)" }}>
          Ładowanie sesji...
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", padding: "20px" }}>
      <div className="glass" style={{ width: "100%", maxWidth: "440px", padding: "40px", display: "flex", flexDirection: "column", gap: "24px" }}>
        
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "8px", background: "linear-gradient(135deg, var(--text-primary), var(--accent))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Stwórz konto
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Zacznij wygodnie planować i udostępniać swoje terminy
          </p>
        </div>

        {error && (
          <div style={{ display: "flex", gap: "10px", alignItems: "center", background: "var(--danger-light)", border: "1px solid var(--danger)", padding: "12px", borderRadius: "var(--radius-md)", color: "var(--danger)", fontSize: "0.9rem" }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              placeholder="np. jan@kowalski.pl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div>
            <label htmlFor="password">Hasło (min. 6 znaków)</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div>
            <label htmlFor="confirmPassword">Potwierdź hasło</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "100%", height: "48px" }} disabled={loading}>
            {loading ? "Tworzenie konta..." : (
              <>
                <UserPlus size={18} />
                Zarejestruj się
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: "center", fontSize: "0.9rem", color: "var(--text-secondary)", borderTop: "1px solid var(--card-border)", paddingTop: "20px" }}>
          Masz już konto?{" "}
          <Link href="/login" style={{ fontWeight: 600 }}>
            Zaloguj się
          </Link>
        </div>
      </div>
    </div>
  );
}
