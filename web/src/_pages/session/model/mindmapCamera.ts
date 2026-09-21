export const SCALE_MIN = 0.25;
export const SCALE_MAX = 4;
export const SCALE_STEP = 1.25;
export const FIT_RATIO = 0.95;

export type RootNodeRect = {
  readonly kind: "root";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type TreeRect = {
  readonly kind: "tree";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type Viewport = {
  readonly width: number;
  readonly height: number;
};

export type ZoomTransform = {
  readonly x: number;
  readonly y: number;
  readonly k: number;
};

export type ContentShift = {
  readonly dx: number;
  readonly dy: number;
};

export type CameraCommand =
  | { readonly type: "zoom-in" }
  | { readonly type: "zoom-out" }
  | { readonly type: "fit" };

export type ZoomDirection = "in" | "out";

export function titleFirstTransform(
  viewport: Viewport,
  root: RootNodeRect,
): ZoomTransform {
  const k = clampScale(
    Math.min(1, fitScale(viewport.width, root.width), fitScale(viewport.height, root.height)),
    SCALE_MIN,
    1,
  );
  const rootCenterX = root.x + root.width / 2;
  return {
    x: viewport.width / 2 - rootCenterX * k,
    y: viewport.height / 2 - (root.y + root.height / 2) * k,
    k,
  };
}

export function fitAllTransform(
  viewport: Viewport,
  tree: TreeRect,
): ZoomTransform {
  const k = clampScale(
    Math.min(
      fitScale(viewport.width, tree.width) * FIT_RATIO,
      fitScale(viewport.height, tree.height) * FIT_RATIO,
      SCALE_MAX,
    ),
    SCALE_MIN,
    SCALE_MAX,
  );
  return {
    x: (viewport.width - tree.width * k) / 2 - tree.x * k,
    y: (viewport.height - tree.height * k) / 2 - tree.y * k,
    k,
  };
}

export function steppedTransform(
  current: ZoomTransform,
  viewport: Viewport,
  direction: ZoomDirection,
): ZoomTransform {
  const nextK = clampScale(
    direction === "in" ? current.k * SCALE_STEP : current.k / SCALE_STEP,
    SCALE_MIN,
    SCALE_MAX,
  );
  const scale = current.k === 0 ? 1 : nextK / current.k;
  return {
    x: current.x * scale + (viewport.width / 2) * (1 - scale),
    y: current.y * scale + (viewport.height / 2) * (1 - scale),
    k: nextK,
  };
}

export function contentShift(
  before: RootNodeRect,
  after: RootNodeRect,
): ContentShift {
  return {
    dx: after.x - before.x,
    dy: after.y - before.y,
  };
}

export function counterPan(
  current: ZoomTransform,
  shift: ContentShift,
): ZoomTransform {
  // Copy k so a later layout only translates; it cannot rescale.
  return {
    k: current.k,
    x: current.x - shift.dx * current.k,
    y: current.y - shift.dy * current.k,
  };
}

export function applyCameraCommand(
  command: CameraCommand,
  current: ZoomTransform,
  viewport: Viewport,
  tree: TreeRect,
): ZoomTransform {
  switch (command.type) {
    case "zoom-in":
      return steppedTransform(current, viewport, "in");
    case "zoom-out":
      return steppedTransform(current, viewport, "out");
    case "fit":
      return fitAllTransform(viewport, tree);
    default: {
      const _exhaustive: never = command;
      return _exhaustive;
    }
  }
}

function fitScale(viewportSize: number, contentSize: number): number {
  if (contentSize <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  return viewportSize / contentSize;
}

function clampScale(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
