'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Package, Layers, FileText, Upload, Download,
  Settings, HardHat, Menu, X, Zap, ShoppingCart,
  LayoutDashboard, Building2, ClipboardList, CalendarDays,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const navGroups = [
  {
    label: 'GESTÃO DE OBRAS',
    items: [
      { href: '/',              label: 'Dashboard',      icon: LayoutDashboard },
      { href: '/obras',         label: 'Obras',          icon: Building2 },
      { href: '/gerenciamento', label: 'Gerenciamento',  icon: ClipboardList },
      { href: '/compras',       label: 'Lista de Compras', icon: ShoppingCart },
      { href: '/planejamento',  label: 'Cronograma',     icon: CalendarDays },
    ],
  },
  {
    label: 'ORÇAMENTO',
    items: [
      { href: '/orcamentos',  label: 'Orçamentos',   icon: FileText },
      { href: '/calculadora', label: 'Calculadora',  icon: Zap },
      { href: '/insumos',     label: 'Insumos',      icon: Package },
      { href: '/composicoes', label: 'Composições',  icon: Layers },
    ],
  },
  {
    label: 'SISTEMA',
    items: [
      { href: '/importar',      label: 'Importar',      icon: Upload },
      { href: '/exportar',      label: 'Exportar',      icon: Download },
      { href: '/configuracoes', label: 'Configurações', icon: Settings },
    ],
  },
];

function NavItems({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-4 p-3 overflow-y-auto flex-1">
      {navGroups.map(group => (
        <div key={group.label}>
          <p className="text-[10px] font-bold tracking-widest text-muted-foreground/60 px-3 mb-1 uppercase">
            {group.label}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = href === '/' ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-4 py-4 border-b">
      <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
        <HardHat className="h-4 w-4 text-primary-foreground" />
      </div>
      <div className="min-w-0">
        <p className="font-bold text-sm leading-tight truncate">Sistema de Gestão</p>
        <p className="text-[10px] text-muted-foreground leading-tight">v1.0</p>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:flex-col md:w-56 md:border-r md:min-h-screen bg-background">
      <Logo />
      <NavItems />
    </aside>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="flex md:hidden items-center gap-3 px-4 py-3 border-b bg-background sticky top-0 z-40">
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
          <HardHat className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <span className="font-semibold text-sm">Sistema de Gestão 1.0</span>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-background border-r flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b">
              <span className="font-bold text-sm">Sistema de Gestão 1.0</span>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <NavItems onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
