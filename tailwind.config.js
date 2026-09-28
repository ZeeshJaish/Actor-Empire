/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{js,ts,jsx,tsx}',
    './views/**/*.{js,ts,jsx,tsx}',
    './hooks/**/*.{js,ts,jsx,tsx}',
    './services/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  safelist: [
    {
      pattern: /^(bg|text|border|from|via|to)-(red|blue|amber|rose|emerald|cyan)-(400|500|900|950)(\/(0|5|10|20|30|50))?$/,
      variants: ['hover', 'group-hover'],
    },
    {
      pattern: /^text-(pink|purple|blue|rose|amber|sky|fuchsia|lime|green|cyan|emerald)-400$/,
    },
    'shadow-[0_0_50px_rgba(6,182,212,0.15)]',
    'shadow-[0_0_50px_rgba(220,38,38,0.15)]',
  ],
  plugins: [],
};
