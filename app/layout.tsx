import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tree GPT",
  description: "Non-linear branching conversations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white font-sans text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
