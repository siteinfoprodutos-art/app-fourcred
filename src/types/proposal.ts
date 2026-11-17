export interface ProposerData {
  fullName: string;
  cpf: string;
  rg: string;
  dob: string;
  maritalStatus: 'solteiro' | 'casado' | 'uniao_estavel' | 'divorciado' | 'viuvo' | string;
  hasChildren: 'sim' | 'nao' | string;
  childrenCount?: number | string;
  email: string;
  phoneMobile: string;
  phoneHome?: string;
  profession: string;
  serviceTime: string;
  salary: number | string;
  otherIncomes?: number | string;
  otherIncomesOrigin?: string;
  hasFinancing?: 'sim' | 'nao' | string;
  financingInstallment?: number | string;
  hasLoan?: 'sim' | 'nao' | string;
  loanInstallment?: number | string;
}

export interface CoProposerData {
  fullName: string;
  cpf: string;
  rg: string;
  dob: string;
  maritalStatus: 'solteiro' | 'casado' | 'uniao_estavel' | 'divorciado' | 'viuvo' | string;
  email: string;
  phoneMobile: string;
  profession: string;
  serviceTime: string;
  salary: number | string;
  otherIncomes?: number | string;
  hasFinancing?: 'sim' | 'nao' | string;
  financingInstallment?: number | string;
  hasLoan?: 'sim' | 'nao' | string;
  loanInstallment?: number | string;
}

export interface ProposalPayload {
  p1: ProposerData;
  hasP2: boolean;
  p2Relationship?: 'Cônjuge' | 'União Estável' | 'Outro' | string;
  p2?: CoProposerData;
  usedFgts: 'sim' | 'nao' | string;
  fgtsSubsidy: 'sim' | 'nao' | string;
  ownsProperty: 'sim' | 'nao' | string;
  propertyAddress?: string;
  propertyFraction?: number | string;
  otherAssets?: string;
  targetPropertyAddress: string;
  parkingSpaces: number | string;
  saleValue: number | string;
  downPayment: number | string;
  useFgts?: 'sim' | 'nao' | boolean;
  fgtsValue?: number | string;
  financingValue: number | string;
  termYears: number | string;
  amortizationSystem: 'sac' | 'price' | string;
  acceptedTerms: boolean;
  submittedAt?: string;
}

export type ProposalStatus = 'Pendente' | 'Em Análise' | 'Aprovado' | 'Recusado';

export interface ProposalRecord {
  id: string;
  db_id?: string;
  payload: ProposalPayload;
  status?: ProposalStatus;
  created_at?: string;
}

export type AmortizationSystem = 'sac' | 'price';

export interface SimulationParameters {
  propertyValue: number;
  downPayment: number;
  fgtsValue: number;
  financedAmount: number;
  monthlyRatePercent: number;
  termMonths: number;
  amortizationSystem: AmortizationSystem;
  caixaProgram?: 'mcmv-fgts' | 'mcmv-procotista' | 'sbpe-tr' | 'outra';
  financingQuotaPercent?: number;
  maxTermMonths?: number;
  rateInputUnit?: 'monthly' | 'annual';
  annualRatePercent?: number;
}

export interface SimulationInstallment {
  installmentNumber: number;
  payment: number;
  amortization: number;
  interest: number;
  outstandingBalance: number;
}

export interface SimulationResult {
  firstInstallment: number;
  lastInstallment: number;
  totalPaid: number;
  totalInterest: number;
  installments: SimulationInstallment[];
}

export interface FinancialSimulationRecord {
  id: string;
  proposalId: string | null;
  adminUserId: string | null;
  updatedByAdminUserId?: string | null;
  scenarioName: string;
  parameters: SimulationParameters;
  result: SimulationResult;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialSimulationDatabaseRow {
  id: string;
  cadastro_id: string | null;
  administrador_id: string | null;
  atualizado_por_administrador_id: string | null;
  nome_cenario: string;
  valor_imovel: number | string;
  valor_entrada: number | string;
  valor_fgts: number | string;
  valor_financiado: number | string;
  taxa_mensal: number | string;
  prazo_meses: number;
  sistema_amortizacao: AmortizationSystem;
  primeira_prestacao: number | string;
  ultima_prestacao: number | string;
  total_pago: number | string;
  total_juros: number | string;
  memoria_calculo: {
    parameters: SimulationParameters;
    result: SimulationResult;
  };
  created_at: string;
  updated_at: string;
}
