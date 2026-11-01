-- Tambah role baru. Harus di file/transaksi terpisah dari migration yang memakai value ini.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'bendahara';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sekretaris';
