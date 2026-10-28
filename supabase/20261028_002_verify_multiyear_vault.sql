-- SIPETAK v3.2 Multi-Tahun (2026-10-28)
-- Tidak mengubah struktur tabel: semua tahun kinerja tersimpan DI DALAM
-- payload AES-GCM (schema:3), bukan sebagai baris plaintext di Supabase.
-- Jalankan setelah 20261028_001_secure_vault.sql untuk validasi prasyarat.
DO $$
DECLARE
  is_rls boolean;
  has_vault boolean;
  pcount integer;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='sipetak_vaults'
      AND column_name='vault' AND data_type='jsonb'
  ) INTO has_vault;
  IF NOT has_vault THEN
    RAISE EXCEPTION 'Migrasi awal SIPETAK v3.0 belum diterapkan: public.sipetak_vaults.vault (jsonb) tidak ditemukan.';
  END IF;
  SELECT c.relrowsecurity FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='sipetak_vaults'
    INTO is_rls;
  IF is_rls IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'RLS belum aktif pada public.sipetak_vaults.';
  END IF;
  SELECT count(*) FROM pg_policies
    WHERE schemaname='public' AND tablename='sipetak_vaults'
      AND policyname IN ('sipetak_select_own','sipetak_insert_own','sipetak_update_own','sipetak_delete_own')
    INTO pcount;
  IF pcount<>4 THEN RAISE EXCEPTION 'Empat policy kepemilikan vault belum lengkap.'; END IF;
  RAISE NOTICE 'Siap migrasi v3.2: vault JSONB + RLS + 4 policy terverifikasi; tidak ada perubahan tabel.';
END $$;
