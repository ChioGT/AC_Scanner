import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Love or Control? — QVAC Private AI",
  description: "Demo privada para identificar señales de control, coerción y violencia con orientación psicológica y enfoque QVAC.",
  openGraph: {
    title: "Love or Control? — QVAC Private AI",
    description: "Tu historia te pertenece. Identifica señales de control con una demo de procesamiento local.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Love or Control? — QVAC Private AI",
    description: "Inteligencia privada para detectar señales de control y violencia.",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
