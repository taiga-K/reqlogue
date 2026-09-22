from reqlogue_api.domain.transcript import AudioTurn, TranscriptText

STUB_TRANSCRIPT = "stub transcript"


class StubTranscriber:
    async def transcribe(self, turn: AudioTurn) -> TranscriptText:
        del turn
        return TranscriptText(STUB_TRANSCRIPT)
