import { create } from 'zustand';

export type AppTheme = 'cyberpunk-navy' | 'dark-slate';
export type AppDensity = 'comfortable' | 'compact';
export type AppDemoMode = 'guided_demo' | 'explore';

export interface AppSettings {
  theme: AppTheme;
  reducedMotion: boolean;
  density: AppDensity;
  demoMode: AppDemoMode;
  showParticles: boolean;
  showNodeLabels: boolean;
  autoRotateCamera: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'cyberpunk-navy',
  reducedMotion: false,
  density: 'comfortable',
  demoMode: 'guided_demo',
  showParticles: true,
  showNodeLabels: true,
  autoRotateCamera: false,
};

const STORAGE_KEY = 'precursor_user_settings_v1';

function loadStoredSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    // Fallback if localStorage is inaccessible or corrupted
  }
  return DEFAULT_SETTINGS;
}

function saveStoredSettings(settings: AppSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota or disabled storage errors
  }
}

interface SettingsState extends AppSettings {
  setTheme: (theme: AppTheme) => void;
  setReducedMotion: (reducedMotion: boolean) => void;
  setDensity: (density: AppDensity) => void;
  setDemoMode: (demoMode: AppDemoMode) => void;
  setShowParticles: (showParticles: boolean) => void;
  setShowNodeLabels: (showNodeLabels: boolean) => void;
  setAutoRotateCamera: (autoRotateCamera: boolean) => void;
  resetDemoPreferences: () => void;
  restoreDefaults: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  const initial = loadStoredSettings();

  // Apply reduced motion class to root immediately
  if (typeof document !== 'undefined') {
    if (initial.reducedMotion) {
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.remove('reduced-motion');
    }
  }

  const persist = (updated: Partial<AppSettings>) => {
    const next = { ...get(), ...updated };
    const toSave: AppSettings = {
      theme: next.theme,
      reducedMotion: next.reducedMotion,
      density: next.density,
      demoMode: next.demoMode,
      showParticles: next.showParticles,
      showNodeLabels: next.showNodeLabels,
      autoRotateCamera: next.autoRotateCamera,
    };
    saveStoredSettings(toSave);
  };

  return {
    ...initial,

    setTheme: (theme) => {
      set({ theme });
      persist({ theme });
    },

    setReducedMotion: (reducedMotion) => {
      set({ reducedMotion });
      if (typeof document !== 'undefined') {
        if (reducedMotion) {
          document.documentElement.classList.add('reduced-motion');
        } else {
          document.documentElement.classList.remove('reduced-motion');
        }
      }
      persist({ reducedMotion });
    },

    setDensity: (density) => {
      set({ density });
      persist({ density });
    },

    setDemoMode: (demoMode) => {
      set({ demoMode });
      persist({ demoMode });
    },

    setShowParticles: (showParticles) => {
      set({ showParticles });
      persist({ showParticles });
    },

    setShowNodeLabels: (showNodeLabels) => {
      set({ showNodeLabels });
      persist({ showNodeLabels });
    },

    setAutoRotateCamera: (autoRotateCamera) => {
      set({ autoRotateCamera });
      persist({ autoRotateCamera });
    },

    resetDemoPreferences: () => {
      const reset = {
        demoMode: DEFAULT_SETTINGS.demoMode,
        showParticles: DEFAULT_SETTINGS.showParticles,
        showNodeLabels: DEFAULT_SETTINGS.showNodeLabels,
        autoRotateCamera: DEFAULT_SETTINGS.autoRotateCamera,
      };
      set(reset);
      persist(reset);
    },

    restoreDefaults: () => {
      if (typeof document !== 'undefined') {
        document.documentElement.classList.remove('reduced-motion');
      }
      set(DEFAULT_SETTINGS);
      saveStoredSettings(DEFAULT_SETTINGS);
    },
  };
});
