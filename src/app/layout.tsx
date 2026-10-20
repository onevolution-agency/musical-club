import type { Metadata, Viewport } from "next";
import { Oswald, Source_Sans_3 } from "next/font/google";
import { Pwa } from "@/components/pwa/pwa";
import { copy } from "@/modules/cms/content";
import "./globals.css";

const oswald = Oswald({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-oswald", display: "swap" });
const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-source",
  display: "swap",
});

const CANONICAL_ORIGIN = "https://musicalclub.com.ar";

export const metadata: Metadata = {
  metadataBase: new URL(CANONICAL_ORIGIN),
  title: { default: "Musical Club", template: "%s · Musical Club" },
  description: copy.experience,
  applicationName: "Musical Club",
  authors: [{ name: copy.directors.artistic }, { name: copy.directors.executive }],
  keywords: ["Musical Club", "teatro", "canto", "danza", "countries", "barrios cerrados", "Argentina"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: CANONICAL_ORIGIN,
    siteName: "Musical Club",
    title: "Musical Club",
    description: copy.experience,
    images: [
      {
        url: `${CANONICAL_ORIGIN}/og-v2.jpg`,
        width: 1200,
        height: 630,
        alt: "Musical Club",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Musical Club",
    description: copy.experience,
    images: [
      {
        url: `${CANONICAL_ORIGIN}/og-v2.jpg`,
        width: 1200,
        height: 630,
        alt: "Musical Club",
      },
    ],
  },
  robots: { index: true, follow: true },
  appleWebApp: { capable: true, title: "Musical Club", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#e10600",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${oswald.variable} ${sourceSans.variable}`}>
      <body>
        <a className="skip" href="#contenido">
          Saltar al contenido
        </a>
        {children}
        <Pwa />
      </body>
    </html>
  );
}
