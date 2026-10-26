import React from 'react';

interface NetworkBrandMarkProps {
  className?: string;
  size?: number;
}

export const NetworkBrandMark: React.FC<NetworkBrandMarkProps> = ({ className = '', size = 28 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="PRECURSOR Network Brandmark"
    >
      <circle cx="16" cy="6" r="3" fill="#48DDF5" />
      <circle cx="6" cy="24" r="3" fill="#9B7BFF" />
      <circle cx="26" cy="24" r="3" fill="#45D6B5" />
      <circle cx="16" cy="18" r="4" fill="#D9D2FF" />

      {/* Network Edges */}
      <line x1="16" y1="6" x2="16" y2="18" stroke="rgba(72, 221, 245, 0.4)" strokeWidth="1.5" strokeDasharray="2 2" />
      <line x1="6" y1="24" x2="16" y2="18" stroke="rgba(155, 123, 255, 0.4)" strokeWidth="1.5" />
      <line x1="26" y1="24" x2="16" y2="18" stroke="rgba(69, 214, 181, 0.4)" strokeWidth="1.5" />

      {/* Core Pulse Ring */}
      <circle cx="16" cy="18" r="7" stroke="rgba(155, 123, 255, 0.3)" strokeWidth="1" />
    </svg>
  );
};
