-- Migration 20261108000004: Row Level Security (RLS) Policies
-- Fourcred V2: Security policies ensuring strict data protection and role enforcement

-- 1. Enable RLS on all tables
ALTER TABLE public.cadastros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.administradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_acessos ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- POLÍTICAS PARA 'cadastros'
-- ==============================================================================

-- Segurança: NUNCA crie política de INSERT para anon.
-- A inserção de cadastros públicos é intermediada e autenticada EXCLUSIVAMENTE
-- pelo backend Node.js utilizando a SUPABASE_SERVICE_ROLE_KEY com validação de entrada e rate limiting.
-- Desta forma, o cliente anônimo não possui permissão direta na API REST pública do Supabase.
DROP POLICY IF EXISTS "Publico pode enviar cadastros" ON public.cadastros;

-- Policy 2: Restrict SELECT to active authenticated administrators only
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

-- Policy 3: Restrict UPDATE to active authenticated administrators only
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

-- Policy 4: Restrict DELETE to active authenticated administrators only
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

-- ==============================================================================
-- POLÍCITAS PARA 'administradores'
-- ==============================================================================

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

-- ==============================================================================
-- POLÍCITAS PARA 'historico_acessos'
-- ==============================================================================

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
