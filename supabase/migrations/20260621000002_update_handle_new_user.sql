-- 1. Hapus tabel public.profiles secara permanen karena tidak digunakan oleh aplikasi
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. Definisikan ulang fungsi public.handle_new_user() agar membuat workspace personal berformat "[username] personal"
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_workspace_id UUID;
  user_username TEXT;
BEGIN
  -- Dapatkan username dari metadata, atau gunakan awalan email jika kosong
  user_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));

  -- Buat workspace default dengan format nama "[username] personal"
  INSERT INTO public.workspaces (name, type)
  VALUES (user_username || ' personal', 'individual')
  RETURNING id INTO new_workspace_id;

  -- Jadikan user tersebut sebagai owner dari workspace tersebut
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Pastikan trigger terhubung dengan benar ke tabel auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Update nama workspace personal dari user yang sudah terdaftar sebelumnya agar berformat "[username] personal"
UPDATE public.workspaces w
SET name = COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)) || ' personal'
FROM public.workspace_members wm
JOIN auth.users u ON wm.user_id = u.id
WHERE w.id = wm.workspace_id
  AND w.type = 'individual';
