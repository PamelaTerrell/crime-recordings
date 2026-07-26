import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/account/",
        "/auth/",
        "/login/",
      ],
    },
    sitemap: "https://www.crimerecordings.com/sitemap.xml",
  };
}