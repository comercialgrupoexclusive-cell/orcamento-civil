'use client';

import { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ClipboardList, RefreshCw, ChevronDown, ChevronRight,
  Plus, Trash2, ShoppingCart, Check, X, Filter,
  Package, Layers, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

// ── Constantes ────────────────────────────────────────────────────────────────
const EXEC_COR: Record<string, string> = {
  nao_iniciado: 'bg-slate-100 text-slate-500 border-slate-200',
  em_andamento: 'bg-amber-100 text-amber-700 border-amber-300',
  concluido:    'bg-green-100 text-green-700 border-green-300',
};
const EXEC_LABEL: Record<string, string> = {
  nao_iniciado: 'Não Iniciado',
  em_andamento: 'Em Andamento',
  concluido:    'Concluído',
};
const TIPO_LABEL: Record<string, string> = { M: 'Material', MO: 'Mão de Obra', E: 'Equipamento', S: 'Serviço' };
const TIPO_COR: Record<string, string> = {
  M: 'bg-blue-50 text-blue-600 border-blue-200',
  MO: 'bg-orange-50 text-orange-600 border-orange-200',
  E: 'bg-purple-50 text-purple-600 border-purple-200',
  S: 'bg-gray-50 text-gray-600 border-gray-200',
};

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface InsumoItem {
  insumo_id: string; descricao: string; unidade: string;
  categoria: string; tipo: string; qtd_adotada: number; preco_unitario: number;
}
interface OrcItem {
  id: string; etapa_codigo: string; sub_etapa: string; ordem: number;
  composicao_id: string; descricao: string; unidade: string; quantidade: number;
  status_execucao: string; insumos: InsumoItem[];
}
interface ObraOpt { id: string; nome: string; status: string; orcamento_id: string; }

// ── Helper: calcula status/pct de um grupo de itens ──────────────────────────
function calcStatusGrupo(itens: OrcItem[]) {
  if (itens.length === 0) return { pct: 0, status: 'nao_iniciado' };
  const conc = itens.filter(i => i.status_execucao === 'concluido').length;
  const andam = itens.filter(i => i.status_execucao === 'em_andamento').length;
  const pct = Math.round((conc / itens.length) * 100);
  const status = conc === itens.length ? 'concluido' : (conc + andam > 0 ? 'em_andamento' : 'nao_iniciado');
  return { pct, status };
}

// ── Select Status (sem UUID glitch) ──────────────────────────────────────────
function SelectExec({ value, onChange, size = 'sm' }: { value: string; onChange: (v: string) => void; size?: 'sm'|'xs' }) {
  return (
    <Select value={value} onValueChange={v => { if (v) onChange(v); }}>
      <SelectTrigger className={`${size === 'xs' ? 'h-6 text-[10px] px-1.5' : 'h-7 text-xs px-2'} border font-semibold ${EXEC_COR[value] || ''}`}>
        <span className="flex-1 text-left truncate">{EXEC_LABEL[value] || value}</span>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(EXEC_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

// ── Barra de progresso mini ───────────────────────────────────────────────────
function PctBar({ pct, status }: { pct: number; status: string }) {
  const cor = status === 'concluido' ? 'bg-green-500' : status === 'em_andamento' ? 'bg-amber-500' : 'bg-slate-300';
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${cor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] tabular-nums text-muted-foreground w-7 shrink-0">{pct}%</span>
    </div>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────
function GerenciamentoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const obraIdParam = searchParams.get('obra_id') || '';

  const [obras, setObras] = useState<ObraOpt[]>([]);
  const [obraId, setObraId] = useState(obraIdParam);
  const [itens, setItens] = useState<OrcItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState<Set<string>>(new Set());

  // Expansão em cascata
  const [expEtapas,  setExpEtapas]  = useState<Set<string>>(new Set());
  const [expSubs,    setExpSubs]    = useState<Set<string>>(new Set());
  const [expComps,   setExpComps]   = useState<Set<string>>(new Set());

  // Filtro categoria insumos
  const [filtroCategoria, setFiltroCategoria] = useState('todas');

  // Seleção para lista de compras
  type InsumoSelecionado = { insumo_id: string; descricao: string; unidade: string; qtd: number; composicao_id: string; item_id: string; };
  const [selecionados, setSelecionados] = useState<Map<string, InsumoSelecionado>>(new Map());

  // Modal nova lista
  const [modalLista, setModalLista] = useState(false);
  const [nomeLista, setNomeLista] = useState('');
  const [dataLista, setDataLista] = useState('');
  const [fornecedorLista, setFornecedorLista] = useState('');
  const [fornecedores, setFornecedores] = useState<{ id: string; nome: string; especialidade: string }[]>([]);
  const [criandoLista, setCriandoLista] = useState(false);

  // ── Carrega obras ────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/obras').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setObras(d.map((o: ObraOpt) => ({ id: o.id, nome: o.nome, status: o.status, orcamento_id: o.orcamento_id || '' })));
    }).catch(() => {});
  }, []);

  // ── Carrega fornecedores da obra selecionada ──────────────────────────
  useEffect(() => {
    if (!obraId) { setFornecedores([]); return; }
    fetch(`/api/fornecedores?obra_id=${obraId}`).then(r => r.json()).then(d => {
      if (Array.isArray(d)) setFornecedores(d.map((f: { id: string; nome: string; especialidade: string }) => ({ id: f.id, nome: f.nome, especialidade: f.especialidade || '' })));
    }).catch(() => {});
  }, [obraId]);

  // ── Carrega itens do orçamento ────────────────────────────────────────────
  const carregarItens = useCallback(async () => {
    const obra = obras.find(o => o.id === obraId);
    if (!obra?.orcamento_id) { setItens([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/orcamentos/${obra.orcamento_id}`);
      if (!res.ok) { setItens([]); return; }
      const data = await res.json();
      // data.etapas[].itens[] — flatten
      const flat: OrcItem[] = [];
      for (const et of data.etapas || []) {
        for (const item of et.itens || []) {
          flat.push({
            id: item.id,
            etapa_codigo: item.etapa_codigo,
            sub_etapa: item.sub_etapa || '',
            ordem: item.ordem || 0,
            composicao_id: item.composicao_id,
            descricao: item.descricao_override || item.composicao?.descricao || '',
            unidade: item.unidade_override || item.composicao?.unidade_producao || '',
            quantidade: item.quantidade || 0,
            status_execucao: item.status_execucao || 'nao_iniciado',
            insumos: (item.insumos || []).map((ins: Record<string, unknown>) => ({
              insumo_id: String(ins.insumo_id || ''),
              descricao: String(ins.descricao || ''),
              unidade: String(ins.unidade || ''),
              categoria: String(ins.categoria || ''),
              tipo: String(ins.tipo || 'M'),
              qtd_adotada: Number(ins.qtd_adotada ?? ins.qtd_calculada) || 0,
              preco_unitario: Number(ins.preco_unitario) || 0,
            })),
          });
        }
      }
      flat.sort((a, b) => a.etapa_codigo.localeCompare(b.etapa_codigo) || a.sub_etapa.localeCompare(b.sub_etapa) || a.ordem - b.ordem);
      setItens(flat);
      // Abre etapas automaticamente
      const etapasCodigos = [...new Set(flat.map(i => i.etapa_codigo))];
      setExpEtapas(new Set(etapasCodigos));
    } finally { setLoading(false); }
  }, [obraId, obras]);

  useEffect(() => { carregarItens(); setSelecionados(new Map()); }, [carregarItens]);

  // ── Atualiza status de execução ──────────────────────────────────────────
  const obra = obras.find(o => o.id === obraId);

  async function atualizarStatus(itemId: string, status: string) {
    if (!obra?.orcamento_id) return;
    setSalvando(prev => new Set(prev).add(itemId));
    setItens(prev => prev.map(i => i.id === itemId ? { ...i, status_execucao: status } : i));
    await fetch(`/api/orcamentos/${obra.orcamento_id}/itens/${itemId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status_execucao: status }),
    });
    setSalvando(prev => { const n = new Set(prev); n.delete(itemId); return n; });
    setTimeout(() => carregarItens(), 2000);
  }

  // ── Seleção de insumos ────────────────────────────────────────────────────
  function toggleInsumo(ins: InsumoSelecionado) {
    setSelecionados(prev => {
      const n = new Map(prev);
      if (n.has(ins.insumo_id)) n.delete(ins.insumo_id); else n.set(ins.insumo_id, ins);
      return n;
    });
  }

  function selecionarInsumosDaComp(item: OrcItem) {
    const insFiltrados = filtroCategoria === 'todas' ? item.insumos : item.insumos.filter(i => i.categoria === filtroCategoria);
    const todos = insFiltrados.every(ins => selecionados.has(ins.insumo_id));
    setSelecionados(prev => {
      const n = new Map(prev);
      insFiltrados.forEach(ins => {
        if (todos) n.delete(ins.insumo_id);
        else n.set(ins.insumo_id, { insumo_id: ins.insumo_id, descricao: ins.descricao, unidade: ins.unidade, qtd: ins.qtd_adotada, composicao_id: item.composicao_id, item_id: item.id });
      });
      return n;
    });
  }

  function selecionarInsumosDaSub(itemsDaSub: OrcItem[]) {
    const todosInsumos: InsumoSelecionado[] = [];
    for (const item of itemsDaSub) {
      const insFiltrados = filtroCategoria === 'todas' ? item.insumos : item.insumos.filter(i => i.categoria === filtroCategoria);
      insFiltrados.forEach(ins => todosInsumos.push({ insumo_id: ins.insumo_id, descricao: ins.descricao, unidade: ins.unidade, qtd: ins.qtd_adotada, composicao_id: item.composicao_id, item_id: item.id }));
    }
    const todosJaSel = todosInsumos.every(i => selecionados.has(i.insumo_id));
    setSelecionados(prev => {
      const n = new Map(prev);
      todosInsumos.forEach(i => { if (todosJaSel) n.delete(i.insumo_id); else n.set(i.insumo_id, i); });
      return n;
    });
  }

  // ── Criar lista de compras ────────────────────────────────────────────────
  async function criarLista() {
    if (!nomeLista.trim()) { toast.error('Informe o nome da lista'); return; }
    if (!obraId) { toast.error('Selecione uma obra'); return; }
    setCriandoLista(true);
    try {
      const itensLista = Array.from(selecionados.values()).map(i => ({
        insumo_id: i.insumo_id, descricao: i.descricao, unidade: i.unidade,
        qtd_necessaria: String(i.qtd), composicao_id: i.composicao_id, item_orcamento_id: i.item_id,
        fornecedor_id: '',
      }));
      const res = await fetch('/api/listas-compras', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ obra_id: obraId, orcamento_id: obra?.orcamento_id || '', nome: nomeLista.trim(), data_prevista: dataLista, fornecedor_id: fornecedorLista, itens: itensLista }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error || 'Erro'); return; }
      toast.success(`Lista "${nomeLista}" criada com ${itensLista.length} itens!`, {
        action: { label: 'Ver Compras', onClick: () => router.push(`/compras?obra_id=${obraId}`) },
        duration: 6000,
      });
      setModalLista(false); setNomeLista(''); setDataLista(''); setFornecedorLista(''); setSelecionados(new Map());
    } finally { setCriandoLista(false); }
  }

  // ── Agrupa itens ──────────────────────────────────────────────────────────
  const etapasGrupo = useMemo(() => {
    const map = new Map<string, OrcItem[]>();
    for (const item of itens) {
      if (!map.has(item.etapa_codigo)) map.set(item.etapa_codigo, []);
      map.get(item.etapa_codigo)!.push(item);
    }
    return map;
  }, [itens]);

  // Categorias disponíveis nos insumos dos itens carregados
  const categorias = useMemo(() => {
    const set = new Set<string>();
    itens.forEach(item => item.insumos.forEach(ins => { if (ins.categoria) set.add(ins.categoria); }));
    return ['todas', ...Array.from(set).sort()];
  }, [itens]);

  const nSelecionados = selecionados.size;

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-16">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap pt-1">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" /> Gerenciamento
        </h1>

        {/* Select obra — todas carregadas */}
        <div className="flex-1 min-w-48 max-w-sm">
          <Select value={obraId} onValueChange={v => { if (v) setObraId(v); }}>
            <SelectTrigger className="h-9 text-sm bg-background">
              <span className={`flex-1 text-left truncate text-sm ${!obraId ? 'text-muted-foreground' : ''}`}>
                {obraId ? obras.find(o => o.id === obraId)?.nome || obraId : 'Selecionar obra...'}
              </span>
            </SelectTrigger>
            <SelectContent>
              {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {obraId && (
          <Button variant="outline" size="sm" onClick={carregarItens} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        )}

        {/* Badge carrinho */}
        {nSelecionados > 0 && (
          <button
            onClick={() => setModalLista(true)}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-primary/90 transition-colors ml-auto">
            <ShoppingCart className="h-3.5 w-3.5" />
            {nSelecionados} insumo{nSelecionados !== 1 ? 's' : ''} — Criar lista
          </button>
        )}
      </div>

      {/* ── Filtro categoria ────────────────────────────────────────────── */}
      {itens.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground shrink-0">Categoria:</span>
          {categorias.map(cat => (
            <button key={cat}
              onClick={() => setFiltroCategoria(cat)}
              className={`px-2 py-0.5 rounded border transition-colors ${filtroCategoria === cat ? 'bg-primary/10 border-primary text-primary font-semibold' : 'border-border text-muted-foreground hover:bg-muted'}`}>
              {cat === 'todas' ? 'Todas' : cat}
            </button>
          ))}
        </div>
      )}

      {/* ── Estado vazio ────────────────────────────────────────────────── */}
      {!obraId && (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
          <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium mb-1">Selecione uma obra acima</p>
          <p className="text-sm">Filtre por status para encontrar rapidamente</p>
        </div>
      )}

      {obraId && !loading && itens.length === 0 && (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium mb-1">Nenhum item encontrado</p>
          <p className="text-sm">Vincule um orçamento à obra e importe as etapas</p>
          <Link href={`/obras/${obraId}`}><Button size="sm" variant="outline" className="mt-3">Configurar Obra</Button></Link>
        </div>
      )}

      {/* ── CASCATA ─────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        {Array.from(etapasGrupo.entries()).map(([etapa_codigo, etapaItens]) => {
          const { pct: pctEt, status: statEt } = calcStatusGrupo(etapaItens);
          const expEt = expEtapas.has(etapa_codigo);

          // Agrupa por sub_etapa
          const subMap = new Map<string, OrcItem[]>();
          for (const item of etapaItens) {
            const k = item.sub_etapa || '__avulso__';
            if (!subMap.has(k)) subMap.set(k, []);
            subMap.get(k)!.push(item);
          }

          return (
            <Card key={etapa_codigo} className={`border-2 transition-all ${statEt === 'concluido' ? 'border-green-200' : statEt === 'em_andamento' ? 'border-amber-200' : 'border-border'}`}>
              <CardContent className="p-0">
                {/* Linha da Etapa */}
                <button onClick={() => setExpEtapas(prev => { const n = new Set(prev); if (n.has(etapa_codigo)) n.delete(etapa_codigo); else n.add(etapa_codigo); return n; })}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-muted/30 rounded-xl transition-colors">
                  {expEt ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <span className="text-xs font-mono text-muted-foreground bg-muted border rounded px-1.5 py-0.5 shrink-0">{etapa_codigo}</span>
                  <span className="font-semibold text-sm flex-1 min-w-0 truncate">
                    {etapaItens[0] ? (() => {
                      const ETAPAS_MAP: Record<string, string> = {
                        '01':'Serviços Preliminares','02':'Infraestrutura','03':'Supraestrutura','04':'Paredes e Painéis','05':'Esquadrias',
                        '06':'Vidros','07':'Coberturas','08':'Impermeabilizações','09':'Revestimentos Internos','10':'Forros',
                        '11':'Revestimentos Externos','12':'Pintura','13':'Pisos','14':'Acabamentos','15':'Instalações Elétricas',
                        '16':'Instalações Hidráulicas','17':'Esgoto','18':'Louças e Metais','19':'Complementos','20':'Outros',
                      };
                      return ETAPAS_MAP[etapa_codigo] || `Etapa ${etapa_codigo}`;
                    })() : `Etapa ${etapa_codigo}`}
                  </span>
                  <PctBar pct={pctEt} status={statEt} />
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${EXEC_COR[statEt]}`}>{EXEC_LABEL[statEt]}</span>
                </button>

                {/* Sub-etapas */}
                {expEt && (
                  <div className="border-t">
                    {Array.from(subMap.entries()).map(([sub, subItens]) => {
                      const { pct: pctSub, status: statSub } = calcStatusGrupo(subItens);
                      const isAvulso = sub === '__avulso__';
                      const subKey = `${etapa_codigo}:${sub}`;
                      const expSub = expSubs.has(subKey);

                      return (
                        <div key={sub} className="border-b last:border-0">
                          {/* Linha sub-etapa/grupo */}
                          <div className={`flex items-center gap-2 px-5 py-2 ${isAvulso ? 'bg-transparent' : 'bg-blue-50/40'}`}>
                            <button onClick={() => setExpSubs(prev => { const n = new Set(prev); if (n.has(subKey)) n.delete(subKey); else n.add(subKey); return n; })}
                              className="flex items-center gap-2 flex-1 min-w-0 text-left hover:opacity-80">
                              {expSub ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                              {!isAvulso && <Layers className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                              <span className={`text-sm font-medium truncate ${isAvulso ? 'text-muted-foreground italic text-xs' : 'text-blue-700'}`}>
                                {isAvulso ? 'Composições avulsas' : sub}
                              </span>
                              <span className="text-[10px] text-muted-foreground/60 shrink-0">{subItens.length} comp.</span>
                            </button>
                            {!isAvulso && <PctBar pct={pctSub} status={statSub} />}
                            {/* Checkbox selecionar todos insumos do grupo */}
                            <button
                              onClick={() => selecionarInsumosDaSub(subItens)}
                              className="text-[10px] text-muted-foreground hover:text-primary border rounded px-1.5 py-0.5 transition-colors shrink-0"
                              title="Selecionar insumos deste grupo">
                              🛒 grupo
                            </button>
                          </div>

                          {/* Composições */}
                          {expSub && (
                            <div className="ml-4 border-l-2 border-muted pl-2">
                              {subItens.map(item => {
                                const expComp = expComps.has(item.id);
                                const insFiltrados = filtroCategoria === 'todas' ? item.insumos : item.insumos.filter(i => i.categoria === filtroCategoria);
                                const todosSelComp = insFiltrados.length > 0 && insFiltrados.every(ins => selecionados.has(ins.insumo_id));

                                return (
                                  <div key={item.id} className="border-b border-muted last:border-0">
                                    {/* Linha composição */}
                                    <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/10 group">
                                      <button onClick={() => setExpComps(prev => { const n = new Set(prev); if (n.has(item.id)) n.delete(item.id); else n.add(item.id); return n; })}
                                        className="flex items-center gap-1.5 flex-1 min-w-0 text-left">
                                        {expComp ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
                                        <span className="text-xs truncate">{item.descricao}</span>
                                        <span className="text-[10px] text-muted-foreground shrink-0">{item.quantidade} {item.unidade}</span>
                                      </button>

                                      {/* Status execução */}
                                      <div className="shrink-0 w-28">
                                        {salvando.has(item.id)
                                          ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                                          : <SelectExec value={item.status_execucao} onChange={v => atualizarStatus(item.id, v)} size="xs" />}
                                      </div>

                                      {/* Selecionar insumos desta composição */}
                                      <button
                                        onClick={() => selecionarInsumosDaComp(item)}
                                        className={`text-[10px] border rounded px-1.5 py-0.5 transition-colors shrink-0 ${todosSelComp ? 'bg-primary/10 border-primary text-primary' : 'text-muted-foreground hover:text-primary border-border'}`}
                                        title="Selecionar insumos desta composição">
                                        🛒
                                      </button>
                                    </div>

                                    {/* Insumos */}
                                    {expComp && (
                                      <div className="ml-6 pb-1">
                                        {insFiltrados.length === 0 && (
                                          <p className="text-[10px] text-muted-foreground px-2 py-1">
                                            {item.insumos.length === 0 ? 'Sem insumos' : `Nenhum insumo na categoria "${filtroCategoria}"`}
                                          </p>
                                        )}
                                        {insFiltrados.map(ins => {
                                          const isSel = selecionados.has(ins.insumo_id);
                                          return (
                                            <label key={ins.insumo_id}
                                              className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-muted/20 transition-colors ${isSel ? 'bg-primary/5' : ''}`}>
                                              <input type="checkbox" checked={isSel}
                                                onChange={() => toggleInsumo({ insumo_id: ins.insumo_id, descricao: ins.descricao, unidade: ins.unidade, qtd: ins.qtd_adotada, composicao_id: item.composicao_id, item_id: item.id })}
                                                className="h-3.5 w-3.5 accent-primary shrink-0" />
                                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${TIPO_COR[ins.tipo] || ''}`}>
                                                {ins.tipo}
                                              </span>
                                              <span className="text-xs flex-1 min-w-0 truncate">{ins.descricao}</span>
                                              <span className="text-[10px] tabular-nums text-muted-foreground shrink-0">
                                                {ins.qtd_adotada.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {ins.unidade}
                                              </span>
                                              {ins.categoria && (
                                                <span className="text-[9px] text-muted-foreground/60 shrink-0 hidden sm:inline">{ins.categoria}</span>
                                              )}
                                            </label>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Modal Criar Lista de Compras ─────────────────────────────────── */}
      <Dialog open={modalLista} onOpenChange={v => { if (!v) setModalLista(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" /> Nova Lista de Compras
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-1">
            <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-xs">
              <span className="font-semibold">{nSelecionados}</span> insumo{nSelecionados !== 1 ? 's' : ''} selecionado{nSelecionados !== 1 ? 's' : ''}
              {obra && <span className="text-muted-foreground"> · {obra.nome}</span>}
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Nome da lista <span className="text-destructive">*</span></Label>
              <Input autoFocus value={nomeLista} onChange={e => setNomeLista(e.target.value)} placeholder="Ex: Fundação — semana 12/06" className="h-9" onKeyDown={e => { if (e.key === 'Enter') criarLista(); }} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Data prevista</Label>
              <Input type="date" value={dataLista} onChange={e => setDataLista(e.target.value)} className="h-9" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Fornecedor <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Select value={fornecedorLista || '_none'} onValueChange={v => { if (v) setFornecedorLista(v === '_none' ? '' : v); }}>
                <SelectTrigger className="h-9">
                  <span className={`flex-1 text-left truncate text-sm ${!fornecedorLista ? 'text-muted-foreground' : ''}`}>
                    {fornecedorLista ? fornecedores.find(f => f.id === fornecedorLista)?.nome || fornecedorLista : 'Nenhum fornecedor...'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— Nenhum —</SelectItem>
                  {fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}{f.especialidade ? ` · ${f.especialidade}` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
              {fornecedores.length === 0 && (
                <p className="text-[10px] text-muted-foreground">Adicione fornecedores na obra para selecionar aqui.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalLista(false)}>Cancelar</Button>
            <Button onClick={criarLista} disabled={criandoLista || !nomeLista.trim()}>
              {criandoLista ? <><RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />Criando...</> : <><Check className="h-3.5 w-3.5 mr-1.5" />Criar Lista</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Badge flutuante */}
      {nSelecionados > 0 && !modalLista && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 print:hidden">
          <button onClick={() => setModalLista(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full shadow-xl font-semibold text-sm hover:bg-primary/90 transition-colors">
            <ShoppingCart className="h-4 w-4" />
            {nSelecionados} insumo{nSelecionados !== 1 ? 's' : ''} no carrinho — Criar lista de compras
          </button>
        </div>
      )}
    </div>
  );
}

export default function GerenciamentoPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><RefreshCw className="h-6 w-6 animate-spin text-primary" /></div>}>
      <GerenciamentoContent />
    </Suspense>
  );
}
