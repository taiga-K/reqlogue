import Image from "next/image";
import {
  arrowsDown,
  circleBlush,
  circleMint,
  circleYellow,
  clippedDocument,
  documentCharacter,
  flowerCoral,
  flowerMint,
  speechBubbleDots,
  speechBubbleLines,
  speechBubbleSpeak,
} from "@/shared/ui";
import styles from "./HomePage.module.css";

export function HomeArt() {
  return (
    <div className={styles["art"]} aria-hidden="true">
      <Image className={styles["circleBlush"]} src={circleBlush} alt="" />
      <Image className={styles["circleMint"]} src={circleMint} alt="" />
      <Image className={styles["circleYellow"]} src={circleYellow} alt="" />
      <span className={styles["plusCoral"]} />
      <span className={styles["plusMint"]} />
      <Image className={styles["flowerCoral"]} src={flowerCoral} alt="" />
      <Image className={styles["flowerMint"]} src={flowerMint} alt="" />
      <Image className={styles["bubbleDots"]} src={speechBubbleDots} alt="" />
      <Image className={styles["bubbleSpeak"]} src={speechBubbleSpeak} alt="" />
      <Image className={styles["bubbleLines"]} src={speechBubbleLines} alt="" />
      <Image className={styles["arrows"]} src={arrowsDown} alt="" />
      <Image className={styles["document"]} src={clippedDocument} alt="" />
      <Image className={styles["character"]} src={documentCharacter} alt="" />
    </div>
  );
}
