'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ClipboardList, RefreshCw, CheckCircle2, Clock, AlertCircle,
  ChevronDown, ChevronRight, Save, Plus, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// ── Constantes de status ──────────────────────────────────────────────────────
const EXEC_COR: Record<string, string> = {
  nao_iniciado: 'bg-slate-100 text-slate-600 border-slate-200',
  em_andamento: 'bg-amber-100 text-amber-700 border-amber-300',
  concluido:    'bg-green-100 text-green-700 border-green-300',
};
const EXEC_LABEL: Record<string, string> = {
  nao_iniciado: 'Não Iniciado', em_andamento: 'Em Andamento', concluido: 'Concluído',
};
const COMPRA_COR: Record<string, string> = {
  pendente:     'bg-red-100 text-red-700 border-red-200',
  pedido_feito: 'bg-blue-100 text-blue-700 border-blue-200',
  parcial:      'bg-amber-100 text-amber-700 border-amber-200',
  comprado:     'bg-green-100 text-green-700 border-green-200',
};
const COMPRA_LABEL: Record<string, string> = {
  pendente: 'Pendente', pedido_feito: 'Pedido Feito', parcial: 'Parcial', comprado: 'Comprado',
};

interface Servico { id: string; servico_nome: string; unidade: string; quantidade: string; status_compra: string; observacao: string; fornecedor_id: string; composicao_codigo: string; }
interface Etapa { id: string; etapa_codigo: string; etapa_nome: string; status_execucao: string; data_inicio: string; data_fim_prevista: string; data_fim_real: string; ordem: string; servicos: Servico[]; }
interface Fornecedor { id: string; nome: string; }
interface Obra { id: string; nome: string; cidade: string; estado: string; status: string; }

function GerenciamentoContent() {
  const searchParams = useSearchParams();
  const obraIdParam = searchParams.get('obra_id') || '';

  const [obras, setObras] = useState<Obra[]>([]);
  const [obraId, setObraId] = useState(obraIdParam);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  // Carregar obras
  useEffect(() => {
    fetch('/api/obras').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setObras(d.map((o: Obra) => ({ id: o.id, nome: o.nome, cidade: o.cidade, estado: o.estado, status: o.status })));
    }).catch(() => {});
  }, []);

  const carregarEtapas = useCallback(async () => {
    if (!obraId) return;
    setLoading(true);
    const [etRes, fornRes] = await Promise.all([
      fetch(`/api/etapas-obra?obra_id=${obraId}`),
      fetch(`/api/fornecedores?obra_id=${obraId}`),
    ]);
    if (etRes.ok) setEtapas(await etRes.ok ? await etRes.json() : []);
    if (fornRes.ok) setFornecedores(await fornRes.json());
    // Abrir primeira etapa em andamento
    setLoading(false);
  }, [obraId]);

  useEffect(() => { carregarEtapas(); }, [carregarEtapas]);

  // Expandir automaticamente a etapa em andamento
  useEffect(() => {
    if (etapas.length > 0) {
      const next: Record<string, boolean> = {};
      etapas.forEach(e => { if (e.status_execucao === 'em_andamento') next[e.id] = true; });
      setExpandidos(prev => ({ ...prev, ...next }));
    }
  }, [etapas]);

  function toggleExpand(id: string) { setExpandidos(p => ({ ...p, [id]: !p[id] })); }

  async function atualizarEtapa(etapaId: string, patch: Record<string, string>) {
    setSaving(p => ({ ...p, [etapaId]: true }));
    const res = await fetch(`/api/etapas-obra/${etapaId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    });
    if (res.ok) { toast.success('Etapa atualizada'); carregarEtapas(); }
    else toast.error('Erro ao salvar');
    setSaving(p => ({ ...p, [etapaId]: false }));
  }

  async function atualizarServico(svcId: string, patch: Record<string, string>) {
    setSaving(p => ({ ...p, [svcId]: true }));
    const res = await fetch(`/api/servicos-etapa/${svcId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    });
    if (res.ok) { carregarEtapas(); }
    else toast.error('Erro ao salvar');
    setSaving(p => ({ ...p, [svcId]: false }));
  }

  async function adicionarServico(etapa: Etapa) {
    const res = await fetch('/api/servicos-etapa', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ etapa_obra_id: etapa.id, obra_id: obraId, etapa_codigo: etapa.etapa_codigo, servico_nome: 'Novo serviço', unidade: 'un', quantidade: '1', status_compra: 'pendente' }),
    });
    if (res.ok) { toast.success('Serviço adicionado'); carregarEtapas(); }
  }

  async function removerServico(svcId: string) {
    if (!confirm('Remover serviço?')) return;
    await fetch(`/api/servicos-etapa/${svcId}`, { method: 'DELETE' });
    carregarEtapas();
  }

  // Calcular status geral de compra da etapa
  function calcStatusCompraEtapa(svcs: Servico[]): string {
    if (svcs.length === 0) return 'pendente';
    const comp = svcs.filter(s => s.status_compra === 'comprado').length;
    const ped = svcs.filter(s => s.status_compra === 'pedido_feito').length;
    const parc = svcs.filter(s => s.status_compra === 'parcial').length;
    if (comp === svcs.length) return 'comprado';
    if (comp + ped + parc > 0) return 'parcial';
    return 'pendente';
  }

  const obraAtual = obras.find(o => o.id === obraId);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" /> Gerenciamento</h1>
        <div className="flex-1 min-w-48 max-w-sm">
          <Select value={obraId} onValueChange={v => setObraId(v ?? "")}>
            <SelectTrigger className="h-9 text-sm bg-background">
              <SelectValue placeholder="Selecionar obra..." />
            </SelectTrigger>
            <SelectContent>
              {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome} — {o.cidade}/{o.estado}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {obraId && (
          <Button variant="outline" size="sm" onClick={carregarEtapas} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>

      {!obraId && (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
          <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium mb-2">Selecione uma obra acima</p>
          <p className="text-sm">ou <Link href="/obras/novo" className="text-primary underline">cadastre uma nova obra</Link></p>
        </div>
      )}

      {obraId && !loading && etapas.length === 0 && (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
          <p className="font-medium mb-2">Nenhuma etapa cadastrada para esta obra.</p>
          <p className="text-sm">Vincule um orçamento à obra para gerar etapas automaticamente.</p>
          {obraAtual && <Link href={`/obras/${obraAtual.id}`} className="mt-3 inline-block"><Button size="sm" variant="outline">Configurar Obra</Button></Link>}
        </div>
      )}

      {/* Legenda */}
      {obraId && etapas.length > 0 && (
        <>
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="font-semibold text-muted-foreground uppercase tracking-wide">Execução:</span>
            {Object.entries(EXEC_LABEL).map(([k, l]) => <span key={k} className={`px-2 py-0.5 rounded border font-medium ${EXEC_COR[k]}`}>{l}</span>)}
            <span className="font-semibold text-muted-foreground uppercase tracking-wide ml-2">Compras:</span>
            {Object.entries(COMPRA_LABEL).map(([k, l]) => <span key={k} className={`px-2 py-0.5 rounded border font-medium ${COMPRA_COR[k]}`}>{l}</span>)}
          </div>

          {/* Etapas */}
          <div className="space-y-2">
            {etapas.map(etapa => {
              const expanded = !!expandidos[etapa.id];
              const statusCompraEt = calcStatusCompraEtapa(etapa.servicos || []);
              const svcsComp = (etapa.servicos || []).filter(s => s.status_compra === 'comprado').length;

              return (
                <Card key={etapa.id} className={`border-2 transition-all ${expanded ? 'border-primary/20 bg-primary/5' : 'border-border'}`}>
                  <CardContent className="p-0">
                    {/* Header da etapa */}
                    <button onClick={() => toggleExpand(etapa.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 rounded-xl transition-colors">
                      <span className="text-base font-bold text-muted-foreground w-7 shrink-0">{etapa.etapa_codigo}</span>
                      <span className="flex-1 font-semibold text-sm">{etapa.etapa_nome}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Status execução */}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${EXEC_COR[etapa.status_execucao] || ''}`}>
                          {EXEC_LABEL[etapa.status_execucao] || etapa.status_execucao}
                        </span>
                        {/* Status compra geral */}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border hidden sm:inline ${COMPRA_COR[statusCompraEt]}`}>
                          {COMPRA_LABEL[statusCompraEt]}
                        </span>
                        {/* Serviços */}
                        {(etapa.servicos?.length || 0) > 0 && (
                          <span className="text-[10px] text-muted-foreground">{svcsComp}/{etapa.servicos.length} svc</span>
                        )}
                        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </button>

                    {/* Conteúdo expandido */}
                    {expanded && (
                      <div className="border-t px-4 pb-4 pt-3 space-y-3">
                        {/* Status execução inline */}
                        <div className="grid sm:grid-cols-3 gap-3">
                          <div className="grid gap-1">
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Status execução</span>
                            <Select value={etapa.status_execucao} onValueChange={v => atualizarEtapa(etapa.id, { status_execucao: v ?? '' })}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(EXEC_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-1">
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Data início</span>
                            <Input type="date" defaultValue={etapa.data_inicio} className="h-8 text-xs"
                              onBlur={e => { if (e.target.value !== etapa.data_inicio) atualizarEtapa(etapa.id, { data_inicio: e.target.value }); }} />
                          </div>
                          <div className="grid gap-1">
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Previsão término</span>
                            <Input type="date" defaultValue={etapa.data_fim_prevista} className="h-8 text-xs"
                              onBlur={e => { if (e.target.value !== etapa.data_fim_prevista) atualizarEtapa(etapa.id, { data_fim_prevista: e.target.value }); }} />
                          </div>
                        </div>

                        {/* Serviços */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Serviços (status de compra)</span>
                            <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => adicionarServico(etapa)}>
                              <Plus className="h-3 w-3 mr-0.5" /> Serviço
                            </Button>
                          </div>

                          {(!etapa.servicos || etapa.servicos.length === 0) ? (
                            <p className="text-xs text-muted-foreground py-2">Nenhum serviço. Clique em + Serviço para adicionar.</p>
                          ) : (
                            <div className="border rounded-lg overflow-x-auto">
                              <table className="w-full text-xs min-w-[520px]">
                                <thead>
                                  <tr className="bg-muted/30 border-b">
                                    <th className="text-left px-3 py-2 font-medium">Serviço</th>
                                    <th className="text-center px-2 py-2 w-16 font-medium">Qtd</th>
                                    <th className="text-center px-2 py-2 w-8 font-medium">Und</th>
                                    <th className="text-center px-2 py-2 w-32 font-medium">Status Compra</th>
                                    <th className="text-left px-2 py-2 font-medium">Obs.</th>
                                    <th className="w-8"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {etapa.servicos.map(svc => (
                                    <tr key={svc.id} className="border-b last:border-0 hover:bg-muted/10">
                                      <td className="px-3 py-1.5">
                                        <input type="text" defaultValue={svc.servico_nome} className="h-7 text-xs border-0 bg-transparent w-full focus:outline-none focus:ring-1 focus:ring-primary/30 rounded px-1"
                                          onBlur={e => { if (e.target.value !== svc.servico_nome) atualizarServico(svc.id, { servico_nome: e.target.value }); }} />
                                      </td>
                                      <td className="px-2 py-1.5">
                                        <input type="number" defaultValue={svc.quantidade} className="h-7 text-xs border rounded px-2 text-center w-full"
                                          onBlur={e => { if (e.target.value !== svc.quantidade) atualizarServico(svc.id, { quantidade: e.target.value }); }} />
                                      </td>
                                      <td className="px-2 py-1.5 text-center text-muted-foreground">{svc.unidade}</td>
                                      <td className="px-2 py-1.5">
                                        <Select value={svc.status_compra} onValueChange={v => atualizarServico(svc.id, { status_compra: v ?? '' })}>
                                          <SelectTrigger className={`h-7 text-[10px] font-semibold border ${COMPRA_COR[svc.status_compra] || ''}`}>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {Object.entries(COMPRA_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                                          </SelectContent>
                                        </Select>
                                      </td>
                                      <td className="px-2 py-1.5">
                                        <input type="text" defaultValue={svc.observacao} placeholder="Observação..."
                                          className="h-7 text-xs border-0 bg-transparent w-full focus:outline-none focus:ring-1 focus:ring-primary/30 rounded px-1"
                                          onBlur={e => { if (e.target.value !== svc.observacao) atualizarServico(svc.id, { observacao: e.target.value }); }} />
                                      </td>
                                      <td className="px-1 py-1.5">
                                        <button onClick={() => removerServico(svc.id)} className="text-muted-foreground hover:text-destructive">
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
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
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
