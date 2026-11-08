-- ==============================================================================
-- FOURCRED V2 - SCHEMA COMPLETO SUPABASE POSTGRESQL & POLÍTICAS RLS
-- ==============================================================================
-- Este script cria a estrutura relacional de banco de dados para a Fourcred V2,
-- contemplando tabelas de cadastros, administradores autorizados e auditoria de acessos.
--
-- INSTRUÇÕES DE EXECUÇÃO:
-- 1. Acesse o painel do Supabase: https://supabase.com/dashboard
-- 2. Selecione o seu projeto e vá em "SQL Editor".
-- 3. Cole este script completo e clique em "Run".
-- ==============================================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- TABELA 1: cadastros (Inscrições e Fichas de Financiamento Imobiliário)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.cadastros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_proposta VARCHAR(20) UNIQUE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Em Análise', 'Aprovado', 'Recusado')),
    
    -- Titular Principal (P1)
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

    -- Análise de Crédito e Patrimônio
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

    -- Cópia integral do payload JSON para compatibilidade e flexibilidade
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- TABELA 2: administradores (Usuários autorizados para a Mesa de Gestão)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.administradores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    cargo VARCHAR(100) NOT NULL DEFAULT 'Admin Gestor',
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- TABELA 3: historico_acessos (Auditoria de Acessos e Operações)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.historico_acessos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    administrador_id UUID REFERENCES public.administradores(id) ON DELETE SET NULL,
    acao VARCHAR(100) NOT NULL, -- Ex: 'CONSULTA_LISTA', 'EXPORTACAO_PDF', 'ALTERACAO_STATUS', 'EXCLUSAO_PROPOSTA'
    cadastro_id UUID REFERENCES public.cadastros(id) ON DELETE SET NULL,
    ip VARCHAR(50),
    user_agent TEXT,
    detalhes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- VIEW / ALIAS DE COMPATIBILIDADE: proposals (Compatibilidade retroativa)
-- ==============================================================================
-- Caso sistemas legados chamem 'proposals', fornecemos suporte transparente:
CREATE OR REPLACE VIEW public.proposals AS
    SELECT 
        id, 
        codigo_proposta, 
        payload, 
        status, 
        created_at 
    FROM public.cadastros;

-- ==============================================================================
-- ÍNDICES DE PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_cadastros_codigo ON public.cadastros(codigo_proposta);
CREATE INDEX IF NOT EXISTS idx_cadastros_cpf ON public.cadastros(p1_cpf);
CREATE INDEX IF NOT EXISTS idx_cadastros_status ON public.cadastros(status);
CREATE INDEX IF NOT EXISTS idx_cadastros_created_at ON public.cadastros(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cadastros_payload ON public.cadastros USING GIN (payload);

CREATE INDEX IF NOT EXISTS idx_administradores_email ON public.administradores(email);
CREATE INDEX IF NOT EXISTS idx_administradores_user_id ON public.administradores(user_id);

CREATE INDEX IF NOT EXISTS idx_historico_admin ON public.historico_acessos(administrador_id);
CREATE INDEX IF NOT EXISTS idx_historico_cadastro ON public.historico_acessos(cadastro_id);
CREATE INDEX IF NOT EXISTS idx_historico_created_at ON public.historico_acessos(created_at DESC);

-- ==============================================================================
-- TRIGGER PARA ATUALIZAÇÃO AUTOMÁTICA DE updated_at
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cadastros_updated_at ON public.cadastros;
CREATE TRIGGER trigger_cadastros_updated_at
    BEFORE UPDATE ON public.cadastros
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_administradores_updated_at ON public.administradores;
CREATE TRIGGER trigger_administradores_updated_at
    BEFORE UPDATE ON public.administradores
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- POLÍTICAS DE SEGURANÇA ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- 1. Habilitar RLS em todas as tabelas
ALTER TABLE public.cadastros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.administradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_acessos ENABLE ROW LEVEL SECURITY;

-- 2. Políticas para 'cadastros'
-- Regra A: O público anônimo pode ENVIAR propostas (INSERT), mas NUNCA consultar, listar, alterar ou excluir
DROP POLICY IF EXISTS "Publico pode enviar cadastros" ON public.cadastros;
CREATE POLICY "Publico pode enviar cadastros"
    ON public.cadastros
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Regra B: Apenas administradores autorizados ativos podem CONSULTAR (SELECT) cadastros
DROP POLICY IF EXISTS "Administradores autorizados podem consultar cadastros" ON public.cadastros;
CREATE POLICY "Administradores autorizados podem consultar cadastros"
    ON public.cadastros
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.administradores
            WHERE public.administradores.user_id = auth.uid()
            AND public.administradores.ativo = true
        )
    );

-- Regra C: Apenas administradores autorizados podem ATUALIZAR (UPDATE) cadastros
DROP POLICY IF EXISTS "Administradores autorizados podem atualizar cadastros" ON public.cadastros;
CREATE POLICY "Administradores autorizados podem atualizar cadastros"
    ON public.cadastros
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.administradores
            WHERE public.administradores.user_id = auth.uid()
            AND public.administradores.ativo = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.administradores
            WHERE public.administradores.user_id = auth.uid()
            AND public.administradores.ativo = true
        )
    );

-- Regra D: Apenas administradores autorizados podem EXCLUIR (DELETE) cadastros
DROP POLICY IF EXISTS "Administradores autorizados podem excluir cadastros" ON public.cadastros;
CREATE POLICY "Administradores autorizados podem excluir cadastros"
    ON public.cadastros
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.administradores
            WHERE public.administradores.user_id = auth.uid()
            AND public.administradores.ativo = true
        )
    );

-- 3. Políticas para 'administradores'
DROP POLICY IF EXISTS "Administradores podem consultar equipe" ON public.administradores;
CREATE POLICY "Administradores podem consultar equipe"
    ON public.administradores
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.administradores a
            WHERE a.user_id = auth.uid()
            AND a.ativo = true
        )
    );

-- 4. Políticas para 'historico_acessos'
DROP POLICY IF EXISTS "Administradores podem consultar logs" ON public.historico_acessos;
CREATE POLICY "Administradores podem consultar logs"
    ON public.historico_acessos
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.administradores a
            WHERE a.user_id = auth.uid()
            AND a.ativo = true
        )
    );

DROP POLICY IF EXISTS "Administradores podem registrar logs" ON public.historico_acessos;
CREATE POLICY "Administradores podem registrar logs"
    ON public.historico_acessos
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.administradores a
            WHERE a.user_id = auth.uid()
            AND a.ativo = true
        )
    );

-- ==============================================================================
-- DADOS INICIAIS DE DEMONSTRAÇÃO (SEED) PARA TESTES NO SUPABASE
-- ==============================================================================
INSERT INTO public.cadastros (
    codigo_proposta,
    status,
    p1_nome_completo,
    p1_cpf,
    p1_rg,
    p1_data_nascimento,
    p1_estado_civil,
    p1_tem_filhos,
    p1_quantidade_filhos,
    p1_email,
    p1_telefone_celular,
    p1_telefone_residencial,
    p1_profissao,
    p1_tempo_fgts,
    p1_renda_bruta,
    p1_outras_rendas,
    p1_origem_outras_rendas,
    possui_p2,
    p2_relacionamento,
    p2_nome_completo,
    p2_cpf,
    p2_rg,
    p2_data_nascimento,
    p2_estado_civil,
    p2_email,
    p2_telefone_celular,
    p2_profissao,
    p2_tempo_fgts,
    p2_renda_bruta,
    ja_usou_fgts,
    subsidio_fgts,
    possui_imovel,
    outros_bens_patrimonio,
    endereco_imovel_pretendido,
    vagas_garagem,
    valor_venda,
    valor_entrada,
    usara_fgts,
    valor_fgts,
    valor_financiamento,
    prazo_anos,
    sistema_amortizacao,
    termos_aceitos,
    payload
) VALUES (
    'FC-882194',
    'Em Análise',
    'Ricardo Mendes Santos',
    '123.456.789-00',
    '12.345.678-x SSP/SP',
    '1985-05-15',
    'casado',
    'sim',
    2,
    'ricardo.mendes@email.com',
    '(11) 98765-4321',
    '(11) 3214-5678',
    'Engenheiro Civil',
    '48 meses',
    12500.00,
    1200.00,
    'Aluguéis de imóvel comercial',
    true,
    'Cônjuge',
    'Ana Paula Oliveira Mendes',
    '098.765.432-11',
    '23.456.789-y SSP/SP',
    '1988-08-22',
    'casado',
    'ana.paula@email.com',
    '(11) 91234-5678',
    'Arquiteta Urbanista',
    '36 meses',
    8000.00,
    'sim',
    'nao',
    'nao',
    'Poupança e CDB liquidez diária R$ 95.000',
    'Av. Paulista, 1200 - Apto 142, Jardim Paulista, São Paulo - SP',
    2,
    890000.00,
    390000.00,
    'sim',
    45000.00,
    500000.00,
    35,
    'sac',
    true,
    '{"p1": {"fullName": "Ricardo Mendes Santos", "cpf": "123.456.789-00", "salary": 12500}, "saleValue": 890000, "financingValue": 500000}'::jsonb
) ON CONFLICT (codigo_proposta) DO NOTHING;
