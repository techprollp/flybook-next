import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlyBook – Bills & Coins Money Book",
  description: "Modern debit, credit and coins money book",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/favicon.svg" }],
  },
  themeColor: "#161820",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
      </head>
      <body>{children}</body>
    </html>
  );
}
