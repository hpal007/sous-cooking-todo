import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sous — your daily cooking to-do list",
  description:
    "Turn your day into a personal cooking to-do list: breakfast, lunch & dinner plan, grocery list, smart substitutions, and budget feasibility. Built with Google AI Studio (Gemini).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
