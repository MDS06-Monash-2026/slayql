import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SlayQL | MDS06",
  description: "An Agentic Approach for Text-2-SQL problem",
  icons: {
    icon: '/favicon.ico',
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* Removed the Tailwind background classes, we will let globals.css handle it completely */}
      <body className="min-h-full flex flex-col text-white selection:bg-cyan-500/30 selection:text-cyan-50">
        {children}
      </body>
    </html>
  );
}
