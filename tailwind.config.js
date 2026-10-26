/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        precursor: {
          navy: '#0E1122',
          'navy-deep': '#0B0D1B',
          'navy-darker': '#080A16',
          violet: '#241D42',
          'violet-deep': '#1A1435',
          purple: '#9B7BFF',
          'purple-bright': '#AF93FF',
          cyan: '#48DDF5',
          'cyan-bright': '#00F0FF',
          teal: '#45D6B5',
          'teal-mint': '#34D399',
          lavender: '#D9D2FF',
          amber: '#F59E0B',
          'amber-bright': '#FBBF24',
          coral: '#EF4444',
          'coral-bright': '#F87171',
          surface: '#14182E',
          'surface-glass': 'rgba(20, 24, 46, 0.75)',
          card: '#121528',
          'card-glass': 'rgba(18, 21, 40, 0.85)',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-active': 'rgba(155, 123, 255, 0.4)',
          'border-cyan': 'rgba(72, 221, 245, 0.35)',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-purple': '0 0 24px -4px rgba(155, 123, 255, 0.3)',
        'glow-cyan': '0 0 24px -4px rgba(72, 221, 245, 0.3)',
        'glow-teal': '0 0 24px -4px rgba(69, 214, 181, 0.3)',
        'glow-amber': '0 0 24px -4px rgba(245, 158, 11, 0.3)',
        'glow-coral': '0 0 24px -4px rgba(239, 68, 68, 0.3)',
        'glass-panel': '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
      },
    },
  },
  plugins: [],
}
