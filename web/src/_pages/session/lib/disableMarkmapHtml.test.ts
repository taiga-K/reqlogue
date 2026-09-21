import { describe, expect, it, vi } from "vitest";
import { disableMarkmapHtml } from "./disableMarkmapHtml";

describe("disableMarkmapHtml", () => {
  it("turns off markdown-it html rules", () => {
    const disable = vi.fn();
    disableMarkmapHtml({ md: { disable } });
    expect(disable).toHaveBeenCalledWith(["html_block", "html_inline"]);
  });
});
