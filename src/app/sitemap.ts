import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.crimerecordings.com";
  const supabase = await createClient();

  const { data: cases, error } = await supabase
    .from("cases")
    .select("slug, updated_at, published_at")
    .eq("case_status", "published")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("Unable to generate case sitemap:", error);
  }

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/cases`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/membership`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/updates`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  const casePages: MetadataRoute.Sitemap =
    cases?.map((caseItem) => ({
      url: `${baseUrl}/cases/${caseItem.slug}`,
      lastModified: new Date(
        caseItem.updated_at ?? caseItem.published_at ?? Date.now(),
      ),
      changeFrequency: "monthly",
      priority: 0.8,
    })) ?? [];

  return [...staticPages, ...casePages];
}