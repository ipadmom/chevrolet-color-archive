import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Chevrolet Color Archive",
    template: "%s · Chevrolet Color Archive",
  },
  description:
    "A source-linked archive of Chevrolet factory paint colors by model and year.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Chevrolet Color Archive",
    description: "Factory paint colors, documented year by year.",
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
