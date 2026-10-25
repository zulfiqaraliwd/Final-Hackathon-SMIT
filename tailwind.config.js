export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'] },
      colors: {
        ink: { DEFAULT: '#14232b', 700: '#24353e', 500: '#51636c', 300: '#9aa9b0', 100: '#e3e9ea', 50: '#f2f5f5' },
        teal: { DEFAULT: '#0d8f7d', dark: '#0a6f61', soft: '#dff3ef' },
        plum: { DEFAULT: '#5a4bc2', soft: '#ebe8fb' },
        amber: { DEFAULT: '#d98b1f', soft: '#fcefd6' },
        rose: { DEFAULT: '#c9453f', soft: '#fbe4e2' },
      },
    },
  },
  plugins: [],
};
