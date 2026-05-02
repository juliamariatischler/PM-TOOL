import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PM Tool — Project Management",
  description: "Modern full-stack project management app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full overflow-hidden antialiased">{children}</body>
    </html>
  );
}
