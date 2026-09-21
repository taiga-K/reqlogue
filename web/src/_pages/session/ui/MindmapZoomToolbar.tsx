import { Minus, Plus, Scan } from "lucide-react";
import { Button } from "@/shared/ui/button";
import styles from "./MindmapZoomToolbar.module.css";

export type MindmapZoomToolbarProps = {
  readonly zoomInEnabled: boolean;
  readonly zoomOutEnabled: boolean;
  readonly fitEnabled: boolean;
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onFit: () => void;
};

export function MindmapZoomToolbar({
  zoomInEnabled,
  zoomOutEnabled,
  fitEnabled,
  onZoomIn,
  onZoomOut,
  onFit,
}: MindmapZoomToolbarProps) {
  return (
    <div className={styles["toolbar"]} role="group" aria-label="表示操作">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="拡大"
        disabled={!zoomInEnabled}
        onClick={onZoomIn}
      >
        <Plus />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="縮小"
        disabled={!zoomOutEnabled}
        onClick={onZoomOut}
      >
        <Minus />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="全体を表示"
        disabled={!fitEnabled}
        onClick={onFit}
      >
        <Scan />
      </Button>
    </div>
  );
}
