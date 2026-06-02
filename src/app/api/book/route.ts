import { NextResponse } from "next/server";
import { adminDb } from "@/firebase/admin";
import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
// Inicjalizujemy Resend tylko jeśli klucz jest podany, w przeciwnym razie mockujemy wysyłkę
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { calendarOwnerId, date, startTime, endTime, clientData } = body;

    // Podstawowa walidacja
    if (!calendarOwnerId || !date || !startTime || !endTime || !clientData?.name || !clientData?.email) {
      return NextResponse.json(
        { error: "Brakujące wymagane dane rezerwacji." },
        { status: 400 }
      );
    }

    // 1. Sprawdź, czy slot jest już zajęty (unikanie podwójnej rezerwacji)
    const bookingsRef = adminDb.collection("bookings");
    const existingBookingsQuery = await bookingsRef
      .where("calendarOwnerId", "==", calendarOwnerId)
      .where("date", "==", date)
      .where("startTime", "==", startTime)
      .where("status", "in", ["pending", "confirmed"])
      .get();

    if (!existingBookingsQuery.empty) {
      return NextResponse.json(
        { error: "Ten termin jest już zarezerwowany." },
        { status: 409 }
      );
    }

    // 2. Pobierz e-mail właściciela kalendarza, aby wysłać powiadomienie
    const ownerDoc = await adminDb.collection("users").doc(calendarOwnerId).get();
    if (!ownerDoc.exists) {
      return NextResponse.json(
        { error: "Właściciel kalendarza nie istnieje." },
        { status: 404 }
      );
    }
    const ownerEmail = ownerDoc.data()?.email;
    if (!ownerEmail) {
      return NextResponse.json(
        { error: "Brak adresu e-mail właściciela kalendarza." },
        { status: 404 }
      );
    }

    // 3. Stwórz rezerwację w Firestore
    const newBookingRef = bookingsRef.doc();
    const bookingId = newBookingRef.id;
    const bookingData = {
      bookingId,
      calendarOwnerId,
      date,
      startTime,
      endTime,
      status: "pending",
      clientData,
      createdAt: new Date().toISOString()
    };

    await newBookingRef.set(bookingData);

    // 4. Wyślij powiadomienie e-mail przez Resend
    const confirmUrl = `${appUrl}/confirm/${bookingId}`;
    const dashboardUrl = `${appUrl}/dashboard`;

    const emailSubject = `Nowa rezerwacja: ${clientData.name} - ${date} o ${startTime}`;
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #6366f1; margin-top: 0;">Nowe zapytanie o spotkanie</h2>
        <p>Masz nowe zapytanie o rezerwację terminu w swoim kalendarzu <strong>Timeslot Finder</strong>.</p>
        
        <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #edf2f7;">
          <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 16px;">Szczegóły spotkania:</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #718096; width: 120px;"><strong>Data:</strong></td>
              <td style="padding: 6px 0; color: #1a202c;"><strong>${date}</strong></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #718096;"><strong>Godzina:</strong></td>
              <td style="padding: 6px 0; color: #1a202c;"><strong>${startTime} - ${endTime}</strong></td>
            </tr>
          </table>
        </div>

        <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #edf2f7;">
          <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 16px;">Dane umawiającego się:</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #718096; width: 120px;"><strong>Klient:</strong></td>
              <td style="padding: 6px 0; color: #1a202c;">${clientData.name}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #718096;"><strong>E-mail:</strong></td>
              <td style="padding: 6px 0; color: #1a202c;"><a href="mailto:${clientData.email}">${clientData.email}</a></td>
            </tr>
            ${clientData.phone ? `
            <tr>
              <td style="padding: 6px 0; color: #718096;"><strong>Telefon:</strong></td>
              <td style="padding: 6px 0; color: #1a202c;">${clientData.phone}</td>
            </tr>` : ""}
            ${clientData.address ? `
            <tr>
              <td style="padding: 6px 0; color: #718096;"><strong>Adres:</strong></td>
              <td style="padding: 6px 0; color: #1a202c;">${clientData.address}</td>
            </tr>` : ""}
            ${clientData.note ? `
            <tr>
              <td style="padding: 6px 0; color: #718096;"><strong>Notatka:</strong></td>
              <td style="padding: 6px 0; color: #1a202c;"><em>"${clientData.note}"</em></td>
            </tr>` : ""}
          </table>
        </div>

        <div style="margin-top: 30px; text-align: center; display: flex; flex-direction: column; gap: 12px; align-items: center;">
          <a href="${confirmUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block;">
            Zatwierdź spotkanie
          </a>
          <p style="margin-top: 15px; font-size: 12px; color: #a0aec0;">
            Możesz również zarządzać tym spotkaniem w swoim <a href="${dashboardUrl}" style="color: #6366f1;">Panelu Właściciela</a>.
          </p>
        </div>
      </div>
    `;

    if (resend) {
      await resend.emails.send({
        from: "Timeslot Finder <onboarding@resend.dev>", // darmowy adres testowy Resend
        to: ownerEmail,
        subject: emailSubject,
        html: emailHtml
      });
      console.log(`[E-mail] Wysłano powiadomienie do: ${ownerEmail} przez Resend`);
    } else {
      // Logowanie do konsoli serwera dla celów deweloperskich
      console.warn("=== DEWELOPERSKI PODGLĄD MAILA (Brak RESEND_API_KEY) ===");
      console.warn(`Do: ${ownerEmail}`);
      console.warn(`Temat: ${emailSubject}`);
      console.warn(`Link zatwierdzający: ${confirmUrl}`);
      console.warn("======================================================");
    }

    return NextResponse.json({ success: true, bookingId });
  } catch (error: any) {
    console.error("Błąd API rezerwacji:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd serwera: " + error.message },
      { status: 500 }
    );
  }
}
