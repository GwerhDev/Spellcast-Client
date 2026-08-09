import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations, Sparkles } from '@react-three/drei';
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

// Matches --color-primary from root.css — used for the Ctrl-hover outline and the loading
// spinner, both UI accents rather than the companion's own body color.
const PRIMARY_COLOR = '#73a5cc';

const ModelOutline: React.FC<{ size: THREE.Vector3; center: THREE.Vector3 }> = ({ size, center }) => {
  const edges = useMemo(
    () => new THREE.EdgesGeometry(new THREE.BoxGeometry(size.x, size.y, size.z)),
    [size]
  );
  return (
    <lineSegments position={center} geometry={edges}>
      <lineBasicMaterial color={PRIMARY_COLOR} />
    </lineSegments>
  );
};

// Placeholder body used only when no modelUrl is configured at all — keeps the
// overlay/unlock system fully wired and swappable without touching CompanionOverlay or
// the store.
const CatCapsule: React.FC<{ color: string; highlighted?: boolean }> = ({ color, highlighted }) => (
  <>
    <mesh castShadow>
      <capsuleGeometry args={[0.18, 0.32, 4, 8]} />
      <meshStandardMaterial color={color} />
    </mesh>
    {highlighted && <ModelOutline size={new THREE.Vector3(0.36, 0.68, 0.36)} center={new THREE.Vector3(0, 0, 0)} />}
  </>
);

const ORBIT_COUNT = 4;
const ORBIT_RADIUS = 0.22;

// A few small motes circling the summon point, on top of drei's Sparkles for the ambient
// glimmer — together read as a "conjuring" effect rather than a generic spinner.
const OrbitingMotes: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 2;
  });
  return (
    <group ref={groupRef}>
      {Array.from({ length: ORBIT_COUNT }, (_, i) => {
        const angle = (i / ORBIT_COUNT) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * ORBIT_RADIUS, 0, Math.sin(angle) * ORBIT_RADIUS]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial color={PRIMARY_COLOR} emissive={PRIMARY_COLOR} emissiveIntensity={1.5} />
          </mesh>
        );
      })}
    </group>
  );
};

// In-scene loading indicator shown as the Suspense fallback while a real .glb/.gltf model is
// being fetched — Suspense boundaries inside a <Canvas> must render three.js elements, not
// HTML, so the project's HTML Spinner component can't be reused here. Always uses the app's
// primary color (not the companion's own color) as a neutral "summoning" cue.
const CatModelLoader: React.FC = () => (
  <>
    <OrbitingMotes />
    <Sparkles count={20} scale={0.5} size={2.5} speed={0.4} color={PRIMARY_COLOR} />
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
const CatGltfBody: React.FC<{ url: string; color: string; highlighted?: boolean }> = ({ url, color, highlighted }) => {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(url);
  // Plain Object3D.clone(true) does not rebind SkinnedMesh bones to the cloned skeleton —
  // it leaves them pointing at the original bones, which corrupts vertex positions into a
  // huge, malformed shape. SkeletonUtils.clone rebinds bones correctly for skinned models.
  //
  // useGLTF caches the source scene by URL, so both cats (sharing the same placeholder
  // model) get the SAME cached materials by reference. Cloning the object hierarchy alone
  // doesn't clone materials — mutating one instance's material color would tint both cats
  // at once. Each mesh's material is explicitly cloned here so tinting one is isolated to
  // this instance, letting a single shared model render as different companion colors
  // (e.g. "orange" and "black") without needing a distinct asset per color.
  const clonedScene = useMemo(() => {
    const cloned = SkeletonUtils.clone(scene) as THREE.Object3D;
    // material.color is MULTIPLIED against any existing diffuse map — on a model whose
    // baked texture is already near-black, that multiply crushes toward black regardless
    // of the tint hue (a near-zero value times anything is still near-zero), which is why
    // an early version of this looked like a dark, muddy silhouette instead of the actual
    // tint color. Dropping the map makes `color` the sole, fully-controllable source.
    const tint = (material: THREE.Material) => {
      const material_ = material.clone();
      if ('map' in material_) (material_ as THREE.MeshStandardMaterial).map = null;
      if ('color' in material_) (material_ as THREE.MeshStandardMaterial).color.set(color);
      material_.needsUpdate = true;
      return material_;
    };
    cloned.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.material = Array.isArray(child.material) ? child.material.map(tint) : tint(child.material);
      }
    });
    return cloned;
  }, [scene, color]);
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
      <Suspense fallback={<CatModelLoader />}>
        <CatGltfBody url={modelUrl} color={color} highlighted={highlighted} />
      </Suspense>
    ) : (
      <CatCapsule color={color} highlighted={highlighted} />
    )}
  </group>
);
