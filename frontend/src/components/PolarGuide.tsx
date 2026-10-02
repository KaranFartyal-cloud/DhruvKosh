import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MascotCenterStage } from './MascotCenterStage';
import { ChatHistoryPanel } from './ChatHistoryPanel';
import ExpandableChatInput from './ExpandableChatInput';
import { useAppStore } from '../store';
import { useSpeech } from '../contexts/SpeechProvider';
import { MessageSquare, HelpCircle } from 'lucide-react';

import { VoiceService } from '../services/VoiceService';

export const PolarGuide: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const { addChatMessage } = useAppStore();
  const { startListening, stopListening, isListening } = useSpeech();

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  // Menu and Mode state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [chatMode, setChatMode] = useState<'student' | 'kid' | 'researcher'>('student'); 
  // 'student' = Chat, 'kid' = Questions

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;
    addChatMessage('user', message);
    try {
      const apiBaseUrl = (import.meta as unknown as { env: { VITE_API_BASE_URL?: string } }).env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/api/generated/expedition/1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, user_type: chatMode })
      });
      const data = await response.json();
      if (data?.reply) {
        addChatMessage('assistant', data.reply);
        
        // 🚀 MAVE AI ADVANCED LIP SYNC (Base64 TTS)
        if (data?.audio_base64 && (window as any).lipSyncSystem) {
          (window as any).lipSyncSystem.playAudioFromBase64(data.audio_base64);
        } else {
          // Fallback to basic TTS
          VoiceService.getInstance().speak(data.reply);
        }
      }
      if (data?.animation) {
        (window as any).motionController?.play(data.animation);
      } else {
        (window as any).motionController?.play('IDLE');
      }
    } catch (e) { 
      console.error(e);
      addChatMessage('assistant', 'Sorry, I could not connect to the server.');
      (window as any).motionController?.play('SAD');
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#030305] flex text-white font-sans md:cursor-none">
      
      {/* 📍 CUSTOM CURSOR GLOW - Hidden on Mobile */}
      <motion.div 
        className="fixed top-0 left-0 w-6 h-6 bg-white rounded-full mix-blend-difference z-[9999] pointer-events-none blur-[2px] hidden md:block"
        animate={{ x: mousePos.x - 12, y: mousePos.y - 12 }}
        transition={{ type: "spring", damping: 30, stiffness: 400, mass: 0.2 }}
      />

      {/* 🌌 AMBIENT BACKGROUND */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[#030305]" />
        <motion.div 
          className="absolute w-[1000px] h-[1000px] bg-indigo-600/5 rounded-full blur-2xl md:blur-[150px] hidden md:block"
          animate={{ x: mousePos.x - 500, y: mousePos.y - 500 }}
          transition={{ type: "spring", damping: 50, stiffness: 20 }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:60px_60px]"
          style={{ maskImage: 'radial-gradient(ellipse 80% 50% at 50% 100%, black 70%, transparent 100%)' }} 
        />
      </div>

      {/* 🟦 MASCOT STAGE */}
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
         <motion.div animate={{ y: -60 }} className="relative w-full h-full max-w-6xl flex items-center justify-center">
            <div className="w-full h-full pb-32"> 
               <MascotCenterStage className="w-full h-full" showRadialActions={false} />
            </div>
         </motion.div>
      </div>

      {/* 🟢 MAIN UI */}
      <div className="absolute inset-0 z-20 flex flex-col md:flex-row w-full h-full pointer-events-none">
        
        {/* Chat History Panel (Left side) */}
        <div className="hidden lg:block w-[400px] h-full relative z-30 pointer-events-auto p-6 pl-0 pt-0">
          <ChatHistoryPanel />
        </div>
        
        {/* Chat Input (Bottom Center) */}
        <div className="flex-1 flex flex-col justify-end pb-6 px-4 md:pb-12 md:px-8 z-30 pointer-events-none relative">
            
            {/* Mode Selection Popup (above the Grip button) */}
            <div className="w-full max-w-3xl mx-auto flex justify-start pointer-events-auto relative">
              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    className="absolute bottom-[80px] left-0 md:bottom-[90px] p-2 bg-black/80 backdrop-blur-3xl border border-white/20 rounded-[24px] shadow-2xl flex flex-col gap-2 min-w-[160px]"
                  >
                    <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-white/50 font-bold">Select Mode</div>
                    <button 
                      onClick={() => { setChatMode('student'); setIsMenuOpen(false); }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-[16px] text-sm font-bold transition-all ${chatMode === 'student' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/80 hover:bg-white/10'}`}
                    >
                      <MessageSquare size={16} /> Chat
                    </button>
                    <button 
                      onClick={() => { setChatMode('kid'); setIsMenuOpen(false); }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-[16px] text-sm font-bold transition-all ${chatMode === 'kid' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/80 hover:bg-white/10'}`}
                    >
                      <HelpCircle size={16} /> Questions
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="pointer-events-auto flex justify-center w-full mt-2">
                <ExpandableChatInput
                  onSendMessage={handleSendMessage}
                  isOpen={isMenuOpen}
                  onMenuToggle={() => setIsMenuOpen(!isMenuOpen)}
                />
            </div>
        </div>
        
        {/* Right side padding to center character visually */}
        <div className="hidden xl:flex w-[300px] h-full p-8 flex-col items-end gap-6 z-30 pointer-events-none">
        </div>
      </div>

    </div>
  );
};

export default PolarGuide;
