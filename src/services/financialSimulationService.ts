import {
  AmortizationSystem,
  ProposalPayload,
  SimulationParameters,
  SimulationPropertyType,
  SimulationPurpose,
  SimulationResult,
} from '../types/proposal';

export interface ProposalFinancialIndicators {
  familyGrossIncome: number;
  declaredMonthlyCommitments: number;
  incomeAfterDeclaredCommitments: number;
  incomeCommitmentPercent: number;
  downPaymentPercent: number;
  financingPercent: number;
}

export interface McmvIncomeClassification {
  label: string;
  incomeRange: string;
  withinUrbanIncomeLimit: boolean;
}

export interface McmvRateReference {
  nominalAnnualRatePercent: number;
  rangeLabel: string;
}

export interface FinancingQuotaReference {
  percent: number;
  note: string;
}

export const getAvailableCaixaPrograms = (
  familyIncome: number,
  fgtsMonths: number | null,
  propertyType: SimulationPropertyType,
  purpose: SimulationPurpose | ''
): NonNullable<SimulationParameters['caixaProgram']>[] => {
  const programs: NonNullable<SimulationParameters['caixaProgram']>[] = [];
  const classification = classifyUrbanMcmvIncome(familyIncome);
  const qualifiesForMcmvPurpose =
    !purpose ||
    purpose === 'buy-new' ||
    purpose === 'buy-used' ||
    purpose === 'caixa-property';
  if (
    propertyType === 'residential' &&
    qualifiesForMcmvPurpose &&
    classification &&
    ['Faixa 1', 'Faixa 2', 'Faixa 3'].includes(classification.label)
  ) {
    programs.push('mcmv-fgts');
  }

  const qualifiesForProCotistaPurpose =
    purpose === 'buy-new' ||
    purpose === 'build' ||
    (!purpose && familyIncome > 0 && familyIncome <= 12000) ||
    (purpose === 'buy-used' && familyIncome <= 12000);
  if (
    propertyType === 'residential' &&
    (fgtsMonths ?? 0) >= 36 &&
    qualifiesForProCotistaPurpose
  ) {
    programs.push('mcmv-procotista');
  }

  programs.push('sbpe-tr', 'outra');
  return programs;
};

const roundMoney = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

export const classifyUrbanMcmvIncome = (
  familyGrossIncome: number
): McmvIncomeClassification | null => {
  if (!Number.isFinite(familyGrossIncome) || familyGrossIncome <= 0) return null;
  if (familyGrossIncome <= 3200) {
    return {
      label: 'Faixa 1',
      incomeRange: 'Até R$ 3.200,00 por mês',
      withinUrbanIncomeLimit: true,
    };
  }
  if (familyGrossIncome <= 5000) {
    return {
      label: 'Faixa 2',
      incomeRange: 'De R$ 3.200,01 a R$ 5.000,00 por mês',
      withinUrbanIncomeLimit: true,
    };
  }
  if (familyGrossIncome <= 9600) {
    return {
      label: 'Faixa 3',
      incomeRange: 'De R$ 5.000,01 a R$ 9.600,00 por mês',
      withinUrbanIncomeLimit: true,
    };
  }
  if (familyGrossIncome <= 13000) {
    return {
      label: 'MCMV Classe Média',
      incomeRange: 'De R$ 9.600,01 a R$ 13.000,00 por mês',
      withinUrbanIncomeLimit: true,
    };
  }
  return {
    label: 'Acima do limite de renda urbana informado para o MCMV',
    incomeRange: 'Acima de R$ 13.000,00 por mês',
    withinUrbanIncomeLimit: false,
  };
};

export const getMcmvRateReference = (
  familyGrossIncome: number
): McmvRateReference | null => {
  const classification = classifyUrbanMcmvIncome(familyGrossIncome);
  if (!classification) return null;
  if (classification.label === 'Faixa 1') {
    return { nominalAnnualRatePercent: 4, rangeLabel: '4,00% a 4,25% a.a.' };
  }
  if (classification.label === 'Faixa 2') {
    return { nominalAnnualRatePercent: 4.75, rangeLabel: '4,75% a 7,00% a.a.' };
  }
  if (classification.label === 'Faixa 3') {
    return { nominalAnnualRatePercent: 7.66, rangeLabel: '7,66% a 8,16% a.a.' };
  }
  return null;
};

export const getAutomaticFinancingQuota = (
  program: SimulationParameters['caixaProgram'],
  purpose: SimulationParameters['purpose'],
  amortizationSystem: AmortizationSystem,
  propertyType: SimulationParameters['propertyType'] = 'residential'
): FinancingQuotaReference | null => {
  if (propertyType !== 'residential') return null;
  const isUsed = purpose === 'buy-used';
  const isNewOrConstruction =
    purpose === 'buy-new' || purpose === 'build' || purpose === 'caixa-property';
  if (!isUsed && !isNewOrConstruction) return null;

  if (program === 'mcmv-fgts') {
    if (purpose === 'build') return null;
    if (amortizationSystem === 'sac') {
      return {
        percent: 80,
        note: isUsed
          ? 'Tabela enviada: até 80%, podendo haver casos específicos até 90%.'
          : 'Tabela enviada: até 80%, podendo haver casos específicos até 90%.',
      };
    }
    return {
      percent: isUsed ? 70 : 80,
      note: isUsed
        ? 'Tabela enviada: imóveis usados, entre 70% e 80%; preenchido no limite conservador.'
        : 'Tabela enviada: até 80%.',
    };
  }

  if (program === 'mcmv-procotista') {
    if (isUsed) {
      return amortizationSystem === 'sac'
        ? { percent: 50, note: 'Tabela enviada: até 50% para imóvel usado.' }
        : { percent: 40, note: 'Tabela enviada: até 40% para imóvel usado.' };
    }
    return amortizationSystem === 'sac'
      ? { percent: 80, note: 'Tabela enviada: até 80% para imóvel novo/construção.' }
      : { percent: 60, note: 'Tabela enviada: até 60% para imóvel novo/construção.' };
  }

  if (program === 'sbpe-tr') {
    return amortizationSystem === 'sac'
      ? { percent: 80, note: `Tabela enviada: até 80% para imóvel ${isUsed ? 'usado' : 'novo'}.` }
      : { percent: 70, note: `Tabela enviada: até 70% para imóvel ${isUsed ? 'usado' : 'novo'}.` };
  }

  return null;
};

export const parseFgtsServiceTimeMonths = (serviceTime: string): number | null => {
  const normalized = serviceTime.trim().toLowerCase();
  if (!normalized) return null;

  const yearsMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*anos?/);
  const monthsMatch = normalized.match(/(\d+)\s*m[eê]s(?:es)?/);
  let totalMonths = 0;
  let hasDuration = false;

  if (yearsMatch) {
    totalMonths += Number(yearsMatch[1].replace(',', '.')) * 12;
    hasDuration = true;
    if (/anos?\s+e\s+meio/.test(normalized)) totalMonths += 6;
  }
  if (monthsMatch) {
    totalMonths += Number(monthsMatch[1]);
    hasDuration = true;
  }

  return hasDuration && Number.isFinite(totalMonths) ? Math.round(totalMonths) : null;
};

export const formatFgtsServiceTime = (months: number): string => {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? 'ano' : 'anos'}`);
  if (remainingMonths > 0) {
    parts.push(`${remainingMonths} ${remainingMonths === 1 ? 'mês' : 'meses'}`);
  }
  return parts.length > 0 ? parts.join(' e ') : '0 meses';
};

export const effectiveMonthlyRateFromAnnualPercent = (annualRatePercent: number): number => {
  if (!Number.isFinite(annualRatePercent) || annualRatePercent < 0) {
    throw new Error('A taxa anual deve ser um número não negativo.');
  }
  return ((1 + annualRatePercent / 100) ** (1 / 12) - 1) * 100;
};

export const effectiveMonthlyRateFromNominalAnnualPercent = (
  nominalAnnualRatePercent: number
): number => {
  if (!Number.isFinite(nominalAnnualRatePercent) || nominalAnnualRatePercent < 0) {
    throw new Error('A taxa nominal anual deve ser um número não negativo.');
  }
  return nominalAnnualRatePercent / 12;
};

export const effectiveAnnualRateFromNominalAnnualPercent = (
  nominalAnnualRatePercent: number
): number => {
  const monthlyRatePercent =
    effectiveMonthlyRateFromNominalAnnualPercent(nominalAnnualRatePercent);
  return ((1 + monthlyRatePercent / 100) ** 12 - 1) * 100;
};

const toAmount = (value: number | string | undefined): number => {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
};

const toDeclaredCommitment = (
  status: string | undefined,
  installment: number | string | undefined
): number => (status === 'nao' ? 0 : toAmount(installment));

export const getProposalFinancialIndicators = (
  proposal: ProposalPayload
): ProposalFinancialIndicators => {
  const primary = proposal.p1;
  const coProposer = proposal.hasP2 ? proposal.p2 : undefined;
  const familyGrossIncome =
    toAmount(primary.salary) +
    toAmount(primary.otherIncomes) +
    toAmount(coProposer?.salary) +
    toAmount(coProposer?.otherIncomes);
  const declaredMonthlyCommitments =
    toDeclaredCommitment(primary.hasFinancing, primary.financingInstallment) +
    toDeclaredCommitment(primary.hasLoan, primary.loanInstallment) +
    toDeclaredCommitment(coProposer?.hasFinancing, coProposer?.financingInstallment) +
    toDeclaredCommitment(coProposer?.hasLoan, coProposer?.loanInstallment);
  const propertyValue = toAmount(proposal.saleValue);

  return {
    familyGrossIncome: roundMoney(familyGrossIncome),
    declaredMonthlyCommitments: roundMoney(declaredMonthlyCommitments),
    incomeAfterDeclaredCommitments: roundMoney(familyGrossIncome - declaredMonthlyCommitments),
    incomeCommitmentPercent:
      familyGrossIncome > 0 ? roundMoney((declaredMonthlyCommitments / familyGrossIncome) * 100) : 0,
    downPaymentPercent:
      propertyValue > 0 ? roundMoney((toAmount(proposal.downPayment) / propertyValue) * 100) : 0,
    financingPercent:
      propertyValue > 0 ? roundMoney((toAmount(proposal.financingValue) / propertyValue) * 100) : 0,
  };
};

export const calculateFinancialSimulation = (
  parameters: SimulationParameters
): SimulationResult => {
  const {
    propertyValue,
    downPayment,
    fgtsValue,
    financedAmount,
    monthlyRatePercent,
    termMonths,
    amortizationSystem,
  } = parameters;

  const numericValues = [
    propertyValue,
    downPayment,
    fgtsValue,
    financedAmount,
    monthlyRatePercent,
    termMonths,
  ];
  if (numericValues.some((value) => !Number.isFinite(value))) {
    throw new Error('Todos os parâmetros financeiros devem ser números válidos.');
  }
  if (propertyValue <= 0) throw new Error('O valor do imóvel deve ser maior que zero.');
  if (downPayment < 0) throw new Error('A entrada não pode ser negativa.');
  if (fgtsValue < 0) throw new Error('O FGTS utilizado não pode ser negativo.');
  if (downPayment + fgtsValue > propertyValue) {
    throw new Error('A entrada e o FGTS não podem ultrapassar o valor do imóvel.');
  }
  if (financedAmount <= 0) throw new Error('O valor financiado deve ser positivo.');
  if (monthlyRatePercent < 0) throw new Error('A taxa mensal não pode ser negativa.');
  if (!Number.isSafeInteger(termMonths) || termMonths <= 0) {
    throw new Error('O prazo deve ser um número inteiro de meses maior que zero.');
  }
  if (termMonths > 1200) {
    throw new Error('O prazo máximo para processamento da evolução é de 1200 meses.');
  }
  if (amortizationSystem !== 'sac' && amortizationSystem !== 'price') {
    throw new Error('O sistema de amortização deve ser SAC ou PRICE.');
  }

  const monthlyRate = monthlyRatePercent / 100;
  const regularSacAmortization = financedAmount / termMonths;
  const pricePayment =
    monthlyRate === 0
      ? financedAmount / termMonths
      : (financedAmount * monthlyRate) / (1 - (1 + monthlyRate) ** -termMonths);
  const installments: SimulationResult['installments'] = [];
  let outstandingBalance = financedAmount;
  let exactTotalPaid = 0;
  let exactTotalInterest = 0;

  for (let installmentNumber = 1; installmentNumber <= termMonths; installmentNumber += 1) {
    const interest = outstandingBalance * monthlyRate;
    const amortization =
      amortizationSystem === 'sac'
        ? installmentNumber === termMonths
          ? outstandingBalance
          : regularSacAmortization
        : installmentNumber === termMonths
          ? outstandingBalance
          : pricePayment - interest;
    const displayedAmortization = roundMoney(amortization);
    const displayedInterest = roundMoney(interest);
    const payment = roundMoney(amortization + interest);
    exactTotalPaid += amortization + interest;
    exactTotalInterest += interest;
    outstandingBalance = Math.max(0, outstandingBalance - amortization);

    installments.push({
      installmentNumber,
      payment,
      amortization: displayedAmortization,
      interest: displayedInterest,
      outstandingBalance: roundMoney(outstandingBalance),
    });
  }

  const totalPaid = roundMoney(exactTotalPaid);
  const totalInterest = roundMoney(exactTotalInterest);

  return {
    firstInstallment: installments[0].payment,
    lastInstallment: installments[installments.length - 1].payment,
    totalPaid,
    totalInterest,
    installments,
  };
};

export const isAmortizationSystem = (value: unknown): value is AmortizationSystem =>
  value === 'sac' || value === 'price';
