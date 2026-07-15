import type { Metadata } from "next";
import { Inter, Outfit, JetBrains_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui";
import { AuthProvider } from "@/context/AuthContext";
import { SettingsProvider } from "@/context/SettingsContext";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ListMe — List it. Find it. Own it. | Free Real Estate Platform",
  description: "Browse, sell, or rent properties across India for free. Direct owner listing, verified phone numbers, and interest-based connection with zero brokerage.",
  keywords: "real estate, free listing, direct owner, no brokerage, property buy, rent apartment, land, commercial property, India real estate, ListMe",
  authors: [{ name: "ListMe Tech Team" }],
  openGraph: {
    title: "ListMe — List it. Find it. Own it.",
    description: "Browse, sell, or rent properties across India for free with direct owner listings and zero brokerage.",
    url: "https://listme.in",
    siteName: "ListMe",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ListMe — List it. Find it. Own it.",
    description: "Free real estate platform across India. No brokers, no spam.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html 
      lang="en" 
      className={`${inter.variable} ${outfit.variable} ${jetbrainsMono.variable}`}
      style={{
        "--font-body": "var(--font-inter)",
        "--font-heading": "var(--font-outfit)",
        "--font-mono": "var(--font-jetbrains-mono)",
      } as React.CSSProperties}
    >
      <body>
        <SettingsProvider>
          <AuthProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </AuthProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
