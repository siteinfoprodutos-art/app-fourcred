-- Migration 20261108000003: Create indexes and compatibility view
-- Fourcred V2: Performance indexes and legacy view mapping

-- Performance Indexes for public.cadastros
CREATE INDEX IF NOT EXISTS idx_cadastros_codigo ON public.cadastros(codigo_proposta);
CREATE INDEX IF NOT EXISTS idx_cadastros_cpf ON public.cadastros(p1_cpf);
CREATE INDEX IF NOT EXISTS idx_cadastros_status ON public.cadastros(status);
CREATE INDEX IF NOT EXISTS idx_cadastros_created_at ON public.cadastros(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cadastros_payload ON public.cadastros USING GIN (payload);

-- Performance Indexes for public.administradores
CREATE INDEX IF NOT EXISTS idx_administradores_email ON public.administradores(email);
CREATE INDEX IF NOT EXISTS idx_administradores_user_id ON public.administradores(user_id);

-- Performance Indexes for public.historico_acessos
CREATE INDEX IF NOT EXISTS idx_historico_admin ON public.historico_acessos(administrador_id);
CREATE INDEX IF NOT EXISTS idx_historico_cadastro ON public.historico_acessos(cadastro_id);
CREATE INDEX IF NOT EXISTS idx_historico_created_at ON public.historico_acessos(created_at DESC);

-- View: public.proposals (Compatibility layer)
CREATE OR REPLACE VIEW public.proposals AS
    SELECT 
        id, 
        codigo_proposta, 
        payload, 
        status, 
        created_at 
    FROM public.cadastros;

COMMENT ON VIEW public.proposals IS 'Visão de compatibilidade com versões legadas para leitura transparente de cadastros.';
