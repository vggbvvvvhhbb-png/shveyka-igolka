import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Личные страницы в индексе не нужны: мерки и журнал владельца,
      // форма входа и история диалогов.
      disallow: ["/api/", "/journal", "/measurements", "/owner", "/assistant/history"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
