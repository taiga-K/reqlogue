from reqlogue_api.domain.advice import AdviceAnalysis, AdviceBatch, AdviceItem

STUB_ADVICE_ITEM = AdviceItem(
    title="確認したい点",
    reason="このままだと認識がずれる",
    suggested_question="ここは今決めてよいですか？",
    quote="確認したい点",
)


class StubAdviceAnalyzer:
    async def analyze(self, analysis: AdviceAnalysis) -> AdviceBatch:
        del analysis
        return AdviceBatch((STUB_ADVICE_ITEM,))
