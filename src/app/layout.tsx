import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://crimerecordings.com"),

  title: {
    default: "Crime Recordings | Real Cases. Real Recordings.",
    template: "%s | Crime Recordings",
  },

  description:
    "A documented archive of true-crime recordings, public records, police interviews, interrogations, dispatch audio, video evidence, crime scene materials, and case documents.",

  applicationName: "Crime Recordings",

  keywords: [
    "true crime",
    "crime recordings",
    "police interrogations",
    "police interviews",
    "public records",
    "911 calls",
    "dispatch audio",
    "crime scene footage",
    "case documents",
    "court records",
    "true crime videos",
    "police body camera footage",
    "criminal cases",
  ],

  authors: [
    {
      name: "Crime Recordings",
      url: "https://crimerecordings.com",
    },
  ],

  creator: "Crime Recordings",
  publisher: "Crime Recordings",

  alternates: {
    canonical: "/",
  },

  icons: {
    icon: [
      {
        url: "/crime-recordings-logo.png",
        type: "image/png",
      },
    ],
    shortcut: "/crime-recordings-logo.png",
    apple: [
      {
        url: "/crime-recordings-logo.png",
        type: "image/png",
      },
    ],
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://crimerecordings.com",
    siteName: "Crime Recordings",
    title: "Crime Recordings | Real Cases. Real Recordings.",
    description:
      "Explore documented true-crime cases through police recordings, public records, interviews, dispatch audio, video evidence, and case materials.",
    images: [
      {
        url: "/crime-recordings-logo.png",
        width: 1200,
        height: 1200,
        alt: "Crime Recordings",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Crime Recordings | Real Cases. Real Recordings.",
    description:
      "True-crime recordings, police interviews, public records, video evidence, dispatch audio, and documented case materials.",
    images: ["/crime-recordings-logo.png"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  category: "True Crime",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#080808",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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