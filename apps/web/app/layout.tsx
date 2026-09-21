import type { Metadata } from "next";
import { AppShell } from "@/_app/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "reqlogue",
    template: "%s · reqlogue",
  },
  description: "要件定義ヒアリング用AIエージェント",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
