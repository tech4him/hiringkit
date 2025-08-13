import type { Metadata } from "next";
import { Outfit, Inter } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hiring Kit - Turn Any Role Into a Complete Hiring Kit",
  description: "AI-powered hiring kit generator. Get professional scorecard, job post, interview questions, and bias-aware guidelines in under 10 minutes. $49 per kit.",
  keywords: "hiring, recruitment, job description, interview questions, AI hiring, bias-aware hiring, hiring process",
  openGraph: {
    title: "Hiring Kit - Complete AI-Powered Hiring Solutions",
    description: "Turn any role into a professional hiring kit with scorecard, job post, interview pack, and EEO guidelines. Ready in under 10 minutes.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${outfit.variable} ${inter.variable} font-inter antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
