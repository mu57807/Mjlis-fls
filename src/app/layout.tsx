import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { brand } from "@brand";
import { passwordConfigured } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/noto-kufi-arabic/400.css";
import "@fontsource/noto-kufi-arabic/600.css";
import "@fontsource/noto-kufi-arabic/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: brand.appName,
  description: "Turn Learning From Incident reports into short safety videos.",
};

const brandVars = {
  "--brand-primary": brand.colors.primary,
  "--brand-primary-soft": brand.colors.primarySoft,
  "--brand-accent": brand.colors.accent,
  "--brand-accent-soft": brand.colors.accentSoft,
  "--brand-background": brand.colors.background,
  "--brand-surface": brand.colors.surface,
  "--brand-text": brand.colors.text,
  "--brand-muted": brand.colors.mutedText,
  "--brand-success": brand.colors.success,
  "--brand-danger": brand.colors.danger,
  "--brand-font-latin": `"${brand.fonts.latin}"`,
  "--brand-font-arabic": `"${brand.fonts.arabic}"`,
} as CSSProperties;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Settings are read when the page is requested, not when the app is built.
  await connection();
  return (
    <html lang="en" style={brandVars} className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="bg-brand text-white">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={brand.logo} alt="" className="h-8 w-8" />
              <span>{brand.appName}</span>
            </Link>
            <nav className="ml-auto flex gap-1 text-sm">
              <Link href="/" className="rounded px-3 py-1.5 hover:bg-white/10">
                New LFI
              </Link>
              <Link href="/history" className="rounded px-3 py-1.5 hover:bg-white/10">
                History
              </Link>
              {passwordConfigured() && <LogoutButton />}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
