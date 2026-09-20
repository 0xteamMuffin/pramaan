import type { Metadata, Viewport } from "next";
import { Inter, Mukta } from "next/font/google";
import "@/styles/globals.css";
import { AccessibilityProvider } from "@/components/providers/AccessibilityProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { TopUtilityBar } from "@/components/layout/TopUtilityBar";
import { SkipLink } from "@/components/layout/SkipLink";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mukta = Mukta({
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mukta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PRAMAAN — Bid Compliance Verification",
  description:
    "AI-powered, evidence-first bid compliance verification for GeM procurement. Decision support for the procuring officer.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#05256E",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" data-contrast="normal" suppressHydrationWarning>
      <body className={`${inter.variable} ${mukta.variable} font-sans`}>
        <AccessibilityProvider>
          <AuthProvider>
            <SkipLink />
            <TopUtilityBar />
            {children}
          </AuthProvider>
        </AccessibilityProvider>
      </body>
    </html>
  );
}
