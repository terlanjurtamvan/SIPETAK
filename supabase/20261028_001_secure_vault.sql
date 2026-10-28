-- SIPETAK v3.0: per-user encrypted vault migration for Supabase PostgreSQL.
-- Run with Supabase SQL Editor as authorized project administrator.
-- No plaintext tasks, correspondence, attachments, or passwords are stored.
-- Supabase Auth must be enabled. Client uses publishable/anon key ONLY.
BEGIN;
CREATE TABLE IF NOT EXISTS public.sipetak_vaults (
  owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  vault jsonb NOT NULL,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sipetak_vault_format CHECK (
    jsonb_typeof(vault) = 'object'
    AND vault->>'format' = 'sipetak-vault-v1'
    AND jsonb_typeof(vault->'ciphertext') = 'string'
    AND jsonb_typeof(vault->'salt') = 'string'
    AND jsonb_typeof(vault->'iv') = 'string'
    AND (vault->>'iterations') ~ '^[0-9]{5,6}$'
  )
);
CREATE OR REPLACE FUNCTION public.sipetak_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS sipetak_updated_at_trigger ON public.sipetak_vaults;
CREATE TRIGGER sipetak_updated_at_trigger
BEFORE UPDATE ON public.sipetak_vaults
FOR EACH ROW EXECUTE FUNCTION public.sipetak_touch_updated_at();
ALTER TABLE public.sipetak_vaults ENABLE ROW LEVEL SECURITY;
-- Restrict rows to their own Supabase authenticated user.
DROP POLICY IF EXISTS sipetak_select_own ON public.sipetak_vaults;
DROP POLICY IF EXISTS sipetak_insert_own ON public.sipetak_vaults;
DROP POLICY IF EXISTS sipetak_update_own ON public.sipetak_vaults;
DROP POLICY IF EXISTS sipetak_delete_own ON public.sipetak_vaults;
CREATE POLICY sipetak_select_own ON public.sipetak_vaults FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL AND owner_id = (SELECT auth.uid()));
CREATE POLICY sipetak_insert_own ON public.sipetak_vaults FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND owner_id = (SELECT auth.uid()));
CREATE POLICY sipetak_update_own ON public.sipetak_vaults FOR UPDATE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL AND owner_id = (SELECT auth.uid())) WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND owner_id = (SELECT auth.uid()));
CREATE POLICY sipetak_delete_own ON public.sipetak_vaults FOR DELETE TO authenticated USING ((SELECT auth.uid()) IS NOT NULL AND owner_id = (SELECT auth.uid()));
REVOKE ALL ON TABLE public.sipetak_vaults FROM PUBLIC, anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.sipetak_vaults TO authenticated;
REVOKE ALL ON FUNCTION public.sipetak_touch_updated_at() FROM PUBLIC, anon, authenticated;
COMMIT;
