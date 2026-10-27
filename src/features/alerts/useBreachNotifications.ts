import { useState, useCallback } from 'react';

export interface BreachAlert {
  id: number;
  timestamp: number;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  eventType: string;
  relatedIncidentId?: string | null;
}

export function playAlertSound(_isCritical = false) {
  // Quiet mode: all sound alarms silenced as requested
}

export function requestBrowserNotificationPermission() {
  // Quiet mode: disabled
}

export function useBreachNotifications() {
  const [activeAlert] = useState<BreachAlert | null>(null);
  const [permissionGranted] = useState<boolean>(false);
  const dismissAlert = useCallback(() => {}, []);
  const requestPermission = useCallback(() => {}, []);

  return {
    activeAlert,
    dismissAlert,
    permissionGranted,
    requestPermission,
  };
}
