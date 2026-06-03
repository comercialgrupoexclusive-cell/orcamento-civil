'use client';

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ShoppingCart, CheckCircle2, Clock, Package,
  RefreshCw, ChevronRight, Printer, Download, Building2,
  Check, X, Filter, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

// ── Status helpers ─────────────────────────────────────────────────────────────
const COMPRA_COR: Record<string, string> = {
  pendente:     'bg-red-100 text-red-700 border-red-300',
  pedido_feito: 'bg-blue-100 text-blue-700 border-blue-300',
  parcial:      'bg-amber-100 text-amber-700 border-amber-300',
  comprado:     'bg-green-100 text-green-700 border-green-300',
};
const COMPRA_LABEL: Record<string, string> = {
  pendente: 'Pendente', pedido_feito: 'Pedido Feito', parcial: 'Parcial', comprado: 'Comprado',
};
const STATUS_ORDEM = ['pendente', 'pedido_feito', 'parcial', 'comprado'];

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface Servico {
  id: string; servico_nome: string; unidade: string;
  quantidade: string; status_compra: string; observacao: string;
  composicao_codigo: string; fornecedor_id: string;
}
interface Etapa {
  id: string; etapa_codigo: string; etapa_nome: string;
  status_execucao: string; ordem: string; servicos: Servico[];
}
interface Obra {
  id: string; nome: string; orcamento_id: string;
  etapas: Etapa[]; orcamento: { titulo: string } | null;
}

// ── Célula de status inline ────────────────────────────────────────────────────
function StatusCell({ svc, onChange }: { svc: Servico; onChange: (id: string, status: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${COMPRA_COR[svc.status_compra] || ''}`}>
        {COMPRA_LABEL[svc.status_compra] || svc.status_compra}
      </button>
      {open && (
        <div className="absolute z-50 left-0 top-full mt-1 bg-background border rounded-lg shadow-lg min-w-[130px]">
          {STATUS_ORDEM.map(s => (
            <button
              key={s}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors flex items-center gap-2 ${svc.status_compra === s ? 'font-bold' : ''}`}
              onClick={() => { onChange(svc.id, s); setOpen(false); }}>
              <span className={`inline-block w-2 h-2 rounded-full border ${COMPRA_COR[s]}`} />
              {COMPRA_LABEL[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────
export default function ListaComprasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [obra, setObra] = useState<Obra | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [etapasAbertas, setEtapasAbertas] = useState<Set<string>>(new Set());
  const [atualizando, setAtualizando] = useState<Set<string>>(new Set());
  const [gerando, setGerando] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/obras/${id}`).catch(() => null);
    if (res?.ok) {
      const d = await res.json();
      setObra(d);
      // Abre todas as etapas por padrão
      setEtapasAbertas(new Set(d.etapas.map((e: Etapa) => e.id)));
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

  async function gerarListaInsumos() {
    if (!confirm('Gerar lista de compras a partir dos insumos do orçamento?\nIsso vai substituir a lista atual.')) return;
    setGerando(true);
    try {
      const res = await fetch(`/api/obras/${id}/gerar-lista-insumos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modo: 'replace' }),
      });
      const d = await res.json();
      if (res.ok) { toast.success(d.message); await carregar(); }
      else toast.error(d.error || 'Erro ao gerar lista');
    } finally { setGerando(false); }
  }

  // Atualiza status de um serviço
  async function atualizarStatus(svcId: string, novoStatus: string) {
    setAtualizando(prev => new Set(prev).add(svcId));
    try {
      const res = await fetch(`/api/servicos-etapa/${svcId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status_compra: novoStatus }),
      });
      if (res.ok) {
        setObra(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            etapas: prev.etapas.map(et => ({
              ...et,
              servicos: et.servicos.map(s =>
                s.id === svcId ? { ...s, status_compra: novoStatus } : s
              ),
            })),
          };
        });
        toast.success(`Status → ${COMPRA_LABEL[novoStatus]}`);
      } else toast.error('Erro ao atualizar');
    } finally {
      setAtualizando(prev => { const n = new Set(prev); n.delete(svcId); return n; });
    }
  }

  // Marca todos os itens de uma etapa
  async function marcarEtapa(etapa: Etapa, status: string) {
    const pendentes = etapa.servicos.filter(s => s.status_compra !== status);
    if (pendentes.length === 0) { toast.info('Todos já estão nesse status'); return; }
    await Promise.all(pendentes.map(s => atualizarStatus(s.id, status)));
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <RefreshCw className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
  if (!obra) return (
    <div className="text-center py-20 text-muted-foreground">
      Obra não encontrada. <Link href="/obras" className="text-primary underline">Voltar</Link>
    </div>
  );

  const etapasOrdenadas = [...obra.etapas].sort((a, b) => Number(a.ordem) - Number(b.ordem));

  // Filtra serviços
  const etapasFiltradas = etapasOrdenadas.map(et => ({
    ...et,
    servicos: filtroStatus === 'todos'
      ? et.servicos
      : et.servicos.filter(s => s.status_compra === filtroStatus),
  })).filter(et => et.servicos.length > 0);

  // Totais gerais
  const totalSvcs    = etapasOrdenadas.reduce((a, et) => a + et.servicos.length, 0);
  const comprados    = etapasOrdenadas.reduce((a, et) => a + et.servicos.filter(s => s.status_compra === 'comprado').length, 0);
  const pedidoFeito  = etapasOrdenadas.reduce((a, et) => a + et.servicos.filter(s => s.status_compra === 'pedido_feito').length, 0);
  const pendentes    = etapasOrdenadas.reduce((a, et) => a + et.servicos.filter(s => s.status_compra === 'pendente').length, 0);
  const parcial      = etapasOrdenadas.reduce((a, et) => a + et.servicos.filter(s => s.status_compra === 'parcial').length, 0);
  const pctCompleto  = totalSvcs > 0 ? Math.round((comprados / totalSvcs) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-12">

      {/* Barra de navegação */}
      <div className="flex items-center gap-2 flex-wrap pt-4">
        <Link href={`/obras/${id}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-muted-foreground text-sm">Obras</span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        <Link href={`/obras/${id}`} className="text-sm hover:underline truncate max-w-[160px]">{obra.nome}</Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm font-medium">Lista de Compras</span>
        <div className="ml-auto flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-white"
            onClick={gerarListaInsumos}
            disabled={gerando}
            title="Gera lista de todos os insumos do orçamento vinculado">
            {gerando
              ? <><RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" /> Gerando...</>
              : <><ShoppingCart className="h-3.5 w-3.5 mr-1" /> Gerar lista do orçamento</>}
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5 mr-1" /> Imprimir
          </Button>
        </div>
      </div>

      {/* Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" /> Lista de Compras
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">{obra.nome}</p>
              {obra.orcamento && (
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Orçamento: {obra.orcamento.titulo}
                </p>
              )}
            </div>
            {/* Progress */}
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold text-primary">{pctCompleto}%</p>
              <p className="text-xs text-muted-foreground">{comprados}/{totalSvcs} comprados</p>
            </div>
          </div>

          {/* Barra de progresso */}
          <div className="mt-3 h-2.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-green-500 transition-all duration-500"
              style={{ width: `${pctCompleto}%` }} />
          </div>

          {/* Cards de contagem */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            {[
              { label: 'Pendentes',    count: pendentes,   key: 'pendente',     cor: 'text-red-600' },
              { label: 'Pedido Feito', count: pedidoFeito, key: 'pedido_feito', cor: 'text-blue-600' },
              { label: 'Parcial',      count: parcial,     key: 'parcial',      cor: 'text-amber-600' },
              { label: 'Comprados',    count: comprados,   key: 'comprado',     cor: 'text-green-600' },
            ].map(({ label, count, key, cor }) => (
              <button
                key={key}
                onClick={() => setFiltroStatus(f => f === key ? 'todos' : key)}
                className={`rounded-lg border p-2 text-center transition-all hover:shadow-sm ${filtroStatus === key ? 'ring-2 ring-primary border-primary' : ''}`}>
                <p className={`text-xl font-bold ${cor}`}>{count}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filtro ativo */}
      {filtroStatus !== 'todos' && (
        <div className="flex items-center gap-2 text-sm">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Filtrando:</span>
          <span className={`font-semibold text-xs px-2 py-0.5 rounded border ${COMPRA_COR[filtroStatus]}`}>
            {COMPRA_LABEL[filtroStatus]}
          </span>
          <button onClick={() => setFiltroStatus('todos')} className="text-xs text-muted-foreground hover:text-foreground underline">
            limpar filtro
          </button>
        </div>
      )}

      {/* Estado vazio */}
      {etapasFiltradas.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed rounded-xl text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium">
            {totalSvcs === 0 ? 'Nenhum item na lista de compras' : 'Nenhum item com esse status'}
          </p>
          {totalSvcs === 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs">Para gerar a lista:</p>
              <ol className="text-xs text-left inline-block space-y-1 text-muted-foreground">
                <li>1. Certifique-se que a obra tem um orçamento vinculado</li>
                <li>2. Clique em <strong className="text-amber-600">"Gerar lista do orçamento"</strong> acima</li>
                <li>3. Todos os insumos serão listados automaticamente</li>
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Etapas + itens */}
      <div className="space-y-3 print:space-y-2">
        {etapasFiltradas.map(etapa => {
          const aberta = etapasAbertas.has(etapa.id);
          const compradosEtapa = etapa.servicos.filter(s => s.status_compra === 'comprado').length;
          const totalEtapa     = etapa.servicos.length;
          const tudoComprado   = compradosEtapa === totalEtapa && totalEtapa > 0;

          return (
            <Card key={etapa.id} className={`overflow-hidden print:break-inside-avoid ${tudoComprado ? 'border-green-200' : ''}`}>
              {/* Header da etapa */}
              <div
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors
                  ${tudoComprado ? 'bg-green-50' : 'bg-muted/20'}`}
                onClick={() => setEtapasAbertas(prev => {
                  const n = new Set(prev);
                  if (n.has(etapa.id)) n.delete(etapa.id); else n.add(etapa.id);
                  return n;
                })}>
                <span className="text-xs font-mono text-muted-foreground bg-background border rounded px-1.5 py-0.5 shrink-0">
                  {etapa.etapa_codigo}
                </span>
                <p className="font-semibold text-sm flex-1 min-w-0 truncate">{etapa.etapa_nome}</p>
                <span className={`text-xs font-bold shrink-0 ${tudoComprado ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {compradosEtapa}/{totalEtapa}
                  {tudoComprado && <Check className="inline h-3 w-3 ml-1" />}
                </span>
                {/* Ação rápida "marcar tudo" */}
                {!tudoComprado && (
                  <button
                    className="text-[10px] text-green-600 hover:text-green-800 border border-green-300 rounded px-1.5 py-0.5 hover:bg-green-50 transition-colors shrink-0 print:hidden"
                    onClick={e => { e.stopPropagation(); marcarEtapa(etapa, 'comprado'); }}
                    title="Marcar todos como comprado">
                    ✓ todos
                  </button>
                )}
                {aberta ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
              </div>

              {/* Itens */}
              {aberta && (
                <div className="divide-y">
                  {etapa.servicos.map(svc => (
                    <div key={svc.id}
                      className={`flex items-center gap-3 px-4 py-2.5 group transition-colors
                        ${svc.status_compra === 'comprado' ? 'bg-green-50/40' : 'hover:bg-muted/10'}`}>

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium leading-tight truncate
                          ${svc.status_compra === 'comprado' ? 'line-through text-muted-foreground' : ''}`}>
                          {svc.servico_nome}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {svc.composicao_codigo && (
                            <span className="text-[10px] text-muted-foreground/50 font-mono">
                              {svc.composicao_codigo}
                            </span>
                          )}
                          {svc.observacao && (
                            <span className="text-[10px] text-muted-foreground/70 italic truncate max-w-[180px]">
                              {svc.observacao}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quantidade + Unidade */}
                      {(svc.quantidade && Number(svc.quantidade) > 0) && (
                        <span className="text-xs tabular-nums text-muted-foreground shrink-0">
                          {Number(svc.quantidade).toLocaleString('pt-BR')} {svc.unidade}
                        </span>
                      )}

                      {/* Status (não imprime loading, mostra loading quando atualiza) */}
                      <div className="shrink-0 print:hidden">
                        {atualizando.has(svc.id) ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        ) : (
                          <StatusCell svc={svc} onChange={atualizarStatus} />
                        )}
                      </div>

                      {/* Status estático para impressão */}
                      <div className="hidden print:block shrink-0">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${COMPRA_COR[svc.status_compra]}`}>
                          {COMPRA_LABEL[svc.status_compra]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Rodapé de impressão */}
      <div className="hidden print:block mt-8 pt-4 border-t text-xs text-muted-foreground text-center">
        Lista de Compras — {obra.nome} — gerado em {new Date().toLocaleDateString('pt-BR')}
      </div>

      {/* CSS de impressão */}
      <style>{`
        @media print {
          nav, header, footer, .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          body { font-size: 11px; }
        }
      `}</style>
    </div>
  );
}
