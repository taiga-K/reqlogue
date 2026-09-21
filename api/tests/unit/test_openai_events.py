from reqlogue_api.infrastructure.openai_events import (
    is_error_event,
    transcript_from_event,
)


def test_reads_completed_transcript_and_ignores_other_events() -> None:
    assert (
        transcript_from_event(
            {
                "type": "conversation.item.input_audio_transcription.completed",
                "transcript": "  こんにちは  ",
                "speaker": "nope",
            }
        )
        == "こんにちは"
    )
    assert (
        transcript_from_event(
            {
                "type": "conversation.item.input_audio_transcription.delta",
                "delta": "こん",
            }
        )
        is None
    )
    assert transcript_from_event({"type": "error"}) is None
    assert transcript_from_event(None) is None


def test_empty_completed_transcript_ends_the_wait() -> None:
    assert (
        transcript_from_event(
            {
                "type": "conversation.item.input_audio_transcription.completed",
                "transcript": "   ",
            }
        )
        == ""
    )
    assert (
        transcript_from_event(
            {
                "type": "conversation.item.input_audio_transcription.completed",
            }
        )
        == ""
    )


def test_error_and_failed_events_are_terminal() -> None:
    assert is_error_event({"type": "error"})
    assert is_error_event(
        {"type": "conversation.item.input_audio_transcription.failed"}
    )
    assert not is_error_event(
        {
            "type": "conversation.item.input_audio_transcription.completed",
            "transcript": "",
        }
    )
    assert not is_error_event(
        {
            "type": "conversation.item.input_audio_transcription.delta",
            "delta": "こん",
        }
    )
