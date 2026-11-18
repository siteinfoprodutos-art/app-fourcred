import { Router, Request, Response } from 'express';
import {
  FinancialSimulationDatabaseRow,
  FinancialSimulationRecord,
  SimulationParameters,
} from '../../types/proposal.ts';
import {
  calculateFinancialSimulation,
  isAmortizationSystem,
} from '../../services/financialSimulationService.ts';
import {
  getAuthenticatedSupabaseClient,
  isSupabaseConfigured,
} from '../supabase.ts';
import { requireAdminAuth } from '../middleware/adminAuth.ts';
import { logServerAction, logServerError } from '../utils/logger.ts';

const router = Router();
const inMemorySimulations = new Map<string, FinancialSimulationRecord[]>();

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validateScenarioName = (value: unknown): string | null => {
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > 100) {
    return null;
  }
  return value.trim();
};

const withUnexpectedError = (
  event: string,
  handler: (req: Request, res: Response) => Promise<void>
) => (req: Request, res: Response) => {
  void handler(req, res).catch((error: unknown) => {
    logServerError(event, error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Erro interno ao processar a operação de simulação.',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });
};

const getSimulationSupabaseClient = (req: Request) => {
  if (!isSupabaseConfigured()) return null;
  const authorization = req.headers.authorization;
  if (!authorization) throw new Error('Token administrativo ausente para consulta protegida.');
  const client = getAuthenticatedSupabaseClient(authorization);
  if (!client) throw new Error('Não foi possível criar o cliente Supabase autenticado.');
  return client;
};

const buildSimulation = (
  proposalId: string | null,
  scenarioName: string,
  parameters: SimulationParameters,
  adminId: string | null,
  existing?: FinancialSimulationRecord
): FinancialSimulationRecord => {
  const result = calculateFinancialSimulation(parameters);
  const now = new Date().toISOString();
  return {
    id: existing?.id || crypto.randomUUID(),
    proposalId,
    adminUserId: existing?.adminUserId || adminId,
    updatedByAdminUserId: existing ? adminId : null,
    scenarioName,
    parameters,
    result,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
};

const toDatabaseRow = (simulation: FinancialSimulationRecord) => ({
  cadastro_id: simulation.proposalId,
  administrador_id: simulation.adminUserId,
  atualizado_por_administrador_id:
    simulation.updatedByAdminUserId || simulation.adminUserId,
  nome_cenario: simulation.scenarioName,
  valor_imovel: simulation.parameters.propertyValue,
  valor_entrada: simulation.parameters.downPayment,
  valor_fgts: simulation.parameters.fgtsValue,
  valor_financiado: simulation.parameters.financedAmount,
  taxa_mensal: simulation.parameters.monthlyRatePercent / 100,
  prazo_meses: simulation.parameters.termMonths,
  sistema_amortizacao: simulation.parameters.amortizationSystem,
  primeira_prestacao: simulation.result.firstInstallment,
  ultima_prestacao: simulation.result.lastInstallment,
  total_pago: simulation.result.totalPaid,
  total_juros: simulation.result.totalInterest,
  memoria_calculo: { parameters: simulation.parameters, result: simulation.result },
});

const fromDatabaseRow = (row: FinancialSimulationDatabaseRow): FinancialSimulationRecord => {
  return {
    id: row.id,
    proposalId: row.cadastro_id || null,
    adminUserId: row.administrador_id || null,
    updatedByAdminUserId: row.atualizado_por_administrador_id || null,
    scenarioName: row.nome_cenario,
    parameters: row.memoria_calculo.parameters,
    result: row.memoria_calculo.result,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const getRequestParameters = (body: Record<string, unknown>): {
  scenarioName: string;
  parameters: SimulationParameters;
} | null => {
  const scenarioName = validateScenarioName(body.scenarioName);
  const rawParameters = body.parameters;
  if (
    !scenarioName ||
    !rawParameters ||
    typeof rawParameters !== 'object' ||
    Array.isArray(rawParameters)
  ) {
    return null;
  }
  const raw = rawParameters as Record<string, unknown>;
  const numericFields = [
    'propertyValue',
    'downPayment',
    'fgtsValue',
    'financedAmount',
    'monthlyRatePercent',
    'termMonths',
  ] as const;
  if (numericFields.some((field) => typeof raw[field] !== 'number' || !Number.isFinite(raw[field]))) {
    return null;
  }
  if (!isAmortizationSystem(raw.amortizationSystem)) return null;

  const parameters: SimulationParameters = {
    propertyValue: raw.propertyValue as number,
    downPayment: raw.downPayment as number,
    fgtsValue: raw.fgtsValue as number,
    financedAmount: raw.financedAmount as number,
    monthlyRatePercent: raw.monthlyRatePercent as number,
    termMonths: raw.termMonths as number,
    amortizationSystem: raw.amortizationSystem,
  };
  if (raw.caixaProgram !== undefined) {
    if (!['mcmv-fgts', 'mcmv-procotista', 'sbpe-tr', 'outra'].includes(String(raw.caixaProgram))) {
      return null;
    }
    parameters.caixaProgram = raw.caixaProgram as SimulationParameters['caixaProgram'];
  }
  if (raw.financingQuotaPercent !== undefined) {
    if (
      typeof raw.financingQuotaPercent !== 'number' ||
      !Number.isFinite(raw.financingQuotaPercent) ||
      raw.financingQuotaPercent <= 0 ||
      raw.financingQuotaPercent > 100
    ) {
      return null;
    }
    parameters.financingQuotaPercent = raw.financingQuotaPercent;
  }
  if (raw.maxTermMonths !== undefined) {
    if (
      typeof raw.maxTermMonths !== 'number' ||
      !Number.isSafeInteger(raw.maxTermMonths) ||
      raw.maxTermMonths <= 0
    ) {
      return null;
    }
    parameters.maxTermMonths = raw.maxTermMonths;
  }
  if (raw.rateInputUnit !== undefined) {
    if (
      raw.rateInputUnit !== 'monthly' &&
      raw.rateInputUnit !== 'annual' &&
      raw.rateInputUnit !== 'nominal-annual'
    ) return null;
    parameters.rateInputUnit = raw.rateInputUnit;
  }
  if (raw.annualRatePercent !== undefined) {
    if (typeof raw.annualRatePercent !== 'number' || !Number.isFinite(raw.annualRatePercent) || raw.annualRatePercent < 0) {
      return null;
    }
    parameters.annualRatePercent = raw.annualRatePercent;
  }
  if (raw.nominalAnnualRatePercent !== undefined) {
    if (
      typeof raw.nominalAnnualRatePercent !== 'number' ||
      !Number.isFinite(raw.nominalAnnualRatePercent) ||
      raw.nominalAnnualRatePercent < 0
    ) {
      return null;
    }
    parameters.nominalAnnualRatePercent = raw.nominalAnnualRatePercent;
  }
  if (raw.propertyValueCeiling !== undefined) {
    if (
      typeof raw.propertyValueCeiling !== 'number' ||
      !Number.isFinite(raw.propertyValueCeiling) ||
      raw.propertyValueCeiling <= 0
    ) {
      return null;
    }
    parameters.propertyValueCeiling = raw.propertyValueCeiling;
  }
  if (raw.propertyType !== undefined) {
    if (raw.propertyType !== 'residential' && raw.propertyType !== 'commercial') return null;
    parameters.propertyType = raw.propertyType;
  }
  if (raw.purpose !== undefined) {
    const allowedPurposes = [
      'buy-new',
      'buy-used',
      'buy-land',
      'build',
      'secured-loan',
      'caixa-property',
      'renovate',
      'reforma-casa-brasil',
    ];
    if (typeof raw.purpose !== 'string' || !allowedPurposes.includes(raw.purpose)) return null;
    parameters.purpose = raw.purpose as SimulationParameters['purpose'];
  }
  if (raw.municipality !== undefined) {
    if (typeof raw.municipality !== 'string' || raw.municipality.trim().length > 100) return null;
    parameters.municipality = raw.municipality.trim();
  }
  if (raw.state !== undefined) {
    const allowedStates = [
      'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
      'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
    ];
    if (typeof raw.state !== 'string' || !allowedStates.includes(raw.state)) return null;
    parameters.state = raw.state;
  }
  for (const field of [
    'hasPropertyInSameMunicipality',
    'hasActiveHousingFinance',
    'hasUsedFgtsBefore',
    'receivedSubsidySinceMay2005',
  ] as const) {
    if (raw[field] !== undefined) {
      if (typeof raw[field] !== 'boolean') return null;
      parameters[field] = raw[field];
    }
  }
  return { scenarioName, parameters };
};

const findProposal = async (
  proposalId: string,
  supabase: ReturnType<typeof getAuthenticatedSupabaseClient>
): Promise<{ exists: boolean; error?: string }> => {
  if (!supabase) return { exists: true };
  if (!UUID_PATTERN.test(proposalId)) return { exists: false };

  const { data, error } = await supabase.from('cadastros').select('id').eq('id', proposalId).maybeSingle();
  if (error) return { exists: false, error: error.message };
  return { exists: Boolean(data) };
};

router.get('/propostas/:cadastroId/simulacoes', requireAdminAuth, withUnexpectedError(
  'SIMULATION_LIST_EXCEPTION',
  async (req: Request, res: Response) => {
  const proposalId = req.params.cadastroId;
  const supabase = getSimulationSupabaseClient(req);
  const proposal = await findProposal(proposalId, supabase);
  if (proposal.error) {
    res.status(500).json({ error: 'Não foi possível verificar a proposta.', details: proposal.error });
    return;
  }
  if (!proposal.exists) {
    res.status(404).json({ error: 'Proposta não encontrada para consulta das simulações.' });
    return;
  }

  if (!supabase) {
    res.json({ data: inMemorySimulations.get(proposalId) || [] });
    return;
  }

  const { data, error } = await supabase
    .from('simulacoes_financiamento')
    .select('*')
    .eq('cadastro_id', proposalId)
    .order('created_at', { ascending: false });
  if (error) {
    logServerError('SIMULATION_LIST_ERROR', error);
    res.status(500).json({ error: 'Falha ao consultar o histórico de simulações.', details: error.message });
    return;
  }

  res.json({ data: (data || []).map(fromDatabaseRow) });
  }
));

router.post('/propostas/:cadastroId/simulacoes', requireAdminAuth, withUnexpectedError(
  'SIMULATION_CREATE_EXCEPTION',
  async (req: Request, res: Response) => {
  const proposalId = req.params.cadastroId;
  const supabase = getSimulationSupabaseClient(req);
  const proposal = await findProposal(proposalId, supabase);
  if (proposal.error) {
    res.status(500).json({ error: 'Não foi possível verificar a proposta.', details: proposal.error });
    return;
  }
  if (!proposal.exists) {
    res.status(404).json({ error: 'Proposta não encontrada para salvar a simulação.' });
    return;
  }

  const input = getRequestParameters(req.body || {});
  if (!input) {
    res.status(400).json({ error: 'Informe um nome de cenário e os parâmetros da simulação.' });
    return;
  }

  let simulation: FinancialSimulationRecord;
  try {
    simulation = buildSimulation(
      proposalId,
      input.scenarioName,
      input.parameters,
      req.adminUser?.user_id || null
    );
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Parâmetros financeiros inválidos.' });
    return;
  }

  if (!supabase) {
    const existing = inMemorySimulations.get(proposalId) || [];
    inMemorySimulations.set(proposalId, [simulation, ...existing]);
    logServerAction('FINANCIAL_SIMULATION_CREATED_IN_MEMORY', {
      proposalId,
      adminUserId: req.adminUser?.user_id,
    });
    res.status(201).json({ data: simulation });
    return;
  }

  const { data, error } = await supabase
    .from('simulacoes_financiamento')
    .insert(toDatabaseRow(simulation))
    .select()
    .single();
  if (error) {
    logServerError('SIMULATION_INSERT_ERROR', error);
    res.status(500).json({ error: 'Falha ao salvar a simulação no Supabase.', details: error.message });
    return;
  }

  logServerAction('FINANCIAL_SIMULATION_CREATED', {
    proposalId,
    simulationId: data.id,
    adminUserId: req.adminUser?.user_id,
  });
  res.status(201).json({ data: fromDatabaseRow(data) });
  }
));

router.get('/simulacoes/:id', requireAdminAuth, withUnexpectedError(
  'SIMULATION_GET_EXCEPTION',
  async (req: Request, res: Response) => {
  const supabase = getSimulationSupabaseClient(req);
  if (!supabase) {
    const simulation = [...inMemorySimulations.values()].flat().find((item) => item.id === req.params.id);
    if (!simulation) {
      res.status(404).json({ error: 'Simulação não encontrada.' });
      return;
    }
    res.json({ data: simulation });
    return;
  }

  const { data, error } = await supabase
    .from('simulacoes_financiamento')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();
  if (error) {
    logServerError('SIMULATION_GET_ERROR', error);
    res.status(500).json({ error: 'Falha ao consultar a simulação.', details: error.message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: 'Simulação não encontrada.' });
    return;
  }
  res.json({ data: fromDatabaseRow(data) });
  }
));

router.patch('/simulacoes/:id', requireAdminAuth, withUnexpectedError(
  'SIMULATION_UPDATE_EXCEPTION',
  async (req: Request, res: Response) => {
  const input = getRequestParameters(req.body || {});
  if (!input) {
    res.status(400).json({ error: 'Informe um nome de cenário e os parâmetros da simulação.' });
    return;
  }

  const supabase = getSimulationSupabaseClient(req);
  if (!supabase) {
    const simulations = [...inMemorySimulations.entries()];
    const entry = simulations.find(([, items]) => items.some((item) => item.id === req.params.id));
    const existing = entry?.[1].find((item) => item.id === req.params.id);
    if (!entry || !existing) {
      res.status(404).json({ error: 'Simulação não encontrada.' });
      return;
    }

    try {
      const updated = buildSimulation(
        existing.proposalId,
        input.scenarioName,
        input.parameters,
        req.adminUser?.user_id || null,
        existing
      );
      inMemorySimulations.set(entry[0], entry[1].map((item) => (item.id === updated.id ? updated : item)));
      logServerAction('FINANCIAL_SIMULATION_UPDATED_IN_MEMORY', {
        simulationId: updated.id,
        adminUserId: req.adminUser?.user_id,
      });
      res.json({ data: updated });
      return;
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Parâmetros financeiros inválidos.' });
      return;
    }
  }

  const { data: current, error: lookupError } = await supabase
    .from('simulacoes_financiamento')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();
  if (lookupError) {
    logServerError('SIMULATION_LOOKUP_ERROR', lookupError);
    res.status(500).json({ error: 'Falha ao localizar a simulação.', details: lookupError.message });
    return;
  }
  if (!current) {
    res.status(404).json({ error: 'Simulação não encontrada.' });
    return;
  }

  let updated: FinancialSimulationRecord;
  try {
    updated = buildSimulation(
      current.cadastro_id,
      input.scenarioName,
      input.parameters,
      req.adminUser?.user_id || null,
      fromDatabaseRow(current)
    );
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Parâmetros financeiros inválidos.' });
    return;
  }

  const { data, error } = await supabase
    .from('simulacoes_financiamento')
    .update(toDatabaseRow(updated))
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) {
    logServerError('SIMULATION_UPDATE_ERROR', error);
    res.status(500).json({ error: 'Falha ao atualizar a simulação.', details: error.message });
    return;
  }

  logServerAction('FINANCIAL_SIMULATION_UPDATED', {
    simulationId: data.id,
    adminUserId: req.adminUser?.user_id,
  });
  res.json({ data: fromDatabaseRow(data) });
  }
));

export default router;
