import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MascotSpeechBubbleProps {
  text: string;
  visible: boolean;
  autoHide?: boolean; // Auto-hide after 8 seconds
}

export const MascotSpeechBubble: React.FC<MascotSpeechBubbleProps> = ({ 
  text, 
  visible,
  autoHide = true
}) => {
  // Auto-hide functionality
  useEffect(() => {
    if (visible && autoHide) {
      const timer = setTimeout(() => {
        // This will be handled by parent component for better state management
        console.log('🗨️ Speech bubble auto-hide timer triggered');
      }, 8000); // 8 seconds

      return () => clearTimeout(timer);
    }
  }, [visible, autoHide]);

  if (!text || !visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.9 }}
          transition={{ 
            duration: 0.3, 
            ease: 'easeInOut' 
          }}
          className="absolute top-16 md:top-20 left-1/2 z-50 w-[90%] max-w-xs sm:max-w-sm"
          style={{
            // Position relative to mascot container, centered horizontally
            transform: 'translateX(-50%)',
          }}
        >
          {/* Speech bubble with glassmorphism */}
          <div className="relative bg-white/10 backdrop-blur-xl rounded-[20px] md:rounded-2xl border border-white/20 shadow-xl shadow-black/20 p-3 md:p-4">
            {/* Speech bubble tail */}
            <div className="absolute -bottom-2 left-8 w-4 h-4 bg-white/10 backdrop-blur-xl border-r border-b border-white/20 transform rotate-45"></div>
            
            {/* Speech text */}
            <div className="relative z-10">
              <p className="text-white text-xs md:text-sm leading-relaxed break-words">
                {text}
              </p>
            </div>
            
            {/* Subtle gradient overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-[20px] md:rounded-2xl pointer-events-none"></div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
