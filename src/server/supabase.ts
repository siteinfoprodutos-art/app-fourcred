import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

const getSupabaseUrl = (): string | undefined => {
  return (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)?.trim();
};

const getSupabaseServiceKey = (): string | undefined => {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_KEY
  )?.trim();
};

export const isSupabaseConfigured = (): boolean => {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceKey();
  return Boolean(url && key);
};

export const getSupabaseClient = (): SupabaseClient | null => {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceKey();

  if (!url || !key) {
    return null;
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseInstance;
};

export const getAuthenticatedSupabaseClient = (userToken: string): SupabaseClient | null => {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceKey();
  if (!url || !key) return null;

  const cleanToken = userToken.startsWith('Bearer ') ? userToken : `Bearer ${userToken}`;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: cleanToken,
      },
    },
  });
};

export const normalizeStatusForDb = (status?: string): string => {
  const s = (status || '').toLowerCase().trim();
  if (s === 'aprovado') return 'aprovado';
  if (s === 'em análise' || s === 'em analise' || s === 'em_analise') return 'em_analise';
  if (s === 'recusado' || s === 'reprovado' || s === 'rejeitado') return 'reprovado';
  if (s === 'cancelado') return 'cancelado';
  return 'novo';
};

export const normalizeStatusForApp = (status?: string): string => {
  const s = (status || '').toLowerCase().trim();
  if (s === 'aprovado') return 'Aprovado';
  if (s === 'em análise' || s === 'em analise' || s === 'em_analise') return 'Em Análise';
  if (s === 'recusado' || s === 'reprovado' || s === 'rejeitado') return 'Recusado';
  if (s === 'cancelado') return 'Recusado';
  return 'Pendente';
};

// Map frontend proposal payload to Supabase 'cadastros' table columns
// Dynamically supports both standard relational columns and compact/jsonb schemas
export const mapPayloadToCadastroRow = (id: string, payload: any, status: string = 'Pendente') => {
  const p1 = payload.p1 || {};
  const p2 = payload.p2 || {};

  const cleanPayload = {
    ...payload,
    codigo_proposta: id,
    submittedAt: payload.submittedAt || new Date().toISOString(),
  };

  const dbStatus = normalizeStatusForDb(status);

  return {
    codigo_proposta: id,
    status: status || 'Pendente',
    
    // Core summary fields (matching any simplified columns)
    nome: p1.fullName || '',
    email: p1.email || '',
    telefone: p1.phoneMobile || '',
    origem: 'site',
    dados_formulario: cleanPayload,

    // P1 Relational Columns
    p1_nome_completo: p1.fullName || '',
    p1_cpf: p1.cpf || '',
    p1_rg: p1.rg || '',
    p1_data_nascimento: p1.dob || '1990-01-01',
    p1_estado_civil: p1.maritalStatus || 'casado',
    p1_tem_filhos: p1.hasChildren || 'nao',
    p1_quantidade_filhos: p1.childrenCount ? parseInt(p1.childrenCount, 10) : 0,
    p1_email: p1.email || '',
    p1_telefone_celular: p1.phoneMobile || '',
    p1_telefone_residencial: p1.phoneHome || null,
    p1_profissao: p1.profession || '',
    p1_tempo_fgts: p1.serviceTime || '',
    p1_renda_bruta: Number(p1.salary) || 0,
    p1_outras_rendas: Number(p1.otherIncomes) || 0,
    p1_origem_outras_rendas: p1.otherIncomesOrigin || null,
    p1_possui_financiamento: p1.hasFinancing || 'nao',
    p1_valor_prestacao_financiamento: Number(p1.financingInstallment) || 0,
    p1_possui_emprestimo: p1.hasLoan || 'nao',
    p1_valor_prestacao_emprestimo: Number(p1.loanInstallment) || 0,

    // P2 Relational Columns
    possui_p2: Boolean(payload.hasP2),
    p2_relacionamento: payload.p2Relationship || null,
    p2_nome_completo: p2.fullName || null,
    p2_cpf: p2.cpf || null,
    p2_rg: p2.rg || null,
    p2_data_nascimento: p2.dob || null,
    p2_estado_civil: p2.maritalStatus || null,
    p2_email: p2.email || null,
    p2_telefone_celular: p2.phoneMobile || null,
    p2_profissao: p2.profession || null,
    p2_tempo_fgts: p2.serviceTime || null,
    p2_renda_bruta: Number(p2.salary) || 0,

    // Análise de Crédito
    ja_usou_fgts: payload.usedFgts || 'nao',
    subsidio_fgts: payload.fgtsSubsidy || 'nao',
    possui_imovel: payload.ownsProperty || 'nao',
    endereco_imovel_existente: payload.propertyAddress || null,
    fracao_ideal_imovel: payload.propertyFraction ? Number(payload.propertyFraction) : null,
    outros_bens_patrimonio: payload.otherAssets || null,

    // Objeto e Operação
    endereco_imovel_pretendido: payload.targetPropertyAddress || '',
    vagas_garagem: payload.parkingSpaces ? parseInt(payload.parkingSpaces, 10) : 1,
    valor_venda: Number(payload.saleValue) || 0,
    valor_entrada: Number(payload.downPayment) || 0,
    usara_fgts: payload.useFgts === 'sim' || payload.useFgts === true ? 'sim' : 'nao',
    valor_fgts: Number(payload.fgtsValue) || 0,
    valor_financiamento: Number(payload.financingValue) || 0,
    prazo_anos: payload.termYears ? parseInt(payload.termYears, 10) : 30,
    sistema_amortizacao: (payload.amortizationSystem || 'sac').toLowerCase(),
    termos_aceitos: Boolean(payload.acceptedTerms),

    // Full JSON payload
    payload: cleanPayload,
  };
};

// Map row back to standard proposal record format
export const mapRowToProposalRecord = (row: any) => {
  const payloadData =
    (row.dados_formulario && Object.keys(row.dados_formulario).length > 0
      ? row.dados_formulario
      : row.payload && Object.keys(row.payload).length > 0
      ? row.payload
      : null) || {};

  return {
    id: row.codigo_proposta || payloadData.codigo_proposta || row.id,
    db_id: row.id,
    status: row.status || 'Pendente',
    created_at: row.created_at,
    payload: Object.keys(payloadData).length > 0
      ? payloadData
      : {
          p1: {
            fullName: row.p1_nome_completo || row.nome,
            cpf: row.p1_cpf || '',
            rg: row.p1_rg || '',
            dob: row.p1_data_nascimento || '1990-01-01',
            maritalStatus: row.p1_estado_civil || 'solteiro',
            hasChildren: row.p1_tem_filhos || 'nao',
            childrenCount: row.p1_quantidade_filhos || 0,
            email: row.p1_email || row.email,
            phoneMobile: row.p1_telefone_celular || row.telefone,
            phoneHome: row.p1_telefone_residencial,
            profession: row.p1_profissao || '',
            serviceTime: row.p1_tempo_fgts || '',
            salary: row.p1_renda_bruta || 0,
            otherIncomes: row.p1_outras_rendas || 0,
            otherIncomesOrigin: row.p1_origem_outras_rendas,
            hasFinancing: row.p1_possui_financiamento || 'nao',
            financingInstallment: row.p1_valor_prestacao_financiamento || 0,
            hasLoan: row.p1_possui_emprestimo || 'nao',
            loanInstallment: row.p1_valor_prestacao_emprestimo || 0,
          },
          hasP2: row.possui_p2 || false,
          p2Relationship: row.p2_relacionamento,
          p2: row.possui_p2
            ? {
                fullName: row.p2_nome_completo,
                cpf: row.p2_cpf,
                rg: row.p2_rg,
                dob: row.p2_data_nascimento,
                maritalStatus: row.p2_estado_civil,
                email: row.p2_email,
                phoneMobile: row.p2_telefone_celular,
                profession: row.p2_profissao,
                serviceTime: row.p2_tempo_fgts,
                salary: row.p2_renda_bruta,
              }
            : undefined,
          usedFgts: row.ja_usou_fgts || 'nao',
          fgtsSubsidy: row.subsidio_fgts || 'nao',
          ownsProperty: row.possui_imovel || 'nao',
          propertyAddress: row.endereco_imovel_existente,
          propertyFraction: row.fracao_ideal_imovel,
          otherAssets: row.outros_bens_patrimonio,
          targetPropertyAddress: row.endereco_imovel_pretendido || '',
          parkingSpaces: row.vagas_garagem || 1,
          saleValue: row.valor_venda || 0,
          downPayment: row.valor_entrada || 0,
          useFgts: row.usara_fgts || 'nao',
          fgtsValue: row.valor_fgts || 0,
          financingValue: row.valor_financiamento || 0,
          termYears: row.prazo_anos || 30,
          amortizationSystem: row.sistema_amortizacao || 'sac',
          acceptedTerms: row.termos_aceitos !== undefined ? row.termos_aceitos : true,
          submittedAt: row.created_at,
        },
  };
};
