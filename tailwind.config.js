/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/renderer/**/*.{ts,tsx}',
    './index.html',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        forge: {
          background: '#09090B',
          'primary-surface': '#0D0D10',
          'secondary-surface': '#121216',
          'elevated-surface': '#17171C',
          'hover-surface': '#1C1C22',
          'border-subtle': '#24242A',
          'border-strong': '#303038',
          'text-primary': '#F5F5F6',
          'text-secondary': '#A1A1AA',
          'text-muted': '#71717A',
          accent: '#FF7A18',
          'accent-hover': '#FF8A32',
          success: '#22C55E',
          warning: '#F59E0B',
          danger: '#EF4444',
          info: '#60A5FA',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        '6': '6px',
        '8': '8px',
        '10': '10px',
        '12': '12px',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
      },
    },
  },
  plugins: [],
};