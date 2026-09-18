import type { Config } from 'tailwindcss';
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: {
      canvas: '#f1f5f4', ink: '#152923', muted: '#61756c', accent: '#087f5b', line: '#dce6e1',
      zinc: { 50:'#f8faf9',100:'#eef2f1',200:'#dbe3e0',300:'#bccac4',400:'#96aaa1',500:'#778d82',600:'#55675f',700:'#36473f',800:'#24332d',900:'#17231e',950:'#0c1511' },
    },
    fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'] },
    boxShadow: { panel: '0 8px 32px -16px rgb(14 47 31 / 0.18)', control: '0 1px 2px rgb(0 0 0 / 0.06)' },
  } }, plugins: [],
} satisfies Config;
