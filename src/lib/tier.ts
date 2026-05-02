export const TIER_LABELS: Record<number, string> = {
  1: "TICA New",
  2: "TICA Star",
  3: "TICA Crown",
  4: "딜러가",
};

export function tierLabel(tier: number): string {
  return TIER_LABELS[tier] ?? `tier ${tier}`;
}
