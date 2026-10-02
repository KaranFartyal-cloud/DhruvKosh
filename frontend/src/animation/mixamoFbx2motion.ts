import * as THREE from "three";
import { VRM, VRMHumanBoneName } from "@pixiv/three-vrm";

export interface MotionExpression {
  clip: THREE.AnimationClip;
}

export function mixamoFbx2motion(
  fbxObject: THREE.Group,
  vrm: VRM,
  onProgress?: (name: string, progress: number) => void
): MotionExpression {
  const clip = THREE.AnimationClip.findByName(fbxObject.animations, "mixamo.com");
  
  if (!clip) {
      console.error("No mixamo.com animation found in FBX");
      return { clip: new THREE.AnimationClip("error", 0, []) };
  }

  const tracks: THREE.KeyframeTrack[] = [];
  const restRotationInverse = new THREE.Quaternion();
  const parentRestWorldRotation = new THREE.Quaternion();
  const _quatA = new THREE.Quaternion();
  const _vec3 = new THREE.Vector3();

  // Adjust Hips Height
  const motionHipsHeight = fbxObject.getObjectByName("mixamorigHips")?.position.y ?? 1;
  const vrmHips = vrm.humanoid?.getNormalizedBoneNode("hips");
  const vrmHipsY = vrmHips?.getWorldPosition(_vec3).y ?? 0;
  const vrmRootY = vrm.scene.getWorldPosition(_vec3).y;
  const vrmHipsHeight = Math.abs(vrmHipsY - vrmRootY);
  const hipsPositionScale = vrmHipsHeight / (motionHipsHeight === 0 ? 1 : motionHipsHeight);

  clip.tracks.forEach((track) => {
    const trackSplitted = track.name.split(".");
    const mixamoRigName = trackSplitted[0];
    const vrmBoneName = mixamoVRMRigMap[mixamoRigName];
    const vrmNodeName = vrm.humanoid?.getNormalizedBoneNode(vrmBoneName)?.name;

    if (vrmNodeName != null) {
      const propertyName = trackSplitted[1];
      const mixamoRigNode = fbxObject.getObjectByName(mixamoRigName);

      if (track instanceof THREE.QuaternionKeyframeTrack) {
        mixamoRigNode?.getWorldQuaternion(restRotationInverse).invert();
        mixamoRigNode?.parent?.getWorldQuaternion(parentRestWorldRotation);

        for (let i = 0; i < track.values.length; i += 4) {
          const flatQuaternion = track.values.slice(i, i + 4);
          _quatA.fromArray(flatQuaternion);
          _quatA.premultiply(parentRestWorldRotation).multiply(restRotationInverse);
          _quatA.toArray(flatQuaternion);
          flatQuaternion.forEach((v, index) => {
            track.values[index + i] = v;
          });
        }

        tracks.push(
          new THREE.QuaternionKeyframeTrack(
            `${vrmNodeName}.${propertyName}`,
            track.times,
            track.values.map((v, i) => (vrm.meta?.metaVersion === "0" && i % 2 === 0 ? -v : v))
          )
        );
      } else if (track instanceof THREE.VectorKeyframeTrack) {
        const value = track.values.map(
          (v, i) => (vrm.meta?.metaVersion === "0" && i % 3 !== 1 ? -v : v) * hipsPositionScale
        );
        tracks.push(
          new THREE.VectorKeyframeTrack(
            `${vrmNodeName}.${propertyName}`,
            track.times,
            value
          )
        );
      }
    }
  });

  return {
    clip: new THREE.AnimationClip("vrmAnimation", clip.duration, tracks),
  };
}

const mixamoVRMRigMap: Record<string, VRMHumanBoneName> = {
  mixamorigHips: "hips",
  mixamorigSpine: "spine",
  mixamorigSpine1: "chest",
  mixamorigSpine2: "upperChest",
  mixamorigNeck: "neck",
  mixamorigHead: "head",
  mixamorigLeftShoulder: "leftShoulder",
  mixamorigLeftArm: "leftUpperArm",
  mixamorigLeftForeArm: "leftLowerArm",
  mixamorigLeftHand: "leftHand",
  mixamorigLeftHandThumb1: "leftThumbProximal",
  mixamorigLeftHandThumb2: "leftThumbMetacarpal",
  mixamorigLeftHandThumb3: "leftThumbDistal",
  mixamorigLeftHandIndex1: "leftIndexProximal",
  mixamorigLeftHandIndex2: "leftIndexIntermediate",
  mixamorigLeftHandIndex3: "leftIndexDistal",
  mixamorigLeftHandMiddle1: "leftMiddleProximal",
  mixamorigLeftHandMiddle2: "leftMiddleIntermediate",
  mixamorigLeftHandMiddle3: "leftMiddleDistal",
  mixamorigLeftHandRing1: "leftRingProximal",
  mixamorigLeftHandRing2: "leftRingIntermediate",
  mixamorigLeftHandRing3: "leftRingDistal",
  mixamorigLeftHandPinky1: "leftLittleProximal",
  mixamorigLeftHandPinky2: "leftLittleIntermediate",
  mixamorigLeftHandPinky3: "leftLittleDistal",
  mixamorigRightShoulder: "rightShoulder",
  mixamorigRightArm: "rightUpperArm",
  mixamorigRightForeArm: "rightLowerArm",
  mixamorigRightHand: "rightHand",
  mixamorigRightHandThumb1: "rightThumbProximal",
  mixamorigRightHandThumb2: "rightThumbMetacarpal",
  mixamorigRightHandThumb3: "rightThumbDistal",
  mixamorigRightHandIndex1: "rightIndexProximal",
  mixamorigRightHandIndex2: "rightIndexIntermediate",
  mixamorigRightHandIndex3: "rightIndexDistal",
  mixamorigRightHandMiddle1: "rightMiddleProximal",
  mixamorigRightHandMiddle2: "rightMiddleIntermediate",
  mixamorigRightHandMiddle3: "rightMiddleDistal",
  mixamorigRightHandRing1: "rightRingProximal",
  mixamorigRightHandRing2: "rightRingIntermediate",
  mixamorigRightHandRing3: "rightRingDistal",
  mixamorigRightHandPinky1: "rightLittleProximal",
  mixamorigRightHandPinky2: "rightLittleIntermediate",
  mixamorigRightHandPinky3: "rightLittleDistal",
  mixamorigLeftUpLeg: "leftUpperLeg",
  mixamorigLeftLeg: "leftLowerLeg",
  mixamorigLeftFoot: "leftFoot",
  mixamorigLeftToeBase: "leftToes",
  mixamorigRightUpLeg: "rightUpperLeg",
  mixamorigRightLeg: "rightLowerLeg",
  mixamorigRightFoot: "rightFoot",
  mixamorigRightToeBase: "rightToes",
};
