import React, { useState, useRef, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Mic, Send, Grip, StopCircle } from 'lucide-react';
import { MascotAction } from '../services/api-client';
import { useSpeech } from '../contexts/SpeechProvider';

interface ExpandableChatInputProps {
  onSendMessage: (message: string) => void;
  onMenuToggle: () => void;
  isOpen: boolean;
}

const ExpandableChatInput: React.FC<ExpandableChatInputProps> = ({ 
  onSendMessage, onMenuToggle, isOpen
}) => {
  const [val, setVal] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // ✅ Speech integration
  const { setSpeechCallbacks, isListening, startListening, stopListening } = useSpeech();

  // ✅ Link callbacks to speech engine (Anti-Spam Fix)
  useEffect(() => {
    setSpeechCallbacks(setVal, (message: string) => {
      (window as any).motionController?.play(MascotAction.THINKING); 
      onSendMessage(message);
      setVal('');
    });
  }, []); // Empty dependency array - only run once

  const handleMicClick = () => {
    if (isListening) {
      // Agar ON hai, to ab band karo aur MESSAGE BHEJO
      stopListening();
    } else {
      // Agar OFF hai, to chalu karo (Text clear ho jayega)
      startListening();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [val]);

  const handleSend = () => {
    if (val.trim()) {
      (window as any).motionController?.play(MascotAction.THINKING); 
      onSendMessage(val);
      setVal('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  return (
    <div className="flex items-end gap-2 md:gap-4 w-full max-w-3xl mx-auto pointer-events-auto">
      
      {/* 🧭 Radial Menu Trigger */}
      <motion.button
        onClick={onMenuToggle}
        whileHover={{ scale: 1.1, boxShadow: "0 0 20px rgba(59, 130, 246, 0.4)" }}
        whileTap={{ scale: 0.95 }}
        animate={{ rotate: isOpen ? 90 : 0 }}
        className={`shrink-0 rounded-full flex items-center justify-center backdrop-blur-3xl border transition-all duration-500 w-11 h-11 md:w-14 md:h-14 ${
          isOpen 
            ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_25px_rgba(79,70,229,0.5)]' 
            : 'bg-white/5 border-white/10 text-white hover:border-white/30'
        }`}
      >
        <Grip className="w-5 h-5 md:w-7 md:h-7" />
      </motion.button>

      {/* 💬 Premium Chat Input with Shine & Glow */}
      <motion.div 
        layout
        animate={{ 
          backgroundColor: isFocused ? "rgba(10, 10, 15, 0.98)" : "rgba(15, 15, 20, 0.75)",
          borderColor: isFocused ? "rgba(99, 102, 241, 0.6)" : "rgba(255, 255, 255, 0.08)",
          // ✅ FIX: Added the Premium Glow (Indigo/Blue Halo)
          boxShadow: isFocused ? "0 0 50px -10px rgba(99, 102, 241, 0.3)" : "0 10px 30px -10px rgba(0,0,0,0.5)"
        }}
        className="flex-1 relative backdrop-blur-3xl border rounded-[28px] overflow-hidden transition-all duration-500 group"
      >
        {/* ✨ PREMEUM SHINE EFFECT (Moves on hover/focus) */}
        <motion.div 
          initial={{ x: "-150%" }}
          whileHover={{ x: "150%" }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-25deg] pointer-events-none"
        />

        {/* Listening Border Pulse */}
        {isListening && <div className="absolute inset-0 border-2 border-red-500/40 rounded-[28px] animate-pulse pointer-events-none" />}

        <div className="flex items-center gap-1.5 md:gap-2 w-full p-1 md:p-2 relative z-10 min-h-[44px] md:min-h-[56px]">
          <textarea
            ref={textareaRef}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder={isListening ? "Listening..." : "Message..."}
            rows={1}
            className="flex-1 bg-transparent text-white placeholder-slate-500 text-xs md:text-base py-1 pl-3 pr-1 md:py-3 md:pl-6 md:pr-2 outline-none resize-none max-h-40 custom-scrollbar font-medium leading-tight md:leading-relaxed tracking-wide selection:bg-indigo-500/40 mt-1 md:mt-0"
            style={{ minHeight: '20px' }} 
          />

          <div className="flex items-center gap-1.5 pr-1.5">
            <motion.button 
              onClick={handleMicClick}
              whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.05)" }}
              whileTap={{ scale: 0.9 }}
              className={`p-1.5 md:p-2.5 rounded-full transition-colors ${
                isListening ? 'bg-red-500/20 text-red-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              {isListening ? <StopCircle className="w-5 h-5 md:w-5 md:h-5 animate-pulse" /> : <Mic className="w-5 h-5 md:w-5 md:h-5" />}
            </motion.button>

            <motion.button 
              onClick={handleSend}
              disabled={!val.trim()}
              whileHover={val.trim() ? { scale: 1.05, backgroundColor: "#4f46e5" } : {}}
              whileTap={{ scale: 0.9 }}
              className={`p-1.5 md:p-2.5 rounded-full transition-all duration-300 ${
                val.trim() 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' 
                  : 'bg-white/5 text-slate-600'
              }`}
            >
              <Send className={`w-5 h-5 md:w-5 md:h-5 ${val.trim() ? "translate-x-0.5" : ""}`} />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ExpandableChatInput;
