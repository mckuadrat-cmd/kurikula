-- Alter default values for subscription columns on workspaces table
-- so that new workspaces automatically start with a 30-day trial active.
ALTER TABLE public.workspaces ALTER COLUMN subscription_tier SET DEFAULT 'trial';
ALTER TABLE public.workspaces ALTER COLUMN subscription_status SET DEFAULT 'active';
ALTER TABLE public.workspaces ALTER COLUMN subscription_expires_at SET DEFAULT (timezone('utc'::text, now()) + interval '30 days');

-- Create a function to automatically initialize credits for any new workspace
CREATE OR REPLACE FUNCTION public.initialize_workspace_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.credits (workspace_id, balance, total_spent, updated_at)
  VALUES (NEW.id, 50, 0, timezone('utc'::text, now()))
  ON CONFLICT (workspace_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on public.workspaces
DROP TRIGGER IF EXISTS trigger_initialize_workspace_credits ON public.workspaces;
CREATE TRIGGER trigger_initialize_workspace_credits
AFTER INSERT ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.initialize_workspace_credits();
