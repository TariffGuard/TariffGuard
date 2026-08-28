'use client';

import React, { useState } from 'react';
import { Send, Bot, User, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

type Message = {
  id: string;
  role: 'user' | 'ai';
  content: string;
};

const SUGGESTED_QUESTIONS = [
  "What is my peak demand risk?",
  "Summarize today's schedule",
  "How can I reduce costs tomorrow?",
  "Show anomalies from last week"
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'ai',
      content: "Hello! I'm TariffGuard AI. How can I assist you with your energy schedules, tariffs, or anomalies today?",
    }
  ]);
  const [inputValue, setInputValue] = useState('');

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    const newUserMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, newUserMsg]);
    setInputValue('');

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: "I'm TariffGuard AI. I can help you understand your energy schedules, tariffs, and anomalies.",
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  return (
    <div className="h-full flex flex-col -m-6"> {/* Negative margin to offset parent padding slightly for a cleaner chat look, or just fill */}
      <header className="px-6 py-4 border-b border-[rgba(255,255,255,0.2)] shrink-0">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">AI Assistant</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">Ask anything about your energy data</p>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-4 max-w-[85%]",
                msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1",
                msg.role === 'user' ? "bg-[var(--color-primary)] text-white shadow-sm" : "bg-white/60 text-[var(--color-primary)] shadow-sm backdrop-blur-md border border-white/50"
              )}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={cn(
                "px-5 py-3.5 text-[15px] leading-relaxed shadow-sm",
                msg.role === 'user' 
                  ? "bg-[var(--color-primary)] text-white rounded-[20px] rounded-tr-[4px]" 
                  : "glass-card text-[var(--color-text-primary)] rounded-[20px] rounded-tl-[4px] border border-[rgba(255,255,255,0.6)]"
              )}>
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-6 pt-2 shrink-0">
          {messages.length < 3 && (
            <div className="flex flex-wrap gap-2 mb-4 px-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full glass-card border border-[rgba(255,255,255,0.6)] text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[rgba(255,255,255,0.6)] hover:text-[var(--color-primary)] hover:border-white transition-all shadow-sm"
                >
                  <Zap size={14} className="text-[var(--color-energy)]" />
                  {q}
                </button>
              ))}
            </div>
          )}
          
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(inputValue); }}
            className="flex gap-2 relative max-w-4xl mx-auto w-full"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask TariffGuard AI..."
              className="flex-1 glass-card bg-[rgba(255,255,255,0.6)] px-6 py-4 rounded-full text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 transition-all placeholder:text-[var(--color-text-muted)] shadow-sm border border-white/60"
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="absolute right-2 top-2 bottom-2 w-11 bg-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] text-white rounded-full flex items-center justify-center transition-all disabled:opacity-50 disabled:hover:bg-[var(--color-primary)] shadow-sm"
            >
              <Send size={18} className="ml-0.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
