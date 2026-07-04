import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Gastos",
  title: "Expense Tracker",
  description: "Gastos compartidos de Guido y Dalu",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Gastos",
    statusBarStyle: "default"
  },
  icons: {
    icon: "/icon",
    apple: "/apple-icon"
  },
  other: {
    "apple-mobile-web-app-capable": "yes"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#f5f9ff",
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
