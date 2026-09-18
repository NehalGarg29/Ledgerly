// Best-effort extraction of a check number from a bank statement's free-text
// memo. None of the bank file adapters (CSV/JSON/BAI2) carry a dedicated
// check-number field, so this is a heuristic, not a guarantee — transactions
// where it doesn't match simply aren't run through positive pay.
const PATTERNS = [/check\s*(?:no\.?|number|#)?\s*#?\s*(\d{2,10})/i, /\bchk\s*#?\s*(\d{2,10})/i];

export function extractCheckNumber(memo: string): string | null {
  for (const pattern of PATTERNS) {
    const match = memo.match(pattern);
    if (match) return match[1];
  }
  return null;
}
