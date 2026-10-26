import React, { useMemo, useState, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { TopologyLinkData, TopologyNodeData } from '../types';

interface NetworkLink3DProps {
  link: TopologyLinkData;
  sourceNode: TopologyNodeData;
  targetNode: TopologyNodeData;
  isSelected: boolean;
  isEmphasized: boolean; // Emphasized when either connected node is hovered
  onSelect: (link: TopologyLinkData) => void;
  onHover: (link: TopologyLinkData | null) => void;
}

export const NetworkLink3D: React.FC<NetworkLink3DProps> = ({
  link,
  sourceNode,
  targetNode,
  isSelected,
  isEmphasized,
  onSelect,
  onHover,
}) => {
  const [internalHover, setInternalHover] = useState(false);
  const flowParticleRef = useRef<THREE.Mesh>(null);

  // Compute geometry transform
  const { midpoint, orientation, length } = useMemo(() => {
    const p1 = new THREE.Vector3(...sourceNode.position);
    const p2 = new THREE.Vector3(...targetNode.position);

    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    const distance = p1.distanceTo(p2);

    const direction = new THREE.Vector3().subVectors(p2, p1).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
    const euler = new THREE.Euler().setFromQuaternion(quaternion);

    return { midpoint: mid, orientation: euler, length: distance };
  }, [sourceNode.position, targetNode.position]);

  // Color mapping
  const linkColors = {
    active: '#48DDF5',   // Cyan
    degraded: '#F59E0B', // Amber
    down: '#EF4444',     // Coral
  };

  const baseColor = linkColors[link.status] || '#48DDF5';
  const effectiveColor = isSelected ? '#9B7BFF' : (internalHover || isEmphasized) ? '#A78BFA' : baseColor;
  const radius = isSelected ? 0.08 : internalHover ? 0.07 : isEmphasized ? 0.06 : 0.04;

  // Gentle particle flow animation along link
  useFrame((state) => {
    if (flowParticleRef.current && link.status !== 'down') {
      const speed = link.status === 'degraded' ? 0.4 : 1.2;
      const t = (state.clock.elapsedTime * speed) % 1;
      const p1 = new THREE.Vector3(...sourceNode.position);
      const p2 = new THREE.Vector3(...targetNode.position);
      const currentPos = new THREE.Vector3().lerpVectors(p1, p2, t);
      flowParticleRef.current.position.copy(currentPos);
    }
  });

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    setInternalHover(true);
    onHover(link);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    setInternalHover(false);
    onHover(null);
    document.body.style.cursor = 'auto';
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    onSelect(link);
  };

  return (
    <group>
      {/* Clickable / Rendered Link Tube */}
      <mesh
        position={midpoint}
        rotation={orientation}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <cylinderGeometry args={[radius, radius, length, 12]} />
        <meshStandardMaterial
          color={effectiveColor}
          emissive={effectiveColor}
          emissiveIntensity={isSelected ? 0.7 : isEmphasized ? 0.5 : 0.25}
          roughness={0.3}
          metalness={0.6}
          transparent
          opacity={link.status === 'down' ? 0.35 : 0.85}
        />
      </mesh>

      {/* Traffic Pulse / Flow Packet */}
      {link.status !== 'down' && (
        <mesh ref={flowParticleRef}>
          <sphereGeometry args={[0.09, 8, 8]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
      )}
    </group>
  );
};
