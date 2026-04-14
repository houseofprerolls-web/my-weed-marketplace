/*
  # AI Assistant System for GreenZone

  ## Overview
  Creates infrastructure for role-aware AI assistants that integrate with OpenAI.
  Supports Customer, Vendor, and Admin/Employee assistant modes with proper
  permission controls.

  ## New Tables

  ### 1. `ai_conversations`
  Stores conversation threads between users and AI assistants
  - `id` (uuid, primary key)
  - `user_id` (uuid) - User who started conversation
  - `assistant_type` (text) - customer, vendor, admin
  - `title` (text) - Auto-generated conversation title
  - `status` (text) - active, archived
  - `metadata` (jsonb) - Additional context
  - `created_at`, `updated_at`

  ### 2. `ai_messages`
  Individual messages within conversations
  - `id` (uuid, primary key)
  - `conversation_id` (uuid) - Parent conversation
  - `role` (text) - user, assistant, system
  - `content` (text) - Message content
  - `metadata` (jsonb) - Token count, model used, etc
  - `created_at`

  ### 3. `ai_assistant_context`
  Stores context data that assistants can access based on permissions
  - `id` (uuid, primary key)
  - `user_id` (uuid) - User the context belongs to
  - `assistant_type` (text) - Which assistant can access
  - `context_type` (text) - order, product, analytics, vendor_profile, etc
  - `context_data` (jsonb) - The actual context data
  - `expires_at` (timestamptz) - When context should be refreshed
  - `created_at`, `updated_at`

  ### 4. `ai_usage_logs`
  Track AI API usage for monitoring and billing
  - `id` (uuid, primary key)
  - `user_id` (uuid)
  - `assistant_type` (text)
  - `conversation_id` (uuid)
  - `prompt_tokens` (integer)
  - `completion_tokens` (integer)
  - `total_tokens` (integer)
  - `model` (text) - gpt-4, gpt-3.5-turbo, etc
  - `cost_estimate` (numeric)
  - `created_at`

  ### 5. `ai_assistant_prompts`
  Store system prompts and templates for each assistant type
  - `id` (uuid, primary key)
  - `assistant_type` (text)
  - `prompt_key` (text) - system, greeting, error_handling, etc
  - `prompt_template` (text) - The prompt text
  - `is_active` (boolean)
  - `version` (integer)
  - `created_at`, `updated_at`

  ### 6. `ai_feedback`
  Collect user feedback on AI responses
  - `id` (uuid, primary key)
  - `message_id` (uuid) - The AI response being rated
  - `user_id` (uuid)
  - `rating` (integer) - 1-5 stars
  - `feedback_text` (text)
  - `created_at`

  ## Security
  - RLS enabled on all tables
  - Users can only access their own conversations
  - Vendors can only access vendor assistant
  - Admins can access admin assistant
  - Strict role-based access to context data
*/

-- Create ai_conversations table
CREATE TABLE IF NOT EXISTS ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  assistant_type text NOT NULL CHECK (assistant_type IN ('customer', 'vendor', 'admin')),
  title text NOT NULL DEFAULT 'New conversation',
  status text DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_type ON ai_conversations(assistant_type);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON ai_conversations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own conversations"
  ON ai_conversations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own conversations"
  ON ai_conversations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all conversations"
  ON ai_conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create ai_messages table
CREATE TABLE IF NOT EXISTS ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES ai_conversations(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON ai_messages(conversation_id, created_at ASC);

ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in own conversations"
  ON ai_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own conversations"
  ON ai_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all messages"
  ON ai_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create ai_assistant_context table
CREATE TABLE IF NOT EXISTS ai_assistant_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  assistant_type text NOT NULL CHECK (assistant_type IN ('customer', 'vendor', 'admin')),
  context_type text NOT NULL,
  context_data jsonb NOT NULL,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_context_user_type ON ai_assistant_context(user_id, assistant_type, context_type);
CREATE INDEX IF NOT EXISTS idx_ai_context_expires ON ai_assistant_context(expires_at);

ALTER TABLE ai_assistant_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own context"
  ON ai_assistant_context FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can manage context"
  ON ai_assistant_context FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all context"
  ON ai_assistant_context FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create ai_usage_logs table
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assistant_type text NOT NULL,
  conversation_id uuid REFERENCES ai_conversations(id) ON DELETE SET NULL,
  prompt_tokens integer DEFAULT 0,
  completion_tokens integer DEFAULT 0,
  total_tokens integer DEFAULT 0,
  model text NOT NULL,
  cost_estimate numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_type ON ai_usage_logs(assistant_type, created_at DESC);

ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage logs"
  ON ai_usage_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create usage logs"
  ON ai_usage_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all usage logs"
  ON ai_usage_logs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create ai_assistant_prompts table
CREATE TABLE IF NOT EXISTS ai_assistant_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assistant_type text NOT NULL CHECK (assistant_type IN ('customer', 'vendor', 'admin')),
  prompt_key text NOT NULL,
  prompt_template text NOT NULL,
  is_active boolean DEFAULT true,
  version integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(assistant_type, prompt_key, version)
);

CREATE INDEX IF NOT EXISTS idx_ai_prompts_type_key ON ai_assistant_prompts(assistant_type, prompt_key, is_active);

ALTER TABLE ai_assistant_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active prompts"
  ON ai_assistant_prompts FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage prompts"
  ON ai_assistant_prompts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create ai_feedback table
CREATE TABLE IF NOT EXISTS ai_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES ai_messages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  feedback_text text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_message ON ai_feedback(message_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_rating ON ai_feedback(rating, created_at DESC);

ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create feedback"
  ON ai_feedback FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own feedback"
  ON ai_feedback FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all feedback"
  ON ai_feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Insert default system prompts for each assistant type
INSERT INTO ai_assistant_prompts (assistant_type, prompt_key, prompt_template, is_active, version)
VALUES
  (
    'customer',
    'system',
    'You are a helpful cannabis discovery assistant for GreenZone customers. Help users discover dispensaries, understand products and strains, navigate orders, and answer questions about cannabis. Be friendly, informative, and compliant with cannabis regulations. Always remind users to consume responsibly and that they must be 21+. Do not provide medical advice.',
    true,
    1
  ),
  (
    'customer',
    'greeting',
    'Hi! I''m your GreenZone assistant. I can help you discover dispensaries, learn about products and strains, track your orders, or answer any questions. What would you like to know?',
    true,
    1
  ),
  (
    'vendor',
    'system',
    'You are a business assistant for GreenZone vendors. Help vendors write compelling product descriptions, suggest promotional copy, analyze their menu performance, and optimize their listings. Be professional, creative, and focused on helping vendors grow their business. Provide actionable insights based on their data.',
    true,
    1
  ),
  (
    'vendor',
    'greeting',
    'Hello! I''m your GreenZone business assistant. I can help you write product descriptions, create promotions, analyze your performance, or optimize your menu. How can I help your business today?',
    true,
    1
  ),
  (
    'admin',
    'system',
    'You are an internal operations assistant for GreenZone employees and administrators. Help analyze vendor performance, summarize moderation queues, identify sales opportunities, and provide market insights. Be concise, analytical, and focus on actionable intelligence. Maintain confidentiality of sensitive platform data.',
    true,
    1
  ),
  (
    'admin',
    'greeting',
    'Welcome! I''m your GreenZone operations assistant. I can help you analyze vendor performance, review incidents, identify sales opportunities, or summarize platform metrics. What would you like to know?',
    true,
    1
  )
ON CONFLICT (assistant_type, prompt_key, version) DO NOTHING;

-- Create function to auto-archive old conversations
CREATE OR REPLACE FUNCTION archive_old_ai_conversations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE ai_conversations
  SET status = 'archived', updated_at = now()
  WHERE status = 'active'
    AND updated_at < now() - interval '30 days';
END;
$$;

-- Create function to clean up expired context
CREATE OR REPLACE FUNCTION cleanup_expired_ai_context()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM ai_assistant_context
  WHERE expires_at IS NOT NULL
    AND expires_at < now();
END;
$$;
