-- Playground multi-file (mirip VS Code): isi proyek disimpan sebagai array jsonb [{path, content}].
-- Kolom html/css/js lama dibiarkan supaya data lama tetap aman, lalu di-backfill ke files.

ALTER TABLE public.portfolio_codes ADD COLUMN IF NOT EXISTS files jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.portfolio_codes DROP CONSTRAINT IF EXISTS portfolio_codes_files_check;
ALTER TABLE public.portfolio_codes ADD CONSTRAINT portfolio_codes_files_check
  CHECK (jsonb_typeof(files) = 'array' AND octet_length(files::text) <= 1000000);

UPDATE public.portfolio_codes
SET files = jsonb_build_array(
  jsonb_build_object(
    'path', 'index.html',
    'content', E'<!doctype html>\n<html lang="id">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<link rel="stylesheet" href="style.css">\n</head>\n<body>\n' || html || E'\n<script src="script.js"></script>\n</body>\n</html>'
  ),
  jsonb_build_object('path', 'style.css', 'content', css),
  jsonb_build_object('path', 'script.js', 'content', js)
)
WHERE files = '[]'::jsonb;

-- Kuota harian untuk menjalankan kode lewat server eksekusi (hanya server/service role yang boleh akses).
CREATE TABLE IF NOT EXISTS public.code_run_usage (
  user_id uuid NOT NULL,
  day date NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
ALTER TABLE public.code_run_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.code_run_usage FROM anon, authenticated;
GRANT ALL ON public.code_run_usage TO service_role;

CREATE OR REPLACE FUNCTION public.code_run_bump(_user_id uuid, _limit integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE c integer;
BEGIN
  INSERT INTO public.code_run_usage (user_id, day, count)
  VALUES (_user_id, (now() AT TIME ZONE 'Asia/Jakarta')::date, 1)
  ON CONFLICT (user_id, day) DO UPDATE SET count = public.code_run_usage.count + 1
    WHERE public.code_run_usage.count < _limit
  RETURNING count INTO c;
  RETURN c IS NOT NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.code_run_bump(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.code_run_bump(uuid, integer) TO service_role;
