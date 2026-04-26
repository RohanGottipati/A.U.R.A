import type { Metadata } from "next";
import "./globals.css";
import { ModalProvider } from "@/context/ModalContext";

export const metadata: Metadata = {
  title: "A.U.R.A — Spatial Simulation Infrastructure",
  description: "Turn static floor plans into living 3D environments you can walk through, test, and stress — before a single thing is built.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ModalProvider>
          {children}
        </ModalProvider>
      </body>
    </html>
  );
}
