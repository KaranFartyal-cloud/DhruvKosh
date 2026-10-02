import { useState, useCallback } from 'react';

export interface SpeechState {
  isSpeaking: boolean;
  text: string;
  startTime: number | null;
}

export const useSpeechState = () => {
  const [speechState, setSpeechState] = useState<SpeechState>({
    isSpeaking: false,
    text: '',
    startTime: null
  });

  const startSpeaking = useCallback((text: string) => {
    console.log('🗣️ useSpeechState: Starting speech for:', text.substring(0, 50));
    setSpeechState({
      isSpeaking: true,
      text,
      startTime: Date.now()
    });
  }, []);

  const stopSpeaking = useCallback(() => {
    console.log('🔇 useSpeechState: Stopping speech');
    setSpeechState({
      isSpeaking: false,
      text: '',
      startTime: null
    });
  }, []);

  const getSpeakingDuration = useCallback(() => {
    if (!speechState.startTime) return 0;
    return Date.now() - speechState.startTime;
  }, [speechState.startTime]);

  return {
    speechState,
    startSpeaking,
    stopSpeaking,
    getSpeakingDuration,
    isSpeaking: speechState.isSpeaking
  };
};
