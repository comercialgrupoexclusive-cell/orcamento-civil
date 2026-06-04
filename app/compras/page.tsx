'use client';

import { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShoppingCart, Building2, ChevronRight, RefreshCw, Plus,
  Check, X, Trash2, Package, ChevronDown, ChevronUp,
  CheckCircle2, Clock, Truck, Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { toast } from 'sonner';

// ── Constantes ────────────────────────────────────────────────────────────────
const ITEM_STATUS_COR: Record<string, string> = {
  aguardando: 'bg-slate-100 text-slate-600 border-slate-300',
  pedido:     'bg-blue-100 text-blue-700 border-blue-300',
  entregue:   'bg-green-100 text-green-700 border-green-300',
};
const ITEM_STATUS_LABEL: Record<string, string> = {
  aguardando: 'Aguardando', pedido: 'Pedido', entregue: 'Entregue',
};
const LISTA_STATUS_COR: Record<string, string> = {
  aberta:     'bg-amber-100 text-amber-700 border-amber-300',
  concluida:  'bg-green-100 text-green-700 border-green-300',
  cancelada:  'bg-red-100 text-red-600 border-red-200',
};
const LISTA_STATUS_LABEL: Record<string, string> = {
  aberta: 'Aberta', concluida: 'Concluída', cancelada: 'Cancelada',
};

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface ObraOpt { id: string; nome: string; orcamento_id: string; }
interface ItemLista {
  id: string; lista_id: string; obra_id: string; insumo_id: string;
  descricao: string; unidade: string; qtd_necessaria: string;
  status_item: string; composicao_id: string; fornecedor_id: string;
}
interface Lista {
  id: string; obra_id: string; nome: string; data_criacao: string;
  data_prevista: string; status: string; observacao: string;
  fornecedor_id: string;
  total_itens: number; itens_entregues: number;
  itens?: ItemLista[];
}
interface Fornecedor { id: string; nome: string; especialidade: string; }

// ── Select status item ─────────────────────────────────────────────────────
function SelectItemStatus({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={v => { if (v) onChange(v); }}>
      <SelectTrigger className={`h-7 text-[10px] font-semibold border px-1.5 ${ITEM_STATUS_COR[value] || ''}`}>
        <span className="flex-1 text-left truncate">{ITEM_STATUS_LABEL[value] || value}</span>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(ITEM_STATUS_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

// ── Select fornecedor da lista ─────────────────────────────────────────────
function SelectFornecedorLista({ value, onChange, fornecedores }: { value: string; onChange: (v: string) => void; fornecedores: Fornecedor[] }) {
  return (
    <Select value={value || '_none'} onValueChange={v => { if (v) onChange(v === '_none' ? '' : v); }}>
      <SelectTrigger className="h-7 text-xs border px-2 max-w-[180px]">
        <span className={`flex-1 text-left truncate ${!value || value === '_none' ? 'text-muted-foreground' : 'font-medium'}`}>
          {value && value !== '_none' ? fornecedores.find(f => f.id === value)?.nome || value : 'Sem fornecedor'}
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="_none">— Nenhum —</SelectItem>
        {fornecedores.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}{f.especialidade ? ` · ${f.especialidade}` : ''}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────
function ComprasContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const obraIdParam = searchParams.get('obra_id') || '';

  const [obras, setObras] = useState<ObraOpt[]>([]);
  const [obraId, setObraId] = useState(obraIdParam);
  const [listas, setListas] = useState<Lista[]>([]);
  const [filtroStatus, setFiltroStatus] = useState('todas');
  const [loading, setLoading] = useState(false);
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [atualizando, setAtualizando] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/obras').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setObras(d.map((o: ObraOpt) => ({ id: o.id, nome: o.nome, orcamento_id: o.orcamento_id || '' })));
    }).catch(() => {});
  }, []);

  // Carrega fornecedores da obra selecionada
  useEffect(() => {
    if (!obraId) { setFornecedores([]); return; }
    fetch(`/api/fornecedores?obra_id=${obraId}`).then(r => r.json()).then(d => {
      if (Array.isArray(d)) setFornecedores(d.map((f: Fornecedor) => ({ id: f.id, nome: f.nome, especialidade: f.especialidade || '' })));
    }).catch(() => {});
  }, [obraId]);

  const carregarListas = useCallback(async () => {
    if (!obraId) { setListas([]); return; }
    setLoading(true);
    const res = await fetch(`/api/listas-compras?obra_id=${obraId}`).catch(() => null);
    if (res?.ok) setListas(await res.json());
    setLoading(false);
  }, [obraId]);

  useEffect(() => { carregarListas(); }, [carregarListas]);

  const listasFiltradas = useMemo(() =>
    filtroStatus === 'todas' ? listas : listas.filter(l => l.status === filtroStatus),
  [listas, filtroStatus]);

  async function carregarItensLista(listaId: string) {
    const res = await fetch(`/api/listas-compras/${listaId}/itens`).catch(() => null);
    if (!res?.ok) return;
    const itens: ItemLista[] = await res.json();
    setListas(prev => prev.map(l => l.id === listaId ? { ...l, itens } : l));
  }

  function toggleLista(listaId: string) {
    setExpandidas(prev => {
      const n = new Set(prev);
      if (n.has(listaId)) { n.delete(listaId); return n; }
      n.add(listaId);
      // Só busca itens se ainda não vieram inline no carregarListas()
      const lista = listas.find(l => l.id === listaId);
      if (!lista?.itens || lista.itens.length === 0) carregarItensLista(listaId);
      return n;
    });
  }

  async function atualizarItem(listaId: string, itemId: string, patch: Record<string, string>) {
    setAtualizando(prev => new Set(prev).add(itemId));
    // Otimista
    setListas(prev => prev.map(l => l.id === listaId ? {
      ...l, itens: (l.itens || []).map(i => i.id === itemId ? { ...i, ...patch } : i),
    } : l));
    await fetch(`/api/listas-compras/${listaId}/itens/${itemId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    setAtualizando(prev => { const n = new Set(prev); n.delete(itemId); return n; });
    setTimeout(() => carregarItensLista(listaId), 2000);
  }

  async function atualizarLista(listaId: string, patch: Record<string, string>) {
    await fetch(`/api/listas-compras/${listaId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    setListas(prev => prev.map(l => l.id === listaId ? { ...l, ...patch } : l));
    toast.success('Lista atualizada');
  }

  async function excluirLista(listaId: string, nome: string) {
    if (!confirm(`Excluir a lista "${nome}"?`)) return;
    await fetch(`/api/listas-compras/${listaId}`, { method: 'DELETE' });
    setListas(prev => prev.filter(l => l.id !== listaId));
    toast.success('Lista excluída');
  }

  async function marcarTudoEntregue(lista: Lista) {
    if (!lista.itens || lista.itens.length === 0) await carregarItensLista(lista.id);
    const itens = lista.itens || [];
    const naoEntregues = itens.filter(i => i.status_item !== 'entregue');
    if (naoEntregues.length === 0) { toast.info('Todos já entregues'); return; }
    await Promise.all(naoEntregues.map(i => atualizarItem(lista.id, i.id, { status_item: 'entregue' })));
    toast.success('Todos marcados como entregues');
  }

  const totalItens   = listas.reduce((a, l) => a + l.total_itens, 0);
  const totalEntregues = listas.reduce((a, l) => a + l.itens_entregues, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap pt-1">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" /> Compras
        </h1>
        <div className="flex-1 min-w-48 max-w-xs">
          <Select value={obraId} onValueChange={v => { if (v) setObraId(v); }}>
            <SelectTrigger className="h-9 text-sm bg-background">
              <span className={`flex-1 text-left truncate text-sm ${!obraId ? 'text-muted-foreground' : ''}`}>
                {obraId ? obras.find(o => o.id === obraId)?.nome || obraId : 'Selecionar obra...'}
              </span>
            </SelectTrigger>
            <SelectContent>
              {obras.map(o => <SelectItem key={o.id} value={o.id}><Building2 className="h-3 w-3 mr-1.5 inline" />{o.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {obraId && (
          <>
            <Button variant="outline" size="sm" onClick={carregarListas} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Link href={`/gerenciamento?obra_id=${obraId}`}>
              <Button size="sm" className="ml-auto">
                <Plus className="h-3.5 w-3.5 mr-1" /> Nova Lista
              </Button>
            </Link>
          </>
        )}
      </div>

      {/* Resumo geral */}
      {obraId && listas.length > 0 && (
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <span className="text-muted-foreground">{listas.length} lista{listas.length !== 1 ? 's' : ''}</span>
          <span className="text-muted-foreground">{totalItens} itens total</span>
          <span className="flex items-center gap-1 text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> {totalEntregues} entregues
          </span>
          {totalItens > 0 && (
            <div className="flex items-center gap-1.5 flex-1 min-w-24 max-w-48">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${Math.round((totalEntregues/totalItens)*100)}%` }} />
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">{Math.round((totalEntregues/totalItens)*100)}%</span>
            </div>
          )}
        </div>
      )}

      {/* Filtro status */}
      {obraId && listas.length > 0 && (
        <div className="flex gap-1 flex-wrap text-xs">
          {['todas','aberta','concluida','cancelada'].map(s => (
            <button key={s} onClick={() => setFiltroStatus(s)}
              className={`px-2.5 py-1 rounded-full border transition-colors font-medium ${filtroStatus === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted border-border text-muted-foreground'}`}>
              {s === 'todas' ? 'Todas' : LISTA_STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      )}

      {/* Estado vazio */}
      {!obraId && (
        <div className="text-center py-16 border-2 border-dashed rounded-xl text-muted-foreground">
          <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium">Selecione uma obra para ver as listas de compras</p>
        </div>
      )}

      {obraId && !loading && listasFiltradas.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed rounded-xl text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium mb-2">{listas.length === 0 ? 'Nenhuma lista de compras' : 'Nenhuma lista com esse status'}</p>
          {listas.length === 0 && (
            <div className="text-xs space-y-1 mt-2">
              <p>Acesse <strong>Gerenciamento</strong>, selecione os insumos e clique no carrinho.</p>
              <Link href={`/gerenciamento?obra_id=${obraId}`}>
                <Button size="sm" variant="outline" className="mt-2">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Ir para Gerenciamento
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Listas */}
      <div className="space-y-3">
        {listasFiltradas.map(lista => {
          const pct = lista.total_itens > 0 ? Math.round((lista.itens_entregues / lista.total_itens) * 100) : 0;
          const exp = expandidas.has(lista.id);

          return (
            <Card key={lista.id} className={`overflow-hidden ${lista.status === 'concluida' ? 'border-green-200' : ''}`}>
              {/* Header da lista */}
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors"
                onClick={() => toggleLista(lista.id)}>
                {exp ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm truncate">{lista.nome}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${LISTA_STATUS_COR[lista.status] || ''}`}>
                      {LISTA_STATUS_LABEL[lista.status] || lista.status}
                    </span>
                    {lista.fornecedor_id && (
                      <span className="text-[10px] bg-violet-50 border border-violet-200 text-violet-700 px-2 py-0.5 rounded font-medium shrink-0">
                        {fornecedores.find(f => f.id === lista.fornecedor_id)?.nome || lista.fornecedor_id}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[11px] text-muted-foreground">
                      {lista.itens_entregues}/{lista.total_itens} itens
                      {lista.data_prevista && ` · prev. ${new Date(lista.data_prevista+'T00:00:00').toLocaleDateString('pt-BR')}`}
                    </span>
                    <div className="flex items-center gap-1 flex-1 max-w-24">
                      <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground tabular-nums">{pct}%</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                  {/* Fornecedor da lista */}
                  <SelectFornecedorLista
                    value={lista.fornecedor_id || ''}
                    onChange={v => atualizarLista(lista.id, { fornecedor_id: v })}
                    fornecedores={fornecedores}
                  />
                  {/* Status da lista */}
                  <Select value={lista.status} onValueChange={v => { if (v) atualizarLista(lista.id, { status: v }); }}>
                    <SelectTrigger className="h-7 text-[10px] border px-1.5 w-24">
                      <span className="flex-1 text-left truncate">{LISTA_STATUS_LABEL[lista.status] || lista.status}</span>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(LISTA_STATUS_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <button onClick={() => excluirLista(lista.id, lista.nome)}
                    className="p-1 rounded text-muted-foreground/30 hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Itens */}
              {exp && (
                <div className="border-t">
                  {/* Toolbar dos itens */}
                  <div className="flex items-center justify-between px-4 py-2 bg-muted/10 border-b">
                    <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Insumos</span>
                    <button onClick={() => marcarTudoEntregue(lista)}
                      className="text-[10px] text-green-600 hover:text-green-800 border border-green-300 rounded px-2 py-0.5 hover:bg-green-50 transition-colors">
                      ✓ todos entregues
                    </button>
                  </div>

                  {!lista.itens ? (
                    <div className="px-4 py-3 text-center text-xs text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1" />
                    </div>
                  ) : lista.itens.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-muted-foreground">Nenhum item nesta lista.</p>
                  ) : (
                    <div className="divide-y">
                      {lista.itens.map(item => (
                        <div key={item.id} className={`flex items-center gap-2 px-4 py-2.5 hover:bg-muted/10 ${item.status_item === 'entregue' ? 'bg-green-50/40' : ''}`}>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm leading-tight truncate ${item.status_item === 'entregue' ? 'line-through text-muted-foreground' : ''}`}>
                              {item.descricao}
                            </p>
                            <p className="text-[10px] text-muted-foreground tabular-nums">
                              {Number(item.qtd_necessaria).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} {item.unidade}
                            </p>
                          </div>

                          {/* Status item */}
                          <div className="shrink-0 w-24" onClick={e => e.stopPropagation()}>
                            {atualizando.has(item.id)
                              ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                              : <SelectItemStatus value={item.status_item || 'aguardando'} onChange={v => atualizarItem(lista.id, item.id, { status_item: v })} />}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function ComprasPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><RefreshCw className="h-6 w-6 animate-spin text-primary" /></div>}>
      <ComprasContent />
    </Suspense>
  );
}
