-- Migration 20261108000002: Create administradores and historico_acessos tables
-- Fourcred V2: Administrative access management and audit logging

-- Table: public.administradores
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

COMMENT ON TABLE public.administradores IS 'Registro de administradores autorizados para acesso à Mesa de Crédito Fourcred V2.';

-- Trigger for administradores updated_at
DROP TRIGGER IF EXISTS trigger_administradores_updated_at ON public.administradores;
CREATE TRIGGER trigger_administradores_updated_at
    BEFORE UPDATE ON public.administradores
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Table: public.historico_acessos (Audit logs)
CREATE TABLE IF NOT EXISTS public.historico_acessos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    administrador_id UUID REFERENCES public.administradores(id) ON DELETE SET NULL,
    acao VARCHAR(100) NOT NULL, -- Ex: 'NOVO_CADASTRO_RECEBIDO', 'CONSULTA_LISTA_PROPOSTAS', 'EXPORTACAO_RELATORIO_PDF', 'EXPORTACAO_RELATORIO_EXCEL', 'ALTERACAO_STATUS', 'EXCLUSAO_PROPOSTA'
    cadastro_id UUID REFERENCES public.cadastros(id) ON DELETE SET NULL,
    ip VARCHAR(50),
    user_agent TEXT,
    detalhes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.historico_acessos IS 'Trilha inalterável de auditoria de acessos e exportações de dados do sistema.';
