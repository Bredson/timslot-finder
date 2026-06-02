import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/context/AuthContext";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Timeslot Finder - Rezerwuj Spotkania Błyskawicznie",
  description: "Zarządzaj swoją dostępnością, udostępniaj linki i automatyzuj rezerwacje terminów.",
};

export default function RootLayout({
  children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
  return (
    <html lang="pl" className={inter.variable}>
      <body>
        <AuthProvider>
          {/* Dekoracyjne, pływające tło dla nowoczesnego wyglądu */}
          <div className="bg-decorations">
            <div className="bg-blob bg-blob-1"></div>
            <div className="bg-blob bg-blob-2"></div>
          </div>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
