-- Proyek tersimpan di Playground Kode, terikat ke akun yang login.
-- visibility: 'open' = kodenya bisa dilihat user lain (open source), 'closed' = hanya pemilik (close source).

CREATE TABLE IF NOT EXISTS public.playground_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  files jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(files) = 'array' AND octet_length(files::text) <= 1000000),
  visibility text NOT NULL DEFAULT 'closed' CHECK (visibility IN ('open', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS playground_projects_owner_idx ON public.playground_projects (owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS playground_projects_open_idx ON public.playground_projects (updated_at DESC) WHERE visibility = 'open';

ALTER TABLE public.playground_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner or open projects select" ON public.playground_projects;
CREATE POLICY "Owner or open projects select" ON public.playground_projects FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR visibility = 'open');

DROP POLICY IF EXISTS "Owner insert playground projects" ON public.playground_projects;
CREATE POLICY "Owner insert playground projects" ON public.playground_projects FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owner update playground projects" ON public.playground_projects;
CREATE POLICY "Owner update playground projects" ON public.playground_projects FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owner delete playground projects" ON public.playground_projects;
CREATE POLICY "Owner delete playground projects" ON public.playground_projects FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.playground_projects TO authenticated;
GRANT ALL ON public.playground_projects TO service_role;
