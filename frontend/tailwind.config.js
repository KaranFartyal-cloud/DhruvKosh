/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ncpor: {
          bg: '#070707',
          sidebar: '#0D0D0D',
          panel: '#171717',
          elevated: '#1C1C1C',
          divider: '#292929',
          accent: '#FF6A2A',
          accentBright: '#FF7A3D',
          accentSoft: '#FF9A68',
          accentWarm: '#FFB088',
          primary: '#F5F5F5',
          secondary: '#A0A0A0',
          muted: '#666666',
          success: '#E2E8F0',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
        'premium-hover': '0 8px 30px -4px rgba(0, 0, 0, 0.6)',
        'accent-glow': '0 0 0 2px rgba(255,106,42,0.18)',
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
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
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
        orbitDot: {
          '0%, 100%': { transform: 'translate(-50%,-50%) rotate(0deg) translateX(18px)' },
          '100%':     { transform: 'translate(-50%,-50%) rotate(360deg) translateX(18px)' },
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
