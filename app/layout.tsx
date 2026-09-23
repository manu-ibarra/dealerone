import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import RegisterSW from "@/components/RegisterSW";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DealerOne",
  description: "Single-device dealer manager for home poker games.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DealerOne",
  },
};

export const viewport: Viewport = {
  themeColor: "#C15F3C",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-pampas text-ink">
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
