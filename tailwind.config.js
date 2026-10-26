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
          navy: '#111323',
          violet: '#29204A',
          purple: '#9B7BFF',
          cyan: '#48DDF5',
          teal: '#45D6B5',
          lavender: '#D9D2FF',
          amber: '#F59E0B',
          coral: '#EF4444',
          surface: '#181A2F',
          card: '#151728',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-active': 'rgba(155, 123, 255, 0.35)',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-purple': '0 0 24px -4px rgba(155, 123, 255, 0.25)',
        'glow-cyan': '0 0 24px -4px rgba(72, 221, 245, 0.25)',
        'glow-teal': '0 0 24px -4px rgba(69, 214, 181, 0.25)',
      },
    },
  },
  plugins: [],
}
