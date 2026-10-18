import type { MetadataRoute } from "next";
import { copy } from "@/modules/cms/content";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Musical Club",
    short_name: "Musical Club",
    description: copy.experience,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0c0c0c",
    theme_color: "#e10600",
    lang: "es-AR",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
