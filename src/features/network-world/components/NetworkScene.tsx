import React from 'react';
import { OrbitControls, Sparkles } from '@react-three/drei';
import { NetworkTopologyData, TopologyNodeData, TopologyLinkData } from '../types';
import { NetworkNode3D } from './NetworkNode3D';
import { NetworkLink3D } from './NetworkLink3D';
import { useSettingsStore } from '@/stores/useSettingsStore';

interface NetworkSceneProps {
  topology: NetworkTopologyData;
  selectedNodeId: string | null;
  selectedLinkId: string | null;
  hoveredNode: TopologyNodeData | null;
  showLabels: boolean;
  onSelectNode: (node: TopologyNodeData) => void;
  onSelectLink: (link: TopologyLinkData) => void;
  onHoverNode: (node: TopologyNodeData | null) => void;
  onHoverLink: (link: TopologyLinkData | null) => void;
  onClearSelection: () => void;
  controlsRef: React.RefObject<any>;
}

export const NetworkScene: React.FC<NetworkSceneProps> = ({
  topology,
  selectedNodeId,
  selectedLinkId,
  hoveredNode,
  showLabels,
  onSelectNode,
  onSelectLink,
  onHoverNode,
  onHoverLink,
  onClearSelection,
  controlsRef,
}) => {
  const { showParticles, showNodeLabels, autoRotateCamera, reducedMotion } = useSettingsStore();

  // Map nodes by ID for link vertex lookup
  const nodeMap = new Map<string, TopologyNodeData>();
  topology.nodes.forEach((n) => nodeMap.set(n.id, n));

  const handlePointerMissed = (e: MouseEvent) => {
    // Only deselect if clicked directly on background canvas
    if (e.target && (e.target as HTMLElement).tagName === 'CANVAS') {
      onClearSelection();
    }
  };

  return (
    <>
      {/* Fog & Background for Atmospheric Depth */}
      <color attach="background" args={['#0B0D1B']} />
      <fog attach="fog" args={['#0B0D1B', 22, 58]} />

      {/* Orbit Navigation Controls */}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.06}
        minDistance={6}
        maxDistance={48}
        maxPolarAngle={Math.PI / 2 + 0.08}
        target={[0, 0.5, 1]}
        autoRotate={autoRotateCamera}
        autoRotateSpeed={0.8}
      />

      {/* Studio Lighting Rig */}
      <ambientLight intensity={0.65} color="#D9D2FF" />
      <directionalLight position={[14, 24, 18]} intensity={1.4} color="#FFFFFF" castShadow />
      <pointLight position={[0, -3.5, 0]} intensity={0.8} color="#48DDF5" distance={35} />
      <pointLight position={[0, 9, -5]} intensity={1.1} color="#9B7BFF" distance={30} />
      <pointLight position={[-12, 6, 8]} intensity={0.5} color="#45D6B5" distance={25} />

      {/* Atmospheric Ambient Sparkles */}
      {showParticles && !reducedMotion && (
        <Sparkles
          count={55}
          scale={28}
          size={1.8}
          speed={0.25}
          opacity={0.35}
          color="#9B7BFF"
        />
      )}

      {/* Ground Substrate Perspective Cyber Grid Plane */}
      <group position={[0, -3.2, 0]}>
        <gridHelper args={[48, 48, '#4E3880', '#13162C']} />
      </group>

      {/* Background Click Listener for Deselection */}
      <mesh
        position={[0, 0, -20]}
        onPointerDown={handlePointerMissed}
        visible={false}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial />
      </mesh>

      {/* Network Links */}
      <group>
        {topology.links.map((link) => {
          const sNode = nodeMap.get(link.sourceId);
          const tNode = nodeMap.get(link.targetId);
          if (!sNode || !tNode) return null;

          const isEmphasized =
            Boolean(hoveredNode && (hoveredNode.id === link.sourceId || hoveredNode.id === link.targetId)) ||
            Boolean(selectedNodeId && (selectedNodeId === link.sourceId || selectedNodeId === link.targetId));

          return (
            <NetworkLink3D
              key={link.id}
              link={link}
              sourceNode={sNode}
              targetNode={tNode}
              isSelected={selectedLinkId === link.id}
              isEmphasized={isEmphasized}
              onSelect={onSelectLink}
              onHover={onHoverLink}
            />
          );
        })}
      </group>

      {/* Network Nodes */}
      <group>
        {topology.nodes.map((node) => (
          <NetworkNode3D
            key={node.id}
            node={node}
            isSelected={selectedNodeId === node.id}
            isHovered={hoveredNode?.id === node.id}
            showLabels={showLabels && showNodeLabels}
            onSelect={onSelectNode}
            onHover={onHoverNode}
          />
        ))}
      </group>
    </>
  );
};
