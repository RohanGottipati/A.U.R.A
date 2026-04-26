import type { Metadata } from "next";
import localFont from "next/font/local";
import { DM_Mono, Syne } from "next/font/google";
import "./globals.css";
import { ModalProvider } from "@/context/ModalContext";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});
const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
});
const syne = Syne({
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  variable: "--font-syne",
});

export const metadata: Metadata = {
  title: "A.U.R.A — Spatial Simulation Infrastructure",
  description:
    "Turn static floor plans into living 3D environments you can walk through, test, and stress — before a single thing is built.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${dmMono.variable} ${syne.variable} antialiased`}
        suppressHydrationWarning
      >
        {/* Disable browser scroll restoration so the page always starts from the top.
            Otherwise the scroll-driven hero renders mid-animation on the first paint
            and only looks correct after a manual reload. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if('scrollRestoration' in history){history.scrollRestoration='manual';}window.scrollTo(0,0);}catch(e){}`,
          }}
        />
        <ModalProvider>{children}</ModalProvider>
      </body>
    </html>
  );
}
