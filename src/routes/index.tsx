import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/app/AppShell';
import { NetworkWorldPage } from '@/features/network-world/NetworkWorldPage';
import { TelemetryPage } from '@/features/telemetry/TelemetryPage';
import { PredictionsPage } from '@/features/predictions/PredictionsPage';
import { IncidentsPage } from '@/features/incidents/IncidentsPage';
import { CopilotPage } from '@/features/copilot/CopilotPage';
import { SimulationLabPage } from '@/features/simulation/SimulationLabPage';
import { SystemStatusPage } from '@/features/system-status/SystemStatusPage';
import { SettingsPage } from '@/features/settings/SettingsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <NetworkWorldPage />,
      },
      {
        path: 'world',
        element: <NetworkWorldPage />,
      },
      {
        path: 'telemetry',
        element: <TelemetryPage />,
      },
      {
        path: 'predictions',
        element: <PredictionsPage />,
      },
      {
        path: 'incidents',
        element: <IncidentsPage />,
      },
      {
        path: 'copilot',
        element: <CopilotPage />,
      },
      {
        path: 'simulation',
        element: <SimulationLabPage />,
      },
      {
        path: 'status',
        element: <SystemStatusPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
]);
