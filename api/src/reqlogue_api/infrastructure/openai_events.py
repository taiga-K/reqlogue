import json

COMPLETED = "conversation.item.input_audio_transcription.completed"
DELTA = "conversation.item.input_audio_transcription.delta"
FAILED = "conversation.item.input_audio_transcription.failed"


def is_error_event(payload: object) -> bool:
    if not isinstance(payload, dict):
        return False
    event_type = payload.get("type")
    return event_type in {"error", FAILED}


def delta_from_event(payload: object) -> str | None:
    if not isinstance(payload, dict):
        return None
    if payload.get("type") != DELTA:
        return None
    delta = payload.get("delta")
    if not isinstance(delta, str):
        return None
    if delta.strip() == "":
        return None
    return delta


def transcript_from_event(payload: object) -> str | None:
    if not isinstance(payload, dict):
        return None
    event_type = payload.get("type")
    if event_type != COMPLETED:
        return None
    transcript = payload.get("transcript")
    if not isinstance(transcript, str):
        return ""
    return transcript.strip()


def parse_event_message(raw: str) -> object:
    return json.loads(raw)
