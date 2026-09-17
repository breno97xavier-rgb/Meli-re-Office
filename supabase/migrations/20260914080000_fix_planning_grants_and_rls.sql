-- ==============================================================================
-- Migration: 20260914080000_fix_planning_grants_and_rls.sql
-- Description: Concessão Explícita de GRANTs e Hardening de RLS para Tabelas de Planejamento
-- Phase: F5.3B-H1
-- Status: PREPARADA PARA REVISÃO E EXECUÇÃO NO SUPABASE ATIVO
-- ==============================================================================

BEGIN;

-- 1. Concessão de Privilégios DML (GRANTs) para a role authenticated
-- Em PostgreSQL/Supabase, a política RLS só é avaliada se a role possuir privilégios de tabela.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.client_strategies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.client_pillars TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.editorial_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.editorial_plan_pillars TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.campaigns TO authenticated;

-- 2. Concessão Completa de Privilégios para service_role (operações administrativas/background)
GRANT ALL ON TABLE public.client_strategies TO service_role;
GRANT ALL ON TABLE public.client_pillars TO service_role;
GRANT ALL ON TABLE public.editorial_plans TO service_role;
GRANT ALL ON TABLE public.editorial_plan_pillars TO service_role;
GRANT ALL ON TABLE public.campaigns TO service_role;

-- 3. Assegurar Habilitação de RLS em todas as tabelas do módulo
ALTER TABLE public.client_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editorial_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editorial_plan_pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- 4. Reafirmação / Ajuste Idempotente das Políticas RLS
-- 4.1 client_strategies
DROP POLICY IF EXISTS "Admin and team can manage client_strategies" ON public.client_strategies;
CREATE POLICY "Admin and team can manage client_strategies"
ON public.client_strategies
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'team')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'team')
  )
);

-- 4.2 client_pillars
DROP POLICY IF EXISTS "Admin and team can manage client_pillars" ON public.client_pillars;
CREATE POLICY "Admin and team can manage client_pillars"
ON public.client_pillars
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'team')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'team')
  )
);

-- 4.3 editorial_plans
DROP POLICY IF EXISTS "Admin and team can manage editorial_plans" ON public.editorial_plans;
CREATE POLICY "Admin and team can manage editorial_plans"
ON public.editorial_plans
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'team')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'team')
  )
);

-- 4.4 editorial_plan_pillars
DROP POLICY IF EXISTS "Admin and team can manage editorial_plan_pillars" ON public.editorial_plan_pillars;
CREATE POLICY "Admin and team can manage editorial_plan_pillars"
ON public.editorial_plan_pillars
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'team')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'team')
  )
);

-- 4.5 campaigns
DROP POLICY IF EXISTS "Admin and team can manage campaigns" ON public.campaigns;
CREATE POLICY "Admin and team can manage campaigns"
ON public.campaigns
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'team')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'team')
  )
);

COMMIT;
