import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Waymo Cabin Prototype",
  description: "3D prototype of passenger interaction on the cabin screen during a ride.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
