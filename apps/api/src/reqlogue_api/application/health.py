def health_payload() -> dict[str, str]:
    return {"status": "ok", "service": "api"}


def ready_payload() -> dict[str, str]:
    return {"status": "ready"}
