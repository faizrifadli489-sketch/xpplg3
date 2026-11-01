-- =========================================================
-- 1. Jadwal: hapus data hari Sabtu (libur)
-- =========================================================
DELETE FROM public.schedule_entries WHERE day_of_week = 6;
DELETE FROM public.piket_assignments WHERE day_of_week = 6;

-- =========================================================
-- 2. Helper role (mengikuti pola is_admin)
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_bendahara(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'bendahara');
$$;

CREATE OR REPLACE FUNCTION public.is_sekretaris(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'sekretaris');
$$;

GRANT EXECUTE ON FUNCTION public.is_bendahara(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_sekretaris(uuid) TO authenticated;

-- =========================================================
-- 3. Pengaturan kas (harga per hari) - satu baris saja
-- =========================================================
CREATE TABLE IF NOT EXISTS public.kas_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  daily_amount integer NOT NULL DEFAULT 2000 CHECK (daily_amount > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.kas_settings (id, daily_amount) VALUES (1, 2000) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.kas_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin and bendahara manage kas settings" ON public.kas_settings;
CREATE POLICY "Admin and bendahara manage kas settings"
  ON public.kas_settings FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.is_bendahara(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()) OR public.is_bendahara(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kas_settings TO authenticated;
GRANT ALL ON public.kas_settings TO service_role;

-- =========================================================
-- 4. Kas harian otomatis
-- =========================================================
ALTER TABLE public.cash_dues ADD COLUMN IF NOT EXISTS is_daily boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS cash_dues_daily_unique_date
  ON public.cash_dues (due_date) WHERE is_daily = true;

CREATE OR REPLACE FUNCTION public.ensure_daily_kas()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.cash_dues (title, amount, due_date, is_daily)
  SELECT
    'Kas Harian',
    COALESCE((SELECT daily_amount FROM public.kas_settings WHERE id = 1), 2000),
    (now() AT TIME ZONE 'Asia/Jakarta')::date,
    true
  WHERE EXTRACT(ISODOW FROM (now() AT TIME ZONE 'Asia/Jakarta')) BETWEEN 1 AND 5
  ON CONFLICT (due_date) WHERE is_daily = true DO NOTHING;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_daily_kas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_daily_kas() TO authenticated;

-- =========================================================
-- 5. Akses tambahan (additif, tidak mengubah policy admin yang ada)
-- =========================================================
ALTER TABLE public.cash_dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Bendahara: kelola kas
DROP POLICY IF EXISTS "Bendahara manage cash dues" ON public.cash_dues;
CREATE POLICY "Bendahara manage cash dues" ON public.cash_dues FOR ALL TO authenticated
  USING (public.is_bendahara(auth.uid())) WITH CHECK (public.is_bendahara(auth.uid()));

DROP POLICY IF EXISTS "Bendahara manage cash payments" ON public.cash_payments;
CREATE POLICY "Bendahara manage cash payments" ON public.cash_payments FOR ALL TO authenticated
  USING (public.is_bendahara(auth.uid())) WITH CHECK (public.is_bendahara(auth.uid()));

DROP POLICY IF EXISTS "Bendahara manage cash expenses" ON public.cash_expenses;
CREATE POLICY "Bendahara manage cash expenses" ON public.cash_expenses FOR ALL TO authenticated
  USING (public.is_bendahara(auth.uid())) WITH CHECK (public.is_bendahara(auth.uid()));

-- Sekretaris: kelola blog & acara
DROP POLICY IF EXISTS "Sekretaris manage posts" ON public.posts;
CREATE POLICY "Sekretaris manage posts" ON public.posts FOR ALL TO authenticated
  USING (public.is_sekretaris(auth.uid())) WITH CHECK (public.is_sekretaris(auth.uid()));

DROP POLICY IF EXISTS "Sekretaris manage events" ON public.events;
CREATE POLICY "Sekretaris manage events" ON public.events FOR ALL TO authenticated
  USING (public.is_sekretaris(auth.uid())) WITH CHECK (public.is_sekretaris(auth.uid()));
