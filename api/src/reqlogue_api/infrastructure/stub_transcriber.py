from reqlogue_api.domain.transcript import TranscriptText

STUB_TRANSCRIPT = "stub transcript"


class StubTranscriber:
    async def transcribe(self, pcm16_mono_24k: bytes) -> TranscriptText:
        del pcm16_mono_24k
        return TranscriptText(STUB_TRANSCRIPT)
