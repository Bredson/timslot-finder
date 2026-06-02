"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { db } from "@/firebase/client";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { CalendarDays, Clock, User, Phone, MapPin, FileText, CheckCircle2, AlertCircle } from "lucide-react";

interface RequiredFields {
  name: boolean;
  email: boolean;
  phone: boolean;
  address: boolean;
  note: boolean;
}

interface WeeklyHours {
  enabled: boolean;
  start: string;
  end: string;
}

interface UserSettings {
  slotDuration: number;
  minAdvanceValue: number;
  minAdvanceUnit: "hours" | "days";
  requiredFields: RequiredFields;
  weeklyHours: {
    [key: string]: WeeklyHours;
  };
}

interface OwnerData {
  email: string;
  settings: UserSettings;
}

interface Booking {
  date: string;
  startTime: string;
  endTime: string;
  status: string;
}

interface Override {
  date: string;
  type: "add_block" | "unavailable_day";
  blocks?: Array<{ start: string; end: string }>;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  isBooked: boolean;
  isPastThreshold: boolean;
}

const DAYS_OF_WEEK = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export default function EmbedBookingPage() {
  const { userId } = useParams() as { userId: string };
  const [owner, setOwner] = useState<OwnerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Stan rezerwacji
  const [selectedDateStr, setSelectedDateStr] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);

  // Dane formularza
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState("");

  // Załaduj dane kalendarza i ustawienia właściciela
  useEffect(() => {
    if (!userId) return;

    const fetchOwnerAndData = async () => {
      try {
        setLoading(true);
        setError("");

        // 1. Pobierz ustawienia właściciela
        const ownerDocRef = doc(db, "users", userId);
        const ownerSnap = await getDoc(ownerDocRef);
        
        if (!ownerSnap.exists()) {
          setError("Kalendarz o podanym identyfikatorze nie istnieje.");
          setLoading(false);
          return;
        }

        const ownerData = ownerSnap.data() as OwnerData;
        setOwner(ownerData);

        // 2. Pobierz rezerwacje właściciela
        const bookingsQuery = query(
          collection(db, "bookings"),
          where("calendarOwnerId", "==", userId),
          where("status", "in", ["pending", "confirmed"])
        );
        const bookingsSnap = await getDocs(bookingsQuery);
        const bookingsList: Booking[] = [];
        bookingsSnap.forEach((doc) => {
          bookingsList.push(doc.data() as Booking);
        });
        setExistingBookings(bookingsList);

        // 3. Pobierz wyjątki (Overrides)
        const overridesSnap = await getDocs(collection(db, "users", userId, "availabilityOverrides"));
        const overridesList: Override[] = [];
        overridesSnap.forEach((doc) => {
          overridesList.push(doc.data() as Override);
        });
        setOverrides(overridesList);

      } catch (err: any) {
        console.error(err);
        setError("Wystąpił błąd podczas ładowania kalendarza: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOwnerAndData();
  }, [userId]);

  // Generuj sloty po wybraniu daty
  useEffect(() => {
    if (!selectedDateStr || !owner) return;

    const generateSlots = () => {
      const dateParts = selectedDateStr.split("-");
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1;
      const day = parseInt(dateParts[2]);
      const dateObj = new Date(year, month, day);
      
      const dayName = DAYS_OF_WEEK[dateObj.getDay()];
      const settings = owner.settings;

      // 1. Sprawdź, czy dzień jest zablokowany w wyjątkach
      const dateOverride = overrides.find(o => o.date === selectedDateStr);
      if (dateOverride?.type === "unavailable_day") {
        setSlots([]);
        return;
      }

      // 2. Ustal aktywne bloki godzin (hybryda)
      let activeBlocks: Array<{ start: string; end: string }> = [];

      if (dateOverride?.type === "add_block" && dateOverride.blocks) {
        // Używamy nadpisanego bloku godzin dla tego konkretnego dnia
        activeBlocks = dateOverride.blocks;
      } else {
        // Używamy domyślnych godzin tygodniowych
        const weeklyInfo = settings.weeklyHours?.[dayName];
        if (weeklyInfo?.enabled) {
          activeBlocks = [{ start: weeklyInfo.start, end: weeklyInfo.end }];
        }
      }

      if (activeBlocks.length === 0) {
        setSlots([]);
        return;
      }

      // 3. Podziel bloki na sloty o długości slotDuration
      const generatedSlots: TimeSlot[] = [];
      const duration = settings.slotDuration;
      const now = new Date();

      // Obliczenie progu czasowego na podstawie ustawienia wyprzedzenia
      const advanceMs = settings.minAdvanceUnit === "days"
        ? settings.minAdvanceValue * 24 * 60 * 60 * 1000
        : settings.minAdvanceValue * 60 * 60 * 1000;
      const thresholdTime = now.getTime() + advanceMs;

      const parseTimeToMinutes = (t: string) => {
        const parts = t.split(":");
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
      };

      const formatMinutesToTime = (min: number) => {
        const h = String(Math.floor(min / 60)).padStart(2, "0");
        const m = String(min % 60).padStart(2, "0");
        return `${h}:${m}`;
      };

      activeBlocks.forEach((block) => {
        const startMin = parseTimeToMinutes(block.start);
        const endMin = parseTimeToMinutes(block.end);

        for (let curr = startMin; curr + duration <= endMin; curr += duration) {
          const slotStartStr = formatMinutesToTime(curr);
          const slotEndStr = formatMinutesToTime(curr + duration);

          // Walidacja wyprzedzenia (w odniesieniu do daty/czasu slotu)
          const slotDateObj = new Date(year, month, day);
          const slotStartParts = slotStartStr.split(":");
          slotDateObj.setHours(parseInt(slotStartParts[0]), parseInt(slotStartParts[1]), 0, 0);

          const isPastThreshold = slotDateObj.getTime() < thresholdTime;

          // Walidacja czy slot jest już zarezerwowany
          const isBooked = existingBookings.some(
            b => b.date === selectedDateStr && b.startTime === slotStartStr
          );

          generatedSlots.push({
            startTime: slotStartStr,
            endTime: slotEndStr,
            isBooked,
            isPastThreshold
          });
        }
      });

      setSlots(generatedSlots);
    };

    generateSlots();
    setSelectedSlot(null);
  }, [selectedDateStr, owner, existingBookings, overrides]);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonthIndex = (date: Date) => {
    const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return day === 0 ? 6 : day - 1; // Poniedziałek = 0, Niedziela = 6
  };

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const selectDate = (day: number) => {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    setSelectedDateStr(`${y}-${m}-${d}`);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDayIndex = getFirstDayOfMonthIndex(currentDate);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const cells = [];

    // Puste przed początkiem miesiąca
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<div key={`empty-${i}`} style={{ aspectRatio: "1.2/1" }}></div>);
    }

    // Komórki dni
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const isSelected = selectedDateStr === dateStr;

      // Sprawdź czy dzień jest zamknięty w wyjątkach
      const isClosed = overrides.some(o => o.date === dateStr && o.type === "unavailable_day");

      // Sprawdź czy dzień jest weekendem
      const dateObj = new Date(year, month, day);
      const dayName = DAYS_OF_WEEK[dateObj.getDay()];
      const isDefaultClosed = !owner?.settings?.weeklyHours?.[dayName]?.enabled;
      
      const isPastDay = new Date(year, month, day, 23, 59, 59) < new Date();

      const isUnavailable = isClosed || (isDefaultClosed && !overrides.some(o => o.date === dateStr && o.type === "add_block")) || isPastDay;

      cells.push(
        <button
          key={`day-${day}`}
          onClick={() => !isUnavailable && selectDate(day)}
          disabled={isUnavailable}
          style={{
            aspectRatio: "1.2/1",
            border: isSelected ? "2px solid var(--accent)" : "1px solid var(--card-border)",
            borderRadius: "var(--radius-sm)",
            background: isSelected 
              ? "var(--accent-light)" 
              : isUnavailable 
                ? "var(--bg-primary)" 
                : "var(--bg-secondary)",
            color: isUnavailable ? "var(--text-muted)" : "var(--text-primary)",
            cursor: isUnavailable ? "not-allowed" : "pointer",
            fontWeight: isSelected ? 700 : 500,
            fontSize: "0.9rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            opacity: isUnavailable ? 0.4 : 1,
            transition: "all var(--transition-fast)"
          }}
        >
          {day}
        </button>
      );
    }

    return cells;
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDateStr || !selectedSlot || !owner) return;

    setBookingLoading(true);
    setBookingError("");

    try {
      const clientData: any = {
        name,
        email
      };

      if (owner.settings.requiredFields.phone) {
        if (!phone) throw new Error("Numer telefonu jest wymagany.");
        clientData.phone = phone;
      }
      if (owner.settings.requiredFields.address) {
        if (!address) throw new Error("Adres jest wymagany.");
        clientData.address = address;
      }
      if (owner.settings.requiredFields.note) {
        clientData.note = note;
      }

      const response = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarOwnerId: userId,
          date: selectedDateStr,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          clientData
        })
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || "Wystąpił błąd rezerwacji.");
      }

      setBookingSuccess(true);
    } catch (err: any) {
      console.error(err);
      setBookingError(err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "300px", color: "var(--text-secondary)" }}>
        Ładowanie kalendarza...
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass" style={{ padding: "24px", color: "var(--danger)", background: "var(--danger-light)", border: "1px solid var(--danger)", margin: "20px", display: "flex", gap: "10px", alignItems: "center" }}>
        <AlertCircle size={20} />
        <span>{error}</span>
      </div>
    );
  }

  if (bookingSuccess) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "40px 20px" }}>
        <div className="glass" style={{ width: "100%", maxWidth: "500px", padding: "40px", textAlign: "center", display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ color: "var(--success)", display: "flex", justifyContent: "center" }}>
            <CheckCircle2 size={64} />
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Termin został zarezerwowany!</h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Dziękujemy! Twoja rezerwacja została wysłana do potwierdzenia. Właściciel kalendarza otrzymał powiadomienie e-mail i wkrótce zatwierdzi termin.
          </p>
          <div style={{ borderTop: "1px solid var(--card-border)", paddingTop: "20px", marginTop: "10px", fontSize: "0.95rem", textAlign: "left", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div>📅 Data: <strong>{selectedDateStr}</strong></div>
            <div>⏰ Godzina: <strong>{selectedSlot?.startTime} - {selectedSlot?.endTime}</strong></div>
            <div>👤 Dane: <strong>{name}</strong> ({email})</div>
          </div>
          <button 
            onClick={() => {
              setBookingSuccess(false);
              setSelectedSlot(null);
              setName("");
              setEmail("");
              setPhone("");
              setAddress("");
              setNote("");
              // Przeładuj okno, aby zaciągnąć nowo zablokowany slot
              window.location.reload();
            }} 
            className="btn btn-primary"
            style={{ marginTop: "10px" }}
          >
            Umów kolejne spotkanie
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", padding: "12px", minHeight: "100vh", display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* Nagłówek dla umawiającego się */}
      <div style={{ borderBottom: "1px solid var(--card-border)", paddingBottom: "16px" }}>
        <h1 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: "4px" }}>Zarezerwuj termin spotkania</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          Wybierz dogodny dzień oraz godzinę z kalendarza poniżej.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start", flexWrap: "wrap" }}>
        
        {/* Kolumna 1: Kalendarz Wyboru Daty */}
        <div className="glass" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
              {currentDate.toLocaleString("pl-PL", { month: "long", year: "numeric" }).toUpperCase()}
            </span>
            <div style={{ display: "flex", gap: "4px" }}>
              <button onClick={() => changeMonth(-1)} className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "0.75rem" }}>&lt;</button>
              <button onClick={() => changeMonth(1)} className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "0.75rem" }}>&gt;</button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px", textAlign: "center", fontWeight: 600, fontSize: "0.75rem", color: "var(--text-muted)" }}>
            <div>Pn</div><div>Wt</div><div>Śr</div><div>Cz</div><div>Pi</div><div>So</div><div>Nd</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px" }}>
            {renderCalendar()}
          </div>
        </div>

        {/* Kolumna 2: Sloty na dany dzień */}
        <div className="glass" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", minHeight: "260px" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
            <Clock size={16} style={{ color: "var(--accent)" }} />
            Dostępne godziny: {selectedDateStr || "(Wybierz dzień)"}
          </h3>

          {!selectedDateStr ? (
            <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Kliknij datę na kalendarzu po lewej stronie, aby wyświetlić wolne sloty.
            </div>
          ) : slots.length === 0 ? (
            <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Brak wolnych terminów w tym dniu. Wybierz inny dzień.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "10px" }}>
              {slots.map((slot, idx) => {
                const isSelected = selectedSlot?.startTime === slot.startTime;
                
                // Sprawdzamy czy slot jest wyłączony z powodu wyprzedzenia lub rezerwacji
                const isUnavailable = slot.isPastThreshold;
                const isBooked = slot.isBooked;

                if (isBooked) {
                  return (
                    <div
                      key={`slot-${idx}`}
                      className="hatched-pattern"
                      style={{
                        padding: "10px 8px",
                        textAlign: "center",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        border: "1px solid var(--card-border)",
                        minHeight: "42px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                      title="Termin niedostępny"
                    >
                      {slot.startTime}
                    </div>
                  );
                }

                if (isUnavailable) {
                  return null; // Po prostu ukrywamy sloty, które naruszają zasadę wyprzedzenia
                }

                return (
                  <button
                    key={`slot-${idx}`}
                    onClick={() => setSelectedSlot(slot)}
                    style={{
                      padding: "10px 8px",
                      borderRadius: "var(--radius-sm)",
                      border: isSelected ? "2px solid var(--accent)" : "1px solid var(--card-border)",
                      background: isSelected ? "var(--accent)" : "var(--bg-secondary)",
                      color: isSelected ? "#ffffff" : "var(--text-primary)",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all var(--transition-fast)"
                    }}
                  >
                    {slot.startTime}
                  </button>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Formularz Rezerwacji Spotkania (widoczny po zaznaczeniu slotu) */}
      {selectedSlot && (
        <div className="glass" style={{ padding: "30px", marginTop: "12px", border: "1px solid var(--accent)" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
            <CalendarDays size={18} style={{ color: "var(--accent)" }} />
            Potwierdzenie rezerwacji: {selectedDateStr} o godz. {selectedSlot.startTime} - {selectedSlot.endTime}
          </h3>

          {bookingError && (
            <div style={{ display: "flex", gap: "10px", alignItems: "center", background: "var(--danger-light)", border: "1px solid var(--danger)", padding: "12px", borderRadius: "var(--radius-md)", color: "var(--danger)", marginBottom: "20px", fontSize: "0.9rem" }}>
              <AlertCircle size={18} />
              <span>{bookingError}</span>
            </div>
          )}

          <form onSubmit={handleBookingSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div>
              <label htmlFor="client-name">Imię i Nazwisko *</label>
              <div style={{ position: "relative" }}>
                <input
                  id="client-name"
                  type="text"
                  placeholder="np. Jan Kowalski"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={bookingLoading}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="client-email">E-mail *</label>
              <input
                id="client-email"
                type="email"
                placeholder="np. jan@kowalski.pl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={bookingLoading}
                required
              />
            </div>

            {owner?.settings?.requiredFields?.phone && (
              <div style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="client-phone">Numer telefonu *</label>
                <input
                  id="client-phone"
                  type="tel"
                  placeholder="np. +48 123 456 789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={bookingLoading}
                  required
                />
              </div>
            )}

            {owner?.settings?.requiredFields?.address && (
              <div style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="client-address">Adres *</label>
                <input
                  id="client-address"
                  type="text"
                  placeholder="np. ul. Marszałkowska 10, Warszawa"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={bookingLoading}
                  required
                />
              </div>
            )}

            {owner?.settings?.requiredFields?.note && (
              <div style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="client-note">Dodatkowa notatka</label>
                <textarea
                  id="client-note"
                  rows={3}
                  placeholder="Możesz tu wpisać dodatkowe informacje dla organizatora..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={bookingLoading}
                />
              </div>
            )}

            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ padding: "14px 28px", height: "48px" }} 
                disabled={bookingLoading}
              >
                {bookingLoading ? "Rezerwowanie..." : "Zatwierdź i zarezerwuj"}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
