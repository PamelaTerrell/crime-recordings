import type { Metadata } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crime Recordings",
  description:
    "A documented archive of true-crime recordings, public records, interviews, dispatch audio, and case materials.",
  icons: {
    icon: "/crime-recordings-logo.png",
    shortcut: "/crime-recordings-logo.png",
    apple: "/crime-recordings-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        {children}

        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-0DQ71FYZWG"
          strategy="afterInteractive"
        />

        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];

            function gtag() {
              window.dataLayer.push(arguments);
            }

            gtag('js', new Date());
            gtag('config', 'G-0DQ71FYZWG');
          `}
        </Script>

        <Analytics />
      </body>
    </html>
  );
}