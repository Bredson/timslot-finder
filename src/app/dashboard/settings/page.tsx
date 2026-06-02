"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/firebase/client";
import { doc, setDoc } from "firebase/firestore";
import { Save, CheckCircle, Clock, ShieldAlert, CheckSquare, Square } from "lucide-react";

export default function SettingsPage() {
  const { user, settings, refreshSettings } = useAuth();
  const [slotDuration, setSlotDuration] = useState(30);
  const [minAdvanceValue, setMinAdvanceValue] = useState(2);
  const [minAdvanceUnit, setMinAdvanceUnit] = useState<"hours" | "days">("days");
  
  // Pola formularza rezerwacji
  const [reqPhone, setReqPhone] = useState(true);
  const [reqAddress, setReqAddress] = useState(false);
  const [reqNote, setReqNote] = useState(false);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Inicjalizacja formularza danymi z bazy
  useEffect(() => {
    if (settings) {
      setSlotDuration(settings.slotDuration || 30);
      setMinAdvanceValue(settings.minAdvanceValue || 2);
      setMinAdvanceUnit(settings.minAdvanceUnit || "days");
      setReqPhone(settings.requiredFields?.phone ?? true);
      setReqAddress(settings.requiredFields?.address ?? false);
      setReqNote(settings.requiredFields?.note ?? false);
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setSuccess(false);
    setError("");

    try {
      const userDocRef = doc(db, "users", user.uid);
      const updatedSettings = {
        slotDuration: Number(slotDuration),
        minAdvanceValue: Number(minAdvanceValue),
        minAdvanceUnit,
        requiredFields: {
          name: true, // zawsze obowiązkowe
          email: true, // zawsze obowiązkowe
          phone: reqPhone,
          address: reqAddress,
          note: reqNote
        }
      };

      await setDoc(userDocRef, {
        settings: updatedSettings
      }, { merge: true });

      await refreshSettings();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      console.error(err);
      setError("Wystąpił błąd podczas zapisywania ustawień: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "28px" }}>
      <div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "6px" }}>Ustawienia rezerwacji</h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Skonfiguruj parametry swoich spotkań oraz dane kontaktowe wymagane od umawiających się osób.
        </p>
      </div>

      {success && (
        <div style={{ display: "flex", gap: "10px", alignItems: "center", background: "var(--success-light)", border: "1px solid var(--success)", padding: "16px", borderRadius: "var(--radius-md)", color: "var(--success)", fontWeight: 600 }}>
          <CheckCircle size={20} />
          <span>Ustawienia zostały pomyślnie zaktualizowane!</span>
        </div>
      )}

      {error && (
        <div style={{ display: "flex", gap: "10px", alignItems: "center", background: "var(--danger-light)", border: "1px solid var(--danger)", padding: "16px", borderRadius: "var(--radius-md)", color: "var(--danger)" }}>
          <ShieldAlert size={20} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* Sekcja: Parametry spotkań */}
        <div className="glass" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--card-border)", paddingBottom: "12px" }}>
            <Clock size={20} style={{ color: "var(--accent)" }} />
            Parametry czasu spotkań
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div>
              <label htmlFor="slotDuration">Domyślna długość spotkania</label>
              <select
                id="slotDuration"
                value={slotDuration}
                onChange={(e) => setSlotDuration(Number(e.target.value))}
              >
                <option value={15}>15 minut</option>
                <option value={30}>30 minut</option>
                <option value={45}>45 minut</option>
                <option value={60}>60 minut</option>
                <option value={90}>90 minut</option>
                <option value={120}>120 minut</option>
              </select>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                Bloki dostępności będą dzielone automatycznie na równe sloty o wybranej długości.
              </span>
            </div>

            <div>
              <label htmlFor="minAdvanceValue">Wyprzedzenie rezerwacji</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  id="minAdvanceValue"
                  type="number"
                  min="0"
                  style={{ width: "80px" }}
                  value={minAdvanceValue}
                  onChange={(e) => setMinAdvanceValue(Number(e.target.value))}
                />
                <select
                  value={minAdvanceUnit}
                  onChange={(e) => setMinAdvanceUnit(e.target.value as "hours" | "days")}
                  style={{ flex: 1 }}
                >
                  <option value="hours">Godzin przed spotkaniem</option>
                  <option value="days">Dni przed spotkaniem</option>
                </select>
              </div>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                Określ, z jakim minimalnym wyprzedzeniem ktoś może się umówić (np. najwcześniej 2 dni przed).
              </span>
            </div>
          </div>
        </div>

        {/* Sekcja: Wymagane dane formularza */}
        <div className="glass" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "20px" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--card-border)", paddingBottom: "12px" }}>
            <CheckSquare size={20} style={{ color: "var(--accent)" }} />
            Wymagane dane kontaktowe
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Zaznacz, jakie informacje musi podać osoba rezerwująca wizytę. Imię, nazwisko i adres e-mail są zawsze wymagane.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Pole Imię i E-mail - stałe */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", opacity: 0.7 }}>
              <CheckSquare size={20} style={{ color: "var(--accent)" }} />
              <div>
                <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>Imię i Nazwisko</span>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginLeft: "8px" }}>(Zawsze wymagane)</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", opacity: 0.7 }}>
              <CheckSquare size={20} style={{ color: "var(--accent)" }} />
              <div>
                <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>Adres E-mail</span>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginLeft: "8px" }}>(Zawsze wymagane)</span>
              </div>
            </div>

            {/* Konfigurowalne pola */}
            <div 
              style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}
              onClick={() => setReqPhone(!reqPhone)}
            >
              {reqPhone ? <CheckSquare size={20} style={{ color: "var(--accent)" }} /> : <Square size={20} style={{ color: "var(--text-muted)" }} />}
              <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>Numer telefonu</span>
            </div>

            <div 
              style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}
              onClick={() => setReqAddress(!reqAddress)}
            >
              {reqAddress ? <CheckSquare size={20} style={{ color: "var(--accent)" }} /> : <Square size={20} style={{ color: "var(--text-muted)" }} />}
              <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>Adres zamieszkania</span>
            </div>

            <div 
              style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}
              onClick={() => setReqNote(!reqNote)}
            >
              {reqNote ? <CheckSquare size={20} style={{ color: "var(--accent)" }} /> : <Square size={20} style={{ color: "var(--text-muted)" }} />}
              <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>Dodatkowa notatka / opis</span>
            </div>
          </div>
        </div>

        {/* Przycisk zapisu */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" className="btn btn-primary" style={{ padding: "14px 28px" }} disabled={saving}>
            <Save size={18} />
            {saving ? "Zapisywanie..." : "Zapisz zmiany"}
          </button>
        </div>

      </form>
    </div>
  );
}
