import { NextResponse } from "next/server";
import { adminDb } from "@/firebase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: "Brak identyfikatora rezerwacji." },
        { status: 400 }
      );
    }

    const bookingRef = adminDb.collection("bookings").doc(bookingId);
    const bookingDoc = await bookingRef.get();

    if (!bookingDoc.exists) {
      return NextResponse.json(
        { error: "Podana rezerwacja nie istnieje." },
        { status: 404 }
      );
    }

    const bookingData = bookingDoc.data();
    if (bookingData?.status === "confirmed") {
      return NextResponse.json({ success: true, alreadyConfirmed: true, message: "Wizyta była już wcześniej zatwierdzona." });
    }

    // Aktualizujemy status na potwierdzony
    await bookingRef.update({
      status: "confirmed"
    });

    console.log(`[API Confirm] Pomyślnie potwierdzono rezerwację o ID: ${bookingId}`);

    return NextResponse.json({ 
      success: true, 
      message: "Wizyta została zatwierdzona pomyślnie.",
      booking: { ...bookingData, status: "confirmed" }
    });
  } catch (error: any) {
    console.error("Błąd API potwierdzania rezerwacji:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd serwera: " + error.message },
      { status: 500 }
    );
  }
}
