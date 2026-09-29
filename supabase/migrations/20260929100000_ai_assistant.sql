-- Asisten AI (CS kelas): pengaturan, API key (bisa banyak), dan pembatasan pemakaian harian.
-- Semua tabel hanya bisa diakses admin (RLS) atau server (service role). Key TIDAK PERNAH dikirim ke browser.

CREATE TABLE IF NOT EXISTS public.ai_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  base_url text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  system_prompt text NOT NULL DEFAULT 'Kamu adalah asisten (CS) untuk web kelas X PPLG 3. Jawab dalam Bahasa Indonesia yang santai, singkat, dan ramah. Gunakan HANYA data yang diberikan di konteks (jadwal, piket, acara, status kas siswa yang sedang bertanya, dan info tambahan). Kalau datanya tidak ada atau kamu tidak yakin, jawab jujur bahwa kamu tidak tahu dan sarankan tanya bendahara/sekretaris/wali kelas. Jangan mengarang. Jangan pernah membocorkan data kas atau data pribadi siswa lain.',
  knowledge text NOT NULL DEFAULT '',
  include_schedule boolean NOT NULL DEFAULT true,
  include_piket boolean NOT NULL DEFAULT true,
  include_events boolean NOT NULL DEFAULT true,
  include_kas boolean NOT NULL DEFAULT true,
  daily_limit integer NOT NULL DEFAULT 20 CHECK (daily_limit BETWEEN 1 AND 500),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.ai_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.ai_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  api_key text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  fail_count integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_usage (
  user_id uuid NOT NULL,
  day date NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.ai_settings, public.ai_api_keys, public.ai_usage FROM anon;
REVOKE ALL ON public.ai_usage FROM authenticated;

DROP POLICY IF EXISTS "Admin manage ai settings" ON public.ai_settings;
CREATE POLICY "Admin manage ai settings" ON public.ai_settings FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin manage ai keys" ON public.ai_api_keys;
CREATE POLICY "Admin manage ai keys" ON public.ai_api_keys FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_settings, public.ai_api_keys TO authenticated;
GRANT ALL ON public.ai_settings, public.ai_api_keys, public.ai_usage TO service_role;

-- Naikkan pemakaian harian secara atomik. true = masih boleh, false = kuota habis.
CREATE OR REPLACE FUNCTION public.ai_bump_usage(_user_id uuid, _limit integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE c integer;
BEGIN
  INSERT INTO public.ai_usage (user_id, day, count)
  VALUES (_user_id, (now() AT TIME ZONE 'Asia/Jakarta')::date, 1)
  ON CONFLICT (user_id, day) DO UPDATE SET count = public.ai_usage.count + 1
    WHERE public.ai_usage.count < _limit
  RETURNING count INTO c;
  RETURN c IS NOT NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ai_bump_usage(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_bump_usage(uuid, integer) TO service_role;
