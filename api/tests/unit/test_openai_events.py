from reqlogue_api.infrastructure.openai_events import transcript_from_event


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
