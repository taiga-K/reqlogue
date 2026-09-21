import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { homeCopy } from "./home-copy";
import { MeetingNameField } from "./MeetingNameField";

describe("MeetingNameField", () => {
  it("keeps the typed meeting name on the same form after submit", async () => {
    const user = userEvent.setup();
    render(<MeetingNameField />);

    const input = screen.getByLabelText(homeCopy.meetingNameLabel);
    await user.type(input, "キックオフ");
    await user.keyboard("{Enter}");

    expect(input).toHaveValue("キックオフ");
  });
});
