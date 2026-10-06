-- NISN disimpan di tabel terpisah (tabel students bisa dibaca publik).
-- Hanya siswa pemilik & admin yang bisa membaca.
CREATE TABLE IF NOT EXISTS public.student_private (
  student_id uuid PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
  nisn text NOT NULL CHECK (nisn ~ '^[0-9]{5,20}$'),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_private ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_private FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_private TO authenticated;
GRANT ALL ON public.student_private TO service_role;

CREATE POLICY "Siswa lihat NISN sendiri, admin lihat semua"
  ON public.student_private FOR SELECT TO authenticated
  USING (student_id = public.current_student_id() OR public.is_admin(auth.uid()));

CREATE POLICY "Admin kelola NISN"
  ON public.student_private FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
