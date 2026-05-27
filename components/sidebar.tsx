'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Package,
  Layers,
  FileText,
  Upload,
  Download,
  Settings,
  HardHat,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const nav = [
  { href: '/', label: 'Dashboard', icon: HardHat },
  { href: '/insumos', label: 'Insumos', icon: Package },
  { href: '/composicoes', label: 'Composições', icon: Layers },
  { href: '/orcamentos', label: 'Orçamentos', icon: FileText },
  { href: '/importar', label: 'Importar', icon: Upload },
  { href: '/exportar', label: 'Exportar', icon: Download },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

function NavItems({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 p-3">
      {nav.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onClose}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            pathname === href || (href !== '/' && pathname.startsWith(href))
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:flex-col md:w-56 md:border-r md:min-h-screen bg-background">
      <div className="flex items-center gap-2 px-5 py-4 border-b">
        <HardHat className="h-5 w-5 text-primary" />
        <span className="font-semibold text-sm">Orçamento Civil</span>
      </div>
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
        <HardHat className="h-5 w-5 text-primary" />
        <span className="font-semibold text-sm">Orçamento Civil</span>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-background border-r">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <span className="font-semibold text-sm">Orçamento Civil</span>
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
