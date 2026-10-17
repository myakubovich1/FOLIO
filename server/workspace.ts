import { seed } from "./seeds.js";
import type { State } from "../src/contracts.js";
export const SCORECARD_CONFIG = {
  version: "folio-v1.0.0",
  scale: [0, 100],
  weights: { capacity: 50, liquidity: 30, resilience: 20 },
  capacityTarget: 0.4,
  reserveMonthsTarget: 3,
  resilienceMonthsTarget: 1,
  minimumDays: 90,
  minimumSeasonalDays: 730,
  rounding: "nearest integer at final index",
  validation:
    "Software correctness and synthetic checks only. No repayment-outcome validation.",
};
export function demoState(profile: string): State {
  return {
    borrower: {
      ...seed(profile),
      sourceKind: "synthetic",
      balanceEvidence: "synthetic",
      obligationEvidence: "synthetic",
      coverageVerified: true,
    },
    mode: "demo",
    connected: false,
    revision: 1,
    assessment: null,
    passports: [],
    shares: [],
    sources: [],
    ingestions: [],
    corrections: [],
  };
}
export function ownerState(name = "Your profile"): State {
  return {
    mode: "owner",
    borrower: {
      id: "owner",
      name,
      context: "United States · your financial profile",
      currency: "USD",
      seasonal: false,
      start: "",
      end: "",
      months: 0,
      complete: false,
      closingBalance: null,
      minimumBalance: null,
      obligationsDocumented: false,
      records: [],
      sourceKind: "self-reported",
      balanceEvidence: "missing",
      obligationEvidence: "missing",
      incomePattern: "unknown",
    },
    connected: false,
    revision: 1,
    assessment: null,
    passports: [],
    shares: [],
    sources: [],
    ingestions: [],
    corrections: [],
  };
}
