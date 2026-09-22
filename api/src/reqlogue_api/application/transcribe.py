from reqlogue_api.application.ports import Transcriber
from reqlogue_api.domain.transcript import AudioTurn, TranscriptText


async def transcribe_audio(
    transcriber: Transcriber,
    turn: AudioTurn,
) -> TranscriptText:
    if len(turn.pcm) == 0:
        return TranscriptText("")
    return await transcriber.transcribe(turn)
