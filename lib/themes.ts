export interface Theme {
  id: string;
  name: string;
  description: string;
  preview: { bg: string; card: string; primary: string; text: string; border: string; };
  vars: Record<string, string>;
}

export const THEMES: Theme[] = [
  {
    id: 'dark-navy',
    name: 'Dark Navy',
    description: 'Azul escuro profissional — padrão do sistema',
    preview: { bg: '#080C14', card: '#0D1421', primary: '#2563EB', text: '#F1F5F9', border: 'rgba(255,255,255,0.06)' },
    vars: {
      '--background': '#080C14', '--foreground': '#F1F5F9',
      '--card': '#0D1421', '--card-foreground': '#F1F5F9',
      '--popover': '#0D1421', '--popover-foreground': '#F1F5F9',
      '--primary': '#2563EB', '--primary-foreground': '#ffffff',
      '--secondary': '#111827', '--secondary-foreground': '#94A3B8',
      '--muted': '#111827', '--muted-foreground': '#64748B',
      '--accent': '#1e3a5f', '--accent-foreground': '#3B82F6',
      '--destructive': '#EF4444', '--border': 'rgba(255,255,255,0.06)',
      '--input': '#111827', '--ring': '#2563EB', '--radius': '0.625rem',
      '--sidebar': '#0D1421', '--sidebar-border': 'rgba(255,255,255,0.06)',
    },
  },
  {
    id: 'buildsmart',
    name: 'BuildSmart',
    description: 'Ciano elétrico — inspirado no protótipo',
    preview: { bg: '#0A0F1E', card: '#0D1829', primary: '#0EA5E9', text: '#E2E8F0', border: 'rgba(14,165,233,0.15)' },
    vars: {
      '--background': '#0A0F1E', '--foreground': '#E2E8F0',
      '--card': '#0D1829', '--card-foreground': '#E2E8F0',
      '--popover': '#0D1829', '--popover-foreground': '#E2E8F0',
      '--primary': '#0EA5E9', '--primary-foreground': '#ffffff',
      '--secondary': '#0F2039', '--secondary-foreground': '#94A3B8',
      '--muted': '#0F2039', '--muted-foreground': '#64748B',
      '--accent': '#0c3050', '--accent-foreground': '#0EA5E9',
      '--destructive': '#F87171', '--border': 'rgba(14,165,233,0.12)',
      '--input': '#0F2039', '--ring': '#0EA5E9', '--radius': '0.625rem',
      '--sidebar': '#070C1A', '--sidebar-border': 'rgba(14,165,233,0.10)',
    },
  },
  {
    id: 'vinho',
    name: 'Vinho',
    description: 'Bordô escuro — identidade de construção civil',
    preview: { bg: '#0E080A', card: '#180D10', primary: '#7B1535', text: '#F1E8EA', border: 'rgba(123,21,53,0.18)' },
    vars: {
      '--background': '#0E080A', '--foreground': '#F1E8EA',
      '--card': '#180D10', '--card-foreground': '#F1E8EA',
      '--popover': '#180D10', '--popover-foreground': '#F1E8EA',
      '--primary': '#7B1535', '--primary-foreground': '#ffffff',
      '--secondary': '#221018', '--secondary-foreground': '#F9A8BE',
      '--muted': '#221018', '--muted-foreground': '#7A5563',
      '--accent': '#4a0d20', '--accent-foreground': '#F9A8BE',
      '--destructive': '#EF4444', '--border': 'rgba(123,21,53,0.16)',
      '--input': '#221018', '--ring': '#7B1535', '--radius': '0.625rem',
      '--sidebar': '#0A0508', '--sidebar-border': 'rgba(123,21,53,0.12)',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Roxo escuro — elegante e moderno',
    preview: { bg: '#060812', card: '#0C0E1F', primary: '#7C3AED', text: '#F1F5F9', border: 'rgba(124,58,237,0.15)' },
    vars: {
      '--background': '#060812', '--foreground': '#F1F5F9',
      '--card': '#0C0E1F', '--card-foreground': '#F1F5F9',
      '--popover': '#0C0E1F', '--popover-foreground': '#F1F5F9',
      '--primary': '#7C3AED', '--primary-foreground': '#ffffff',
      '--secondary': '#13132a', '--secondary-foreground': '#A78BFA',
      '--muted': '#13132a', '--muted-foreground': '#6B7280',
      '--accent': '#2d1b69', '--accent-foreground': '#A78BFA',
      '--destructive': '#EF4444', '--border': 'rgba(124,58,237,0.12)',
      '--input': '#13132a', '--ring': '#7C3AED', '--radius': '0.625rem',
      '--sidebar': '#090b18', '--sidebar-border': 'rgba(124,58,237,0.10)',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald',
    description: 'Verde esmeralda — fresco e objetivo',
    preview: { bg: '#070F0E', card: '#0D1A18', primary: '#10B981', text: '#F1F5F9', border: 'rgba(16,185,129,0.12)' },
    vars: {
      '--background': '#070F0E', '--foreground': '#F1F5F9',
      '--card': '#0D1A18', '--card-foreground': '#F1F5F9',
      '--popover': '#0D1A18', '--popover-foreground': '#F1F5F9',
      '--primary': '#10B981', '--primary-foreground': '#ffffff',
      '--secondary': '#0f2420', '--secondary-foreground': '#6EE7B7',
      '--muted': '#0f2420', '--muted-foreground': '#5B7A72',
      '--accent': '#064E3B', '--accent-foreground': '#6EE7B7',
      '--destructive': '#F87171', '--border': 'rgba(16,185,129,0.10)',
      '--input': '#0f2420', '--ring': '#10B981', '--radius': '0.625rem',
      '--sidebar': '#050c0b', '--sidebar-border': 'rgba(16,185,129,0.08)',
    },
  },
  {
    id: 'light-pro',
    name: 'Light Pro',
    description: 'Claro e limpo — para ambientes bem iluminados',
    preview: { bg: '#F8FAFC', card: '#FFFFFF', primary: '#2563EB', text: '#0F172A', border: 'rgba(0,0,0,0.08)' },
    vars: {
      '--background': '#F8FAFC', '--foreground': '#0F172A',
      '--card': '#FFFFFF', '--card-foreground': '#0F172A',
      '--popover': '#FFFFFF', '--popover-foreground': '#0F172A',
      '--primary': '#2563EB', '--primary-foreground': '#ffffff',
      '--secondary': '#F1F5F9', '--secondary-foreground': '#475569',
      '--muted': '#F1F5F9', '--muted-foreground': '#64748B',
      '--accent': '#EFF6FF', '--accent-foreground': '#1D4ED8',
      '--destructive': '#DC2626', '--border': 'rgba(0,0,0,0.08)',
      '--input': '#F1F5F9', '--ring': '#2563EB', '--radius': '0.625rem',
      '--sidebar': '#FFFFFF', '--sidebar-border': 'rgba(0,0,0,0.08)',
    },
  },
];

export const DEFAULT_THEME_ID = 'dark-navy';
export const CUSTOM_THEME_STORAGE_KEY = 'orcamento-civil-custom-color';

export function getTheme(id: string): Theme {
  return THEMES.find(t => t.id === id) ?? THEMES[0];
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const n = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function darken(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  const d = (c: number) => Math.round(c * (1 - factor)).toString(16).padStart(2, '0');
  return `#${d(r)}${d(g)}${d(b)}`;
}
function contrastText(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#0F172A' : '#ffffff';
}

export const CUSTOM_BG_STORAGE_KEY = 'orcamento-civil-custom-bg';

export function buildCustomTheme(primaryHex: string, darkBg = true): Theme {
  if (darkBg) {
    // Fundo escuro derivado da cor primária
    const bg    = darken(primaryHex, 0.93);
    const card  = darken(primaryHex, 0.88);
    const muted = darken(primaryHex, 0.82);
    const accent = darken(primaryHex, 0.65);
    const border = `rgba(${hexToRgb(primaryHex).join(',')},0.15)`;
    const fg = '#F1F5F9';
    return {
      id: 'personalizado', name: 'Personalizado', description: 'Tema criado por você (escuro)',
      preview: { bg, card, primary: primaryHex, text: fg, border },
      vars: {
        '--background': bg, '--foreground': fg,
        '--card': card, '--card-foreground': fg,
        '--popover': card, '--popover-foreground': fg,
        '--primary': primaryHex, '--primary-foreground': contrastText(primaryHex),
        '--secondary': muted, '--secondary-foreground': fg,
        '--muted': muted, '--muted-foreground': darken(fg, 0.4),
        '--accent': accent, '--accent-foreground': primaryHex,
        '--destructive': '#EF4444', '--border': border,
        '--input': muted, '--ring': primaryHex, '--radius': '0.625rem',
        '--sidebar': darken(primaryHex, 0.95), '--sidebar-border': border,
      },
    };
  } else {
    // Fundo claro — parecido com Light Pro mas com a cor primária escolhida
    const border = 'rgba(0,0,0,0.08)';
    const [r, g, b] = hexToRgb(primaryHex);
    const accentBg = `rgba(${r},${g},${b},0.08)`;
    return {
      id: 'personalizado', name: 'Personalizado', description: 'Tema criado por você (claro)',
      preview: { bg: '#F8FAFC', card: '#FFFFFF', primary: primaryHex, text: '#0F172A', border },
      vars: {
        '--background': '#F8FAFC', '--foreground': '#0F172A',
        '--card': '#FFFFFF', '--card-foreground': '#0F172A',
        '--popover': '#FFFFFF', '--popover-foreground': '#0F172A',
        '--primary': primaryHex, '--primary-foreground': contrastText(primaryHex),
        '--secondary': '#F1F5F9', '--secondary-foreground': '#475569',
        '--muted': '#F1F5F9', '--muted-foreground': '#64748B',
        '--accent': accentBg, '--accent-foreground': primaryHex,
        '--destructive': '#DC2626', '--border': border,
        '--input': '#F1F5F9', '--ring': primaryHex, '--radius': '0.625rem',
        '--sidebar': '#FFFFFF', '--sidebar-border': border,
      },
    };
  }
}
