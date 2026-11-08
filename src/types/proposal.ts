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
  payload: ProposalPayload;
  status?: ProposalStatus;
  created_at?: string;
}
