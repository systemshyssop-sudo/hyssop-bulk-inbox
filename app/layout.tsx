import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hyssop Bulk Inbox",
  description:
    "Hyssop Properties internal WhatsApp inbox and bulk messaging dashboard for managing customer communication",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}