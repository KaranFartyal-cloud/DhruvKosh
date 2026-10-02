import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { playLipSync } from '../utils/LipSyncEngine';
import { MascotAction, Emotion } from '../types/animations'; // ✅ FIXED: Import from types

// Re-export types for convenience
export { MascotAction, Emotion } from '../types/animations';

// ==========================================
// 💬 CHAT MESSAGE INTERFACE
// ==========================================

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

interface MascotState {
  action: MascotAction;
  emotion: Emotion;
  speaking: boolean;
  replyText: string | null;
  voiceMeta: any;
  animationLocked: boolean; // ✅ NEW: Prevent animation interruptions
  lastAiResponse: any; // ✅ NEW: Store last AI response for emotion sync
  loading: boolean; // ✅ NEW: Chat loading state for thinking animation
  chatHistory: ChatMessage[]; // ✅ NEW: History Array
}

interface VoiceState {
  isEnabled: boolean;
  isSpeaking: boolean;
  speech: string | null;
  volume: number;
  rate: number;
  pitch: number;
}

interface AppState {
  // User state
  userName: string;
  userEmail: string;
  
  // Mascot state
  mascot: MascotState;
  
  // Voice state
  voiceState: VoiceState;
  
  // UI state
  sidebarOpen: boolean;
  activeModule: string;
  loading: boolean;
  error: string | null;
  highlightedSection: string | null;
  
  // Cache
  cache: {
    attendanceStatus: any;
    studyPlan: any;
    careerAnalysis: any;
    wellnessData: any;
    codingStatus: any;
  };
}

interface AppActions {
  // User actions
  updateProfile: (data: { name?: string; email?: string }) => void;
  
  // Mascot actions
  setMascotAction: (action: MascotAction) => void;
  setMascotEmotion: (emotion: Emotion) => void;
  setMascotSpeaking: (speaking: boolean) => void;
  setMascotResponse: (response: { replyText: string | null; voiceMeta: any }) => void;
  
  // Animation lock actions
  lockAnimation: () => void;
  unlockAnimation: () => void;
  
  // Voice actions
  setVoiceEnabled: (enabled: boolean) => void;
  setVoiceSpeaking: (isSpeaking: boolean, speech?: string) => void;
  setVoiceSettings: (settings: { volume?: number; rate?: number; pitch?: number }) => void;
  
  // UI actions
  setActiveModule: (module: string) => void;
  setSidebarOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setHighlightedSection: (section: string | null) => void;
  
  // Cache actions
  updateCache: (key: string, data: any) => void;
  clearCache: () => void;
  
  // Chat History actions
  addChatMessage: (role: 'user' | 'assistant', text: string) => void;
  clearChatHistory: () => void;
}

type AppStore = AppState & AppActions;

export const useAppStore = create<AppStore>((set, get) => ({
  // User state
  userName: 'Alex',
  userEmail: 'alex@example.com',
  
  // Mascot state
  mascot: {
    action: MascotAction.IDLE,
    emotion: Emotion.FRIENDLY,
    speaking: false,
    replyText: null,
    voiceMeta: null,
    animationLocked: false, // NEW: Prevent animation interruptions
    lastAiResponse: null, // NEW: Store last AI response for emotion sync
    loading: false, // NEW: Chat loading state for thinking animation
    chatHistory: [], // NEW: History Array
  },
  
  voiceState: {
    isEnabled: true,
    isSpeaking: false,
    speech: null,
    volume: 1.0,
    rate: 1.0,
    pitch: 1.0,
  },
  
  sidebarOpen: false,
  activeModule: 'dashboard',
  loading: false,
  error: null,
  highlightedSection: null,
  
  cache: {
    attendanceStatus: null,
    studyPlan: null,
    careerAnalysis: null,
    wellnessData: null,
    codingStatus: null,
  },

  // User actions
  updateProfile: (data: { name?: string; email?: string }) => set((state) => ({
    userName: data.name || state.userName,
    userEmail: data.email || state.userEmail,
  })),
  
  // Mascot actions
  setMascotAction: (action: MascotAction) => set((state) => ({
    mascot: {
      ...state.mascot,
      action,
    },
  })),
  setMascotEmotion: (emotion: Emotion) => set((state) => ({
    mascot: {
      ...state.mascot,
      emotion,
    },
  })),

  setMascotSpeaking: (speaking: boolean) => set((state) => ({
    mascot: {
      ...state.mascot,
      speaking,
    },
  })),

  setMascotResponse: (response: { replyText: string | null; voiceMeta: any }) => set((state) => ({
    mascot: { 
      ...state.mascot, 
      replyText: response.replyText,
      voiceMeta: response.voiceMeta
    },
  })),

  // ✅ NEW: Animation lock management
  setAnimationLocked: (locked: boolean) => set((state) => ({
    mascot: { ...state.mascot, animationLocked: locked }
  })),
  
  lockAnimation: () => set((state) => ({
    mascot: { ...state.mascot, animationLocked: true }
  })),
  
  unlockAnimation: () => set((state) => ({
    mascot: { ...state.mascot, animationLocked: false }
  })),
  
  // Voice actions
  setVoiceEnabled: (enabled: boolean) => set((state) => ({
    voiceState: { ...state.voiceState, isEnabled: enabled },
  })),
  
  setVoiceSpeaking: (isSpeaking: boolean, speech?: string) => set((state) => ({
    voiceState: { 
      ...state.voiceState, 
      isSpeaking, 
      speech: speech || null 
    },
  })),
  
  setVoiceSettings: (settings: { volume?: number; rate?: number; pitch?: number }) => set((state) => ({
    voiceState: { 
      ...state.voiceState, 
      ...settings 
    },
  })),
  
  
  // UI actions
  setActiveModule: (module: string) => set((state) => ({
    activeModule: module,
  })),
  
  setSidebarOpen: (open: boolean) => set((state) => ({
    sidebarOpen: open,
  })),
  
  setLoading: (loading: boolean) => set((state) => ({
    loading,
  })),
  
  setError: (error: string | null) => set((state) => ({
    error,
  })),
  
  setHighlightedSection: (section: string | null) => set((state) => ({
    highlightedSection: section,
  })),
  
  // Cache actions
  updateCache: (key: string, data: any) => set((state) => ({ cache: { ...state.cache, [key]: data } })),
  clearCache: () => set((state) => ({ 
    cache: {
      attendanceStatus: null,
      studyPlan: null,
      careerAnalysis: null,
      wellnessData: null,
      codingStatus: null
    }
  })),
  
  // Chat History actions
  addChatMessage: (role: 'user' | 'assistant', text: string) => set((state) => ({
    mascot: {
      ...state.mascot,
      chatHistory: [...state.mascot.chatHistory, { 
        id: Date.now().toString(), 
        role, 
        text, 
        timestamp: new Date() 
      }]
    }
  })),
  
  clearChatHistory: () => set((state) => ({
    mascot: {
      ...state.mascot,
      chatHistory: []
    }
  })),
}));
