import type { AdviceKind } from "@reqlogue/contracts";
import { assertNever } from "@/shared/lib";

export function formatAdviceKind(kind: AdviceKind): string {
  switch (kind) {
    case "ambiguity":
      return "曖昧";
    case "contradiction":
      return "矛盾";
    case "gap":
      return "漏れ";
    default:
      return assertNever(kind);
  }
}
