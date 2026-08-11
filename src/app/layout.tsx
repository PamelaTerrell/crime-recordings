import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const siteUrl = "https://www.crimerecordings.com";
const siteName = "Crime Recordings";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "Crime Recordings | True Crime Public Records Archive",
    template: "%s | Crime Recordings",
  },

  description:
    "Crime Recordings is a public-record true-crime archive featuring police interviews, interrogations, dispatch audio, 911 calls, body-camera footage, video evidence, crime-scene photographs, graphic visual evidence, and case documents.",

  applicationName: siteName,

  keywords: [
    "Crime Recordings",
    "CrimeRecordings",
    "CrimeRecordings.com",
    "true crime archive",
    "true crime public records",
    "crime recordings",
    "police interrogations",
    "police interviews",
    "911 calls",
    "dispatch audio",
    "body camera footage",
    "police bodycam",
    "crime scene photographs",
    "crime scene photos",
    "graphic crime scene images",
    "video evidence",
    "case documents",
    "court records",
    "criminal cases",
    "public records archive",
  ],

  authors: [
    {
      name: siteName,
      url: siteUrl,
    },
  ],

  creator: siteName,
  publisher: siteName,

  category: "True Crime",

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
    url: siteUrl,
    siteName,
    title: "Crime Recordings | True Crime Public Records Archive",
    description:
      "Explore documented criminal cases through police interviews, interrogations, dispatch audio, 911 calls, body-camera footage, video evidence, crime-scene photographs, graphic visual evidence, and public-record case documents.",
    images: [
      {
        url: "/crime-recordings-logo.png",
        width: 1200,
        height: 1200,
        alt: "Crime Recordings true crime public records archive",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Crime Recordings | True Crime Public Records Archive",
    description:
      "Police interviews, interrogations, dispatch audio, video evidence, crime-scene photographs, public records, and documented criminal cases.",
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

  verification: {
    // If you later get a Google Search Console
    // verification token, it can go here:
    //
    // google: "YOUR_GOOGLE_VERIFICATION_TOKEN",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#080808",
};

const websiteStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${siteUrl}/#website`,
  url: `${siteUrl}/`,
  name: siteName,
  alternateName: [
    "CrimeRecordings",
    "crimerecordings.com",
  ],
  description:
    "Crime Recordings is a public-record true-crime archive featuring police interviews, interrogations, dispatch audio, 911 calls, body-camera footage, video evidence, crime-scene photographs, graphic visual evidence, and case documents.",
  publisher: {
    "@id": `${siteUrl}/#organization`,
  },
  inLanguage: "en-US",
};

const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${siteUrl}/#organization`,
  name: siteName,
  alternateName: [
    "CrimeRecordings",
    "CrimeRecordings.com",
  ],
  url: `${siteUrl}/`,
  logo: {
    "@type": "ImageObject",
    url: `${siteUrl}/crime-recordings-logo.png`,
    contentUrl: `${siteUrl}/crime-recordings-logo.png`,
    caption: "Crime Recordings",
  },
  image: `${siteUrl}/crime-recordings-logo.png`,
  description:
    "Crime Recordings is a public-record documentary archive of criminal cases, police recordings, photographs, video evidence, case documents, and investigative materials, including sensitive and graphic crime-scene imagery.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
    >
      <body>
        {children}

        <Script
          id="crime-recordings-website-schema"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              websiteStructuredData,
            ).replace(/</g, "\\u003c"),
          }}
        />

        <Script
          id="crime-recordings-organization-schema"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              organizationStructuredData,
            ).replace(/</g, "\\u003c"),
          }}
        />

        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-0DQ71FYZWG"
          strategy="afterInteractive"
        />

        <Script
          id="google-analytics"
          strategy="afterInteractive"
        >
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