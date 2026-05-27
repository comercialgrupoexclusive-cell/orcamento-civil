'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Layers, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Stats {
  insumos: number;
  composicoes: number;
  orcamentos: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [ins, comp, orc] = await Promise.all([
        fetch('/api/insumos').then(r => r.json()),
        fetch('/api/composicoes').then(r => r.json()),
        fetch('/api/orcamentos').then(r => r.json()),
      ]);
      setStats({
        insumos: Array.isArray(ins) ? ins.length : 0,
        composicoes: Array.isArray(comp) ? comp.length : 0,
        orcamentos: Array.isArray(orc) ? orc.length : 0,
      });
    } catch {
      setError('Erro ao carregar dados. Tente inicializar o sistema.');
    } finally {
      setLoading(false);
    }
  }

  async function inicializar() {
    try {
      const res = await fetch('/api/init', { method: 'POST' });
      const data = await res.json();
      if (data.error) { toast.error(data.error); return; }
      const msg = data.criadas?.length > 0
        ? `Arquivos criados: ${data.criadas.join(', ')}`
        : 'Sistema já inicializado';
      toast.success(msg);
      load();
    } catch {
      toast.error('Falha ao inicializar');
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Sistema de Orçamento para Construção Civil</p>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg border border-destructive/30 bg-destructive/10 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div className="text-sm text-destructive">
            <p className="font-medium">Erro de conexão</p>
            <p className="mt-1">{error}</p>
            <div className="mt-3 flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={load}>
                <RefreshCw className="h-3 w-3 mr-1" /> Tentar novamente
              </Button>
              <Button size="sm" variant="outline" onClick={inicializar}>
                Inicializar sistema
              </Button>
            </div>
          </div>
        </div>
      )}

      {!error && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Insumos', value: stats?.insumos, Icon: Package, href: '/insumos' },
            { label: 'Composições', value: stats?.composicoes, Icon: Layers, href: '/composicoes' },
            { label: 'Orçamentos', value: stats?.orcamentos, Icon: FileText, href: '/orcamentos' },
          ].map(({ label, value, Icon, href }) => (
            <Card key={href}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Icon className="h-4 w-4" /> {label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{loading ? '—' : (value ?? 0)}</p>
                <Link href={href} className="text-xs text-primary hover:underline">Ver todos →</Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="bg-muted/50 rounded-lg p-4 text-sm">
        <p className="font-medium mb-2">Primeiros passos</p>
        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
          <li>Clique em <strong>Inicializar sistema</strong> para criar os arquivos de dados</li>
          <li>Cadastre insumos em <Link href="/insumos" className="text-primary hover:underline">Insumos</Link></li>
          <li>Monte composições em <Link href="/composicoes" className="text-primary hover:underline">Composições</Link></li>
          <li>Crie um orçamento em <Link href="/orcamentos" className="text-primary hover:underline">Orçamentos</Link></li>
        </ol>
        <Button size="sm" variant="outline" className="mt-3" onClick={inicializar}>
          Inicializar sistema
        </Button>
      </div>
    </div>
  );
}
