import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Личные страницы в индексе не нужны.
      disallow: ["/api/", "/measurements"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
