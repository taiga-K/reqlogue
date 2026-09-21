import json


def transcript_from_event(payload: object) -> str | None:
    if not isinstance(payload, dict):
        return None
    event_type = payload.get("type")
    if event_type != "conversation.item.input_audio_transcription.completed":
        return None
    transcript = payload.get("transcript")
    if not isinstance(transcript, str):
        return None
    text = transcript.strip()
    if text == "":
        return None
    return text


def parse_event_message(raw: str) -> object:
    return json.loads(raw)
