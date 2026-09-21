import type { Config } from 'tailwindcss';
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: {
      canvas: '#f5f5f4', ink: '#252827', muted: '#666b68', accent: '#49685a', line: '#e2e4e2',
      zinc: { 50:'#fafafa',100:'#f0f1f0',200:'#dfe2df',300:'#c4c9c5',400:'#a1a9a3',500:'#89928b',600:'#636d65',700:'#414944',800:'#2e3530',900:'#222824',950:'#191e1b' },
      lime: { 200:'#dce5df',300:'#c7d7cb',400:'#b0c5b6',500:'#92ad9b',600:'#708c79',700:'#536f5d' },
      emerald: { 50:'#f0f4f1',100:'#e4ece6',200:'#ccdbd0',300:'#b2c9b9',400:'#96b3a0',500:'#749a80',600:'#52765e',700:'#42644e',800:'#36533f',900:'#2a4233' },
    },
    fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'] },
    boxShadow: { panel: '0 8px 32px -16px rgb(14 47 31 / 0.18)', control: '0 1px 2px rgb(0 0 0 / 0.06)' },
  } }, plugins: [],
} satisfies Config;
