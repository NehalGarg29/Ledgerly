export function getAgeDays(createdAt: string | Date): number {
  const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const ms = Date.now() - created.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function describeAge(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "1 day";
  if (days < 14) return `${days} days`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `${weeks} week${weeks === 1 ? "" : "s"}`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"}`;
}

// Visual cue for how stale an exception is — a treasury team cares a lot
// more about "this has been sitting for 3 weeks" than the exact day count.
export function ageColorClass(days: number): string {
  if (days >= 14) return "text-red-600";
  if (days >= 7) return "text-amber-600";
  return "text-zinc-500";
}
