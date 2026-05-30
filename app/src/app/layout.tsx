import "./globals.css";
import type { Metadata } from "next";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-hanken",
  display: "swap",
});

const jbmono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jbmono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Portal Naming Service — .pot names on Portaldot",
  description:
    "Claim and resolve .pot names on the Portaldot chain. ENS-faithful, native ink!, two first-class SDKs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${hanken.variable} ${jbmono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
