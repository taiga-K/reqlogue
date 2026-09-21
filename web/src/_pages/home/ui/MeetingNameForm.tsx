"use client";

import { ArrowRight } from "lucide-react";
import { useState, type SyntheticEvent } from "react";
import { Button } from "@/shared/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { draftOf } from "../model/meetingNameDraft";
import styles from "./MeetingNameForm.module.css";

const FIELD_ID = "meeting-name";

export function MeetingNameForm() {
  const [raw, setRaw] = useState("");
  const draft = draftOf(raw);

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    // TODO(session-api): submit stays inert until a start-session command exists.
  }

  return (
    <form className={styles["form"]} onSubmit={handleSubmit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={FIELD_ID}>今日の会議のなまえ</FieldLabel>
          <Input
            id={FIELD_ID}
            name="meetingName"
            autoComplete="off"
            placeholder="例：新サービスの打ち合わせ"
            value={raw}
            className="h-[max(3rem,calc(4.9*var(--s)))] rounded-full bg-card px-[max(1.5rem,calc(2*var(--s)))]"
            onChange={(event) => {
              setRaw(event.currentTarget.value);
            }}
          />
        </Field>
        <Button
          type="submit"
          size="lg"
          disabled={draft.status === "blank"}
          className="h-[max(3rem,calc(4.9*var(--s)))] w-[calc(25.3*var(--s))] max-w-full rounded-full"
        >
          はじめる
          <ArrowRight data-icon="inline-end" />
        </Button>
      </FieldGroup>
    </form>
  );
}
