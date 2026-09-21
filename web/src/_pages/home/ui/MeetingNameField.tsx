"use client";

import { useState } from "react";
import { homeCopy } from "./home-copy";
import styles from "./MeetingNameField.module.css";

export function MeetingNameField() {
  const [meetingName, setMeetingName] = useState("");

  return (
    <form
      className={styles["form"]}
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <label className={styles["label"]} htmlFor="meeting-name">
        {homeCopy.meetingNameLabel}
      </label>
      <input
        className={styles["input"]}
        id="meeting-name"
        name="meetingName"
        value={meetingName}
        onChange={(event) => {
          setMeetingName(event.target.value);
        }}
        placeholder={homeCopy.meetingNamePlaceholder}
        autoComplete="off"
      />
    </form>
  );
}
