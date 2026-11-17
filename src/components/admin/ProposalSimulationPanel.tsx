import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Download, LoaderCircle, Save, X } from 'lucide-react';
import {
  FinancialSimulationRecord,
  ProposalRecord,
  SimulationPropertyType,
  SimulationPurpose,
  SimulationParameters,
  SimulationResult,
} from '../../types/proposal';
import {
  calculateFinancialSimulation,
  classifyUrbanMcmvIncome,
  effectiveMonthlyRateFromAnnualPercent,
  formatFgtsServiceTime,
  getProposalFinancialIndicators,
  parseFgtsServiceTimeMonths,
} from '../../services/financialSimulationService';
import { proposalService } from '../../services/proposalService';
import { generateSimulationPDF } from '../../services/pdfService';

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDate = (date: string) => new Date(date).toLocaleString('pt-BR');
const formatYesNo = (value: boolean | undefined): string =>
  value === undefined ? 'Não informado' : value ? 'Sim' : 'Não';

interface SimulationInputValues {
  propertyValue: string;
  downPayment: string;
  fgtsValue: string;
  financedAmount: string;
  monthlyRatePercent: string;
  termValue: string;
}

type CurrencyInputField =
  | 'propertyValue'
  | 'downPayment'
  | 'fgtsValue'
  | 'financedAmount';
type YesNoAnswer = '' | 'sim' | 'nao';

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const PURPOSE_LABELS: Record<SimulationPurpose, string> = {
  'buy-new': 'Comprar imóvel novo',
  'buy-used': 'Comprar imóvel usado',
  'buy-land': 'Comprar terreno',
  build: 'Construir em terreno próprio',
  'secured-loan': 'Pegar empréstimo com imóvel em garantia',
  'caixa-property': 'Comprar imóvel disponível para venda pela CAIXA',
  renovate: 'Reformar ou ampliar imóvel',
  'reforma-casa-brasil': 'Reforma Casa Brasil',
};

const CAIXA_PROGRAM_LABELS: Record<
  NonNullable<SimulationParameters['caixaProgram']>,
  string
> = {
  'mcmv-fgts': 'Minha Casa, Minha Vida — Recursos FGTS',
  'mcmv-procotista': 'Minha Casa, Minha Vida / Pró-Cotista',
  'sbpe-tr': 'SBPE — TR',
  outra: 'Outra modalidade/condição consultada',
};

const formatCurrencyInput = (value: number): string =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const parseCurrencyInput = (value: string): number => {
  if (value.trim() === '') return Number.NaN;
  const digits = value.replace(/\D/g, '');
  return digits ? Number(digits) / 100 : Number.NaN;
};

const maskCurrencyInput = (value: string): string => {
  if (value.trim() === '') return '';
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return formatCurrencyInput(Number(digits) / 100);
};

const initialParameters = (proposal: ProposalRecord): SimulationParameters => {
  const payload = proposal.payload;
  const propertyValue = Number(payload.saleValue) || 0;
  const downPayment = Number(payload.downPayment) || 0;
  const fgtsValue =
    payload.useFgts === 'sim' || payload.useFgts === true ? Number(payload.fgtsValue) || 0 : 0;
  const requestedAmount = Number(payload.financingValue) || propertyValue - downPayment - fgtsValue;
  const requestedTerm = Number(payload.termYears) * 12;

  return {
    propertyValue,
    downPayment,
    fgtsValue,
    financedAmount: requestedAmount,
    monthlyRatePercent: Number.NaN,
    termMonths: Number.isSafeInteger(requestedTerm) && requestedTerm > 0 ? requestedTerm : 360,
    amortizationSystem: payload.amortizationSystem?.toLowerCase() === 'price' ? 'price' : 'sac',
  };
};

const inputValuesFromParameters = (
  parameters: SimulationParameters,
  termUnit: 'months' | 'years'
): SimulationInputValues => ({
  propertyValue: formatCurrencyInput(parameters.propertyValue),
  downPayment: formatCurrencyInput(parameters.downPayment),
  fgtsValue: formatCurrencyInput(parameters.fgtsValue),
  financedAmount: formatCurrencyInput(parameters.financedAmount),
  monthlyRatePercent:
    parameters.annualRatePercent !== undefined
      ? String(parameters.annualRatePercent)
      : Number.isFinite(parameters.monthlyRatePercent)
        ? String(parameters.monthlyRatePercent)
        : '',
  termValue: String(
    termUnit === 'years' ? parameters.termMonths / 12 : parameters.termMonths
  ),
});

const parseInputValue = (value: string): number =>
  value.trim() === '' ? Number.NaN : Number(value);

const ResultSummary: React.FC<{
  proposal: ProposalRecord;
  scenarioName: string;
  parameters: SimulationParameters;
  result: SimulationResult;
}> = ({ proposal, scenarioName, parameters, result }) => {
  const { familyGrossIncome } = getProposalFinancialIndicators(proposal.payload);
  const mcmvIncomeClassification = classifyUrbanMcmvIncome(familyGrossIncome);
  const primaryFgtsMonths = parseFgtsServiceTimeMonths(proposal.payload.p1.serviceTime);
  const coProposerFgtsMonths = proposal.payload.hasP2 && proposal.payload.p2
    ? parseFgtsServiceTimeMonths(proposal.payload.p2.serviceTime)
    : 0;
  const totalFgtsMonths =
    primaryFgtsMonths !== null && coProposerFgtsMonths !== null
      ? primaryFgtsMonths + coProposerFgtsMonths
      : null;
  return (
  <div className="rounded-xl border border-[#FF6B1A]/30 bg-[#FF6B1A]/5 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF6B1A]">
          Resumo da simulação • {scenarioName}
        </p>
        <h4 className="mt-1 font-bold text-white">{proposal.payload.p1.fullName}</h4>
        <p className="text-[11px] text-[#CBD5E1]/60">
          Proposta #{proposal.id} • {formatDate(new Date().toISOString())}
        </p>
      </div>
      <button
        type="button"
        onClick={() =>
          generateSimulationPDF(proposal, scenarioName, parameters, result, new Date().toISOString())
        }
        className="inline-flex items-center gap-2 rounded-lg border border-[#334155] px-3 py-2 text-xs font-bold text-[#CBD5E1] transition hover:border-[#FF6B1A] hover:text-white"
      >
        <Download className="h-4 w-4" />
        Relatório PDF
      </button>
    </div>
    <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
      <div className="col-span-full border-b border-[#334155] pb-1 font-extrabold uppercase tracking-wider text-[#CBD5E1]/60">Valores</div>
      <div><span className="block text-[#CBD5E1]/50">Valor do imóvel</span><b>{formatCurrency(parameters.propertyValue)}</b></div>
      <div><span className="block text-[#CBD5E1]/50">Valor de entrada</span><b>{formatCurrency(parameters.downPayment)}</b></div>
      <div><span className="block text-[#CBD5E1]/50">FGTS utilizado</span><b>{formatCurrency(parameters.fgtsValue)}</b></div>
      <div><span className="block text-[#CBD5E1]/50">Valor do financiamento</span><b>{formatCurrency(parameters.financedAmount)}</b></div>
      <div className="col-span-full border-b border-[#334155] pb-1 pt-2 font-extrabold uppercase tracking-wider text-[#CBD5E1]/60">Taxas de juros</div>
      <div><span className="block text-[#CBD5E1]/50">Taxa mensal efetiva</span><b>{parameters.monthlyRatePercent.toLocaleString('pt-BR')}%</b></div>
      {parameters.annualRatePercent !== undefined && (
        <div><span className="block text-[#CBD5E1]/50">Juros efetivos consultados</span><b>{parameters.annualRatePercent.toLocaleString('pt-BR')}% a.a.</b></div>
      )}
      <div className="col-span-full border-b border-[#334155] pb-1 pt-2 font-extrabold uppercase tracking-wider text-[#CBD5E1]/60">Prazos e parcelas</div>
      <div><span className="block text-[#CBD5E1]/50">Prazo</span><b>{parameters.termMonths} meses</b></div>
      <div><span className="block text-[#CBD5E1]/50">Amortização</span><b>{parameters.amortizationSystem.toUpperCase()}</b></div>
      <div><span className="block text-[#CBD5E1]/50">1ª prestação</span><b>{formatCurrency(result.firstInstallment)}</b></div>
      <div><span className="block text-[#CBD5E1]/50">Última prestação</span><b>{formatCurrency(result.lastInstallment)}</b></div>
      <div><span className="block text-[#CBD5E1]/50">Total estimado pago</span><b>{formatCurrency(result.totalPaid)}</b></div>
      <div><span className="block text-[#CBD5E1]/50">Total estimado de juros</span><b>{formatCurrency(result.totalInterest)}</b></div>
      <div className="col-span-full border-b border-[#334155] pb-1 pt-2 font-extrabold uppercase tracking-wider text-[#CBD5E1]/60">Enquadramento e condições consultadas</div>
      {mcmvIncomeClassification && (
        <div><span className="block text-[#CBD5E1]/50">Faixa indicativa por renda</span><b>{mcmvIncomeClassification.label}</b></div>
      )}
      {parameters.caixaProgram && (
        <div><span className="block text-[#CBD5E1]/50">Modalidade selecionada</span><b>{CAIXA_PROGRAM_LABELS[parameters.caixaProgram]}</b></div>
      )}
      {parameters.financingQuotaPercent !== undefined && (
        <div><span className="block text-[#CBD5E1]/50">Cota informada</span><b>{parameters.financingQuotaPercent}%</b></div>
      )}
      {parameters.propertyValueCeiling !== undefined && (
        <div><span className="block text-[#CBD5E1]/50">Teto do imóvel informado</span><b>{formatCurrency(parameters.propertyValueCeiling)}</b></div>
      )}
      {parameters.municipality && parameters.state && (
        <div><span className="block text-[#CBD5E1]/50">Localidade</span><b>{parameters.municipality}/{parameters.state}</b></div>
      )}
      {parameters.propertyType && (
        <div><span className="block text-[#CBD5E1]/50">Tipo de imóvel</span><b>{parameters.propertyType === 'residential' ? 'Residencial' : 'Comercial'}</b></div>
      )}
      {parameters.purpose && (
        <div><span className="block text-[#CBD5E1]/50">Finalidade</span><b>{PURPOSE_LABELS[parameters.purpose]}</b></div>
      )}
      {totalFgtsMonths !== null && (
        <div><span className="block text-[#CBD5E1]/50">Tempo de FGTS somado</span><b>{formatFgtsServiceTime(totalFgtsMonths)}</b></div>
      )}
      {parameters.hasPropertyInSameMunicipality !== undefined && (
        <div><span className="block text-[#CBD5E1]/50">Outro imóvel no município</span><b>{formatYesNo(parameters.hasPropertyInSameMunicipality)}</b></div>
      )}
      {parameters.hasActiveHousingFinance !== undefined && (
        <div><span className="block text-[#CBD5E1]/50">Financiamento SFH/FGTS ativo</span><b>{formatYesNo(parameters.hasActiveHousingFinance)}</b></div>
      )}
      {parameters.hasUsedFgtsBefore !== undefined && (
        <div><span className="block text-[#CBD5E1]/50">Já utilizou FGTS</span><b>{formatYesNo(parameters.hasUsedFgtsBefore)}</b></div>
      )}
      {parameters.receivedSubsidySinceMay2005 !== undefined && (
        <div><span className="block text-[#CBD5E1]/50">Subsídio FGTS/União desde maio de 2005</span><b>{formatYesNo(parameters.receivedSubsidySinceMay2005)}</b></div>
      )}
      {familyGrossIncome > 0 && (
        <div><span className="block text-[#CBD5E1]/50">1ª parcela / renda familiar</span>
          <b>{((result.firstInstallment / familyGrossIncome) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%</b>
        </div>
      )}
    </div>
    <p className="mt-4 rounded-lg bg-amber-500/10 p-3 text-[10px] font-bold leading-relaxed text-amber-200">
      SIMULAÇÃO FINANCEIRA ESTIMADA — NÃO REPRESENTA APROVAÇÃO DE CRÉDITO OU PROPOSTA OFICIAL DA CAIXA.
      Inclui somente amortização e juros calculados; não inclui seguros obrigatórios, TR, tarifas ou outros encargos.
    </p>
  </div>
  );
};

const InstallmentSchedule: React.FC<{ title: string; result: SimulationResult }> = ({ title, result }) => (
  <div className="min-w-0 overflow-hidden rounded-xl border border-[#334155] bg-[#0F172A]">
    <h4 className="border-b border-[#334155] px-3 py-2 text-xs font-bold text-white">{title} • Evolução</h4>
    <div className="max-h-64 overflow-auto">
      <table className="w-full text-left text-[10px]">
        <thead className="sticky top-0 bg-[#1E293B] text-[#CBD5E1]/70">
          <tr>
            <th className="p-2">Parcela</th>
            <th className="p-2">Prestação</th>
            <th className="p-2">Amortização</th>
            <th className="p-2">Juros</th>
            <th className="p-2">Saldo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#334155]/60 text-[#CBD5E1]">
          {result.installments.map((installment) => (
            <tr key={installment.installmentNumber}>
              <td className="p-2">{installment.installmentNumber}</td>
              <td className="p-2">{formatCurrency(installment.payment)}</td>
              <td className="p-2">{formatCurrency(installment.amortization)}</td>
              <td className="p-2">{formatCurrency(installment.interest)}</td>
              <td className="p-2">{formatCurrency(installment.outstandingBalance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export const ProposalSimulationPanel: React.FC<{
  proposal: ProposalRecord;
  editingSimulation: FinancialSimulationRecord | null;
  onSaved: () => void;
  onCancelEdit: () => void;
}> = ({ proposal, editingSimulation, onSaved, onCancelEdit }) => {
  const [termUnit, setTermUnit] = useState<'months' | 'years'>('years');
  const [rateInputUnit, setRateInputUnit] = useState<'monthly' | 'annual'>('annual');
  const [propertyType, setPropertyType] = useState<SimulationPropertyType>('residential');
  const [purpose, setPurpose] = useState<SimulationPurpose | ''>('');
  const [municipality, setMunicipality] = useState('');
  const [state, setState] = useState('');
  const [hasPropertyInSameMunicipality, setHasPropertyInSameMunicipality] =
    useState<YesNoAnswer>('');
  const [hasActiveHousingFinance, setHasActiveHousingFinance] = useState<YesNoAnswer>('');
  const [hasUsedFgtsBefore, setHasUsedFgtsBefore] = useState<YesNoAnswer>(
    proposal.payload.usedFgts === 'sim' ? 'sim' : proposal.payload.usedFgts === 'nao' ? 'nao' : ''
  );
  const [receivedSubsidySinceMay2005, setReceivedSubsidySinceMay2005] =
    useState<YesNoAnswer>(
      proposal.payload.fgtsSubsidy === 'sim'
        ? 'sim'
        : proposal.payload.fgtsSubsidy === 'nao'
          ? 'nao'
          : ''
    );
  const [caixaProgram, setCaixaProgram] = useState<
    '' | 'mcmv-fgts' | 'mcmv-procotista' | 'sbpe-tr' | 'outra'
  >('');
  const [caixaFinancingCapInput, setCaixaFinancingCapInput] = useState('');
  const [caixaMaxTermInput, setCaixaMaxTermInput] = useState('');
  const [caixaPropertyCapInput, setCaixaPropertyCapInput] = useState('');
  const [inputValues, setInputValues] = useState<SimulationInputValues>(() =>
    inputValuesFromParameters(initialParameters(proposal), 'years')
  );
  const [amortizationSystem, setAmortizationSystem] =
    useState<SimulationParameters['amortizationSystem']>(() => initialParameters(proposal).amortizationSystem);
  const [scenarioName, setScenarioName] = useState('');
  const [scheduleSystem, setScheduleSystem] = useState<'sac' | 'price'>('sac');
  const [financedAmountManual, setFinancedAmountManual] = useState(false);
  const [savingSystem, setSavingSystem] = useState<'sac' | 'price' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!editingSimulation) return;
    const unit = editingSimulation.parameters.termMonths % 12 === 0 ? 'years' : 'months';
    setTermUnit(unit);
    setInputValues(inputValuesFromParameters(editingSimulation.parameters, unit));
    setAmortizationSystem(editingSimulation.parameters.amortizationSystem);
    setScenarioName(editingSimulation.scenarioName);
    setFinancedAmountManual(true);
    setRateInputUnit(editingSimulation.parameters.rateInputUnit || 'monthly');
    setPropertyType(editingSimulation.parameters.propertyType || 'residential');
    setPurpose(editingSimulation.parameters.purpose || '');
    setMunicipality(editingSimulation.parameters.municipality || '');
    setState(editingSimulation.parameters.state || '');
    setHasPropertyInSameMunicipality(
      editingSimulation.parameters.hasPropertyInSameMunicipality === undefined
        ? ''
        : editingSimulation.parameters.hasPropertyInSameMunicipality ? 'sim' : 'nao'
    );
    setHasActiveHousingFinance(
      editingSimulation.parameters.hasActiveHousingFinance === undefined
        ? ''
        : editingSimulation.parameters.hasActiveHousingFinance ? 'sim' : 'nao'
    );
    setHasUsedFgtsBefore(
      editingSimulation.parameters.hasUsedFgtsBefore === undefined
        ? proposal.payload.usedFgts === 'sim' ? 'sim' : proposal.payload.usedFgts === 'nao' ? 'nao' : ''
        : editingSimulation.parameters.hasUsedFgtsBefore ? 'sim' : 'nao'
    );
    setReceivedSubsidySinceMay2005(
      editingSimulation.parameters.receivedSubsidySinceMay2005 === undefined
        ? proposal.payload.fgtsSubsidy === 'sim' ? 'sim' : proposal.payload.fgtsSubsidy === 'nao' ? 'nao' : ''
        : editingSimulation.parameters.receivedSubsidySinceMay2005 ? 'sim' : 'nao'
    );
    setCaixaProgram(editingSimulation.parameters.caixaProgram || '');
    setCaixaFinancingCapInput(
      editingSimulation.parameters.financingQuotaPercent === undefined
        ? ''
        : String(editingSimulation.parameters.financingQuotaPercent)
    );
    setCaixaMaxTermInput(
      editingSimulation.parameters.maxTermMonths === undefined
        ? ''
        : String(editingSimulation.parameters.maxTermMonths)
    );
    setCaixaPropertyCapInput(
      editingSimulation.parameters.propertyValueCeiling === undefined
        ? ''
        : formatCurrencyInput(editingSimulation.parameters.propertyValueCeiling)
    );
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [editingSimulation]);

  const parameters = useMemo<SimulationParameters>(
    () => ({
      propertyValue: parseCurrencyInput(inputValues.propertyValue),
      downPayment: parseCurrencyInput(inputValues.downPayment),
      fgtsValue: parseCurrencyInput(inputValues.fgtsValue),
      financedAmount: parseCurrencyInput(inputValues.financedAmount),
      monthlyRatePercent: (() => {
        const enteredRatePercent = parseInputValue(inputValues.monthlyRatePercent);
        if (!Number.isFinite(enteredRatePercent)) return Number.NaN;
        return rateInputUnit === 'annual'
          ? effectiveMonthlyRateFromAnnualPercent(enteredRatePercent)
          : enteredRatePercent;
      })(),
      termMonths:
        parseInputValue(inputValues.termValue) * (termUnit === 'years' ? 12 : 1),
      amortizationSystem,
      rateInputUnit,
      propertyType,
      ...(purpose ? { purpose } : {}),
      ...(municipality.trim() ? { municipality: municipality.trim() } : {}),
      ...(state ? { state } : {}),
      ...(hasPropertyInSameMunicipality
        ? { hasPropertyInSameMunicipality: hasPropertyInSameMunicipality === 'sim' }
        : {}),
      ...(hasActiveHousingFinance
        ? { hasActiveHousingFinance: hasActiveHousingFinance === 'sim' }
        : {}),
      ...(hasUsedFgtsBefore
        ? { hasUsedFgtsBefore: hasUsedFgtsBefore === 'sim' }
        : {}),
      ...(receivedSubsidySinceMay2005
        ? { receivedSubsidySinceMay2005: receivedSubsidySinceMay2005 === 'sim' }
        : {}),
      ...(rateInputUnit === 'annual' && Number.isFinite(parseInputValue(inputValues.monthlyRatePercent))
        ? { annualRatePercent: parseInputValue(inputValues.monthlyRatePercent) }
        : {}),
      ...(caixaProgram ? { caixaProgram } : {}),
      ...(parseInputValue(caixaFinancingCapInput) > 0
        ? { financingQuotaPercent: parseInputValue(caixaFinancingCapInput) }
        : {}),
      ...(Number.isSafeInteger(parseInputValue(caixaMaxTermInput)) &&
      parseInputValue(caixaMaxTermInput) > 0
        ? { maxTermMonths: parseInputValue(caixaMaxTermInput) }
        : {}),
      ...(Number.isFinite(parseCurrencyInput(caixaPropertyCapInput)) &&
      parseCurrencyInput(caixaPropertyCapInput) > 0
        ? { propertyValueCeiling: parseCurrencyInput(caixaPropertyCapInput) }
        : {}),
    }),
    [
      amortizationSystem,
      caixaFinancingCapInput,
      caixaMaxTermInput,
      caixaProgram,
      caixaPropertyCapInput,
      hasActiveHousingFinance,
      hasPropertyInSameMunicipality,
      hasUsedFgtsBefore,
      inputValues,
      municipality,
      propertyType,
      purpose,
      rateInputUnit,
      receivedSubsidySinceMay2005,
      state,
      termUnit,
    ]
  );

  const calculations = useMemo(() => {
    try {
      return {
        sac: calculateFinancialSimulation({ ...parameters, amortizationSystem: 'sac' }),
        price: calculateFinancialSimulation({ ...parameters, amortizationSystem: 'price' }),
        error: null,
      };
    } catch (error) {
      return {
        sac: null,
        price: null,
        error: Number.isNaN(parameters.monthlyRatePercent)
          ? 'Informe a taxa efetiva da condição consultada na CAIXA. Use 0 somente se essa for a taxa informada.'
          : error instanceof Error ? error.message : 'Parâmetros inválidos.',
      };
    }
  }, [parameters]);

  const expectedFinancedAmount = parameters.propertyValue - parameters.downPayment - parameters.fgtsValue;
  const financedAmountDiffers =
    Number.isFinite(expectedFinancedAmount) &&
    Number.isFinite(parameters.financedAmount) &&
    Math.abs(parameters.financedAmount - expectedFinancedAmount) >= 0.01;
  const caixaFinancingCapPercent = parameters.financingQuotaPercent;
  const caixaMaxFinancedAmount =
    Number.isFinite(parameters.propertyValue) && caixaFinancingCapPercent !== undefined
      ? parameters.propertyValue * (caixaFinancingCapPercent / 100)
      : 0;
  const financedAmountAboveCaixaCap =
    Number.isFinite(parameters.financedAmount) &&
    caixaMaxFinancedAmount > 0 &&
    parameters.financedAmount > caixaMaxFinancedAmount + 0.01;
  const termAboveCaixaLimit =
    parameters.maxTermMonths !== undefined && parameters.termMonths > parameters.maxTermMonths;
  const minimumTotalOwnContribution =
    caixaFinancingCapPercent !== undefined
      ? parameters.propertyValue * (1 - caixaFinancingCapPercent / 100)
      : 0;
  const minimumCashDownPayment = Math.max(0, minimumTotalOwnContribution - parameters.fgtsValue);
  const entryBelowCaixaMinimum =
    caixaFinancingCapPercent !== undefined &&
    parameters.downPayment + parameters.fgtsValue + 0.01 < minimumTotalOwnContribution;
  const propertyAboveCaixaCeiling =
    parameters.propertyValueCeiling !== undefined &&
    Number.isFinite(parameters.propertyValue) &&
    parameters.propertyValue > parameters.propertyValueCeiling;
  const familyIncome = getProposalFinancialIndicators(proposal.payload).familyGrossIncome;
  const mcmvIncomeClassification = classifyUrbanMcmvIncome(familyIncome);
  const primaryFgtsMonths = parseFgtsServiceTimeMonths(proposal.payload.p1.serviceTime);
  const coProposerFgtsMonths = proposal.payload.hasP2 && proposal.payload.p2
    ? parseFgtsServiceTimeMonths(proposal.payload.p2.serviceTime)
    : 0;
  const totalFgtsMonths =
    primaryFgtsMonths !== null && coProposerFgtsMonths !== null
      ? primaryFgtsMonths + coProposerFgtsMonths
      : null;
  const possibleMcmvFinancingLine =
    mcmvIncomeClassification?.withinUrbanIncomeLimit &&
    propertyType === 'residential' &&
    ['buy-new', 'buy-used', 'caixa-property'].includes(purpose);
  const mcmvRequirementReviewNeeded =
    hasPropertyInSameMunicipality === 'sim' ||
    hasActiveHousingFinance === 'sim' ||
    receivedSubsidySinceMay2005 === 'sim';
  const mcmvAnswersPending =
    hasPropertyInSameMunicipality === '' ||
    hasActiveHousingFinance === '' ||
    receivedSubsidySinceMay2005 === '';

  const updateAmount = (
    field: CurrencyInputField | 'monthlyRatePercent',
    value: string
  ) => {
    const normalizedValue =
      field === 'monthlyRatePercent' ? value : maskCurrencyInput(value);
    const updatesLoanAmount =
      field === 'propertyValue' || field === 'downPayment' || field === 'fgtsValue';
    if (updatesLoanAmount) setFinancedAmountManual(false);
    if (field === 'financedAmount') setFinancedAmountManual(true);

    setInputValues((previous) => {
      const updated = { ...previous, [field]: normalizedValue };
      if (updatesLoanAmount) {
        const propertyValue = parseCurrencyInput(updated.propertyValue);
        const downPayment = parseCurrencyInput(updated.downPayment);
        const fgtsValue = parseCurrencyInput(updated.fgtsValue);
        const quotaPercent = parseInputValue(caixaFinancingCapInput);
        const amountNeeded = propertyValue - downPayment - fgtsValue;
        const quotaLimit =
          Number.isFinite(quotaPercent) && quotaPercent > 0
            ? propertyValue * (quotaPercent / 100)
            : Number.POSITIVE_INFINITY;
        updated.financedAmount =
          [propertyValue, downPayment, fgtsValue].every(Number.isFinite)
            ? formatCurrencyInput(Math.max(0, Math.min(amountNeeded, quotaLimit)))
            : '';
      }
      return updated;
    });
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const updateCaixaQuota = (value: string) => {
    setCaixaFinancingCapInput(value);
    setFinancedAmountManual(false);
    const quotaPercent = parseInputValue(value);
    setInputValues((previous) => {
      const propertyValue = parseCurrencyInput(previous.propertyValue);
      const downPayment = parseCurrencyInput(previous.downPayment);
      const fgtsValue = parseCurrencyInput(previous.fgtsValue);
      if (![propertyValue, downPayment, fgtsValue].every(Number.isFinite)) return previous;
      const amountNeeded = propertyValue - downPayment - fgtsValue;
      const quotaLimit =
        Number.isFinite(quotaPercent) && quotaPercent > 0
          ? propertyValue * (quotaPercent / 100)
          : Number.POSITIVE_INFINITY;
      return {
        ...previous,
        financedAmount: formatCurrencyInput(Math.max(0, Math.min(amountNeeded, quotaLimit))),
      };
    });
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const updateTermUnit = (unit: 'months' | 'years') => {
    if (unit !== termUnit) {
      const currentValue = parseInputValue(inputValues.termValue);
      setInputValues((previous) => ({
        ...previous,
        termValue: Number.isFinite(currentValue)
          ? String(currentValue * (termUnit === 'years' ? 12 : 1) / (unit === 'years' ? 12 : 1))
          : '',
      }));
      setTermUnit(unit);
    }
  };

  const updateRateInputUnit = (unit: 'monthly' | 'annual') => {
    if (unit === rateInputUnit) return;
    const enteredRatePercent = parseInputValue(inputValues.monthlyRatePercent);
    if (Number.isFinite(enteredRatePercent)) {
      const convertedRate =
        unit === 'monthly'
          ? effectiveMonthlyRateFromAnnualPercent(enteredRatePercent)
          : ((1 + enteredRatePercent / 100) ** 12 - 1) * 100;
      setInputValues((previous) => ({
        ...previous,
        monthlyRatePercent: String(convertedRate),
      }));
    }
    setRateInputUnit(unit);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const updateAmortizationSystem = (system: SimulationParameters['amortizationSystem']) => {
    setAmortizationSystem(system);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const saveScenario = async (system: 'sac' | 'price') => {
    const result = calculations[system];
    if (!result) return;
    setSavingSystem(system);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const name =
        scenarioName.trim() ||
        `${system.toUpperCase()} - ${new Date().toLocaleDateString('pt-BR')}`;
      const updatedParameters = { ...parameters, amortizationSystem: system };
      if (editingSimulation) {
        await proposalService.updateFinancialSimulation(
          editingSimulation.id,
          name,
          updatedParameters
        );
        setSuccessMessage(`Cenário ${system.toUpperCase()} atualizado. O histórico anterior foi preservado.`);
        onCancelEdit();
      } else {
        await proposalService.createFinancialSimulation(proposal.db_id || proposal.id, name, updatedParameters);
        setSuccessMessage(`Cenário ${system.toUpperCase()} salvo no histórico da proposta.`);
      }
      onSaved();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível salvar o cenário.');
    } finally {
      setSavingSystem(null);
    }
  };

  const currentSystemResult =
    parameters.amortizationSystem === 'sac' ? calculations.sac : calculations.price;

  return (
    <section className="space-y-5">
      {editingSimulation && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-100">
          <span>Editando o cenário salvo “{editingSimulation.scenarioName}”.</span>
          <button type="button" onClick={onCancelEdit} className="inline-flex items-center gap-1 font-bold">
            <X className="h-3.5 w-3.5" /> Cancelar
          </button>
        </div>
      )}

      <div className="rounded-xl border border-[#334155] bg-[#0F172A]/70 p-3 text-xs text-[#CBD5E1]/70">
        Os dados iniciais abaixo foram carregados do formulário original da proposta. Alterações aqui
        afetam somente esta simulação, sem modificar o cadastro do cliente.
      </div>

      <div className="space-y-3 rounded-xl border border-[#334155] bg-[#0F172A]/70 p-4">
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#FF6B1A]">
            Perfil da consulta CAIXA
          </h3>
          <p className="mt-1 text-[10px] leading-relaxed text-[#CBD5E1]/60">
            Informe os dados considerados na consulta oficial. Eles ficam associados somente ao cenário salvo.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs text-[#CBD5E1]/70">
            Tipo do imóvel
            <select
              value={propertyType}
              onChange={(event) => setPropertyType(event.target.value as SimulationPropertyType)}
              className="mt-1 w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B1A]"
            >
              <option value="residential">Residencial</option>
              <option value="commercial">Comercial</option>
            </select>
          </label>
          <label className="text-xs text-[#CBD5E1]/70">
            O que deseja fazer?
            <select
              value={purpose}
              onChange={(event) => setPurpose(event.target.value as SimulationPurpose | '')}
              className="mt-1 w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B1A]"
            >
              <option value="">Selecione</option>
              {Object.entries(PURPOSE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-[#CBD5E1]/70">
            Município do imóvel
            <input
              type="text"
              maxLength={100}
              value={municipality}
              onChange={(event) => setMunicipality(event.target.value)}
              placeholder="Ex.: Campinas"
              className="mt-1 w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B1A]"
            />
          </label>
          <label className="text-xs text-[#CBD5E1]/70">
            UF do imóvel
            <select
              value={state}
              onChange={(event) => setState(event.target.value)}
              className="mt-1 w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B1A]"
            >
              <option value="">Selecione</option>
              {BRAZILIAN_STATES.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </label>
          <label className="text-xs text-[#CBD5E1]/70">
            Possui outro imóvel residencial no município onde pretende comprar?
            <select
              value={hasPropertyInSameMunicipality}
              onChange={(event) => setHasPropertyInSameMunicipality(event.target.value as YesNoAnswer)}
              className="mt-1 w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B1A]"
            >
              <option value="">Selecione</option><option value="nao">Não</option><option value="sim">Sim</option>
            </select>
          </label>
          <label className="text-xs text-[#CBD5E1]/70">
            Possui financiamento habitacional ativo no SFH/FGTS?
            <select
              value={hasActiveHousingFinance}
              onChange={(event) => setHasActiveHousingFinance(event.target.value as YesNoAnswer)}
              className="mt-1 w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B1A]"
            >
              <option value="">Selecione</option><option value="nao">Não</option><option value="sim">Sim</option>
            </select>
          </label>
          <label className="text-xs text-[#CBD5E1]/70">
            Já utilizou FGTS para aquisição de imóvel?
            <select
              value={hasUsedFgtsBefore}
              onChange={(event) => setHasUsedFgtsBefore(event.target.value as YesNoAnswer)}
              className="mt-1 w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B1A]"
            >
              <option value="">Selecione</option><option value="nao">Não</option><option value="sim">Sim</option>
            </select>
          </label>
          <label className="text-xs text-[#CBD5E1]/70">
            Já recebeu subsídio FGTS/União a partir de maio de 2005?
            <select
              value={receivedSubsidySinceMay2005}
              onChange={(event) => setReceivedSubsidySinceMay2005(event.target.value as YesNoAnswer)}
              className="mt-1 w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B1A]"
            >
              <option value="">Selecione</option><option value="nao">Não</option><option value="sim">Sim</option>
            </select>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-[#334155] bg-[#0B1220] p-3 text-xs">
            <span className="block text-[#CBD5E1]/60">Tempo de trabalho sob regime do FGTS informado</span>
            <span className="mt-1 block text-white">
              Titular: {proposal.payload.p1.serviceTime || 'não informado'}
            </span>
            {proposal.payload.hasP2 && (
              <span className="mt-1 block text-white">
                Coproponente: {proposal.payload.p2?.serviceTime || 'não informado'}
              </span>
            )}
            <strong className="mt-2 block text-[#FFB27F]">
              {totalFgtsMonths === null
                ? 'Não foi possível somar automaticamente; confira o formato do tempo informado.'
                : `${proposal.payload.hasP2 ? 'Total somado do casal' : 'Total apurado'}: ${formatFgtsServiceTime(totalFgtsMonths)}`}
            </strong>
            <span className="mt-1 block text-[10px] text-[#CBD5E1]/50">
              Soma dos períodos declarados; não confirma requisito ou elegibilidade da CAIXA.
            </span>
          </div>
          <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3 text-xs">
            <span className="block text-[#CBD5E1]/60">Modalidade indicativa pelo perfil</span>
            <strong className="mt-1 block text-sky-100">
              {possibleMcmvFinancingLine
                ? 'MCMV — financiamento habitacional com incentivos (possível pelo perfil informado)'
                : mcmvIncomeClassification?.withinUrbanIncomeLimit
                  ? 'Não foi possível indicar MCMV para esta finalidade/tipo de imóvel'
                  : 'Não indicado pelo limite de renda urbana do MCMV'}
            </strong>
            {possibleMcmvFinancingLine && (
              <span className="mt-1 block text-[10px] text-[#CBD5E1]/60">
                Faixa de renda: {mcmvIncomeClassification?.label}. A seleção final depende das regras da modalidade e da análise CAIXA.
              </span>
            )}
            {mcmvRequirementReviewNeeded && (
              <span className="mt-1 block text-[10px] text-amber-200">
                Há resposta que exige conferência dos critérios do programa antes de indicar enquadramento.
              </span>
            )}
            {mcmvAnswersPending && (
              <span className="mt-1 block text-[10px] text-amber-200">
                Responda às perguntas de elegibilidade para completar a indicação.
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs text-[#CBD5E1]/70">
          Valor do imóvel
          <div className="relative mt-1">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-[#CBD5E1]/50">R$</span>
            <input type="text" inputMode="decimal" value={inputValues.propertyValue}
              onChange={(event) => updateAmount('propertyValue', event.target.value)}
              className="w-full rounded-lg border border-[#334155] bg-[#0F172A] py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-[#FF6B1A]" />
          </div>
        </label>
        <div className="rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2 text-xs">
          <span className="block text-[#CBD5E1]/60">Renda bruta familiar do formulário</span>
          <strong className="mt-1 block text-sm text-white">{formatCurrency(familyIncome)}</strong>
          <div className="mt-2 border-t border-[#334155] pt-2">
            <span className="block text-[10px] text-[#CBD5E1]/60">
              Faixas de Renda Bruta Familiar (2026)
            </span>
            {mcmvIncomeClassification ? (
              <>
                <strong className="mt-1 block text-xs text-[#FFB27F]">
                  {mcmvIncomeClassification.label}
                </strong>
                <span className="mt-0.5 block text-[10px] text-[#CBD5E1]/70">
                  {mcmvIncomeClassification.incomeRange}
                </span>
                {!mcmvIncomeClassification.withinUrbanIncomeLimit && (
                  <p className="mt-1 text-[10px] leading-relaxed text-amber-200/80">
                    Isso indica somente que a renda ultrapassa o limite urbano informado para o MCMV;
                    outras linhas de crédito podem existir.
                  </p>
                )}
              </>
            ) : (
              <span className="mt-1 block text-[10px] text-[#CBD5E1]/70">
                Não há renda familiar informada para indicar uma faixa.
              </span>
            )}
            <p className="mt-1 text-[10px] leading-relaxed text-[#CBD5E1]/60">
              A faixa de renda não confirma elegibilidade. O limite do imóvel depende da localidade e da
              modalidade; a taxa deve ser informada conforme consulta da condição vigente.
            </p>
            <a
              href="https://www.gov.br/cidades/pt-br/composicao/ouvidoria/perguntas-frequentes/perguntas-frequentes"
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-[10px] font-semibold text-[#FFB27F] hover:underline"
            >
              Consultar FAQ oficial do Ministério das Cidades
            </a>
          </div>
        </div>
        <label className="text-xs text-[#CBD5E1]/70">
          Entrada
          <div className="relative mt-1">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-[#CBD5E1]/50">R$</span>
            <input type="text" inputMode="decimal" value={inputValues.downPayment}
              onChange={(event) => updateAmount('downPayment', event.target.value)}
              className="w-full rounded-lg border border-[#334155] bg-[#0F172A] py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-[#FF6B1A]" />
          </div>
          {caixaFinancingCapPercent !== undefined && (
            <span className="mt-1 block text-[10px] text-[#CBD5E1]/60">
              Entrada mínima para a cota consultada: {formatCurrency(minimumCashDownPayment)}
              {parameters.fgtsValue > 0
                ? `, considerando ${formatCurrency(parameters.fgtsValue)} de FGTS.`
                : '.'}
            </span>
          )}
        </label>
        <label className="text-xs text-[#CBD5E1]/70">
          FGTS utilizado
          <div className="relative mt-1">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-[#CBD5E1]/50">R$</span>
            <input type="text" inputMode="decimal" value={inputValues.fgtsValue}
              onChange={(event) => updateAmount('fgtsValue', event.target.value)}
              className="w-full rounded-lg border border-[#334155] bg-[#0F172A] py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-[#FF6B1A]" />
          </div>
        </label>
        <label className="text-xs text-[#CBD5E1]/70">
          Valor financiado
          <div className="relative mt-1">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-[#CBD5E1]/50">R$</span>
            <input type="text" inputMode="decimal" value={inputValues.financedAmount}
              onChange={(event) => updateAmount('financedAmount', event.target.value)}
              className="w-full rounded-lg border border-[#334155] bg-[#0F172A] py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-[#FF6B1A]" />
          </div>
        </label>
        <label className="text-xs text-[#CBD5E1]/70">
          Programa CAIXA consultado
          <select
            value={caixaProgram}
            onChange={(event) => setCaixaProgram(event.target.value as typeof caixaProgram)}
            className="mt-1 w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B1A]"
          >
            <option value="">Selecione conforme a consulta</option>
            <option value="mcmv-fgts">Minha Casa, Minha Vida - Recursos FGTS</option>
            <option value="mcmv-procotista">Minha Casa, Minha Vida/Pró-Cotista</option>
            <option value="sbpe-tr">SBPE (TR): Taxa Balcão</option>
            <option value="outra">Outra modalidade/condição consultada</option>
          </select>
        </label>
        <label className="text-xs text-[#CBD5E1]/70">
          Cota máxima do financiamento consultada (%)
          <input
            type="number"
            min="0.01"
            max="100"
            step="0.01"
            value={caixaFinancingCapInput}
            onChange={(event) => updateCaixaQuota(event.target.value)}
            className="mt-1 w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B1A]"
          />
          <span className="mt-1 block text-[10px] text-[#CBD5E1]/60">
            Informe a cota mostrada pelo simulador CAIXA para esta proposta. Não há percentual presumido.
          </span>
        </label>
        <label className="text-xs text-[#CBD5E1]/70">
          Tetos do Valor do Imóvel — teto consultado
          <div className="relative mt-1">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-[#CBD5E1]/50">R$</span>
            <input
              type="text"
              inputMode="decimal"
              value={caixaPropertyCapInput}
              onChange={(event) => setCaixaPropertyCapInput(maskCurrencyInput(event.target.value))}
              className="w-full rounded-lg border border-[#334155] bg-[#0F172A] py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-[#FF6B1A]"
            />
          </div>
          <span className="mt-1 block text-[10px] text-[#CBD5E1]/60">
            Informe o teto aplicável à modalidade e ao município, conforme consulta vigente.
          </span>
        </label>
        <label className="text-xs text-[#CBD5E1]/70">
          Prazo máximo permitido pela linha consultada (meses)
          <input
            type="number"
            min="1"
            step="1"
            value={caixaMaxTermInput}
            onChange={(event) => setCaixaMaxTermInput(event.target.value)}
            className="mt-1 w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B1A]"
          />
        </label>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div className="col-span-2 border-b border-[#334155] pb-2 text-[10px] font-extrabold uppercase tracking-wider text-[#FF6B1A]">
            Taxas de Juros, Prazos e Condições
          </div>
          <label className="text-xs text-[#CBD5E1]/70">
            Taxa de juros efetiva ({rateInputUnit === 'annual' ? '% a.a.' : '% a.m.'})
            <input type="number" min="0" step="0.0001" value={inputValues.monthlyRatePercent}
              onChange={(event) => updateAmount('monthlyRatePercent', event.target.value)}
              className="mt-1 w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B1A]" />
          </label>
          <label className="self-end text-xs text-[#CBD5E1]/70">
            Unidade
            <select
              value={rateInputUnit}
              onChange={(event) => updateRateInputUnit(event.target.value as 'monthly' | 'annual')}
              className="mt-1 h-[38px] rounded-lg border border-[#334155] bg-[#0F172A] px-2 text-xs text-white"
            >
              <option value="annual">% a.a.</option>
              <option value="monthly">% a.m.</option>
            </select>
          </label>
          <span className="col-span-2 text-[10px] text-amber-200/80">
            Informe a taxa efetiva da condição CAIXA. A taxa anual é convertida em equivalente mensal para o cálculo.
          </span>
          <span className="mt-1 block text-[10px] text-amber-200/80">
            A taxa utilizada é de entrada manual; nenhuma condição é presumida.
          </span>
          {parameters.monthlyRatePercent === 0 && (
            <span className="mt-1 block text-[10px] text-sky-200/80">
              Com taxa de 0%, SAC e PRICE resultam na mesma prestação. Com juros, a prestação SAC
              começa maior e diminui; a PRICE mantém prestações iguais.
            </span>
          )}
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <label className="text-xs text-[#CBD5E1]/70">
            Prazo ({termUnit === 'years' ? 'anos' : 'meses'})
            <input type="number" min="1" step="1"
              value={inputValues.termValue}
              onChange={(event) => {
                setInputValues((previous) => ({ ...previous, termValue: event.target.value }));
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="mt-1 w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B1A]" />
          </label>
          <label className="self-end text-xs text-[#CBD5E1]/70">
            Unidade
            <select value={termUnit} onChange={(event) => updateTermUnit(event.target.value as 'months' | 'years')}
              className="mt-1 h-[38px] rounded-lg border border-[#334155] bg-[#0F172A] px-2 text-xs text-white">
              <option value="years">Anos</option>
              <option value="months">Meses</option>
            </select>
          </label>
        </div>
        <label className="text-xs text-[#CBD5E1]/70">
          Sistema do cenário a salvar
          <select value={amortizationSystem}
            onChange={(event) => updateAmortizationSystem(event.target.value as SimulationParameters['amortizationSystem'])}
            className="mt-1 w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2 text-sm text-white">
            <option value="sac">SAC</option>
            <option value="price">PRICE</option>
          </select>
        </label>
        <label className="text-xs text-[#CBD5E1]/70 sm:col-span-2 lg:col-span-2">
          Nome do cenário
          <input type="text" maxLength={100} value={scenarioName} onChange={(event) => setScenarioName(event.target.value)}
            placeholder="Ex.: SAC com taxa consultada em 15/11"
            className="mt-1 w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B1A]" />
        </label>
      </div>

      {financedAmountDiffers && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <span>
            Valor financiado divergente do saldo do imóvel ({formatCurrency(expectedFinancedAmount)}).
            {financedAmountManual
              ? ' O valor foi ajustado manualmente e será mantido na simulação.'
              : ' O valor recebido na proposta foi mantido como referência inicial.'}
          </span>
        </div>
      )}
      {entryBelowCaixaMinimum && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <span>
            Para a cota de {caixaFinancingCapPercent}% informada, entrada + FGTS precisam somar pelo menos{' '}
            {formatCurrency(minimumTotalOwnContribution)}. Com o FGTS atual, a entrada mínima estimada é{' '}
            {formatCurrency(minimumCashDownPayment)}. Confirme a condição no simulador CAIXA.
          </span>
        </div>
      )}
      {financedAmountAboveCaixaCap && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <span>
            Valor financiado acima da cota máxima informada para a linha consultada ({formatCurrency(caixaMaxFinancedAmount)}).
            O limite foi informado manualmente pelo funcionário e não representa aprovação do crédito.
          </span>
        </div>
      )}
      {propertyAboveCaixaCeiling && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <span>
            Valor do imóvel acima do teto informado para a modalidade/localidade ({formatCurrency(parameters.propertyValueCeiling!)}).
            Confirme o teto vigente na consulta CAIXA.
          </span>
        </div>
      )}
      {termAboveCaixaLimit && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <span>
            Prazo da simulação acima do limite informado para a linha consultada ({parameters.maxTermMonths} meses).
            Ajuste o prazo para a condição oficial consultada.
          </span>
        </div>
      )}

      {calculations.error && (
        <div role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
          {calculations.error}
        </div>
      )}
      {errorMessage && (
        <div role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
          {successMessage}
        </p>
      )}

      {currentSystemResult && (
        <ResultSummary
          proposal={proposal}
          scenarioName={scenarioName.trim() || `Prévia ${parameters.amortizationSystem.toUpperCase()}`}
          parameters={parameters}
          result={currentSystemResult}
        />
      )}

      {calculations.sac && calculations.price && (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {(['sac', 'price'] as const).map((system) => {
              const result = system === 'sac' ? calculations.sac! : calculations.price!;
              return (
                <div key={system} className="rounded-xl border border-[#334155] bg-[#0F172A] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-white">Cenário {system.toUpperCase()}</h4>
                    <button type="button" disabled={savingSystem !== null}
                      onClick={() => saveScenario(system)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF6B1A] px-3 py-2 text-[11px] font-bold text-white transition hover:bg-[#E85D04] disabled:opacity-50">
                      {savingSystem === system
                        ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        : <Save className="h-3.5 w-3.5" />}
                      {editingSimulation ? 'Atualizar cenário' : 'Salvar cenário'}
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <span className="text-[#CBD5E1]/60">1ª prestação</span><b>{formatCurrency(result.firstInstallment)}</b>
                    <span className="text-[#CBD5E1]/60">Última prestação</span><b>{formatCurrency(result.lastInstallment)}</b>
                    <span className="text-[#CBD5E1]/60">Total estimado pago</span><b>{formatCurrency(result.totalPaid)}</b>
                    <span className="text-[#CBD5E1]/60">Total estimado de juros</span><b>{formatCurrency(result.totalInterest)}</b>
                    {familyIncome > 0 && (
                      <>
                        <span className="text-[#CBD5E1]/60">1ª parcela / renda familiar</span>
                        <b>{((result.firstInstallment / familyIncome) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%</b>
                      </>
                    )}
                  </div>
                  {familyIncome > 0 && (
                    <p className="mt-2 text-[10px] text-[#CBD5E1]/50">
                      Indicador matemático sobre a renda informada; não representa margem aprovada nem critério oficial da CAIXA.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#CBD5E1]/60">Evolução das parcelas:</span>
              {(['sac', 'price'] as const).map((system) => (
                <button key={system} type="button" onClick={() => setScheduleSystem(system)}
                  className={`rounded-md px-2.5 py-1 text-[10px] font-bold ${
                    scheduleSystem === system
                      ? 'bg-[#FF6B1A] text-white'
                      : 'border border-[#334155] text-[#CBD5E1]/60'
                  }`}>
                  {system.toUpperCase()}
                </button>
              ))}
            </div>
            <InstallmentSchedule
              title={scheduleSystem.toUpperCase()}
              result={scheduleSystem === 'sac' ? calculations.sac : calculations.price}
            />
          </div>
        </>
      )}
    </section>
  );
};

export const ProposalSimulationHistory: React.FC<{
  proposal: ProposalRecord;
  refreshKey: number;
  onEdit: (simulation: FinancialSimulationRecord) => void;
}> = ({ proposal, refreshKey, onEdit }) => {
  const [simulations, setSimulations] = useState<FinancialSimulationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setErrorMessage(null);
    proposalService
      .getFinancialSimulations(proposal.db_id || proposal.id)
      .then((records) => {
        if (active) setSimulations(records);
      })
      .catch((error: unknown) => {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : 'Não foi possível carregar o histórico.');
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [proposal.db_id, proposal.id, refreshKey]);

  if (isLoading) return <p className="text-xs text-[#CBD5E1]/60">Carregando histórico de simulações…</p>;
  if (errorMessage) {
    return <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{errorMessage}</p>;
  }
  if (simulations.length === 0) {
    return <p className="rounded-xl border border-dashed border-[#334155] p-8 text-center text-xs text-[#CBD5E1]/50">Ainda não há cenários salvos para esta proposta.</p>;
  }

  return (
    <div className="space-y-3">
      {simulations.map((simulation) => (
        <article key={simulation.id} className="rounded-xl border border-[#334155] bg-[#0F172A] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 className="font-bold text-white">{simulation.scenarioName}</h4>
              <p className="mt-1 text-[11px] text-[#CBD5E1]/50">
                {simulation.parameters.amortizationSystem.toUpperCase()} • {simulation.parameters.termMonths} meses • taxa mensal {simulation.parameters.monthlyRatePercent.toLocaleString('pt-BR')}%
              </p>
              <p className="text-[10px] text-[#CBD5E1]/40">Salvo em {formatDate(simulation.createdAt)}</p>
            </div>
            <button type="button" onClick={() => onEdit(simulation)}
              className="rounded-lg border border-[#334155] px-3 py-2 text-[11px] font-bold text-[#CBD5E1] transition hover:border-[#FF6B1A] hover:text-white">
              Editar parâmetros
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <div><span className="block text-[#CBD5E1]/50">Financiado</span><b>{formatCurrency(simulation.parameters.financedAmount)}</b></div>
            <div><span className="block text-[#CBD5E1]/50">1ª prestação</span><b>{formatCurrency(simulation.result.firstInstallment)}</b></div>
            <div><span className="block text-[#CBD5E1]/50">Última prestação</span><b>{formatCurrency(simulation.result.lastInstallment)}</b></div>
            <div><span className="block text-[#CBD5E1]/50">Total de juros</span><b>{formatCurrency(simulation.result.totalInterest)}</b></div>
          </div>
        </article>
      ))}
    </div>
  );
};
