import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Bot,
  RotateCcw,
  Send,
  User,
} from 'lucide-react';
import type { ClassRoutine, Notice, UserProfile } from '../types';
import { sendCampusChatMessage } from '../lib/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

interface AssistantPanelProps {
  profile: UserProfile;
  accessToken: string;
  notices: Notice[];
  routines: ClassRoutine[];
  initialPrompt?: string | null;
  onClearInitialPrompt?: () => void;
}

export function AssistantPanel({
  profile,
  accessToken,
  notices,
  routines,
  initialPrompt,
  onClearInitialPrompt,
}: AssistantPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: `Hello ${profile.full_name}. I have access to ${notices.length} active campus notices and ${routines.length} scheduled class routine entries. Ask me about your ${profile.department} classes, upcoming deadlines, or campus questions.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const consumedPromptRef = useRef<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  async function submitMessage(textToSend: string) {
    const trimmed = textToSend.trim();
    if (!trimmed || sending) return;

    const userMsg: ChatMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      text: trimmed,
    };

    const nextHistory = [...messages.filter((m) => m.id !== 'welcome'), userMsg];
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);
    setError(null);

    try {
      const { reply } = await sendCampusChatMessage(
        accessToken,
        nextHistory.map(({ role, text }) => ({ role, text })),
        {
          profile,
          notices,
          routines,
        },
      );

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-assistant`,
          role: 'assistant',
          text: reply,
        },
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to reach Gemini AI assistant.',
      );
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    if (
      initialPrompt &&
      initialPrompt !== consumedPromptRef.current &&
      !sending
    ) {
      consumedPromptRef.current = initialPrompt;
      void submitMessage(initialPrompt);
      onClearInitialPrompt?.();
    }
  }, [initialPrompt]);

  function handleReset() {
    setError(null);
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        text: `Conversation cleared. Ask me anything about your ${profile.department} routines, official notices, or campus schedules.`,
      },
    ]);
  }

  const suggestedQuestions = [
    `What classes do I have in ${profile.department} this week?`,
    'Summarize the latest notices and any upcoming deadlines.',
    'Which rooms are used for classes on Monday and Wednesday?',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-10.5rem)] min-h-[520px] bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            AI Campus Assistant
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
            Grounded in {notices.length} notices and {routines.length} routine slots
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          New Chat
        </button>
      </div>

      {/* Chat Transcript */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/40">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-800'
                }`}
              >
                {msg.text}
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {sending && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-500">
              Thinking...
            </div>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-lg border border-red-200 bg-red-50 text-red-800 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Starter Prompts + Composer */}
      <div className="border-t border-slate-200 bg-white p-4 space-y-3">
        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void submitMessage(q)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 text-xs font-medium text-slate-700 hover:text-blue-900 transition-colors cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitMessage(input);
          }}
          className="flex items-center gap-2.5"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your class routine, notices, rooms, or campus guidance..."
            disabled={sending}
            className="flex-1 px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
