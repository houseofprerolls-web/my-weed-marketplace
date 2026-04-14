'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Bot, MessageCircle } from 'lucide-react';
import { AIChat } from './AIChat';
import { AssistantType } from '@/lib/ai/types';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessAssistant } from '@/lib/ai/permissions';

interface AssistantPanelProps {
  assistantType: AssistantType;
  triggerVariant?: 'button' | 'fab';
}

export function AssistantPanel({ assistantType, triggerVariant = 'button' }: AssistantPanelProps) {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user || !profile || !canAccessAssistant([profile.role], assistantType)) {
    return null;
  }

  const getButtonText = () => {
    switch (assistantType) {
      case 'customer':
        return 'Ask Assistant';
      case 'vendor':
        return 'Business Assistant';
      case 'admin':
        return 'Operations Assistant';
    }
  };

  const getButtonColor = () => {
    switch (assistantType) {
      case 'customer':
        return 'bg-green-600 hover:bg-green-700';
      case 'vendor':
        return 'bg-blue-600 hover:bg-blue-700';
      case 'admin':
        return 'bg-purple-600 hover:bg-purple-700';
    }
  };

  if (triggerVariant === 'fab') {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            className={`fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg ${getButtonColor()}`}
            size="icon"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl p-0">
          <AIChat assistantType={assistantType} onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={getButtonColor()}>
          <Bot className="h-4 w-4 mr-2" />
          {getButtonText()}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl p-0">
        <AIChat assistantType={assistantType} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
