import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Melbourne Sensory Map — Data Status",
  description:
    "Minimal status shell for the Melbourne sensory-friendly travel data backend",
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
