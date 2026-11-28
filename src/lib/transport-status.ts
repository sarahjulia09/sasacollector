import { parseStages, scopeOf } from './payment-stages';
/** Financial milestones are an estimate, not carrier tracking. */
export function transportStatus(raw: unknown): 'Comprado' | 'A caminho' | 'Na GOM' | 'Em casa' {
  const stages = parseStages(raw);
  const has = (kind: string) => stages.some((s) => s.kind === kind);
  const paid = (kind: string) => stages.some((s) => s.kind === kind && s.paid);
  if (scopeOf(stages) === 'nacional') {
    if (paid('frete_nac')) return 'Em casa';
    if (paid('frete_gom')) return 'Na GOM';
    if (has('frete_nac') || has('frete_gom')) return 'A caminho';
  } else {
    if (paid('frete2')) return 'Em casa';
    if (paid('taxa')) return 'Na GOM';
    if (has('frete1') || has('frete2')) return 'A caminho';
  }
  return 'Comprado';
}
