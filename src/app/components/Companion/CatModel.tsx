import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Props {
  color: string;
  scale?: number;
  speed?: number;
  // Staggers the wander cycle so multiple instances don't move in lockstep.
  phaseOffset?: number;
  // Half-extent of the square area the cat wanders within, in scene units.
  bounds?: number;
}

const pickTarget = (bounds: number): THREE.Vector3 =>
  new THREE.Vector3((Math.random() * 2 - 1) * bounds, 0, (Math.random() * 2 - 1) * bounds);

// No real .glb model exists yet — a capsule stands in for the cat body so the
// walk/overlay/unlock system is fully wired and swappable later: once a model file
// exists, this mesh gets replaced by `<primitive object={scene} />` from useGLTF
// without touching CompanionOverlay, the reader integration, or the store.
export const CatModel: React.FC<Props> = ({ color, scale = 1, speed = 0.6, phaseOffset = 0, bounds = 1.5 }) => {
  const groupRef = useRef<THREE.Group>(null);
  const target = useRef<THREE.Vector3>(pickTarget(bounds));
  const idleTimer = useRef(Math.random() * 2 + phaseOffset);

  const bobPhase = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const position = group.position;
    const toTarget = target.current.clone().sub(position);
    const distance = toTarget.length();

    if (distance < 0.05) {
      idleTimer.current -= delta;
      if (idleTimer.current <= 0) {
        target.current = pickTarget(bounds);
        idleTimer.current = Math.random() * 2 + 1;
      }
    } else {
      const direction = toTarget.normalize();
      position.addScaledVector(direction, Math.min(speed * delta, distance));
      const targetAngle = Math.atan2(direction.x, direction.z);
      group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, targetAngle, Math.min(delta * 5, 1));
    }

    group.position.y = Math.sin(performance.now() * 0.003 + bobPhase) * 0.03;
  });

  return (
    <group ref={groupRef} scale={scale}>
      <mesh castShadow>
        <capsuleGeometry args={[0.18, 0.32, 4, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
};
