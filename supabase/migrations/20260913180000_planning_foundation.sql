-- ==============================================================================
-- Migration: 20260913180000_planning_foundation.sql
-- Description: Fundação do Módulo Planejamento (Estratégias, Pilares, Planos, Campanhas)
-- Phase: F5.2A / F5.2A-H1 — Auditoria Pré-Execução e Hardening Relacional
-- Status: PREPARADA PARA REVISÃO (NÃO APLICADA AO SUPABASE ATIVO)
-- ==============================================================================

BEGIN;

-- 1. Função Utilitária Compartilhada: handle_updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = clock_timestamp();
  RETURN NEW;
END;
$$;

-- 2. Tabela: public.client_strategies (Estratégia-Base da Marca 1:1 com Clients)
CREATE TABLE IF NOT EXISTS public.client_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  positioning text,
  value_proposition text,
  target_audience text,
  brand_voice_tone text,
  communication_guidelines text,
  do_donts text,
  business_goals text,
  priority_channels text[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_client_strategies_client_id UNIQUE (client_id),
  CONSTRAINT check_client_strategies_priority_channels
    CHECK (
      priority_channels <@ ARRAY[
        'instagram', 'facebook', 'linkedin', 'tiktok',
        'youtube', 'blog', 'whatsapp', 'other'
      ]::text[]
    )
);

DROP TRIGGER IF EXISTS trg_client_strategies_updated_at ON public.client_strategies;
CREATE TRIGGER trg_client_strategies_updated_at
BEFORE UPDATE ON public.client_strategies
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 3. Tabela: public.client_pillars (Catálogo Mestre de Pilares da Marca)
CREATE TABLE IF NOT EXISTS public.client_pillars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT check_client_pillars_name_not_empty CHECK (trim(name) <> ''),
  CONSTRAINT uq_client_pillars_id_client UNIQUE (id, client_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_client_pillars_client_lower_name 
ON public.client_pillars (client_id, lower(trim(name)));

CREATE INDEX IF NOT EXISTS idx_client_pillars_client_active 
ON public.client_pillars (client_id, is_active, display_order);

DROP TRIGGER IF EXISTS trg_client_pillars_updated_at ON public.client_pillars;
CREATE TRIGGER trg_client_pillars_updated_at
BEFORE UPDATE ON public.client_pillars
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 4. Tabela: public.editorial_plans (Ciclos de Planejamento por Período)
CREATE TABLE IF NOT EXISTS public.editorial_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  primary_goal text,
  secondary_goals text[] NOT NULL DEFAULT '{}',
  core_message text,
  target_posts_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT check_editorial_plans_title_not_empty CHECK (trim(title) <> ''),
  CONSTRAINT check_editorial_plans_dates CHECK (end_date >= start_date),
  CONSTRAINT check_editorial_plans_target_posts CHECK (target_posts_count >= 0),
  CONSTRAINT check_editorial_plans_status CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  CONSTRAINT uq_editorial_plans_id_client UNIQUE (id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_editorial_plans_client_dates 
ON public.editorial_plans (client_id, start_date DESC);

CREATE INDEX IF NOT EXISTS idx_editorial_plans_status 
ON public.editorial_plans (status);

DROP TRIGGER IF EXISTS trg_editorial_plans_updated_at ON public.editorial_plans;
CREATE TRIGGER trg_editorial_plans_updated_at
BEFORE UPDATE ON public.editorial_plans
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 5. Tabela: public.editorial_plan_pillars (Distribuição e Metas por Pilar no Período)
CREATE TABLE IF NOT EXISTS public.editorial_plan_pillars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  editorial_plan_id uuid NOT NULL,
  pillar_id uuid NOT NULL,
  target_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_editorial_plan_pillars UNIQUE (editorial_plan_id, pillar_id),
  CONSTRAINT check_editorial_plan_pillars_target CHECK (target_count >= 0),
  CONSTRAINT fk_plan_pillars_plan_client
    FOREIGN KEY (editorial_plan_id, client_id)
    REFERENCES public.editorial_plans(id, client_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_plan_pillars_pillar_client
    FOREIGN KEY (pillar_id, client_id)
    REFERENCES public.client_pillars(id, client_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_editorial_plan_pillars_pillar 
ON public.editorial_plan_pillars (pillar_id);

CREATE INDEX IF NOT EXISTS idx_editorial_plan_pillars_client 
ON public.editorial_plan_pillars (client_id);

DROP TRIGGER IF EXISTS trg_editorial_plan_pillars_updated_at ON public.editorial_plan_pillars;
CREATE TRIGGER trg_editorial_plan_pillars_updated_at
BEFORE UPDATE ON public.editorial_plan_pillars
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 6. Tabela: public.campaigns (Campanhas Comerciais e Temáticas da Marca)
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  objective text,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT check_campaigns_name_not_empty CHECK (trim(name) <> ''),
  CONSTRAINT check_campaigns_dates CHECK (
    (start_date IS NULL AND end_date IS NULL)
    OR (start_date IS NOT NULL AND end_date IS NULL)
    OR (start_date IS NOT NULL AND end_date IS NOT NULL AND end_date >= start_date)
  ),
  CONSTRAINT check_campaigns_status CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  CONSTRAINT uq_campaigns_id_client UNIQUE (id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_campaigns_client_dates 
ON public.campaigns (client_id, start_date DESC);

CREATE INDEX IF NOT EXISTS idx_campaigns_status 
ON public.campaigns (status);

DROP TRIGGER IF EXISTS trg_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER trg_campaigns_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- 7. Adição de Colunas Estruturadas em public.contents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contents' AND column_name = 'editorial_plan_id'
  ) THEN
    ALTER TABLE public.contents ADD COLUMN editorial_plan_id uuid REFERENCES public.editorial_plans(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contents' AND column_name = 'pillar_id'
  ) THEN
    ALTER TABLE public.contents ADD COLUMN pillar_id uuid REFERENCES public.client_pillars(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contents' AND column_name = 'campaign_id'
  ) THEN
    ALTER TABLE public.contents ADD COLUMN campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contents_editorial_plan ON public.contents (editorial_plan_id);
CREATE INDEX IF NOT EXISTS idx_contents_pillar_id ON public.contents (pillar_id);
CREATE INDEX IF NOT EXISTS idx_contents_campaign_id ON public.contents (campaign_id);

-- 8. Função e Trigger de Integridade Tenant (Content ↔ Client)
CREATE OR REPLACE FUNCTION public.check_content_planning_tenant_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- 1. Validar editorial_plan_id
  IF NEW.editorial_plan_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.editorial_plans
      WHERE id = NEW.editorial_plan_id AND client_id = NEW.client_id
    ) THEN
      RAISE EXCEPTION 'EDITORIAL_PLAN_CLIENT_MISMATCH';
    END IF;
  END IF;

  -- 2. Validar pillar_id
  IF NEW.pillar_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.client_pillars
      WHERE id = NEW.pillar_id AND client_id = NEW.client_id
    ) THEN
      RAISE EXCEPTION 'PILLAR_CLIENT_MISMATCH';
    END IF;
  END IF;

  -- 3. Validar campaign_id
  IF NEW.campaign_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE id = NEW.campaign_id AND client_id = NEW.client_id
    ) THEN
      RAISE EXCEPTION 'CAMPAIGN_CLIENT_MISMATCH';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.check_content_planning_tenant_integrity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_content_planning_tenant_integrity() FROM anon;

DROP TRIGGER IF EXISTS trg_content_planning_tenant_integrity ON public.contents;
CREATE TRIGGER trg_content_planning_tenant_integrity
BEFORE INSERT OR UPDATE OF client_id, editorial_plan_id, pillar_id, campaign_id
ON public.contents
FOR EACH ROW
EXECUTE FUNCTION public.check_content_planning_tenant_integrity();

-- 9. Concessão de Privilégios (GRANTs) e Row Level Security (RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.client_strategies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.client_pillars TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.editorial_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.editorial_plan_pillars TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.campaigns TO authenticated;

GRANT ALL ON TABLE public.client_strategies TO service_role;
GRANT ALL ON TABLE public.client_pillars TO service_role;
GRANT ALL ON TABLE public.editorial_plans TO service_role;
GRANT ALL ON TABLE public.editorial_plan_pillars TO service_role;
GRANT ALL ON TABLE public.campaigns TO service_role;

ALTER TABLE public.client_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editorial_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editorial_plan_pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- 9.1 client_strategies
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

-- 9.2 client_pillars
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

-- 9.3 editorial_plans
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

-- 9.4 editorial_plan_pillars
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

-- 9.5 campaigns
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

-- 10. Backfill Não-Destrutivo e Idempotente de Pilares Legados
DO $$
DECLARE
  r record;
  v_pillar_id uuid;
BEGIN
  -- Iterar sobre todos os pares distintos (client_id, trim(pillar)) em contents existentes com texto
  FOR r IN
    SELECT DISTINCT
      c.client_id,
      trim(c.pillar) AS clean_name
    FROM public.contents c
    WHERE c.pillar IS NOT NULL
      AND trim(c.pillar) <> ''
  LOOP
    -- 1. Verificar se já existe pilar com o mesmo nome normalizado para este cliente
    SELECT id INTO v_pillar_id
    FROM public.client_pillars
    WHERE client_id = r.client_id
      AND lower(trim(name)) = lower(r.clean_name)
    LIMIT 1;

    -- 2. Inserir client_pillar mestre se ainda não existir
    IF v_pillar_id IS NULL THEN
      INSERT INTO public.client_pillars (
        client_id,
        name,
        description,
        is_active,
        display_order
      )
      VALUES (
        r.client_id,
        r.clean_name,
        'Pilar importado automaticamente do histórico de conteúdos.',
        true,
        0
      )
      RETURNING id INTO v_pillar_id;
    END IF;

    -- 3. Atualizar contents.pillar_id preservando o texto original em contents.pillar
    UPDATE public.contents
    SET pillar_id = v_pillar_id
    WHERE client_id = r.client_id
      AND lower(trim(pillar)) = lower(r.clean_name)
      AND pillar_id IS NULL;
  END LOOP;
END $$;

COMMIT;
