import type { TranscriptSegment } from "@reqlogue/contracts";
import { cssClass } from "@/shared/lib";
import styles from "./live-transcript.module.css";

type LiveTranscriptProps = {
  segments: TranscriptSegment[];
};

export function LiveTranscript({ segments }: LiveTranscriptProps) {
  if (segments.length === 0) {
    return <p className={cssClass(styles, "empty")}>文字起こしはまだありません</p>;
  }

  return (
    <ol className={cssClass(styles, "list")} aria-label="会議の文字起こし">
      {segments.map((segment) => (
        <li key={segment.id} className={cssClass(styles, "item")}>
          <span className={cssClass(styles, "speaker")}>{segment.speaker}</span>
          <p className={cssClass(styles, "text")}>{segment.text}</p>
        </li>
      ))}
    </ol>
  );
}
