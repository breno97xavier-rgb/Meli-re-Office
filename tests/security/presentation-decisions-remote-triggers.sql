-- Read-only snapshot from meliere-assets (ycagvwsvccgdjzpbhrfi), 2026-10-09.
-- Test fixture only; never apply this file to Supabase.
CREATE OR REPLACE FUNCTION public.check_presentation_item_client_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_pres_client uuid;
  v_content_client uuid;
BEGIN
  -- Otimização: Apenas valida se for INSERT ou se as chaves relacionais mudaram
  IF TG_OP = 'INSERT' OR
     NEW.presentation_id IS DISTINCT FROM OLD.presentation_id OR
     NEW.content_id IS DISTINCT FROM OLD.content_id THEN

    SELECT client_id INTO v_pres_client
    FROM public.presentations
    WHERE id = NEW.presentation_id;

    SELECT client_id INTO v_content_client
    FROM public.contents
    WHERE id = NEW.content_id;

    -- Fail-closed explícito: Rejeita se qualquer registro estiver ausente/nulo ou se os clientes divergirem
    IF v_pres_client IS NULL OR
       v_content_client IS NULL OR
       v_pres_client IS DISTINCT FROM v_content_client THEN
      RAISE EXCEPTION 'PRESENTATION_ITEM_CLIENT_MISMATCH';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_presentation_lineage_client_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_prev_client uuid;
BEGIN
  -- 1. Validação de Linhagem Direta (previous_presentation_id)
  IF NEW.previous_presentation_id IS NOT NULL THEN
    IF TG_OP = 'INSERT' OR
       NEW.previous_presentation_id IS DISTINCT FROM OLD.previous_presentation_id OR
       NEW.client_id IS DISTINCT FROM OLD.client_id THEN

      SELECT client_id INTO v_prev_client
      FROM public.presentations
      WHERE id = NEW.previous_presentation_id;

      -- Fail-closed explícito: Rejeita se a apresentação anterior for ausente ou de outro cliente
      IF v_prev_client IS NULL OR
         v_prev_client IS DISTINCT FROM NEW.client_id THEN
        RAISE EXCEPTION 'PRESENTATION_LINEAGE_CLIENT_MISMATCH';
      END IF;
    END IF;
  END IF;

  -- 2. Validação de Série (presentation_series_id) com proteção de concorrência
  IF NEW.presentation_series_id IS NOT NULL THEN
    IF TG_OP = 'INSERT' OR
       NEW.presentation_series_id IS DISTINCT FROM OLD.presentation_series_id OR
       NEW.client_id IS DISTINCT FROM OLD.client_id THEN

      -- Serializa operações concorrentes na mesma série via advisory transaction lock de 2 chaves
      PERFORM pg_advisory_xact_lock(
        hashtext('presentation_series'),
        hashtext(NEW.presentation_series_id::text)
      );

      IF EXISTS (
        SELECT 1
        FROM public.presentations
        WHERE presentation_series_id = NEW.presentation_series_id
          AND client_id IS DISTINCT FROM NEW.client_id
          AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      ) THEN
        RAISE EXCEPTION 'PRESENTATION_SERIES_CLIENT_MISMATCH';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_content_approved_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
    if new.editorial_status = 'approved'
       and old.editorial_status is distinct from 'approved' then
        new.approved_at := now();
    elsif new.editorial_status <> 'approved'
       and old.editorial_status = 'approved' then
        new.approved_at := null;
    end if;

    return new;
end;
$function$;
CREATE TRIGGER tr_contents_set_updated_at BEFORE UPDATE ON public.contents FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tr_presentations_set_updated_at BEFORE UPDATE ON public.presentations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tr_sync_content_approved_at BEFORE UPDATE OF editorial_status ON public.contents FOR EACH ROW EXECUTE FUNCTION sync_content_approved_at();
CREATE TRIGGER trg_presentation_item_client_integrity BEFORE INSERT OR UPDATE ON public.presentation_items FOR EACH ROW EXECUTE FUNCTION check_presentation_item_client_integrity();
CREATE TRIGGER trg_presentation_lineage_client_integrity BEFORE INSERT OR UPDATE ON public.presentations FOR EACH ROW EXECUTE FUNCTION check_presentation_lineage_client_integrity();
