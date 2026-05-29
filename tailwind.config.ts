import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1d1b19',
        'ink-2': '#514c46',
        'ink-3': '#8a847c',
        'ink-4': '#b4ada3',
        line: '#dcd7cf',
        'line-2': '#ebe7e0',
        fill: '#f4f1ec',
        'fill-2': '#faf8f4',
        paper: '#ffffff',
        dark: '#262320',
        'dark-2': '#33302b',
        'dark-ink': '#cfc8bd',
        accent: '#c96442',
        'accent-soft': '#f3ddd2',
        'cap-trusted': '#3f8f4f',
        'cap-trusted-bg': '#e6f1e6',
        'cap-data': '#3270b0',
        'cap-data-bg': '#e3eef8',
        'cap-parsed': '#c79212',
        'cap-parsed-bg': '#faf0d2',
        'cap-write': '#d9772b',
        'cap-write-bg': '#fbe7d4',
        danger: '#bf3b2f',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans SC"', '"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', '"IBM Plex Sans SC"', 'ui-monospace', 'monospace'],
        hand: ['"Gochi Hand"', '"Architects Daughter"', 'cursive'],
      },
      borderRadius: {
        card: '7px',
      },
      fontSize: {
        'h1': ['19px', { fontWeight: '600', letterSpacing: '-0.01em' }],
        'h2': ['15px', { fontWeight: '600' }],
        'h3': ['13px', { fontWeight: '600' }],
        eyebrow: ['10px', { fontWeight: '600', letterSpacing: '0.14em' }],
        base: ['13px', { lineHeight: '1.45' }],
        sm: ['11px', {}],
        xs: ['10px', {}],
      },
    },
  },
  plugins: [],
} satisfies Config
