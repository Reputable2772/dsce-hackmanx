import React from 'react';
import { X, Sliders } from 'lucide-react';
import { ThresholdsSettingsSection } from '@/features/settings/components/ThresholdsSettingsSection';
import { useAppStore } from '@/stores/useAppStore';

interface ThresholdsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThresholdsModal: React.FC<ThresholdsModalProps> = ({ isOpen, onClose }) => {
  const connectionState = useAppStore((s) => s.connectionState);
  const isConnected = connectionState === 'connected';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-2xl rounded-2xl border border-[#E3E8F0] bg-white p-6 shadow-xl text-[#202938] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E3E8F0] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-[#5267D8]" />
            <h3 className="font-mono text-base font-bold text-[#202938]">
              Detection Engine & Reliability Gate Thresholds
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#687386] hover:bg-[#F8FAFC] hover:text-[#202938] transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <ThresholdsSettingsSection isConnected={isConnected} />
      </div>
    </div>
  );
};
