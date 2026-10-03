import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User } from 'lucide-react';
import { useAppStore } from '../store';

// ─────────────────────────────────────────────────────────────
//  Lightweight Markdown renderer (no extra deps)
//  Handles: **bold**, *bullet lists, emojis, line breaks
// ─────────────────────────────────────────────────────────────
function renderMarkdown(raw: string): React.ReactNode {
  if (!raw) return null;

  // Normalise: strip extra blank lines
  const lines = raw
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n');

  const nodes: React.ReactNode[] = [];
  let key = 0;
  let i = 0;

  const inlineFormat = (text: string): React.ReactNode => {
    // Handle **bold**
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, idx) => {
      if (p.startsWith('**') && p.endsWith('**')) {
        return <strong key={idx} style={{ color: '#a8d8ff', fontWeight: 700 }}>{p.slice(2, -2)}</strong>;
      }
      return p;
    });
  };

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (!line.trim()) { i++; continue; }

    // Bullet list item: lines starting with * or - or •
    if (/^[\*\-•]\s/.test(line)) {
      const bulletLines: string[] = [];
      while (i < lines.length && /^[\*\-•]\s/.test(lines[i])) {
        bulletLines.push(lines[i].replace(/^[\*\-•]\s/, '').trim());
        i++;
      }
      nodes.push(
        <ul key={key++} style={{ paddingLeft: '14px', margin: '4px 0', listStyle: 'none' }}>
          {bulletLines.map((bl, bi) => (
            <li key={bi} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '3px', lineHeight: 1.45 }}>
              <span style={{ color: '#00d2ff', fontSize: '10px', marginTop: '4px', flexShrink: 0 }}>◆</span>
              <span>{inlineFormat(bl)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Normal paragraph line
    nodes.push(
      <p key={key++} style={{ margin: '2px 0', lineHeight: 1.55 }}>
        {inlineFormat(line)}
      </p>
    );
    i++;
  }

  return <>{nodes}</>;
}

// ─────────────────────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────────────────────
export const ChatHistoryPanel: React.FC<{ chatMode?: string }> = ({ chatMode = 'student' }) => {
  const { mascot } = useAppStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Filter history based on current mode
  // If a message has no mode (old messages), assume it's 'student' (normal chat)
  const filteredHistory = mascot.chatHistory.filter(msg => 
    (msg.mode || 'student') === chatMode
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filteredHistory]);

  return (
    <div className="flex flex-col h-full w-full relative">

      {/* Floating Header */}
      <div className="absolute top-0 left-6 z-20 mt-4">
        <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full shadow-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]" />
          <span className="text-[10px] font-bold text-white tracking-widest uppercase opacity-80">
            CHAT
          </span>
        </div>
      </div>

      {/* Scrollable history */}
      <div
        className="flex-1 overflow-y-auto px-6 pt-20 pb-4 space-y-4 custom-scrollbar"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%)',
        }}
      >
        <AnimatePresence initial={false}>
          {filteredHistory.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`flex w-full gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse justify-start self-end ml-auto' : 'justify-start'}`}
            >
              {/* Avatar */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-md border border-white/10 mt-0.5 ${
                msg.role === 'user'
                  ? 'bg-slate-700'
                  : 'bg-gradient-to-tr from-indigo-600 to-purple-600'
              }`}>
                {msg.role === 'user'
                  ? <User size={12} className="text-slate-300" />
                  : <Bot size={12} className="text-white" />
                }
              </div>

              {/* Bubble */}
              <div
                className={`
                  text-[13px] leading-relaxed shadow-md backdrop-blur-xl border
                  rounded-2xl px-3.5 py-2.5
                  ${msg.role === 'user'
                    ? 'bg-slate-800/90 border-slate-700 text-slate-100 rounded-tr-sm max-w-[72%]'
                    : 'bg-white/5 border-white/10 text-white/90 rounded-tl-sm max-w-[82%] hover:bg-white/8 transition-colors'
                  }
                `}
              >
                {msg.role === 'assistant'
                  ? renderMarkdown(msg.text)
                  : <span>{msg.text}</span>
                }
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 0px; }
        .hover\\:bg-white\\/8:hover { background-color: rgba(255,255,255,0.08); }
      `}</style>
    </div>
  );
};
