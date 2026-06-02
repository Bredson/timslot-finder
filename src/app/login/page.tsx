"use client";

import React, { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, isConfigured } from "@/firebase/client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { LogIn, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    if (!email || !password) {
      setError("Wypełnij wszystkie pola");
      return;
    }

    if (!isConfigured) {
      setError("Konfiguracja Firebase jest niekompletna. Sprawdź plik .env.local.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("Błędny e-mail lub hasło.");
      } else {
        setError("Wystąpił błąd podczas logowania: " + (err.message || err.code));
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
            Zaloguj się
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Zarządzaj swoimi spotkaniami i dostępnością
          </p>
        </div>

        {error && (
          <div style={{ display: "flex", gap: "10px", alignItems: "center", background: "var(--danger-light)", border: "1px solid var(--danger)", padding: "12px", borderRadius: "var(--radius-md)", color: "var(--danger)", fontSize: "0.9rem" }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {!isConfigured && (
          <div style={{ display: "flex", gap: "10px", alignItems: "center", background: "var(--warning)", color: "#000", padding: "12px", borderRadius: "var(--radius-md)", fontSize: "0.9rem" }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span><strong>Uwaga:</strong> Brak skonfigurowanych zmiennych środowiskowych Firebase! Skopiuj plik .env.local.example do .env.local i wypełnij go.</span>
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
            <label htmlFor="password">Hasło</label>
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

          <button type="submit" className="btn btn-primary" style={{ width: "100%", height: "48px" }} disabled={loading}>
            {loading ? "Logowanie..." : (
              <>
                <LogIn size={18} />
                Zaloguj się
              </>
            )}
          </button>
        </form>

        <div style={{ textAlign: "center", fontSize: "0.9rem", color: "var(--text-secondary)", borderTop: "1px solid var(--card-border)", paddingTop: "20px" }}>
          Nie masz jeszcze konta?{" "}
          <Link href="/register" style={{ fontWeight: 600 }}>
            Zarejestruj się bezpłatnie
          </Link>
        </div>
      </div>
    </div>
  );
}
