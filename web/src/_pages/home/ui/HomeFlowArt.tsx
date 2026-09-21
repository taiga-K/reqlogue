import Image from "next/image";
import bubbleDots from "@/shared/ui/speech-bubble-dots.webp";
import bubbleSpeak from "@/shared/ui/speech-bubble-speak.webp";
import bubbleLines from "@/shared/ui/speech-bubble-lines.webp";
import clippedDocument from "@/shared/ui/clipped-document-portrait.webp";
import documentCharacter from "@/shared/ui/document-character.webp";
import styles from "./HomeFlowArt.module.css";

export function HomeFlowArt() {
  return (
    <div className={styles["scene"]} aria-hidden="true">
      <div className={styles["cluster"]}>
        <Image className={styles["bubbleSpeak"]} src={bubbleSpeak} alt="" sizes="20vw" />
        <Image className={styles["bubbleDots"]} src={bubbleDots} alt="" sizes="20vw" />
        <Image className={styles["bubbleLines"]} src={bubbleLines} alt="" sizes="20vw" />
      </div>
      <Image className={styles["note"]} src={clippedDocument} alt="" sizes="22vw" />
      <Image className={styles["character"]} src={documentCharacter} alt="" sizes="40vw" />
    </div>
  );
}
