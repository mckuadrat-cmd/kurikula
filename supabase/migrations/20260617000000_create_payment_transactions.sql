-- Tabel untuk menyimpan histori transaksi pembayaran Midtrans Snap
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  user_id UUID,
  order_id TEXT UNIQUE NOT NULL,
  amount NUMERIC NOT NULL,
  tier_key TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, success, failed, expired
  payment_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Mengaktifkan Row Level Security (RLS) demi keamanan data
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Kebijakan akses (policy) agar pengguna hanya dapat melihat transaksi milik workspace mereka sendiri
CREATE POLICY "Users can view transactions for their workspace" ON payment_transactions
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );
