-- 1. Add subscription columns to workspaces table
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'inactive';
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive';
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS billing_cycle TEXT;

-- 2. Rename workspace_credits to credits if it exists, or create credits table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspace_credits') AND
     NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'credits') THEN
    ALTER TABLE workspace_credits RENAME TO credits;
  ELSE
    CREATE TABLE IF NOT EXISTS credits (
      workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
      balance INTEGER DEFAULT 0 NOT NULL,
      total_spent INTEGER DEFAULT 0 NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );
  END IF;
END $$;

-- Enable Row Level Security (RLS) on credits table
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for selecting credits
DROP POLICY IF EXISTS "Users can view credits for their workspace" ON credits;
CREATE POLICY "Users can view credits for their workspace" ON credits
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- 3. Create ai_credit_usage table if it does not exist
CREATE TABLE IF NOT EXISTS ai_credit_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID,
  type TEXT NOT NULL,
  model TEXT NOT NULL,
  credit_cost INTEGER NOT NULL,
  status TEXT NOT NULL, -- 'success', 'failed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on ai_credit_usage table
ALTER TABLE ai_credit_usage ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for selecting ai_credit_usage
DROP POLICY IF EXISTS "Users can view AI credit usage for their workspace" ON ai_credit_usage;
CREATE POLICY "Users can view AI credit usage for their workspace" ON ai_credit_usage
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- 4. Add billing_cycle column to payment_transactions table
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS billing_cycle TEXT;

-- 5. Seed initial credits for existing workspaces if they do not have any
INSERT INTO credits (workspace_id, balance, total_spent, updated_at)
SELECT id, 50, 0, now() FROM workspaces
ON CONFLICT (workspace_id) DO NOTHING;
