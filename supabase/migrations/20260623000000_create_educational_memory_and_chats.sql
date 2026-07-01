-- 1. Create ai_conversations table
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  context_type TEXT NOT NULL CHECK (context_type IN ('general', 'semester_plan', 'lesson_plan', 'worksheet', 'assessment', 'learning_analysis')),
  context_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on ai_conversations
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for users to manage their own conversations
DROP POLICY IF EXISTS "Users can manage their own conversations" ON ai_conversations;
CREATE POLICY "Users can manage their own conversations" ON ai_conversations
  FOR ALL USING (auth.uid() = user_id);

-- 2. Create ai_messages table
CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on ai_messages
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for users to manage their own messages
DROP POLICY IF EXISTS "Users can manage their own messages" ON ai_messages;
CREATE POLICY "Users can manage their own messages" ON ai_messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM ai_conversations WHERE user_id = auth.uid()
    )
  );

-- 3. Create teacher_memory table
CREATE TABLE IF NOT EXISTS teacher_memory (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  jenjang TEXT,
  mapel TEXT,
  teaching_style TEXT,
  preferred_models TEXT[],
  character_focus TEXT[],
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on teacher_memory
ALTER TABLE teacher_memory ENABLE ROW LEVEL SECURITY;

-- Add RLS policy for users to manage their own memory
DROP POLICY IF EXISTS "Users can manage their own memory" ON teacher_memory;
CREATE POLICY "Users can manage their own memory" ON teacher_memory
  FOR ALL USING (auth.uid() = user_id);
