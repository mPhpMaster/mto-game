import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import AppVersion from "@/components/AppVersion";
import DeepLinkHandler from "@/components/DeepLinkHandler";
import PwaRegister from "@/components/PwaRegister";
import { APP_VERSION } from "@/lib/version";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700", "900"],
});

export const metadata: Metadata = {
  title: "مواجهة الوحوش — MTO",
  description:
    "لعبة كروت استراتيجية: 200 كارت، مطابقة على طريقة الأونو، نظام طاقة متصاعد، هجمات مشتركة، وحش أعظم يحسم المباراة.",
  manifest: "/manifest.webmanifest",
  applicationName: "مواجهة الوحوش",
  appleWebApp: {
    capable: true,
    title: "مواجهة الوحوش",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  other: { "app-version": APP_VERSION },
};

export const viewport: Viewport = {
  themeColor: "#070912",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  // اللوحة كثيفة على الجوال، فنترك للاعب حرّية التكبير
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <AppVersion />
        <DeepLinkHandler />
        <PwaRegister />
      </body>
    </html>
  );
}
