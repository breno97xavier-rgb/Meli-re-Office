export const MELIERE_TOKENS = {
  colors: {
    coral: {
      default: '#F15A3C',
      hover: '#DE4B2E',
      light: '#FDF1EE',
      border: '#FBC3B8',
      muted: 'rgba(241, 90, 60, 0.12)',
    },
    grafite: {
      default: '#1D1D1D',
      hover: '#262626',
      card: '#242424',
      border: '#333333',
      subtle: '#2D2D2D',
      elevated: '#2A2A2A',
    },
    gray: {
      light: '#EDEEEE',
      muted: '#F2F3F3',
      border: '#E8E9EA',
      subtle: '#DCDDDE',
    },
    surface: {
      base: '#F7F7F8',
      card: '#FFFFFF',
      cardHover: '#FAFAFA',
      dark: '#1D1D1D',
    },
    text: {
      primary: '#1D1D1D',
      secondary: '#666668',
      muted: '#9E9EA0',
      inverted: '#FFFFFF',
      invertedMuted: '#A0A0A2',
    },
  },
  typography: {
    fontFamily: 'Alexandria, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  radius: {
    sm: '6px',
    md: '10px',
    lg: '14px',
    full: '9999px',
  },
  transitions: {
    default: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
  },
} as const;
