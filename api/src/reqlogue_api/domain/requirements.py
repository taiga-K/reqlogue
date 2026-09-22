from dataclasses import dataclass

EMPTY_SECTION = "（会議中に明示されず、要確認）"

SECTIONS: tuple[tuple[str, str], ...] = (
    ("overview", "1. プロジェクト/会議概要・背景・ゴール"),
    ("scope", "2. スコープ（対象範囲・対象外範囲）"),
    ("business_flow", "3. 業務フロー・ユースケース定義"),
    ("functional", "4. 機能要件一覧（優先度・概要・受け入れ基準）"),
    ("non_functional", "5. 非機能要件・制約条件"),
    ("open_issues", "6. 未決事項（ToDo / 宿題）・確認中リスク一覧"),
    ("changelog", "7. 発話ログ要約・変更履歴"),
)


@dataclass(frozen=True)
class Detection:
    title: str
    reason: str
    suggested_question: str
    quote: str
    column: str


@dataclass(frozen=True)
class RequirementsSource:
    meeting_id: str
    meeting_name: str
    utterances: tuple[str, ...]
    detections: tuple[Detection, ...]


@dataclass(frozen=True)
class SectionDrafts:
    title: str
    bodies: dict[str, str]


@dataclass(frozen=True)
class RequirementsMarkdown:
    value: str


def assemble_markdown(meeting_name: str, drafts: SectionDrafts) -> str:
    title = one_line(drafts.title) or fallback_title(meeting_name)
    lines = [f"# {title}", ""]
    for key, heading in SECTIONS:
        lines.append(f"## {heading}")
        lines.append("")
        lines.append(normalize_body(drafts.bodies.get(key, "")))
        lines.append("")
    return "\n".join(lines).strip() + "\n"


def fallback_title(meeting_name: str) -> str:
    name = one_line(meeting_name)
    if name == "":
        return "要件定義書"
    return f"{name} 要件定義書"


def one_line(value: str) -> str:
    text = " ".join(value.split())
    while text.startswith("#"):
        text = text[1:].strip()
    return text


def normalize_body(body: str) -> str:
    if body.strip() == "":
        return EMPTY_SECTION
    lines: list[str] = []
    in_fence = False
    for line in body.splitlines():
        stripped = line.lstrip()
        if stripped.startswith("```"):
            in_fence = not in_fence
            lines.append(line)
            continue
        if in_fence or not stripped.startswith("#"):
            lines.append(line)
            continue
        hash_count = len(stripped) - len(stripped.lstrip("#"))
        rest = stripped[hash_count:].strip()
        level = min(max(hash_count, 3), 6)
        lines.append(f"{'#' * level} {rest}".rstrip())
    normalized = "\n".join(lines).strip()
    if normalized == "":
        return EMPTY_SECTION
    return normalized
