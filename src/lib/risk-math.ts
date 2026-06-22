import type { RiskImpact, RiskItem, RiskProbability } from "./types";

const IMPACT_POINTS: Record<RiskImpact, number> = {
  大: 3,
  中: 2,
  小: 1,
};

const PROBABILITY_POINTS: Record<RiskProbability, number> = {
  高: 3,
  中: 2,
  低: 1,
};

export function calculateRiskItemScore(risk: RiskItem): number {
  return IMPACT_POINTS[risk.impact] * PROBABILITY_POINTS[risk.probability];
}

export function calculateRiskScore(risks: RiskItem[]): number {
  return risks.reduce((sum, risk) => sum + calculateRiskItemScore(risk), 0);
}

export function getRiskScoreLabel(score: number): string {
  if (score <= 5) return "リスクメモ少なめ";
  if (score <= 12) return "注意リスクあり";
  if (score <= 20) return "リスク要確認";
  return "高リスク候補";
}
