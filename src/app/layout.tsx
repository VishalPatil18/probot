import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter_Tight } from "next/font/google";

import { SessionProvider } from "@/lib/auth/session-provider";

import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "600", "700", "800"],
});

const sans = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ProBot",
  description: "Open-source, BYO-key AI bots for job seekers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="font-sans bg-bg-app text-ink min-h-screen">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
