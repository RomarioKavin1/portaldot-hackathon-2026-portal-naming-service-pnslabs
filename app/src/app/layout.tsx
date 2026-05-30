import "./globals.css";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { NetworkProvider } from "@/lib/network-context";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jbmono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jbmono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Portal Naming Service — .pot names on Portaldot",
  description:
    "Claim and resolve .pot names on the Portaldot chain. ENS-style decentralized identity, with a TypeScript SDK.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jbmono.variable}`}>
      <body>
        <NetworkProvider>{children}</NetworkProvider>
      </body>
    </html>
  );
}
