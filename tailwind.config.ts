import type { Config } from 'tailwindcss';
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: {
      canvas: '#f3f6f3', ink: '#182c25', muted: '#687b71', accent: '#16815e', line: '#dfe8e1',
      zinc: { 50:'#f5f8f6',100:'#eaf1ed',200:'#d4e1da',300:'#b8cbc0',400:'#8fa99b',500:'#6f8b7c',600:'#4e695b',700:'#314b3e',800:'#23392e',900:'#14281f',950:'#0a1812' },
    },
    fontFamily: { sans: ['Inter', 'Arial', 'Helvetica', 'sans-serif'] },
    boxShadow: { panel: '0 8px 32px -16px rgb(14 47 31 / 0.18)', control: '0 1px 2px rgb(0 0 0 / 0.06)' },
  } }, plugins: [],
} satisfies Config;
