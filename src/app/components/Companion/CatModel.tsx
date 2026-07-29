import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';

interface Props {
  color: string;
  scale?: number;
  // Real .glb/.gltf model to render in place of the placeholder capsule. Falls back to
  // the capsule when omitted or while a model swap is pending (e.g. no orange cat yet).
  modelUrl?: string;
  // Draws an outline around the model itself (in-scene, not an HTML overlay) — used for
  // the Ctrl-hover hint before a Ctrl+wheel resize.
  highlighted?: boolean;
}

// Outline color for the Ctrl-hover highlight, matching --color-primary from root.css.
const HIGHLIGHT_COLOR = '#73a5cc';

const ModelOutline: React.FC<{ size: THREE.Vector3; center: THREE.Vector3 }> = ({ size, center }) => {
  const edges = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(size.x, size.y, size.z)),
    [size]
  );
  return (
    <lineSegments position={center} geometry={edges}>
      <lineBasicMaterial color={HIGHLIGHT_COLOR} />
    </lineSegments>
  );
};

// Placeholder body used until a real model is assigned — keeps the overlay/unlock system
// fully wired and swappable without touching CompanionOverlay or the store.
const CatCapsule: React.FC<{ color: string; highlighted?: boolean }> = ({ color, highlighted }) => (
  <>
    <mesh castShadow>
      <capsuleGeometry args={[0.18, 0.32, 4, 8]} />
      <meshStandardMaterial color={color} />
    </mesh>
    {highlighted && <ModelOutline size={new THREE.Vector3(0.36, 0.68, 0.36)} center={new THREE.Vector3(0, 0, 0)} />}
  </>
);

// Target size (largest bounding-box dimension, in scene units) each glTF model gets
// normalized to — matches roughly what the placeholder capsule occupied, so swapping in
// models exported at wildly different native scales (this one is ~40 units wide as
// authored) doesn't require hand-tuning a magic number per file.
const TARGET_MODEL_SIZE = 0.6;

// Real .glb/.gltf body — auto-normalizes scale from the model's own bounding box and plays
// its baked-in animation clip in place (bone motion only — CompanionOverlay owns the
// group's position/rotation from drag and scroll input, so this never translates itself).
// useGLTF caches by URL, so both cats sharing a placeholder model only fetch it once.
const CatGltfBody: React.FC<{ url: string; highlighted?: boolean }> = ({ url, highlighted }) => {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(url);
  // Plain Object3D.clone(true) does not rebind SkinnedMesh bones to the cloned skeleton —
  // it leaves them pointing at the original bones, which corrupts vertex positions into a
  // huge, malformed shape. SkeletonUtils.clone rebinds bones correctly for skinned models.
  const clonedScene = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions, names } = useAnimations(animations, groupRef);

  const { normalizedScale, outlineSize, outlineCenter } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clonedScene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const largestDimension = Math.max(size.x, size.y, size.z);
    const scale = largestDimension > 0 ? TARGET_MODEL_SIZE / largestDimension : 1;
    return { normalizedScale: scale, outlineSize: size.multiplyScalar(scale), outlineCenter: center.multiplyScalar(scale) };
  }, [clonedScene]);

  useEffect(() => {
    const clipName = names[0];
    if (!clipName) return;
    const action = actions[clipName];
    action?.reset().fadeIn(0.3).play();
    return () => {
      action?.fadeOut(0.3);
    };
  }, [actions, names]);

  return (
    <group ref={groupRef}>
      <group scale={normalizedScale}>
        <primitive object={clonedScene} />
      </group>
      {highlighted && <ModelOutline size={outlineSize} center={outlineCenter} />}
    </group>
  );
};

// User-placed companion body — CompanionOverlay owns position/rotation from drag and
// scroll input; this only plays the model's own bone animation in place, it never
// translates itself.
export const CatModel: React.FC<Props> = ({ color, scale = 1, modelUrl, highlighted }) => (
  <group scale={scale}>
    {modelUrl ? (
      <Suspense fallback={<CatCapsule color={color} highlighted={highlighted} />}>
        <CatGltfBody url={modelUrl} highlighted={highlighted} />
      </Suspense>
    ) : (
      <CatCapsule color={color} highlighted={highlighted} />
    )}
  </group>
);
