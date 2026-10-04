export type UiThemeMode = 'dark' | 'light';

const themes = {
  dark: {
    bg: { primary: '#050607', secondary: '#090b0e', card: '#0d1016', input: '#050607', hover: '#13161c', surface: '#141920' },
    border: { default: '#1a2030', strong: '#252d3d' },
    text: { primary: '#dde4ee', secondary: '#8e9eb5', muted: '#5c6a7e' },
    accent: { blue: '#22d3ee', green: '#24d166', purple: '#a78bfa', yellow: '#f0b429' },
    shadow: '0 2px 12px rgba(0,0,0,0.5)',
  },
  light: {
    bg: { primary: '#f5f7fb', secondary: '#eef3f8', card: '#ffffff', input: '#ffffff', hover: '#e7eef7', surface: '#e3ebf5' },
    border: { default: '#ccd7e5', strong: '#aebdd1' },
    text: { primary: '#17212f', secondary: '#405269', muted: '#66788f' },
    accent: { blue: '#0891b2', green: '#16934a', purple: '#7c3aed', yellow: '#c68a00' },
    shadow: '0 8px 24px rgba(15,23,42,0.08)',
  },
} as const;

export function initialThemeMode(): UiThemeMode {
  return localStorage.getItem('color-theme') === 'dark' ? 'dark' : 'light';
}

export function applyThemeMode(mode: UiThemeMode): void {
  const theme = themes[mode];
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.style.colorScheme = mode;
  root.style.setProperty('--app-bg', theme.bg.primary);
  root.style.setProperty('--app-fg', theme.text.primary);
  root.style.setProperty('--app-surface', theme.bg.card);
  root.style.setProperty('--iris-secondary', theme.bg.secondary);
  root.style.setProperty('--iris-surface', theme.bg.surface);
  root.style.setProperty('--iris-input', theme.bg.input);
  root.style.setProperty('--iris-hover', theme.bg.hover);
  root.style.setProperty('--iris-border', theme.border.default);
  root.style.setProperty('--iris-border-strong', theme.border.strong);
  root.style.setProperty('--iris-text', theme.text.primary);
  root.style.setProperty('--iris-secondary-text', theme.text.secondary);
  root.style.setProperty('--iris-muted', theme.text.muted);
  root.style.setProperty('--iris-blue', theme.accent.blue);
  root.style.setProperty('--iris-green', theme.accent.green);
  root.style.setProperty('--iris-purple', theme.accent.purple);
  root.style.setProperty('--iris-yellow', theme.accent.yellow);
  root.style.setProperty('--iris-card-shadow', theme.shadow);
  localStorage.setItem('color-theme', mode);
}
