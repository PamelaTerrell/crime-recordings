import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

function getProductionContentSecurityPolicy() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const bucketName = process.env.R2_BUCKET_NAME;
  const endpoint =
    process.env.R2_ENDPOINT ??
    (accountId
      ? `https://${accountId}.r2.cloudflarestorage.com`
      : undefined);

  if (!endpoint) {
    throw new Error(
      "R2_ENDPOINT or R2_ACCOUNT_ID is required for the production CSP.",
    );
  }

  if (
    !bucketName ||
    !/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/.test(
      bucketName,
    )
  ) {
    throw new Error(
      "A valid R2_BUCKET_NAME is required for the production CSP.",
    );
  }

  const r2Url = new URL(endpoint);

  if (r2Url.protocol !== "https:") {
    throw new Error(
      "The production R2 endpoint must use HTTPS.",
    );
  }

  const r2Origin = r2Url.origin;
  const r2BucketUrl = new URL(r2Origin);

  r2BucketUrl.hostname = `${bucketName}.${r2Url.hostname}`;

  const r2BucketOrigin = r2BucketUrl.origin;

  return `
    default-src 'self';
    base-uri 'self';
    object-src 'none';
    frame-ancestors 'none';
    frame-src 'none';
    form-action 'self';
    script-src 'self' 'unsafe-inline' https://www.googletagmanager.com;
    script-src-attr 'none';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: ${r2Origin} ${r2BucketOrigin} https://www.googletagmanager.com https://*.google-analytics.com;
    media-src 'self' ${r2Origin} ${r2BucketOrigin};
    font-src 'self';
    connect-src 'self' ${r2Origin} ${r2BucketOrigin} https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com;
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();
}

const sensitiveRouteCacheHeaders = [
  "/login/:path*",
  "/auth/:path*",
  "/account/:path*",
  "/admin/:path*",
].map((source) => ({
  source,
  headers: [
    {
      key: "Cache-Control",
      value:
        "private, no-cache, no-store, max-age=0, must-revalidate",
    },
  ],
}));

const nextConfig: NextConfig = {
  poweredByHeader: false,

  async headers() {
    const globalHeaders = [
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
      {
        key: "Permissions-Policy",
        value:
          "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
      },
    ];

    if (isProduction) {
      globalHeaders.push({
        key: "Content-Security-Policy",
        value: getProductionContentSecurityPolicy(),
      });
    }

    return [
      {
        source: "/:path*",
        headers: globalHeaders,
      },
      ...sensitiveRouteCacheHeaders,
    ];
  },

  async redirects() {
    return [
      {
        source: "/cases/michael-bargo-testing",
        destination: "/cases/michael-bargo",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
