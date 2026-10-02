import { useState, useEffect, useRef, useCallback } from 'react';

// Extend the Window interface to include Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface UseSpeechRecognitionProps {
  onInterim?: (text: string) => void; // Live typing in input box
  onFinal?: (text: string) => void;   // Auto-send (same as Enter key)
}

export const useSpeechRecognition = ({ onInterim, onFinal }: UseSpeechRecognitionProps = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 🎤 STABLE: ONE recognizer instance, refs for state tracking
  const recognitionRef = useRef<any>(null);
  const voiceModeRef = useRef(false);
  const isInitializedRef = useRef(false);
  
  // 🎯 CORE: Treat voice as typing
  const handleResult = useCallback((event: any) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    // ✅ LIVE TYPING: Show interim results in input box
    if (interimTranscript && onInterim) {
      onInterim(interimTranscript);
    }

    // ✅ AUTO-SEND: Final result = same as pressing Enter
    if (finalTranscript && onFinal) {
      console.log('🎤 Voice typing complete:', finalTranscript);
      onFinal(finalTranscript.trim());
    }
  }, [onInterim, onFinal]);

  // 🔥 CRITICAL: Initialize ONCE with EMPTY dependencies
  useEffect(() => {
    // Prevent double initialization
    if (isInitializedRef.current) {
      console.log('⚠️ Speech recognition already initialized, skipping...');
      return;
    }
    
    console.log('🔍 Initializing STABLE speech recognition (ONCE ONLY)...');
    isInitializedRef.current = true;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('❌ Speech recognition not supported');
      setError("Browser not supported. Use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    
    // 🎯 SIMPLE: Continuous listening for voice typing
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    // ✅ Handle start
    recognition.onstart = () => {
      console.log('🎙️ Voice typing started');
      setIsListening(true);
      setError(null);
    };

    // ✅ Handle end with auto-restart (if voice mode is still on)
    recognition.onend = () => {
      console.log('🔇 Voice typing ended');
      setIsListening(false);

      // 🔄 Auto-restart if voice mode is still active
      if (voiceModeRef.current && recognitionRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current.start();
            console.log('🔄 Voice typing auto-restarted');
          } catch (err) {
            console.error('❌ Failed to auto-restart:', err);
          }
        }, 100);
      }
    };

    // ✅ Handle errors
    recognition.onerror = (event: any) => {
      console.error("❌ Voice typing error:", event.error);
      
      // Silently ignore no-speech
      if (event.error === 'no-speech') {
        console.log('🤫 No speech detected, continuing to listen...');
        return;
      }
      
      let errorMessage = "Speech recognition error occurred.";
      
      switch (event.error) {
        case 'not-allowed':
          errorMessage = "Microphone permission denied. Please allow microphone access.";
          break;
        case 'audio-capture':
          errorMessage = "Microphone not available or is being used by another application.";
          break;
        case 'network':
          errorMessage = "Network error occurred during speech recognition.";
          break;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
      }
      
      setError(errorMessage);
    };

    // ✅ Set result handler
    recognition.onresult = handleResult;

    recognitionRef.current = recognition;

    console.log('✅ STABLE speech recognition initialized (ONCE)');

    // Cleanup on unmount ONLY
    return () => {
      console.log('🧹 Cleaning up STABLE speech recognition (UNMOUNT ONLY)...');
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          recognitionRef.current.abort();
        } catch (err) {
          console.log('⚠️ Error stopping recognition during cleanup:', err);
        }
        recognitionRef.current = null;
      }
      
      setIsListening(false);
      setError(null);
      voiceModeRef.current = false;
      isInitializedRef.current = false;
    };
  }, [handleResult]); // 🔥 ONLY handleResult in deps, NOT onInterim/onFinal

  // 🎤 SIMPLE START: Just turn on voice typing
  const startListening = useCallback(() => {
    console.log("🎤 Starting voice typing...");
    
    if (!recognitionRef.current) {
      console.log("⚠️ No recognition instance available");
      return;
    }

    voiceModeRef.current = true;

    try {
      recognitionRef.current.start();
      console.log("✅ Voice typing started");
    } catch (error: any) {
      if (error.name === 'InvalidStateError') {
        console.warn("Voice typing already on, syncing state.");
        setIsListening(true);
      } else {
        console.error("Failed to start voice typing:", error);
      }
    }
  }, []);

  // 🔇 SIMPLE STOP: Just turn off voice typing
  const stopListening = useCallback(() => {
    console.log("🔇 Stopping voice typing...");
    
    voiceModeRef.current = false;
    setIsListening(false);
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        console.log("✅ Voice typing stopped");
      } catch (err) {
        console.error("❌ Failed to stop voice typing:", err);
      }
    }
  }, []);

  return { 
    isListening, 
    error, 
    startListening, 
    stopListening
  };
};
