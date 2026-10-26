import React, { useState, useEffect } from 'react';
import { 
  FileCode, 
  Search, 
  RefreshCw, 
  Download, 
  ChevronRight, 
  ChevronDown, 
  ArrowRight
} from 'lucide-react';
import { apiClient } from '@/lib/api';

interface PacketItem {
  packet_id: string;
  incident_id: string;
  timestamp: number;
  protocol: string;
  src_ip: string;
  dst_ip: string;
  src_port: number | null;
  dst_port: number | null;
  size_bytes: number;
  ttl: number;
  flags: string[];
  labels: Record<string, any>;
  raw_details: Record<string, any>;
}

interface PacketForensicsTabProps {
  incidentId: string;
}

export const PacketForensicsTab: React.FC<PacketForensicsTabProps> = ({ incidentId }) => {
  const [packets, setPackets] = useState<PacketItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [protocolFilter, setProtocolFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPacketId, setExpandedPacketId] = useState<string | null>(null);

  const loadPackets = async () => {
    if (!incidentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.fetchIncidentPackets(incidentId, 200);
      if (res && Array.isArray(res.packets)) {
        setPackets(res.packets);
      } else {
        setPackets([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch packet capture samples');
      setPackets([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPackets();
  }, [incidentId]);

  const filteredPackets = packets.filter((p) => {
    if (protocolFilter !== 'ALL' && p.protocol?.toUpperCase() !== protocolFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchIp = p.src_ip?.toLowerCase().includes(q) || p.dst_ip?.toLowerCase().includes(q);
      const matchProto = p.protocol?.toLowerCase().includes(q);
      const matchPort = String(p.src_port).includes(q) || String(p.dst_port).includes(q);
      const matchFlags = Array.isArray(p.flags) && p.flags.some((f) => f.toLowerCase().includes(q));
      if (!matchIp && !matchProto && !matchPort && !matchFlags) return false;
    }
    return true;
  });

  const getProtocolBadge = (proto: string) => {
    const p = proto?.toUpperCase() || 'UNKNOWN';
    switch (p) {
      case 'TCP':
        return 'bg-indigo-50 text-[#5267D8] border-indigo-200';
      case 'UDP':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'ICMP':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'IP':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(packets, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${incidentId}-packets.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-4">
      {/* Subheader & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E3E8F0] bg-[#F8FAFC] p-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Protocol Filter Pills */}
          {['ALL', 'TCP', 'UDP', 'ICMP', 'IP'].map((proto) => (
            <button
              key={proto}
              type="button"
              onClick={() => setProtocolFilter(proto)}
              className={`rounded-lg px-2.5 py-1 font-mono text-[11px] font-semibold transition ${
                protocolFilter === proto
                  ? 'bg-[#5267D8] text-white shadow-xs'
                  : 'bg-white text-[#687386] border border-[#CBD5E1] hover:text-[#202938]'
              }`}
            >
              {proto}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search IP, port, flags..."
              className="rounded-lg border border-[#CBD5E1] bg-white pl-8 pr-3 py-1 text-xs text-[#202938] outline-none focus:border-[#5267D8]"
            />
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={loadPackets}
            disabled={isLoading}
            className="rounded-lg border border-[#CBD5E1] bg-white p-1.5 text-[#687386] hover:bg-slate-100 hover:text-[#202938] transition"
            title="Refresh packet capture"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Export JSON Button */}
          {packets.length > 0 && (
            <button
              type="button"
              onClick={handleExportJson}
              className="flex items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1 text-xs font-semibold text-[#202938] hover:bg-slate-100 transition"
              title="Export packet samples as JSON"
            >
              <Download className="h-3.5 w-3.5 text-[#5267D8]" />
              <span>Export</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Packet Table */}
      {filteredPackets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 text-center text-xs text-[#687386]">
          <FileCode className="mx-auto h-8 w-8 text-slate-400 mb-2" />
          <p className="font-semibold text-[#202938]">
            {packets.length === 0
              ? 'No granular packet traces logged for this incident.'
              : 'No packets match the current filter.'}
          </p>
          <p className="mt-1 text-[11px] max-w-md mx-auto">
            Deep-packet capture records are automatically ingested during high-anomaly states, link flapping, or when running live socket probes.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#E3E8F0] bg-white shadow-xs">
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="sticky top-0 border-b border-[#E3E8F0] bg-[#F8FAFC] text-[11px] font-semibold text-[#687386]">
                <tr>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Proto</th>
                  <th className="py-2.5 px-3">Source &rarr; Destination</th>
                  <th className="py-2.5 px-3 text-right">Length</th>
                  <th className="py-2.5 px-3 text-right">TTL</th>
                  <th className="py-2.5 px-3">Flags / Info</th>
                  <th className="py-2.5 px-3 text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E8F0]">
                {filteredPackets.map((pkt) => {
                  const isExpanded = expandedPacketId === pkt.packet_id;
                  const timeFormatted = new Date(pkt.timestamp * 1000).toISOString().substring(11, 23);
                  const srcDisplay = pkt.src_port ? `${pkt.src_ip}:${pkt.src_port}` : pkt.src_ip;
                  const dstDisplay = pkt.dst_port ? `${pkt.dst_ip}:${pkt.dst_port}` : pkt.dst_ip;

                  return (
                    <React.Fragment key={pkt.packet_id}>
                      <tr
                        onClick={() => setExpandedPacketId(isExpanded ? null : pkt.packet_id)}
                        className={`cursor-pointer transition hover:bg-[#F8FAFC] ${
                          isExpanded ? 'bg-indigo-50/40' : ''
                        }`}
                      >
                        <td className="py-2 px-3 text-[#687386] whitespace-nowrap">{timeFormatted}</td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${getProtocolBadge(pkt.protocol)}`}>
                            {pkt.protocol}
                          </span>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-[#202938]">
                          <div className="flex items-center gap-1.5">
                            <span>{srcDisplay}</span>
                            <ArrowRight className="h-3 w-3 text-slate-400" />
                            <span>{dstDisplay}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right text-[#687386]">{pkt.size_bytes} B</td>
                        <td className="py-2 px-3 text-right text-[#687386]">{pkt.ttl}</td>
                        <td className="py-2 px-3">
                          <div className="flex flex-wrap items-center gap-1">
                            {Array.isArray(pkt.flags) && pkt.flags.map((f, i) => (
                              <span
                                key={i}
                                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                  f.toUpperCase() === 'RST' || f.toUpperCase() === 'FIN'
                                    ? 'bg-rose-100 text-rose-800'
                                    : f.toUpperCase() === 'SYN'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-[#5267D8] mx-auto" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400 mx-auto" />
                          )}
                        </td>
                      </tr>

                      {/* Expandable JSON & Header Detail Drawer */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="border-b border-[#E3E8F0] bg-[#F8FAFC] p-4 font-mono text-xs">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between border-b border-[#E3E8F0] pb-2 text-[11px] font-bold text-[#202938]">
                                <span>Packet ID: {pkt.packet_id}</span>
                                <span className="text-[#687386]">Raw Dissection & Layer Information</span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <h5 className="text-[11px] font-bold text-[#687386] uppercase tracking-wider mb-1">
                                    Dissected Properties
                                  </h5>
                                  <div className="rounded-lg border border-[#E3E8F0] bg-white p-2.5 space-y-1 text-[11px]">
                                    <div><span className="text-slate-400">Timestamp:</span> {pkt.timestamp}</div>
                                    <div><span className="text-slate-400">Source:</span> {srcDisplay}</div>
                                    <div><span className="text-slate-400">Destination:</span> {dstDisplay}</div>
                                    <div><span className="text-slate-400">Protocol:</span> {pkt.protocol}</div>
                                    <div><span className="text-slate-400">Length:</span> {pkt.size_bytes} bytes</div>
                                    <div><span className="text-slate-400">Time To Live (TTL):</span> {pkt.ttl}</div>
                                  </div>
                                </div>

                                <div>
                                  <h5 className="text-[11px] font-bold text-[#687386] uppercase tracking-wider mb-1">
                                    Raw Header Details
                                  </h5>
                                  <pre className="max-h-36 overflow-y-auto rounded-lg border border-[#E3E8F0] bg-slate-900 p-2.5 text-[11px] text-emerald-400">
                                    {JSON.stringify(pkt.raw_details || pkt.labels, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-[#E3E8F0] bg-[#F8FAFC] px-3.5 py-2 text-[11px] text-[#687386] flex items-center justify-between font-mono">
            <span>Showing {filteredPackets.length} of {packets.length} sampled packets</span>
            <span>Buffered from precursor packet dissector engine</span>
          </div>
        </div>
      )}
    </div>
  );
};
