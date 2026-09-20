import type { RecommendationStance } from "./types";

/** Short, officer-facing phrasing for an AI recommendation stance (advisory). */
export const RRSTANCE: Record<RecommendationStance, string> = {
  RECOMMEND_QUALIFY: "appears compliant",
  FURTHER_SCRUTINY: "needs further scrutiny",
  RECOMMEND_DISQUALIFY: "does not appear to meet mandatory eligibility",
};
