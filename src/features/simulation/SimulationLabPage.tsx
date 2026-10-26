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
  const { config, evaluation, setScenario } = useSimulationStore();

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
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-[#EEF2FF] px-3 py-1 font-mono text-[11px] font-semibold text-[#5267D8]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#5267D8]" />
          Simulation Lab
        </span>
      }
    >
      {/* Tab Navigation */}
      <div className="mb-6 flex gap-1 rounded-xl border border-[#E3E8F0] bg-white p-1.5 shadow-sm text-[#202938]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-mono font-bold transition-all sm:flex-initial ${
                isActive
                  ? 'bg-[#5267D8] text-white shadow-xs'
                  : 'text-[#687386] hover:bg-[#F8FAFC] hover:text-[#202938]'
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
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <TimelineViewer />
            </div>
            <div>
              <SimulationConfigPanel />
            </div>
          </div>

          {evaluation && <GateComparisonPanel comparison={evaluation} />}

          <div>
            <h3 className="mb-3 font-mono text-xs font-bold uppercase tracking-wider text-[#687386]">
              Deterministic Failure Scenarios
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        </div>
      )}

      {activeTab === 'evaluation' && (
        <EvaluationDashboard
          activeScenarioId={config.scenarioId}
          onSelectScenario={setScenario}
        />
      )}

      {activeTab === 'gate-guide' && <GateEducationPanel />}
    </PageContainer>
  );
};
