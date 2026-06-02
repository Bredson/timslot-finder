"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import { Calendar, Shield, Share2, Mail, CheckCircle2, ArrowRight } from "lucide-react";

export default function Home() {
  const { user } = useAuth();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Nagłówek */}
      <header className="glass" style={{
        position: "sticky",
        top: "20px",
        margin: "20px auto 0",
        width: "calc(100% - 40px)",
        maxWidth: "1200px",
        padding: "16px 32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 10,
        borderRadius: "var(--radius-lg)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 800, fontSize: "1.25rem" }}>
          <div style={{
            background: "var(--accent)",
            color: "#ffffff",
            padding: "8px",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <Calendar size={20} />
          </div>
          <span style={{ background: "linear-gradient(135deg, var(--text-primary), var(--accent))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Timeslot Finder
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <ThemeToggle />
          {user ? (
            <Link href="/dashboard" className="btn btn-primary">
              Mój Panel
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-secondary">
                Zaloguj się
              </Link>
              <Link href="/register" className="btn btn-primary">
                Zarejestruj się
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="container" style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 24px",
        textAlign: "center",
        gap: "40px"
      }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          background: "var(--accent-light)",
          color: "var(--accent)",
          padding: "8px 16px",
          borderRadius: "var(--radius-full)",
          fontSize: "0.9rem",
          fontWeight: 600
        }}>
          <span>🚀 Nowy, inteligentny system rezerwacji spotkań</span>
        </div>

        <h1 style={{
          fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
          fontWeight: 900,
          lineHeight: 1.1,
          maxWidth: "900px",
          background: "linear-gradient(135deg, var(--text-primary) 30%, var(--accent) 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          letterSpacing: "-0.02em"
        }}>
          Znajdź idealny termin bez dziesiątek maili
        </h1>

        <p style={{
          fontSize: "clamp(1.1rem, 2vw, 1.35rem)",
          color: "var(--text-secondary)",
          maxWidth: "650px",
          lineHeight: 1.6
        }}>
          Udostępnij swój kalendarz innym. Pozwól klientom i współpracownikom samodzielnie rezerwować wolne sloty z automatycznym powiadomieniem e-mail.
        </p>

        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
          {user ? (
            <Link href="/dashboard" className="btn btn-primary" style={{ padding: "16px 32px", fontSize: "1.05rem" }}>
              Przejdź do kalendarza
              <ArrowRight size={20} />
            </Link>
          ) : (
            <>
              <Link href="/register" className="btn btn-primary" style={{ padding: "16px 32px", fontSize: "1.05rem" }}>
                Rozpocznij bezpłatnie
                <ArrowRight size={20} />
              </Link>
              <Link href="/login" className="btn btn-secondary" style={{ padding: "16px 32px", fontSize: "1.05rem" }}>
                Zobacz demo
              </Link>
            </>
          )}
        </div>

        {/* Features Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "24px",
          width: "100%",
          maxWidth: "1100px",
          marginTop: "60px"
        }}>
          <div className="glass" style={{ padding: "32px", textAlign: "left", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ color: "var(--accent)", background: "var(--accent-light)", width: "48px", height: "48px", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Calendar size={24} />
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Elastyczne Bloki</h3>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.5, fontSize: "0.95rem" }}>
              Definiuj stałe godziny dostępności w tygodniu oraz ręcznie dodawaj lub usuwaj konkretne bloki w interaktywnym kalendarzu.
            </p>
          </div>

          <div className="glass" style={{ padding: "32px", textAlign: "left", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ color: "var(--success)", background: "var(--success-light)", width: "48px", height: "48px", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Share2 size={24} />
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Osadzanie na Stronie</h3>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.5, fontSize: "0.95rem" }}>
              Wygeneruj bezpieczny i odizolowany kod ramki <code>iframe</code>, aby łatwo wkleić formularz rezerwacji na swoją własną witrynę.
            </p>
          </div>

          <div className="glass" style={{ padding: "32px", textAlign: "left", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ color: "var(--warning)", background: "rgba(245, 158, 11, 0.1)", width: "48px", height: "48px", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Mail size={24} />
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Powiadomienia E-mail</h3>
            <p style={{ color: "var(--text-secondary)", lineHeight: 1.5, fontSize: "0.95rem" }}>
              Otrzymuj natychmiastowe maile o nowych rezerwacjach. Akceptuj terminy bezpośrednio za pomocą bezpiecznego linku w wiadomości.
            </p>
          </div>
        </div>
      </main>

      {/* Stopka */}
      <footer style={{
        padding: "40px 24px",
        textAlign: "center",
        color: "var(--text-secondary)",
        fontSize: "0.9rem",
        borderTop: "1px solid var(--card-border)",
        marginTop: "80px"
      }}>
        <p>&copy; {new Date().getFullYear()} Timeslot Finder. Wszelkie prawa zastrzeżone.</p>
      </footer>
    </div>
  );
}
