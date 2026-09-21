"use client";

import { DragDropProvider, useDraggable, useDroppable } from "@dnd-kit/react";
import {
  ADVICE_COLUMNS,
  isAdviceColumn,
  type AdviceCard,
  type AdviceColumn,
} from "@/entities/meeting";
import styles from "./AdviceBoard.module.css";

type AdviceBoardProps = {
  readonly cards: readonly AdviceCard[];
  readonly onMove: (id: string, column: AdviceColumn) => void;
};

export function AdviceBoard({ cards, onMove }: AdviceBoardProps) {
  return (
    <DragDropProvider
      onDragEnd={(event) => {
        if (event.canceled) {
          return;
        }
        const cardId = event.operation.source?.id;
        const columnId = event.operation.target?.id;
        if (typeof cardId !== "string" || !isAdviceColumn(columnId)) {
          return;
        }
        onMove(cardId, columnId);
      }}
    >
      <div className={styles["board"]}>
        {ADVICE_COLUMNS.map((column) => (
          <AdviceColumn
            key={column.id}
            column={column.id}
            label={column.label}
            cards={cards.filter((card) => card.column === column.id)}
          />
        ))}
      </div>
    </DragDropProvider>
  );
}

function AdviceColumn({
  column,
  label,
  cards,
}: {
  readonly column: AdviceColumn;
  readonly label: string;
  readonly cards: readonly AdviceCard[];
}) {
  const { ref, isDropTarget } = useDroppable({ id: column });
  return (
    <section
      ref={ref}
      className={styles["column"]}
      aria-label={label}
      data-drop-target={isDropTarget ? "true" : "false"}
    >
      <h2 className={styles["heading"]}>{label}</h2>
      {cards.map((card) => (
        <AdviceCardView key={card.id} card={card} />
      ))}
    </section>
  );
}

function AdviceCardView({ card }: { readonly card: AdviceCard }) {
  const { ref, isDragging } = useDraggable({ id: card.id });
  return (
    <article
      ref={ref}
      className={styles["card"]}
      data-dragging={isDragging ? "true" : "false"}
    >
      <h3 className={styles["title"]}>{card.title}</h3>
      <p className={styles["reason"]}>{card.reason}</p>
      <p className={styles["question"]}>{card.suggestedQuestion}</p>
      <p className={styles["quote"]}>{card.quote}</p>
    </article>
  );
}
