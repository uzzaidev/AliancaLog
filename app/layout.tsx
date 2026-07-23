import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Uma única fonte para os 3 perfis (gerência, motorista, cliente).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aliança Log",
  description: "Controle de canhotos de entrega em tempo real — Rotta Logística.",
  applicationName: "Aliança Log",
  appleWebApp: { capable: true, title: "Aliança Log", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#F37312",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
