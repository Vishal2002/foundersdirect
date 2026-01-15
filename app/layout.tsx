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
  title: 'FounderDirect',
  description: 'Instant access to contact info for YC founders',
  openGraph: {
    title: 'FounderDirect',
    description: 'Instant access to contact info for YC founders',
    url: 'https://founderdirect.vercel.app/',
    siteName: 'FounderDirect',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'FounderDirect Open Graph Image',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FounderDirect',
    description: 'Instant access to contact info for YC founders',
    images: ['/og.png'],
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
