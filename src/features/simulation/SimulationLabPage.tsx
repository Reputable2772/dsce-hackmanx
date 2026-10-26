import React, { useState } from 'react';
import { FlaskConical, BarChart3, BookOpen } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { scenarioDefinitions } from './fixtures/simulationFixture';
import { useSimulationStore } from './useSimulationStore';
import { ScenarioCard } from './components/ScenarioCard';
import { SimulationConfigPanel } from './components/SimulationConfigPanel';
import { TimelineViewer } from './components/TimelineViewer';
import { GateComparisonPanel } from './components/GateComparisonPanel';
import { EvaluationDashboard } from './components/EvaluationDashboard';
import { GateEducationPanel } from './components/GateEducationPanel';

type ActiveTab = 'simulation' | 'evaluation' | 'gate-guide';

export const SimulationLabPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('simulation');
  const { config, phase, evaluation, setScenario } = useSimulationStore();

  const tabs: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
    { id: 'simulation', label: 'Simulation Lab', icon: FlaskConical },
    { id: 'evaluation', label: 'Evaluation Dashboard', icon: BarChart3 },
    { id: 'gate-guide', label: 'Gate Guide', icon: BookOpen },
  ];

  return (
    <PageContainer
      title="Simulation Lab & Evaluation"
      subtitle="Interactive scenario explorer — compare reliability-gated vs ungated predictions on deterministic demonstration data."
      action={
        <span className="inline-flex items-center gap-1.5 rounded-full border border-precursor-purple/30 bg-precursor-purple/10 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-precursor-purple">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-precursor-purple" />
          Demo Simulation
        </span>
      }
    >
      {/* Tab Navigation */}
      <div className="mb-6 flex gap-1 rounded-xl border border-white/[0.08] bg-precursor-card-glass p-1.5 backdrop-blur-xl shadow-glass-panel">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-mono font-bold transition-all sm:flex-initial ${
                isActive
                  ? 'border border-precursor-purple/40 bg-precursor-violet/60 text-white shadow-glow-purple/20'
                  : 'text-slate-400 hover:bg-precursor-surface/60 hover:text-slate-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'simulation' && (
        <div className="space-y-6">
          {/* Scenario Library */}
          <div>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
              Scenario Library
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {scenarioDefinitions.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  isSelected={config.scenarioId === scenario.id}
                  onSelect={setScenario}
                />
              ))}
            </div>
          </div>

          {/* Configuration */}
          <SimulationConfigPanel />

          {/* Timeline (shown after run) */}
          {phase === 'completed' && (
            <>
              <TimelineViewer />
              {evaluation && <GateComparisonPanel comparison={evaluation} />}
            </>
          )}
        </div>
      )}

      {activeTab === 'evaluation' && (
        <EvaluationDashboard
          activeScenarioId={config.scenarioId}
          onSelectScenario={(id) => {
            setScenario(id);
            setActiveTab('simulation');
          }}
        />
      )}

      {activeTab === 'gate-guide' && <GateEducationPanel />}
    </PageContainer>
  );
};
