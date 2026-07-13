import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FounderReach",
  description: "Who to contact. What to say."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

