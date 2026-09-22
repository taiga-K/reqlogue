export type MarkdownBlock =
  | { readonly kind: "h1" | "h2" | "h3" | "p"; readonly text: string }
  | { readonly kind: "ul"; readonly items: readonly string[] };

export function markdownBlocks(markdown: string): readonly MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let items: string[] = [];
  const flush = () => {
    if (items.length === 0) {
      return;
    }
    blocks.push({ kind: "ul", items });
    items = [];
  };
  for (const line of markdown.split("\n")) {
    if (line.startsWith("### ")) {
      flush();
      blocks.push({ kind: "h3", text: line.slice(4) });
      continue;
    }
    if (line.startsWith("## ")) {
      flush();
      blocks.push({ kind: "h2", text: line.slice(3) });
      continue;
    }
    if (line.startsWith("# ")) {
      flush();
      blocks.push({ kind: "h1", text: line.slice(2) });
      continue;
    }
    if (line.startsWith("- ")) {
      items.push(line.slice(2));
      continue;
    }
    flush();
    if (line.trim().length > 0) {
      blocks.push({ kind: "p", text: line });
    }
  }
  flush();
  return blocks;
}
