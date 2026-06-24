import type { ReactNode } from "react";

export const metadata = {
  title: "ProBot (self-hosted)",
  description: "A self-hosted ProBot runtime.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
