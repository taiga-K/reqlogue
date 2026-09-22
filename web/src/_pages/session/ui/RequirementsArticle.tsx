import { markdownBlocks, type MarkdownBlock } from "./requirementsMarkdown";
import styles from "./RequirementsPage.module.css";

type RequirementsArticleProps = {
  readonly markdown: string;
};

export function RequirementsArticle({ markdown }: RequirementsArticleProps) {
  return (
    <article className={styles["document"]}>
      {markdownBlocks(markdown).map((block, index) => (
        <MarkdownNode key={index} block={block} />
      ))}
    </article>
  );
}

function MarkdownNode({ block }: { readonly block: MarkdownBlock }) {
  switch (block.kind) {
    case "h1":
      return <h1>{block.text}</h1>;
    case "h2":
      return <h2>{block.text}</h2>;
    case "h3":
      return <h3>{block.text}</h3>;
    case "p":
      return <p>{block.text}</p>;
    case "ul":
      return (
        <ul>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    default: {
      const _exhaustive: never = block;
      return _exhaustive;
    }
  }
}
