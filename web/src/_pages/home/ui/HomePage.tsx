import type { Metadata } from "next";
import { HomeHeader } from "./HomeHeader";

export const metadata: Metadata = {
  title: "reqlogue",
  description: "要件定義ヒアリングを支援する AI エージェント",
};

export function HomePage() {
  return (
    <div>
      <HomeHeader />
      <main />
    </div>
  );
}
