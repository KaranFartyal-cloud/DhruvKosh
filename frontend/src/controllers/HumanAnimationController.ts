import * as THREE from 'three';
import { VRM, VRMExpressionPresetName } from '@pixiv/three-vrm';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { MascotAction } from '../services/api-client';
import { mixamoFbx2motion } from '../animation/mixamoFbx2motion';

const ANIMATION_FILES: Record<string, string> = {
  'IDLE': '/animations/idle.fbx',
  'FEMINEIDLE': '/animations/idle.fbx',
  'BREATHINGIDLE': '/animations/breathing.fbx',
  'BREATHING': '/animations/breathing.fbx',
  'THINKING': '/animations/thinking.fbx',
  'SPEAKING': '/animations/talking.fbx',
  'ANGRY': '/animations/angrypoint.fbx',
  'THANKFUL': '/animations/thankful.fbx',
  'VICTORY': '/animations/victory.fbx',
  'SAD': '/animations/sadidle.fbx',
  'WAVE': '/animations/wave.fbx',
  'WALKING': '/animations/walking.fbx',
  'DEFEAT': '/animations/defeat.fbx'
};

export class HumanAnimationController {
  public vrm: VRM;
  public mixer: THREE.AnimationMixer;
  private currentAction: THREE.AnimationAction | null = null;
  private currentMascotAction: string = 'IDLE';
  private clipCache: Map<string, THREE.AnimationClip> = new Map();
  private loader = new FBXLoader();

  constructor(vrm: VRM) {
    this.vrm = vrm;
    this.mixer = new THREE.AnimationMixer(vrm.scene);
    this.play('IDLE', true); 
  }

  public update(deltaTime: number) {
    this.mixer.update(deltaTime);
  }

  public applyEmotion(emotion: string) {
    if (!this.vrm || !this.vrm.expressionManager) return;
    const manager = this.vrm.expressionManager;
    
    [
      VRMExpressionPresetName.Happy, 
      VRMExpressionPresetName.Angry, 
      VRMExpressionPresetName.Sad, 
      VRMExpressionPresetName.Relaxed, 
      VRMExpressionPresetName.Surprised, 
      VRMExpressionPresetName.Neutral
    ].forEach(p => manager.setValue(p, 0));

    const emo = String(emotion || 'NEUTRAL').toUpperCase();

    if (['HAPPY', 'FRIENDLY', 'CELEBRATORY', 'EXCITED', 'VICTORY', 'GOOD'].includes(emo)) {
      manager.setValue(VRMExpressionPresetName.Happy, 1.0);
    }
    else if (['SAD', 'DISAPPOINTED', 'SORRY'].includes(emo)) {
      manager.setValue(VRMExpressionPresetName.Sad, 1.0);
    }
    else if (['ANGRY', 'FRUSTRATED', 'HATE'].includes(emo)) {
      manager.setValue(VRMExpressionPresetName.Angry, 1.0);
    }
    else if (['SURPRISED', 'SHOCKED', 'WOW'].includes(emo)) {
      manager.setValue(VRMExpressionPresetName.Surprised, 1.0);
    }
    else if (['CALM', 'RELAXED', 'PEACE'].includes(emo)) {
      manager.setValue(VRMExpressionPresetName.Relaxed, 1.0);
    }
    else if (['THINKING', 'CONFUSED', 'SERIOUS', 'FOCUS'].includes(emo)) {
      manager.setValue(VRMExpressionPresetName.Sad, 0.2);
      manager.setValue(VRMExpressionPresetName.Neutral, 0.8);
    }
    else if (['SUPPORTIVE', 'HELPFUL', 'THANKFUL'].includes(emo)) {
      manager.setValue(VRMExpressionPresetName.Happy, 0.6);
      manager.setValue(VRMExpressionPresetName.Relaxed, 0.4);
    }
    else {
      manager.setValue(VRMExpressionPresetName.Neutral, 1.0);
    }
  }

  public applyFacialEmotion(emotion: string) {
    this.applyEmotion(emotion);
  }

  public applyAnimePersonaFace(emotion: string, _weight?: number) {
    this.applyEmotion(emotion);
  }

  public handleServerResponse(data: any) {
    if (data.mascotAction) {
      this.play(data.mascotAction);
    }
    if (data.emotion) {
      this.applyEmotion(data.emotion);
    }
  }

  public async play(actionName: string, force: boolean = false) {
    const actionKey = String(actionName || 'IDLE').toUpperCase();

    if (this.currentMascotAction === actionKey && !force) return;
    
    const path = ANIMATION_FILES[actionKey] || ANIMATION_FILES['IDLE'];
    if (!path) {
      console.warn(`⚠️ Animation [${actionKey}] not found. Fallback to IDLE.`);
      if (actionKey !== 'IDLE') this.play('IDLE');
      return;
    }

    try {
      const clip = await this.loadClip(path);
      const newAction = this.mixer.clipAction(clip);
      
      if (this.currentAction) this.currentAction.fadeOut(0.4);

      newAction.reset().fadeIn(0.4).play();
      this.currentAction = newAction;
      this.currentMascotAction = actionKey;

      const isLoop = ['IDLE', 'THINKING', 'SPEAKING', 'BREATHING', 'BREATHINGIDLE', 'FEMINEIDLE'].includes(actionKey);
      
      newAction.setLoop(isLoop ? THREE.LoopRepeat : THREE.LoopOnce, isLoop ? Infinity : 1);
      newAction.clampWhenFinished = !isLoop;

      if (!isLoop) {
        const onFinished = (e: any) => {
          if (e.action === newAction) {
            this.mixer.removeEventListener('finished', onFinished);
            this.play('IDLE'); 
          }
        };
        this.mixer.addEventListener('finished', onFinished);
      }
    } catch (err) {
      console.error("Rig Sync Error:", err);
    }
  }

  public async playAnimation(actionKey: string) {
    return this.play(actionKey);
  }

  private async loadClip(path: string): Promise<THREE.AnimationClip> {
    if (this.clipCache.has(path)) return this.clipCache.get(path)!;
    return new Promise((resolve, reject) => {
      this.loader.load(
        path,
        (fbx) => {
          try {
            const motion = mixamoFbx2motion(fbx, this.vrm);
            this.clipCache.set(path, motion.clip);
            resolve(motion.clip);
          } catch (e) {
            reject(e);
          }
        },
        undefined,
        (err) => {
          console.error(`Failed to load FBX animation at ${path}:`, err);
          reject(err);
        }
      );
    });
  }

  public setEmotion(emotion: any) {
    this.applyEmotion(String(emotion));
  }
}
