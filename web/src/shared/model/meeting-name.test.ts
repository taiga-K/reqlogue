import { describe, expect, it } from "vitest";
import {
  MEETING_NAME_PARAM,
  draftFromParam,
  draftOf,
  meetingHref,
} from "./meeting-name";

describe("draftOf", () => {
  it("treats whitespace-only input as blank", () => {
    expect(draftOf("   ").status).toBe("blank");
  });

  it("trims the name it yields", () => {
    const draft = draftOf("  新サービスの打ち合わせ  ");
    expect(draft.status).toBe("ready");
    expect(draft.status === "ready" ? draft.name : undefined).toBe(
      "新サービスの打ち合わせ",
    );
  });

  it("keeps the raw buffer verbatim so the input stays faithful", () => {
    expect(draftOf("  あ ").raw).toBe("  あ ");
  });
});

describe("meetingHref", () => {
  it.each(["新サービスの打ち合わせ", "a&b=c", "  空白  "])(
    "round-trips %j through draftFromParam",
    (raw) => {
      const draft = draftOf(raw);
      expect(draft.status).toBe("ready");
      if (draft.status !== "ready") {
        return;
      }

      const href = meetingHref(draft.name);
      const param = new URL(href, "https://reqlogue.test").searchParams.get(
        MEETING_NAME_PARAM,
      );
      const parsed = draftFromParam(param ?? undefined);

      expect(parsed.status).toBe("ready");
      expect(parsed.status === "ready" ? parsed.name : undefined).toBe(
        draft.name,
      );
    },
  );
});

describe("draftFromParam", () => {
  it("reads a missing param as blank", () => {
    expect(draftFromParam(undefined).status).toBe("blank");
  });

  it("reads a repeated param as blank", () => {
    expect(draftFromParam(["a", "b"]).status).toBe("blank");
  });
});
