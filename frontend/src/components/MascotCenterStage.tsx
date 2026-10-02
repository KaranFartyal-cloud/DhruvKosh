import React, { useState, createContext, useContext } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store'; // ✅ UPDATED: Use new store
import { VRMCharacter } from './VRMCharacter';
import { MascotAction } from '../store'; // ✅ UPDATED: Import from store
import { MascotSpeechBubble } from './MascotSpeechBubble';
import { Eye, EyeOff } from 'lucide-react';

interface MascotCenterStageProps {
  onNavigate?: (screen: string) => void;
  showRadialActions?: boolean;
  className?: string;
}

interface SpeechBubbleContextType {
  speak: (text: string) => void;
}

// Create context for speech bubble
const SpeechBubbleContext = createContext<SpeechBubbleContextType>({
  speak: () => {}
});

// Global context provider
let speechBubbleContext: SpeechBubbleContextType | null = null;

export function useMascotSpeech(): SpeechBubbleContextType {
  if (!speechBubbleContext) {
    throw new Error('useMascotSpeech must be used within MascotCenterStage');
  }
  return speechBubbleContext;
}

export function MascotCenterStage({ 
  onNavigate, 
  showRadialActions = true,
  className = ""
}: MascotCenterStageProps) {
  const { mascot } = useAppStore(); // ✅ UPDATED: Use new store
  const [speechBubbleText, setSpeechBubbleText] = useState('');
  const [speechBubbleVisible, setSpeechBubbleVisible] = useState(false);

  // Create speak function
  const speak = (text: string) => {
    console.log('🗨️ Speech bubble rendered:', text);
    setSpeechBubbleText(text);
    setSpeechBubbleVisible(true);
    
    // Auto-hide after 8 seconds
    setTimeout(() => {
      setSpeechBubbleVisible(false);
    }, 8000);
  };

  // Set global context and global function
  speechBubbleContext = { speak };
  (window as any).__mascotSpeechFunction = speak;

  // Cleanup global function on unmount
  React.useEffect(() => {
    return () => {
      (window as any).__mascotSpeechFunction = null;
    };
  }, []);

  return (
    <SpeechBubbleContext.Provider value={{ speak }}>
      <div className={`relative w-full h-full flex items-center justify-center ${className}`}>
        {/* Ensure this div takes up space! */}
        <div className="absolute inset-0 w-full h-full z-0">
          <VRMCharacter vrmUrl="/vroid/character.vrm" />
          
          {/* Speech Bubble - controlled by React state */}
          <div className="absolute inset-0 pointer-events-none">
            <AnimatePresence>
              {speechBubbleVisible && speechBubbleText && (
                <MascotSpeechBubble
                  text={speechBubbleText}
                  visible={speechBubbleVisible}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Radial Actions Layer */}
          {showRadialActions && mascot.action === 'IDLE' && (
            <div className="absolute inset-0 pointer-events-none z-10">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl shadow-black/20 flex items-center justify-center">
                  <div className="text-white/70 text-sm font-medium">
                    Ready
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </SpeechBubbleContext.Provider>
  );
}

// Export both named and default to satisfy all importers
export default MascotCenterStage;
