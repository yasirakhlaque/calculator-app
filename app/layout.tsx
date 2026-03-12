import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Not Boring Calculator",
  description: "The most aesthetic way to calculate anything",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
