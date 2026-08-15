import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://coolfollowers.com"),
  title: "coolfollowers.com",
  description: "Scan beside Instagram and see which followers are actually cool.",
  authors: [{ name: "Ani Potts" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "coolfollowers.com",
    description: "Scan beside Instagram and see which followers are actually cool.",
    siteName: "coolfollowers.com",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${manrope.variable} ${ibmPlexMono.variable} min-h-screen antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
