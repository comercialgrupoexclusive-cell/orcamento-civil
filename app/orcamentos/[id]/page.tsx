'use client';

import { useEffect, useState, useCallback, use, Fragment, useRef } from 'react';
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
  ChevronRight, ChevronDown, BarChart3, List, LayoutTemplate, Layers, Zap, Search, TrendingUp, Printer,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, RadialBarChart, RadialBar,
} from 'recharts';
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

interface InsumoItem {
  insumo_id: string;
  descricao: string;
  unidade: string;
  coeficiente: number;
  qtd_calculada: number;
  qtd_adotada: number;
  has_override: boolean;
  preco_unitario: number;
  tipo: string;
  custo_item: number;
}

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
  insumos: InsumoItem[];
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
  area_construida: number;
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
  const mapa = new Map<string, SubEtapaGroup>();
  const ordem: string[] = [];
  for (const item of itens) {
    const nome = item.sub_etapa || '';
    if (!mapa.has(nome)) { mapa.set(nome, { nome, itens: [] }); ordem.push(nome); }
    mapa.get(nome)!.itens.push(item);
  }
  return ordem.map(n => mapa.get(n)!);
}

// ─── Status Badge Inline ──────────────────────────────────────────────────────
const STATUS_COR: Record<string, string> = {
  em_andamento: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
  aguardando_aprovacao: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  aprovado: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700',
  ativo: 'bg-amber-100 text-amber-800 border-amber-300',
};

function StatusInline({ status, onSalvar }: { status: string; onSalvar: (v: string) => Promise<void> }) {
  const [editando, setEditando] = useState(false);
  if (editando) {
    return (
      <Select value={status} onValueChange={async v => { if (v) { await onSalvar(v); setEditando(false); } }}>
        <SelectTrigger className="h-6 text-xs w-48 border-primary"><SelectValue /></SelectTrigger>
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
    <button onClick={() => setEditando(true)}
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border cursor-pointer hover:opacity-80 transition-opacity ${cor}`}
      title="Clique para alterar o status">
      {ORCAMENTO_STATUS_LABEL[status] || status}
      <Pencil className="h-2.5 w-2.5 opacity-70" />
    </button>
  );
}

// ─── BDI Inline ───────────────────────────────────────────────────────────────
function BDIInline({ valor, onSalvar }: { valor: number; onSalvar: (v: number) => Promise<void> }) {
  const [editando, setEditando] = useState(false);
  const [val, setVal] = useState(String(valor));
  async function salvar() {
    const num = Number(val);
    if (isNaN(num) || num === valor) { setEditando(false); return; }
    await onSalvar(num); setEditando(false);
  }
  if (editando) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">BDI</span>
        <Input autoFocus type="number" min="0" max="100" step="0.1" value={val}
          onFocus={e => e.target.select()} onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') salvar(); if (e.key === 'Escape') { setVal(String(valor)); setEditando(false); } }}
          className="h-6 w-20 px-2 py-0 text-xs border-2 border-primary" />
        <span className="text-xs text-muted-foreground">%</span>
        <button className="text-green-600 hover:text-green-700 p-0.5" onClick={salvar}><Check className="h-3 w-3" /></button>
        <button className="text-muted-foreground p-0.5" onClick={() => { setVal(String(valor)); setEditando(false); }}><X className="h-3 w-3" /></button>
      </div>
    );
  }
  return (
    <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded px-1.5 py-0.5 transition-colors"
      title="Clique para editar o BDI" onClick={() => { setVal(String(valor)); setEditando(true); }}>
      <span>BDI:</span><strong className="text-foreground">{valor}%</strong>
      <Pencil className="h-3 w-3 opacity-50" />
    </button>
  );
}

function AreaInline({ valor, onSalvar }: { valor: number; onSalvar: (v: number) => Promise<void> }) {
  const [editando, setEditando] = useState(false);
  const [val, setVal] = useState(String(valor || ''));
  async function salvar() {
    const num = Number(val);
    if (isNaN(num) || num < 0) { setEditando(false); return; }
    await onSalvar(num); setEditando(false);
  }
  if (editando) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">Área</span>
        <Input autoFocus type="number" min="0" step="0.5" value={val}
          onFocus={e => e.target.select()} onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') salvar(); if (e.key === 'Escape') { setVal(String(valor || '')); setEditando(false); } }}
          className="h-6 w-20 px-2 py-0 text-xs border-2 border-primary" />
        <span className="text-xs text-muted-foreground">m²</span>
        <button className="text-green-600 hover:text-green-700 p-0.5" onClick={salvar}><Check className="h-3 w-3" /></button>
        <button className="text-muted-foreground p-0.5" onClick={() => { setVal(String(valor || '')); setEditando(false); }}><X className="h-3 w-3" /></button>
      </div>
    );
  }
  return (
    <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded px-1.5 py-0.5 transition-colors"
      title="Clique para editar a área construída" onClick={() => { setVal(String(valor || '')); setEditando(true); }}>
      <span>Área:</span>
      <strong className={valor > 0 ? 'text-foreground' : 'text-amber-500'}>
        {valor > 0 ? `${valor} m²` : 'definir ▸'}
      </strong>
      <Pencil className="h-3 w-3 opacity-50" />
    </button>
  );
}

// ─── Célula Numérica Inline ───────────────────────────────────────────────────
// Arredonda removendo ruído de ponto flutuante (282.460105000000006 -> 282.46)
function limpaNum(n: number, decimais: number): number {
  return Number.isFinite(n) ? Number(n.toFixed(decimais)) : 0;
}
// corStatus: 'auto' = amarelo pastel (calculado), 'manual' = verde pastel (confirmado pelo usuário), undefined = neutro
function CelulaNum({ valor, onSalvar, corStatus, decimais = 4 }: { valor: number; onSalvar: (v: number) => Promise<void>; corStatus?: 'auto' | 'manual'; decimais?: number }) {
  const limpo = limpaNum(valor, decimais);
  const [editando, setEditando] = useState(false);
  const [val, setVal] = useState(String(limpo));
  async function salvar() {
    const num = Number(val);
    if (isNaN(num) || num === limpo) { setEditando(false); return; }
    await onSalvar(num); setEditando(false);
  }

  const bgCor = corStatus === 'auto'
    ? 'bg-amber-50 border border-amber-200 text-amber-800'
    : corStatus === 'manual'
    ? 'bg-green-50 border border-green-200 text-green-800'
    : '';

  if (editando) {
    return (
      <div className="flex items-center gap-0.5 justify-end">
        <Input autoFocus type="number" min="0" step="0.001" value={val}
          onFocus={e => e.target.select()} onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') salvar(); if (e.key === 'Escape') { setVal(String(valor)); setEditando(false); } }}
          className="h-6 w-24 px-2 py-0 text-xs border-2 border-primary" />
        <button className="text-green-600 p-0.5" onClick={salvar}><Check className="h-3 w-3" /></button>
        <button className="text-muted-foreground p-0.5" onClick={() => { setVal(String(valor)); setEditando(false); }}><X className="h-3 w-3" /></button>
      </div>
    );
  }
  return (
    <span
      className={`cursor-pointer tabular-nums rounded px-1.5 py-0.5 -mx-1 transition-colors hover:opacity-80 ${bgCor || 'hover:bg-primary/10 hover:ring-1 hover:ring-primary/30'}`}
      title={corStatus === 'auto' ? 'Quantidade calculada — clique para confirmar sua quantidade' : corStatus === 'manual' ? 'Quantidade confirmada — clique para editar' : 'Clique para editar'}
      onClick={() => { setVal(String(limpo)); setEditando(true); }}>
      {limpo.toLocaleString('pt-BR', { maximumFractionDigits: decimais })}
    </span>
  );
}

// ─── Célula Texto Inline ──────────────────────────────────────────────────────
function CelulaTexto({ valor, onSalvar }: { valor: string; onSalvar: (v: string) => Promise<void> }) {
  const [editando, setEditando] = useState(false);
  const [val, setVal] = useState(valor);
  async function salvar() {
    if (val === valor) { setEditando(false); return; }
    await onSalvar(val); setEditando(false);
  }
  if (editando) {
    return (
      <div className="flex items-center gap-0.5">
        <Input autoFocus value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') salvar(); if (e.key === 'Escape') { setVal(valor); setEditando(false); } }}
          className="h-6 min-w-[150px] w-full px-2 py-0 text-xs border-2 border-primary" />
        <button className="text-green-600 p-0.5 shrink-0" onClick={salvar}><Check className="h-3 w-3" /></button>
        <button className="text-muted-foreground p-0.5 shrink-0" onClick={() => { setVal(valor); setEditando(false); }}><X className="h-3 w-3" /></button>
      </div>
    );
  }
  return (
    <span className="cursor-pointer hover:bg-primary/10 hover:ring-1 hover:ring-primary/30 rounded px-1 -mx-1 transition-colors leading-relaxed"
      onClick={() => { setVal(valor); setEditando(true); }}>
      {valor || <span className="text-muted-foreground/40 italic text-[11px]">—</span>}
    </span>
  );
}

// ─── Célula Descrição + Troca de Composição Inline ───────────────────────────
function CelulaDescricaoComposicao({
  descricao,
  composicao,
  onTrocarComposicao,
  onSalvarDescricao,
}: {
  descricao: string;
  composicao?: ItemOrcamentoUI['composicao'];
  onTrocarComposicao: (comp: Composicao) => Promise<void>;
  onSalvarDescricao: (v: string) => Promise<void>;
}) {
  const [modo, setModo] = useState<'idle' | 'busca' | 'texto'>('idle');
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<Composicao[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [textoEdit, setTextoEdit] = useState(descricao);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (modo === 'idle') return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setModo('idle'); setBusca(''); setResultados([]);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [modo]);

  useEffect(() => {
    if (modo !== 'busca' || busca.length < 2) { setResultados([]); return; }
    setBuscando(true);
    const timer = setTimeout(() => {
      fetch(`/api/composicoes?q=${encodeURIComponent(busca)}&status=ativo&custo=1`)
        .then(r => r.json())
        .then(d => setResultados(Array.isArray(d) ? d.slice(0, 15) : []))
        .finally(() => setBuscando(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [busca, modo]);

  async function selecionarComp(comp: Composicao) {
    await onTrocarComposicao(comp);
    setModo('idle'); setBusca(''); setResultados([]);
  }

  async function salvarTexto() {
    if (textoEdit !== descricao) await onSalvarDescricao(textoEdit);
    setModo('idle');
  }

  if (modo === 'idle') {
    return (
      <div className="flex flex-col gap-0.5 group/desc">
        <button
          className="text-sm text-left hover:bg-primary/5 rounded px-1 -mx-1 py-0.5 transition-colors leading-snug w-full"
          onClick={() => { setBusca(''); setModo('busca'); }}
          title="Clique para trocar a composição">
          {descricao || <span className="text-muted-foreground/40 italic text-xs">—</span>}
        </button>
        <div className="flex items-center gap-1.5">
          {composicao && (
            <span className="text-[10px] text-muted-foreground/40 font-mono">{composicao.codigo}</span>
          )}
          <button
            className="opacity-0 group-hover/desc:opacity-60 hover:!opacity-100 transition-opacity"
            onClick={() => { setTextoEdit(descricao); setModo('texto'); }}
            title="Editar descrição manualmente (override)">
            <Pencil className="h-2.5 w-2.5 text-muted-foreground" />
          </button>
        </div>
      </div>
    );
  }

  if (modo === 'texto') {
    return (
      <div className="flex items-center gap-0.5" ref={ref}>
        <Input autoFocus value={textoEdit} onChange={e => setTextoEdit(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') salvarTexto(); if (e.key === 'Escape') setModo('idle'); }}
          className="h-6 min-w-[150px] w-full px-2 py-0 text-xs border-2 border-primary" />
        <button className="text-green-600 p-0.5 shrink-0" onClick={salvarTexto}><Check className="h-3 w-3" /></button>
        <button className="text-muted-foreground p-0.5 shrink-0" onClick={() => setModo('idle')}><X className="h-3 w-3" /></button>
      </div>
    );
  }

  // modo === 'busca'
  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-1.5 border-2 border-primary rounded px-2 h-8 bg-background">
        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <input
          autoFocus
          type="text"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar composição..."
          className="flex-1 min-w-[140px] text-sm bg-transparent outline-none"
          onKeyDown={e => { if (e.key === 'Escape') { setModo('idle'); setBusca(''); setResultados([]); } }}
        />
        {buscando && <RefreshCw className="h-3 w-3 text-muted-foreground animate-spin shrink-0" />}
      </div>
      <div className="absolute top-full left-0 z-50 mt-1 border rounded-lg bg-background shadow-lg max-h-64 overflow-auto min-w-[380px]">
        {!busca && (
          <div className="px-3 py-3 text-xs text-muted-foreground text-center">
            Digite para buscar composições...
          </div>
        )}
        {busca.length >= 2 && !buscando && resultados.length === 0 && (
          <div className="px-3 py-3 text-xs text-muted-foreground text-center">Nenhuma composição encontrada</div>
        )}
        {resultados.map(comp => (
          <button key={comp.id} type="button"
            className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors flex justify-between items-start gap-3 border-b last:border-0"
            onMouseDown={e => { e.preventDefault(); selecionarComp(comp); }}>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium leading-tight text-sm">{comp.descricao}</p>
              <p className="font-mono text-muted-foreground text-[10px] mt-0.5">{comp.codigo} · {comp.unidade_producao}</p>
            </div>
            <span className="text-muted-foreground shrink-0 tabular-nums text-xs font-medium">
              {fmtBRL(comp.custo_unitario || 0)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Serviço Header (antigo Sub-etapa) ───────────────────────────────────────
function ServicoHeader({
  nome, itens, onEditar, onExcluir, onAdicionar,
}: { nome: string; itens: ItemOrcamentoUI[]; onEditar: () => void; onExcluir: () => Promise<void>; onAdicionar: () => void }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <Layers className="h-3 w-3 text-blue-500 shrink-0" />
      <button
        className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 transition-colors group"
        onClick={onEditar}
        title="Clique para editar o serviço">
        {nome}
        <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-70 transition-opacity" />
      </button>
      <span className="text-[10px] text-muted-foreground/60 ml-0.5">
        {itens.length} composição{itens.length !== 1 ? 'ões' : ''}
      </span>
      <span className="ml-auto text-xs font-semibold tabular-nums text-blue-700 shrink-0">
        {itens.reduce((a, i) => a + i.custo_total, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </span>
      <button
        className="p-0.5 rounded text-green-600/60 hover:text-green-700 hover:bg-green-50 transition-colors shrink-0"
        title={`Adicionar composição ao serviço "${nome}"`}
        onClick={onAdicionar}>
        <Plus className="h-3.5 w-3.5" />
      </button>
      <button
        className="p-0.5 rounded text-muted-foreground/30 hover:text-destructive transition-colors shrink-0"
        title="Excluir serviço e todos os seus itens"
        onClick={async () => {
          if (!confirm(`Excluir o serviço "${nome}" e seus ${itens.length} item(s)?`)) return;
          await onExcluir();
        }}>
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── Curva ABC ────────────────────────────────────────────────────────────────
const TIPO_LABEL: Record<string, string> = { M: 'Material', MO: 'Mão de Obra', E: 'Equipamento', S: 'Serviço' };
const TIPO_COR: Record<string, string> = {
  M: 'bg-blue-100 text-blue-700 border-blue-200',
  MO: 'bg-orange-100 text-orange-700 border-orange-200',
  E: 'bg-purple-100 text-purple-700 border-purple-200',
  S: 'bg-gray-100 text-gray-700 border-gray-200',
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
const CORES_TIPO: Record<string, string> = {
  M: '#3b82f6', MO: '#f97316', E: '#a855f7', S: '#10b981',
};
const CORES_ETAPA = [
  '#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444',
  '#8b5cf6','#ec4899','#14b8a6','#f97316','#84cc16',
  '#06b6d4','#d946ef','#e11d48','#0891b2','#65a30d',
  '#7c3aed','#b45309','#047857',
];

const CORES_CAT: Record<string, string> = {
  'Aço e Ferragem':       '#ef4444',
  'Argamassa e Cimento':  '#f59e0b',
  'Areia e Brita':        '#84cc16',
  'Alvenaria e Bloco':    '#f97316',
  'Madeira':              '#a16207',
  'Cobertura e Telha':    '#0891b2',
  'Impermeabilização':    '#0ea5e9',
  'Revestimento e Piso':  '#8b5cf6',
  'Esquadria':            '#ec4899',
  'Tubulação e Hidráulica':'#06b6d4',
  'Elétrico':             '#eab308',
  'Mão de Obra':          '#f97316',
  'Equipamento':          '#a855f7',
  'Material Básico':      '#64748b',
  'Pintura e Verniz':     '#d946ef',
  'Pavimentação':         '#10b981',
  'Fundação':             '#1d4ed8',
  'Locação':              '#059669',
  'Serviços Gerais':      '#6b7280',
  'Ferramentas':          '#92400e',
};
function getCatColor(nome: string, idx: number): string {
  return CORES_CAT[nome] || CORES_ETAPA[idx % CORES_ETAPA.length];
}

function DashboardOrcamento({ orc }: { orc: OrcamentoDetalhe }) {
  const area = Number(orc.area_construida) || 0;
  const bd = orc.total_breakdown || { M: 0, MO: 0, E: 0, S: 0 };
  const totalDireto = orc.total_direto;

  // ── Categorias de insumos ───────────────────────────────────────────────
  const catMap = new Map<string, { nome: string; custo: number; tipo: string }>();
  for (const etapa of orc.etapas) {
    for (const item of etapa.itens) {
      for (const ins of (item.insumos || [])) {
        const catNome = (ins as { categoria?: string }).categoria
          || (ins.tipo === 'MO' ? 'Mão de Obra' : ins.tipo === 'E' ? 'Equipamento' : 'Material Básico');
        const ex = catMap.get(catNome);
        if (ex) ex.custo += ins.custo_item;
        else catMap.set(catNome, { nome: catNome, custo: ins.custo_item, tipo: ins.tipo });
      }
    }
  }
  const categorias = Array.from(catMap.values())
    .filter(c => c.tipo !== 'MO')   // Dashboard: apenas materiais/equipamentos, MO fica nos cards acima
    .sort((a, b) => b.custo - a.custo)
    .map((c, i) => ({ ...c, fill: getCatColor(c.nome, i), pct: totalDireto > 0 ? c.custo / totalDireto * 100 : 0 }));

  // ── Pizza: M / MO / E ───────────────────────────────────────────────────
  const dataTipo = Object.entries(bd)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: TIPO_LABEL[k] || k, value: Number(v), fill: CORES_TIPO[k] || '#888' }));

  // Barras: por etapa
  const dataEtapa = orc.etapas
    .filter(e => e.subtotal > 0)
    .map((e, i) => ({
      name: e.descricao.length > 20 ? e.descricao.substring(0, 18) + '…' : e.descricao,
      fullName: e.descricao,
      total: Math.round(e.subtotal),
      M: Math.round(e.breakdown.M || 0),
      MO: Math.round(e.breakdown.MO || 0),
      E: Math.round(e.breakdown.E || 0),
      fill: CORES_ETAPA[i % CORES_ETAPA.length],
    }));

  // Radial: m² por tipo
  const dataM2 = area > 0
    ? Object.entries(bd).filter(([, v]) => v > 0).map(([k, v], i) => ({
        name: TIPO_LABEL[k] || k, value: Math.round(Number(v) / area),
        fill: CORES_TIPO[k] || CORES_ETAPA[i],
      }))
    : [];

  const fmtK = (v: number) => v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v.toFixed(0)}`;

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; fill: string }[]; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-popover border border-border rounded-lg shadow-xl px-3 py-2 text-xs space-y-1">
        <p className="font-bold text-foreground mb-1">{label}</p>
        {payload.map(p => (
          <div key={p.name} className="flex items-center gap-2 justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.fill }} />
              {p.name}
            </span>
            <span className="font-semibold tabular-nums">{fmtBRL(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total da Obra', val: fmtBRL(orc.total_com_bdi), sub: 'com BDI', color: 'text-primary' },
          { label: 'Mão de Obra', val: fmtBRL(bd.MO || 0), sub: area > 0 ? `${fmtBRL((bd.MO||0)/area)}/m²` : `${totalDireto > 0 ? Math.round(((bd.MO||0)/totalDireto)*100) : 0}%`, color: 'text-orange-600' },
          { label: 'Material', val: fmtBRL(bd.M || 0), sub: area > 0 ? `${fmtBRL((bd.M||0)/area)}/m²` : `${totalDireto > 0 ? Math.round(((bd.M||0)/totalDireto)*100) : 0}%`, color: 'text-blue-600' },
          { label: 'Área Construída', val: area > 0 ? `${area} m²` : '—', sub: area > 0 ? `${fmtBRL(orc.total_com_bdi / area)}/m²` : 'sem área', color: 'text-teal-600' },
        ].map(k => (
          <div key={k.label} className="rounded-xl border bg-card p-4 space-y-1 shadow-sm">
            <p className="text-[11px] text-muted-foreground font-medium">{k.label}</p>
            <p className={`text-lg font-bold tabular-nums leading-tight ${k.color}`}>{k.val}</p>
            <p className="text-[11px] text-muted-foreground">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Pizza + Radial */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm font-semibold mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-primary" /> Composição do Custo Direto</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={dataTipo} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                dataKey="value" nameKey="name" paddingAngle={3} isAnimationActive animationBegin={0} animationDuration={900}>
                {dataTipo.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm font-semibold mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500" /> Custo por m² por Tipo</p>
          {area > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <RadialBarChart cx="50%" cy="50%" innerRadius={30} outerRadius={90}
                data={dataM2} startAngle={90} endAngle={-270}>
                <RadialBar dataKey="value" isAnimationActive />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                <Tooltip formatter={(v) => [`R$${v}/m²`, '']} />
              </RadialBarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">
              Defina a área construída no orçamento para ver custo/m²
            </div>
          )}
        </div>
      </div>

      {/* ── Custo por Categoria de Insumo (destaque) ──────────────────────── */}
      <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
        <p className="text-sm font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500" /> Custo por Categoria de Insumo
        </p>
        {/* Cards das top 6 categorias */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {categorias.slice(0, 6).map(cat => (
            <div key={cat.nome} className="rounded-lg border p-3 space-y-0.5" style={{ borderLeftWidth: 3, borderLeftColor: cat.fill }}>
              <p className="text-[11px] text-muted-foreground font-medium leading-tight">{cat.nome}</p>
              <p className="text-base font-bold tabular-nums leading-tight">{fmtBRL(cat.custo)}</p>
              <p className="text-[10px] text-muted-foreground">{cat.pct.toFixed(1)}% do total{area > 0 ? ` · ${fmtBRL(cat.custo / area)}/m²` : ''}</p>
            </div>
          ))}
        </div>
        {/* Barra horizontal de todas as categorias */}
        <div className="space-y-1.5 pt-1">
          {categorias.map(cat => (
            <div key={cat.nome} className="flex items-center gap-2 group">
              <span className="text-[11px] text-muted-foreground w-40 shrink-0 truncate group-hover:text-foreground transition-colors">{cat.nome}</span>
              <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden relative">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(cat.pct / (categorias[0]?.pct || 1) * 100, 1)}%`, backgroundColor: cat.fill }} />
              </div>
              <span className="text-[11px] font-semibold tabular-nums w-24 text-right shrink-0">{fmtBRL(cat.custo)}</span>
              <span className="text-[10px] text-muted-foreground w-10 text-right shrink-0">{cat.pct.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Barras por etapa */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <p className="text-sm font-semibold mb-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Custo por Etapa</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={dataEtapa} margin={{ top: 4, right: 16, left: 8, bottom: 60 }}
            barSize={18}>
            <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-40} textAnchor="end" interval={0} />
            <YAxis tickFormatter={fmtK} tick={{ fontSize: 10 }} />
            <Tooltip content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const etapa = dataEtapa.find(d => d.name === label);
              return (
                <div className="bg-popover border border-border rounded-lg shadow-xl px-3 py-2 text-xs space-y-1 max-w-56">
                  <p className="font-bold text-foreground mb-1 leading-tight">{etapa?.fullName || label}</p>
                  {payload.map((p) => (
                    <div key={p.name} className="flex items-center gap-2 justify-between">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.fill }} />
                        {p.name}
                      </span>
                      <span className="font-semibold tabular-nums">{fmtBRL(Number(p.value) || 0)}</span>
                    </div>
                  ))}
                </div>
              );
            }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="M" name="Material" stackId="a" fill={CORES_TIPO.M} isAnimationActive animationBegin={0} animationDuration={800} />
            <Bar dataKey="MO" name="Mão de Obra" stackId="a" fill={CORES_TIPO.MO} isAnimationActive animationBegin={100} animationDuration={800} />
            <Bar dataKey="E" name="Equipamento" stackId="a" fill={CORES_TIPO.E} isAnimationActive animationBegin={200} animationDuration={800} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabela resumo por etapa */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30">
          <p className="text-sm font-semibold">Resumo por Etapa</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/10 text-xs text-muted-foreground">
                <th className="text-left px-4 py-2 font-medium">Etapa</th>
                <th className="text-right px-3 py-2 font-medium w-20">Itens</th>
                <th className="text-right px-3 py-2 font-medium w-28">Material</th>
                <th className="text-right px-3 py-2 font-medium w-28">Mão de Obra</th>
                <th className="text-right px-3 py-2 font-medium w-28">Total</th>
                <th className="text-right px-3 py-2 font-medium w-16">%</th>
              </tr>
            </thead>
            <tbody>
              {orc.etapas.filter(e => e.subtotal > 0).map(e => {
                const pct = totalDireto > 0 ? (e.subtotal / totalDireto * 100) : 0;
                return (
                  <tr key={e.codigo} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-sm">{e.descricao}</td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground text-xs">{e.itens.length}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs text-blue-700">{fmtBRL(e.breakdown.M || 0)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs text-orange-700">{fmtBRL(e.breakdown.MO || 0)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{fmtBRL(e.subtotal)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="h-1.5 w-12 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary/70 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] tabular-nums text-muted-foreground w-8 text-right">{pct.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CurvaABC({ orc }: { orc: OrcamentoDetalhe }) {
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [filtroCategoria, setFiltroCategoria] = useState('TODAS');
  const [busca, setBusca] = useState('');
  const [viewMode, setViewMode] = useState<'insumos' | 'categorias'>('insumos');

  // ── Agrega insumos ───────────────────────────────────────────────────────────
  const insumosMap = new Map<string, {
    insumo_id: string; descricao: string; unidade: string; tipo: string; categoria: string;
    custo_total: number; qtd_total: number; preco_unitario: number;
  }>();

  for (const etapa of orc.etapas) {
    for (const item of etapa.itens) {
      for (const ins of (item.insumos || [])) {
        const existente = insumosMap.get(ins.insumo_id);
        if (existente) {
          existente.custo_total += ins.custo_item;
          existente.qtd_total += (ins.qtd_adotada ?? ins.qtd_calculada);
        } else {
          insumosMap.set(ins.insumo_id, {
            insumo_id: ins.insumo_id,
            descricao: ins.descricao,
            unidade: ins.unidade,
            tipo: ins.tipo,
            categoria: (ins as { categoria?: string }).categoria || (ins.tipo === 'MO' ? 'Mão de Obra' : ins.tipo === 'E' ? 'Equipamento' : ins.tipo === 'S' ? 'Serviço' : 'Material'),
            custo_total: ins.custo_item,
            qtd_total: (ins.qtd_adotada ?? ins.qtd_calculada),
            preco_unitario: ins.preco_unitario ?? 0,
          });
        }
      }
    }
  }

  const lista = Array.from(insumosMap.values()).sort((a, b) => b.custo_total - a.custo_total);
  const totalGeral = lista.reduce((acc, i) => acc + i.custo_total, 0);

  // ── Classe ABC (calculada sobre lista completa, antes de filtros) ────────────
  let acumulado = 0;
  const listaComABC = lista.map(ins => {
    acumulado += ins.custo_total;
    const pctAcum = totalGeral > 0 ? (acumulado / totalGeral) * 100 : 0;
    const classe = pctAcum <= 50 ? 'A' : pctAcum <= 80 ? 'B' : 'C';
    return { ...ins, pctAcum, classe };
  });

  // ── Agrupamento por CATEGORIA REAL do insumo ─────────────────────────────────
  const porCategoria = new Map<string, { nome: string; tipo: string; custo: number; qtdInsumos: number }>();
  for (const ins of listaComABC) {
    const key = ins.categoria;
    const ex = porCategoria.get(key);
    if (ex) { ex.custo += ins.custo_total; ex.qtdInsumos++; }
    else porCategoria.set(key, { nome: ins.categoria, tipo: ins.tipo, custo: ins.custo_total, qtdInsumos: 1 });
  }
  const categoriasOrdenadas = Array.from(porCategoria.entries())
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.custo - a.custo);

  // ── Filtros ──────────────────────────────────────────────────────────────────
  let listaFiltrada = listaComABC;
  if (filtroTipo !== 'TODOS') listaFiltrada = listaFiltrada.filter(i => i.tipo === filtroTipo);
  if (filtroCategoria !== 'TODAS') listaFiltrada = listaFiltrada.filter(i => i.categoria === filtroCategoria);
  if (busca.trim()) {
    const b = busca.toLowerCase();
    listaFiltrada = listaFiltrada.filter(i => i.descricao.toLowerCase().includes(b));
  }

  const classeCount = { A: 0, B: 0, C: 0 };
  listaComABC.forEach(i => classeCount[i.classe as 'A' | 'B' | 'C']++);

  if (insumosMap.size === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
        <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-20" />
        <p className="font-medium mb-1">Nenhum insumo encontrado</p>
        <p className="text-xs">Adicione itens com composições ao orçamento para ver a Curva ABC</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Cards Classe A/B/C ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {(['A', 'B', 'C'] as const).map(cls => {
          const cores = { A: 'bg-red-50 border-red-200 text-red-700', B: 'bg-amber-50 border-amber-200 text-amber-700', C: 'bg-green-50 border-green-200 text-green-700' };
          const pcts = { A: '0–50%', B: '50–80%', C: '80–100%' };
          const totalCls = listaComABC.filter(i => i.classe === cls).reduce((a, i) => a + i.custo_total, 0);
          return (
            <div key={cls} className={`rounded-xl border p-3.5 ${cores[cls]}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-lg font-black">Classe {cls}</span>
                <span className="text-xs font-medium opacity-70">{pcts[cls]}</span>
              </div>
              <p className="text-xl font-bold tabular-nums">{fmtBRL(totalCls)}</p>
              <p className="text-xs opacity-70 mt-0.5">{classeCount[cls]} insumo{classeCount[cls] !== 1 ? 's' : ''}</p>
            </div>
          );
        })}
      </div>

      {/* ── Toggle view + filtros ──────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap items-center">
        {/* Toggle Por Insumo / Por Categoria */}
        <div className="flex rounded-lg border overflow-hidden shrink-0">
          <button onClick={() => setViewMode('insumos')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'insumos' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}>
            Por Insumo
          </button>
          <button onClick={() => setViewMode('categorias')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'categorias' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}>
            Por Categoria
          </button>
        </div>

        {viewMode === 'insumos' && (
          <>
            <Input placeholder="Buscar insumo..." value={busca} onChange={e => setBusca(e.target.value)} className="h-8 text-xs w-44" />
            {/* Filtro por tipo M/MO/E */}
            {['TODOS', 'M', 'MO', 'E', 'S'].map(t => (
              <button key={t}
                className={`h-8 px-3 text-xs rounded-md border transition-colors font-medium ${filtroTipo === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground hover:text-foreground hover:border-foreground/40'}`}
                onClick={() => { setFiltroTipo(t); setFiltroCategoria('TODAS'); }}>
                {t === 'TODOS' ? 'Todos' : TIPO_LABEL[t] || t}
              </button>
            ))}
            {/* Filtro por categoria do insumo */}
            <select value={filtroCategoria}
              onChange={e => { setFiltroCategoria(e.target.value); setFiltroTipo('TODOS'); }}
              className="h-8 px-2 text-xs rounded-md border bg-background text-muted-foreground cursor-pointer hover:border-foreground/40">
              <option value="TODAS">Todas as categorias</option>
              {categoriasOrdenadas.map(c => (
                <option key={c.key} value={c.key}>{c.nome} ({c.qtdInsumos})</option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* ── Tabela por insumo (com subtotais por categoria) ─────────────────── */}
      {viewMode === 'insumos' && (() => {
        // Agrupar listaFiltrada por categoria, mantendo ordem de custo dentro de cada grupo
        const agrupado: { cat: string; totalCat: number; pctCat: number; itens: typeof listaFiltrada }[] = [];
        const catMap = new Map<string, typeof listaFiltrada>();
        for (const ins of listaFiltrada) {
          if (!catMap.has(ins.categoria)) catMap.set(ins.categoria, []);
          catMap.get(ins.categoria)!.push(ins);
        }
        for (const [cat, itens] of catMap.entries()) {
          const totalCat = itens.reduce((s, i) => s + i.custo_total, 0);
          const pctCat = totalGeral > 0 ? totalCat / totalGeral * 100 : 0;
          agrupado.push({ cat, totalCat, pctCat, itens });
        }
        agrupado.sort((a, b) => b.totalCat - a.totalCat);
        let seq = 0;
        const totalFiltrado = listaFiltrada.reduce((s, i) => s + i.custo_total, 0);

        return (
          <div className="border rounded-xl overflow-hidden shadow-sm">
            {/* Banner de subtotal quando filtro ativo */}
            {filtroCategoria !== 'TODAS' && (
              <div className="flex items-center justify-between px-4 py-2 bg-primary/8 border-b">
                <span className="text-xs font-semibold text-primary">
                  {filtroCategoria} — {listaFiltrada.length} insumo{listaFiltrada.length !== 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{(totalFiltrado / totalGeral * 100).toFixed(1)}% do total</span>
                  <span className="text-sm font-bold text-primary tabular-nums">{fmtBRL(totalFiltrado)}</span>
                  <button onClick={() => setFiltroCategoria('TODAS')} className="text-xs text-muted-foreground hover:text-primary underline">limpar filtro</button>
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/20">
                    <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium w-8">#</th>
                    <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">Insumo</th>
                    <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium w-20">Tipo</th>
                    <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium w-24">Qtd. Total</th>
                    <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium w-24">Preço Unit.</th>
                    <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium w-28">Custo Total</th>
                    <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium w-16">% Acum.</th>
                    <th className="text-center px-3 py-2 text-xs text-muted-foreground font-medium w-14">Classe</th>
                  </tr>
                </thead>
                <tbody>
                  {agrupado.map(({ cat, totalCat, pctCat, itens: insGrupo }) => (
                    <Fragment key={cat}>
                      {/* Linha de cabeçalho da categoria */}
                      <tr className="bg-muted/40 border-b border-t">
                        <td colSpan={5} className="px-3 py-1.5">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setFiltroCategoria(filtroCategoria === cat ? 'TODAS' : cat)}
                              className={`text-[11px] font-bold px-2 py-0.5 rounded border transition-colors ${filtroCategoria === cat ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-primary/10 hover:border-primary/40 hover:text-primary'}`}>
                              {cat}
                            </button>
                            <span className="text-[10px] text-muted-foreground">{insGrupo.length} insumo{insGrupo.length !== 1 ? 's' : ''}</span>
                          </div>
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <span className="text-xs font-bold text-foreground tabular-nums">{fmtBRL(totalCat)}</span>
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <span className="text-[10px] text-muted-foreground tabular-nums">{pctCat.toFixed(1)}%</span>
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="h-1 rounded-full bg-muted overflow-hidden w-10 ml-auto">
                            <div className="h-full bg-primary/60 rounded-full" style={{ width: `${Math.min(pctCat * 3, 100)}%` }} />
                          </div>
                        </td>
                      </tr>
                      {/* Linhas dos insumos da categoria */}
                      {insGrupo.map(ins => {
                        seq++;
                        const classeCor = { A: 'bg-red-100 text-red-700 border-red-200', B: 'bg-amber-100 text-amber-700 border-amber-200', C: 'bg-green-100 text-green-700 border-green-200' }[ins.classe] || '';
                        const precoUnit = ins.qtd_total > 0 ? ins.custo_total / ins.qtd_total : ins.preco_unitario;
                        return (
                          <tr key={ins.insumo_id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                            <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums pl-5">{seq}</td>
                            <td className="px-3 py-2 font-medium text-sm leading-tight">{ins.descricao}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded border ${TIPO_COR[ins.tipo] || ''}`}>
                                {TIPO_LABEL[ins.tipo] || ins.tipo}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground text-xs">
                              {ins.qtd_total.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {ins.unidade}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-xs">{fmtBRL(precoUnit)}</td>
                            <td className="px-3 py-2 text-right tabular-nums font-medium">{fmtBRL(ins.custo_total)}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground text-xs">{ins.pctAcum.toFixed(1)}%</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`inline-flex items-center justify-center w-7 h-5 text-xs font-black rounded border ${classeCor}`}>{ins.classe}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                  {listaFiltrada.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground text-sm">Nenhum insumo encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ── Tabela por categoria do insumo ────────────────────────────────── */}
      {viewMode === 'categorias' && (
        <div className="border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/20">
                <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">Categoria do Insumo</th>
                <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium w-20">Tipo</th>
                <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium w-16">Qtd</th>
                <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium w-28">Custo Total</th>
                <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium w-32">% do Total</th>
              </tr>
            </thead>
            <tbody>
              {categoriasOrdenadas.map(cat => {
                const pct = totalGeral > 0 ? (cat.custo / totalGeral * 100) : 0;
                const ativo = filtroCategoria === cat.key;
                return (
                  <tr key={cat.key}
                    className={`border-b last:border-0 cursor-pointer transition-colors ${ativo ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-muted/20'}`}
                    title="Clique para filtrar por esta categoria"
                    onClick={() => { setFiltroCategoria(ativo ? 'TODAS' : cat.key); setViewMode('insumos'); }}>
                    <td className="px-3 py-2.5 font-medium">{cat.nome}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded border ${TIPO_COR[cat.tipo] || ''}`}>
                        {TIPO_LABEL[cat.tipo] || cat.tipo}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground tabular-nums">{cat.qtdInsumos}</td>
                    <td className="px-3 py-2.5 text-right font-bold tabular-nums">{fmtBRL(cat.custo)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground w-10 text-right">{pct.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrcamentoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [orc, setOrc] = useState<OrcamentoDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState<'planilha' | 'abc' | 'dashboard'>('planilha');
  const [modalPrint, setModalPrint] = useState(false);
  const [printSecs, setPrintSecs] = useState({ planilha: true, abc: true, dashboard: true });

  // Modal adicionar item
  const [modalAberto, setModalAberto] = useState(false);
  const [etapaSelecionada, setEtapaSelecionada] = useState('01');
  const [subEtapaNovoItem, setSubEtapaNovoItem] = useState('');
  const [composicoes, setComposicoes] = useState<Composicao[]>([]);
  const [buscaComp, setBuscaComp] = useState('');
  const [compSelecionada, setCompSelecionada] = useState<Composicao | null>(null);
  const [quantidade, setQuantidade] = useState('1');
  const [descricaoLivre, setDescricaoLivre] = useState('');
  const [unidadeLivre, setUnidadeLivre] = useState('');
  const [custoLivre, setCustoLivre] = useState('0');
  const [adicionando, setAdicionando] = useState(false);

  // Modal editar item
  const [editItem, setEditItem] = useState<ItemOrcamentoUI | null>(null);
  const [editQtd, setEditQtd] = useState('');
  const [editSubEtapa, setEditSubEtapa] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editUnidade, setEditUnidade] = useState('');
  const [editCusto, setEditCusto] = useState('');
  const [salvandoEdit, setSalvandoEdit] = useState(false);

  // Expand insumos por item
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  // Drag-and-drop
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Modal unificado Editar/Adicionar Serviço
  const [editorServico, setEditorServico] = useState<{ etapaCodigo: string; nome: string } | null>(null);
  const [editorNome, setEditorNome] = useState('');
  const [editorEtapa, setEditorEtapa] = useState('');
  const [editorBusca, setEditorBusca] = useState('');
  const [editorResultados, setEditorResultados] = useState<Composicao[]>([]);
  const [editorCompSel, setEditorCompSel] = useState<Composicao | null>(null);
  const [editorQtd, setEditorQtd] = useState('1');
  const [salvandoNomeServico, setSalvandoNomeServico] = useState(false);
  const [adicionandoNaEdicao, setAdicionandoNaEdicao] = useState(false);

  // Modal "Adicionar Serviço" (múltiplas composições agrupadas)
  interface ServicoComp { uid: string; comp: Composicao | null; busca: string; quantidade: string; resultados: Composicao[]; }
  const novaServicoComp = (): ServicoComp => ({ uid: Math.random().toString(36).slice(2), comp: null, busca: '', quantidade: '1', resultados: [] });
  const [modalServico, setModalServico] = useState(false);
  const [servicoNome, setServicoNome] = useState('');
  const [servicoEtapa, setServicoEtapa] = useState('01');
  const [servicoComps, setServicoComps] = useState<ServicoComp[]>([novaServicoComp()]);
  const [adicionandoServico, setAdicionandoServico] = useState(false);

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

  // ── Busca de composições (modal Adicionar) ───────────────────────────────────
  useEffect(() => {
    if (buscaComp.length >= 2) {
      fetch(`/api/composicoes?q=${encodeURIComponent(buscaComp)}&status=ativo&custo=1`)
        .then(r => r.json())
        .then(d => setComposicoes(Array.isArray(d) ? d.slice(0, 20) : []));
    } else {
      setComposicoes([]);
    }
  }, [buscaComp]);

  // ── Busca de composições (modal Editor de Serviço) ──────────────────────────
  useEffect(() => {
    if (editorBusca.length < 2) { setEditorResultados([]); return; }
    const timer = setTimeout(() => {
      fetch(`/api/composicoes?q=${encodeURIComponent(editorBusca)}&status=ativo&custo=1`)
        .then(r => r.json())
        .then(d => setEditorResultados(Array.isArray(d) ? d.slice(0, 20) : []));
    }, 250);
    return () => clearTimeout(timer);
  }, [editorBusca]);

  // ── Toggle expand ───────────────────────────────────────────────────────────
  function toggleExpand(itemId: string) {
    setExpandidos(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  // ── Funções ─────────────────────────────────────────────────────────────────
  function abrirModal(codigoEtapa: string) {
    setEtapaSelecionada(codigoEtapa);
    setSubEtapaNovoItem('');
    setCompSelecionada(null);
    setBuscaComp('');
    setQuantidade('1');
    setDescricaoLivre('');
    setUnidadeLivre('');
    setCustoLivre('0');
    setModalAberto(true);
  }

  function abrirEditorServico(etapaCodigo: string, nome: string) {
    setEditorServico({ etapaCodigo, nome });
    setEditorNome(nome);
    setEditorEtapa(etapaCodigo);
    setEditorBusca('');
    setEditorResultados([]);
    setEditorCompSel(null);
    setEditorQtd('1');
  }

  function abrirModalServico(codigoEtapa: string) {
    setServicoEtapa(codigoEtapa);
    setServicoNome('');
    setServicoComps([novaServicoComp()]);
    setModalServico(true);
  }

  function abrirEditItem(item: ItemOrcamentoUI) {
    setEditItem(item);
    setEditQtd(String(item.quantidade));
    setEditSubEtapa(item.sub_etapa || '');
    setEditDesc(item.descricao_override || item.composicao?.descricao || '');
    setEditUnidade(item.unidade_override || item.composicao?.unidade_producao || '');
    setEditCusto(item.custo_unitario_override > 0 ? String(item.custo_unitario_override) : '');
  }

  async function salvarOrcamento(updates: Record<string, unknown>) {
    if (!orc) return;
    try {
      const res = await fetch(`/api/orcamentos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: orc.titulo, descricao: orc.descricao, status: orc.status, bdi_percentual: orc.bdi_percentual, ...updates }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.erros?.join(', ') || d.error || 'Erro ao salvar'); return; }
      await carregar();
    } catch { toast.error('Erro de conexão'); }
  }

  async function atualizarItem(itemId: string, campos: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/orcamentos/${id}/itens/${itemId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campos),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || 'Erro'); return; }
      carregar();
    } catch { toast.error('Erro ao atualizar item'); }
  }

  // Salva override de quantidade de um insumo específico dentro de um item
  async function atualizarQtdInsumo(item: ItemOrcamentoUI, insumoId: string, novaQtd: number) {
    // Reconstrói qtd_overrides mantendo overrides existentes e adicionando/atualizando o novo
    const qtdOverrides: Record<string, number> = {};
    item.insumos.forEach(ins => {
      if (ins.has_override) qtdOverrides[ins.insumo_id] = ins.qtd_adotada;
    });
    qtdOverrides[insumoId] = novaQtd;
    try {
      const res = await fetch(`/api/orcamentos/${id}/itens/${item.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantidade: item.quantidade, qtd_overrides: qtdOverrides }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || 'Erro'); return; }
      carregar();
    } catch { toast.error('Erro ao atualizar insumo'); }
  }

  // Adiciona múltiplas composições agrupadas num serviço (sub_etapa)
  async function adicionarServico() {
    if (!servicoNome.trim()) { toast.error('Informe o nome do serviço'); return; }
    const validas = servicoComps.filter(c => c.comp);
    if (validas.length === 0) { toast.error('Adicione pelo menos uma composição'); return; }
    setAdicionandoServico(true);
    try {
      for (const c of validas) {
        await fetch(`/api/orcamentos/${id}/itens`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            etapa_codigo: servicoEtapa,
            sub_etapa: servicoNome.trim(),
            composicao_id: c.comp!.id,
            quantidade: Number(c.quantidade) || 1,
          }),
        });
      }
      toast.success(`Serviço "${servicoNome}" adicionado com ${validas.length} composição(ões)`);
      setModalServico(false);
      setServicoNome(''); setServicoEtapa('01');
      setServicoComps([novaServicoComp()]);
      carregar();
    } finally { setAdicionandoServico(false); }
  }

  // Busca composições para uma linha do modal Serviço
  async function buscarCompsServico(uid: string, query: string) {
    setServicoComps(prev => prev.map(c => c.uid === uid ? { ...c, busca: query, comp: null } : c));
    if (query.length < 2) {
      setServicoComps(prev => prev.map(c => c.uid === uid ? { ...c, resultados: [] } : c));
      return;
    }
    const res = await fetch(`/api/composicoes?q=${encodeURIComponent(query)}&status=ativo&custo=1`);
    const data = await res.json();
    setServicoComps(prev => prev.map(c =>
      c.uid === uid ? { ...c, resultados: Array.isArray(data) ? data.slice(0, 20) : [] } : c
    ));
  }

  async function removerItem(itemId: string) {
    if (!confirm('Remover este item do orçamento?')) return;
    const res = await fetch(`/api/orcamentos/${id}/itens/${itemId}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Item removido'); carregar(); }
    else toast.error('Erro ao remover');
  }

  async function removerSubEtapa(etapaCodigo: string, nomeSubEtapa: string, itens: ItemOrcamentoUI[]) {
    await Promise.all(itens.map(item =>
      fetch(`/api/orcamentos/${id}/itens/${item.id}`, { method: 'DELETE' })
    ));
    toast.success(`Sub-etapa "${nomeSubEtapa}" excluída`);
    carregar();
  }

  async function adicionarItem() {
    if (!compSelecionada) { toast.error('Selecione uma composição'); return; }
    setAdicionando(true);
    try {
      const body: Record<string, unknown> = {
        etapa_codigo: etapaSelecionada,
        composicao_id: compSelecionada.id,
        quantidade: Number(quantidade) || 1,
        sub_etapa: subEtapaNovoItem.trim(),
      };
      const res = await fetch(`/api/orcamentos/${id}/itens`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.erros?.join(', ') || d.error); return; }
      toast.success('Composição adicionada');
      setModalAberto(false);
      carregar();
    } finally { setAdicionando(false); }
  }

  async function salvarEdicaoItem() {
    if (!editItem) return;
    setSalvandoEdit(true);
    try {
      await atualizarItem(editItem.id, {
        quantidade: Number(editQtd) || editItem.quantidade,
        sub_etapa: editSubEtapa,
        descricao_override: editDesc,
        unidade_override: editUnidade,
        custo_unitario_override: Number(editCusto) || 0,
      });
      setEditItem(null);
      toast.success('Item atualizado');
    } finally { setSalvandoEdit(false); }
  }

  async function salvarEditorServico() {
    if (!editorServico || !editorNome.trim()) return;
    setSalvandoNomeServico(true);
    try {
      const novoNome = editorNome.trim();
      const novaEtapa = editorEtapa;
      const etapa = orc?.etapas.find(e => e.codigo === editorServico.etapaCodigo);
      const itensGrupo = etapa?.itens.filter(i => (i.sub_etapa || '') === editorServico.nome) ?? [];
      await Promise.all(itensGrupo.map(item =>
        fetch(`/api/orcamentos/${id}/itens/${item.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sub_etapa: novoNome, etapa_codigo: novaEtapa, quantidade: item.quantidade }),
        })
      ));
      setEditorServico({ etapaCodigo: novaEtapa, nome: novoNome });
      toast.success('Serviço atualizado');
      carregar();
    } finally { setSalvandoNomeServico(false); }
  }

  async function adicionarNaEdicaoServico() {
    if (!editorServico || !editorCompSel) return;
    setAdicionandoNaEdicao(true);
    try {
      await fetch(`/api/orcamentos/${id}/itens`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          etapa_codigo: editorServico.etapaCodigo,
          sub_etapa: editorServico.nome,
          composicao_id: editorCompSel.id,
          quantidade: Number(editorQtd) || 1,
        }),
      });
      setEditorCompSel(null); setEditorBusca(''); setEditorQtd('1');
      carregar();
    } finally { setAdicionandoNaEdicao(false); }
  }

  async function handleDrop(etapaCodigo: string, targetId: string) {
    if (!draggingId || draggingId === targetId || !orc) { setDraggingId(null); setDragOverId(null); return; }
    const etapa = orc.etapas.find(e => e.codigo === etapaCodigo);
    if (!etapa) return;
    const items = [...etapa.itens];
    const fromIdx = items.findIndex(i => i.id === draggingId);
    const toIdx = items.findIndex(i => i.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = items.splice(fromIdx, 1);
    items.splice(toIdx, 0, moved);
    const newItems = items.map((item, idx) => ({ ...item, ordem: idx + 1 }));
    setOrc(prev => {
      if (!prev) return prev;
      return { ...prev, etapas: prev.etapas.map(et => et.codigo === etapaCodigo ? { ...et, itens: newItems } : et) };
    });
    setDraggingId(null); setDragOverId(null);
    for (const item of newItems) {
      fetch(`/api/orcamentos/${id}/itens/${item.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordem: item.ordem, quantidade: item.quantidade }),
      }).catch(() => null);
    }
  }

  // ── Renderização loading/erro ────────────────────────────────────────────────
  if (loading && !orc) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-2 text-sm">
        <RefreshCw className="h-4 w-4 animate-spin" /> Carregando orçamento...
      </div>
    );
  }
  if (!orc) {
    return <div className="text-center py-24 text-muted-foreground text-sm">Orçamento não encontrado.</div>;
  }

  const totalDireto = orc.total_direto;
  const bdiValor = totalDireto * (orc.bdi_percentual / 100);
  const bd = orc.total_breakdown || { M: 0, MO: 0, E: 0, S: 0 };
  const BREAKDOWN_TIPOS = [
    { key: 'M', label: 'Material', bg: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300' },
    { key: 'MO', label: 'Mão de Obra', bg: 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-300' },
    { key: 'E', label: 'Equipamento', bg: 'bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300' },
  ] as const;

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-12">

      {/* ═══ CABEÇALHO ═══════════════════════════════════════════════════════ */}
      <div className="bg-card border rounded-xl p-4 shadow-sm">
        <div className="flex items-start gap-3 flex-wrap">
          <Link href="/orcamentos" className={buttonVariants({ variant: 'ghost', size: 'sm' })} title="Voltar">
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold leading-tight">
                <CelulaTexto
                  valor={orc.titulo}
                  onSalvar={async v => { if (v.trim()) await salvarOrcamento({ titulo: v.trim() }); }}
                />
              </h1>
              <StatusInline status={orc.status} onSalvar={v => salvarOrcamento({ status: v })} />
            </div>
            <p className="text-sm text-muted-foreground leading-snug">
              <CelulaTexto
                valor={orc.descricao || ''}
                onSalvar={v => salvarOrcamento({ descricao: v })}
              />
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <BDIInline valor={orc.bdi_percentual} onSalvar={v => salvarOrcamento({ bdi_percentual: v })} />
              <AreaInline valor={Number(orc.area_construida) || 0} onSalvar={v => salvarOrcamento({ area_construida: v })} />
              {orc.data_atualizacao && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3 shrink-0" />
                  Atualizado em {fmtData(orc.data_atualizacao)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={carregar} disabled={loading} title="Recarregar">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" size="sm" className="h-8"
              onClick={async () => {
                if (!confirm('Salvar este orçamento como template? Ele ficará disponível para novos orçamentos.')) return;
                const res = await fetch(`/api/orcamentos/${id}/clone`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ as_template: true }),
                });
                if (res.ok) toast.success('Salvo como template!');
                else toast.error('Erro ao salvar template');
              }}
              title="Salvar como Template">
              <LayoutTemplate className="h-3.5 w-3.5 mr-1" /> Template
            </Button>
            <Button variant="outline" size="sm" className="h-8"
              onClick={() => window.open(`/api/exportar?tipo=orcamento&id=${id}`, '_blank')} title="Exportar Excel — 5 abas">
              <Download className="h-3.5 w-3.5 mr-1" /> Excel
            </Button>
            <Button variant="outline" size="sm" className="h-8"
              onClick={() => setModalPrint(true)} title="Imprimir / Exportar PDF">
              <Printer className="h-3.5 w-3.5 mr-1" /> Imprimir
            </Button>
            <Link
              href={`/calculadora?orcamento_id=${id}&orcamento_titulo=${encodeURIComponent(orc?.titulo || '')}`}
              className={`${buttonVariants({ size: 'sm', variant: 'outline' })} h-8 border-amber-300 text-amber-700 hover:bg-amber-50`}
              title="Calcular quantitativos parametricamente">
              <Zap className="h-3.5 w-3.5 mr-1" /> Calcular
            </Link>
            <Button size="sm" variant="outline" className="h-8" onClick={() => abrirModal('01')} title="Adicionar composição simples">
              <Plus className="h-3.5 w-3.5 mr-1" /> Composição
            </Button>
            <Button size="sm" className="h-8" onClick={() => abrirModalServico('01')} title="Adicionar serviço com múltiplas composições">
              <Layers className="h-3.5 w-3.5 mr-1" /> Serviço
            </Button>
          </div>
        </div>
      </div>

      {/* ═══ CARDS DE TOTAIS ═════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground font-medium mb-1.5">Total Direto</p>
          <p className="text-2xl font-bold tabular-nums leading-none truncate">{fmtBRL(totalDireto)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {orc.etapas.reduce((acc, e) => acc + e.itens.length, 0)} item(s) em {orc.etapas.length} etapa(s)
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground font-medium mb-1.5">BDI ({orc.bdi_percentual}%)</p>
          <p className="text-2xl font-bold tabular-nums leading-none truncate">{fmtBRL(bdiValor)}</p>
          <p className="text-xs text-muted-foreground mt-1">Benefícios e despesas indiretas</p>
        </div>
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 shadow-sm">
          <p className="text-xs text-primary/70 font-semibold mb-1.5">Total com BDI</p>
          <p className="text-2xl font-bold tabular-nums text-primary leading-none truncate">{fmtBRL(orc.total_com_bdi)}</p>
          <p className="text-xs text-primary/60 mt-1">Valor total do orçamento</p>
        </div>
      </div>

      {/* Breakdown por tipo */}
      <div className="grid grid-cols-3 gap-3">
        {BREAKDOWN_TIPOS.map(({ key, label, bg, text }) => {
          const val = bd[key as keyof Breakdown] || 0;
          const pct = totalDireto > 0 ? Math.round((val / totalDireto) * 100) : 0;
          const area = Number(orc.area_construida) || 0;
          const porM2 = area > 0 && val > 0 ? val / area : 0;
          return (
            <div key={key} className={`rounded-xl border p-3.5 ${bg}`}>
              <div className="flex items-start justify-between gap-1 mb-1.5">
                <span className={`text-[11px] font-semibold leading-tight ${text}`}>{label}</span>
                <span className={`text-sm font-bold ${text} shrink-0 tabular-nums`}>{pct}%</span>
              </div>
              <p className={`text-base font-bold tabular-nums ${text} truncate`}>{fmtBRL(val)}</p>
              {porM2 > 0 && (
                <p className={`text-[11px] font-medium tabular-nums mt-0.5 opacity-80 ${text}`}>
                  {fmtBRL(porM2)}/m²
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* ═══ ABAS ════════════════════════════════════════════════════════════ */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setAba('planilha')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${aba === 'planilha' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          <List className="h-3.5 w-3.5" /> Planilha
        </button>
        <button
          onClick={() => setAba('abc')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${aba === 'abc' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          <BarChart3 className="h-3.5 w-3.5" /> Curva ABC de Insumos
        </button>
        <button
          onClick={() => setAba('dashboard')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${aba === 'dashboard' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          <TrendingUp className="h-3.5 w-3.5" /> Dashboard
        </button>
      </div>

      {/* ═══ ABAS NA TELA (screen-only) ══════════════════════════════════════ */}
      <div className="screen-only">
        {aba === 'abc'       && <CurvaABC orc={orc} />}
        {aba === 'dashboard' && <DashboardOrcamento orc={orc} />}
      </div>

      {/* ═══ ÁREA EXCLUSIVA DE IMPRESSÃO — sempre no DOM, invisível na tela ══ */}
      <div className="print-area" aria-hidden="true">
        <div className="print-planilha print-section">
          <h2 className="print-section-title">Planilha — {orc.titulo}</h2>
          {orc.etapas.map(etapa => (
            <div key={etapa.codigo} style={{ marginBottom: '16px' }}>
              <div style={{ background: '#1E3A5F', color: '#fff', padding: '4px 8px', fontWeight: 'bold', fontSize: '10pt' }}>
                {etapa.codigo} — {etapa.descricao} · {fmtBRL(etapa.subtotal)}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
                <thead>
                  <tr style={{ background: '#D6E0F0' }}>
                    <th style={{ border: '1px solid #ccc', padding: '3px 6px', textAlign: 'left' }}>Código</th>
                    <th style={{ border: '1px solid #ccc', padding: '3px 6px', textAlign: 'left' }}>Descrição</th>
                    <th style={{ border: '1px solid #ccc', padding: '3px 6px', textAlign: 'center' }}>Und</th>
                    <th style={{ border: '1px solid #ccc', padding: '3px 6px', textAlign: 'right' }}>Qtd</th>
                    <th style={{ border: '1px solid #ccc', padding: '3px 6px', textAlign: 'right' }}>C. Unit.</th>
                    <th style={{ border: '1px solid #ccc', padding: '3px 6px', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {etapa.itens.map(item => (
                    <tr key={item.id}>
                      <td style={{ border: '1px solid #ccc', padding: '3px 6px' }}>{item.composicao?.codigo || ''}</td>
                      <td style={{ border: '1px solid #ccc', padding: '3px 6px' }}>{item.descricao_override || item.composicao?.descricao || ''}</td>
                      <td style={{ border: '1px solid #ccc', padding: '3px 6px', textAlign: 'center' }}>{item.unidade_override || item.composicao?.unidade_producao || ''}</td>
                      <td style={{ border: '1px solid #ccc', padding: '3px 6px', textAlign: 'right' }}>{item.quantidade.toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</td>
                      <td style={{ border: '1px solid #ccc', padding: '3px 6px', textAlign: 'right' }}>{fmtBRL(item.custo_unitario_efetivo)}</td>
                      <td style={{ border: '1px solid #ccc', padding: '3px 6px', textAlign: 'right' }}>{fmtBRL(item.custo_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          <div style={{ borderTop: '2px solid #1E3A5F', paddingTop: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '11pt' }}>
            TOTAL GERAL: {fmtBRL(orc.total_direto)}
            {orc.bdi_percentual > 0 && <> &nbsp;|&nbsp; TOTAL COM BDI ({orc.bdi_percentual}%): {fmtBRL(orc.total_com_bdi)}</>}
          </div>
        </div>
        <div className="print-abc print-section">
          <h2 className="print-section-title">Curva ABC de Insumos</h2>
          <CurvaABC orc={orc} />
        </div>
        <div className="print-dashboard print-section">
          <h2 className="print-section-title">Dashboard</h2>
          <DashboardOrcamento orc={orc} />
        </div>
      </div>

      {/* ═══ ABA: PLANILHA ═══════════════════════════════════════════════════ */}
      {aba === 'planilha' && (
        <>
          {/* Estado vazio */}
          {orc.etapas.length === 0 && (
            <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium mb-1">Nenhum item adicionado</p>
              <p className="text-xs mb-4">Adicione composições ao orçamento organizadas por etapa de obra</p>
              <div className="flex gap-2 justify-center">
                <Button size="sm" variant="outline" onClick={() => abrirModal('01')}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Composição
                </Button>
                <Button size="sm" onClick={() => abrirModalServico('01')}>
                  <Layers className="h-3.5 w-3.5 mr-1" /> Serviço
                </Button>
              </div>
            </div>
          )}

          {/* Etapas */}
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
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => abrirModal(etapa.codigo)} title="Composição simples">
                        <Plus className="h-3 w-3" /> Comp.
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1 border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => abrirModalServico(etapa.codigo)} title="Serviço com múltiplas composições">
                        <Layers className="h-3 w-3" /> Serv.
                      </Button>
                    </div>
                  </div>

                  {/* Tabela */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/10">
                          <th className="w-6 px-1" />
                          <th className="w-7 px-1.5" />
                          <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">Descrição</th>
                          <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium w-20">Un.</th>
                          <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium w-32">Custo Unit.</th>
                          <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium w-28">Qtd.</th>
                          <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium w-32">Total</th>
                          <th className="w-16" />
                        </tr>
                      </thead>
                      <tbody>
                        {grupos.map((grupo, gi) => (
                          <Fragment key={`grupo-${etapa.codigo}-${gi}`}>
                            {/* Sub-etapa header */}
                            {grupo.nome && (
                              <tr className="bg-blue-50/60 dark:bg-blue-950/20 border-b border-t border-blue-100 dark:border-blue-900/40">
                                <td colSpan={8} className="px-3 py-1.5">
                                  <ServicoHeader
                                    nome={grupo.nome}
                                    itens={grupo.itens}
                                    onEditar={() => abrirEditorServico(etapa.codigo, grupo.nome)}
                                    onExcluir={() => removerSubEtapa(etapa.codigo, grupo.nome, grupo.itens)}
                                    onAdicionar={() => abrirEditorServico(etapa.codigo, grupo.nome)}
                                  />
                                </td>
                              </tr>
                            )}

                            {/* Linhas dos itens */}
                            {grupo.itens.map(item => {
                              const descricao = item.descricao_override || item.composicao?.descricao || '';
                              const unidade = item.unidade_override || item.composicao?.unidade_producao || '';
                              const isDragging = draggingId === item.id;
                              const isDragOver = dragOverId === item.id && draggingId !== item.id;
                              const isExpanded = expandidos.has(item.id);
                              const temInsumos = item.insumos && item.insumos.length > 0;

                              return (
                                <Fragment key={item.id}>
                                  <tr
                                    draggable
                                    onDragStart={e => { setDraggingId(item.id); e.dataTransfer.effectAllowed = 'move'; }}
                                    onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (item.id !== draggingId) setDragOverId(item.id); }}
                                    onDragLeave={() => { if (dragOverId === item.id) setDragOverId(null); }}
                                    onDrop={e => { e.preventDefault(); handleDrop(etapa.codigo, item.id); }}
                                    onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
                                    className={[
                                      'border-b transition-all group select-none',
                                      isDragging ? 'opacity-30 bg-primary/5' : '',
                                      isDragOver ? 'border-t-2 border-t-primary bg-primary/5' : 'hover:bg-muted/20',
                                      isExpanded ? 'bg-muted/10' : '',
                                    ].join(' ')}
                                  >
                                    {/* Botão expand insumos */}
                                    <td className="px-1 py-2 w-6">
                                      {temInsumos ? (
                                        <button
                                          className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                          onClick={() => toggleExpand(item.id)}
                                          title={isExpanded ? 'Ocultar insumos' : 'Ver insumos'}
                                        >
                                          {isExpanded
                                            ? <ChevronDown className="h-3.5 w-3.5" />
                                            : <ChevronRight className="h-3.5 w-3.5" />}
                                        </button>
                                      ) : <span className="w-4 inline-block" />}
                                    </td>

                                    {/* Handle drag */}
                                    <td className="px-1.5 py-2 w-7">
                                      <GripVertical className="h-4 w-4 text-muted-foreground/20 group-hover:text-muted-foreground/50 cursor-grab active:cursor-grabbing transition-colors" />
                                    </td>

                                    {/* Descrição */}
                                    <td className="px-3 py-2 max-w-xs">
                                      <CelulaDescricaoComposicao
                                        descricao={descricao}
                                        composicao={item.composicao}
                                        onTrocarComposicao={async comp => {
                                          await atualizarItem(item.id, {
                                            composicao_id: comp.id,
                                            descricao_override: '',
                                            unidade_override: '',
                                            quantidade: item.quantidade,
                                          });
                                        }}
                                        onSalvarDescricao={async v => {
                                          await atualizarItem(item.id, { descricao_override: v, quantidade: item.quantidade });
                                        }}
                                      />
                                    </td>

                                    {/* Unidade */}
                                    <td className="px-3 py-2">
                                      <CelulaTexto valor={unidade}
                                        onSalvar={v => atualizarItem(item.id, { unidade_override: v, quantidade: item.quantidade })} />
                                    </td>

                                    {/* Custo unitário */}
                                    <td className="px-3 py-2 text-right">
                                      <CelulaNum valor={item.custo_unitario_efetivo} decimais={2}
                                        onSalvar={v => atualizarItem(item.id, { custo_unitario_override: v, quantidade: item.quantidade })} />
                                    </td>

                                    {/* Quantidade */}
                                    <td className="px-3 py-2 text-right">
                                      <CelulaNum
                                        valor={item.quantidade}
                                        decimais={3}
                                        corStatus={item.quantidade_tipo === 'MANUAL' ? 'manual' : 'auto'}
                                        onSalvar={v => atualizarItem(item.id, { quantidade: v })} />
                                    </td>

                                    {/* Total */}
                                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                                      {fmtBRL(item.custo_total)}
                                    </td>

                                    {/* Ações */}
                                    <td className="px-2 py-2">
                                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          className="p-0.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                          onClick={() => abrirEditItem(item)}
                                          title="Editar item">
                                          <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          className="p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                          onClick={() => removerItem(item.id)}
                                          title="Remover item">
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>

                                  {/* Expansão de insumos */}
                                  {isExpanded && temInsumos && (
                                    <tr className="border-b bg-slate-50/60 dark:bg-slate-900/20">
                                      <td colSpan={8} className="px-4 py-2">
                                        <div className="ml-4 border rounded-lg overflow-hidden">
                                          <table className="w-full text-xs">
                                            <thead>
                                              <tr className="bg-muted/30 border-b">
                                                <th className="text-left px-2.5 py-1.5 text-muted-foreground font-medium">Insumo</th>
                                                <th className="text-left px-2.5 py-1.5 text-muted-foreground font-medium w-20">Tipo</th>
                                                <th className="text-right px-2.5 py-1.5 text-muted-foreground font-medium w-20">Coef.</th>
                                                <th className="text-right px-2.5 py-1.5 text-muted-foreground font-medium w-28">
                                                  Qtd. Adotada
                                                  <span className="ml-1 font-normal text-[9px] text-muted-foreground/60">clique p/ editar</span>
                                                </th>
                                                <th className="text-left px-2.5 py-1.5 text-muted-foreground font-medium w-12">Un.</th>
                                                <th className="text-right px-2.5 py-1.5 text-muted-foreground font-medium w-24">Preço Un.</th>
                                                <th className="text-right px-2.5 py-1.5 text-muted-foreground font-medium w-28">Custo</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {item.insumos.map((ins, ii) => (
                                                <tr key={`${item.id}-ins-${ii}`} className="border-b last:border-0 hover:bg-muted/10">
                                                  <td className="px-2.5 py-1.5 font-medium">{ins.descricao}</td>
                                                  <td className="px-2.5 py-1.5">
                                                    <span className={`inline-flex text-[9px] font-semibold px-1 py-0.5 rounded border ${TIPO_COR[ins.tipo] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                                      {TIPO_LABEL[ins.tipo] || ins.tipo}
                                                    </span>
                                                  </td>
                                                  <td className="px-2.5 py-1.5 text-right tabular-nums text-muted-foreground">
                                                    {ins.coeficiente.toFixed(4)}
                                                  </td>
                                                  <td className="px-2.5 py-1.5 text-right">
                                                    <CelulaNum
                                                      valor={Number((ins.qtd_adotada ?? ins.qtd_calculada).toFixed(4))}
                                                      corStatus={ins.has_override ? 'manual' : 'auto'}
                                                      onSalvar={v => atualizarQtdInsumo(item, ins.insumo_id, v)}
                                                    />
                                                  </td>
                                                  <td className="px-2.5 py-1.5 text-muted-foreground">{ins.unidade}</td>
                                                  <td className="px-2.5 py-1.5 text-right tabular-nums text-muted-foreground">
                                                    {fmtBRL(ins.preco_unitario)}
                                                  </td>
                                                  <td className="px-2.5 py-1.5 text-right tabular-nums font-semibold">
                                                    {fmtBRL(ins.custo_item)}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
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

          {/* Rodapé totais */}
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
        </>
      )}

      {/* ═══ MODAL — ADICIONAR COMPOSIÇÃO ═══════════════════════════════════ */}
      <Dialog open={modalAberto} onOpenChange={v => { if (!v) setModalAberto(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4 text-muted-foreground" /> Adicionar Composição
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-1">
            {/* Etapa */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Etapa</Label>
              <Select value={etapaSelecionada} onValueChange={v => { if (v) setEtapaSelecionada(v); }}>
                <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                <SelectContent className="w-[480px] max-w-[95vw]">
                  {ETAPAS.map(e => (
                    <SelectItem key={e.codigo} value={e.codigo}>
                      {e.descricao} <span className="text-muted-foreground ml-1">({e.codigo})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Composição — busca obrigatória */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Composição <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input
                  placeholder="Digite 2+ letras para buscar composição..."
                  value={compSelecionada ? compSelecionada.descricao : buscaComp}
                  onChange={e => { setBuscaComp(e.target.value); setCompSelecionada(null); }}
                  className={`h-9 pr-8 ${compSelecionada ? 'border-green-500 dark:border-green-600' : ''}`}
                />
                {compSelecionada && (
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => { setCompSelecionada(null); setBuscaComp(''); }}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                {!compSelecionada && composicoes.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 border rounded-lg bg-background shadow-lg max-h-56 overflow-auto">
                    {composicoes.map(comp => (
                      <button key={comp.id} type="button"
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors flex justify-between items-center gap-3 border-b last:border-0"
                        onMouseDown={e => { e.preventDefault(); setCompSelecionada(comp); setBuscaComp(''); setComposicoes([]); }}>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{comp.descricao}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{comp.codigo}</p>
                        </div>
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
                  <span>Base: <strong className="tabular-nums">{fmtBRL(compSelecionada.custo_unitario || 0)}</strong> / {compSelecionada.unidade_producao}</span>
                </div>
              )}
            </div>

            {/* Quantidade */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Quantidade</Label>
              <Input type="number" min="0" step="0.01" value={quantidade}
                onFocus={e => e.target.select()} onChange={e => setQuantidade(e.target.value)} className="h-9" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button onClick={adicionarItem} disabled={adicionando || !compSelecionada}>
              {adicionando
                ? <><RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> Adicionando...</>
                : <><Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ MODAL — ADICIONAR SERVIÇO ══════════════════════════════════════ */}
      <Dialog open={modalServico} onOpenChange={v => { if (!v) setModalServico(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4 text-blue-600" /> Adicionar Serviço
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Agrupe múltiplas composições sob um mesmo serviço (sub-etapa)</p>
          </DialogHeader>
          <div className="grid gap-4 py-1">
            {/* Nome do Serviço + Etapa */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold">Nome do Serviço <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Ex: Fundações, Vigas, Laje..."
                  value={servicoNome}
                  onChange={e => setServicoNome(e.target.value)}
                  className="h-9" />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold">Etapa</Label>
                <Select value={servicoEtapa} onValueChange={v => { if (v) setServicoEtapa(v); }}>
                  <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent className="w-[480px] max-w-[95vw]">
                    {ETAPAS.map(e => (
                      <SelectItem key={e.codigo} value={e.codigo}>
                        {e.descricao} <span className="text-muted-foreground ml-1">({e.codigo})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Lista de composições */}
            <div className="grid gap-2">
              <Label className="text-xs font-semibold">Composições <span className="text-destructive">*</span></Label>
              {servicoComps.map((row, idx) => (
                <div key={row.uid} className="relative flex gap-2 items-start p-3 border rounded-lg bg-muted/10">
                  <span className="text-[10px] font-mono text-muted-foreground/50 mt-2.5 w-4 shrink-0">{idx + 1}.</span>
                  <div className="flex-1 grid gap-1.5">
                    {/* Busca composição */}
                    <div className="relative">
                      <Input
                        placeholder="Buscar composição..."
                        value={row.comp ? row.comp.descricao : row.busca}
                        onChange={e => buscarCompsServico(row.uid, e.target.value)}
                        className={`h-8 text-xs pr-7 ${row.comp ? 'border-green-500' : ''}`}
                      />
                      {row.comp && (
                        <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setServicoComps(prev => prev.map(c => c.uid === row.uid ? { ...c, comp: null, busca: '' } : c))}>
                          <X className="h-3 w-3" />
                        </button>
                      )}
                      {!row.comp && row.resultados.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 border rounded-lg bg-background shadow-lg max-h-44 overflow-auto">
                          {row.resultados.map(comp => (
                            <button key={comp.id} type="button"
                              className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors flex justify-between items-center gap-2 border-b last:border-0"
                              onMouseDown={e => {
                                e.preventDefault();
                                setServicoComps(prev => prev.map(c => c.uid === row.uid ? { ...c, comp, busca: '', resultados: [] } : c));
                              }}>
                              <span className="truncate">{comp.descricao}</span>
                              <span className="text-muted-foreground shrink-0 tabular-nums">{fmtBRL(comp.custo_unitario || 0)}/{comp.unidade_producao}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {row.comp && (
                      <div className="flex items-center justify-between text-[10px] bg-green-50 border border-green-200 rounded px-2 py-1">
                        <span className="font-mono text-muted-foreground">{row.comp.codigo}</span>
                        <span>{fmtBRL(row.comp.custo_unitario || 0)}/{row.comp.unidade_producao}</span>
                      </div>
                    )}
                  </div>
                  {/* Quantidade */}
                  <div className="grid gap-1 w-20 shrink-0">
                    <Label className="text-[10px] text-muted-foreground">Qtd.</Label>
                    <Input
                      type="number" min="0" step="0.01"
                      value={row.quantidade}
                      onFocus={e => e.target.select()}
                      onChange={e => setServicoComps(prev => prev.map(c => c.uid === row.uid ? { ...c, quantidade: e.target.value } : c))}
                      className="h-8 text-xs px-2"
                    />
                  </div>
                  {/* Remover linha */}
                  {servicoComps.length > 1 && (
                    <button
                      className="mt-2 p-0.5 rounded text-muted-foreground/40 hover:text-destructive transition-colors shrink-0"
                      onClick={() => setServicoComps(prev => prev.filter(c => c.uid !== row.uid))}>
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <Button
                type="button" variant="outline" size="sm"
                className="self-start h-7 text-xs gap-1"
                onClick={() => setServicoComps(prev => [...prev, novaServicoComp()])}>
                <Plus className="h-3 w-3" /> Adicionar composição
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalServico(false)}>Cancelar</Button>
            <Button onClick={adicionarServico} disabled={adicionandoServico || !servicoNome.trim() || servicoComps.every(c => !c.comp)}>
              {adicionandoServico
                ? <><RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> Adicionando...</>
                : <><Check className="h-3.5 w-3.5 mr-1.5" /> Adicionar Serviço</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ MODAL — EDITAR ITEM ═════════════════════════════════════════════ */}
      <Dialog open={!!editItem} onOpenChange={v => { if (!v) setEditItem(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Pencil className="h-4 w-4 text-muted-foreground" /> Editar Item
            </DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="grid gap-4 py-1">
              {editItem.composicao && (
                <div className="rounded-lg bg-muted/30 border px-3 py-2 text-xs">
                  <span className="font-mono text-muted-foreground mr-2">{editItem.composicao.codigo}</span>
                  <span className="font-medium">{editItem.composicao.descricao}</span>
                </div>
              )}
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold">Descrição (override)</Label>
                <Input value={editDesc} onChange={e => setEditDesc(e.target.value)}
                  placeholder={editItem.composicao?.descricao || 'Descrição...'} className="h-9" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold">Unidade</Label>
                  <Input value={editUnidade} onChange={e => setEditUnidade(e.target.value)}
                    placeholder={editItem.composicao?.unidade_producao || ''} className="h-9" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold">Custo Unit. (R$)</Label>
                  <Input type="number" min="0" step="0.01" value={editCusto}
                    onChange={e => setEditCusto(e.target.value)} placeholder="Calculado automaticamente" className="h-9" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold">Quantidade</Label>
                  <Input type="number" min="0" step="0.01" value={editQtd}
                    onChange={e => setEditQtd(e.target.value)} className="h-9" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-semibold">Serviço (grupo)</Label>
                  <Input value={editSubEtapa} onChange={e => setEditSubEtapa(e.target.value)}
                    placeholder="Nome do serviço/grupo..." className="h-9" />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancelar</Button>
            <Button onClick={salvarEdicaoItem} disabled={salvandoEdit}>
              {salvandoEdit
                ? <><RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> Salvando...</>
                : <><Check className="h-3.5 w-3.5 mr-1.5" /> Salvar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ MODAL UNIFICADO — EDITAR SERVIÇO + ADICIONAR COMPOSIÇÕES ═════════ */}
      {editorServico && (() => {
        const itensGrupo = orc?.etapas.find(e => e.codigo === editorServico.etapaCodigo)?.itens.filter(i => (i.sub_etapa || '') === editorServico.nome) ?? [];
        const subtotal = itensGrupo.reduce((a, i) => a + i.custo_total, 0);
        const nomeAlterado = editorNome.trim() !== editorServico.nome || editorEtapa !== editorServico.etapaCodigo;
        return (
          <Dialog open onOpenChange={v => { if (!v) setEditorServico(null); }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <Layers className="h-4 w-4 text-blue-600" /> Editar Serviço
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-5 py-1">

                {/* Nome + Etapa */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-semibold">Nome do Serviço</Label>
                    <Input value={editorNome} onChange={e => setEditorNome(e.target.value)}
                      placeholder="Nome do serviço..." className="h-9" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-semibold">Etapa</Label>
                    <Select value={editorEtapa} onValueChange={v => { if (v) setEditorEtapa(v); }}>
                      <SelectTrigger className="h-9">
                        <span className={`flex-1 text-sm text-left truncate ${!editorEtapa ? 'text-muted-foreground' : ''}`}>
                          {editorEtapa ? ETAPAS.find(e => e.codigo === editorEtapa)?.descricao ?? editorEtapa : 'Selecionar...'}
                        </span>
                      </SelectTrigger>
                      <SelectContent className="w-[480px] max-w-[95vw]">
                        {ETAPAS.map(e => <SelectItem key={e.codigo} value={e.codigo}>{e.descricao} ({e.codigo})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {nomeAlterado && (
                  <Button size="sm" variant="outline" className="self-start h-8" onClick={salvarEditorServico} disabled={salvandoNomeServico || !editorNome.trim()}>
                    {salvandoNomeServico ? <><RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />Salvando...</> : <><Check className="h-3.5 w-3.5 mr-1.5" />Salvar nome/etapa</>}
                  </Button>
                )}

                {/* Composições atuais */}
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Composições do serviço ({itensGrupo.length})</Label>
                    <span className="text-xs text-muted-foreground tabular-nums">{fmtBRL(subtotal)}</span>
                  </div>
                  {itensGrupo.length === 0 ? (
                    <div className="border border-dashed rounded-lg py-4 text-center text-xs text-muted-foreground">Nenhuma composição neste serviço</div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead><tr className="bg-muted/30 border-b"><th className="text-left px-3 py-2 text-muted-foreground font-medium">Composição</th><th className="text-center px-2 py-2 w-16 text-muted-foreground font-medium">Un.</th><th className="text-right px-2 py-2 w-20 text-muted-foreground font-medium">Custo U.</th><th className="text-right px-2 py-2 w-16 text-muted-foreground font-medium">Qtd.</th><th className="text-right px-2 py-2 w-24 text-muted-foreground font-medium">Total</th><th className="w-8"></th></tr></thead>
                        <tbody>
                          {itensGrupo.map(item => (
                            <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                              <td className="px-3 py-2">
                                <p className="font-medium leading-tight">{item.descricao_override || item.composicao?.descricao || '—'}</p>
                                {item.composicao && <p className="text-muted-foreground/50 font-mono text-[10px]">{item.composicao.codigo}</p>}
                              </td>
                              <td className="px-2 py-2 text-center text-muted-foreground">{item.unidade_override || item.composicao?.unidade_producao || ''}</td>
                              <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{fmtBRL(item.custo_unitario_efetivo)}</td>
                              <td className="px-2 py-2 text-right tabular-nums font-semibold">{item.quantidade}</td>
                              <td className="px-2 py-2 text-right tabular-nums font-semibold">{fmtBRL(item.custo_total)}</td>
                              <td className="px-1 py-2">
                                <button className="p-0.5 rounded text-muted-foreground/30 hover:text-destructive transition-colors" onClick={() => removerItem(item.id)} title="Remover">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Adicionar nova composição */}
                <div className="grid gap-2 border-t pt-4">
                  <Label className="text-xs font-semibold">Adicionar composição</Label>
                  <div className="flex gap-2 items-start">
                    <div className="flex-1 grid gap-1.5">
                      <div className="relative">
                        <Input placeholder="Digite 2+ letras para buscar..."
                          value={editorCompSel ? editorCompSel.descricao : editorBusca}
                          onChange={e => { setEditorBusca(e.target.value); setEditorCompSel(null); }}
                          className={`h-9 pr-8 ${editorCompSel ? 'border-green-500' : ''}`} />
                        {editorCompSel && (
                          <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            onClick={() => { setEditorCompSel(null); setEditorBusca(''); }}>
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {!editorCompSel && editorResultados.length > 0 && (
                          <div className="absolute top-full left-0 right-0 z-50 mt-1 border rounded-lg bg-background shadow-lg max-h-52 overflow-auto">
                            {editorResultados.map(comp => (
                              <button key={comp.id} type="button"
                                className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors flex justify-between items-center gap-3 border-b last:border-0"
                                onMouseDown={e => { e.preventDefault(); setEditorCompSel(comp); setEditorBusca(''); setEditorResultados([]); }}>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-medium">{comp.descricao}</p>
                                  <p className="text-[11px] text-muted-foreground font-mono">{comp.codigo}</p>
                                </div>
                                <span className="text-muted-foreground text-xs shrink-0 tabular-nums">{fmtBRL(comp.custo_unitario || 0)}/{comp.unidade_producao}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {editorCompSel && (
                        <div className="flex items-center justify-between text-xs bg-green-50 border border-green-200 rounded px-2.5 py-1.5">
                          <span className="font-mono text-muted-foreground">{editorCompSel.codigo}</span>
                          <span>{fmtBRL(editorCompSel.custo_unitario || 0)}/{editorCompSel.unidade_producao}</span>
                        </div>
                      )}
                    </div>
                    <div className="grid gap-1 w-20 shrink-0">
                      <Label className="text-[10px] text-muted-foreground">Qtd.</Label>
                      <Input type="number" min="0" step="0.01" value={editorQtd} onFocus={e => e.target.select()}
                        onChange={e => setEditorQtd(e.target.value)} className="h-9 text-sm px-2" />
                    </div>
                    <Button className="mt-5 shrink-0 h-9" onClick={adicionarNaEdicaoServico}
                      disabled={adicionandoNaEdicao || !editorCompSel}>
                      {adicionandoNaEdicao ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <><Plus className="h-3.5 w-3.5 mr-1" />Add</>}
                    </Button>
                  </div>
                </div>

              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditorServico(null)}>Fechar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* ══ Modal Imprimir / PDF ══════════════════════════════════════════════ */}
      {modalPrint && (
        <Dialog open={modalPrint} onOpenChange={setModalPrint}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Printer className="h-4 w-4" /> Imprimir / Exportar PDF
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-xs text-muted-foreground">Selecione as seções que deseja incluir na impressão:</p>
              {([
                { key: 'planilha',  label: 'Planilha',  desc: 'Orçamento analítico completo por etapas' },
                { key: 'abc',       label: 'Curva ABC',  desc: 'Análise de insumos A/B/C por custo' },
                { key: 'dashboard', label: 'Dashboard',  desc: 'Resumo visual com categorias e etapas' },
              ] as { key: keyof typeof printSecs; label: string; desc: string }[]).map(s => (
                <label key={s.key} className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/40 transition-colors">
                  <input type="checkbox" checked={printSecs[s.key]}
                    onChange={e => setPrintSecs(p => ({ ...p, [s.key]: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 accent-primary" />
                  <div>
                    <p className="text-sm font-medium">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                </label>
              ))}
              {!printSecs.planilha && !printSecs.abc && !printSecs.dashboard && (
                <p className="text-xs text-destructive">Selecione ao menos uma seção.</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModalPrint(false)}>Cancelar</Button>
              <Button
                disabled={!printSecs.planilha && !printSecs.abc && !printSecs.dashboard}
                onClick={() => {
                  document.documentElement.dataset.printPlanilha  = printSecs.planilha  ? '1' : '0';
                  document.documentElement.dataset.printAbc       = printSecs.abc       ? '1' : '0';
                  document.documentElement.dataset.printDashboard = printSecs.dashboard ? '1' : '0';
                  setModalPrint(false);
                  setTimeout(() => window.print(), 200);
                }}>
                <Printer className="h-4 w-4 mr-1.5" /> Gerar PDF / Imprimir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* CSS de impressão */}
      <style>{`
        /* Tela: ocultar área de impressão */
        .print-area { display: none; }

        /* Impressão */
        @media print {
          /* Mostrar só a área de impressão, ocultar tudo mais */
          .print-area { display: block !important; }
          .screen-only { display: none !important; }
          nav, aside, [data-sidebar], .no-print,
          header, [class*="sidebar"], [class*="Sidebar"] { display: none !important; }

          /* Página */
          @page { margin: 1.5cm; size: A4; }

          /* Controle por checkbox */
          html[data-print-planilha='0']  .print-planilha  { display: none !important; }
          html[data-print-abc='0']       .print-abc       { display: none !important; }
          html[data-print-dashboard='0'] .print-dashboard { display: none !important; }

          /* Quebra de página entre seções */
          .print-section { page-break-before: always; }
          .print-section:first-child { page-break-before: auto; }
          .print-section-title {
            font-size: 13pt; font-weight: bold; margin-bottom: 12px;
            color: #1E3A5F; border-bottom: 2px solid #1E3A5F; padding-bottom: 4px;
          }

          /* Limpar visuais */
          * { box-shadow: none !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          button, [role="button"], input, select { display: none !important; }
        }
      `}</style>
    </div>
  );
}
