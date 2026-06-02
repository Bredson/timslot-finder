"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { db } from "@/firebase/client";
import { doc, getDoc } from "firebase/firestore";
import { CheckCircle2, Clock, CalendarDays, AlertTriangle, User, Mail, ShieldAlert } from "lucide-react";

interface Booking {
  bookingId: string;
  calendarOwnerId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "pending" | "confirmed" | "cancelled";
  clientData: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    note?: string;
  };
}

export default function ConfirmBookingPage() {
  const { bookingId } = useParams() as { bookingId: string };
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [confirming, setConfirming] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!bookingId) return;

    const fetchBooking = async () => {
      try {
        setLoading(true);
        setError("");

        const bookingDocRef = doc(db, "bookings", bookingId);
        const bookingSnap = await getDoc(bookingDocRef);

        if (!bookingSnap.exists()) {
          setError("Podana rezerwacja nie istnieje lub wygasła.");
          return;
        }

        const data = bookingSnap.data() as Booking;
        setBooking(data);

        if (data.status === "confirmed") {
          setSuccessMessage("To spotkanie zostało już wcześniej potwierdzone.");
        }
      } catch (err: any) {
        console.error(err);
        setError("Wystąpił błąd podczas pobierania danych rezerwacji: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  const handleConfirm = async () => {
    if (!bookingId) return;
    
    setConfirming(true);
    setError("");

    try {
      const response = await fetch("/api/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId })
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || "Nie udało się zatwierdzić spotkania.");
      }

      setSuccessMessage("Wizyta została zatwierdzona pomyślnie!");
      setBooking((prev) => prev ? { ...prev, status: "confirmed" } : null);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <div className="btn-secondary" style={{ padding: "20px 40px", borderRadius: "var(--radius-md)" }}>
          Wyszukiwanie szczegółów rezerwacji...
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", padding: "20px" }}>
      <div className="glass" style={{ width: "100%", maxWidth: "550px", padding: "40px", display: "flex", flexDirection: "column", gap: "28px" }}>
        
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "8px", background: "linear-gradient(135deg, var(--text-primary), var(--accent))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Potwierdzenie Spotkania
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Zatwierdź lub sprawdź status rezerwacji wysłanej przez klienta.
          </p>
        </div>

        {error && (
          <div style={{ display: "flex", gap: "10px", alignItems: "center", background: "var(--danger-light)", border: "1px solid var(--danger)", padding: "16px", borderRadius: "var(--radius-md)", color: "var(--danger)", fontSize: "0.95rem" }}>
            <ShieldAlert size={20} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div style={{ display: "flex", gap: "10px", alignItems: "center", background: "var(--success-light)", border: "1px solid var(--success)", padding: "16px", borderRadius: "var(--radius-md)", color: "var(--success)", fontWeight: 600, fontSize: "0.95rem" }}>
            <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        {booking && (
          <>
            {/* Szczegóły spotkania */}
            <div className="glass" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px", background: "var(--bg-primary)" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--card-border)", paddingBottom: "8px", marginBottom: "4px" }}>
                Szczegóły terminu
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 700, fontSize: "1.05rem" }}>
                <CalendarDays size={18} style={{ color: "var(--accent)" }} />
                <span>{booking.date}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-secondary)", fontSize: "0.95rem", fontWeight: 600 }}>
                <Clock size={16} />
                <span>{booking.startTime} - {booking.endTime}</span>
              </div>
            </div>

            {/* Dane klienta */}
            <div className="glass" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px", background: "var(--bg-primary)" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--card-border)", paddingBottom: "8px", marginBottom: "4px" }}>
                Klient
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.95rem", fontWeight: 600 }}>
                <User size={16} style={{ color: "var(--accent)" }} />
                <span>{booking.clientData.name}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                <Mail size={16} />
                <span>{booking.clientData.email}</span>
              </div>
              {booking.clientData.phone && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  <span style={{ fontWeight: 600 }}>Telefon:</span>
                  <span>{booking.clientData.phone}</span>
                </div>
              )}
              {booking.clientData.address && (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  <span style={{ fontWeight: 600 }}>Adres:</span>
                  <span>{booking.clientData.address}</span>
                </div>
              )}
              {booking.clientData.note && (
                <div style={{ fontSize: "0.85rem", background: "var(--bg-secondary)", padding: "10px 14px", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)", border: "1px solid var(--card-border)", marginTop: "4px" }}>
                  <strong>Notatka od klienta:</strong> &quot;{booking.clientData.note}&quot;
                </div>
              )}
            </div>

            {/* Status i Przycisk Potwierdzenia */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px" }}>
              {booking.status === "pending" ? (
                <button
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="btn btn-primary"
                  style={{ width: "100%", height: "48px", background: "var(--success)" }}
                >
                  {confirming ? "Potwierdzanie..." : "Potwierdź spotkanie i wyślij e-mail"}
                </button>
              ) : booking.status === "confirmed" ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "var(--success)", fontWeight: 700, fontSize: "1.1rem", padding: "12px", border: "2px solid var(--success)", borderRadius: "var(--radius-md)", background: "var(--success-light)" }}>
                  <CheckCircle2 size={20} />
                  Spotkanie zostało potwierdzone
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "var(--danger)", fontWeight: 700, fontSize: "1.1rem", padding: "12px", border: "2px solid var(--danger)", borderRadius: "var(--radius-md)", background: "var(--danger-light)" }}>
                  <AlertTriangle size={20} />
                  Spotkanie zostało anulowane
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
