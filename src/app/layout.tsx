import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Savala AI — Full-Stack AI Interview & Coding Workspace",
  description: "Browser-based AI interview preparation, live audio transcription, coding lab, and resume analyzer.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
