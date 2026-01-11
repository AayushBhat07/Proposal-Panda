import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppInitializer from './AppInitializer';
import { OnboardingProvider } from '@/lib/context/OnboardingContext';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tender Automation Platform",
  description: "AI-powered tender automation and management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
      >
        <OnboardingProvider>
          <AppInitializer />
          {children}
        </OnboardingProvider>
      </body>
    </html>
  );
}
