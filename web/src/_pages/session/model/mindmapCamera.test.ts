import { describe, expect, it } from "vitest";
import {
  applyCameraCommand,
  contentShift,
  counterPan,
  fitAllTransform,
  steppedTransform,
  titleFirstTransform,
  type RootNodeRect,
  type TreeRect,
  type Viewport,
  type ZoomTransform,
} from "./mindmapCamera";

const viewport = { width: 800, height: 600 } as const satisfies Viewport;

describe("titleFirstTransform", () => {
  it("pins the root at x=48, vertically centered, at scale 1 when the title fits", () => {
    const root = {
      kind: "root",
      x: 10,
      y: 20,
      width: 100,
      height: 40,
    } as const satisfies RootNodeRect;

    expect(titleFirstTransform(viewport, root)).toEqual({
      x: 38,
      y: 260,
      k: 1,
    });
  });

  it("does not zoom a small title up to 2", () => {
    const root = {
      kind: "root",
      x: 0,
      y: 0,
      width: 20,
      height: 10,
    } as const satisfies RootNodeRect;

    expect(titleFirstTransform(viewport, root)).toEqual({
      x: 48,
      y: 295,
      k: 1,
    });
  });

  it("ignores a large tree because it only accepts a RootNodeRect", () => {
    const root = {
      kind: "root",
      x: 0,
      y: 0,
      width: 80,
      height: 20,
    } as const satisfies RootNodeRect;
    const _tree = {
      kind: "tree",
      x: 0,
      y: 0,
      width: 4000,
      height: 3000,
    } as const satisfies TreeRect;

    expect(titleFirstTransform(viewport, root)).toEqual({
      x: 48,
      y: 290,
      k: 1,
    });
    // @ts-expect-error TreeRect is not a RootNodeRect
    titleFirstTransform(viewport, _tree);
  });

  it("drops k so a title wider than the viewport still fits", () => {
    const root = {
      kind: "root",
      x: 100,
      y: 50,
      width: 1600,
      height: 40,
    } as const satisfies RootNodeRect;

    expect(titleFirstTransform(viewport, root)).toEqual({
      x: -2,
      y: 265,
      k: 0.5,
    });
  });

  it("drops k so a title taller than the viewport still fits", () => {
    const root = {
      kind: "root",
      x: 0,
      y: 0,
      width: 80,
      height: 1200,
    } as const satisfies RootNodeRect;

    expect(titleFirstTransform(viewport, root)).toEqual({
      x: 48,
      y: 0,
      k: 0.5,
    });
  });

  it("clamps a huge title to 0.25", () => {
    const root = {
      kind: "root",
      x: 0,
      y: 0,
      width: 8000,
      height: 40,
    } as const satisfies RootNodeRect;

    expect(titleFirstTransform(viewport, root)).toEqual({
      x: 48,
      y: 295,
      k: 0.25,
    });
  });
});

describe("fitAllTransform", () => {
  it("shrinks a large tree and centers it", () => {
    const tree = {
      kind: "tree",
      x: 0,
      y: 0,
      width: 2000,
      height: 1000,
    } as const satisfies TreeRect;

    expect(fitAllTransform(viewport, tree)).toEqual({
      x: 20,
      y: 110,
      k: 0.38,
    });
  });

  it("accounts for a tree origin while shrinking", () => {
    const tree = {
      kind: "tree",
      x: 100,
      y: 50,
      width: 2000,
      height: 1000,
    } as const satisfies TreeRect;

    expect(fitAllTransform(viewport, tree)).toEqual({
      x: -18,
      y: 91,
      k: 0.38,
    });
  });

  it("caps fit scale at 4", () => {
    const tree = {
      kind: "tree",
      x: 0,
      y: 0,
      width: 80,
      height: 60,
    } as const satisfies TreeRect;

    expect(fitAllTransform(viewport, tree)).toEqual({
      x: 240,
      y: 180,
      k: 4,
    });
  });

  it("clamps an oversized tree to 0.25", () => {
    const tree = {
      kind: "tree",
      x: 0,
      y: 0,
      width: 10000,
      height: 10000,
    } as const satisfies TreeRect;

    expect(fitAllTransform(viewport, tree)).toEqual({
      x: -850,
      y: -950,
      k: 0.25,
    });
  });
});

describe("steppedTransform", () => {
  const current = { x: 100, y: 50, k: 1 } as const satisfies ZoomTransform;

  it("steps in around the viewport center", () => {
    expect(steppedTransform(current, viewport, "in")).toEqual({
      x: 25,
      y: -12.5,
      k: 1.25,
    });
  });

  it("steps out around the viewport center", () => {
    expect(
      steppedTransform({ x: 25, y: -12.5, k: 1.25 }, viewport, "out"),
    ).toEqual({
      x: 99.99999999999999,
      y: 49.999999999999986,
      k: 1,
    });
  });

  it("keeps k at 4 when stepping in at the rail", () => {
    expect(steppedTransform({ x: 10, y: 20, k: 4 }, viewport, "in")).toEqual({
      x: 10,
      y: 20,
      k: 4,
    });
  });

  it("keeps k at 0.25 when stepping out at the rail", () => {
    expect(
      steppedTransform({ x: 10, y: 20, k: 0.25 }, viewport, "out"),
    ).toEqual({
      x: 10,
      y: 20,
      k: 0.25,
    });
  });

  it("clamps a step that would pass 4", () => {
    expect(steppedTransform({ x: 0, y: 0, k: 3.5 }, viewport, "in")).toEqual({
      x: 400 * (1 - 4 / 3.5),
      y: 300 * (1 - 4 / 3.5),
      k: 4,
    });
  });
});

describe("contentShift and counterPan", () => {
  it("shifts by the root origin delta", () => {
    expect(
      contentShift(
        { kind: "root", x: 10, y: 20, width: 100, height: 40 },
        { kind: "root", x: 20, y: 15, width: 120, height: 40 },
      ),
    ).toEqual({ dx: 10, dy: -5 });
  });

  it("copies k and translates by the scaled shift", () => {
    expect(counterPan({ x: 38, y: 260, k: 1 }, { dx: 10, dy: -5 })).toEqual({
      k: 1,
      x: 28,
      y: 265,
    });
    expect(counterPan({ x: 38, y: 260, k: 2 }, { dx: 10, dy: -5 })).toEqual({
      k: 2,
      x: 18,
      y: 270,
    });
  });
});

describe("applyCameraCommand", () => {
  const current = { x: 100, y: 50, k: 1 } as const satisfies ZoomTransform;
  const tree = {
    kind: "tree",
    x: 0,
    y: 0,
    width: 2000,
    height: 1000,
  } as const satisfies TreeRect;

  it("zooms in the way the host will", () => {
    expect(
      applyCameraCommand({ type: "zoom-in" }, current, viewport, tree),
    ).toEqual({
      x: 25,
      y: -12.5,
      k: 1.25,
    });
  });

  it("zooms out the way the host will", () => {
    expect(
      applyCameraCommand({ type: "zoom-out" }, current, viewport, tree),
    ).toEqual({
      x: 160,
      y: 99.99999999999999,
      k: 0.8,
    });
  });

  it("fits the whole tree the way the host will", () => {
    expect(
      applyCameraCommand({ type: "fit" }, current, viewport, tree),
    ).toEqual({
      x: 20,
      y: 110,
      k: 0.38,
    });
  });
});
