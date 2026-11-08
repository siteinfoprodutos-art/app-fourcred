-- Migration 20261108000001: Create cadastros table
-- Fourcred V2: Public credit registration & proposal storage

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Utility trigger function for updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Table: public.cadastros
CREATE TABLE IF NOT EXISTS public.cadastros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_proposta VARCHAR(20) UNIQUE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Em Análise', 'Aprovado', 'Recusado')),
    
    -- Proponente Principal (P1)
    p1_nome_completo VARCHAR(255) NOT NULL,
    p1_cpf VARCHAR(14) NOT NULL,
    p1_rg VARCHAR(50) NOT NULL,
    p1_data_nascimento DATE NOT NULL,
    p1_estado_civil VARCHAR(30) NOT NULL,
    p1_tem_filhos VARCHAR(5) NOT NULL DEFAULT 'nao',
    p1_quantidade_filhos INT DEFAULT 0,
    p1_email VARCHAR(255) NOT NULL,
    p1_telefone_celular VARCHAR(20) NOT NULL,
    p1_telefone_residencial VARCHAR(20),
    p1_profissao VARCHAR(150) NOT NULL,
    p1_tempo_fgts VARCHAR(100) NOT NULL,
    p1_renda_bruta NUMERIC(15, 2) NOT NULL,
    p1_outras_rendas NUMERIC(15, 2) DEFAULT 0,
    p1_origem_outras_rendas TEXT,
    p1_possui_financiamento VARCHAR(5) DEFAULT 'nao',
    p1_valor_prestacao_financiamento NUMERIC(15, 2) DEFAULT 0,
    p1_possui_emprestimo VARCHAR(5) DEFAULT 'nao',
    p1_valor_prestacao_emprestimo NUMERIC(15, 2) DEFAULT 0,

    -- Co-Proponente / Cônjuge (P2)
    possui_p2 BOOLEAN NOT NULL DEFAULT FALSE,
    p2_relacionamento VARCHAR(50),
    p2_nome_completo VARCHAR(255),
    p2_cpf VARCHAR(14),
    p2_rg VARCHAR(50),
    p2_data_nascimento DATE,
    p2_estado_civil VARCHAR(30),
    p2_email VARCHAR(255),
    p2_telefone_celular VARCHAR(20),
    p2_profissao VARCHAR(150),
    p2_tempo_fgts VARCHAR(100),
    p2_renda_bruta NUMERIC(15, 2) DEFAULT 0,

    -- Análise Patrimonial e Crédito
    ja_usou_fgts VARCHAR(5) NOT NULL DEFAULT 'nao',
    subsidio_fgts VARCHAR(5) NOT NULL DEFAULT 'nao',
    possui_imovel VARCHAR(5) NOT NULL DEFAULT 'nao',
    endereco_imovel_existente TEXT,
    fracao_ideal_imovel NUMERIC(5, 2),
    outros_bens_patrimonio TEXT,

    -- Objeto da Operação Imobiliária
    endereco_imovel_pretendido TEXT NOT NULL,
    vagas_garagem INT NOT NULL DEFAULT 1,
    valor_venda NUMERIC(15, 2) NOT NULL,
    valor_entrada NUMERIC(15, 2) NOT NULL,
    usara_fgts VARCHAR(5) NOT NULL DEFAULT 'nao',
    valor_fgts NUMERIC(15, 2) DEFAULT 0,
    valor_financiamento NUMERIC(15, 2) NOT NULL,
    prazo_anos INT NOT NULL DEFAULT 30,
    sistema_amortizacao VARCHAR(20) NOT NULL DEFAULT 'sac' CHECK (sistema_amortizacao IN ('sac', 'price')),
    termos_aceitos BOOLEAN NOT NULL DEFAULT TRUE,

    -- Backup em formato JSONB
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Timestamps de Auditoria
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments on cadastros
COMMENT ON TABLE public.cadastros IS 'Tabela principal de propostas e fichas cadastrais de crédito imobiliário Fourcred V2.';
COMMENT ON COLUMN public.cadastros.codigo_proposta IS 'Código público e legível da proposta (ex: FC-882194).';
COMMENT ON COLUMN public.cadastros.payload IS 'Cópia íntegra da estrutura submetida pelo formulário web em JSONB.';

-- Trigger to auto update updated_at
DROP TRIGGER IF EXISTS trigger_cadastros_updated_at ON public.cadastros;
CREATE TRIGGER trigger_cadastros_updated_at
    BEFORE UPDATE ON public.cadastros
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
