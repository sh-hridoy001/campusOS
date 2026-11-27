import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Bot,
  Check,
  Copy,
  RotateCcw,
  Send,
  User,
} from 'lucide-react';
import { motion } from 'motion/react';
import { BSPI_INSTITUTE } from '../data/bspi';
import type { ClassRoutine, Notice, UserProfile } from '../types';
import { sendCampusChatMessage } from '../lib/api';
import { MarkdownContent } from './MarkdownContent';
import { useToast } from './ToastProvider';

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
  const { showToast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: `স্বাগতম **${profile.full_name}**! আমি **${BSPI_INSTITUTE.shortName} (কাপ্তাই)**-এর AI Campus Assistant। আমার কাছে বর্তমানে **${notices.length}টি অফিসিয়াল নোটিশ** এবং **${routines.length}টি ক্লাস রুটিন স্লটের** তথ্য রয়েছে।

আপনার **${profile.department}**${profile.shift ? ` (**${profile.shift}**` : ''}${profile.semester ? ` · **${profile.semester}**)` : profile.shift ? ')' : ''}-এর বিষয়ে যেকোনো প্রশ্ন **বাংলায়** অথবা **Banglish**-এ করতে পারেন:

* আজকের ও পুরো সপ্তাহের ক্লাস রুটিন ও রুম নম্বর
* **প্রবিধান ২০২২** অনুযায়ী BSPI-এর ৬টি টেকনোলজির বুকলিস্ট ও বিষয় কোড
* সাম্প্রতিক পরীক্ষা, ভর্তি বা উপবৃত্তি সংক্রান্ত নোটিশ`,
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const consumedPromptRef = useRef<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  async function handleCopyReply(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => {
        setCopiedId((curr) => (curr === id ? null : curr));
      }, 1800);
    } catch {
      showToast({
        type: 'error',
        title: 'কপি করা যায়নি',
        description: 'টেক্সট ম্যানুয়ালি সিলেক্ট করে কপি করুন।',
      });
    }
  }

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
      const msg =
        err instanceof Error && err.message.trim()
          ? err.message
          : 'সার্ভার এখন একটু ব্যস্ত আছে, অনুগ্রহ করে কয়েক সেকেন্ড পর আবার চেষ্টা করুন।';
      setError(msg);
      showToast({
        type: 'error',
        title: 'AI সহকারী সাময়িকভাবে ব্যস্ত',
        description: msg,
      });
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
        text: `আগের কথোপকথন মুছে ফেলা হয়েছে। এখন আপনার **${profile.department}**${profile.shift ? ` (${profile.shift})` : ''} ডিপার্টমেন্টের রুটিন, বিএসপিআই নোটিশ বা বিটিইবি পরীক্ষা প্রস্তুতি নিয়ে বাংলায় বা Banglish-এ প্রশ্ন করুন।`,
      },
    ]);
    showToast({
      type: 'info',
      title: 'নতুন চ্যাট শুরু হয়েছে',
      description: 'আগের কথোপকথন পরিষ্কার করা হয়েছে।',
    });
  }

  const suggestedQuestions = [
    `${profile.department}${profile.shift ? ` (${profile.shift})` : ''}-এ এই সপ্তাহে আমার কী কী ক্লাস আছে?`,
    `${profile.department}-এর ${profile.semester ?? '১ম সেমিস্টার'}-এর প্রবিধান ২০২২ বুকলিস্ট ও বিষয় কোড বলো।`,
    'BSPI কাপ্তাই-তে কোন ৬টি টেকনোলজি রয়েছে এবং সাম্প্রতিক নোটিশগুলো কী কী?',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-13rem)] lg:h-[calc(100vh-10.5rem)] min-h-[480px] bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200/80 bg-white/95 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900">
            BSPI AI Campus Assistant
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
            {notices.length}টি নোটিশ ও {routines.length}টি রুটিন স্লটের তথ্যে সমৃদ্ধ · বাংলা ও Banglish সাপোর্টেড
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          নতুন চ্যাট
        </button>
      </div>

      {/* Chat Transcript */}
      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 space-y-6 bg-slate-50/70">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isCopied = copiedId === msg.id;

          if (isUser) {
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-start justify-end gap-3"
              >
                <div className="max-w-xl rounded-2xl rounded-tr-sm px-4 py-3 text-[15px] leading-[1.7] bg-slate-900 text-white shadow-xs whitespace-pre-wrap break-words">
                  {msg.text}
                </div>
                <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              </motion.div>
            );
          }

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-start justify-start gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                <Bot className="w-4 h-4" />
              </div>

              <div className="group max-w-3xl flex-1 sm:flex-initial bg-white border border-slate-200/90 hover:border-blue-200/80 rounded-2xl rounded-tl-sm shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-colors duration-150 overflow-hidden">
                <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold text-slate-500 tracking-wide">
                    BSPI AI Assistant
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopyReply(msg.id, msg.text)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-700 transition-colors active:scale-95 cursor-pointer"
                    title="উত্তর কপি করুন"
                    aria-label="উত্তর কপি করুন"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700">কপি হয়েছে</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>কপি</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="px-5 py-4">
                  <MarkdownContent content={msg.text} />
                </div>
              </div>
            </motion.div>
          );
        })}

        {sending && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-sm px-5 py-3.5 text-sm text-slate-600 shadow-xs flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1" aria-hidden="true">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.1s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" />
              </span>
              <span>উত্তর তৈরি হচ্ছে...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Starter Prompts + Composer */}
      <div className="border-t border-slate-200/80 bg-white/95 p-4 sm:px-5 space-y-3">
        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void submitMessage(q)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 hover:shadow-xs text-xs font-medium text-slate-700 hover:text-blue-900 transition-all duration-150 active:scale-[0.98] cursor-pointer text-left leading-relaxed"
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
            placeholder="আপনার ক্লাস রুটিন, শিফট, নোটিশ বা পড়াশোনা নিয়ে বাংলায় বা Banglish-এ লিখুন..."
            disabled={sending}
            className="flex-1 px-4 py-2.5 text-[15px] bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            পাঠান
          </button>
        </form>
      </div>
    </div>
  );
}
