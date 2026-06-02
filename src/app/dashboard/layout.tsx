"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { Calendar, Settings, LogOut, LayoutDashboard, User } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
    } catch (error) {
      console.error("Błąd podczas wylogowywania:", error);
    }
  };

  if (loading || !user) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <div className="btn-secondary" style={{ padding: "20px 40px", borderRadius: "var(--radius-md)" }}>
          Weryfikacja autoryzacji...
        </div>
      </div>
    );
  }

  const isActive = (path: string) => pathname === path;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Nagłówek panelu */}
      <header className="glass" style={{
        position: "sticky",
        top: "0",
        zIndex: 100,
        margin: "0",
        borderRadius: "0",
        borderTop: "none",
        borderLeft: "none",
        borderRight: "none",
        padding: "16px 24px",
        background: "var(--card-bg)"
      }}>
        <div className="container" style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            {/* Logo */}
            <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 800, fontSize: "1.2rem" }}>
              <div style={{ background: "var(--accent)", color: "#ffffff", padding: "6px", borderRadius: "var(--radius-md)" }}>
                <Calendar size={18} />
              </div>
              <span style={{ color: "var(--text-primary)" }}>Timeslot Panel</span>
            </Link>

            {/* Nawigacja */}
            <nav style={{ display: "flex", gap: "8px" }}>
              <Link
                href="/dashboard"
                className={`btn ${isActive("/dashboard") ? "btn-primary" : "btn-secondary"}`}
                style={{ padding: "8px 16px", fontSize: "0.88rem" }}
              >
                <LayoutDashboard size={16} />
                Dostępność i Rezerwacje
              </Link>
              <Link
                href="/dashboard/settings"
                className={`btn ${isActive("/dashboard/settings") ? "btn-primary" : "btn-secondary"}`}
                style={{ padding: "8px 16px", fontSize: "0.88rem" }}
              >
                <Settings size={16} />
                Ustawienia
              </Link>
            </nav>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* Dane użytkownika */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "0.85rem",
              background: "var(--card-bg)",
              padding: "6px 12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--card-border)"
            }}>
              <User size={14} style={{ color: "var(--accent)" }} />
              <span style={{ fontWeight: 500, color: "var(--text-secondary)" }}>{user.email}</span>
            </div>

            <ThemeToggle />

            {/* Wyloguj */}
            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{
                padding: "8px 12px",
                color: "var(--danger)",
                borderColor: "rgba(239, 68, 68, 0.2)",
                background: "var(--danger-light)"
              }}
              title="Wyloguj się"
            >
              <LogOut size={16} />
              <span>Wyloguj</span>
            </button>
          </div>
        </div>
      </header>

      {/* Główna zawartość */}
      <main className="container" style={{ flex: 1, padding: "32px 24px" }}>
        {children}
      </main>

      <footer style={{
        padding: "24px",
        textAlign: "center",
        color: "var(--text-muted)",
        fontSize: "0.85rem",
        borderTop: "1px solid var(--card-border)",
        marginTop: "40px"
      }}>
        Panel zarządzania kalendarzem &copy; {new Date().getFullYear()} Timeslot Finder
      </footer>
    </div>
  );
}
