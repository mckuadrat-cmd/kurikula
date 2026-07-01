-- Tabel untuk menyimpan undangan bergabung ke workspace sekolah
CREATE TABLE IF NOT EXISTS workspace_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  inviter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invitee_email TEXT NOT NULL,
  role TEXT DEFAULT 'teacher' NOT NULL, -- teacher, admin
  status TEXT DEFAULT 'pending' NOT NULL, -- pending, accepted, declined
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(workspace_id, invitee_email)
);

-- Mengaktifkan Row Level Security (RLS)
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Kebijakan akses (policy)
-- 1. Pengundang (Admin/Owner Sekolah) dapat mengelola (SELECT, INSERT, UPDATE, DELETE) undangan
CREATE POLICY "Inviter can manage invitations" ON workspace_invitations
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND (role = 'owner' OR role = 'admin')
    )
  );

-- 2. Penerima undangan (email sesuai dengan email user saat ini) dapat melihat undangan mereka
CREATE POLICY "Invitee can view invitations" ON workspace_invitations
  FOR SELECT USING (
    lower(invitee_email) = lower(auth.jwt() ->> 'email')
  );

-- 3. Penerima undangan dapat memperbarui (UPDATE) status undangan (terima/tolak)
CREATE POLICY "Invitee can update invitations" ON workspace_invitations
  FOR UPDATE USING (
    lower(invitee_email) = lower(auth.jwt() ->> 'email')
  );
