'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, RefreshCw, ChevronRight, FileText, Copy, LayoutTemplate, Download } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtData(iso: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return '—'; }
}

const STATUS_LABEL: Record<string, string> = {
  em_andamento: 'Em Andamento', aguardando_aprovacao: 'Aguard. Aprovação', aprovado: 'Aprovado', ativo: 'Em Andamento',
};
const STATUS_COR: Record<string, string> = {
  em_andamento: 'border-amber-300 text-amber-700 bg-amber-50',
  aguardando_aprovacao: 'border-blue-300 text-blue-700 bg-blue-50',
  aprovado: 'border-green-300 text-green-700 bg-green-50',
  ativo: 'border-amber-300 text-amber-700 bg-amber-50',
};

interface OrcamentoResumo {
  id: string; titulo: string; descricao: string;
  area_construida: number;
  data_criacao: string; status: string; bdi_percentual: number;
  total_direto: number; total_com_bdi: number; num_itens: number;
}

export default function OrcamentosPage() {
  const [orcamentos, setOrcamentos] = useState<OrcamentoResumo[]>([]);
  const [templates, setTemplates] = useState<OrcamentoResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [modoTemplate, setModoTemplate] = useState(false); // criar de template
  const [templateSelecionado, setTemplateSelecionado] = useState('');
  const [form, setForm] = useState({ titulo: '', descricao: '', area_construida: '', bdi_percentual: '0' });
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [resOrc, resTpl] = await Promise.all([
        fetch('/api/orcamentos'),
        fetch('/api/orcamentos?templates=1'),
      ]);
      const [dataOrc, dataTpl] = await Promise.all([resOrc.json(), resTpl.json()]);
      setOrcamentos(Array.isArray(dataOrc) ? dataOrc : []);
      setTemplates(Array.isArray(dataTpl) ? dataTpl : []);
    } catch {
      toast.error('Erro ao carregar orçamentos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function abrirNovo() {
    setModoTemplate(false);
    setTemplateSelecionado('');
    setForm({ titulo: '', descricao: '', area_construida: '', bdi_percentual: '0' });
    setModalAberto(true);
  }

  async function criar() {
    setSalvando(true);
    try {
      const body = modoTemplate && templateSelecionado
        ? { template_id: templateSelecionado, ...form, bdi_percentual: Number(form.bdi_percentual) }
        : { ...form, bdi_percentual: Number(form.bdi_percentual) };

      const res = await fetch('/api/orcamentos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.erros?.join(', ') || data.error); return; }
      toast.success('Orçamento criado');
      setModalAberto(false);
      setForm({ titulo: '', descricao: '', area_construida: '', bdi_percentual: '0' });
      carregar();
    } finally { setSalvando(false); }
  }

  async function excluir(id: string, titulo: string) {
    if (!confirm(`Excluir orçamento "${titulo}"?`)) return;
    const res = await fetch(`/api/orcamentos/${id}`, { method: 'DELETE' });
    if (res.ok) { setOrcamentos(prev => prev.filter(o => o.id !== id)); toast.success('Excluído'); }
    else toast.error('Erro ao excluir');
  }

  async function excluirTemplate(id: string, titulo: string) {
    if (!confirm(`Excluir template "${titulo}"?`)) return;
    const res = await fetch(`/api/orcamentos/${id}`, { method: 'DELETE' });
    if (res.ok) { setTemplates(prev => prev.filter(o => o.id !== id)); toast.success('Template excluído'); }
    else toast.error('Erro ao excluir');
  }

  async function duplicar(id: string, titulo: string) {
    try {
      const res = await fetch(`/api/orcamentos/${id}/clone`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: `Cópia de ${titulo}` }),
      });
      if (!res.ok) { toast.error('Erro ao duplicar'); return; }
      toast.success('Orçamento duplicado');
      carregar();
    } catch { toast.error('Erro ao duplicar'); }
  }

  const OrcCard = ({ orc, isTemplate = false }: { orc: OrcamentoResumo; isTemplate?: boolean }) => (
    <Card className={`hover:shadow-md transition-shadow ${isTemplate ? 'border-violet-200 bg-violet-50/30' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {isTemplate && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border border-violet-300 text-violet-700 bg-violet-100">
                  <LayoutTemplate className="h-2.5 w-2.5" /> TEMPLATE
                </span>
              )}
              <h3 className="font-semibold truncate">{orc.titulo.replace('[Template] ', '')}</h3>
              {!isTemplate && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${STATUS_COR[orc.status] || STATUS_COR.em_andamento}`}>
                  {STATUS_LABEL[orc.status] || orc.status}
                </span>
              )}
              {orc.bdi_percentual > 0 && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-gray-200 text-gray-600 bg-gray-50">
                  BDI {orc.bdi_percentual}%
                </span>
              )}
            </div>
            {orc.descricao && <p className="text-sm text-muted-foreground mt-0.5 truncate">{orc.descricao}</p>}
            <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
              <span>{orc.num_itens} item{orc.num_itens !== 1 ? 's' : ''}</span>
              <span>{fmtData(orc.data_criacao)}</span>
            </div>
          </div>
          <div className="text-right shrink-0 space-y-0.5">
            <p className="text-[10px] text-muted-foreground">Total com BDI</p>
            <p className="text-lg font-bold tabular-nums">{fmtBRL(orc.total_com_bdi)}</p>
            {orc.bdi_percentual > 0 && (
              <p className="text-[10px] text-muted-foreground">{fmtBRL(orc.total_direto)} direto</p>
            )}
            {orc.area_construida > 0 && orc.total_com_bdi > 0 && (
              <p className="text-[10px] font-semibold text-primary">
                {fmtBRL(orc.total_com_bdi / orc.area_construida)}/m²
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-3 border-t pt-3 flex-wrap">
          <Link href={`/orcamentos/${orc.id}`} className={`flex-1 min-w-[80px] ${buttonVariants({ size: 'sm', variant: 'outline' })}`}>
            <ChevronRight className="h-3 w-3 mr-1" /> Abrir
          </Link>
          <Button size="sm" variant="outline" title="Exportar XLSX"
            onClick={() => window.open(`/api/exportar?tipo=orcamento&id=${orc.id}`, '_blank')}>
            <Download className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="outline" title={isTemplate ? 'Usar este template' : 'Duplicar'}
            onClick={() => {
              if (isTemplate) {
                setModoTemplate(true);
                setTemplateSelecionado(orc.id);
                setForm({ titulo: orc.titulo.replace('[Template] ', ''), descricao: orc.descricao || '', area_construida: String(orc.area_construida || ''), bdi_percentual: String(orc.bdi_percentual) });
                setModalAberto(true);
              } else {
                duplicar(orc.id, orc.titulo);
              }
            }}>
            {isTemplate ? <LayoutTemplate className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </Button>
          <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive"
            title="Excluir"
            onClick={() => isTemplate ? excluirTemplate(orc.id, orc.titulo) : excluir(orc.id, orc.titulo)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Orçamentos</h1>
          <p className="text-muted-foreground text-xs">{orcamentos.length} orçamentos · {templates.length} templates</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" size="sm" title="Baixar modelo Excel para importação"
            onClick={() => window.open('/api/exportar?tipo=modelo-orcamento', '_blank')}>
            <Download className="h-3 w-3 mr-1" /> Modelo Importação
          </Button>
          <Button size="sm" onClick={abrirNovo}>
            <Plus className="h-3 w-3 mr-1" /> Novo Orçamento
          </Button>
        </div>
      </div>

      {loading && <p className="text-center text-muted-foreground text-sm py-12">Carregando...</p>}

      {/* Templates */}
      {!loading && templates.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <LayoutTemplate className="h-3.5 w-3.5" /> Templates
          </h2>
          <div className="grid gap-3">
            {templates.map(t => <OrcCard key={t.id} orc={t} isTemplate />)}
          </div>
        </div>
      )}

      {/* Orçamentos */}
      {!loading && orcamentos.length === 0 && templates.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum orçamento criado ainda</p>
          <Button size="sm" className="mt-3" onClick={abrirNovo}>Criar primeiro orçamento</Button>
        </div>
      )}

      {!loading && orcamentos.length > 0 && (
        <div>
          {templates.length > 0 && (
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" /> Orçamentos
            </h2>
          )}
          <div className="grid gap-3">
            {orcamentos.map(orc => <OrcCard key={orc.id} orc={orc} />)}
          </div>
        </div>
      )}

      {/* Modal Novo/Template */}
      <Dialog open={modalAberto} onOpenChange={v => !v && setModalAberto(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {modoTemplate ? <><LayoutTemplate className="h-4 w-4" /> Criar a partir de Template</> : 'Novo Orçamento'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {/* Opção de usar template */}
            {!modoTemplate && templates.length > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-violet-200 bg-violet-50/50">
                <LayoutTemplate className="h-4 w-4 text-violet-600 shrink-0" />
                <span className="text-sm text-violet-700 flex-1">Usar um template existente?</span>
                <Button size="sm" variant="outline" className="border-violet-300 text-violet-700 hover:bg-violet-100"
                  onClick={() => setModoTemplate(true)}>
                  Selecionar
                </Button>
              </div>
            )}

            {modoTemplate && (
              <div className="grid gap-1.5">
                <Label>Template <span className="text-destructive">*</span></Label>
                <Select value={templateSelecionado} onValueChange={v => {
                  if (!v) return;
                  setTemplateSelecionado(v);
                  const t = templates.find(x => x.id === v);
                  if (t) setForm(f => ({ ...f, titulo: t.titulo.replace('[Template] ', ''), bdi_percentual: String(t.bdi_percentual) }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecione um template..." /></SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.titulo.replace('[Template] ', '')} ({t.num_itens} itens)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button className="text-xs text-muted-foreground hover:text-foreground text-left"
                  onClick={() => { setModoTemplate(false); setTemplateSelecionado(''); }}>
                  ← Criar do zero
                </button>
              </div>
            )}

            <div className="grid gap-1.5">
              <Label>Título <span className="text-destructive">*</span></Label>
              <Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex: Residência Unifamiliar 120m²" className="h-10" />
            </div>
            <div className="grid gap-1.5">
              <Label>Área Construída (m²) <span className="text-destructive">*</span></Label>
              <Input type="number" min="1" step="0.5" value={form.area_construida}
                onChange={e => setForm(f => ({ ...f, area_construida: e.target.value }))}
                placeholder="Ex: 80" className="h-10" />
            </div>
            <div className="grid gap-1.5">
              <Label>Descrição</Label>
              <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Descrição opcional..." className="h-10" />
            </div>
            <div className="grid gap-1.5">
              <Label>BDI (%)</Label>
              <Input type="number" min="0" max="100" step="0.1" value={form.bdi_percentual}
                onChange={e => setForm(f => ({ ...f, bdi_percentual: e.target.value }))} className="h-10" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button onClick={criar} disabled={salvando || !form.titulo.trim() || !form.area_construida || (modoTemplate && !templateSelecionado)}>
              {salvando ? 'Criando...' : modoTemplate ? 'Criar do Template' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
