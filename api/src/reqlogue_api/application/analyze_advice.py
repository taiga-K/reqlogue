from reqlogue_api.application.ports import AdviceAnalyzer
from reqlogue_api.domain.advice import AdviceAnalysis, AdviceBatch


async def analyze_advice(
    analyzer: AdviceAnalyzer,
    analysis: AdviceAnalysis,
) -> AdviceBatch:
    if analysis.transcript_delta.strip() == "":
        return AdviceBatch(())
    return await analyzer.analyze(analysis)
