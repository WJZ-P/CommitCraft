import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CommitCraft - Minecraft Style GitHub Contributions",
  description:
    "Turn your GitHub commit history into a Minecraft-style isometric SVG",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
