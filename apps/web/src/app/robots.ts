import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Файл собирается на сервере при запросе: иначе адрес сайта запечатывается
// в образ при сборке, и на другом домене robots.txt указывал бы на чужой.
export const dynamic = "force-dynamic";

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
