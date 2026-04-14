'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, User, Loader as Loader2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { AssistantType, AIMessage as AIMessageType } from '@/lib/ai/types';
import { AIService, getGreetingPrompt } from '@/lib/ai/service';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AIChatProps {
  assistantType: AssistantType;
  conversationId?: string;
  onClose?: () => void;
}

export function AIChat({ assistantType, conversationId, onClose }: AIChatProps) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<AIMessageType[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(conversationId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const aiService = useRef<AIService | null>(null);

  useEffect(() => {
    if (user && profile) {
      aiService.current = new AIService(user.id, [profile.role]);
      loadConversation();
    }
  }, [user, profile, conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const loadConversation = async () => {
    if (!aiService.current) return;

    if (conversationId) {
      try {
        const conversation = await aiService.current.getConversation(conversationId);
        if (conversation?.messages) {
          setMessages(conversation.messages);
        }
      } catch (error) {
        console.error('Error loading conversation:', error);
      }
    } else {
      const greeting = await getGreetingPrompt(assistantType);
      setMessages([
        {
          id: 'greeting',
          conversation_id: 'temp',
          role: 'assistant',
          content: greeting,
          created_at: new Date().toISOString(),
        },
      ]);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !aiService.current) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    const tempUserMessage: AIMessageType = {
      id: `temp-${Date.now()}`,
      conversation_id: currentConversationId || 'temp',
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, tempUserMessage]);

    try {
      const response = await aiService.current.sendMessage({
        message: userMessage,
        assistantType,
        conversationId: currentConversationId,
        includeContext: true,
      });

      if (!currentConversationId) {
        setCurrentConversationId(response.conversationId);
      }

      const assistantMessage: AIMessageType = {
        id: response.messageId,
        conversation_id: response.conversationId,
        role: 'assistant',
        content: response.message,
        metadata: response.usage,
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
      setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFeedback = async (messageId: string, rating: number) => {
    if (!aiService.current) return;

    try {
      await aiService.current.submitFeedback(messageId, rating);
      toast.success('Thank you for your feedback!');
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const getAssistantName = () => {
    switch (assistantType) {
      case 'customer':
        return 'Customer Assistant';
      case 'vendor':
        return 'Business Assistant';
      case 'admin':
        return 'Operations Assistant';
    }
  };

  const getAssistantColor = () => {
    switch (assistantType) {
      case 'customer':
        return 'bg-green-600';
      case 'vendor':
        return 'bg-blue-600';
      case 'admin':
        return 'bg-purple-600';
    }
  };

  return (
    <Card className="flex flex-col h-[600px] w-full max-w-2xl">
      <div className={`${getAssistantColor()} text-white p-4 rounded-t-lg flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <span className="font-semibold">{getAssistantName()}</span>
        </div>
        <Badge variant="secondary" className="bg-white/20">
          AI-Powered
        </Badge>
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className={`${getAssistantColor()} rounded-full p-2 h-8 w-8 flex items-center justify-center flex-shrink-0`}>
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}
              <div
                className={`flex flex-col gap-2 max-w-[80%] ${
                  message.role === 'user'
                    ? 'items-end'
                    : 'items-start'
                }`}
              >
                <div
                  className={`rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                </div>
                {message.role === 'assistant' && message.id !== 'greeting' && (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => handleFeedback(message.id, 5)}
                    >
                      <ThumbsUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => handleFeedback(message.id, 1)}
                    >
                      <ThumbsDown className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              {message.role === 'user' && (
                <div className="bg-gray-300 rounded-full p-2 h-8 w-8 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-gray-700" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className={`${getAssistantColor()} rounded-full p-2 h-8 w-8 flex items-center justify-center flex-shrink-0`}>
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-gray-100 rounded-lg p-3">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={loading}
            className="flex-1"
          />
          <Button onClick={sendMessage} disabled={loading || !input.trim()}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          AI can make mistakes. Verify important information.
        </p>
      </div>
    </Card>
  );
}
