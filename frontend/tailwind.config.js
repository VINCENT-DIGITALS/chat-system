/** @type {import('tailwindcss').Config} */
// Original design tokens for the community chat product.
// Inspired by community-chat layouts but NOT Discord — no Blurple, no
// trademarked palette. Every visible color resolves to a CSS variable
// declared in index.css so light/dark/near-black/soft-gray/system/custom
// themes can swap without touching components.
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Theme-aware surface + text tokens. Values come from CSS vars,
        // so they re-skin instantly when `data-theme` changes on <html>.
        app: {
          // Surfaces (low → high)
          950:  'rgb(var(--app-surface-950) / <alpha-value>)',
          900:  'rgb(var(--app-surface-900) / <alpha-value>)',
          850:  'rgb(var(--app-surface-850) / <alpha-value>)',
          800:  'rgb(var(--app-surface-800) / <alpha-value>)',
          floating: 'rgb(var(--app-surface-floating) / <alpha-value>)',
          700:  'rgb(var(--app-surface-700) / <alpha-value>)',
          600:  'rgb(var(--app-surface-600) / <alpha-value>)',
          'secondary-alt': 'rgb(var(--app-surface-secondary-alt) / <alpha-value>)',

          // Brand (settable via custom theme; default is original teal/violet,
          // NOT Discord Blurple)
          500: 'rgb(var(--app-brand) / <alpha-value>)',
          400: 'rgb(var(--app-brand-hover) / <alpha-value>)',
          300: 'rgb(var(--app-brand-active) / <alpha-value>)',

          // Text
          header: 'rgb(var(--app-text-strong) / <alpha-value>)',
          'header-secondary': 'rgb(var(--app-text-soft) / <alpha-value>)',
          text:   'rgb(var(--app-text) / <alpha-value>)',
          interactive: 'rgb(var(--app-interactive) / <alpha-value>)',
          'interactive-hover':  'rgb(var(--app-interactive-hover) / <alpha-value>)',
          'interactive-active': 'rgb(var(--app-interactive-active) / <alpha-value>)',
          muted:   'rgb(var(--app-muted) / <alpha-value>)',
          channel: 'rgb(var(--app-channel) / <alpha-value>)',

          // Functional
          accent:  'rgb(var(--app-brand) / <alpha-value>)',
          link:    'rgb(var(--app-link) / <alpha-value>)',
          green:   'rgb(var(--app-success) / <alpha-value>)',
          'green-dark': 'rgb(var(--app-success-dark) / <alpha-value>)',
          yellow:  'rgb(var(--app-warning) / <alpha-value>)',
          red:     'rgb(var(--app-danger) / <alpha-value>)',
          divider: 'rgb(var(--app-divider) / <alpha-value>)',
          mention: 'rgb(var(--app-brand) / 0.30)',

          // Presence
          'online':  'rgb(var(--app-presence-online) / <alpha-value>)',
          'idle':    'rgb(var(--app-presence-idle) / <alpha-value>)',
          'dnd':     'rgb(var(--app-presence-dnd) / <alpha-value>)',
          'offline': 'rgb(var(--app-presence-offline) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '"Noto Sans"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          'Consolas',
          '"Courier New"',
          'monospace',
        ],
      },
      fontSize: {
        message: ['var(--app-msg-font-size)', { lineHeight: 'var(--app-msg-line-height)' }],
        tiny:    ['0.6875rem', { lineHeight: '1rem' }],
        eyebrow: ['0.75rem',  { lineHeight: '1rem', letterSpacing: '0.02em' }],
      },
      spacing: {
        'row-gap':   'var(--app-row-gap)',
        'row-pad-y': 'var(--app-row-pad-y)',
      },
      boxShadow: {
        elevation:        '0 8px 16px rgba(0,0,0,0.24)',
        'elevation-high': '0 8px 24px rgba(0,0,0,0.32)',
        'channel-header': '0 1px 0 rgba(0,0,0,0.20), 0 1.5px 0 rgba(0,0,0,0.05), 0 2px 0 rgba(0,0,0,0.05)',
        ring: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
        'focus-brand': '0 0 0 2px rgb(var(--app-brand) / 0.6)',
      },
      transitionTimingFunction: {
        app: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        'fade-in':    { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        'msg-in':     { '0%': { opacity: 0, transform: 'translateY(3px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        'modal-in':   { '0%': { opacity: 0, transform: 'scale(0.96)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
        'pulse-soft': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.55 } },
        'shimmer':    { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        'bounce-dot': { '0%, 80%, 100%': { transform: 'scale(0.4)', opacity: 0.6 }, '40%': { transform: 'scale(1)', opacity: 1 } },
        'tooltip-in': { '0%': { opacity: 0, transform: 'translateY(2px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
      },
      animation: {
        'fade-in':    'fade-in 120ms cubic-bezier(0.4, 0, 0.2, 1)',
        'msg-in':     'msg-in 120ms cubic-bezier(0.4, 0, 0.2, 1)',
        'modal-in':   'modal-in 150ms cubic-bezier(0.4, 0, 0.2, 1)',
        'pulse-soft': 'pulse-soft 1.6s ease-in-out infinite',
        'shimmer':    'shimmer 1.6s linear infinite',
        'bounce-dot': 'bounce-dot 1.4s ease-in-out infinite',
        'tooltip-in': 'tooltip-in 120ms cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
