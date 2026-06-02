"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/firebase/client";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc,
  deleteDoc,
  orderBy
} from "firebase/firestore";
import { 
  Copy, 
  Check, 
  ExternalLink, 
  Calendar as CalendarIcon, 
  Clock, 
  Trash2, 
  X, 
  CheckCircle, 
  CalendarDays, 
  AlertCircle, 
  FileCode 
} from "lucide-react";

interface Booking {
  id: string;
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
  createdAt: string;
}

interface Override {
  id: string;
  date: string;
  type: "add_block" | "unavailable_day";
  blocks?: Array<{ start: string; end: string }>;
}

const DAYS_PL: { [key: string]: string } = {
  monday: "Poniedziałek",
  tuesday: "Wtorek",
  wednesday: "Środa",
  thursday: "Czwartek",
  friday: "Piątek",
  saturday: "Sobota",
  sunday: "Niedziela"
};

const DAYS_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function DashboardPage() {
  const { user, settings, refreshSettings } = useAuth();
  
  // Linki i osadzanie
  const [appUrl, setAppUrl] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedIframe, setCopiedIframe] = useState(false);

  // Ustawienia domyślne szablonu tygodniowego
  const [weeklyHours, setWeeklyHours] = useState<any>(null);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateSuccess, setTemplateSuccess] = useState(false);

  // Rezerwacje
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsFilter, setBookingsFilter] = useState<"pending" | "confirmed" | "all">("pending");

  // Kalendarz wyjątków i overrides
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState("");
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [currentOverrideType, setCurrentOverrideType] = useState<"add_block" | "unavailable_day">("unavailable_day");
  const [newBlockStart, setNewBlockStart] = useState("09:00");
  const [newBlockEnd, setNewBlockEnd] = useState("17:00");
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [tempBlocks, setTempBlocks] = useState<Array<{ start: string; end: string }>>([]);

  // Synchronizacja stanu formularza po kliknięciu na konkretny dzień
  useEffect(() => {
    if (selectedDateStr) {
      const override = overrides.find((o) => o.date === selectedDateStr);
      if (override) {
        setCurrentOverrideType(override.type);
        setTempBlocks(override.blocks ? [...override.blocks] : []);
      } else {
        setCurrentOverrideType("unavailable_day");
        setTempBlocks([]);
      }
    }
  }, [selectedDateStr, overrides]);

  const handleAddTempBlock = () => {
    if (newBlockStart >= newBlockEnd) {
      alert("Godzina zakończenia musi być późniejsza niż godzina rozpoczęcia.");
      return;
    }
    
    // Zapobieganie dublowaniu identycznych bloków
    const duplicate = tempBlocks.some(b => b.start === newBlockStart && b.end === newBlockEnd);
    if (duplicate) {
      alert("Ten przedział godzin został już dodany.");
      return;
    }

    const updated = [...tempBlocks, { start: newBlockStart, end: newBlockEnd }].sort(
      (a, b) => a.start.localeCompare(b.start)
    );
    setTempBlocks(updated);
  };

  const handleRemoveTempBlock = (index: number) => {
    setTempBlocks(tempBlocks.filter((_, idx) => idx !== index));
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAppUrl(window.location.origin);
    }
  }, []);

  // Załaduj godziny tygodniowe z profilu
  useEffect(() => {
    if (settings?.weeklyHours) {
      setWeeklyHours(JSON.parse(JSON.stringify(settings.weeklyHours)));
    }
  }, [settings]);

  // Subskrypcja rezerwacji w czasie rzeczywistym
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "bookings"),
      where("calendarOwnerId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookingsData: Booking[] = [];
      snapshot.forEach((doc) => {
        bookingsData.push({ id: doc.id, ...doc.data() } as Booking);
      });
      
      // Sortowanie w pamięci po dacie i godzinie rozpoczęcia
      bookingsData.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.startTime.localeCompare(b.startTime);
      });
      
      setBookings(bookingsData);
    }, (error) => {
      console.error("Błąd pobierania rezerwacji:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Subskrypcja wyjątków (Overrides) w czasie rzeczywistym
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "users", user.uid, "availabilityOverrides")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const overridesData: Override[] = [];
      snapshot.forEach((doc) => {
        overridesData.push({ id: doc.id, ...doc.data() } as Override);
      });
      setOverrides(overridesData);
    }, (error) => {
      console.error("Błąd pobierania wyjątków dostępności:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const copyToClipboard = (text: string, type: "link" | "iframe") => {
    navigator.clipboard.writeText(text);
    if (type === "link") {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedIframe(true);
      setTimeout(() => setCopiedIframe(false), 2000);
    }
  };

  // Zapisz szablon tygodniowy
  const handleSaveTemplate = async () => {
    if (!user || !weeklyHours) return;
    setTemplateSaving(true);
    setTemplateSuccess(false);

    try {
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, {
        settings: {
          weeklyHours
        }
      }, { merge: true });

      await refreshSettings();
      setTemplateSuccess(true);
      setTimeout(() => setTemplateSuccess(false), 3000);
    } catch (error) {
      console.error("Błąd zapisu szablonu:", error);
    } finally {
      setTemplateSaving(false);
    }
  };

  const handleWeeklyHoursChange = (day: string, field: "enabled" | "start" | "end", value: any) => {
    setWeeklyHours((prev: any) => {
      const updatedDay = { ...prev[day], [field]: value };
      return { ...prev, [day]: updatedDay };
    });
  };

  // Potwierdzanie i anulowanie rezerwacji
  const handleConfirmBooking = async (bookingId: string) => {
    try {
      const bookingDocRef = doc(db, "bookings", bookingId);
      await updateDoc(bookingDocRef, { status: "confirmed" });
    } catch (error) {
      console.error("Błąd podczas potwierdzania spotkania:", error);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const bookingDocRef = doc(db, "bookings", bookingId);
      await updateDoc(bookingDocRef, { status: "cancelled" });
    } catch (error) {
      console.error("Błąd podczas anulowania spotkania:", error);
    }
  };

  const handleDeleteBookingRecord = async (bookingId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć tę rezerwację z historii?")) return;
    try {
      const bookingDocRef = doc(db, "bookings", bookingId);
      await deleteDoc(bookingDocRef);
    } catch (error) {
      console.error("Błąd podczas usuwania spotkania:", error);
    }
  };

  // Funkcje kalendarza wyjątków
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonthIndex = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    // 0: Niedziela, 1: Poniedziałek, ..., 6: Sobota
    const day = new Date(year, month, 1).getDay();
    // Konwersja na index gdzie Poniedziałek = 0, Niedziela = 6
    return day === 0 ? 6 : day - 1;
  };

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const formatOverrideDate = (year: number, month: number, day: number) => {
    const m = String(month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${year}-${m}-${d}`;
  };

  const getOverrideForDate = (dateStr: string) => {
    return overrides.find(o => o.date === dateStr);
  };

  // Dodaj/zmień wyjątek dla zaznaczonego dnia
  const handleSaveOverride = async () => {
    if (!user || !selectedDateStr) return;
    setOverrideSaving(true);

    try {
      const overrideDocRef = doc(db, "users", user.uid, "availabilityOverrides", selectedDateStr);
      
      if (currentOverrideType === "unavailable_day") {
        await setDoc(overrideDocRef, {
          date: selectedDateStr,
          type: "unavailable_day"
        });
      } else {
        if (tempBlocks.length === 0) {
          alert("Dodaj co najmniej jeden blok godzin przed zapisaniem.");
          setOverrideSaving(false);
          return;
        }
        await setDoc(overrideDocRef, {
          date: selectedDateStr,
          type: "add_block",
          blocks: tempBlocks
        });
      }
      setSelectedDateStr("");
    } catch (error) {
      console.error("Błąd dodawania wyjątku:", error);
    } finally {
      setOverrideSaving(false);
    }
  };

  const handleDeleteOverride = async (dateStr: string) => {
    if (!user) return;
    try {
      const overrideDocRef = doc(db, "users", user.uid, "availabilityOverrides", dateStr);
      await deleteDoc(overrideDocRef);
    } catch (error) {
      console.error("Błąd usuwania wyjątku:", error);
    }
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDayIndex = getFirstDayOfMonthIndex(currentDate);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const calendarCells = [];

    // Puste komórki przed początkiem miesiąca
    for (let i = 0; i < firstDayIndex; i++) {
      calendarCells.push(
        <div key={`empty-${i}`} style={{ aspectRatio: "1/1", border: "1px solid transparent" }}></div>
      );
    }

    // Komórki dni miesiąca
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatOverrideDate(year, month, day);
      const override = getOverrideForDate(dateStr);
      const isSelected = selectedDateStr === dateStr;
      
      let badgeStyle: React.CSSProperties = {};
      let badgeText = "";
      
      if (override) {
        if (override.type === "unavailable_day") {
          badgeStyle = { background: "var(--danger-light)", color: "var(--danger)", border: "1px solid var(--danger)" };
          badgeText = "Zamknięte";
        } else {
          badgeStyle = { background: "var(--success-light)", color: "var(--success)", border: "1px solid var(--success)" };
          const count = override.blocks?.length || 0;
          if (count === 1) {
            badgeText = `${override.blocks![0].start}-${override.blocks![0].end}`;
          } else {
            badgeText = `${count} bloki`;
          }
        }
      }

      calendarCells.push(
        <div 
          key={`day-${day}`}
          onClick={() => setSelectedDateStr(dateStr)}
          style={{
            aspectRatio: "1/1",
            border: isSelected ? "2px solid var(--accent)" : "1px solid var(--card-border)",
            borderRadius: "var(--radius-sm)",
            padding: "8px",
            cursor: "pointer",
            background: isSelected ? "var(--accent-light)" : "var(--bg-secondary)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            transition: "all var(--transition-fast)"
          }}
        >
          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{day}</span>
          {badgeText && (
            <span style={{ 
              fontSize: "0.7rem", 
              padding: "2px 4px", 
              borderRadius: "4px", 
              textAlign: "center",
              fontWeight: 600,
              ...badgeStyle
            }}>
              {badgeText}
            </span>
          )}
        </div>
      );
    }

    return calendarCells;
  };

  const bookingLink = user ? `${appUrl}/embed/${user.uid}` : "";
  const iframeCode = user ? `<iframe src="${bookingLink}" width="100%" height="700px" style="border:none; border-radius:12px; box-shadow:0 4px 6px rgba(0,0,0,0.05);"></iframe>` : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      
      {/* Sekcja: Linki i Integracja */}
      <section className="glass" style={{ padding: "28px" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
          <FileCode size={20} style={{ color: "var(--accent)" }} />
          Udostępnianie i integracja kalendarza
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          
          {/* Link do rezerwacji */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "0.85rem" }}>Bezpośredni link do Twojego kalendarza</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input type="text" readOnly value={bookingLink} style={{ fontFamily: "monospace", fontSize: "0.85rem" }} />
              <button 
                onClick={() => copyToClipboard(bookingLink, "link")} 
                className="btn btn-secondary"
                style={{ padding: "12px", minWidth: "110px" }}
              >
                {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                <span>{copiedLink ? "Skopiowano" : "Kopiuj"}</span>
              </button>
              <a href={bookingLink} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: "12px" }} title="Otwórz podgląd">
                <ExternalLink size={16} />
              </a>
            </div>
          </div>

          {/* Kod iframe */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontSize: "0.85rem" }}>Kod osadzenia Iframe (na własną stronę)</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input type="text" readOnly value={iframeCode} style={{ fontFamily: "monospace", fontSize: "0.85rem" }} />
              <button 
                onClick={() => copyToClipboard(iframeCode, "iframe")} 
                className="btn btn-secondary"
                style={{ padding: "12px", minWidth: "110px" }}
              >
                {copiedIframe ? <Check size={16} /> : <Copy size={16} />}
                <span>{copiedIframe ? "Skopiowano" : "Kopiuj"}</span>
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* Główny układ 2 kolumnowy */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "32px", alignItems: "start" }}>
        
        {/* Kolumna 1: Szablon Tygodniowy */}
        <section className="glass" style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "4px", display: "flex", alignItems: "center", gap: "10px" }}>
              <Clock size={20} style={{ color: "var(--accent)" }} />
              Domyślny szablon tygodniowy
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              Określ swoje standardowe godziny dostępności w poszczególne dni tygodnia.
            </p>
          </div>

          {templateSuccess && (
            <div style={{ display: "flex", gap: "8px", alignItems: "center", background: "var(--success-light)", border: "1px solid var(--success)", padding: "10px", borderRadius: "var(--radius-md)", color: "var(--success)", fontSize: "0.85rem", fontWeight: 600 }}>
              <CheckCircle size={16} />
              <span>Szablon tygodniowy został zapisany!</span>
            </div>
          )}

          {weeklyHours && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {DAYS_ORDER.map((day) => {
                const info = weeklyHours[day];
                if (!info) return null;
                return (
                  <div key={day} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", borderBottom: "1px solid var(--card-border)", paddingBottom: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "130px" }}>
                      <input 
                        type="checkbox" 
                        id={`check-${day}`}
                        checked={info.enabled} 
                        onChange={(e) => handleWeeklyHoursChange(day, "enabled", e.target.checked)}
                        style={{ width: "18px", height: "18px", cursor: "pointer" }} 
                      />
                      <label htmlFor={`check-${day}`} style={{ margin: 0, cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}>{DAYS_PL[day]}</label>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", opacity: info.enabled ? 1 : 0.4 }}>
                      <input 
                        type="time" 
                        value={info.start} 
                        onChange={(e) => handleWeeklyHoursChange(day, "start", e.target.value)}
                        disabled={!info.enabled}
                        style={{ padding: "6px 10px", fontSize: "0.85rem", width: "90px" }}
                      />
                      <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>do</span>
                      <input 
                        type="time" 
                        value={info.end} 
                        onChange={(e) => handleWeeklyHoursChange(day, "end", e.target.value)}
                        disabled={!info.enabled}
                        style={{ padding: "6px 10px", fontSize: "0.85rem", width: "90px" }}
                      />
                    </div>
                  </div>
                );
              })}

              <button onClick={handleSaveTemplate} className="btn btn-primary" style={{ marginTop: "10px" }} disabled={templateSaving}>
                {templateSaving ? "Zapisywanie..." : "Zapisz szablon tygodniowy"}
              </button>
            </div>
          )}
        </section>

        {/* Kolumna 2: Kalendarz Wyjątków i Nadpisań */}
        <section className="glass" style={{ padding: "28px", display: "flex", flexDirection: "column", gap: "24px" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "4px", display: "flex", alignItems: "center", gap: "10px" }}>
              <CalendarDays size={20} style={{ color: "var(--accent)" }} />
              Kalendarz wyjątków i nadpisań
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              Ręcznie dodawaj dodatkowe bloki lub blokuj konkretne dni (np. urlopy). Kliknij dzień na kalendarzu.
            </p>
          </div>

          {/* Nagłówek kalendarza */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
              {currentDate.toLocaleString("pl-PL", { month: "long", year: "numeric" }).toUpperCase()}
            </h3>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => changeMonth(-1)} className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "0.85rem" }}>&lt; Poprzedni</button>
              <button onClick={() => changeMonth(1)} className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "0.85rem" }}>Następny &gt;</button>
            </div>
          </div>

          {/* Dni tygodnia */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px", textAlign: "center", fontWeight: 600, fontSize: "0.75rem", color: "var(--text-muted)" }}>
            <div>PN</div><div>WT</div><div>ŚR</div><div>CZ</div><div>PT</div><div>SO</div><div>ND</div>
          </div>

          {/* Siatka kalendarza */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px" }}>
            {renderCalendarDays()}
          </div>

          {/* Formularz wyjątku dla zaznaczonego dnia */}
          {selectedDateStr && (
            <div className="glass" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", border: "1px solid var(--accent)", background: "rgba(99, 102, 241, 0.03)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4 style={{ fontWeight: 700, fontSize: "0.95rem" }}>Ustaw wyjątek na dzień: <strong>{selectedDateStr}</strong></h4>
                <button onClick={() => setSelectedDateStr("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ fontSize: "0.85rem" }}>Typ wyjątku</label>
                  <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 500, cursor: "pointer" }}>
                      <input 
                        type="radio" 
                        name="overrideType" 
                        checked={currentOverrideType === "unavailable_day"}
                        onChange={() => setCurrentOverrideType("unavailable_day")}
                        style={{ width: "16px", height: "16px" }}
                      />
                      Cały dzień zamknięty/urlop
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 500, cursor: "pointer" }}>
                      <input 
                        type="radio" 
                        name="overrideType" 
                        checked={currentOverrideType === "add_block"}
                        onChange={() => setCurrentOverrideType("add_block")}
                        style={{ width: "16px", height: "16px" }}
                      />
                      Dodaj wolne godziny (wielokrotne sloty)
                    </label>
                  </div>
                </div>

                {currentOverrideType === "add_block" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {/* Lista aktualnych bloków godzin */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                        Dodane bloki godzin na ten dzień:
                      </span>
                      {tempBlocks.length === 0 ? (
                        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                          Brak bloków. Dodaj zakres godzin poniżej.
                        </span>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                          {tempBlocks.map((block, idx) => (
                            <div 
                              key={idx} 
                              className="glass" 
                              style={{ 
                                display: "flex", 
                                alignItems: "center", 
                                gap: "8px", 
                                padding: "6px 12px", 
                                borderRadius: "var(--radius-sm)",
                                background: "var(--bg-secondary)",
                                border: "1px solid var(--accent)",
                                fontSize: "0.85rem",
                                fontWeight: 600
                              }}
                            >
                              <span>{block.start} - {block.end}</span>
                              <button 
                                type="button"
                                onClick={() => handleRemoveTempBlock(idx)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 0, display: "flex", alignItems: "center" }}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Dodawanie nowego bloku */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", borderTop: "1px dashed var(--card-border)", paddingTop: "14px", marginTop: "4px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input 
                          type="time" 
                          value={newBlockStart} 
                          onChange={(e) => setNewBlockStart(e.target.value)}
                          style={{ padding: "6px 10px", fontSize: "0.85rem", width: "90px" }}
                        />
                        <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>do</span>
                        <input 
                          type="time" 
                          value={newBlockEnd} 
                          onChange={(e) => setNewBlockEnd(e.target.value)}
                          style={{ padding: "6px 10px", fontSize: "0.85rem", width: "90px" }}
                        />
                      </div>
                      <button 
                        type="button" 
                        onClick={handleAddTempBlock}
                        className="btn btn-secondary"
                        style={{ padding: "8px 14px", fontSize: "0.82rem" }}
                      >
                        + Dodaj blok
                      </button>
                    </div>
                  </div>
                )}

                {/* Stopka formularza wyjątku (Zapisz / Usuń) */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", borderTop: "1px solid var(--card-border)", paddingTop: "16px" }}>
                  <div>
                    {getOverrideForDate(selectedDateStr) && (
                      <button 
                        onClick={() => {
                          handleDeleteOverride(selectedDateStr);
                          setSelectedDateStr("");
                        }} 
                        className="btn btn-danger"
                        style={{ padding: "10px 16px", fontSize: "0.85rem" }}
                      >
                        <Trash2 size={14} />
                        Usuń całkowicie wyjątek
                      </button>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button 
                      onClick={() => setSelectedDateStr("")} 
                      className="btn btn-secondary"
                      style={{ padding: "10px 16px", fontSize: "0.85rem" }}
                    >
                      Anuluj
                    </button>
                    <button 
                      onClick={handleSaveOverride} 
                      className="btn btn-primary"
                      style={{ fontSize: "0.85rem", padding: "10px 20px" }}
                      disabled={overrideSaving}
                    >
                      Zapisz wyjątek
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

      </div>

      {/* Sekcja: Rezerwacje w czasie rzeczywistym */}
      <section className="glass" style={{ padding: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "4px", display: "flex", alignItems: "center", gap: "10px" }}>
              <CalendarIcon size={20} style={{ color: "var(--accent)" }} />
              Rezerwacje spotkań
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              Przeglądaj, potwierdzaj i zarządzaj spotkaniami zarezerwowanymi przez klientów.
            </p>
          </div>

          {/* Filtry */}
          <div className="glass" style={{ display: "flex", padding: "4px", borderRadius: "var(--radius-md)", gap: "4px" }}>
            <button 
              onClick={() => setBookingsFilter("pending")}
              className="btn"
              style={{ 
                padding: "6px 12px", 
                fontSize: "0.8rem", 
                background: bookingsFilter === "pending" ? "var(--accent)" : "transparent",
                color: bookingsFilter === "pending" ? "#ffffff" : "var(--text-primary)",
                borderRadius: "var(--radius-sm)"
              }}
            >
              Do zatwierdzenia
            </button>
            <button 
              onClick={() => setBookingsFilter("confirmed")}
              className="btn"
              style={{ 
                padding: "6px 12px", 
                fontSize: "0.8rem", 
                background: bookingsFilter === "confirmed" ? "var(--accent)" : "transparent",
                color: bookingsFilter === "confirmed" ? "#ffffff" : "var(--text-primary)",
                borderRadius: "var(--radius-sm)"
              }}
            >
              Zatwierdzone
            </button>
            <button 
              onClick={() => setBookingsFilter("all")}
              className="btn"
              style={{ 
                padding: "6px 12px", 
                fontSize: "0.8rem", 
                background: bookingsFilter === "all" ? "var(--accent)" : "transparent",
                color: bookingsFilter === "all" ? "#ffffff" : "var(--text-primary)",
                borderRadius: "var(--radius-sm)"
              }}
            >
              Wszystkie
            </button>
          </div>
        </div>

        {/* Lista rezerwacji */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {bookings
            .filter((b) => {
              if (bookingsFilter === "pending") return b.status === "pending";
              if (bookingsFilter === "confirmed") return b.status === "confirmed";
              return true;
            })
            .length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontSize: "0.95rem" }}>
                Brak spotkań do wyświetlenia dla wybranego filtra.
              </div>
            ) : (
              bookings
                .filter((b) => {
                  if (bookingsFilter === "pending") return b.status === "pending";
                  if (bookingsFilter === "confirmed") return b.status === "confirmed";
                  return true;
                })
                .map((b) => {
                  let statusBadge = null;
                  if (b.status === "pending") {
                    statusBadge = <span style={{ background: "rgba(245, 158, 11, 0.15)", color: "var(--warning)", border: "1px solid var(--warning)", fontSize: "0.75rem", padding: "2px 8px", borderRadius: "var(--radius-full)", fontWeight: 700 }}>Oczekuje</span>;
                  } else if (b.status === "confirmed") {
                    statusBadge = <span style={{ background: "var(--success-light)", color: "var(--success)", border: "1px solid var(--success)", fontSize: "0.75rem", padding: "2px 8px", borderRadius: "var(--radius-full)", fontWeight: 700 }}>Zatwierdzone</span>;
                  } else {
                    statusBadge = <span style={{ background: "var(--danger-light)", color: "var(--danger)", border: "1px solid var(--danger)", fontSize: "0.75rem", padding: "2px 8px", borderRadius: "var(--radius-full)", fontWeight: 700 }}>Anulowane</span>;
                  }

                  return (
                    <div 
                      key={b.id} 
                      className="glass" 
                      style={{ 
                        padding: "20px", 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "flex-start", 
                        gap: "20px",
                        borderLeft: b.status === "pending" ? "4px solid var(--warning)" : b.status === "confirmed" ? "4px solid var(--success)" : "4px solid var(--danger)"
                      }}
                    >
                      {/* Szczegóły spotkania */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "1.1rem", fontWeight: 700 }}>{b.date}</span>
                          <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--text-secondary)", fontSize: "0.9rem", fontWeight: 500 }}>
                            <Clock size={14} />
                            {b.startTime} - {b.endTime}
                          </span>
                          {statusBadge}
                        </div>

                        {/* Dane klienta */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px 16px", fontSize: "0.88rem", color: "var(--text-secondary)" }}>
                          <div>Klient: <strong style={{ color: "var(--text-primary)" }}>{b.clientData.name}</strong></div>
                          <div>E-mail: <strong>{b.clientData.email}</strong></div>
                          {b.clientData.phone && <div>Telefon: <strong>{b.clientData.phone}</strong></div>}
                          {b.clientData.address && <div>Adres: <strong>{b.clientData.address}</strong></div>}
                        </div>
                        
                        {b.clientData.note && (
                          <div style={{ fontSize: "0.85rem", background: "var(--bg-primary)", padding: "10px 14px", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)", border: "1px solid var(--card-border)", marginTop: "4px" }}>
                            <strong>Notatka:</strong> &quot;{b.clientData.note}&quot;
                          </div>
                        )}
                      </div>

                      {/* Akcje */}
                      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                        {b.status === "pending" && (
                          <>
                            <button 
                              onClick={() => handleConfirmBooking(b.id)} 
                              className="btn btn-primary"
                              style={{ padding: "8px 14px", fontSize: "0.8rem", background: "var(--success)" }}
                            >
                              <Check size={14} />
                              Potwierdź
                            </button>
                            <button 
                              onClick={() => handleCancelBooking(b.id)} 
                              className="btn btn-secondary"
                              style={{ padding: "8px 14px", fontSize: "0.8rem", color: "var(--danger)", borderColor: "rgba(239, 68, 68, 0.2)" }}
                            >
                              <X size={14} />
                              Anuluj
                            </button>
                          </>
                        )}
                        {b.status !== "pending" && (
                          <button 
                            onClick={() => handleDeleteBookingRecord(b.id)} 
                            className="btn btn-secondary"
                            style={{ padding: "8px 12px", color: "var(--text-muted)" }}
                            title="Usuń z historii"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                    </div>
                  );
                })
          )}
        </div>
      </section>

    </div>
  );
}
