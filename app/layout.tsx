import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project-to-Income Engine | Turn Student Projects Into Revenue",
  description:
    "AI-powered platform that analyzes your student project and generates data-backed monetization strategies, target user profiles, and pricing tiers in seconds.",
  keywords: [
    "student project monetization",
    "SaaS pricing generator",
    "project revenue strategy",
    "AI business analysis",
    "hackathon tool",
  ],
  openGraph: {
    title: "Project-to-Income Engine",
    description: "Turn student projects into real-world revenue opportunities.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
