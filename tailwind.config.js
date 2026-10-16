/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cairo', 'Tajawal', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        forest: '#166534',
        leaf: '#22C55E',
        mist: '#F0FDF4',
      },
    },
  },
  plugins: [],
};
