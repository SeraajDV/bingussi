import type { Metadata } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { ClerkProvider } from "@clerk/nextjs";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "sonner";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bingussi",
  description: "A little daily competition, a lot more connection.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${jakartaSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        <ClerkProvider dynamic>
          <ConvexClientProvider>
            <SiteHeader />
            {children}
            <Toaster theme="dark" richColors />
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
