export const ADVICE_COLUMNS = [
  { id: "advice", label: "アドバイス" },
  { id: "doing", label: "対応中" },
  { id: "done", label: "解決済み" },
] as const;

export type AdviceColumn = (typeof ADVICE_COLUMNS)[number]["id"];

export type AdviceCard = {
  readonly id: string;
  readonly column: AdviceColumn;
  readonly title: string;
  readonly reason: string;
  readonly suggestedQuestion: string;
  readonly quote: string;
};

export type AdviceDraft = {
  readonly title: string;
  readonly reason: string;
  readonly suggestedQuestion: string;
  readonly quote: string;
};

const COLUMN_IDS = new Set<string>(ADVICE_COLUMNS.map((column) => column.id));

export function isAdviceColumn(value: unknown): value is AdviceColumn {
  return typeof value === "string" && COLUMN_IDS.has(value);
}

export function notifiedThemes(cards: readonly AdviceCard[]): readonly string[] {
  return cards.map((card) => card.title);
}

export function acceptAdviceItems(
  existing: readonly AdviceCard[],
  items: readonly AdviceDraft[],
  createId: () => string,
): readonly AdviceCard[] {
  const known = new Set(existing.map((card) => card.title));
  const added: AdviceCard[] = [];
  for (const item of items) {
    if (known.has(item.title)) {
      continue;
    }
    known.add(item.title);
    added.push({
      id: createId(),
      column: "advice",
      title: item.title,
      reason: item.reason,
      suggestedQuestion: item.suggestedQuestion,
      quote: item.quote,
    });
  }
  return added;
}

export function moveAdviceCard(
  cards: readonly AdviceCard[],
  id: string,
  column: AdviceColumn,
): readonly AdviceCard[] {
  const current = cards.find((card) => card.id === id);
  if (current === undefined || current.column === column) {
    return cards;
  }
  return cards.map((card) => (card.id === id ? { ...card, column } : card));
}

export function parseAdviceCards(value: object): readonly AdviceCard[] {
  if (!("adviceCards" in value) || !Array.isArray(value.adviceCards)) {
    return [];
  }
  const cards: AdviceCard[] = [];
  for (const item of value.adviceCards) {
    const card = parseAdviceCard(item);
    if (card !== null) {
      cards.push(card);
    }
  }
  return cards;
}

function parseAdviceCard(value: unknown): AdviceCard | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  if (!("id" in value) || typeof value.id !== "string" || value.id.length === 0) {
    return null;
  }
  if (!("column" in value) || !isAdviceColumn(value.column)) {
    return null;
  }
  const title = "title" in value ? nonempty(value.title) : null;
  const reason = "reason" in value ? nonempty(value.reason) : null;
  const suggestedQuestion =
    "suggestedQuestion" in value ? nonempty(value.suggestedQuestion) : null;
  const quote = "quote" in value ? nonempty(value.quote) : null;
  if (
    title === null ||
    reason === null ||
    suggestedQuestion === null ||
    quote === null
  ) {
    return null;
  }
  return {
    id: value.id,
    column: value.column,
    title,
    reason,
    suggestedQuestion,
    quote,
  };
}

function nonempty(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }
  return value;
}
