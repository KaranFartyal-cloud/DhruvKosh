import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SpeechContextType {
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  setSpeechCallbacks: (setInputValue: (value: string) => void, handleSendMessage: (message: string) => void) => void;
}

const SpeechContext = createContext<SpeechContextType | null>(null);

export const useSpeech = () => {
  const context = useContext(SpeechContext);
  if (!context) throw new Error("useSpeech must be used within SpeechProvider");
  return context;
};

export const SpeechProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isListening, setIsListening] = useState(false);
  
  // 🔥 THE IMMORTAL FLAG (State nahi, Ref use karenge)
  // Ye variable browser ke refresh rate se fast hai.
  const shouldMicBeOn = useRef(false); 

  const recognitionRef = useRef<any>(null);
  const silenceTimer = useRef<any>(null); 
  const currentSentence = useRef(""); 
  
  const setInputValueRef = useRef<(value: string) => void>(() => {});
  const handleSendMessageRef = useRef<(message: string) => void>(() => {});

  // ✅ 1. SETUP RECOGNITION ENGINE
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true; 
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    // --- START EVENT ---
    recognition.onstart = () => {
      console.log("🎙️ Mic Connected.");
      setIsListening(true);
    };

    // --- RESULT EVENT (Processing) ---
    recognition.onresult = (event: any) => {
      // Timer Reset (User abhi bol raha hai)
      if (silenceTimer.current) clearTimeout(silenceTimer.current);

      let interimTranscript = '';
      let finalChunk = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalChunk += transcript + ' ';
        else interimTranscript += transcript;
      }

      if (finalChunk) currentSentence.current += finalChunk;
      
      // UI Update
      if (setInputValueRef.current) {
        setInputValueRef.current(currentSentence.current + interimTranscript);
      }

      // ⏳ AUTO SEND TIMER (2 Seconds Silence)
      silenceTimer.current = setTimeout(() => {
        executeAutoSend();
      }, 2000); 
    };

    // --- � THE IMMORTAL RESTART LOGIC ---
    recognition.onend = () => {
      // Check: Kya USER ne band kiya? (shouldMicBeOn.current)
      if (shouldMicBeOn.current) {
        console.log("⚠️ Browser killed Mic. Restarting IMMEDIATELY...");
        try {
          recognition.start(); // Wapas chalu kar
        } catch (e) {
          console.warn("Mic already starting...");
        }
      } else {
        console.log("🛑 User stopped Mic manually.");
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    
    // Cleanup on unmount
    return () => {
        shouldMicBeOn.current = false;
        recognition.stop();
    };
  }, []); // Dependency array empty rakha hai taaki loop na bane

  // ✅ 2. AUTO SEND FUNCTION
  const executeAutoSend = useCallback(() => {
    const text = currentSentence.current.trim();
    if (!text) return;

    console.log("🚀 Auto-Sending:", text);
    
    // Message Bhejo
    if (handleSendMessageRef.current) handleSendMessageRef.current(text);

    // Buffer Clear karo (Agli line ke liye)
    currentSentence.current = "";
    if (setInputValueRef.current) setInputValueRef.current('');

    // NOTE: Hum yahan Mic STOP nahi kar rahe.
    // shouldMicBeOn.current abhi bhi TRUE hai.
  }, []);

  const setSpeechCallbacks = useCallback((setVal: any, sendMsg: any) => {
    setInputValueRef.current = setVal;
    handleSendMessageRef.current = sendMsg;
  }, []);

  // ✅ 3. MANUAL CONTROLS
  const startListening = useCallback(() => {
    console.log("🟢 Starting Session...");
    shouldMicBeOn.current = true; // LOCK ON
    setIsListening(true);
    try { recognitionRef.current?.start(); } catch(e) {}
  }, []);

  const stopListening = useCallback(() => {
    console.log("🔴 Stopping Session...");
    shouldMicBeOn.current = false; // LOCK OFF
    setIsListening(false);
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    recognitionRef.current?.stop();
  }, []);

  return (
    <SpeechContext.Provider value={{ isListening, startListening, stopListening, setSpeechCallbacks }}>
      {children}
    </SpeechContext.Provider>
  );
};
