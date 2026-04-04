import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Fraunces, Space_Grotesk } from "next/font/google";

import { PwaRegister } from "@/components/pwa-register";

import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

const sans = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "MinTrain | Household Fitness and Meal Coach",
  description:
    "A private iPhone-first household coach for beginner-friendly workouts, vegetarian protein planning, and shared family dinner decisions.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MinTrain",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#111113",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${display.variable} ${sans.variable} bg-[var(--bg)] text-[var(--text)] antialiased`}>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
