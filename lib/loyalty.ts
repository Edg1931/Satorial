import { LOYALTY_TIERS, type LoyaltyTier } from "./types";

type Tier = { name: LoyaltyTier; min_cents: number; color: string };

export function tierFor(lifetimeSpendCents: number): { name: LoyaltyTier; color: string; nextTier?: { name: LoyaltyTier; remaining: number } } {
  const tiers = LOYALTY_TIERS as readonly Tier[];
  let current: Tier = tiers[0];
  for (const t of tiers) if (lifetimeSpendCents >= t.min_cents) current = t;
  const next = tiers.find((t) => t.min_cents > lifetimeSpendCents);
  return {
    name: current.name,
    color: current.color,
    nextTier: next ? { name: next.name, remaining: next.min_cents - lifetimeSpendCents } : undefined,
  };
}

export function generateReferralCode(name: string): string {
  const seed = name.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4) || "SATR";
  const rand = Math.floor(Math.random() * 36 ** 4).toString(36).toUpperCase().padStart(4, "0");
  return `${seed}${rand}`.slice(0, 8);
}
