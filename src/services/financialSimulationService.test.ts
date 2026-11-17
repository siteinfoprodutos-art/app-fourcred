import assert from 'node:assert/strict';
import { createServer, Server } from 'node:http';
import { once } from 'node:events';
import express from 'express';
import test from 'node:test';
import {
  calculateFinancialSimulation,
  classifyUrbanMcmvIncome,
  effectiveMonthlyRateFromAnnualPercent,
  formatFgtsServiceTime,
  getProposalFinancialIndicators,
  parseFgtsServiceTimeMonths,
} from './financialSimulationService.ts';
import simulationRoutes from '../server/routes/simulationRoutes.ts';
import { ProposalPayload, SimulationParameters } from '../types/proposal.ts';

const parameters: SimulationParameters = {
  propertyValue: 150000,
  downPayment: 30000,
  fgtsValue: 10000,
  financedAmount: 110000,
  monthlyRatePercent: 1,
  termMonths: 12,
  amortizationSystem: 'sac',
};

const restoreEnvironment = (original: Record<string, string | undefined>) => {
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
};

const startSimulationServer = async (): Promise<{ server: Server; baseUrl: string }> => {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', simulationRoutes);
  const server = createServer(app);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert(address && typeof address !== 'string');
  return { server, baseUrl: `http://127.0.0.1:${address.port}/api/admin` };
};

const stopServer = async (server: Server) => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
};

test('PRICE uses the PMT formula and produces an amortization schedule', () => {
  const result = calculateFinancialSimulation({ ...parameters, amortizationSystem: 'price' });
  const rate = parameters.monthlyRatePercent / 100;
  const expectedPayment =
    (parameters.financedAmount * rate) / (1 - (1 + rate) ** -parameters.termMonths);

  assert.equal(result.installments.length, parameters.termMonths);
  assert.equal(result.firstInstallment, Math.round(expectedPayment * 100) / 100);
  assert.equal(result.installments.at(-1)?.outstandingBalance, 0);
  assert.ok(result.totalInterest > 0);
  assert.equal(result.installments[0].installmentNumber, 1);
});

test('SAC has constant amortization and a declining payment', () => {
  const result = calculateFinancialSimulation(parameters);

  assert.equal(result.installments.length, parameters.termMonths);
  assert.equal(result.firstInstallment, 10266.67);
  assert.equal(result.lastInstallment, 9258.33);
  assert.ok(result.lastInstallment < result.firstInstallment);
  assert.equal(result.installments.at(-1)?.outstandingBalance, 0);
  assert.ok(
    Math.abs(
      result.installments.reduce((sum, installment) => sum + installment.amortization, 0) -
        parameters.financedAmount
    ) < 1
  );
});

test('SAC starts above PRICE and ends below PRICE when interest is positive', () => {
  const sac = calculateFinancialSimulation({ ...parameters, amortizationSystem: 'sac' });
  const price = calculateFinancialSimulation({ ...parameters, amortizationSystem: 'price' });

  assert.ok(sac.firstInstallment > price.firstInstallment);
  assert.ok(sac.lastInstallment < price.lastInstallment);
  assert.ok(sac.installments[0].payment > sac.installments.at(-1)!.payment);
  assert.equal(price.firstInstallment, price.lastInstallment);
});

test('effective annual rate converts to an equivalent monthly rate', () => {
  const monthlyRate = effectiveMonthlyRateFromAnnualPercent(7.93);

  assert.ok(monthlyRate > 0.63 && monthlyRate < 0.64);
});

test('zero interest is handled without division by zero', () => {
  const result = calculateFinancialSimulation({
    ...parameters,
    monthlyRatePercent: 0,
    amortizationSystem: 'price',
  });

  assert.equal(result.totalInterest, 0);
  assert.equal(result.totalPaid, parameters.financedAmount);
  assert.equal(result.installments.at(-1)?.outstandingBalance, 0);
});

test('invalid term and financed amount are rejected', () => {
  assert.throws(
    () => calculateFinancialSimulation({ ...parameters, termMonths: 0 }),
    /prazo deve ser/
  );
  assert.throws(
    () => calculateFinancialSimulation({ ...parameters, financedAmount: 0 }),
    /financiado deve ser positivo/
  );
});

test('family income and commitments include the titular and coproponent', () => {
  const proposal = {
    p1: {
      salary: 5000,
      otherIncomes: 1000,
      hasFinancing: 'sim',
      financingInstallment: 500,
      hasLoan: 'sim',
      loanInstallment: 200,
    },
    hasP2: true,
    p2: {
      salary: 4000,
      otherIncomes: 500,
      hasFinancing: 'sim',
      financingInstallment: 300,
      hasLoan: 'sim',
      loanInstallment: 100,
    },
    saleValue: 200000,
    downPayment: 40000,
    financingValue: 150000,
  } as ProposalPayload;

  assert.deepEqual(getProposalFinancialIndicators(proposal), {
    familyGrossIncome: 10500,
    declaredMonthlyCommitments: 1100,
    incomeAfterDeclaredCommitments: 9400,
    incomeCommitmentPercent: 10.48,
    downPaymentPercent: 20,
    financingPercent: 75,
  });
});

test('urban MCMV income classification uses the published monthly income bands', () => {
  assert.equal(classifyUrbanMcmvIncome(3200)?.label, 'Faixa 1');
  assert.equal(classifyUrbanMcmvIncome(3200.01)?.label, 'Faixa 2');
  assert.equal(classifyUrbanMcmvIncome(5000)?.label, 'Faixa 2');
  assert.equal(classifyUrbanMcmvIncome(5000.01)?.label, 'Faixa 3');
  assert.equal(classifyUrbanMcmvIncome(9600)?.label, 'Faixa 3');
  assert.equal(classifyUrbanMcmvIncome(9600.01)?.label, 'MCMV Classe Média');
  assert.equal(classifyUrbanMcmvIncome(13000)?.withinUrbanIncomeLimit, true);
  assert.equal(classifyUrbanMcmvIncome(13000.01)?.withinUrbanIncomeLimit, false);
  assert.equal(classifyUrbanMcmvIncome(0), null);
});

test('FGTS employment periods parse and sum for a co-proponent household', () => {
  const primaryMonths = parseFgtsServiceTimeMonths('3 anos e meio');
  const coProposerMonths = parseFgtsServiceTimeMonths('48 meses');

  assert.equal(primaryMonths, 42);
  assert.equal(coProposerMonths, 48);
  if (primaryMonths === null || coProposerMonths === null) {
    assert.fail('Expected both FGTS periods to parse');
  }
  assert.equal(formatFgtsServiceTime(primaryMonths + coProposerMonths), '7 anos e 6 meses');
  assert.equal(parseFgtsServiceTimeMonths('1 ano e 1 mês'), 13);
  assert.equal(parseFgtsServiceTimeMonths(''), null);
  assert.equal(parseFgtsServiceTimeMonths('tempo informado'), null);
});

test('multiple simulation scenarios persist independently for one proposal', async () => {
  const keys = [
    'SUPABASE_URL',
    'VITE_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SERVICE_KEY',
    'SUPABASE_KEY',
  ];
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  const { server, baseUrl } = await startSimulationServer();
  const proposalId = `FC-TEST-${Date.now()}`;

  try {
    let sacSimulationId = '';
    for (const amortizationSystem of ['sac', 'price'] as const) {
      const response = await fetch(`${baseUrl}/propostas/${proposalId}/simulacoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioName: `${amortizationSystem.toUpperCase()} test`,
          parameters: {
            ...parameters,
            amortizationSystem,
            caixaProgram: 'mcmv-fgts',
            financingQuotaPercent: 80,
            maxTermMonths: 420,
            rateInputUnit: 'annual',
            annualRatePercent: 7.93,
            propertyValueCeiling: 600000,
            propertyType: 'residential',
            purpose: 'buy-used',
            municipality: 'Campinas',
            state: 'SP',
            hasPropertyInSameMunicipality: false,
            hasActiveHousingFinance: false,
            hasUsedFgtsBefore: true,
            receivedSubsidySinceMay2005: false,
          },
        }),
      });
      assert.equal(response.status, 201);
      const body = (await response.json()) as { data: { id: string } };
      if (amortizationSystem === 'sac') sacSimulationId = body.data.id;
    }

    const detailResponse = await fetch(`${baseUrl}/simulacoes/${sacSimulationId}`);
    assert.equal(detailResponse.status, 200);

    const updateResponse = await fetch(`${baseUrl}/simulacoes/${sacSimulationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenarioName: 'SAC atualizado',
        parameters: {
          ...parameters,
          monthlyRatePercent: 0.75,
          caixaProgram: 'mcmv-fgts',
          financingQuotaPercent: 80,
          maxTermMonths: 420,
          rateInputUnit: 'annual',
          annualRatePercent: 7.93,
          propertyValueCeiling: 600000,
          propertyType: 'residential',
          purpose: 'buy-used',
          municipality: 'Campinas',
          state: 'SP',
          hasPropertyInSameMunicipality: false,
          hasActiveHousingFinance: false,
          hasUsedFgtsBefore: true,
          receivedSubsidySinceMay2005: false,
        },
      }),
    });
    assert.equal(updateResponse.status, 200);

    const response = await fetch(`${baseUrl}/propostas/${proposalId}/simulacoes`);
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      data: Array<{ id: string; scenarioName: string; parameters: SimulationParameters }>;
    };
    assert.equal(body.data.length, 2);
    const updatedScenario = body.data.find((scenario) => scenario.id === sacSimulationId);
    assert.equal(updatedScenario?.scenarioName, 'SAC atualizado');
    assert.equal(updatedScenario?.parameters.monthlyRatePercent, 0.75);
    assert.equal(updatedScenario?.parameters.caixaProgram, 'mcmv-fgts');
    assert.equal(updatedScenario?.parameters.financingQuotaPercent, 80);
    assert.equal(updatedScenario?.parameters.annualRatePercent, 7.93);
    assert.equal(updatedScenario?.parameters.propertyValueCeiling, 600000);
    assert.equal(updatedScenario?.parameters.propertyType, 'residential');
    assert.equal(updatedScenario?.parameters.purpose, 'buy-used');
    assert.equal(updatedScenario?.parameters.municipality, 'Campinas');
    assert.equal(updatedScenario?.parameters.state, 'SP');
    assert.equal(updatedScenario?.parameters.hasPropertyInSameMunicipality, false);
    assert.equal(updatedScenario?.parameters.hasActiveHousingFinance, false);
    assert.equal(updatedScenario?.parameters.hasUsedFgtsBefore, true);
    assert.equal(updatedScenario?.parameters.receivedSubsidySinceMay2005, false);
    assert.deepEqual(
      new Set(body.data.map((scenario) => scenario.parameters.amortizationSystem)),
      new Set(['sac', 'price'])
    );
  } finally {
    await stopServer(server);
    restoreEnvironment(original);
  }
});

test('simulation endpoints reject requests without administrative authentication in configured mode', async () => {
  const keys = [
    'SUPABASE_URL',
    'VITE_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SERVICE_KEY',
    'SUPABASE_KEY',
  ];
  const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.SUPABASE_URL = 'https://auth-required.example.invalid';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-key';
  delete process.env.SUPABASE_SERVICE_KEY;
  delete process.env.SUPABASE_KEY;
  const { server, baseUrl } = await startSimulationServer();

  try {
    const response = await fetch(`${baseUrl}/propostas/00000000-0000-4000-8000-000000000001/simulacoes`);
    assert.equal(response.status, 401);
  } finally {
    await stopServer(server);
    restoreEnvironment(original);
  }
});
