import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearAllMeetings,
  parseMeetingId,
  readMeeting,
  readRequirements,
} from "@/entities/meeting";
import { StartMeetingControl } from "./StartMeetingControl";

const harness = vi.hoisted(() => {
  const state: {
    mode: "hang" | "reject";
    fail: () => void;
    releaseStop: () => void;
  } = {
    mode: "hang",
    fail: () => {},
    releaseStop: () => {},
  };
  let stopPromise = Promise.resolve();

  function arm(): void {
    stopPromise = new Promise<void>((resolve) => {
      state.releaseStop = resolve;
    });
  }

  function stop(): Promise<void> {
    if (state.mode === "reject") {
      return Promise.reject(new Error("shutdown failed"));
    }
    return stopPromise;
  }

  arm();
  return {
    state,
    arm,
    capture(onTranscribeFailure: () => void) {
      state.fail = onTranscribeFailure;
      return Promise.resolve({
        status: "started" as const,
        stop,
      });
    },
  };
});

const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("../lib/startMeetingCapture", () => ({
  startMeetingCapture: (ports: { onTranscribeFailure: () => void }) =>
    harness.capture(ports.onTranscribeFailure),
}));

function meetingId() {
  const id = parseMeetingId("meet-end");
  if (id === null) {
    throw new Error("id");
  }
  return id;
}

afterEach(() => {
  cleanup();
  clearAllMeetings();
  localStorage.clear();
  push.mockReset();
  harness.state.mode = "hang";
  harness.arm();
  vi.unstubAllEnvs();
});

describe("StartMeetingControl", () => {
  it("keeps 会議を終了 disabled when transcription fails during end", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_MOCKING", "enabled");
    const user = userEvent.setup();
    render(<StartMeetingControl meetingId={meetingId()} />);

    await user.click(screen.getByRole("button", { name: "会議を開始" }));
    await user.click(await screen.findByRole("button", { name: "会議を終了" }));

    harness.state.fail();

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("会議を終了");
    expect(
      screen.queryByText("文字起こしに接続できませんでした"),
    ).not.toBeInTheDocument();

    harness.state.releaseStop();
    await vi.waitFor(() => {
      expect(push).toHaveBeenCalledWith("/session/meet-end/requirements");
    });
    expect(
      screen.queryByText("文字起こしに接続できませんでした"),
    ).not.toBeInTheDocument();
  });

  it("does not start a new capture when transcription shutdown fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_MOCKING", "enabled");
    harness.state.mode = "reject";
    const user = userEvent.setup();
    const id = meetingId();
    render(<StartMeetingControl meetingId={id} />);

    await user.click(screen.getByRole("button", { name: "会議を開始" }));
    await user.click(await screen.findByRole("button", { name: "会議を終了" }));

    expect(
      await screen.findByText("要件定義書を作れませんでした"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveTextContent("会議を終了");
    expect(screen.queryByRole("button", { name: "会議を開始" })).toBeNull();
    expect(readMeeting(id)).not.toBeNull();
    expect(readRequirements(id)).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });
});
