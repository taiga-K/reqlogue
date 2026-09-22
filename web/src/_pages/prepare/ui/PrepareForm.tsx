"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type SyntheticEvent } from "react";
import { startNewMeeting } from "@/entities/meeting";
import { Button } from "@/shared/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { briefOf } from "../model/meetingBrief";
import styles from "./PrepareForm.module.css";

const NAME_ID = "meeting-name";
const OVERVIEW_ID = "meeting-overview";

export function PrepareForm() {
  const router = useRouter();
  const submitting = useRef(false);
  const [pending, setPending] = useState(false);
  const [nameRaw, setNameRaw] = useState("");
  const [overviewRaw, setOverviewRaw] = useState("");
  const brief = briefOf(nameRaw, overviewRaw);

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) {
      return;
    }
    switch (brief.status) {
      case "unnamed":
        return;
      case "ready": {
        submitting.current = true;
        setPending(true);
        const meeting = startNewMeeting({
          name: brief.name,
          overview: brief.overview,
        });
        router.push(`/session/${meeting.id}`);
        return;
      }
      default: {
        const _exhaustive: never = brief;
        return _exhaustive;
      }
    }
  }

  return (
    <form className={styles["form"]} onSubmit={handleSubmit}>
      <FieldGroup className="gap-[max(1.5rem,calc(2*var(--s)))]">
        <Field className="gap-[max(0.55rem,calc(0.75*var(--s)))]">
          <FieldLabel
            htmlFor={NAME_ID}
            className="text-[length:max(1rem,calc(1.35*var(--s)))] font-bold text-[#1a1a1a]"
          >
            会議名
          </FieldLabel>
          <Input
            id={NAME_ID}
            name="meetingName"
            autoComplete="off"
            placeholder="例：新サービスの打ち合わせ"
            value={nameRaw}
            className="h-[max(3.25rem,calc(3.6*var(--s)))] rounded-[max(0.85rem,calc(1*var(--s)))] bg-card px-[max(1rem,calc(1.2*var(--s)))] text-[length:max(1rem,calc(1.15*var(--s)))] md:text-[length:max(1rem,calc(1.15*var(--s)))]"
            onChange={(event) => {
              setNameRaw(event.currentTarget.value);
            }}
          />
        </Field>
        <Field className="gap-[max(0.55rem,calc(0.75*var(--s)))]">
          <FieldLabel
            htmlFor={OVERVIEW_ID}
            className="text-[length:max(1rem,calc(1.35*var(--s)))] font-bold text-[#1a1a1a]"
          >
            会議の概要
          </FieldLabel>
          <textarea
            id={OVERVIEW_ID}
            name="meetingOverview"
            autoComplete="off"
            placeholder="今回の会議で話したいことを入力してください"
            value={overviewRaw}
            className="min-h-[max(8rem,calc(9*var(--s)))] w-full min-w-0 resize-y rounded-[max(0.85rem,calc(1*var(--s)))] border border-input bg-card px-[max(1rem,calc(1.2*var(--s)))] py-[max(0.85rem,calc(1*var(--s)))] text-[length:max(1rem,calc(1.15*var(--s)))] text-[#1a1a1a] outline-none placeholder:text-muted-foreground focus-visible:border-input focus-visible:ring-0"
            onChange={(event) => {
              setOverviewRaw(event.currentTarget.value);
            }}
          />
        </Field>
        <Button
          type="submit"
          size="lg"
          disabled={brief.status !== "ready" || pending}
          className="h-[max(3rem,calc(4.9*var(--s)))] w-[min(calc(25.3*var(--s)),20rem)] max-w-full self-start rounded-full"
        >
          次へ
          <ArrowRight data-icon="inline-end" />
        </Button>
      </FieldGroup>
    </form>
  );
}
