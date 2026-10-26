import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { TopologyNodeData } from '../types';

interface NetworkNode3DProps {
  node: TopologyNodeData;
  isSelected: boolean;
  isHovered: boolean;
  showLabels: boolean;
  onSelect: (node: TopologyNodeData) => void;
  onHover: (node: TopologyNodeData | null) => void;
}

export const NetworkNode3D: React.FC<NetworkNode3DProps> = ({
  node,
  isSelected,
  isHovered,
  showLabels,
  onSelect,
  onHover,
}) => {
  const meshRef = useRef<THREE.Group>(null);
  const pulseRingRef = useRef<THREE.Mesh>(null);
  const [internalHover, setInternalHover] = useState(false);

  // Status color mapping
  const statusColors = {
    healthy: '#45D6B5',   // Teal
    degraded: '#F59E0B',  // Amber
    critical: '#EF4444',  // Coral
    offline: '#64748B',   // Slate
  };

  const isInboundPeer = node.id === 'inbound-peer' || node.name.toLowerCase().includes('inbound');
  const isOutboundTarget = node.id === 'outbound-target' || node.id.startsWith('target-') || node.name.toLowerCase().includes('probe target');
  const roleColor = isInboundPeer ? '#06B6D4' : isOutboundTarget ? '#10B981' : null;

  const baseColor = roleColor || statusColors[node.status] || '#45D6B5';
  const effectiveColor = isSelected ? '#9B7BFF' : (internalHover || isHovered) ? '#48DDF5' : baseColor;

  // Gentle animation for pulse ring and ambient node breathing
  useFrame((state, delta) => {
    if (pulseRingRef.current) {
      if (node.status === 'degraded' || node.status === 'critical' || isSelected) {
        const pulseRate = node.status === 'critical' ? 8 : 4;
        pulseRingRef.current.rotation.z += delta * (node.status === 'critical' ? 2.5 : 1.2);
        const scale = 1 + Math.sin(state.clock.elapsedTime * pulseRate) * 0.15;
        pulseRingRef.current.scale.set(scale, scale, scale);
      }
    }
  });

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    setInternalHover(true);
    onHover(node);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    setInternalHover(false);
    onHover(null);
    document.body.style.cursor = 'auto';
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    onSelect(node);
  };

  // Node geometry based on type
  const renderGeometry = () => {
    switch (node.type) {
      case 'gateway':
        return (
          <group>
            {/* Dual cybernetic gateway pillars */}
            <mesh position={[-0.45, 0, 0]} castShadow>
              <cylinderGeometry args={[0.2, 0.28, 1.5, 16]} />
              <meshStandardMaterial color={effectiveColor} roughness={0.25} metalness={0.75} />
            </mesh>
            <mesh position={[0.45, 0, 0]} castShadow>
              <cylinderGeometry args={[0.2, 0.28, 1.5, 16]} />
              <meshStandardMaterial color={effectiveColor} roughness={0.25} metalness={0.75} />
            </mesh>
            {/* Top bridging arch */}
            <mesh position={[0, 0.72, 0]}>
              <boxGeometry args={[1.3, 0.18, 0.45]} />
              <meshStandardMaterial color="#1C1838" roughness={0.4} metalness={0.6} />
            </mesh>
            {/* Hovering plasma core */}
            <mesh position={[0, 0.05, 0]}>
              <sphereGeometry args={[0.32, 24, 24]} />
              <meshStandardMaterial
                color="#48DDF5"
                emissive="#48DDF5"
                emissiveIntensity={isSelected ? 1.2 : 0.7}
                roughness={0.1}
              />
            </mesh>
          </group>
        );

      case 'router':
        return (
          <group>
            {/* Octagonal core chassis */}
            <mesh castShadow>
              <cylinderGeometry args={[0.75, 0.75, 0.35, 8]} />
              <meshStandardMaterial color="#1E2340" roughness={0.3} metalness={0.6} />
            </mesh>
            {/* Elevated glowing optical disc */}
            <mesh position={[0, 0.2, 0]}>
              <cylinderGeometry args={[0.45, 0.45, 0.1, 16]} />
              <meshStandardMaterial
                color={effectiveColor}
                emissive={effectiveColor}
                emissiveIntensity={isSelected ? 0.9 : 0.55}
                roughness={0.2}
              />
            </mesh>
            {/* Outer telemetry ring */}
            <mesh position={[0, -0.1, 0]}>
              <torusGeometry args={[0.82, 0.04, 12, 24]} />
              <meshStandardMaterial color={effectiveColor} emissive={effectiveColor} emissiveIntensity={0.4} />
            </mesh>
          </group>
        );

      case 'switch':
        return (
          <group>
            {/* Rack chassis */}
            <mesh castShadow>
              <boxGeometry args={[1.5, 0.35, 0.85]} />
              <meshStandardMaterial color="#1A1E35" roughness={0.4} metalness={0.65} />
            </mesh>
            {/* Front port bezel with luminous fiber ports */}
            <mesh position={[0, 0, 0.43]}>
              <boxGeometry args={[1.35, 0.18, 0.02]} />
              <meshStandardMaterial
                color={effectiveColor}
                emissive={effectiveColor}
                emissiveIntensity={isSelected ? 0.8 : 0.45}
              />
            </mesh>
          </group>
        );

      case 'server':
        return (
          <group>
            {/* Vertical data blade tower */}
            <mesh castShadow position={[0, 0.1, 0]}>
              <boxGeometry args={[0.75, 1.3, 0.75]} />
              <meshStandardMaterial color="#181B30" roughness={0.35} metalness={0.7} />
            </mesh>
            {/* Front drive bay status lines */}
            <mesh position={[0, 0.35, 0.38]}>
              <boxGeometry args={[0.55, 0.08, 0.02]} />
              <meshStandardMaterial color={effectiveColor} emissive={effectiveColor} emissiveIntensity={0.6} />
            </mesh>
            <mesh position={[0, 0.1, 0.38]}>
              <boxGeometry args={[0.55, 0.08, 0.02]} />
              <meshStandardMaterial color={effectiveColor} emissive={effectiveColor} emissiveIntensity={0.6} />
            </mesh>
            <mesh position={[0, -0.15, 0.38]}>
              <boxGeometry args={[0.55, 0.08, 0.02]} />
              <meshStandardMaterial color={effectiveColor} emissive={effectiveColor} emissiveIntensity={0.6} />
            </mesh>
          </group>
        );

      case 'endpoint':
      default:
        return (
          <group>
            {/* Geodesic probe sphere */}
            <mesh castShadow>
              <icosahedronGeometry args={[0.48, 1]} />
              <meshStandardMaterial
                color={effectiveColor}
                emissive={effectiveColor}
                emissiveIntensity={isSelected ? 0.6 : 0.3}
                roughness={0.2}
                metalness={0.8}
                wireframe={false}
              />
            </mesh>
          </group>
        );
    }
  };

  return (
    <group
      ref={meshRef}
      position={node.position}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
      scale={isSelected ? 1.2 : internalHover ? 1.12 : 1.0}
    >
      {/* 3D Geometry */}
      {renderGeometry()}

      {/* Pulse / Selection Halo */}
      {(isSelected || node.status === 'degraded' || internalHover) && (
        <mesh ref={pulseRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]}>
          <ringGeometry args={[0.9, 1.1, 32]} />
          <meshBasicMaterial
            color={isSelected ? '#9B7BFF' : effectiveColor}
            transparent
            opacity={isSelected ? 0.7 : 0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Always-on or Hover Tooltip/Label */}
      {(showLabels || internalHover || isSelected) && (
        <Html
          position={[0, 1.2, 0]}
          center
          distanceFactor={18}
          className="pointer-events-none select-none"
        >
          <div
            className={`flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[11px] whitespace-nowrap shadow-sm backdrop-blur-sm transition-all ${
              isSelected
                ? 'border-[#5267D8] bg-white text-[#5267D8] shadow-md ring-2 ring-[#5267D8]/30 font-bold'
                : internalHover
                ? 'border-[#159E98] bg-white text-[#202938] shadow-md font-semibold'
                : 'border-[#CBD5E1] bg-white/95 text-[#202938]'
            }`}
          >
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: baseColor }}
            />
            <span className="font-bold">{node.name}</span>
            <span className={`text-[9px] px-1 py-0.2 rounded font-semibold uppercase ${
              node.id.includes('probe') || node.metadata?.role?.includes('Host') || node.metadata?.role?.includes('Peer')
                ? 'bg-teal-50 text-teal-700 border border-teal-200'
                : node.metadata?.role?.includes('Configured')
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}>
              {node.id.includes('probe') || node.metadata?.role?.includes('Host') || node.metadata?.role?.includes('Peer')
                ? 'Real'
                : node.metadata?.role?.includes('Configured')
                ? 'Config'
                : 'Twin'}
            </span>
          </div>
        </Html>
      )}
    </group>
  );
};
