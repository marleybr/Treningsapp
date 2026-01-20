/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'midnight': '#0f0f1a',
        'deep-purple': '#1a1a2e',
        'electric': '#00d9ff',
        'neon-green': '#39ff14',
        'coral': '#ff6b6b',
        'gold': '#ffd93d',
        'soft-white': '#f0f0f5',
      },
      fontFamily: {
        'display': ['Outfit', 'sans-serif'],
        'body': ['DM Sans', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px #00d9ff, 0 0 10px #00d9ff' },
          '100%': { boxShadow: '0 0 20px #00d9ff, 0 0 30px #00d9ff' },
        },
      },
    },
  },
  plugins: [],
}


