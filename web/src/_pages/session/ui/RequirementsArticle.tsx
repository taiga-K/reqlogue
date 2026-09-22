import ReactMarkdown from "react-markdown";
import styles from "./RequirementsPage.module.css";

type RequirementsArticleProps = {
  readonly markdown: string;
};

export function RequirementsArticle({ markdown }: RequirementsArticleProps) {
  return (
    <article className={styles["document"]}>
      <ReactMarkdown skipHtml>{markdown}</ReactMarkdown>
    </article>
  );
}
