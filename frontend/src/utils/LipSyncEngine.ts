import { VRM, VRMExpressionPresetName } from '@pixiv/three-vrm';

// ==========================================
// 👄 VISEME MAP (A/E/I/O/U phonemes)
// ==========================================

const VISEME_MAP: Record<string, VRMExpressionPresetName> = {
  'a': VRMExpressionPresetName.Aa,
  'e': VRMExpressionPresetName.Ee,
  'i': VRMExpressionPresetName.Ih,
  'o': VRMExpressionPresetName.Oh,
  'u': VRMExpressionPresetName.Ou,
};

// ==========================================
// 🔤 PHONEME PARSER (lightweight, fast)
// ==========================================

function extractVisemes(text: string): string[] {
  return text
    .toLowerCase()
    .split('')
    .filter(c => 'aeiou'.includes(c));
}

// ==========================================
// ⏰ DELAY HELPER
// ==========================================

const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// ==========================================
// 🎭 LIP SYNC ENGINE (VTuber-grade)
// ==========================================

export class LipSyncEngine {
  private vrm: VRM;
  private isPlaying: boolean = false;
  private currentAnimation: Promise<void> | null = null;
  private intensityMultiplier: number = 1.0;

  constructor(vrm: VRM) {
    this.vrm = vrm;
  }

  // ✅ CORE: Text → Phonemes → Visemes → BlendShapes (RETURNS PROMISE)
  public async playLipSync(text: string): Promise<void> {
    if (this.isPlaying) {
      // Stop current animation and start new one
      this.stop();
    }

    this.isPlaying = true;
    
    try {
      await this.animateLipSync(text);
    } finally {
      this.isPlaying = false;
    }
  }

  // ✅ ANIMATION: Sequential viseme animation
  private async animateLipSync(text: string): Promise<void> {
    const visemes = extractVisemes(text);
    
    if (visemes.length === 0) {
      console.log('👄 No visemes found in text:', text);
      return;
    }

    console.log('👄 Starting lipsync for visemes:', visemes);

    for (const viseme of visemes) {
      if (!this.isPlaying) break; // Allow interruption
      
      const expression = VISEME_MAP[viseme];
      if (!expression || !this.vrm.expressionManager) continue;

      // 🔥 SET: Apply viseme blendshape
      this.vrm.expressionManager.setValue(expression, 1.0);
      this.vrm.expressionManager.update();

      // ⏰ HOLD: Keep viseme for natural duration (80ms is good)
      await delay(80);

      // 🔥 RESET: Clear viseme
      this.vrm.expressionManager.setValue(expression, 0.0);
      this.vrm.expressionManager.update();

      // ⏰ GAP: Small gap between visemes (20ms feels natural)
      await delay(20);
    }

    console.log('👄 Lipsync animation completed');
  }

  // ✅ EMOTION-AWARE TUNING: Adjust lip sync intensity based on emotion
  public updateLipSync(audioLevel: number, currentEmotion: string) {
    if (!this.vrm) return;

    // Intensity scaling based on emotion
    let multiplier = 1.0;
    if (currentEmotion === 'SUPPORTIVE') multiplier = 1.2; // Wider mouth for happiness
    if (currentEmotion === 'SERIOUS') multiplier = 0.8;    // Tightened lips for seriousness

    const openValue = Math.min(audioLevel * 10 * multiplier, 1.0);
    
    // Applying to standard VRM 'aa' (mouth open) shape
    this.vrm.expressionManager?.setValue('aa', openValue);
  }

  // ✅ DYNAMIC INTENSITY: Set intensity multiplier for emotion
  public setIntensity(val: number) {
    this.intensityMultiplier = val;
  }

  public update(audioLevel: number) {
    if (!this.vrm?.expressionManager) return;
    
    // Intensity applied to 'aa' (mouth open) viseme
    const openValue = Math.min(audioLevel * 12 * this.intensityMultiplier, 1.0);
    this.vrm.expressionManager.setValue('aa', openValue);
  }

  // ✅ STOP: Interrupt current animation
  public stop(): void {
    if (!this.isPlaying) return;

    console.log('👄 Stopping lipsync animation');
    this.isPlaying = false;

    // Clear all viseme expressions
    if (this.vrm.expressionManager) {
      Object.values(VISEME_MAP).forEach(expression => {
        this.vrm.expressionManager!.setValue(expression, 0.0);
      });
      this.vrm.expressionManager.update();
    }
  }

  // ✅ STATUS: Check if currently playing
  public get isLipSyncPlaying(): boolean {
    return this.isPlaying;
  }

  // ✅ CLEANUP: Dispose resources
  public dispose(): void {
    this.stop();
  }
}

// ==========================================
// 🛡️ BULLETPROOF GLOBAL INSTANCE
// ==========================================

// Window object pe save karenge taaki refresh hone par bhi data na ude
const getGlobalInstance = () => (window as any)._lipSyncInstance;
const setGlobalInstance = (instance: LipSyncEngine | null) => (window as any)._lipSyncInstance = instance;

export const initializeLipSync = (vrm: VRM): LipSyncEngine => {
  const current = getGlobalInstance();
  if (current && typeof current.stop === 'function') {
    current.stop();
  }
  
  const newInstance = new LipSyncEngine(vrm);
  setGlobalInstance(newInstance);
  console.log('✅ 👄 Lipsync Engine Initialized Globally');
  return newInstance;
};

export const getLipSync = (): LipSyncEngine | null => {
  const instance = getGlobalInstance();
  if (!instance) {
    console.warn('⚠️ Lipsync engine not initialized yet');
  }
  return instance;
};

// Convenience wrappers
export const playLipSync = async (text: string) => {
  const engine = getLipSync();
  if (engine) await engine.playLipSync(text);
};

export const stopLipSync = () => {
  const engine = getLipSync();
  if (engine) engine.stop();
};
