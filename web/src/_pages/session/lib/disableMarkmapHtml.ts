type MarkdownEngine = {
  disable: (rules: readonly string[]) => unknown;
};

type MarkmapTransformer = {
  md: MarkdownEngine;
};

export function disableMarkmapHtml(transformer: MarkmapTransformer): void {
  transformer.md.disable(["html_block", "html_inline"]);
}
