import type { Config } from 'tailwindcss';
export default { content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'], theme: { extend: { colors: { canvas: '#f6f5f1', ink: '#252722', muted: '#777a70', accent: '#e96b38', line: '#e6e6dd' }, fontFamily: { sans: ['Arial', 'Helvetica', 'sans-serif'] } } }, plugins: [] } satisfies Config;
