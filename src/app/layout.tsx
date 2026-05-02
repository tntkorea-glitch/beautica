import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_DESCRIPTION = "뷰티샵 운영과 자재 쇼핑몰을 한 곳에서 — beautica";

export const metadata: Metadata = {
  metadataBase: new URL("https://beautica.co.kr"),
  title: { default: "beautica", template: "%s | beautica" },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: "beautica",
    description: SITE_DESCRIPTION,
    url: "https://beautica.co.kr",
    siteName: "beautica",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "beautica",
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <Script src="/inapp-guard.js" strategy="beforeInteractive" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
