'use client';

import { useEffect, useState, useCallback, use, Fragment } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Trash2, RefreshCw, Check, X,
  Download, FileText, GripVertical, Pencil, Calendar,
} from 'lucide-react';
import type { Composicao } from '@/lib/types';
import { ETAPAS, ORCAMENTO_STATUS_LABEL } from '@/lib/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function fmtData(iso?: string) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return ''; }
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Breakdown = { M: number; MO: number; E: number; S: number };

interface ItemOrcamentoUI {
  id: string;
  etapa_codigo: string;
  sub_etapa: string;
  ordem: number;
  composicao_id: string;
  descricao_override: string;
  unidade_override: string;
  custo_unitario_override: number;
  custo_unitario_efetivo: number;
  quantidade: number;
  quantidade_tipo: 'AUTO' | 'MANUAL';
  custo_total: number;
  breakdown: Breakdown;
  composicao?: {
    codigo: string;
    descricao: string;
    unidade_producao: string;
    custo_unitario: number;
  };
}

interface EtapaUI {
  codigo: string;
  descricao: string;
  itens: ItemOrcamentoUI[];
  subtotal: number;
  breakdown: Breakdown;
}

interface OrcamentoDetalhe {
  id: string;
  titulo: string;
  descricao: string;
  bdi_percentual: number;
  status: string;
  data_atualizacao?: string;
  etapas: EtapaUI[];
  total_direto: number;
  total_com_bdi: number;
  total_breakdown: Breakdown;
}

interface SubEtapaGroup {
  nome: string;
  itens: ItemOrcamentoUI[];
}

function agruparPorSubEtapa(itens: ItemOrcamentoUI[]): SubEtapaGroup[] {
  const grupos: SubEtapaGroup[] = [];
  for (const item of itens) {
    const nome = item.sub_etapa || '';
    const last = grupos[grupos.length - 1];
    if (!last || last.nome !== nome) {
      grupos.push({ nome, itens: [item] });
    } else {
      last.itens.push(item);
    }
  }
  return grupos;
}

// ─── Status Badge Inline ──────────────────────────────────────────────────────
const STATUS_COR: Record<string, string> = {
  em_andamento:       'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
  aguardando_aprovacao:'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  aprovado:           'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700',
  ativo:              'bg-amber-100 text-amber-800 border-amber-300',
};

function StatusInline({
  status, onSalvar,
}: { status: string; onSalvar: (v: string) => Promise<void> }) {
  const [editando, setEditando] = useState(false);

  if (editando) {
    return (
      <Select
        value={status}
        onValueChange={async v => { if (v) { await onSalvar(v); setEditando(false); } }}
      >
        <SelectTrigger className="h-6 text-xs w-48 border-primary">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="em_andamento">Em Andamento</SelectItem>
          <SelectItem value="aguardando_aprovacao">Aguardando Aprovação</SelectItem>
          <SelectItem value="aprovado">Aprovado</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  const cor = STATUS_COR[status] || STATUS_COR.em_andamento;
  return (
    <button
      onClick={() => setEditando(true)}
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border cursor-pointer hover:opacity-80 transition-opacity ${cor}`}
      title="Clique para alterar o status"
    >
      {ORCAMENTO_STATUS_LABEL[status] || status}
      <Pencil className="h-2.5 w-2.5 opacity-70" />
    </button>
  );
}

// ─── BDI Inline ───────────────────────────────────────────────────────────────
function BDIInline({
  valor, onSalvar,
}: { valor: number; onSalvar: (v: number) => Promise<void> }) {
  const [editando, setEditando] = useState(false);
  const [val, setVal] = useState(String(valor));

  async function salvar() {
    const num = Number(val);
    if (isNaN(num) || num === valor) { setEditando(false); return; }
    await onSalvar(num);
    setEditando(false);
  }

  if (editando) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">BDI</span>
        <Input
          autoFocus type="number" min="0" max="100" step="0.1"
          value={val}
          onFocus={e => e.target.select()}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') salvar();
            if (e.key === 'Escape') { setVal(String(valor)); setEditando(false); }
          }}
          className="h-6 w-20 px-2 py-0 text-xs border-2 border-primary"
        />
        <span className="text-xs text-muted-foreground">%</span>
        <button className="text-green-600 hover:text-green-700 p-0.5" onClick={salvar}><Check className="h-3 w-3" /></button>
        <button className="text-muted-foreground p-0.5" onClick={() => { setVal(String(valor)); setEditando(false); }}><X className="h-3 w-3" /></button>
      </div>
    );
  }

  return (
    <button
      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded px-1.5 py-0.5 transition-colors"
      title="Clique para editar o BDI"
      onClick={() => { setVal(String(valor)); setEditando(true); }}
    >
      <span>BDI:</span>
      <strong className="text-foreground">{valor}%</strong>
      <Pencil className="h-3 w-3 opacity-50" />
    </button>
  );
}

// ─── Célula Numérica Inline ───────────────────────────────────────────────────
function CelulaNum({
  valor, onSalvar, destaque = false,
}: { valor: number; onSalvar: (v: number) => Promise<void>; destaque?: boolean }) {
  const [editando, setEditando] = useState(false);
  const [val, setVal] = useState(String(valor));

  async function salvar() {
    const num = Number(val);
    if (isNaN(num) || num === valor) { setEditando(false); return; }
    await onSalvar(num);
    setEditando(false);
  }

  if (editando) {
    return (
      <div className="flex items-center gap-0.5 justify-end">
        <Input
          autoFocus type="number" min="0" step="0.001"
          value={val}
          onFocus={e => e.target.select()}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') salvar();
            if (e.key === 'Escape') { setVal(String(valor)); setEditando(false); }
          }}
          className="h-6 w-24 px-2 py-0 text-xs border-2 border-primary"
        />
        <button className="text-green-600 p-0.5" onClick={salvar}><Check className="h-3 w-3" /></button>
        <button className="text-muted-foreground p-0.5" onClick={() => { setVal(String(valor)); setEditando(false); }}><X className="h-3 w-3" /></button>
      </div>
    );
  }

  return (
    <span
      className={`cursor-pointer tabular-nums hover:bg-primary/10 hover:ring-1 hover:ring-primary/30 rounded px-1 -mx-1 transition-colors ${destaque ? 'text-amber-600 font-semibold' : ''}`}
      title="Clique para editar"
      onClick={() => { setVal(String(valor)); setEditando(true); }}
    >
      {valor}
      {destaque && <span className="text-[10px] ml-0.5 opacity-60">✦</span>}
    </span>
  );
}

// ─── Célula Texto Inline ──────────────────────────────────────────────────────
function CelulaTexto({
  valor, onSalvar,
}: { valor: string; onSalvar: (v: string) => Promise<void> }) {
  const [editando, setEditando] = useState(false);
  const [val, setVal] = useState(valor);

  async function salvar() {
    if (val === valor) { setEditando(false); return; }
    await onSalvar(val);
    setEditando(false);
  }

  if (editando) {
    return (
      <div className="flex items-center gap-0.5">
        <Input
          autoFocus value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') salvar();
            if (e.key === 'Escape') { setVal(valor); setEditando(false); }
          }}
          className="h-6 min-w-[150px] w-full px-2 py-0 text-xs border-2 border-primary"
        />
        <button className="text-green-600 p-0.5 shrink-0" onClick={salvar}><Check className="h-3 w-3" /></button>
        <button className="text-muted-foreground p-0.5 shrink-0" onClick={() => { setVal(valor); setEditando(false); }}><X className="h-3 w-3" /></button>
      </div>
    );
  }

  return (
    <span
      className="cursor-pointer hover:bg-primary/10 hover:ring-1 hover:ring-primary/30 rounded px-1 -mx-1 transition-colors leading-relaxed"
      onClick={() => { setVal(valor); setEditando(true); }}
    >
      {valor || <span className="text-muted-foreground/40 italic text-[11px]">—</span>}
    </span>
  );
}

// ─── Sub-etapa Header com edição inline ───────────────────────────────────────
function SubEtapaHeader({
  nome, itens, onRenomear,
}: { nome: string; itens: ItemOrcamentoUI[]; onRenomear: (novoNome: string) => Promise<void> }) {
  const [editando, setEditando] = useState(false);
  const [val, setVal] = useState(nome);

  async function salvar() {
    if (!val.trim() || val === nome) { setEditando(false); return; }
    await onRenomear(val.trim());
    setEditando(false);
  }

  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="text-muted-foreground/40 select-none">┗</span>
      {editando ? (
        <>
          <Input
            autoFocus value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') salvar();
              if (e.key === 'Escape') { setVal(nome); setEditando(false); }
            }}
            className="h-5 text-xs border-primary min-w-52 px-2 py-0"
          />
          <button className="text-green-600" onClick={salvar}><Check className="h-3 w-3" /></button>
          <button className="text-muted-foreground" onClick={() => { setVal(nome); setEditando(false); }}><X className="h-3 w-3" /></button>
        </>
      ) : (
        <button
          className="flex items-center gap-1.5 text-xs font-semibold text-primary/80 hover:text-primary transition-colors group"
          onClick={() => { setVal(nome); setEditando(true); }}
          title="Clique para renomear sub-etapa"
        >
          {nome}
          <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-60 transition-opacity" />
        </button>
      )}
      <span className="text-[10px] text-muted-foreground/50 ml-0.5">
        {itens.length} item{itens.length !== 1 ? 's' : ''}
      </span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrcamentoDetalhePage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [orc, setOrc] = useState<OrcamentoDetalhe | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal adicionar item
  const [modalAberto, setModalAberto] = useState(false);
  const [etapaSelecionada, setEtapaSelecionada] = useState('01');
  const [subEtapaNovoItem, setSubEtapaNovoItem] = useState('');
  const [composicoes, setComposicoes] = useState<Composicao[]>([]);
  const [buscaComp, setBuscaComp] = useState('');
  const [compSelecionada, setCompSelecionada] = useState<Composicao | null>(null);
  const [quantidade, setQuantidade] = useState('1');
  const [adicionando, setAdicionando] = useState(false);

  // Drag-and-drop
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // ── Carregar orçamento ──────────────────────────────────────────────────────
  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orcamentos/${id}`);
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Erro ao carregar'); return; }
      setOrc(data);
    } catch {
      toast.error('Erro de conexão');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

  // ── Busca de composições ────────────────────────────────────────────────────
  useEffect(() => {
    if (buscaComp.length >= 2) {
      fetch(`/api/composicoes?q=${encodeURIComponent(buscaComp)}&status=ativo&custo=1`)
        .then(r => r.json())
        .then(d => setComposicoes(Array.isArray(d) ? d.slice(0, 20) : []));
    } else {
      setComposicoes([]);
    }
  }, [buscaComp]);

  // ── Funções ─────────────────────────────────────────────────────────────────
  function abrirModal(codigoEtapa: string, subEtapaSugerida = '') {
    setEtapaSelecionada(codigoEtapa);
    setSubEtapaNovoItem(subEtapaSugerida);
    setCompSelecionada(null);
    setBuscaComp('');
    setQuantidade('1');
    setModalAberto(true);
  }

  async function salvarOrcamento(updates: Record<string, unknown>) {
    if (!orc) return;
    try {
      const res = await fetch(`/api/orcamentos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: orc.titulo,
          descricao: orc.descricao,
          status: orc.status,
          bdi_percentual: orc.bdi_percentual,
          ...updates,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast.error(d.erros?.join(', ') || d.error || 'Erro ao salvar');
        return;
      }
      await carregar();
    } catch {
      toast.error('Erro de conexão');
    }
  }

  async function atualizarItem(itemId: string, campos: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/orcamentos/${id}/itens/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campos),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || 'Erro'); return; }
      carregar();
    } catch {
      toast.error('Erro ao atualizar item');
    }
  }

  async function removerItem(itemId: string) {
    if (!confirm('Remover este item do orçamento?')) return;
    const res = await fetch(`/api/orcamentos/${id}/itens/${itemId}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Item removido'); carregar(); }
    else toast.error('Erro ao remover');
  }

  async function adicionarItem() {
    if (!compSelecionada) { toast.error('Selecione uma composição'); return; }
    setAdicionando(true);
    try {
      const res = await fetch(`/api/orcamentos/${id}/itens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          etapa_codigo: etapaSelecionada,
          composicao_id: compSelecionada.id,
          quantidade: Number(quantidade) || 1,
          sub_etapa: subEtapaNovoItem.trim(),
        }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.erros?.join(', ') || d.error); return; }
      toast.success('Item adicionado');
      setModalAberto(false);
      carregar();
    } finally {
      setAdicionando(false);
    }
  }

  async function renomearSubEtapa(etapaCodigo: string, nomeAntigo: string, nomeNovo: string) {
    if (!orc) return;
    const etapa = orc.etapas.find(e => e.codigo === etapaCodigo);
    if (!etapa) return;
    const itensGrupo = etapa.itens.filter(i => (i.sub_etapa || '') === nomeAntigo);
    await Promise.all(itensGrupo.map(item =>
      fetch(`/api/orcamentos/${id}/itens/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sub_etapa: nomeNovo, quantidade: item.quantidade }),
      })
    ));
    carregar();
    toast.success('Sub-etapa renomeada');
  }

  async function handleDrop(etapaCodigo: string, targetId: string) {
    if (!draggingId || draggingId === targetId || !orc) {
      setDraggingId(null); setDragOverId(null); return;
    }
    const etapa = orc.etapas.find(e => e.codigo === etapaCodigo);
    if (!etapa) return;

    const items = [...etapa.itens];
    const fromIdx = items.findIndex(i => i.id === draggingId);
    const toIdx = items.findIndex(i => i.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const [moved] = items.splice(fromIdx, 1);
    items.splice(toIdx, 0, moved);
    const newItems = items.map((item, idx) => ({ ...item, ordem: idx + 1 }));

    // Atualização otimista
    setOrc(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        etapas: prev.etapas.map(et =>
          et.codigo === etapaCodigo ? { ...et, itens: newItems } : et
        ),
      };
    });

    setDraggingId(null);
    setDragOverId(null);

    // Persistir em background (sem await para não travar a UI)
    for (const item of newItems) {
      fetch(`/api/orcamentos/${id}/itens/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordem: item.ordem, quantidade: item.quantidade }),
      }).catch(() => null);
    }
  }

  // ── Renderização de loading/erro ────────────────────────────────────────────
  if (loading && !orc) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-2 text-sm">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Carregando orçamento...
      </div>
    );
  }
  if (!orc) {
    return (
      <div className="text-center py-24 text-muted-foreground text-sm">
        Orçamento não encontrado.
      </div>
    );
  }

  const totalDireto = orc.total_direto;
  const bdiValor = totalDireto * (orc.bdi_percentual / 100);
  const bd = orc.total_breakdown || { M: 0, MO: 0, E: 0, S: 0 };

  const BREAKDOWN_TIPOS = [
    { key: 'M',  label: 'Material',      bg: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',    text: 'text-blue-700 dark:text-blue-300' },
    { key: 'MO', label: 'Mão de Obra',   bg: 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-300' },
    { key: 'E',  label: 'Equipamento',   bg: 'bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300' },
  ] as const;

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-12">

      {/* ═══════════════════════════════════════════════════════════════════
          CABEÇALHO
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-card border rounded-xl p-4 shadow-sm">
        <div className="flex items-start gap-3 flex-wrap">
          {/* Voltar */}
          <Link
            href="/orcamentos"
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
            title="Voltar para lista"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>

          {/* Título + status + meta */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold leading-tight max-w-md truncate">
                {orc.titulo}
              </h1>
              <StatusInline
                status={orc.status}
                onSalvar={v => salvarOrcamento({ status: v })}
              />
            </div>

            {orc.descricao && (
              <p className="text-sm text-muted-foreground leading-snug">
                {orc.descricao}
              </p>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <BDIInline
                valor={orc.bdi_percentual}
                onSalvar={v => salvarOrcamento({ bdi_percentual: v })}
              />
              {orc.data_atualizacao && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3 shrink-0" />
                  Atualizado em {fmtData(orc.data_atualizacao)}
                </span>
              )}
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            <Button
              variant="ghost" size="sm" className="h-8 w-8 p-0"
              onClick={carregar} disabled={loading}
              title="Recarregar"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline" size="sm" className="h-8"
              onClick={() => window.open(`/api/exportar?tipo=orcamento&id=${id}`, '_blank')}
              title="Exportar Excel"
            >
              <Download className="h-3.5 w-3.5 mr-1" /> XLSX
            </Button>
            <Button
              variant="outline" size="sm" className="h-8"
              onClick={() => window.open(`/api/exportar?tipo=pdf&id=${id}`, '_blank')}
              title="Exportar PDF"
            >
              <FileText className="h-3.5 w-3.5 mr-1" /> PDF
            </Button>
            <Button size="sm" className="h-8" onClick={() => abrirModal('01')}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Item
            </Button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          CARDS DE TOTAIS
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground font-medium mb-1.5">Total Direto</p>
          <p className="text-2xl font-bold tabular-nums leading-none truncate">
            {fmtBRL(totalDireto)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {orc.etapas.reduce((acc, e) => acc + e.itens.length, 0)} item(s) em{' '}
            {orc.etapas.length} etapa(s)
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground font-medium mb-1.5">
            BDI ({orc.bdi_percentual}%)
          </p>
          <p className="text-2xl font-bold tabular-nums leading-none truncate">
            {fmtBRL(bdiValor)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Benefícios e despesas indiretas</p>
        </div>

        <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 shadow-sm">
          <p className="text-xs text-primary/70 font-semibold mb-1.5">Total com BDI</p>
          <p className="text-2xl font-bold tabular-nums text-primary leading-none truncate">
            {fmtBRL(orc.total_com_bdi)}
          </p>
          <p className="text-xs text-primary/60 mt-1">Valor total do orçamento</p>
        </div>
      </div>

      {/* Breakdown por tipo */}
      <div className="grid grid-cols-3 gap-3">
        {BREAKDOWN_TIPOS.map(({ key, label, bg, text }) => {
          const val = bd[key as keyof Breakdown] || 0;
          const pct = totalDireto > 0 ? Math.round((val / totalDireto) * 100) : 0;
          return (
            <div key={key} className={`rounded-xl border p-3.5 ${bg}`}>
              <div className="flex items-start justify-between gap-1 mb-1.5">
                <span className={`text-[11px] font-semibold leading-tight ${text}`}>{label}</span>
                <span className={`text-sm font-bold ${text} shrink-0 tabular-nums`}>{pct}%</span>
              </div>
              <p className={`text-base font-bold tabular-nums ${text} truncate`}>
                {fmtBRL(val)}
              </p>
            </div>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          ESTADO VAZIO
      ═══════════════════════════════════════════════════════════════════ */}
      {orc.etapas.length === 0 && (
        <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium mb-1">Nenhum item adicionado</p>
          <p className="text-xs mb-4">
            Adicione composições ao orçamento organizadas por etapa de obra
          </p>
          <Button size="sm" onClick={() => abrirModal('01')}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar primeiro item
          </Button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          ETAPAS
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        {orc.etapas.map(etapa => {
          const grupos = agruparPorSubEtapa(etapa.itens);

          return (
            <div key={etapa.codigo} className="border rounded-xl overflow-hidden shadow-sm">
              {/* Header da etapa */}
              <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-mono font-bold text-muted-foreground bg-background border rounded px-1.5 py-0.5 shrink-0">
                    {etapa.codigo}
                  </span>
                  <p className="font-semibold text-sm truncate">{etapa.descricao}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-bold tabular-nums">{fmtBRL(etapa.subtotal)}</span>
                  <Button
                    size="sm" variant="outline" className="h-7 px-2.5 text-xs gap-1"
                    onClick={() => abrirModal(etapa.codigo)}
                  >
                    <Plus className="h-3 w-3" /> Item
                  </Button>
                </div>
              </div>

              {/* Tabela de itens */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/10">
                      <th className="w-7 px-1.5" />
                      <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">
                        Descrição
                      </th>
                      <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium w-20">
                        Un.
                      </th>
                      <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium w-32">
                        Custo Unit.
                      </th>
                      <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium w-28">
                        Qtd.
                      </th>
                      <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium w-32">
                        Total
                      </th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {grupos.map((grupo, gi) => (
                      <Fragment key={`grupo-${etapa.codigo}-${gi}`}>
                        {/* Sub-etapa header */}
                        {grupo.nome && (
                          <tr className="bg-blue-50/60 dark:bg-blue-950/20 border-b border-t border-blue-100 dark:border-blue-900/40">
                            <td colSpan={7} className="px-3 py-1.5">
                              <SubEtapaHeader
                                nome={grupo.nome}
                                itens={grupo.itens}
                                onRenomear={novoNome =>
                                  renomearSubEtapa(etapa.codigo, grupo.nome, novoNome)
                                }
                              />
                            </td>
                          </tr>
                        )}

                        {/* Linhas dos itens */}
                        {grupo.itens.map(item => {
                          const descricao =
                            item.descricao_override || item.composicao?.descricao || '';
                          const unidade =
                            item.unidade_override || item.composicao?.unidade_producao || '';
                          const isDragging = draggingId === item.id;
                          const isDragOver = dragOverId === item.id && draggingId !== item.id;

                          return (
                            <tr
                              key={item.id}
                              draggable
                              onDragStart={e => {
                                setDraggingId(item.id);
                                e.dataTransfer.effectAllowed = 'move';
                              }}
                              onDragOver={e => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                                if (item.id !== draggingId) setDragOverId(item.id);
                              }}
                              onDragLeave={() => {
                                if (dragOverId === item.id) setDragOverId(null);
                              }}
                              onDrop={e => {
                                e.preventDefault();
                                handleDrop(etapa.codigo, item.id);
                              }}
                              onDragEnd={() => {
                                setDraggingId(null);
                                setDragOverId(null);
                              }}
                              className={[
                                'border-b last:border-0 transition-all group select-none',
                                isDragging  ? 'opacity-30 bg-primary/5' : '',
                                isDragOver  ? 'border-t-2 border-t-primary bg-primary/5' : 'hover:bg-muted/20',
                              ].join(' ')}
                            >
                              {/* Handle drag */}
                              <td className="px-1.5 py-2 w-7">
                                <GripVertical className="h-4 w-4 text-muted-foreground/20 group-hover:text-muted-foreground/50 cursor-grab active:cursor-grabbing transition-colors" />
                              </td>

                              {/* Descrição */}
                              <td className="px-3 py-2 max-w-xs">
                                <CelulaTexto
                                  valor={descricao}
                                  onSalvar={v => atualizarItem(item.id, {
                                    descricao_override: v,
                                    quantidade: item.quantidade,
                                  })}
                                />
                              </td>

                              {/* Unidade */}
                              <td className="px-3 py-2">
                                <CelulaTexto
                                  valor={unidade}
                                  onSalvar={v => atualizarItem(item.id, {
                                    unidade_override: v,
                                    quantidade: item.quantidade,
                                  })}
                                />
                              </td>

                              {/* Custo unitário */}
                              <td className="px-3 py-2 text-right">
                                <CelulaNum
                                  valor={item.custo_unitario_efetivo}
                                  onSalvar={v => atualizarItem(item.id, {
                                    custo_unitario_override: v,
                                    quantidade: item.quantidade,
                                  })}
                                />
                              </td>

                              {/* Quantidade */}
                              <td className="px-3 py-2 text-right">
                                <CelulaNum
                                  valor={item.quantidade}
                                  destaque={item.quantidade_tipo === 'AUTO'}
                                  onSalvar={v => atualizarItem(item.id, { quantidade: v })}
                                />
                              </td>

                              {/* Total */}
                              <td className="px-3 py-2 text-right font-semibold tabular-nums">
                                {fmtBRL(item.custo_total)}
                              </td>

                              {/* Remover */}
                              <td className="px-2 py-2">
                                <button
                                  className="p-0.5 rounded text-muted-foreground/30 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                                  onClick={() => removerItem(item.id)}
                                  title="Remover item"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          RODAPÉ — TOTAIS
      ═══════════════════════════════════════════════════════════════════ */}
      {orc.etapas.length > 0 && (
        <div className="border rounded-xl bg-card shadow-sm p-4">
          <div className="flex justify-end">
            <div className="text-sm space-y-2 w-72">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Total Direto</span>
                <span className="tabular-nums font-medium">{fmtBRL(totalDireto)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">BDI ({orc.bdi_percentual}%)</span>
                <span className="tabular-nums">{fmtBRL(bdiValor)}</span>
              </div>
              <div className="flex justify-between gap-4 border-t pt-2 font-bold text-base">
                <span>Total com BDI</span>
                <span className="tabular-nums text-primary">{fmtBRL(orc.total_com_bdi)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL — ADICIONAR ITEM
      ═══════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={modalAberto}
        onOpenChange={v => { if (!v) { setModalAberto(false); } }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4 text-muted-foreground" />
              Adicionar Item ao Orçamento
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-1">
            {/* Etapa */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold text-foreground">Etapa</Label>
              <Select
                value={etapaSelecionada}
                onValueChange={v => { if (v) setEtapaSelecionada(v); }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ETAPAS.map(e => (
                    <SelectItem key={e.codigo} value={e.codigo}>
                      {e.codigo} — {e.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sub-etapa */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Sub-etapa{' '}
                <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                placeholder="Ex: Fundações, Vigas de coroamento, Lajes..."
                value={subEtapaNovoItem}
                onChange={e => setSubEtapaNovoItem(e.target.value)}
                className="h-9"
              />
              <p className="text-[11px] text-muted-foreground leading-snug">
                Itens com mesma sub-etapa são agrupados como seção dentro da etapa
              </p>
            </div>

            {/* Composição */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Composição <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  placeholder="Digite para buscar composição..."
                  value={compSelecionada ? compSelecionada.descricao : buscaComp}
                  onChange={e => {
                    setBuscaComp(e.target.value);
                    setCompSelecionada(null);
                  }}
                  className={`h-9 pr-8 ${compSelecionada ? 'border-green-500 dark:border-green-600' : ''}`}
                />
                {compSelecionada && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => { setCompSelecionada(null); setBuscaComp(''); }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                {!compSelecionada && composicoes.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 border rounded-lg bg-background shadow-lg max-h-52 overflow-auto">
                    {composicoes.map(comp => (
                      <button
                        key={comp.id}
                        type="button"
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors flex justify-between items-center gap-3 border-b last:border-0"
                        onMouseDown={e => {
                          e.preventDefault();
                          setCompSelecionada(comp);
                          setBuscaComp('');
                          setComposicoes([]);
                        }}
                      >
                        <span className="truncate flex-1">{comp.descricao}</span>
                        <span className="text-muted-foreground text-xs shrink-0 tabular-nums">
                          {fmtBRL(comp.custo_unitario || 0)}/{comp.unidade_producao}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {compSelecionada && (
                <div className="flex items-center justify-between text-xs bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg px-2.5 py-2">
                  <span className="font-mono text-muted-foreground">{compSelecionada.codigo}</span>
                  <span>
                    Base:{' '}
                    <strong className="tabular-nums">
                      {fmtBRL(compSelecionada.custo_unitario || 0)}
                    </strong>
                    /{compSelecionada.unidade_producao}
                  </span>
                </div>
              )}
            </div>

            {/* Quantidade */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold text-foreground">Quantidade</Label>
              <Input
                type="number" min="0" step="0.01"
                value={quantidade}
                onFocus={e => e.target.select()}
                onChange={e => setQuantidade(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button
              onClick={adicionarItem}
              disabled={adicionando || !compSelecionada}
            >
              {adicionando ? (
                <><RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> Adicionando...</>
              ) : (
                <><Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
