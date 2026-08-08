import type { Metadata } from "next";
import "./globals.css";
import { ORG_CONFIG } from "@/config/certificate.config";

export const metadata: Metadata = {
  metadataBase: new URL(ORG_CONFIG.siteUrl),
  title: {
    default: `${ORG_CONFIG.siteTitle} | ${ORG_CONFIG.organizationAbbreviation} (${ORG_CONFIG.institutionAbbreviation})`,
    template: `%s | ${ORG_CONFIG.organizationAbbreviation} Certificate Portal`,
  },
  description: `${ORG_CONFIG.organizationName} (${ORG_CONFIG.institutionAbbreviation}) — ${ORG_CONFIG.siteTagline}`,
  openGraph: {
    title: `${ORG_CONFIG.siteTitle} | ${ORG_CONFIG.organizationAbbreviation}`,
    description: ORG_CONFIG.siteTagline,
    siteName: `${ORG_CONFIG.organizationAbbreviation} Certificate Portal`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${ORG_CONFIG.siteTitle} | ${ORG_CONFIG.organizationAbbreviation}`,
    description: ORG_CONFIG.siteTagline,
  },
  // Next.js automatically detects app/icon.png, app/apple-icon.png, and
  // app/opengraph-image.png by filename convention — no need to list
  // them here. To swap the logo, just replace those files (and
  // public/cbs-logo.png) and re-run the image-generation steps in the
  // README for a new organization's branding.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/*
        We intentionally rely on a high-quality system font stack
        (see tailwind.config.ts) rather than next/font/google so the
        app has zero external network dependencies at build time.
        To use a custom Google Font instead, swap this for
        next/font/google and update the CSS variables — see README.
      */}
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
