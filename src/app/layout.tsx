import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
