import { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { useAppStore } from '@/stores/useAppStore';
import { GateState } from '@/types';

export interface BreachAlert {
  id: number | string;
  timestamp: number;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  eventType: string;
  relatedIncidentId?: string | null;
}

/**
 * Send a native browser Notification if permission is granted.
 * Deduplicates notifications using the tag parameter.
 */
export function sendBrowserNotification(title: string, options?: NotificationOptions): Notification | null {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }
  if (Notification.permission !== 'granted') {
    return null;
  }
  try {
    const notification = new Notification(`[PRECURSOR] ${title}`, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return notification;
  } catch (err) {
    console.warn('[PRECURSOR] Browser notification error:', err);
    return null;
  }
}

/**
 * Request desktop Notification permission from the browser.
 */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch {
    return Notification.permission;
  }
}

export function playAlertSound(_isCritical = false) {
  // Sound disabled per quiet mode specification
}

export function useBreachNotifications() {
  const [activeAlert, setActiveAlert] = useState<BreachAlert | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(() => {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  });
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });

  const gateState = useAppStore((s) => s.gateState);
  const prevGateStateRef = useRef<GateState | null>(null);
  const seenWarningIdsRef = useRef<Set<string | number>>(new Set());
  const isInitialPollRef = useRef<boolean>(true);

  const requestPermission = useCallback(async () => {
    const perm = await requestBrowserNotificationPermission();
    if (perm !== 'unsupported') {
      setPermissionStatus(perm);
      setPermissionGranted(perm === 'granted');
    }
  }, []);

  const dismissAlert = useCallback(() => {
    if (activeAlert && typeof activeAlert.id === 'number') {
      apiClient.markNotificationRead(activeAlert.id).catch(() => {});
    }
    setActiveAlert(null);
  }, [activeAlert]);

  // 1. Gate State Transition: ONLY for entry to DEGRADED or ABSTAIN
  useEffect(() => {
    if (prevGateStateRef.current === null) {
      prevGateStateRef.current = gateState;
      return;
    }

    const prev = prevGateStateRef.current;
    if (prev !== gateState) {
      prevGateStateRef.current = gateState;

      // ENTRY TO DEGRADED
      if (gateState === 'DEGRADED') {
        const title = 'Reliability Gate: DEGRADED';
        const message = 'Gate entered DEGRADED state. Telemetry distribution drift or residual variance detected.';
        sendBrowserNotification(title, {
          body: message,
          tag: 'precursor-gate-state',
        });
        setActiveAlert({
          id: Date.now(),
          timestamp: Date.now() / 1000,
          title,
          message,
          severity: 'WARNING',
          eventType: 'GATE_STATE_TRANSITION',
        });
      }
      // ENTRY TO ABSTAIN
      else if (gateState === 'ABSTAIN') {
        const title = 'Reliability Gate: ABSTAIN';
        const message = 'Gate entered ABSTAIN state. Physical carrier lost or critical sensor degradation. Model predictions suppressed.';
        sendBrowserNotification(title, {
          body: message,
          tag: 'precursor-gate-state',
        });
        setActiveAlert({
          id: Date.now(),
          timestamp: Date.now() / 1000,
          title,
          message,
          severity: 'CRITICAL',
          eventType: 'GATE_STATE_TRANSITION',
        });
      }
      // Returning to PREDICT triggers NO notification, matching user requirements
    }
  }, [gateState]);

  // 2. Warning Entry: Poll incidents and notifications for entry to WARNING state
  useEffect(() => {
    let isMounted = true;

    const checkWarningEntries = async () => {
      try {
        const [notifRes, incRes] = await Promise.all([
          apiClient.fetchNotifications(20, true).catch(() => null),
          apiClient.fetchIncidents().catch(() => null),
        ]);

        if (!isMounted) return;

        // Collect new warnings
        const warningEvents: BreachAlert[] = [];

        // Check /api/notifications
        if (notifRes && Array.isArray(notifRes.events)) {
          for (const ev of notifRes.events) {
            const isWarning = ev.severity === 'WARNING' || (ev.title && ev.title.toUpperCase().includes('WARNING'));
            if (isWarning) {
              if (isInitialPollRef.current) {
                // Record existing warnings on load without firing alert
                seenWarningIdsRef.current.add(ev.id);
              } else if (!seenWarningIdsRef.current.has(ev.id)) {
                seenWarningIdsRef.current.add(ev.id);
                warningEvents.push({
                  id: ev.id,
                  timestamp: ev.timestamp,
                  title: ev.title,
                  message: ev.message,
                  severity: 'WARNING',
                  eventType: ev.event_type || 'WARNING_ALERT',
                  relatedIncidentId: ev.related_incident_id,
                });
              }
            }
          }
        }

        // Check /api/incidents
        const incidentList = Array.isArray(incRes)
          ? incRes
          : Array.isArray(incRes?.active_incidents)
          ? [...incRes.active_incidents, ...(incRes.predicted_incidents || [])]
          : [];

        for (const inc of incidentList) {
          const isWarning = inc.severity === 'WARNING' || (inc.title && inc.title.toUpperCase().includes('WARNING'));
          if (isWarning) {
            const incKey = `inc-${inc.id}`;
            if (isInitialPollRef.current) {
              seenWarningIdsRef.current.add(incKey);
            } else if (!seenWarningIdsRef.current.has(incKey)) {
              seenWarningIdsRef.current.add(incKey);
              warningEvents.push({
                id: incKey,
                timestamp: inc.epoch_time || Date.now() / 1000,
                title: inc.title || 'SLA Warning Alert',
                message: inc.copilot_summary || inc.description || 'Monitored interface breached warning threshold.',
                severity: 'WARNING',
                eventType: 'INCIDENT_WARNING',
                relatedIncidentId: inc.id,
              });
            }
          }
        }

        if (isInitialPollRef.current) {
          isInitialPollRef.current = false;
        }

        // If a new warning entered, trigger browser notification once
        if (warningEvents.length > 0) {
          const newest = warningEvents[0];
          sendBrowserNotification(newest.title, {
            body: newest.message,
            tag: `precursor-warning-${newest.id}`,
          });
          setActiveAlert(newest);
        }
      } catch {
        // Silently tolerate transient fetch errors during backend restarts
      }
    };

    checkWarningEntries();
    const interval = setInterval(checkWarningEntries, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return {
    activeAlert,
    dismissAlert,
    permissionGranted,
    permissionStatus,
    requestPermission,
  };
}
