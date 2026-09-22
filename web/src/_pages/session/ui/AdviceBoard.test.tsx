import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSyncExternalStore } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearAllMeetings,
  readMeeting,
  removeAdviceCard,
  saveAdviceProgress,
  startNewMeeting,
  subscribeMeetings,
  type AdviceCard,
  type MeetingId,
} from "@/entities/meeting";
import { AdviceBoard } from "./AdviceBoard";

vi.hoisted(() => {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  globalThis.ResizeObserver = ResizeObserverStub;
});

const EMPTY_ADVICE_CARDS: readonly AdviceCard[] = [];

afterEach(() => {
  clearAllMeetings();
});

function BoardFromRecord({ meetingId }: { readonly meetingId: MeetingId }) {
  const cards = useSyncExternalStore(
    subscribeMeetings,
    () => readMeeting(meetingId)?.adviceCards ?? EMPTY_ADVICE_CARDS,
    () => EMPTY_ADVICE_CARDS,
  );
  return (
    <AdviceBoard
      cards={cards}
      onMove={() => {}}
      onRemove={(id) => {
        removeAdviceCard(meetingId, id);
      }}
    />
  );
}

describe("AdviceBoard", () => {
  it("drops the deleted card immediately and leaves the others", async () => {
    const record = startNewMeeting(
      { name: "会議", overview: "" },
      () => "meet-board",
    );
    const quantity: AdviceCard = {
      id: "card-1",
      column: "advice",
      title: "数量",
      reason: "上限がない",
      suggestedQuestion: "上限はありますか？",
      quote: "数量の上限",
    };
    const schedule: AdviceCard = {
      id: "card-2",
      column: "doing",
      title: "納期",
      reason: "日付がない",
      suggestedQuestion: "いつまでですか？",
      quote: "納期の話",
    };
    saveAdviceProgress(record.id, [quantity, schedule], 3);
    render(<BoardFromRecord meetingId={record.id} />);

    expect(screen.getByRole("heading", { name: "数量" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "納期" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "納期を削除" }));

    expect(screen.queryByRole("heading", { name: "納期" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "数量" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "アドバイス" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "対応中" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "解決済み" })).toBeInTheDocument();
    expect(readMeeting(record.id)?.adviceCards).toEqual([quantity]);
    expect(readMeeting(record.id)?.adviceSentTranscriptOffset).toBe(3);
  });
});
