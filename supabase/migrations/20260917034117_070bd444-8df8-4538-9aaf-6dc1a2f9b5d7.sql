CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    UNIQUE (user_id, role)
);

GRANT ALL ON public.user_roles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE POLICY "Admins can manage user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.students (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name text NOT NULL,
    nickname text,
    nis text,
    gender text CHECK (gender IN ('L', 'P')),
    photo_url text,
    created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.students TO anon;
GRANT SELECT ON public.students TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view students"
ON public.students
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins can manage students"
ON public.students
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    slug text UNIQUE NOT NULL,
    content text NOT NULL,
    cover_image_url text,
    published boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT ON public.posts TO anon;
GRANT SELECT ON public.posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published posts"
ON public.posts
FOR SELECT
TO anon, authenticated
USING (published = true);

CREATE POLICY "Admins can manage posts"
ON public.posts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.org_positions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    order_index integer NOT NULL DEFAULT 0,
    student_name text NOT NULL DEFAULT 'Belum diisi',
    student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.org_positions TO anon;
GRANT SELECT ON public.org_positions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_positions TO authenticated;
GRANT ALL ON public.org_positions TO service_role;

ALTER TABLE public.org_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view organisation positions"
ON public.org_positions
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins can manage organisation positions"
ON public.org_positions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.org_positions (title, order_index, student_name)
VALUES
    ('Ketua Kelas', 1, 'Belum diisi'),
    ('Wakil Ketua Kelas', 2, 'Belum diisi'),
    ('Sekretaris', 3, 'Belum diisi'),
    ('Bendahara', 4, 'Belum diisi'),
    ('Koordinator Kebersihan', 5, 'Belum diisi');

INSERT INTO public.posts (title, slug, content, published)
VALUES (
    'Selamat Datang di Website X PPLG 3',
    'selamat-datang',
    '<p>Selamat datang di website resmi kelas X PPLG 3. Di sini kamu bisa melihat daftar siswa, struktur organisasi kelas, dan membaca blog dari kegiatan kami.</p>',
    true
);