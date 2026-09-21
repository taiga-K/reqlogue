import { describe, expect, it } from "vitest";
import { formatAdviceKind } from "./format-advice-kind";

describe("formatAdviceKind", () => {
  it("maps every advice kind to a Japanese label", () => {
    expect(formatAdviceKind("ambiguity")).toBe("曖昧");
    expect(formatAdviceKind("contradiction")).toBe("矛盾");
    expect(formatAdviceKind("gap")).toBe("漏れ");
  });
});
