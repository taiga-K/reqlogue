import Image from "next/image";
import { meetingNotebook, penMascot } from "@/shared/ui/meeting-prep";
import styles from "./PrepareArt.module.css";

export function PrepareArt() {
  return (
    <div className={styles["scene"]} aria-hidden="true">
      <Image className={styles["notebook"]} src={meetingNotebook} alt="" sizes="22vw" />
      <Image className={styles["mascot"]} src={penMascot} alt="" sizes="18vw" />
    </div>
  );
}
