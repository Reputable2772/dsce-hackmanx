import React, { useState } from 'react';
import { 
  X, 
  UploadCloud, 
  Zap, 
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';
import { apiClient } from '@/lib/api';

interface CustomIngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIngestSuccess?: () => void;
}

interface IngestPreset {
  name: string;
  description: string;
  node_id: string;
  interface_id: string;
  metric_id: string;
  value: number;
  quality: string;
}

const PRESETS: IngestPreset[] = [
  {
    name: 'Severe Latency Spike (195ms)',
    description: 'Forces critical latency anomaly across core spine',
    node_id: 'spine-01',
    interface_id: 'eth0',
    metric_id: 'rtt_ms',
    value: 195.4,
    quality: 'good',
  },
  {
    name: 'Packet Loss Burst (14%)',
    description: 'Triggers distribution drift and packet loss alarm',
    node_id: 'leaf-agg-02',
    interface_id: 'xe-0/0/2',
    metric_id: 'packet_loss_pct',
    value: 14.2,
    quality: 'good',
  },
  {
    name: 'Transit Jitter Storm (32ms)',
    description: 'Injects microburst jitter buffer bloat',
    node_id: 'edge-gw-01',
    interface_id: 'eth1',
    metric_id: 'jitter_ms',
    value: 32.8,
    quality: 'good',
  },
  {
    name: 'Degraded Sensor (Stale Quality)',
    description: 'Tests Reliability Gate fallback on sensor degradation',
    node_id: 'spine-02',
    interface_id: 'eth0',
    metric_id: 'rtt_ms',
    value: 45.0,
    quality: 'stale',
  },
];

export const CustomIngestModal: React.FC<CustomIngestModalProps> = ({
  isOpen,
  onClose,
  onIngestSuccess,
}) => {
  const [nodeId, setNodeId] = useState('spine-01');
  const [interfaceId, setInterfaceId] = useState('eth0');
  const [metricId, setMetricId] = useState('rtt_ms');
  const [value, setValue] = useState('145.5');
  const [quality, setQuality] = useState('good');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyPreset = (p: IngestPreset) => {
    setNodeId(p.node_id);
    setInterfaceId(p.interface_id);
    setMetricId(p.metric_id);
    setValue(String(p.value));
    setQuality(p.quality);
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);

    const numVal = parseFloat(value);
    if (isNaN(numVal)) {
      setErrorMessage('Value must be a valid number');
      setIsSubmitting(false);
      return;
    }

    const payload = [
      {
        timestamp: Date.now() / 1000,
        node_id: nodeId.trim(),
        interface_id: interfaceId.trim(),
        metric_id: metricId.trim(),
        value: numVal,
        quality: quality.toLowerCase(),
      },
    ];

    try {
      const res = await apiClient.ingestTelemetry(payload);
      setStatusMessage(
        `Successfully ingested ${res.count || 1} telemetry point(s). Gate State: ${
          res.gate_state || 'UPDATED'
        }`
      );
      if (onIngestSuccess) onIngestSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Telemetry ingestion failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-[#E3E8F0] bg-white p-6 shadow-xl text-[#202938]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E3E8F0] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-[#5267D8]" />
            <h3 className="font-mono text-base font-bold text-[#202938]">
              Direct Telemetry Ingestion
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#687386] hover:bg-[#F8FAFC] hover:text-[#202938] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="mb-4">
          <label className="text-xs font-mono font-bold text-[#687386] uppercase tracking-wider block mb-2">
            Quick Ingestion Presets
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className="text-left rounded-lg border border-[#E3E8F0] bg-[#F8FAFC] p-2 hover:border-[#5267D8] hover:bg-white transition text-xs"
              >
                <div className="font-bold text-[#202938] font-mono">{p.name}</div>
                <div className="text-[10px] text-[#687386] leading-snug mt-0.5">{p.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleIngest} className="space-y-3 font-mono text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-[#687386] block mb-1">Node Identifier</label>
              <input
                type="text"
                value={nodeId}
                onChange={(e) => setNodeId(e.target.value)}
                placeholder="spine-01"
                className="w-full rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-xs text-[#202938] outline-none focus:border-[#5267D8]"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-[#687386] block mb-1">Interface ID</label>
              <input
                type="text"
                value={interfaceId}
                onChange={(e) => setInterfaceId(e.target.value)}
                placeholder="eth0"
                className="w-full rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-xs text-[#202938] outline-none focus:border-[#5267D8]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-[#687386] block mb-1">Metric ID</label>
              <select
                value={metricId}
                onChange={(e) => setMetricId(e.target.value)}
                className="w-full rounded-lg border border-[#CBD5E1] bg-white px-2 py-1.5 text-xs text-[#202938] outline-none focus:border-[#5267D8]"
              >
                <option value="rtt_ms">rtt_ms</option>
                <option value="packet_loss_pct">packet_loss_pct</option>
                <option value="throughput_mbps">throughput_mbps</option>
                <option value="jitter_ms">jitter_ms</option>
                <option value="interface_errors">interface_errors</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-[#687386] block mb-1">Metric Value</label>
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="120.0"
                className="w-full rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-xs text-[#202938] outline-none focus:border-[#5267D8]"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-[#687386] block mb-1">Data Quality</label>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                className="w-full rounded-lg border border-[#CBD5E1] bg-white px-2 py-1.5 text-xs text-[#202938] outline-none focus:border-[#5267D8]"
              >
                <option value="good">good</option>
                <option value="missing">missing</option>
                <option value="stale">stale</option>
                <option value="invalid">invalid</option>
              </select>
            </div>
          </div>

          {/* Feedback messages */}
          {statusMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{statusMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E3E8F0]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-semibold text-[#687386] hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-[#5267D8] px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>{isSubmitting ? 'Ingesting...' : 'Ingest Telemetry Point'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
