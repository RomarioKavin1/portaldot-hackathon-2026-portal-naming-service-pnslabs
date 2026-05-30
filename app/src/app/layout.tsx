import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PNS — Portal Naming Service",
  description: ".pot names on Portaldot — ENS-style decentralized identity",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
