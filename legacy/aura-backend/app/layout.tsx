import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "A.U.R.A Backend",
  description: "API service for the A.U.R.A workspace.",
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
