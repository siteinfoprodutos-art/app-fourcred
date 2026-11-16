import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Download, LoaderCircle, Save, X } from 'lucide-react';
import {
  FinancialSimulationRecord,
  ProposalRecord,
  SimulationParameters,
  SimulationResult,
} from '../../types/proposal';
import { calculateFinancialSimulation } from '../../services/financialSimulationService';
import { proposalService } from '../../services/proposalService';
import { generateSimulationPDF } from '../../services/pdfService';

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDate = (date: string) => new Date(date).toLocaleString('pt-BR');

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
    monthlyRatePercent: 0,
    termMonths: Number.isSafeInteger(requestedTerm) && requestedTerm > 0 ? requestedTerm : 360,
    amortizationSystem: payload.amortizationSystem?.toLowerCase() === 'price' ? 'price' : 'sac',
  };
};

const ResultSummary: React.FC<{
  proposal: ProposalRecord;
  scenarioName: string;
  parameters: SimulationParameters;
  result: SimulationResult;
}> = ({ proposal, scenarioName, parameters, result }) => (
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
      <div><span className="block text-[#CBD5E1]/50">Imóvel</span><b>{formatCurrency(parameters.propertyValue)}</b></div>
      <div><span className="block text-[#CBD5E1]/50">Entrada</span><b>{formatCurrency(parameters.downPayment)}</b></div>
      <div><span className="block text-[#CBD5E1]/50">FGTS</span><b>{formatCurrency(parameters.fgtsValue)}</b></div>
      <div><span className="block text-[#CBD5E1]/50">Financiado</span><b>{formatCurrency(parameters.financedAmount)}</b></div>
      <div><span className="block text-[#CBD5E1]/50">Taxa mensal</span><b>{parameters.monthlyRatePercent.toLocaleString('pt-BR')}%</b></div>
      <div><span className="block text-[#CBD5E1]/50">Prazo</span><b>{parameters.termMonths} meses</b></div>
      <div><span className="block text-[#CBD5E1]/50">Amortização</span><b>{parameters.amortizationSystem.toUpperCase()}</b></div>
      <div><span className="block text-[#CBD5E1]/50">1ª prestação</span><b>{formatCurrency(result.firstInstallment)}</b></div>
      <div><span className="block text-[#CBD5E1]/50">Última prestação</span><b>{formatCurrency(result.lastInstallment)}</b></div>
      <div><span className="block text-[#CBD5E1]/50">Total estimado pago</span><b>{formatCurrency(result.totalPaid)}</b></div>
      <div><span className="block text-[#CBD5E1]/50">Total estimado de juros</span><b>{formatCurrency(result.totalInterest)}</b></div>
    </div>
    <p className="mt-4 rounded-lg bg-amber-500/10 p-3 text-[10px] font-bold leading-relaxed text-amber-200">
      SIMULAÇÃO FINANCEIRA ESTIMADA — NÃO REPRESENTA APROVAÇÃO DE CRÉDITO OU PROPOSTA OFICIAL DA CAIXA.
      Inclui somente amortização e juros calculados; não inclui seguros obrigatórios, TR, tarifas ou outros encargos.
    </p>
  </div>
);

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
  const [parameters, setParameters] = useState<SimulationParameters>(() => initialParameters(proposal));
  const [scenarioName, setScenarioName] = useState('');
  const [termUnit, setTermUnit] = useState<'months' | 'years'>('years');
  const [scheduleSystem, setScheduleSystem] = useState<'sac' | 'price'>('sac');
  const [financedAmountManual, setFinancedAmountManual] = useState(false);
  const [savingSystem, setSavingSystem] = useState<'sac' | 'price' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!editingSimulation) return;
    setParameters(editingSimulation.parameters);
    setScenarioName(editingSimulation.scenarioName);
    setFinancedAmountManual(true);
    setTermUnit(editingSimulation.parameters.termMonths % 12 === 0 ? 'years' : 'months');
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [editingSimulation]);

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
        error: error instanceof Error ? error.message : 'Parâmetros inválidos.',
      };
    }
  }, [parameters]);

  const expectedFinancedAmount =
    parameters.propertyValue - parameters.downPayment - parameters.fgtsValue;
  const financedAmountDiffers = Math.abs(parameters.financedAmount - expectedFinancedAmount) >= 0.01;

  const updateParameter = (field: keyof SimulationParameters, value: number | string) => {
    if (field === 'propertyValue' || field === 'downPayment' || field === 'fgtsValue') {
      setFinancedAmountManual(false);
    } else if (field === 'financedAmount') {
      setFinancedAmountManual(true);
    }
    setParameters((previous) => {
      const updated = { ...previous, [field]: value };
      if (field === 'propertyValue' || field === 'downPayment' || field === 'fgtsValue') {
        updated.financedAmount = Math.max(
          0,
          Number(updated.propertyValue) - Number(updated.downPayment) - Number(updated.fgtsValue)
        );
      }
      return updated;
    });
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs text-[#CBD5E1]/70">
          Valor do imóvel
          <input type="number" min="0.01" step="0.01" value={parameters.propertyValue}
            onChange={(event) => updateParameter('propertyValue', Number(event.target.value) || 0)}
            className="mt-1 w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B1A]" />
        </label>
        <label className="text-xs text-[#CBD5E1]/70">
          Entrada
          <input type="number" min="0" step="0.01" value={parameters.downPayment}
            onChange={(event) => updateParameter('downPayment', Number(event.target.value) || 0)}
            className="mt-1 w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B1A]" />
        </label>
        <label className="text-xs text-[#CBD5E1]/70">
          FGTS utilizado
          <input type="number" min="0" step="0.01" value={parameters.fgtsValue}
            onChange={(event) => updateParameter('fgtsValue', Number(event.target.value) || 0)}
            className="mt-1 w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B1A]" />
        </label>
        <label className="text-xs text-[#CBD5E1]/70">
          Valor financiado
          <input type="number" min="0.01" step="0.01" value={parameters.financedAmount}
            onChange={(event) => updateParameter('financedAmount', Number(event.target.value) || 0)}
            className="mt-1 w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B1A]" />
        </label>
        <label className="text-xs text-[#CBD5E1]/70">
          Taxa de juros mensal (%)
          <input type="number" min="0" step="0.0001" value={parameters.monthlyRatePercent}
            onChange={(event) => updateParameter('monthlyRatePercent', Number(event.target.value) || 0)}
            className="mt-1 w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B1A]" />
          <span className="mt-1 block text-[10px] text-amber-200/80">
            Informe a condição consultada em fonte autorizada. Nenhuma taxa é presumida.
          </span>
        </label>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <label className="text-xs text-[#CBD5E1]/70">
            Prazo ({termUnit === 'years' ? 'anos' : 'meses'})
            <input type="number" min="1" step="1"
              value={termUnit === 'years' ? parameters.termMonths / 12 : parameters.termMonths}
              onChange={(event) =>
                updateParameter(
                  'termMonths',
                  (Number(event.target.value) || 0) * (termUnit === 'years' ? 12 : 1)
                )
              }
              className="mt-1 w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2 text-sm text-white outline-none focus:border-[#FF6B1A]" />
          </label>
          <label className="self-end text-xs text-[#CBD5E1]/70">
            Unidade
            <select value={termUnit} onChange={(event) => setTermUnit(event.target.value as 'months' | 'years')}
              className="mt-1 h-[38px] rounded-lg border border-[#334155] bg-[#0F172A] px-2 text-xs text-white">
              <option value="years">Anos</option>
              <option value="months">Meses</option>
            </select>
          </label>
        </div>
        <label className="text-xs text-[#CBD5E1]/70">
          Sistema do cenário a salvar
          <select value={parameters.amortizationSystem}
            onChange={(event) => updateParameter('amortizationSystem', event.target.value)}
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
                  </div>
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
