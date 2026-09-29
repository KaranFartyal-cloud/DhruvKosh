/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'hind': ['"Noto Sans Devanagari"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        display: ['Inter', 'sans-serif'],
      },
      colors: {
        ncpor: {
          bg: 'var(--bg)',
          sidebar: 'var(--surface)',
          panel: 'var(--surface)',
          elevated: 'var(--surface-subtle)',
          divider: 'var(--border)',
          accent: 'var(--accent)',
          accentBright: 'var(--accent)',
          accentSoft: 'var(--accent)',
          accentWarm: 'var(--secondary)',
          primary: 'var(--text)',
          secondary: 'var(--text-muted)',
          muted: 'var(--text-muted)',
          success: '#10B981',
        },
        polar: {
          dark: '#05080F',
          darkSurface: '#0D1422',
          light: '#F4F7FB',
          lightSurface: '#FFFFFF',
          cyan: '#7FE7F5',
          blue: '#2F5FA8',
          teal: '#0A7C8C',
          amber: '#F2B441',
        }
      },
      boxShadow: {
        'premium': '0 4px 20px -2px rgba(0, 0, 0, 0.35)',
        'premium-hover': '0 12px 30px -4px rgba(0, 0, 0, 0.45)',
        'accent-glow': '0 0 0 2px var(--accent-glow)',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.19, 1, 0.22, 1)',
        'out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
      },
      transitionDuration: {
        '150': '150ms',
        '220': '220ms',
        '350': '350ms',
        '450': '450ms',
        '700': '700ms',
        '900': '900ms',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(0)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition:  '200% center' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideRight: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%':      { transform: 'translateX(-4px)' },
          '40%':      { transform: 'translateX(4px)' },
          '60%':      { transform: 'translateX(-2px)' },
          '80%':      { transform: 'translateX(2px)' },
        },
        progressFill: {
          '0%':   { width: '0%' },
        },
      },
      animation: {
        'fade-up':      'fadeUp 0.45s cubic-bezier(0.25,1,0.5,1) both',
        'fade-up-fast': 'fadeUp 0.3s cubic-bezier(0.25,1,0.5,1) both',
        'fade-in':      'fadeIn 0.35s ease-out both',
        'scale-in':     'scaleIn 0.28s cubic-bezier(0.25,1,0.5,1) both',
        'shimmer':      'shimmer 2.5s linear infinite',
        'slide-right':  'slideRight 1.2s ease-in-out infinite',
        'shake':        'shake 0.3s ease-in-out',
      },
    },
  },
  plugins: [],
}
