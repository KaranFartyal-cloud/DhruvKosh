import React, { useRef, useState, useEffect, Suspense } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin } from '@pixiv/three-vrm';
import { HumanAnimationController } from '../controllers/HumanAnimationController';
import { useAppStore } from '../store';
import { backendService } from '../services/backend-service';
import { LipSyncSystem } from '../controllers/LipSyncSystem';
import { useRestingFaceEngine } from '../hooks/useRestingFaceEngine';

// Global singleton for Lipsync
if (!(window as any).lipSyncSystem) {
  (window as any).lipSyncSystem = new LipSyncSystem();
}
const getLipSync = () => (window as any).lipSyncSystem as LipSyncSystem;

interface VRMSceneProps {
  vrmUrl: string;
  mode?: 'dashboard' | 'screen'; // ✅ NEW: To isolate logic
  onControllerReady?: (c: any) => void;
}

function VRMLoaderComponent({ vrmUrl, mode = 'dashboard', onControllerReady }: VRMSceneProps) {
  const { setMascotResponse } = useAppStore();
  const { camera, scene } = useThree();
  const [vrm, setVrm] = useState<VRM | null>(null);
  const controllerRef = useRef<HumanAnimationController | null>(null);

  // Apply Advanced Facial Engine
  useRestingFaceEngine({
    vrm: vrm,
    persona: 'DEFAULT', // can be mapped if we have different personas later
    activeEmotion: useAppStore((state) => state.mascot.emotion) || 'NEUTRAL',
    suppressed: false,
    winkActive: false
  });

  // 🔥 DIRECT REF FOR INSTANT ACCESS (No React Lag)
  const latestActionRef = useRef<string>('IDLE'); 
  const latestEmotionRef = useRef<string>('NEUTRAL');

  const isSpeaking = useAppStore((state) => state.mascot.speaking);
  const replyText = useAppStore((state) => state.mascot.replyText);
  const isChatLoading = useAppStore((state) => state.mascot.loading);

  useEffect(() => {
    camera.position.set(0, 1.3, 4); 
    camera.lookAt(0, 1.3, 0); 
  }, [camera]);

  const gltf = useLoader(GLTFLoader, vrmUrl, (loader) => {
    loader.register((parser: any) => new VRMLoaderPlugin(parser));
  });

  useEffect(() => {
    if (!gltf) return;
    const vrmInstance = (gltf as any).userData.vrm;
    if (!vrmInstance) {
      console.error('VRM instance not found in GLTF userData');
      return;
    }
    const controller = new HumanAnimationController(vrmInstance);
    controllerRef.current = controller;
    
    // Expose immediately BEFORE anything else
    (window as any).humanAnimationController = controller;
    (window as any).motionController = controller;
    
    // Play IDLE immediately + retry after 500ms to beat any race condition
    controller.play('IDLE', true);
    setTimeout(() => { controller.play('IDLE', true); }, 500);
    
    if (onControllerReady) onControllerReady(controller);
    
    // ✅ STORE FUNCTIONS: Store data in Ref immediately
    backendService.setStoreFunctions(
        (action: any) => {
            console.log("⚡ Instant Action Update:", action);
            latestActionRef.current = action;
            controller.play(action);
        },
        (emotion: any) => {
            console.log("⚡ Instant Emotion Update:", emotion);
            latestEmotionRef.current = emotion;
            controller.applyEmotion(emotion);
        },
        (response: any) => {
            setMascotResponse(response);
            if(response.mascotAction) latestActionRef.current = response.mascotAction;
            if(response.emotion) latestEmotionRef.current = response.emotion;
        }
    );
    
    setVrm(vrmInstance);
    return () => { scene.remove(vrmInstance.scene); };
  }, [gltf]);

  // ✅ ISOLATED LOGIC ENGINE
  useEffect(() => {
    if (!controllerRef.current) return;

    // 🛑 DASHBOARD MODE: Purana saara logic (Backend + Idle + Speaking)
    if (mode === 'dashboard') {
      if (isChatLoading) {
        controllerRef.current.play('THINKING', true);
        controllerRef.current.applyEmotion('THINKING');
      } 
      else if (isSpeaking && replyText) {
        const backendAction = latestActionRef.current || 'IDLE';
        const backendEmotion = latestEmotionRef.current || 'NEUTRAL';

        controllerRef.current.applyEmotion(backendEmotion);

        // Standard Backend Animation Rules
        const specialActions = ['WAVE', 'VICTORY', 'SAD', 'ANGRY', 'THANKFUL'];
        if (specialActions.includes(backendAction)) {
          controllerRef.current.play(backendAction, true);
        } else if (replyText.length > 40) {
          controllerRef.current.play('SPEAKING', true);
        } else {
          controllerRef.current.play('IDLE'); // ✅ IDLE always works here
        }
      } 
      else {
        controllerRef.current.play('IDLE'); // ✅ Normal IDLE for Chat
      }
    } 
    // 🛑 SCREEN MODE: No automatic IDLE, let the screen control it
    else if (mode === 'screen') {
      // Manual control
    }
  }, [isSpeaking, replyText, isChatLoading, mode]); // ✅ Mode added to deps

  useFrame((state, delta) => {
    if (vrm && controllerRef.current) {
      controllerRef.current.update(Math.min(delta, 0.033));
      
      const lipSync = getLipSync();
      if (lipSync.isPlaying) {
        const mouth = lipSync.getVowelValues();
        vrm.expressionManager?.setValue('aa', mouth.vowelA);
        vrm.expressionManager?.setValue('ee', mouth.vowelE);
        vrm.expressionManager?.setValue('ih', mouth.vowelI);
        vrm.expressionManager?.setValue('oh', mouth.vowelO);
        vrm.expressionManager?.setValue('ou', mouth.vowelU);
      } else {
        // Reset mouth if not playing
        vrm.expressionManager?.setValue('aa', 0);
        vrm.expressionManager?.setValue('ee', 0);
        vrm.expressionManager?.setValue('ih', 0);
        vrm.expressionManager?.setValue('oh', 0);
        vrm.expressionManager?.setValue('ou', 0);
      }

      vrm.update(2);
    }
  });

  return vrm ? <primitive object={vrm.scene} /> : null;
}

export function VRMScene(props: any) {
  return (
    <Suspense fallback={null}>
      <VRMLoaderComponent {...props} />
    </Suspense>
  );
}
