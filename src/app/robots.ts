import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const origin = siteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/alumno", "/profesor", "/api/", "/ingresar", "/registro"],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
