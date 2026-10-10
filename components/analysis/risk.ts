import type { RiskLevel } from '@/features/compliance-scoring/types/compliance.types';

/** Dossier colours for a risk level: text alone, or a tinted chip. */
export const RISK_TEXT: Record<RiskLevel, string> = {
  Low: 'text-forest',
  Medium: 'text-ochre',
  High: 'text-seal',
};

export const RISK_CHIP: Record<RiskLevel, string> = {
  Low: 'bg-forest-tint text-forest',
  Medium: 'bg-ochre-tint text-ochre',
  High: 'bg-seal-tint text-seal',
};
