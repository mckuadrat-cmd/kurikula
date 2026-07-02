-- Migration to add token usage tracking to ai_credit_usage table
ALTER TABLE ai_credit_usage ADD COLUMN IF NOT EXISTS prompt_tokens INTEGER DEFAULT 0;
ALTER TABLE ai_credit_usage ADD COLUMN IF NOT EXISTS completion_tokens INTEGER DEFAULT 0;
ALTER TABLE ai_credit_usage ADD COLUMN IF NOT EXISTS total_tokens INTEGER DEFAULT 0;
ALTER TABLE ai_credit_usage ADD COLUMN IF NOT EXISTS estimated_cost_idr NUMERIC DEFAULT 0.0;
