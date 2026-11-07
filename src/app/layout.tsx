import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Waymo Cabin Prototype",
  description: "3D prototype of passenger interaction on the cabin screen during a ride.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`dark ${poppins.variable}`} data-theme="dark">
      <body className="bg-background font-sans text-foreground antialiased">{children}</body>
    </html>
  );
}
