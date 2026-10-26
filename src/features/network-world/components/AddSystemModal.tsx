import React, { useState } from 'react';
import { X, Server, Shield, AlertCircle, Loader2 } from 'lucide-react';
import { apiClient, RegisteredSystem } from '@/lib/api';

interface AddSystemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSystemAdded: (system: RegisteredSystem) => void;
}

export const AddSystemModal: React.FC<AddSystemModalProps> = ({
  isOpen,
  onClose,
  onSystemAdded,
}) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [port, setPort] = useState('80');
  const [probeEnabled, setProbeEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const validateTarget = (target: string): string | null => {
    const trimmed = target.trim();
    if (!trimmed) {
      return 'Target IP address or hostname is required.';
    }
    // Reject shell meta-characters or spaces to ensure safe operator-configured targets
    if (/[\s;`$|&><\\]/.test(trimmed)) {
      return 'Target must not contain spaces or shell metacharacters.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedAddress = address.trim();

    if (!trimmedName) {
      setError('System display name is required.');
      return;
    }

    const targetErr = validateTarget(trimmedAddress);
    if (targetErr) {
      setError(targetErr);
      return;
    }

    const parsedPort = parseInt(port, 10);
    if (isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
      setError('Port must be a valid number between 1 and 65535.');
      return;
    }

    setLoading(true);
    try {
      const created = await apiClient.addSystem({
        name: trimmedName,
        address: trimmedAddress,
        description: description.trim(),
        probe_enabled: probeEnabled,
        port: parsedPort,
        tags: ['peer', 'operator-configured'],
      });

      // Reset form
      setName('');
      setAddress('');
      setDescription('');
      setPort('80');
      setProbeEnabled(true);
      setError(null);

      onSystemAdded(created);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to register network system. Check network permissions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg rounded-2xl border border-[#E3E8F0] bg-white p-6 shadow-xl transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-system-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E3E8F0] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-[#5267D8]">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h2 id="add-system-title" className="text-base font-bold text-[#202938]">
                Register Network System
              </h2>
              <p className="text-xs text-[#687386]">
                Configure a peer computer or target for active reachability telemetry.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            title="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="font-medium leading-relaxed">{error}</div>
            </div>
          )}

          <div>
            <label htmlFor="sys-name" className="block text-xs font-semibold text-[#202938] mb-1">
              Display Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="sys-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Friend's Laptop (ThinkPad X1)"
              disabled={loading}
              className="w-full rounded-xl border border-[#E3E8F0] bg-white px-3.5 py-2 text-xs text-[#202938] placeholder-slate-400 focus:border-[#5267D8] focus:outline-none focus:ring-1 focus:ring-[#5267D8] transition"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label htmlFor="sys-address" className="block text-xs font-semibold text-[#202938] mb-1">
                IP Address or Hostname <span className="text-rose-500">*</span>
              </label>
              <input
                id="sys-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="192.168.1.105 or peer.local"
                disabled={loading}
                className="w-full rounded-xl border border-[#E3E8F0] bg-white px-3.5 py-2 font-mono text-xs text-[#202938] placeholder-slate-400 focus:border-[#5267D8] focus:outline-none focus:ring-1 focus:ring-[#5267D8] transition"
                required
              />
            </div>

            <div>
              <label htmlFor="sys-port" className="block text-xs font-semibold text-[#202938] mb-1">
                Fallback Port
              </label>
              <input
                id="sys-port"
                type="number"
                min="1"
                max="65535"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                disabled={loading}
                className="w-full rounded-xl border border-[#E3E8F0] bg-white px-3.5 py-2 font-mono text-xs text-[#202938] placeholder-slate-400 focus:border-[#5267D8] focus:outline-none focus:ring-1 focus:ring-[#5267D8] transition"
              />
            </div>
          </div>

          <div>
            <label htmlFor="sys-desc" className="block text-xs font-semibold text-[#202938] mb-1">
              Description / Location Notes <span className="text-[#687386] font-normal">(Optional)</span>
            </label>
            <textarea
              id="sys-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Peer node connected on DSCE lab Wi-Fi subnet"
              disabled={loading}
              className="w-full rounded-xl border border-[#E3E8F0] bg-white px-3.5 py-2 text-xs text-[#202938] placeholder-slate-400 focus:border-[#5267D8] focus:outline-none focus:ring-1 focus:ring-[#5267D8] transition"
            />
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-[#E3E8F0] bg-[#F6F8FB] p-3">
            <input
              id="sys-probe"
              type="checkbox"
              checked={probeEnabled}
              onChange={(e) => setProbeEnabled(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 rounded border-slate-300 text-[#5267D8] focus:ring-[#5267D8]"
            />
            <label htmlFor="sys-probe" className="text-xs text-[#202938] cursor-pointer select-none">
              <span className="font-semibold block">Enable Continuous Health Probing</span>
              <span className="text-[11px] text-[#687386]">
                Periodically executes safe ICMP ping and TCP connect probes to calculate RTT, loss, and jitter.
              </span>
            </label>
          </div>

          {/* Privacy & Safety Notice */}
          <div className="flex items-center gap-2 text-[11px] text-[#687386]">
            <Shield className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <span>Safe read-only network probe. Only configured, authorized systems are probed.</span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E3E8F0]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-[#E3E8F0] px-4 py-2 text-xs font-semibold text-[#687386] hover:bg-slate-50 hover:text-[#202938] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#5267D8] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#4355b8] focus:outline-none focus:ring-2 focus:ring-[#5267D8] focus:ring-offset-1 transition disabled:opacity-50"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{loading ? 'Probing & Registering...' : 'Register System'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
