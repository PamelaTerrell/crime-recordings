import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://crimerecordings.com"),
  title: {
    default: "Crime Recordings | Real Cases. Original Recordings.",
    template: "%s | Crime Recordings",
  },
  description:
    "Crime Recordings presents interviews, interrogations, emergency calls, dispatch audio, and other official recordings obtained through public-records requests.",
  keywords: [
    "crime recordings",
    "true crime audio",
    "public records",
    "police interviews",
    "interrogation recordings",
    "emergency calls",
    "dispatch recordings",
    "official case recordings",
  ],
  authors: [
    {
      name: "Crime Recordings",
    },
  ],
  creator: "Crime Recordings",
  publisher: "Crime Recordings",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "https://crimerecordings.com",
    siteName: "Crime Recordings",
    title: "Crime Recordings | Real Cases. Original Recordings.",
    description:
      "Hear the interviews, calls, and official records behind true-crime cases.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Crime Recordings | Real Cases. Original Recordings.",
    description:
      "Hear the interviews, calls, and official records behind true-crime cases.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${cormorant.variable}`}>
        {children}
      </body>
    </html>
  );
}