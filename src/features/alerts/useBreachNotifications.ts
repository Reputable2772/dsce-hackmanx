import { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { useAppStore } from '@/stores/useAppStore';

export interface BreachAlert {
  id: number;
  timestamp: number;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  eventType: string;
  relatedIncidentId?: string | null;
}

export function playAlertSound(isCritical = false) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (isCritical) {
      // 2-tone alarm: 440Hz -> 880Hz
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } else {
      // Pleasant chime: 587Hz -> 880Hz
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // AudioContext might be blocked by autoplay policies until user gesture
  }
}

export function requestBrowserNotificationPermission() {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }
}

export function useBreachNotifications() {
  const [activeAlert, setActiveAlert] = useState<BreachAlert | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(() => {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  });
  const seenIdsRef = useRef<Set<number>>(new Set());
  const gateState = useAppStore((s) => s.gateState);
  const prevGateState = useRef(gateState);

  const requestPermission = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setPermissionGranted(perm === 'granted');
      } catch {}
    }
  }, []);

  const triggerAlert = useCallback((alert: BreachAlert) => {
    setActiveAlert(alert);
    playAlertSound(alert.severity === 'CRITICAL' || alert.eventType.includes('DEGRADED') || alert.eventType.includes('ABSTAIN'));

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`[PRECURSOR ALERT] ${alert.title}`, {
          body: alert.message,
          icon: '/favicon.ico',
        });
      } catch {}
    }
  }, []);

  const dismissAlert = useCallback(() => {
    if (activeAlert) {
      apiClient.markNotificationRead(activeAlert.id).catch(() => {});
    }
    setActiveAlert(null);
  }, [activeAlert]);

  // Poll notifications from backend
  useEffect(() => {
    let isMounted = true;

    const poll = async () => {
      try {
        const res = await apiClient.fetchNotifications(10, true);
        if (!isMounted || !res || !Array.isArray(res.events)) return;

        for (const ev of res.events) {
          if (!seenIdsRef.current.has(ev.id)) {
            seenIdsRef.current.add(ev.id);
            const sevStr = String(ev.severity || '').toUpperCase();
            const isCritical = sevStr.includes('CRITICAL') || sevStr.includes('HIGH');
            const isWarning = sevStr.includes('WARNING') || sevStr.includes('MEDIUM');
            const isAlertEvent = isCritical || isWarning || ev.event_type === 'GATE_STATE_TRANSITION' || String(ev.event_type || '').includes('INCIDENT');

            if (isAlertEvent) {
              const normalizedSeverity: 'CRITICAL' | 'WARNING' | 'INFO' = isCritical ? 'CRITICAL' : isWarning ? 'WARNING' : 'INFO';
              triggerAlert({
                id: ev.id,
                timestamp: ev.timestamp,
                title: ev.title,
                message: ev.message,
                severity: normalizedSeverity,
                eventType: ev.event_type,
                relatedIncidentId: ev.related_incident_id,
              });
              break; // Show most recent
            }
          }
        }
      } catch {}
    };

    poll();
    const timer = setInterval(poll, 3000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [triggerAlert]);

  // Gate transition local watcher
  useEffect(() => {
    if (prevGateState.current !== gateState) {
      const isBreach = gateState === 'DEGRADED' || gateState === 'ABSTAIN';
      if (isBreach) {
        triggerAlert({
          id: Date.now(),
          timestamp: Date.now() / 1000,
          title: `Reliability Gate: Transitioned to ${gateState}`,
          message: gateState === 'DEGRADED'
            ? 'Multi-horizon SLA threshold breached or distribution drift expanding. Live traffic affected.'
            : 'Sensor observation quality degraded below confidence threshold. Predictions suppressed.',
          severity: 'CRITICAL',
          eventType: 'GATE_STATE_TRANSITION',
        });
      }
      prevGateState.current = gateState;
    }
  }, [gateState, triggerAlert]);

  return {
    activeAlert,
    dismissAlert,
    triggerAlert,
    permissionGranted,
    requestPermission,
  };
}
