'use client';

import { useEffect } from 'react';
import { THEMES, getTheme, DEFAULT_THEME_ID, buildCustomTheme, CUSTOM_THEME_STORAGE_KEY, CUSTOM_BG_STORAGE_KEY } from '@/lib/themes';

export const STORAGE_KEY = 'orcamento-civil-theme';

export function applyTheme(themeId: string, customColor?: string, customDarkBg?: boolean) {
  const isDark = customDarkBg !== false; // default true
  const theme = themeId === 'personalizado' && customColor
    ? buildCustomTheme(customColor, isDark)
    : getTheme(themeId);
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.setAttribute('data-theme', themeId);
  try {
    localStorage.setItem(STORAGE_KEY, themeId);
    if (customColor) localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, customColor);
    if (customDarkBg !== undefined) localStorage.setItem(CUSTOM_BG_STORAGE_KEY, customDarkBg ? 'dark' : 'light');
  } catch { /**/ }
}

export function getStoredThemeId(): string {
  if (typeof window === 'undefined') return DEFAULT_THEME_ID;
  try { return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_THEME_ID; } catch { return DEFAULT_THEME_ID; }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const id = getStoredThemeId();
    const custom = id === 'personalizado' ? (localStorage.getItem(CUSTOM_THEME_STORAGE_KEY) ?? '#2563EB') : undefined;
    const darkBg = localStorage.getItem(CUSTOM_BG_STORAGE_KEY) !== 'light';
    applyTheme(id, custom, darkBg);
  }, []);
  return <>{children}</>;
}

export function ThemeScript() {
  const themesMap = Object.fromEntries(THEMES.map(t => [t.id, t.vars]));
  const script = `(function(){try{var id=localStorage.getItem('orcamento-civil-theme')||'${DEFAULT_THEME_ID}';var m=${JSON.stringify(themesMap)};var v=m[id];if(!v)return;var r=document.documentElement;Object.keys(v).forEach(function(k){r.style.setProperty(k,v[k]);});r.setAttribute('data-theme',id);}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
