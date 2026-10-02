import { create } from 'zustand';

export enum AvatarState {
  LOADING = 'LOADING',
  INTRO = 'INTRO',
  IDLE = 'IDLE',
  LISTENING = 'LISTENING', 
  THINKING = 'THINKING',
  SPEAKING = 'SPEAKING',
  GESTURE = 'GESTURE'
}

export interface AvatarStateStore {
  currentState: AvatarState;
  previousState: AvatarState;
  isTransitioning: boolean;
  
  // Actions
  setState: (state: AvatarState) => void;
  transitionTo: (state: AvatarState) => void;
  reset: () => void;
}

export const useAvatarState = create<AvatarStateStore>((set, get) => ({
  currentState: AvatarState.LOADING,
  previousState: AvatarState.LOADING,
  isTransitioning: false,

  setState: (state: AvatarState) => {
    const { currentState } = get();
    set({
      currentState: state,
      previousState: currentState,
      isTransitioning: false
    });
  },

  transitionTo: (state: AvatarState) => {
    const { currentState } = get();
    set({
      currentState: state,
      previousState: currentState,
      isTransitioning: true
    });
    
    // Clear transition flag after a short delay
    setTimeout(() => {
      set({ isTransitioning: false });
    }, 500);
  },

  reset: () => {
    set({
      currentState: AvatarState.LOADING,
      previousState: AvatarState.LOADING,
      isTransitioning: false
    });
  }
}));
