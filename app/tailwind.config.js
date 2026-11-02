/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          tint: '#EFF6FF',
          ring: '#93C5FD',
        },
        background: '#F8FAFC',
        surface: '#FFFFFF',
        border: '#E2E8F0',
        text: {
          DEFAULT: '#0F172A',
          secondary: '#475569',
          muted: '#64748B',
        },
        positive: {
          DEFAULT: '#15803D',
          bg: '#F0FDF4',
        },
        due: {
          DEFAULT: '#B91C1C',
          bg: '#FEF2F2',
        },
        warning: {
          DEFAULT: '#B45309',
          bg: '#FFFBEB',
        },
      },
      borderRadius: {
        control: '8px',
        card: '12px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
}
