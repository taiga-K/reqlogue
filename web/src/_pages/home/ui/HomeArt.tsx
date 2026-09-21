import Image from "next/image";
import {
  arrowsDown,
  clippedDocument,
  documentCharacter,
  speechBubbleDots,
  speechBubbleLines,
  speechBubbleSpeak,
} from "@/shared/ui";
import styles from "./HomePage.module.css";

export function HomeArt() {
  return (
    <div className={styles["art"]} data-testid="home-art" aria-hidden="true">
      <span className={styles["spark"]} />
      <span className={styles["plus"]} />
      <span className={styles["squiggle"]} />
      <Image className={styles["bubbleSpeak"]} src={speechBubbleSpeak} alt="" />
      <Image className={styles["bubbleDots"]} src={speechBubbleDots} alt="" />
      <Image className={styles["bubbleLines"]} src={speechBubbleLines} alt="" />
      <Image className={styles["arrows"]} src={arrowsDown} alt="" />
      <Image className={styles["document"]} src={clippedDocument} alt="" />
      <Image className={styles["character"]} src={documentCharacter} alt="" />
    </div>
  );
}
