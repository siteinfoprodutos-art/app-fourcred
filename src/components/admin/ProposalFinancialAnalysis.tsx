import React from 'react';
import { AlertTriangle, Percent, Wallet } from 'lucide-react';
import { ProposalRecord } from '../../types/proposal';
import { getProposalFinancialIndicators } from '../../services/financialSimulationService';

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const MetricCard: React.FC<{ label: string; value: string; note?: string }> = ({
  label,
  value,
  note,
}) => (
  <div className="rounded-xl border border-[#334155] bg-[#0F172A] p-4">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#CBD5E1]/60">{label}</p>
    <p className="mt-2 text-lg font-black text-white">{value}</p>
    {note && <p className="mt-1 text-[11px] text-[#CBD5E1]/50">{note}</p>}
  </div>
);

export const ProposalFinancialAnalysis: React.FC<{ proposal: ProposalRecord }> = ({ proposal }) => {
  const indicators = getProposalFinancialIndicators(proposal.payload);

  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
        <p className="text-xs leading-relaxed">
          Indicadores calculados a partir das informações declaradas na proposta. Renda após compromissos
          não representa renda disponível aprovada por banco nem critério de aprovação.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Renda bruta familiar"
          value={formatCurrency(indicators.familyGrossIncome)}
          note="Titular e coproponente, incluindo outras rendas informadas"
        />
        <MetricCard
          label="Compromissos mensais declarados"
          value={formatCurrency(indicators.declaredMonthlyCommitments)}
          note="Parcelas de empréstimos e financiamentos informadas"
        />
        <MetricCard
          label="Renda após compromissos declarados"
          value={formatCurrency(indicators.incomeAfterDeclaredCommitments)}
          note="Indicador declaratório; não é renda aprovada"
        />
        <MetricCard
          label="Comprometimento da renda"
          value={`${indicators.incomeCommitmentPercent.toLocaleString('pt-BR')}%`}
          note="Compromissos declarados ÷ renda bruta familiar"
        />
        <MetricCard
          label="Entrada / valor do imóvel"
          value={`${indicators.downPaymentPercent.toLocaleString('pt-BR')}%`}
          note="Considera a entrada declarada, sem FGTS"
        />
        <MetricCard
          label="Financiamento / valor do imóvel"
          value={`${indicators.financingPercent.toLocaleString('pt-BR')}%`}
          note="Com base no valor informado na proposta"
        />
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-[#334155] bg-[#0F172A]/60 p-3 text-[11px] text-[#CBD5E1]/60">
        <Wallet className="h-4 w-4 shrink-0 text-[#FF6B1A]" />
        <span>
          Valores declarados pelo cliente. Percentuais sem valor-base disponível são exibidos como zero.
        </span>
        <Percent className="ml-auto h-4 w-4 shrink-0 text-[#CBD5E1]/40" />
      </div>
    </section>
  );
};
