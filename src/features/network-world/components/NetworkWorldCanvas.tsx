import React, { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { RotateCcw, Target, Tag, X, Box, Activity, PanelRightOpen, PanelRightClose, HelpCircle } from 'lucide-react';
import { NetworkTopologyData, TopologyNodeData, TopologyLinkData } from '../types';
import { NetworkScene } from './NetworkScene';
import { useSettingsStore } from '@/stores/useSettingsStore';

interface NetworkWorldCanvasProps {
  topology: NetworkTopologyData;
  selectedNodeId: string | null;
  selectedLinkId: string | null;
  onSelectNode: (node: TopologyNodeData | null) => void;
  onSelectLink: (link: TopologyLinkData | null) => void;
  inspectorOpen: boolean;
  onToggleInspector: () => void;
  legendOpen: boolean;
  onToggleLegend: () => void;
  className?: string;
}

export const NetworkWorldCanvas: React.FC<NetworkWorldCanvasProps> = ({
  topology,
  selectedNodeId,
  selectedLinkId,
  onSelectNode,
  onSelectLink,
  inspectorOpen,
  onToggleInspector,
  legendOpen,
  onToggleLegend,
  className = '',
}) => {
  const controlsRef = useRef<any>(null);
  const [hoveredNode, setHoveredNode] = useState<TopologyNodeData | null>(null);
  const [, setHoveredLink] = useState<TopologyLinkData | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const { showParticles, setShowParticles } = useSettingsStore();

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
    <div className={`relative h-full w-full min-h-[640px] overflow-hidden rounded-2xl border border-[#E3E8F0] bg-white shadow-sm ${className}`}>
      {/* Top Floating Viewport HUD */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2 font-mono text-xs pointer-events-auto">
        <div className="flex items-center gap-2 rounded-xl border border-[#E3E8F0] bg-white/95 px-3 py-1.5 shadow-sm">
          <Box className="h-4 w-4 text-[#159E98]" />
          <span className="font-extrabold tracking-wider text-[#202938]">
            {topology.view === 'systems' ? 'NETWORK WORLD' : 'DIGITAL TWIN'}
          </span>
          <span className="rounded bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 text-[10px] text-indigo-700 font-semibold">
            {topology.view === 'systems' ? 'TWO-SYSTEM PROBES' : '3D FABRIC'}
          </span>
        </div>

        {topology.isDemoFixture && (
          <span className="rounded-xl border border-[#E3E8F0] bg-white/90 px-2.5 py-1.5 text-[#687386] shadow-sm text-[11px]">
            Deterministic Fabric Fixture
          </span>
        )}
      </div>

      {/* Top-Right Camera & Inspection HUD Action Bar */}
      <div className="absolute top-4 right-4 z-10 flex flex-wrap items-center gap-1.5 pointer-events-auto">
        <button
          type="button"
          onClick={handleResetCamera}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#E3E8F0] bg-white/95 px-2.5 py-1.5 font-mono text-xs font-semibold text-[#475569] shadow-sm transition-all hover:border-[#5267D8] hover:text-[#5267D8]"
          title="Reset Camera to default perspective"
        >
          <RotateCcw className="h-3.5 w-3.5 text-[#159E98]" />
          <span className="hidden sm:inline">Reset</span>
        </button>

        <button
          type="button"
          onClick={handleFocusSelected}
          disabled={!selectedNodeId}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 font-mono text-xs font-semibold shadow-sm transition-all ${
            selectedNodeId
              ? 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              : 'border-[#E3E8F0] bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
          title="Focus camera target on selected node"
        >
          <Target className="h-3.5 w-3.5 text-indigo-600" />
          <span className="hidden sm:inline">Focus</span>
        </button>

        <button
          type="button"
          onClick={() => setShowLabels(!showLabels)}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 font-mono text-xs font-semibold shadow-sm transition-all ${
            showLabels
              ? 'border-indigo-300 bg-indigo-50 text-[#5267D8]'
              : 'border-[#E3E8F0] bg-white text-[#687386] hover:text-[#202938]'
          }`}
          title="Toggle node labels"
        >
          <Tag className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Labels</span>
        </button>

        <button
          type="button"
          onClick={() => setShowParticles(!showParticles)}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 font-mono text-xs font-semibold shadow-sm transition-all ${
            showParticles
              ? 'border-teal-300 bg-teal-50 text-[#159E98]'
              : 'border-[#E3E8F0] bg-white text-[#687386] hover:text-[#202938]'
          }`}
          title="Toggle traffic flow pulses"
        >
          <Activity className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Traffic</span>
        </button>

        <button
          type="button"
          onClick={onToggleLegend}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 font-mono text-xs font-semibold shadow-sm transition-all ${
            legendOpen
              ? 'border-indigo-300 bg-indigo-50 text-[#5267D8]'
              : 'border-[#E3E8F0] bg-white text-[#687386] hover:text-[#202938]'
          }`}
          title="Toggle Topology Legend"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Legend</span>
        </button>

        <button
          type="button"
          onClick={onToggleInspector}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 font-mono text-xs font-semibold shadow-sm transition-all ${
            inspectorOpen
              ? 'border-indigo-300 bg-indigo-50 text-[#5267D8]'
              : 'border-[#E3E8F0] bg-white text-[#687386] hover:text-[#202938]'
          }`}
          title="Toggle Inspector Drawer"
        >
          {inspectorOpen ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5 text-[#5267D8]" />}
          <span className="hidden sm:inline">Inspector</span>
        </button>

        {(selectedNodeId || selectedLinkId) && (
          <button
            type="button"
            onClick={handleClearSelection}
            className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 font-mono text-xs font-semibold text-rose-700 shadow-sm transition-all hover:bg-rose-100"
            title="Clear active node/link selection"
          >
            <X className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Deselect</span>
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

      {/* Bottom Floating Interaction Hint Ribbon */}
      <div className="absolute bottom-3 left-4 z-10 flex items-center gap-2 rounded-xl border border-[#E3E8F0] bg-white/90 px-3 py-1.5 font-mono text-[11px] text-[#687386] backdrop-blur-md pointer-events-none shadow-sm">
        <span className="text-[#202938] font-medium">Click node / link to inspect</span>
        <span>•</span>
        <span>Orbit: Left-drag</span>
        <span>•</span>
        <span>Pan: Right-drag</span>
        <span>•</span>
        <span>Zoom: Scroll</span>
      </div>
    </div>
  );
};
