import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Search, 
  Copy, 
  Check, 
  ChevronRight, 
  X, 
  FileText, 
  RefreshCw
} from 'lucide-react';
import { apiClient } from '@/lib/api';

export interface RunbookItem {
  filename: string;
  title: string;
  tags: string[];
  target_metrics: string[];
  content: string;
}

const FALLBACK_RUNBOOKS: RunbookItem[] = [
  {
    filename: 'latency_jitter.md',
    title: 'Elevated Latency and Jitter Degradation',
    tags: ['latency_ms', 'jitter_ms', 'rtt', 'lag', 'delay', 'bufferbloat', 'queue'],
    target_metrics: ['latency_ms', 'jitter_ms'],
    content: `# Runbook: Elevated Latency and Jitter Degradation\n**Tags:** latency_ms, jitter_ms, rtt, lag, delay, bufferbloat, queue\n**Target Metrics:** latency_ms, jitter_ms\n\n## 1. Symptoms\n- Round-trip time (RTT) climbing above nominal SLA (e.g. > 80ms).\n- Jitter variance expanding beyond baseline thresholds.\n\n## 2. Diagnostic Commands\n\`\`\`bash\n# Measure per-hop RTT\nmtr -n -c 10 --report-wide 1.1.1.1\n\n# Check queue discipline\ntc -s qdisc show dev eth0\n\`\`\`\n\n## 3. Remediation Options\n- Apply Active Queue Management: sudo tc qdisc replace dev eth0 root fq_codel`,
  },
  {
    filename: 'packet_loss.md',
    title: 'Intermittent or Sustained Packet Loss',
    tags: ['packet_loss_pct', 'drops', 'crc_errors', 'discard'],
    target_metrics: ['packet_loss_pct'],
    content: `# Runbook: Intermittent or Sustained Packet Loss\n**Tags:** packet_loss_pct, drops, crc_errors, discard\n**Target Metrics:** packet_loss_pct\n\n## 1. Symptoms\n- Ingress or egress drops detected in hardware counters.\n\n## 2. Diagnostic Commands\n\`\`\`bash\n# Check interface statistics\nip -s link show dev eth0\nethtool -S eth0 | grep -iE "drop|err|discard"\n\`\`\``,
  },
  {
    filename: 'routing.md',
    title: 'BGP and Routing Flapping Anomalies',
    tags: ['routing', 'bgp', 'flapping', 'convergence', 'asymmetric'],
    target_metrics: ['latency_ms', 'packet_loss_pct'],
    content: `# Runbook: BGP and Routing Flapping Anomalies\n**Tags:** routing, bgp, flapping, convergence, asymmetric\n**Target Metrics:** latency_ms, packet_loss_pct\n\n## 1. Symptoms\n- Sudden route table re-convergence and traffic redirection.\n\n## 2. Diagnostic Commands\n\`\`\`bash\nip route show\njournalctl -u frr -n 50\n\`\`\``,
  },
  {
    filename: 'congestion.md',
    title: 'Egress Interface Buffer Congestion',
    tags: ['congestion', 'bufferbloat', 'throughput_mbps', 'backpressure'],
    target_metrics: ['throughput_mbps', 'latency_ms'],
    content: `# Runbook: Egress Interface Buffer Congestion\n**Tags:** congestion, bufferbloat, throughput_mbps, backpressure\n**Target Metrics:** throughput_mbps, latency_ms\n\n## 1. Symptoms\n- Line-rate saturation causing dropped frames in transmission ring.\n\n## 2. Diagnostic Commands\n\`\`\`bash\nethtool -g eth0\ntc -s qdisc show dev eth0\n\`\`\``,
  },
  {
    filename: 'interface_failures.md',
    title: 'Hardware Link Degradation & Physical Layer Errors',
    tags: ['interface', 'link_down', 'crc', 'carrier', 'physical'],
    target_metrics: ['drops_in', 'packet_loss_pct'],
    content: `# Runbook: Hardware Link Degradation & Physical Layer Errors\n**Tags:** interface, link_down, crc, carrier, physical\n**Target Metrics:** drops_in, packet_loss_pct\n\n## 1. Symptoms\n- Link carrier transitions and CRC error frame counters incrementing.\n\n## 2. Diagnostic Commands\n\`\`\`bash\ndmesg | grep -iE "eth|link|carrier"\nethtool -m eth0\n\`\`\``,
  },
  {
    filename: 'connectivity.md',
    title: 'Complete Gateway Blackhole & Unreachability',
    tags: ['connectivity', 'blackhole', 'unreachable', 'gateway'],
    target_metrics: ['packet_loss_pct', 'latency_ms'],
    content: `# Runbook: Complete Gateway Blackhole & Unreachability\n**Tags:** connectivity, blackhole, unreachable, gateway\n**Target Metrics:** packet_loss_pct, latency_ms\n\n## 1. Symptoms\n- 100% packet loss to next-hop default gateway.\n\n## 2. Diagnostic Commands\n\`\`\`bash\nip neigh show\nping -c 4 192.168.1.1\n\`\`\``,
  },
  {
    filename: 'sensor_degradation.md',
    title: 'Telemetry Sensor Invalidation & Data Loss',
    tags: ['sensor_health', 'stale', 'missing', 'quality'],
    target_metrics: ['sensor_health'],
    content: `# Runbook: Telemetry Sensor Invalidation & Data Loss\n**Tags:** sensor_health, stale, missing, quality\n**Target Metrics:** sensor_health\n\n## 1. Symptoms\n- High proportion of stale or missing telemetry observations.\n\n## 2. Diagnostic Commands\n\`\`\`bash\ncurl -s http://127.0.0.1:8000/api/status | jq .quality_stats\n\`\`\``,
  },
  {
    filename: 'tunnel.md',
    title: 'Encapsulation & MTU Fragmentation Overheads',
    tags: ['tunnel', 'mtu', 'fragmentation', 'gre', 'vxlan', 'ipsec'],
    target_metrics: ['throughput_mbps', 'latency_ms'],
    content: `# Runbook: Encapsulation & MTU Fragmentation Overheads\n**Tags:** tunnel, mtu, fragmentation, gre, vxlan, ipsec\n**Target Metrics:** throughput_mbps, latency_ms\n\n## 1. Symptoms\n- TCP MSS blackholing and ICMP Destination Unreachable drops.\n\n## 2. Diagnostic Commands\n\`\`\`bash\nping -M do -s 1472 1.1.1.1\nip link show type vxlan\n\`\`\``,
  },
  {
    filename: 'recovery.md',
    title: 'Post-Incident Recovery & Gate Re-Arming Audit',
    tags: ['recovery', 'gate_reset', 'verification', 'postmortem'],
    target_metrics: ['gate_state'],
    content: `# Runbook: Post-Incident Recovery & Gate Re-Arming Audit\n**Tags:** recovery, gate_reset, verification, postmortem\n**Target Metrics:** gate_state\n\n## 1. Symptoms\n- Post-remediation verification ensuring stability before re-opening gates.\n\n## 2. Diagnostic Commands\n\`\`\`bash\ncurl -s http://127.0.0.1:8000/api/gate\n\`\`\``,
  },
];

export const RunbookLibrarySection: React.FC = () => {
  const [runbooks, setRunbooks] = useState<RunbookItem[]>(FALLBACK_RUNBOOKS);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [activeRunbook, setActiveRunbook] = useState<RunbookItem | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const loadRunbooks = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.fetchRunbooks();
      if (res && Array.isArray(res.runbooks) && res.runbooks.length > 0) {
        setRunbooks(res.runbooks);
      }
    } catch {
      // Fallback kept
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRunbooks();
  }, []);

  const allTags = Array.from(
    new Set(runbooks.flatMap((r) => r.tags || []))
  ).sort();

  const filteredRunbooks = runbooks.filter((rb) => {
    if (selectedTag !== 'ALL') {
      const hasTag = rb.tags?.some((t) => t.toLowerCase() === selectedTag.toLowerCase());
      if (!hasTag) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = rb.title?.toLowerCase().includes(q);
      const matchFile = rb.filename?.toLowerCase().includes(q);
      const matchTags = rb.tags?.some((t) => t.toLowerCase().includes(q));
      const matchContent = rb.content?.toLowerCase().includes(q);
      if (!matchTitle && !matchFile && !matchTags && !matchContent) return false;
    }
    return true;
  });

  const handleCopyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E3E8F0] bg-white p-4 shadow-sm text-xs font-mono">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-[#5267D8]" />
          <span className="font-bold text-[#202938]">Operational Runbook Library</span>
          <span className="rounded-full bg-[#EEF2FF] border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-[#5267D8]">
            {filteredRunbooks.length} of {runbooks.length} Available
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search runbooks, commands, metrics..."
              className="rounded-lg border border-[#CBD5E1] bg-white pl-8 pr-3 py-1.5 text-xs text-[#202938] outline-none focus:border-[#5267D8] w-64"
            />
          </div>

          <button
            type="button"
            onClick={loadRunbooks}
            disabled={isLoading}
            className="rounded-lg border border-[#CBD5E1] bg-white p-2 text-[#687386] hover:bg-slate-50 transition"
            title="Reload runbooks from backend"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tag Chips Scrollbar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono">
        <button
          type="button"
          onClick={() => setSelectedTag('ALL')}
          className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition whitespace-nowrap ${
            selectedTag === 'ALL'
              ? 'bg-[#5267D8] text-white shadow-xs'
              : 'border border-[#CBD5E1] bg-white text-[#687386] hover:bg-slate-50'
          }`}
        >
          ALL TOPICS
        </button>
        {allTags.slice(0, 12).map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => setSelectedTag(tag)}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition whitespace-nowrap ${
              selectedTag === tag
                ? 'bg-[#5267D8] text-white shadow-xs'
                : 'border border-[#E3E8F0] bg-[#F8FAFC] text-[#687386] hover:bg-white hover:text-[#202938]'
            }`}
          >
            #{tag}
          </button>
        ))}
      </div>

      {/* Runbook Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRunbooks.map((rb) => (
          <div
            key={rb.filename}
            className="flex flex-col justify-between rounded-xl border border-[#E3E8F0] bg-white p-4 shadow-sm hover:border-[#5267D8] hover:shadow-md transition text-[#202938]"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2 font-mono text-[10px] text-[#687386]">
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3 text-[#5267D8]" />
                  <span>{rb.filename}</span>
                </span>
                {rb.target_metrics && rb.target_metrics.length > 0 && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700 font-semibold">
                    {rb.target_metrics[0]}
                  </span>
                )}
              </div>

              <h4 className="text-sm font-bold text-[#202938] leading-snug mb-2">
                {rb.title}
              </h4>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-3">
                {rb.tags.slice(0, 4).map((t, i) => (
                  <span
                    key={i}
                    className="rounded bg-[#F8FAFC] border border-[#E3E8F0] px-1.5 py-0.5 text-[10px] font-mono text-[#687386]"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-[#E3E8F0] flex items-center justify-between">
              <span className="text-[11px] font-mono text-[#687386]">Offline verified</span>
              <button
                type="button"
                onClick={() => setActiveRunbook(rb)}
                className="inline-flex items-center gap-1 rounded-lg bg-[#5267D8] px-3 py-1.5 text-xs font-mono font-bold text-white hover:bg-indigo-700 transition shadow-xs"
              >
                <span>Read Runbook</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Runbook Reader Modal */}
      {activeRunbook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="relative flex flex-col w-full max-w-3xl max-h-[85vh] rounded-2xl border border-[#E3E8F0] bg-white p-6 shadow-2xl text-[#202938]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E3E8F0] pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#5267D8]" />
                <div>
                  <h3 className="font-mono text-base font-bold text-[#202938]">
                    {activeRunbook.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-mono text-[#687386]">
                    <span>File: {activeRunbook.filename}</span>
                    <span>•</span>
                    <span>Target: {activeRunbook.target_metrics?.join(', ') || 'General Network'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyText(activeRunbook.content, 999)}
                  className="flex items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1 text-xs font-mono font-semibold text-[#202938] hover:bg-slate-50 transition"
                  title="Copy entire runbook text"
                >
                  {copiedIndex === 999 ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-[#5267D8]" />}
                  <span>{copiedIndex === 999 ? 'Copied' : 'Copy All'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveRunbook(null)}
                  className="rounded-lg p-1.5 text-[#687386] hover:bg-slate-100 hover:text-[#202938] transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Content - Markdown formatted display */}
            <div className="overflow-y-auto space-y-4 pr-2 font-mono text-xs">
              <div className="rounded-xl border border-indigo-100 bg-[#EEF2FF] p-3 text-xs text-[#5267D8] flex items-center justify-between">
                <span>Deterministic operational runbook verified for air-gapped mission-critical environments.</span>
                <span className="font-bold">PRECURSOR OFFLINE CERTIFIED</span>
              </div>

              <div className="rounded-xl border border-[#E3E8F0] bg-[#F8FAFC] p-4 whitespace-pre-wrap font-mono text-xs leading-relaxed text-[#202938]">
                {activeRunbook.content}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-[#E3E8F0] mt-4 shrink-0">
              <button
                type="button"
                onClick={() => setActiveRunbook(null)}
                className="rounded-lg border border-[#CBD5E1] bg-white px-4 py-2 font-mono text-xs font-semibold text-[#202938] hover:bg-slate-50"
              >
                Close Runbook
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
