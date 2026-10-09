import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import AppInitializer from './AppInitializer';
import { OnboardingProvider } from '@/lib/context/OnboardingContext';

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "ProposalPanda",
  description: "Tender analysis and two-cover bid drafting for CPWD-style tenders",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${sourceSerif.variable} ${plexSans.variable} ${plexMono.variable} antialiased`}
      >
        <OnboardingProvider>
          <AppInitializer />
          {children}
        </OnboardingProvider>
      </body>
    </html>
  );
}
