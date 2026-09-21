import { zoomIdentity } from "d3-zoom";
import { Transformer } from "markmap-lib";
import { Markmap } from "markmap-view";
import {
  applyCameraCommand,
  contentShift,
  counterPan,
  SCALE_MAX,
  SCALE_MIN,
  titleFirstTransform,
  type CameraCommand,
  type RootNodeRect,
  type TreeRect,
  type Viewport,
  type ZoomTransform,
} from "../model/mindmapCamera";
import { disableMarkmapHtml } from "./disableMarkmapHtml";

export type SessionMarkmapHost = {
  replaceDocument: (markdown: string) => void;
  command: (command: CameraCommand) => void;
  readScale: () => number;
  subscribe: (listener: () => void) => () => void;
  dispose: () => void;
};

type ZoomEvent = {
  readonly sourceEvent: Event | null;
  readonly transform: {
    readonly x: number;
    readonly y: number;
    readonly k: number;
  };
};

type AppliedTransform = {
  readonly x: number;
  readonly y: number;
  readonly k: number;
};

type ZoomApi = {
  scaleExtent: (extent: readonly [number, number]) => unknown;
  on: (typenames: string, listener: ((event: ZoomEvent) => void) | null) => unknown;
  transform: (selection: SvgApi, transform: AppliedTransform) => void;
};

type SvgApi = {
  call: (transformFn: ZoomApi["transform"], transform: AppliedTransform) => unknown;
};

export function createSessionMarkmapHost(svg: SVGSVGElement): SessionMarkmapHost {
  const transformer = new Transformer();
  disableMarkmapHtml(transformer);

  const markmap = new Markmap(svg, {
    autoFit: false,
    zoom: true,
    pan: true,
    duration: 0,
  });
  const zoom = markmap.zoom as unknown as ZoomApi;
  const view = markmap.svg as unknown as SvgApi;
  zoom.scaleExtent([SCALE_MIN, SCALE_MAX]);

  const listeners = new Set<() => void>();
  let current: ZoomTransform = { x: 0, y: 0, k: 1 };
  let rememberedRoot: RootNodeRect | null = null;
  let zoomGesture = false;
  let userMoved = false;
  let replaceGeneration = 0;
  let disposed = false;

  zoom.on("start.reqlogue", (event: ZoomEvent) => {
    if (event.sourceEvent === null) {
      return;
    }
    zoomGesture = true;
    userMoved = true;
  });
  zoom.on("end.reqlogue", () => {
    zoomGesture = false;
  });
  const frameObserver = new ResizeObserver(() => {
    if (disposed || userMoved || rememberedRoot === null) {
      return;
    }
    applyTransform(titleFirstTransform(readViewport(), rememberedRoot));
  });
  frameObserver.observe(svg);

  zoom.on("zoom.reqlogue", (event: ZoomEvent) => {
    current = {
      x: event.transform.x,
      y: event.transform.y,
      k: event.transform.k,
    };
    for (const listener of listeners) {
      listener();
    }
  });

  function applyTransform(next: ZoomTransform): void {
    view.call(
      zoom.transform,
      zoomIdentity.translate(next.x, next.y).scale(next.k),
    );
  }

  function readViewport(): Viewport {
    const box = svg.getBoundingClientRect();
    return { width: box.width, height: box.height };
  }

  function readRootRect(): RootNodeRect | null {
    const data = markmap.state.data;
    if (data === undefined) {
      return null;
    }
    const { x, y, width, height } = data.state.rect;
    return { kind: "root", x, y, width, height };
  }

  function readTreeRect(): TreeRect | null {
    const { x1, y1, x2, y2 } = markmap.state.rect;
    const width = x2 - x1;
    const height = y2 - y1;
    if (width <= 0 || height <= 0) {
      return null;
    }
    return { kind: "tree", x: x1, y: y1, width, height };
  }

  async function replaceDocumentAsync(markdown: string): Promise<void> {
    const generation = ++replaceGeneration;
    const { root } = transformer.transform(markdown);
    await markmap.setData(root);
    if (disposed || generation !== replaceGeneration) {
      return;
    }
    const nextRoot = readRootRect();
    if (nextRoot === null) {
      return;
    }
    if (rememberedRoot === null) {
      applyTransform(titleFirstTransform(readViewport(), nextRoot));
    } else if (!zoomGesture) {
      applyTransform(counterPan(current, contentShift(rememberedRoot, nextRoot)));
    }
    rememberedRoot = nextRoot;
  }

  return {
    replaceDocument(markdown: string) {
      if (disposed) {
        return;
      }
      void replaceDocumentAsync(markdown);
    },
    command(cameraCommand: CameraCommand) {
      if (disposed) {
        return;
      }
      userMoved = true;
      const tree = readTreeRect();
      if (tree === null) {
        return;
      }
      applyTransform(
        applyCameraCommand(cameraCommand, current, readViewport(), tree),
      );
    },
    readScale() {
      return current.k;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      frameObserver.disconnect();
      listeners.clear();
      zoom.on("start.reqlogue", null);
      zoom.on("zoom.reqlogue", null);
      zoom.on("end.reqlogue", null);
      markmap.destroy();
    },
  };
}
