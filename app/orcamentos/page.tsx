'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Trash2, RefreshCw, ChevronRight, FileText } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import type { Orcamento } from '@/lib/types';

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface OrcamentoResumo extends Orcamento {
  total_direto: number;
  total_com_bdi: number;
  num_itens: number;
}

export default function OrcamentosPage() {
  const [orcamentos, setOrcamentos] = useState<OrcamentoResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({ titulo: '', descricao: '', bdi_percentual: '0' });
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orcamentos');
      const data = await res.json();
      setOrcamentos(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Erro ao carregar orçamentos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function criar() {
    setSalvando(true);
    try {
      const res = await fetch('/api/orcamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, bdi_percentual: Number(form.bdi_percentual) }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.erros?.join(', ') || data.error); return; }
      toast.success('Orçamento criado');
      setModalAberto(false);
      setForm({ titulo: '', descricao: '', bdi_percentual: '0' });
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id: string, titulo: string) {
    if (!confirm(`Excluir orçamento "${titulo}"?`)) return;
    const res = await fetch(`/api/orcamentos/${id}`, { method: 'DELETE' });
    if (res.ok) { setOrcamentos(prev => prev.filter(o => o.id !== id)); toast.success('Excluído'); }
    else toast.error('Erro ao excluir');
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Orçamentos</h1>
          <p className="text-muted-foreground text-xs">{orcamentos.length} orçamentos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" onClick={() => setModalAberto(true)}>
            <Plus className="h-3 w-3 mr-1" /> Novo Orçamento
          </Button>
        </div>
      </div>

      {loading && <p className="text-center text-muted-foreground text-sm py-12">Carregando...</p>}

      {!loading && orcamentos.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum orçamento criado ainda</p>
          <Button size="sm" className="mt-3" onClick={() => setModalAberto(true)}>Criar primeiro orçamento</Button>
        </div>
      )}

      <div className="grid gap-3">
        {!loading && orcamentos.map(orc => (
          <Card key={orc.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{orc.titulo}</h3>
                    <Badge variant={orc.status === 'ativo' ? 'default' : 'secondary'} className="text-xs">
                      {orc.status}
                    </Badge>
                    {orc.bdi_percentual > 0 && (
                      <Badge variant="outline" className="text-xs">BDI {orc.bdi_percentual}%</Badge>
                    )}
                  </div>
                  {orc.descricao && <p className="text-sm text-muted-foreground mt-0.5 truncate">{orc.descricao}</p>}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{orc.num_itens} itens</span>
                    <span>{orc.data_criacao}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">Total com BDI</p>
                  <p className="text-lg font-bold tabular-nums">{fmtBRL(orc.total_com_bdi)}</p>
                  {orc.bdi_percentual > 0 && (
                    <p className="text-xs text-muted-foreground">{fmtBRL(orc.total_direto)} (direto)</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-3 border-t pt-3">
                <Link href={`/orcamentos/${orc.id}`} className={`flex-1 ${buttonVariants({ size: 'sm', variant: 'outline' })}`}>
                  <ChevronRight className="h-3 w-3 mr-1" /> Abrir
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`/api/exportar?tipo=orcamento&id=${orc.id}`, '_blank')}
                >
                  Exportar XLSX
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => excluir(orc.id, orc.titulo)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={modalAberto} onOpenChange={v => !v && setModalAberto(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Orçamento</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Título *</Label>
              <Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Residência Unifamiliar 120m²" />
            </div>
            <div className="grid gap-1.5">
              <Label>Descrição</Label>
              <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição opcional..." />
            </div>
            <div className="grid gap-1.5">
              <Label>BDI (%)</Label>
              <Input type="number" min="0" max="100" step="0.1" value={form.bdi_percentual} onChange={e => setForm(f => ({ ...f, bdi_percentual: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button onClick={criar} disabled={salvando}>{salvando ? 'Salvando...' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
