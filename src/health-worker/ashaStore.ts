/**
 * The health worker's own working notes on this device: their block name and when they
 * generated a referral summary for someone (for their monthly coverage figure). Person ids
 * and dates only.
 */
const KEY = "loom_asha_v1";

export interface AshaState {
  block: string;
  referrals: { personId: string; at: number }[];
  showSample: boolean;
}

export function readAsha(): AshaState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { block: "", referrals: [], showSample: true, ...(JSON.parse(raw) as Partial<AshaState>) };
  } catch {
    // fall through
  }
  return { block: "", referrals: [], showSample: true };
}

export function writeAsha(state: AshaState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // not critical
  }
}
