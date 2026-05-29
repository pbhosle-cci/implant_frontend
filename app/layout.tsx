import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IMPLANZ — Dental Implant Planning",
  description: "Web-based dental implant planning and BV/TV analysis",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, overflow: "hidden" }}>{children}</body>
    </html>
  );
}
