import type { ReactNode } from "react";
import "@astryxdesign/core/astryx.css";
import "@astryxdesign/theme-neutral/theme.css";
import "./requirements-theme.css";

export default function RequirementsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
