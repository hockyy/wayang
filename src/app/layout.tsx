import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wayang - Collaborative Canvas Application",
  description: "A collaborative canvas application inspired by traditional Indonesian shadow puppetry. Create, edit, and view multi-layered canvases with real-time image manipulation, layer management, and intuitive drag-and-drop functionality.",
  keywords: ["wayang", "canvas", "collaborative", "image editing", "layers", "design tool", "shadow puppetry"],
  authors: [{ name: "Wayang Team" }],
  creator: "Wayang Team",
  publisher: "Wayang Team",
  robots: "index, follow",
  openGraph: {
    title: "Wayang - Collaborative Canvas Application",
    description: "Create and collaborate on multi-layered canvases with intuitive tools inspired by traditional Indonesian shadow puppetry.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Wayang - Collaborative Canvas Application",
    description: "Create and collaborate on multi-layered canvases with intuitive tools inspired by traditional Indonesian shadow puppetry.",
  },
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#3b82f6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
