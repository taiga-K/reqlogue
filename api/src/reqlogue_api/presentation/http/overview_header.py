from urllib.parse import unquote

OVERVIEW_HEADER = "X-Reqlogue-Overview"


def parse_overview_header(raw: str | None) -> str:
    if raw is None:
        return ""
    # Starlette decodes headers as latin-1; the client percent-encodes UTF-8.
    return unquote(raw, encoding="utf-8", errors="replace").strip()
