import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
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
  title: {
    default: "coolfollowers.com",
    template: "%s | coolfollowers.com",
  },
  description: "Personal Instagram analytics dashboard",
  keywords: ["instagram", "analytics", "dashboard", "personal"],
  authors: [{ name: "Ani Potts" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://coolfollowers.com",
    title: "coolfollowers.com",
    description: "Personal Instagram analytics dashboard",
    siteName: "coolfollowers.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "coolfollowers.com",
    description: "Personal Instagram analytics dashboard",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <ThemeProvider defaultTheme="system" storageKey="coolfollowers-theme">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
