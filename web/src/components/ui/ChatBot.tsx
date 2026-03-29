import { useState, useEffect, useRef } from 'react';
import apiClient from '@/lib/api/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  'How is my performance?',
  'Where do I need to improve?',
  'Give me a study plan for this week',
  'What are my weak topics?',
  'Tips to crack JEE Maths',
  'How to improve accuracy?',
  'Explain Probability basics',
  'UPSC Prelims preparation strategy',
];

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<{ used: number; limit: number; remaining: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: "Hi! I'm your ExamPrep AI tutor. I have access to your performance data and can help you with:\n\n• Your performance analysis & weak areas\n• Study strategies & exam tips\n• Subject-specific doubts\n• General knowledge questions\n\nWhat would you like to know?",
        timestamp: new Date(),
      }]);
      // Fetch usage
      apiClient.get('/chatbot/usage').then(r => setUsage(r.data.data)).catch(() => {});
    }
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    if (usage && usage.remaining <= 0) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "You've reached your daily chat limit. Upgrade to Pro for 50 messages/day or Premium for unlimited.",
        timestamp: new Date(),
      }]);
      return;
    }

    const userMsg: Message = { role: 'user', content: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await apiClient.post('/chatbot/message', { message: msg, history });
      const assistantMsg: Message = { role: 'assistant', content: res.data.data.response, timestamp: new Date() };
      setMessages(prev => [...prev, assistantMsg]);
      if (usage) setUsage({ ...usage, used: usage.used + 1, remaining: Math.max(0, usage.remaining - 1) });
    } catch (err: any) {
      const code = err?.response?.data?.error?.code;
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: code === 'DAILY_LIMIT_REACHED'
          ? "You've reached your daily chat limit. Upgrade your plan for more messages!"
          : "Sorry, I couldn't process that. Please try again.",
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-primary-600 to-purple-600 text-white shadow-lg transition-transform hover:scale-110 active:scale-95">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[500px] w-[380px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 sm:h-[550px]">
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-primary-600 to-purple-600 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm">🤖</div>
              <div>
                <p className="text-sm font-semibold text-white">ExamPrep AI</p>
                <p className="text-[10px] text-white/70">
                  {usage ? `${usage.remaining} messages left today` : 'AI Tutor'}
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="rounded-lg p-1 text-white/80 hover:bg-white/10 hover:text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'rounded-br-md bg-primary-600 text-white'
                    : 'rounded-bl-md bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                }`}>
                  {msg.content.split('\n').map((line, j) => (
                    <p key={j} className={j > 0 ? 'mt-1.5' : ''}>{line}</p>
                  ))}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3 dark:bg-gray-800">
                  <div className="flex gap-1.5">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0ms' }} />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '150ms' }} />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions (only show when few messages) */}
          {messages.length <= 2 && !loading && (
            <div className="border-t border-gray-100 px-3 py-2 dark:border-gray-800">
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {SUGGESTIONS.slice(0, 4).map(s => (
                  <button key={s} onClick={() => sendMessage(s)}
                    className="shrink-0 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-400">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-gray-200 p-3 dark:border-gray-700">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                disabled={loading}
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white transition-colors hover:bg-primary-700 disabled:opacity-40">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
