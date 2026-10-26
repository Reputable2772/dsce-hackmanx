import React, { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { RotateCcw, Target, Tag, X, Box } from 'lucide-react';
import { NetworkTopologyData, TopologyNodeData, TopologyLinkData } from '../types';
import { NetworkScene } from './NetworkScene';

interface NetworkWorldCanvasProps {
  topology: NetworkTopologyData;
  selectedNodeId: string | null;
  selectedLinkId: string | null;
  onSelectNode: (node: TopologyNodeData | null) => void;
  onSelectLink: (link: TopologyLinkData | null) => void;
}

export const NetworkWorldCanvas: React.FC<NetworkWorldCanvasProps> = ({
  topology,
  selectedNodeId,
  selectedLinkId,
  onSelectNode,
  onSelectLink,
}) => {
  const controlsRef = useRef<any>(null);
  const [hoveredNode, setHoveredNode] = useState<TopologyNodeData | null>(null);
  const [, setHoveredLink] = useState<TopologyLinkData | null>(null);
  const [showLabels, setShowLabels] = useState(true);

  // Camera action: Reset view
  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      controlsRef.current.target.set(0, 0.5, 1);
      controlsRef.current.object.position.set(0, 14, 26);
      controlsRef.current.update();
    }
  };

  // Camera action: Focus selected node
  const handleFocusSelected = () => {
    if (selectedNodeId && controlsRef.current) {
      const selected = topology.nodes.find((n) => n.id === selectedNodeId);
      if (selected) {
        controlsRef.current.target.set(selected.position[0], selected.position[1], selected.position[2]);
        controlsRef.current.update();
      }
    }
  };

  const handleClearSelection = () => {
    onSelectNode(null);
    onSelectLink(null);
  };

  return (
    <div className="relative h-[560px] w-full overflow-hidden rounded-2xl border border-precursor-border bg-precursor-navy shadow-2xl">
      {/* Top Floating Viewport Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2 font-mono text-xs">
        <div className="flex items-center gap-2 rounded-lg border border-precursor-border bg-precursor-card/90 px-3 py-1.5 backdrop-blur-md shadow-lg">
          <Box className="h-3.5 w-3.5 text-precursor-cyan" />
          <span className="font-bold text-white">R3F DIGITAL TWIN</span>
          <span className="rounded bg-precursor-purple/20 px-1.5 py-0.5 text-[10px] text-precursor-lavender font-semibold">
            INTERACTIVE
          </span>
        </div>

        {topology.isDemoFixture && (
          <span className="rounded-lg border border-precursor-border bg-precursor-card/90 px-2.5 py-1.5 text-slate-400 backdrop-blur-md">
            Demo Topology Fixture
          </span>
        )}
      </div>

      {/* Top-Right Camera & Inspection Action Bar */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button
          type="button"
          onClick={handleResetCamera}
          className="inline-flex items-center gap-1.5 rounded-lg border border-precursor-border bg-precursor-card/90 px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-300 shadow-md backdrop-blur-md transition-all hover:border-precursor-purple hover:text-white hover:bg-precursor-surface"
          title="Reset Camera to default perspective"
        >
          <RotateCcw className="h-3.5 w-3.5 text-precursor-cyan" />
          <span className="hidden sm:inline">Reset Cam</span>
        </button>

        <button
          type="button"
          onClick={handleFocusSelected}
          disabled={!selectedNodeId}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-xs font-semibold shadow-md backdrop-blur-md transition-all ${
            selectedNodeId
              ? 'border-precursor-border bg-precursor-card/90 text-slate-300 hover:border-precursor-purple hover:text-white'
              : 'border-slate-800 bg-slate-900/40 text-slate-600 cursor-not-allowed'
          }`}
          title="Focus camera target on selected node"
        >
          <Target className="h-3.5 w-3.5 text-precursor-purple" />
          <span className="hidden sm:inline">Focus</span>
        </button>

        <button
          type="button"
          onClick={() => setShowLabels(!showLabels)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-xs font-semibold shadow-md backdrop-blur-md transition-all ${
            showLabels
              ? 'border-precursor-border-active bg-precursor-violet/60 text-white'
              : 'border-precursor-border bg-precursor-card/90 text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle node labels"
        >
          <Tag className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Labels</span>
        </button>

        {(selectedNodeId || selectedLinkId) && (
          <button
            type="button"
            onClick={handleClearSelection}
            className="inline-flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/20 px-2.5 py-1.5 font-mono text-xs font-semibold text-rose-300 shadow-md backdrop-blur-md transition-all hover:bg-rose-500/30"
            title="Clear active node/link selection"
          >
            <X className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}
      </div>

      {/* 3D WebGL Canvas */}
      <Canvas
        camera={{ position: [0, 14, 26], fov: 45 }}
        shadows
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        className="cursor-grab active:cursor-grabbing"
      >
        <NetworkScene
          topology={topology}
          selectedNodeId={selectedNodeId}
          selectedLinkId={selectedLinkId}
          hoveredNode={hoveredNode}
          showLabels={showLabels}
          onSelectNode={onSelectNode}
          onSelectLink={onSelectLink}
          onHoverNode={setHoveredNode}
          onHoverLink={setHoveredLink}
          onClearSelection={handleClearSelection}
          controlsRef={controlsRef}
        />
      </Canvas>

      {/* Bottom Help Indicator */}
      <div className="absolute bottom-3 left-4 z-10 flex items-center gap-3 font-mono text-[11px] text-slate-500 pointer-events-none">
        <span>Click node/link to inspect</span>
        <span>•</span>
        <span>Drag to orbit</span>
        <span>•</span>
        <span>Right-click to pan</span>
        <span>•</span>
        <span>Scroll to zoom</span>
      </div>
    </div>
  );
};
