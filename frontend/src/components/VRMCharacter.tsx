import React, { useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { VRMScene } from './VRMScene';
import { HumanAnimationController } from '../controllers/HumanAnimationController';

interface VRMCharacterProps {
  vrmUrl: string;
  onVrmLoaded?: (vrm: any) => void;
}

/**
 * DOM-level wrapper component for VRM character
 * ONLY contains Canvas setup - no R3F hooks here
 */
export const VRMCharacter: React.FC<VRMCharacterProps> = ({ vrmUrl, onVrmLoaded }) => {
  const motionControllerRef = useRef<HumanAnimationController | null>(null);
  
  // Expose controller for external use
  useEffect(() => {
    // Make controller available globally for TTS and other systems
    (window as any).motionController = motionControllerRef.current;
    (window as any).__animationController = motionControllerRef.current; // For emotion debug panel
  }, []);
  
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 1.4, 5.2], fov: 38 }}
        gl={{ 
          alpha: true, 
          antialias: !isMobile, // 🔥 Disable heavy AA on mobile
          powerPreference: "high-performance", // 🔥 Tell browser to use dedicated GPU if available
        }}
        dpr={isMobile ? 1 : [1, 1.5]} // 🔥 Force 1x pixel ratio on mobile to save processing power
        performance={{ min: 0.5 }} // Allows R3F to scale down performance if needed
      >
        <ambientLight intensity={1} />
        <directionalLight position={[5, 5, 5]} intensity={1} />

        <VRMScene 
          vrmUrl={vrmUrl} 
          onVrmLoaded={onVrmLoaded}
          onControllerReady={(controller: HumanAnimationController) => {
            motionControllerRef.current = controller;
            // Set global references immediately when controller is ready
            (window as any).motionController = controller;
            (window as any).__animationController = controller;
          }}
        />
      </Canvas>
    </div>
  );
};
