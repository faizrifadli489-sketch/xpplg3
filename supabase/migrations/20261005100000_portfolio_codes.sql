-- Playground kode (HTML/CSS/JS) di portofolio. Karya bisa dilihat siapa saja di /portofolio/<slug>.
-- Hanya siswa pemilik (atau admin) yang boleh menambah, mengubah, dan menghapus.

CREATE TABLE IF NOT EXISTS public.portfolio_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) <= 80),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 100),
  description text CHECK (description IS NULL OR length(description) <= 500),
  html text NOT NULL DEFAULT '' CHECK (length(html) <= 100000),
  css text NOT NULL DEFAULT '' CHECK (length(css) <= 100000),
  js text NOT NULL DEFAULT '' CHECK (length(js) <= 100000),
  creator_student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portfolio_codes_created_idx ON public.portfolio_codes (created_at DESC);

ALTER TABLE public.portfolio_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view portfolio codes" ON public.portfolio_codes;
CREATE POLICY "Anyone can view portfolio codes" ON public.portfolio_codes FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Owner or admin insert portfolio codes" ON public.portfolio_codes;
CREATE POLICY "Owner or admin insert portfolio codes" ON public.portfolio_codes FOR INSERT TO authenticated
  WITH CHECK (creator_student_id = public.current_student_id() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Owner or admin update portfolio codes" ON public.portfolio_codes;
CREATE POLICY "Owner or admin update portfolio codes" ON public.portfolio_codes FOR UPDATE TO authenticated
  USING (creator_student_id = public.current_student_id() OR public.is_admin(auth.uid()))
  WITH CHECK (creator_student_id = public.current_student_id() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Owner or admin delete portfolio codes" ON public.portfolio_codes;
CREATE POLICY "Owner or admin delete portfolio codes" ON public.portfolio_codes FOR DELETE TO authenticated
  USING (creator_student_id = public.current_student_id() OR public.is_admin(auth.uid()));

GRANT SELECT ON public.portfolio_codes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_codes TO authenticated;
GRANT ALL ON public.portfolio_codes TO service_role;
