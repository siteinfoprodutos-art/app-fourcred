import { SelectOption } from '../components/ui/SelectField';

export interface FinancingSimulationParams {
  principal: number;
  termYears: number;
  annualRatePercent: number;
}

export interface AmortizationResult {
  firstInstallment: number;
  middleInstallment: number;
  lastInstallment: number;
  totalPaid: number;
  totalInterest: number;
  minRecommendedIncome: number;
}

export interface FinancingSimulationResult {
  principal: number;
  months: number;
  annualRatePercent: number;
  monthlyRatePercent: number;
  sac: AmortizationResult;
  price: AmortizationResult;
}

export const INTEREST_RATE_PRESETS: { label: string; value: number; note: string }[] = [
  { label: '9,5% a.a.', value: 9.5, note: 'MCMV / Pró-Cotista' },
  { label: '10,5% a.a.', value: 10.5, note: 'SBPE Padrão' },
  { label: '11,5% a.a.', value: 11.5, note: 'Taxa Mercado' },
  { label: '12,5% a.a.', value: 12.5, note: 'Conservadora' },
];

export const PROPERTY_VALUE_PRESETS: { label: string; value: number }[] = [
  { label: 'R$ 250 mil', value: 250000 },
  { label: 'R$ 350 mil', value: 350000 },
  { label: 'R$ 500 mil', value: 500000 },
  { label: 'R$ 750 mil', value: 750000 },
  { label: 'R$ 1 milhão', value: 1000000 },
];

export const DOWN_PAYMENT_PERCENT_PRESETS: { percent: number; label: string; tag: string }[] = [
  { percent: 10, label: '10%', tag: 'Mín. promo' },
  { percent: 20, label: '20%', tag: 'Padrão bancos' },
  { percent: 30, label: '30%', tag: 'Parcela menor' },
  { percent: 50, label: '50%', tag: 'Metade à vista' },
];

export const TERM_YEAR_OPTIONS: SelectOption[] = Array.from({ length: 35 }, (_, idx) => {
  const years = idx + 1;
  const months = years * 12;
  return {
    value: String(years),
    label: `${years} ${years === 1 ? 'ano' : 'anos'} (${months} meses)`,
  };
});

/**
 * Calculates SAC and Price mortgage installment projections.
 * Uses nominal monthly rate (annual / 12), matching standard Brazilian banking simulation tables.
 */
export const calculateFinancingSimulation = ({
  principal,
  termYears,
  annualRatePercent,
}: FinancingSimulationParams): FinancingSimulationResult | null => {
  if (!principal || principal <= 0 || !termYears || termYears <= 0) {
    return null;
  }

  const months = Math.max(12, Math.round(termYears * 12));
  const monthlyRate = annualRatePercent / 100 / 12;

  // SAC (Constant Amortization)
  const monthlyAmortization = principal / months;
  const sacFirst = monthlyAmortization + principal * monthlyRate;
  const midMonth = Math.max(1, Math.floor(months / 2));
  const midBalance = Math.max(0, principal - monthlyAmortization * (midMonth - 1));
  const sacMiddle = monthlyAmortization + midBalance * monthlyRate;
  const sacLast = monthlyAmortization + monthlyAmortization * monthlyRate;
  // Arithmetic progression sum of interest in SAC
  const sacTotalInterest = (principal * monthlyRate * (months + 1)) / 2;
  const sacTotalPaid = principal + sacTotalInterest;

  // PRICE (Fixed Installments)
  let priceInstallment = principal / months;
  if (monthlyRate > 0) {
    const factor = Math.pow(1 + monthlyRate, months);
    priceInstallment = (principal * (monthlyRate * factor)) / (factor - 1);
  }
  const priceTotalPaid = priceInstallment * months;
  const priceTotalInterest = Math.max(0, priceTotalPaid - principal);

  return {
    principal,
    months,
    annualRatePercent,
    monthlyRatePercent: monthlyRate * 100,
    sac: {
      firstInstallment: sacFirst,
      middleInstallment: sacMiddle,
      lastInstallment: sacLast,
      totalPaid: sacTotalPaid,
      totalInterest: sacTotalInterest,
      minRecommendedIncome: sacFirst / 0.3,
    },
    price: {
      firstInstallment: priceInstallment,
      middleInstallment: priceInstallment,
      lastInstallment: priceInstallment,
      totalPaid: priceTotalPaid,
      totalInterest: priceTotalInterest,
      minRecommendedIncome: priceInstallment / 0.3,
    },
  };
};
