// Reproduces the exact scoring formula from matchEngine.ts's calculateConfidence,
// so the UI can explain a fuzzy match's confidence score in plain English —
// no AI call needed, since the number is already pure math computed at match
// time. Only meaningful for matchType "fuzzy"; exact matches are unambiguous
// and ai_suggested confidence comes from the agent's own stated reasoning
// (already shown in its trace), not this formula.
export function describeFuzzyConfidence(
  bankAmountCents: number,
  bankDate: string,
  glAmountCents: number,
  glDate: string
) {
  const daysApart =
    Math.abs(new Date(bankDate).getTime() - new Date(glDate).getTime()) / (1000 * 60 * 60 * 24);
  const dateScore = Math.max(0, 1 - daysApart * 0.15);

  const amountDiffCents = Math.abs(bankAmountCents - glAmountCents);
  const amountDiffRatio = amountDiffCents / Math.abs(bankAmountCents);
  const amountScore = Math.max(0, 1 - amountDiffRatio * 5);

  const confidence = Math.round((amountScore * 0.7 + dateScore * 0.3) * 100) / 100;

  const amountText =
    amountDiffCents === 0
      ? "exact amount match"
      : `amount off by ${(amountDiffCents / 100).toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
        })} (${Math.round(amountScore * 100)}% amount score)`;

  const dateText =
    daysApart === 0
      ? "same date"
      : `${Math.round(daysApart)} day${Math.round(daysApart) === 1 ? "" : "s"} apart (${Math.round(
          dateScore * 100
        )}% date score)`;

  return {
    confidence,
    amountScore,
    dateScore,
    daysApart,
    amountDiffCents,
    summary: `${amountText}, ${dateText}. Amount counts for 70% of the score, date for 30%.`,
  };
}
