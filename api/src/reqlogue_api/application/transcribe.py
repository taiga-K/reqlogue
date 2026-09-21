from reqlogue_api.application.ports import Transcriber
from reqlogue_api.domain.transcript import TranscriptText


async def transcribe_audio(
    transcriber: Transcriber,
    pcm16_mono_24k: bytes,
) -> TranscriptText:
    if len(pcm16_mono_24k) == 0:
        return TranscriptText("")
    return await transcriber.transcribe(pcm16_mono_24k)
