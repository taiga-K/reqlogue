import type { Metadata } from "next";
import type { ReactNode } from "react";
import { M_PLUS_Rounded_1c } from "next/font/google";
import "./globals.css";

const roundedSans = M_PLUS_Rounded_1c({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "reqlogue",
  description: "あなたの会議に、ちいさな相棒。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className={roundedSans.className}>{children}</body>
    </html>
  );
}
