CREATE TABLE IF NOT EXISTS public.simulacoes_financiamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cadastro_id UUID REFERENCES public.cadastros(id) ON DELETE SET NULL,
    administrador_id UUID REFERENCES public.administradores(user_id) ON DELETE SET NULL,
    atualizado_por_administrador_id UUID REFERENCES public.administradores(user_id) ON DELETE SET NULL,
    nome_cenario VARCHAR(100) NOT NULL,
    valor_imovel NUMERIC(15, 2) NOT NULL CHECK (valor_imovel > 0),
    valor_entrada NUMERIC(15, 2) NOT NULL CHECK (valor_entrada >= 0),
    valor_fgts NUMERIC(15, 2) NOT NULL CHECK (valor_fgts >= 0),
    valor_financiado NUMERIC(15, 2) NOT NULL CHECK (valor_financiado > 0),
    taxa_mensal NUMERIC(12, 8) NOT NULL CHECK (taxa_mensal >= 0),
    prazo_meses INTEGER NOT NULL CHECK (prazo_meses > 0),
    sistema_amortizacao VARCHAR(10) NOT NULL CHECK (sistema_amortizacao IN ('sac', 'price')),
    primeira_prestacao NUMERIC(15, 2) NOT NULL,
    ultima_prestacao NUMERIC(15, 2) NOT NULL,
    total_pago NUMERIC(17, 2) NOT NULL,
    total_juros NUMERIC(17, 2) NOT NULL,
    memoria_calculo JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_simulacoes_cadastro_created
    ON public.simulacoes_financiamento(cadastro_id, created_at DESC);

DROP TRIGGER IF EXISTS trigger_simulacoes_updated_at ON public.simulacoes_financiamento;
CREATE TRIGGER trigger_simulacoes_updated_at
    BEFORE UPDATE ON public.simulacoes_financiamento
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.current_active_fourcred_admin_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT user_id
    FROM public.administradores
    WHERE user_id = auth.uid()
      AND ativo = true
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_active_fourcred_admin_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_active_fourcred_admin_id() TO authenticated;

ALTER TABLE public.simulacoes_financiamento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Administradores ativos podem consultar simulacoes"
    ON public.simulacoes_financiamento;
CREATE POLICY "Administradores ativos podem consultar simulacoes"
    ON public.simulacoes_financiamento
    FOR SELECT
    TO authenticated
    USING (public.current_active_fourcred_admin_id() IS NOT NULL);

DROP POLICY IF EXISTS "Administradores ativos podem criar simulacoes"
    ON public.simulacoes_financiamento;
CREATE POLICY "Administradores ativos podem criar simulacoes"
    ON public.simulacoes_financiamento
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.current_active_fourcred_admin_id() IS NOT NULL
        AND administrador_id = public.current_active_fourcred_admin_id()
    );

DROP POLICY IF EXISTS "Administradores ativos podem atualizar simulacoes"
    ON public.simulacoes_financiamento;
CREATE POLICY "Administradores ativos podem atualizar simulacoes"
    ON public.simulacoes_financiamento
    FOR UPDATE
    TO authenticated
    USING (public.current_active_fourcred_admin_id() IS NOT NULL)
    WITH CHECK (
        public.current_active_fourcred_admin_id() IS NOT NULL
        AND atualizado_por_administrador_id = public.current_active_fourcred_admin_id()
    );
