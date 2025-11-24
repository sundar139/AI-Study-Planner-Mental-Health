import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

import { HideableNavbar } from "@/components/layout/hideable-navbar";

export const metadata: Metadata = {
  title: "AssignWell - AI-Powered Academic Planner",
  description: "Mental health-aware academic planning with AI support",
};



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${outfit.variable} antialiased min-h-screen font-sans`}
      >
        <div className="relative flex min-h-screen flex-col">
          <HideableNavbar />
          <main className="flex-1">{children}</main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
