-- 1. Ubah tipe workspace dari 'individual' menjadi 'personal' untuk data yang sudah ada
UPDATE public.workspaces 
SET type = 'personal' 
WHERE type = 'individual';

-- 2. Definisikan ulang trigger function public.handle_new_user() dengan tipe 'personal'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_workspace_id UUID;
  user_username TEXT;
BEGIN
  -- Dapatkan username dari metadata, atau gunakan awalan email jika kosong
  user_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));

  -- Buat workspace default dengan tipe 'personal'
  INSERT INTO public.workspaces (name, type)
  VALUES (user_username || ' personal', 'personal')
  RETURNING id INTO new_workspace_id;

  -- Jadikan user tersebut sebagai owner dari workspace tersebut
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
