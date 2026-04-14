export type AssistantType = 'customer' | 'vendor' | 'admin';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface AIMessage {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface AIConversation {
  id: string;
  user_id: string;
  assistant_type: AssistantType;
  title: string;
  status: 'active' | 'archived';
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  messages?: AIMessage[];
}

export interface AIContextData {
  id: string;
  user_id: string;
  assistant_type: AssistantType;
  context_type: string;
  context_data: Record<string, any>;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AIUsageLog {
  id: string;
  user_id: string;
  assistant_type: AssistantType;
  conversation_id?: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  model: string;
  cost_estimate: number;
  created_at: string;
}

export interface AIPrompt {
  id: string;
  assistant_type: AssistantType;
  prompt_key: string;
  prompt_template: string;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

export interface AIServiceRequest {
  conversationId?: string;
  message: string;
  assistantType: AssistantType;
  includeContext?: boolean;
}

export interface AIServiceResponse {
  conversationId: string;
  message: string;
  messageId: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ContextBuilderOptions {
  userId: string;
  assistantType: AssistantType;
  includeOrders?: boolean;
  includeProducts?: boolean;
  includeAnalytics?: boolean;
  includeVendorProfile?: boolean;
  limit?: number;
}
