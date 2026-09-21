"use client";

import type { SyntheticEvent } from "react";
import { useState } from "react";
import { draftOf } from "../model/meetingNameDraft";
import styles from "./MeetingNameForm.module.css";

const FIELD_ID = "meeting-name";
const PRIVACY_NOTE_ID = "meeting-name-privacy";

export function MeetingNameForm() {
  const [raw, setRaw] = useState("");
  const draft = draftOf(raw);

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    // TODO(session-api): submit stays inert until a start-session command exists.
  }

  return (
    <form className={styles["form"]} onSubmit={handleSubmit}>
      <label className={styles["label"]} htmlFor={FIELD_ID}>
        今日の会議のなまえ
      </label>
      <input
        className={styles["field"]}
        id={FIELD_ID}
        name="meetingName"
        type="text"
        value={raw}
        placeholder="例：新サービスの打ち合わせ"
        aria-describedby={PRIVACY_NOTE_ID}
        autoComplete="off"
        onChange={(event) => {
          setRaw(event.currentTarget.value);
        }}
      />
      <div className={styles["actions"]}>
        <button
          className={styles["primary"]}
          type="submit"
          disabled={draft.status === "blank"}
        >
          はじめる
        </button>
        <button className={styles["secondary"]} type="button">
          おためし
        </button>
      </div>
      <p className={styles["privacy"]} id={PRIVACY_NOTE_ID}>
        相手の画面には表示されません
      </p>
    </form>
  );
}
