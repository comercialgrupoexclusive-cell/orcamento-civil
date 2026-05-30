'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Trash2, RefreshCw, ChevronDown, ChevronRight, X, Check, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import type { Composicao, ItemComposicao, Insumo, TipoInsumo } from '@/lib/types';
import { TIPO_INSUMO_LABEL, UNIDADES_PADRAO } from '@/lib/types';

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtData(iso: string) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }); }
  catch { return '—'; }
}

interface ComposicaoDetalhe extends Composicao {
  itens: (ItemComposicao & { insumo?: Insumo })[];
  data_alteracao?: string;
}

interface NovoItem { insumo: Insumo; coeficiente: number; unidade: string; }

// Busca de insumo com dropdown
function BuscaInsumo({ value, onChange, onSelect, placeholder }: {
  value: string; onChange: (v: string) => void;
  onSelect: (ins: Insumo) => void; placeholder?: string;
}) {
  const [resultados, setResultados] = useState<Insumo[]>([]);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (value.length >= 2) {
      fetch(`/api/insumos?q=${encodeURIComponent(value)}&status=ativo`)
        .then(r => r.json())
        .then(d => setResultados(Array.isArray(d) ? d.slice(0, 20) : []));
    } else setResultados([]);
  }, [value]);

  return (
    <div className="relative">
      <Input value={value} onChange={e => { onChange(e.target.value); setAberto(true); }}
        onFocus={() => setAberto(true)} onBlur={() => setTimeout(() => setAberto(false), 150)}
        placeholder={placeholder || 'Buscar insumo...'} className="h-8 text-sm" />
      {aberto && resultados.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 border rounded-lg bg-background shadow-lg mt-1 max-h-48 overflow-auto">
          {resultados.map(ins => (
            <button key={ins.id} type="button"
              className="w-full text-left px-3 py-2 hover:bg-accent"
              onMouseDown={e => { e.preventDefault(); onSelect(ins); setAberto(false); }}>
              <span className="block text-sm font-medium truncate">{ins.descricao}</span>
              <span className="block text-xs text-muted-foreground">{fmtBRL(ins.preco)} · {ins.codigo}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Célula inline editável genérica
function CelulaInline({ valor, onSalvar, className = '', placeholder = '' }: {
  valor: string; onSalvar: (v: string) => Promise<void>; className?: string; placeholder?: string;
}) {
  const [ed, setEd] = useState(false);
  const [val, setVal] = useState(valor);
  async function salvar() {
    if (val === valor) { setEd(false); return; }
    await onSalvar(val); setEd(false);
  }
  if (ed) return (
    <div className="flex items-center gap-1">
      <Input autoFocus value={val} onFocus={e => e.target.select()}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') salvar(); if (e.key === 'Escape') { setVal(valor); setEd(false); } }}
        className={`h-7 px-2 text-sm border-2 border-primary bg-background ${className}`} />
      <button className="text-green-600 p-0.5" onClick={salvar}><Check className="h-3 w-3" /></button>
      <button className="text-muted-foreground p-0.5" onClick={() => { setVal(valor); setEd(false); }}><X className="h-3 w-3" /></button>
    </div>
  );
  return (
    <span className={`cursor-pointer hover:bg-primary/10 hover:ring-1 hover:ring-primary/30 rounded px-1 -mx-1 transition-colors ${className}`}
      onClick={() => { setVal(valor); setEd(true); }}>
      {valor || <span className="italic text-muted-foreground/40 text-xs">{placeholder || '—'}</span>}
    </span>
  );
}

// Painel accordion expandido
function PainelAccordion({ composicao, onAtualizar }: {
  composicao: ComposicaoDetalhe; onAtualizar: () => void;
}) {
  const [buscaTexto, setBuscaTexto] = useState('');
  const [insumoSel, setInsumoSel] = useState<Insumo | null>(null);
  const [coef, setCoef] = useState('1');
  const [unidade, setUnidade] = useState('');
  const [adicionando, setAdicionando] = useState(false);
  // Calculadora de coeficiente
  const [qtdSimulada, setQtdSimulada] = useState('1');
  // Edição inline de dados da composição
  const [editandoComp, setEditandoComp] = useState(false);
  const [compForm, setCompForm] = useState({
    descricao: composicao.descricao,
    unidade_producao: composicao.unidade_producao,
    descricao_tecnica: composicao.descricao_tecnica || '',
  });
  const [salvandoComp, setSalvandoComp] = useState(false);
  // Troca de insumo em item existente
  const [trocandoInsumoId, setTrocandoInsumoId] = useState<string | null>(null);
  const [buscaTroca, setBuscaTroca] = useState('');

  const breakdown = composicao.itens.reduce((acc, i) => {
    const t = (i.insumo?.tipo || 'M') as TipoInsumo;
    acc[t] = (acc[t] || 0) + (i.custo_total || 0);
    return acc;
  }, {} as Record<TipoInsumo, number>);
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);

  async function salvarComposicao() {
    setSalvandoComp(true);
    try {
      const res = await fetch(`/api/composicoes/${composicao.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...compForm, producao: composicao.producao }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.erros?.join(', ') || d.error); return; }
      toast.success('Composição atualizada');
      setEditandoComp(false);
      onAtualizar();
    } finally { setSalvandoComp(false); }
  }

  async function adicionar() {
    if (!insumoSel) { toast.error('Selecione um insumo'); return; }
    setAdicionando(true);
    try {
      const res = await fetch(`/api/composicoes/${composicao.id}/itens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insumo_id: insumoSel.id, coeficiente: Number(coef) || 1, unidade: unidade || insumoSel.unidade }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.erros?.join(', ') || d.error); return; }
      toast.success('Item adicionado');
      setInsumoSel(null); setBuscaTexto(''); setCoef('1'); setUnidade('');
      onAtualizar();
    } finally { setAdicionando(false); }
  }

  async function removerItem(itemId: string) {
    const res = await fetch(`/api/composicoes/${composicao.id}/itens/${itemId}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Removido'); onAtualizar(); }
    else toast.error('Erro ao remover');
  }

  async function atualizarCoeficiente(itemId: string, novoCoef: number) {
    const item = composicao.itens.find(i => i.id === itemId);
    if (!item) return;
    const res = await fetch(`/api/composicoes/${composicao.id}/itens/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coeficiente: novoCoef, unidade: item.unidade }),
    });
    if (res.ok) { onAtualizar(); } else toast.error('Erro ao atualizar coeficiente');
  }

  async function trocarInsumo(itemId: string, novoInsumo: Insumo) {
    const item = composicao.itens.find(i => i.id === itemId);
    if (!item) return;
    const res = await fetch(`/api/composicoes/${composicao.id}/itens/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ insumo_id: novoInsumo.id, coeficiente: item.coeficiente, unidade: novoInsumo.unidade }),
    });
    if (res.ok) { setTrocandoInsumoId(null); setBuscaTroca(''); toast.success('Insumo trocado'); onAtualizar(); }
    else toast.error('Erro ao trocar insumo');
  }

  return (
    <div className="py-4 px-4 border-t bg-gradient-to-b from-muted/10 to-transparent">
      {/* Editar dados da composição */}
      <div className="mb-4 flex items-start gap-3 flex-wrap">
        {editandoComp ? (
          <div className="flex-1 border rounded-xl p-4 bg-background shadow-sm space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Editar Composição</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Descrição</Label>
                <Input value={compForm.descricao} onChange={e => setCompForm(f => ({ ...f, descricao: e.target.value }))}
                  className="h-8 text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs">Descrição Técnica</Label>
                <Input value={compForm.descricao_tecnica} onChange={e => setCompForm(f => ({ ...f, descricao_tecnica: e.target.value }))}
                  className="h-8 text-sm mt-1" placeholder="Especificações..." />
              </div>
              <div>
                <Label className="text-xs">Unidade de Produção</Label>
                <div className="relative mt-1">
                  <Input value={compForm.unidade_producao} onChange={e => setCompForm(f => ({ ...f, unidade_producao: e.target.value }))}
                    className="h-8 text-sm" list="unidades-prod" />
                  <datalist id="unidades-prod">{UNIDADES_PADRAO.map(u => <option key={u} value={u} />)}</datalist>
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={salvarComposicao} disabled={salvandoComp}>
                <Check className="h-3.5 w-3.5 mr-1" />{salvandoComp ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditandoComp(false); setCompForm({ descricao: composicao.descricao, unidade_producao: composicao.unidade_producao, descricao_tecnica: composicao.descricao_tecnica || '' }); }}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-sm">
              <span className="font-medium">{composicao.descricao}</span>
              {composicao.descricao_tecnica && <span className="text-muted-foreground ml-2 text-xs">· {composicao.descricao_tecnica}</span>}
              <span className="text-muted-foreground ml-2 text-xs">· {composicao.unidade_producao}</span>
              {composicao.data_alteracao && <span className="text-muted-foreground ml-2 text-xs">· alt. {fmtData(composicao.data_alteracao)}</span>}
            </div>
            <button onClick={() => setEditandoComp(true)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 hover:bg-muted rounded px-2 py-1 transition-colors">
              <Pencil className="h-3 w-3" /> Editar dados
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Tabela de itens */}
        <div className="xl:col-span-2 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Itens ({composicao.itens.length})
          </p>

          {composicao.itens.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-xl">
              Nenhum item — adicione insumos ao lado →
            </p>
          ) : (
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/60 border-b">
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Insumo</th>
                    <th className="text-center px-2 py-2 font-semibold text-muted-foreground w-14">Tipo</th>
                    <th className="text-right px-2 py-2 font-semibold text-muted-foreground w-20">Coef.</th>
                    {qtdSimulada && <th className="text-right px-2 py-2 font-semibold text-blue-600 w-20">× Qtd</th>}
                    <th className="text-right px-2 py-2 font-semibold text-muted-foreground w-20">Preço Un.</th>
                    <th className="text-right px-2 py-2 font-semibold text-muted-foreground w-24">Total</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {composicao.itens.map(item => (
                    <React.Fragment key={item.id}>
                      <tr className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-3 py-2">
                          {trocandoInsumoId === item.id ? (
                            <BuscaInsumo value={buscaTroca} onChange={setBuscaTroca}
                              onSelect={ins => trocarInsumo(item.id, ins)} placeholder="Buscar novo insumo..." />
                          ) : (
                            <div>
                              <button className="font-medium text-left hover:text-primary hover:underline transition-colors"
                                onClick={() => { setTrocandoInsumoId(item.id); setBuscaTroca(item.insumo?.descricao || ''); }}
                                title="Clique para trocar o insumo">
                                {item.insumo?.descricao || item.insumo_id}
                              </button>
                              <p className="text-muted-foreground">{item.insumo?.codigo} · {item.unidade}</p>
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold
                            ${item.insumo?.tipo === 'M' ? 'bg-blue-100 text-blue-700' :
                              item.insumo?.tipo === 'MO' ? 'bg-orange-100 text-orange-700' :
                              item.insumo?.tipo === 'E' ? 'bg-purple-100 text-purple-700' :
                              'bg-gray-100 text-gray-600'}`}>
                            {item.insumo?.tipo || '?'}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-right">
                          {/* Coeficiente editável inline */}
                          <CoeficienteInline
                            valor={item.coeficiente}
                            onSalvar={v => atualizarCoeficiente(item.id, v)}
                          />
                        </td>
                        {qtdSimulada && (
                          <td className="px-2 py-2 text-right tabular-nums text-blue-600 font-medium">
                            {(item.coeficiente * (Number(qtdSimulada) || 0)).toFixed(3)}
                          </td>
                        )}
                        <td className="px-2 py-2 text-right tabular-nums">{fmtBRL(item.insumo?.preco || 0)}</td>
                        <td className="px-2 py-2 text-right tabular-nums font-semibold">{fmtBRL(item.custo_total || 0)}</td>
                        <td className="px-1 py-2">
                          <button className="text-muted-foreground hover:text-destructive transition-colors p-0.5 rounded"
                            onClick={() => removerItem(item.id)}>
                            <X className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Calculadora simulada */}
          <div className="border rounded-xl p-3 bg-blue-50/50 border-blue-200">
            <p className="text-xs font-semibold text-blue-700 mb-2">🧮 Calculadora de Coeficiente</p>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-blue-700 whitespace-nowrap">Quantidade simulada:</Label>
                <Input type="number" min="0" step="0.001" value={qtdSimulada}
                  onFocus={e => e.target.select()}
                  onChange={e => setQtdSimulada(e.target.value)}
                  placeholder="0"
                  className="h-7 w-24 text-xs border-blue-300 bg-white" />
              </div>
              {qtdSimulada && Number(qtdSimulada) > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {composicao.itens.map(item => (
                    <span key={item.id} className="text-xs bg-blue-100 text-blue-700 rounded px-2 py-0.5">
                      {item.insumo?.descricao?.split(' ')[0]}: <strong>{(item.coeficiente * Number(qtdSimulada)).toFixed(3)}</strong> {item.unidade}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <p className="text-[10px] text-blue-600/70 mt-1.5">Preencha para ver coef × qtd em cada item. Não é salvo.</p>
          </div>

          {/* Breakdown por tipo */}
          {total > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {(['M', 'MO', 'E'] as TipoInsumo[]).map(t => (
                <div key={t} className={`rounded-xl p-2.5 text-xs border
                  ${t === 'M' ? 'bg-blue-50 border-blue-200' :
                    t === 'MO' ? 'bg-orange-50 border-orange-200' :
                    'bg-purple-50 border-purple-200'}`}>
                  <p className="text-muted-foreground font-medium">{TIPO_INSUMO_LABEL[t]}</p>
                  <p className="font-bold tabular-nums">{fmtBRL(breakdown[t] || 0)}</p>
                  <p className="text-muted-foreground">{total > 0 ? Math.round(((breakdown[t] || 0) / total) * 100) : 0}%</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Painel adicionar item */}
        <div className="border rounded-xl p-3 bg-muted/10 h-fit">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            + Adicionar Item
          </p>
          <div className="space-y-2.5">
            <div>
              <Label className="text-xs mb-1 block">Insumo</Label>
              {insumoSel ? (
                <div className="flex items-center gap-1 border rounded-lg px-2 py-1.5 bg-background text-sm">
                  <span className="flex-1 truncate text-sm">{insumoSel.descricao}</span>
                  <button onClick={() => { setInsumoSel(null); setBuscaTexto(''); }} className="text-muted-foreground hover:text-foreground shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <BuscaInsumo value={buscaTexto} onChange={setBuscaTexto}
                  onSelect={ins => { setInsumoSel(ins); setBuscaTexto(ins.descricao); setUnidade(ins.unidade); }}
                  placeholder="Digitar para buscar..." />
              )}
            </div>

            {insumoSel && (
              <div className="text-xs rounded-lg border px-2 py-1.5 bg-background flex items-center justify-between gap-2">
                <span className={`font-bold px-1.5 py-0.5 rounded ${insumoSel.tipo === 'M' ? 'bg-blue-100 text-blue-700' : insumoSel.tipo === 'MO' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'}`}>
                  {insumoSel.tipo}
                </span>
                <span className="flex-1 truncate">{insumoSel.unidade}</span>
                <span className="font-semibold tabular-nums">{fmtBRL(insumoSel.preco)}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs mb-1 block">Coeficiente</Label>
                <Input type="number" min="0" step="0.001" value={coef}
                  onFocus={e => e.target.select()} onChange={e => setCoef(e.target.value)}
                  className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Unidade</Label>
                <Input value={unidade} onChange={e => setUnidade(e.target.value)}
                  className="h-8 text-sm" placeholder="un, m², kg..." />
              </div>
            </div>

            {insumoSel && (
              <div className="text-xs rounded-lg border px-2 py-1.5 bg-background">
                <span className="text-muted-foreground">{fmtBRL(insumoSel.preco)} × {Number(coef) || 0} = </span>
                <span className="font-bold">{fmtBRL(insumoSel.preco * (Number(coef) || 0))}</span>
              </div>
            )}

            <Button size="sm" className="w-full" onClick={adicionar} disabled={adicionando || !insumoSel}>
              {adicionando ? 'Adicionando...' : <><Plus className="h-3.5 w-3.5 mr-1" /> Adicionar</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Coeficiente editável inline na tabela
function CoeficienteInline({ valor, onSalvar }: { valor: number; onSalvar: (v: number) => void }) {
  const [ed, setEd] = useState(false);
  const [val, setVal] = useState(String(valor));
  async function salvar() {
    const num = Number(val);
    if (isNaN(num) || num === valor) { setEd(false); return; }
    await onSalvar(num); setEd(false);
  }
  if (ed) return (
    <div className="flex items-center gap-0.5 justify-end">
      <Input autoFocus type="number" min="0" step="0.001" value={val} onFocus={e => e.target.select()}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') salvar(); if (e.key === 'Escape') { setVal(String(valor)); setEd(false); } }}
        className="h-6 w-20 px-1 text-xs border-2 border-primary text-right" />
      <button className="text-green-600 p-0.5" onClick={salvar}><Check className="h-3 w-3" /></button>
      <button className="text-muted-foreground p-0.5" onClick={() => { setVal(String(valor)); setEd(false); }}><X className="h-3 w-3" /></button>
    </div>
  );
  return (
    <span className="cursor-pointer tabular-nums hover:bg-primary/10 hover:ring-1 hover:ring-primary/30 rounded px-1 -mx-1 transition-colors"
      title="Clique para editar coeficiente" onClick={() => { setVal(String(valor)); setEd(true); }}>
      {valor}
    </span>
  );
}

// Dialog de nova composição
function DialogNovaComposicao({ aberto, onFechar, onCriada }: {
  aberto: boolean; onFechar: () => void; onCriada: () => void;
}) {
  const [form, setForm] = useState({ descricao: '', unidade_producao: '', producao: '1', descricao_tecnica: '' });
  const [novosItens, setNovosItens] = useState<NovoItem[]>([]);
  const [buscaTexto, setBuscaTexto] = useState('');
  const [insumoSel, setInsumoSel] = useState<Insumo | null>(null);
  const [coef, setCoef] = useState('1');
  const [unidade, setUnidade] = useState('');
  const [qtdSimulada, setQtdSimulada] = useState('1');
  const [salvando, setSalvando] = useState(false);
  const [itemAdicionado, setItemAdicionado] = useState(false);

  function reset() {
    setForm({ descricao: '', unidade_producao: '', producao: '1', descricao_tecnica: '' });
    setNovosItens([]); setBuscaTexto(''); setInsumoSel(null); setCoef('1'); setUnidade(''); setQtdSimulada('1'); setItemAdicionado(false);
  }

  function adicionarItem() {
    if (!insumoSel) { toast.error('Busque e selecione um insumo na lista'); return; }
    const coefNum = Number(coef);
    if (!coefNum || coefNum <= 0) { toast.error('Coeficiente inválido'); return; }
    // Verifica duplicata
    if (novosItens.some(i => i.insumo.id === insumoSel.id)) {
      toast.warning('Este insumo já foi adicionado');
      return;
    }
    setNovosItens(p => [...p, { insumo: insumoSel, coeficiente: coefNum, unidade: unidade || insumoSel.unidade }]);
    setInsumoSel(null); setBuscaTexto(''); setCoef('1'); setUnidade('');
    setItemAdicionado(true);
    setTimeout(() => setItemAdicionado(false), 2000);
  }

  const breakdown = novosItens.reduce((acc, item) => {
    const t = item.insumo.tipo;
    acc[t] = (acc[t] || 0) + item.insumo.preco * item.coeficiente;
    return acc;
  }, {} as Record<TipoInsumo, number>);
  const totalCusto = Object.values(breakdown).reduce((a, b) => a + b, 0);

  async function criar() {
    if (!form.descricao.trim()) { toast.error('Descrição é obrigatória'); return; }
    if (!form.unidade_producao.trim()) { toast.error('Unidade de produção é obrigatória'); return; }
    setSalvando(true);
    try {
      const res = await fetch('/api/composicoes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, producao: Number(form.producao) || 1 }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.erros?.join(', ') || data.error); return; }
      for (const item of novosItens) {
        await fetch(`/api/composicoes/${data.id}/itens`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ insumo_id: item.insumo.id, coeficiente: item.coeficiente, unidade: item.unidade }),
        });
      }
      toast.success(`Composição ${data.codigo} criada com ${novosItens.length} item(s)`);
      reset(); onFechar(); onCriada();
    } finally { setSalvando(false); }
  }

  return (
    <Dialog open={aberto} onOpenChange={v => { if (!v) { reset(); onFechar(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova Composição</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Descrição *</Label>
            <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              placeholder="Ex: Concreto Fck 25 MPa, Revestimento Cerâmico..." />
          </div>
          <div className="grid gap-1.5">
            <Label>Descrição Técnica</Label>
            <Input value={form.descricao_tecnica} onChange={e => setForm(f => ({ ...f, descricao_tecnica: e.target.value }))}
              placeholder="Especificações, normas, referências..." />
          </div>

          <hr />
          {/* Adicionar insumos */}
          <div>
            <p className="text-sm font-semibold mb-3">Insumos da Composição</p>
            <div className="space-y-2">
              <div>
                <Label className="text-xs mb-1 block">Insumo</Label>
                {insumoSel ? (
                  <div className="flex items-center gap-1 border rounded-lg px-2 py-1.5 bg-background text-sm h-9">
                    <span className="flex-1 truncate">{insumoSel.descricao}</span>
                    <button onClick={() => { setInsumoSel(null); setBuscaTexto(''); }} className="text-muted-foreground hover:text-foreground shrink-0">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <BuscaInsumo value={buscaTexto} onChange={setBuscaTexto}
                    onSelect={ins => { setInsumoSel(ins); setBuscaTexto(ins.descricao); setUnidade(ins.unidade); }}
                    placeholder="Buscar insumo..." />
                )}
              </div>
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                <div>
                  <Label className="text-xs mb-1 block">Coeficiente</Label>
                  <Input type="number" min="0" step="0.001" value={coef}
                    onFocus={e => e.target.select()} onChange={e => setCoef(e.target.value)}
                    className="h-8 text-sm" placeholder="1" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Unidade</Label>
                  <Input value={unidade} onChange={e => setUnidade(e.target.value)} className="h-8 text-sm" placeholder="un" />
                </div>
                <Button
                  size="sm" type="button" onClick={adicionarItem}
                  className={`h-8 transition-colors ${itemAdicionado ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                  title={!insumoSel ? 'Selecione um insumo primeiro' : 'Adicionar à lista'}>
                  {itemAdicionado ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            {insumoSel && (
              <p className="text-xs text-muted-foreground mt-1.5 ml-1">
                {fmtBRL(insumoSel.preco)} × {Number(coef) || 0} = <span className="font-medium text-foreground">{fmtBRL(insumoSel.preco * (Number(coef) || 0))}</span>
              </p>
            )}

            {/* Calculadora no dialog */}
            {novosItens.length > 0 && (
              <div className="mt-3 border rounded-xl p-3 bg-blue-50/50 border-blue-200">
                <div className="flex items-center gap-2 flex-wrap">
                  <Label className="text-xs text-blue-700">Qtd simulada:</Label>
                  <Input type="number" min="0" step="0.001" value={qtdSimulada} onFocus={e => e.target.select()}
                    onChange={e => setQtdSimulada(e.target.value)} placeholder="0"
                    className="h-7 w-24 text-xs border-blue-300 bg-white" />
                  {qtdSimulada && Number(qtdSimulada) > 0 && novosItens.map((item, i) => (
                    <span key={i} className="text-xs bg-blue-100 text-blue-700 rounded px-2 py-0.5">
                      {item.insumo.descricao.split(' ')[0]}: <strong>{(item.coeficiente * Number(qtdSimulada)).toFixed(3)}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {novosItens.length > 0 && (
              <div className="mt-3 border rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/60 border-b">
                      <th className="text-left px-2 py-1.5 font-semibold text-muted-foreground">Insumo</th>
                      <th className="text-center px-2 py-1.5 font-semibold text-muted-foreground w-14">Tipo</th>
                      <th className="text-right px-2 py-1.5 font-semibold text-muted-foreground w-20">Coef.</th>
                      <th className="text-right px-2 py-1.5 font-semibold text-muted-foreground w-20">Preço</th>
                      <th className="text-right px-2 py-1.5 font-semibold text-muted-foreground w-24">Custo</th>
                      <th className="w-7"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {novosItens.map((item, idx) => (
                      <tr key={idx} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-2 py-1.5"><p className="font-medium">{item.insumo.descricao}</p><p className="text-muted-foreground">{item.unidade}</p></td>
                        <td className="px-2 py-1.5 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${item.insumo.tipo === 'M' ? 'bg-blue-100 text-blue-700' : item.insumo.tipo === 'MO' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'}`}>{item.insumo.tipo}</span>
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{item.coeficiente}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{fmtBRL(item.insumo.preco)}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums font-semibold">{fmtBRL(item.insumo.preco * item.coeficiente)}</td>
                        <td className="px-1 py-1.5">
                          <button onClick={() => setNovosItens(p => p.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalCusto > 0 && (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['M', 'MO', 'E'] as TipoInsumo[]).map(t => (
                  <div key={t} className={`rounded-xl p-2 text-xs border ${t === 'M' ? 'bg-blue-50 border-blue-200' : t === 'MO' ? 'bg-orange-50 border-orange-200' : 'bg-purple-50 border-purple-200'}`}>
                    <p className="text-muted-foreground">{TIPO_INSUMO_LABEL[t]}</p>
                    <p className="font-bold tabular-nums">{fmtBRL(breakdown[t] || 0)}</p>
                  </div>
                ))}
                <div className="rounded-xl p-2 text-xs border bg-muted/50">
                  <p className="text-muted-foreground font-semibold">Total</p>
                  <p className="font-bold tabular-nums">{fmtBRL(totalCusto)}</p>
                </div>
              </div>
            )}
          </div>

          <hr />
          {/* Dados secundários no final */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Unidade de Produção *</Label>
              <div className="relative">
                <Input value={form.unidade_producao} onChange={e => setForm(f => ({ ...f, unidade_producao: e.target.value }))}
                  placeholder="m³, m², kg..." list="unidades-producao-dlg" />
                <datalist id="unidades-producao-dlg">{UNIDADES_PADRAO.map(u => <option key={u} value={u} />)}</datalist>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Produção (por unidade)</Label>
              <Input type="number" min="0" step="0.001" value={form.producao}
                onFocus={e => e.target.select()} onChange={e => setForm(f => ({ ...f, producao: e.target.value }))} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onFechar(); }}>Cancelar</Button>
          <Button onClick={criar} disabled={salvando}>
            {salvando ? 'Salvando...' : `Criar${novosItens.length > 0 ? ` (${novosItens.length} item${novosItens.length > 1 ? 's' : ''})` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ComposicoesPage() {
  const [composicoes, setComposicoes] = useState<Composicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('ativo');
  const [modalAberto, setModalAberto] = useState(false);
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [expandidoDetalhe, setExpandidoDetalhe] = useState<ComposicaoDetalhe | null>(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ custo: '1' });
      if (filtroStatus !== 'todos') params.set('status', filtroStatus);
      if (busca) params.set('q', busca);
      const res = await fetch(`/api/composicoes?${params}`);
      const data = await res.json();
      setComposicoes(Array.isArray(data) ? data : []);
    } catch { toast.error('Erro ao carregar composições'); }
    finally { setLoading(false); }
  }, [busca, filtroStatus]);

  useEffect(() => { carregar(); }, [carregar]);

  async function toggleExpansao(comp: Composicao) {
    if (expandidoId === comp.id) { setExpandidoId(null); setExpandidoDetalhe(null); return; }
    setExpandidoId(comp.id); setExpandidoDetalhe(null); setCarregandoDetalhe(true);
    try {
      const res = await fetch(`/api/composicoes/${comp.id}`);
      setExpandidoDetalhe(await res.json());
    } finally { setCarregandoDetalhe(false); }
  }

  async function atualizarDetalhe() {
    if (!expandidoId) return;
    const res = await fetch(`/api/composicoes/${expandidoId}`);
    const data = await res.json();
    setExpandidoDetalhe(data);
    setComposicoes(prev => prev.map(c => c.id === expandidoId ? { ...c, custo_unitario: data.custo_unitario } : c));
  }

  async function excluir(e: React.MouseEvent, id: string, codigo: string) {
    e.stopPropagation();
    if (!confirm(`Excluir composição ${codigo}?`)) return;
    const res = await fetch(`/api/composicoes/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setComposicoes(prev => prev.filter(c => c.id !== id));
      if (expandidoId === id) { setExpandidoId(null); setExpandidoDetalhe(null); }
      toast.success('Excluída');
    } else toast.error('Erro ao excluir');
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Composições</h1>
          <p className="text-muted-foreground text-xs">{composicoes.length} registros</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" onClick={() => setModalAberto(true)}>
            <Plus className="h-3 w-3 mr-1" /> Nova Composição
          </Button>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="pl-8 h-8 text-sm" placeholder="Buscar por código ou descrição (ignora acentos)..."
            value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <Select value={filtroStatus} onValueChange={v => v !== null && setFiltroStatus(v)}>
          <SelectTrigger className="w-32 h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-8 px-2"></th>
              <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground w-24">Código</th>
              <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Descrição</th>
              <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground w-28">Un. Prod.</th>
              <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground w-32">Custo Unit.</th>
              <th className="text-center px-3 py-2 font-medium text-xs text-muted-foreground w-20">Status</th>
              <th className="w-10 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="text-center py-8 text-muted-foreground text-xs">Carregando...</td></tr>}
            {!loading && composicoes.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-muted-foreground text-xs">Nenhuma composição encontrada</td></tr>}
            {!loading && composicoes.map(comp => (
              <React.Fragment key={comp.id}>
                <tr
                  className={`border-b cursor-pointer transition-colors hover:bg-muted/30 ${expandidoId === comp.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                  onClick={() => toggleExpansao(comp)}
                >
                  <td className="px-2 py-2.5 text-muted-foreground">
                    {expandidoId === comp.id ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4" />}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{comp.codigo}</td>
                  <td className="px-3 py-2.5 font-medium">{comp.descricao}</td>
                  <td className="px-3 py-2.5 text-muted-foreground text-xs">{comp.unidade_producao}</td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{fmtBRL(comp.custo_unitario || 0)}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${comp.status === 'ativo' ? 'border-green-300 text-green-700 bg-green-50' : 'border-gray-300 text-gray-500 bg-gray-50'}`}>
                      {comp.status}
                    </span>
                  </td>
                  <td className="px-2 py-2.5" onClick={e => e.stopPropagation()}>
                    <button className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
                      onClick={e => excluir(e, comp.id, comp.codigo)} title="Excluir">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
                {expandidoId === comp.id && (
                  <tr className="border-b">
                    <td colSpan={7} className="p-0">
                      {carregandoDetalhe && !expandidoDetalhe
                        ? <div className="py-6 text-center text-xs text-muted-foreground">Carregando...</div>
                        : expandidoDetalhe
                          ? <PainelAccordion composicao={expandidoDetalhe} onAtualizar={atualizarDetalhe} />
                          : null}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <DialogNovaComposicao aberto={modalAberto} onFechar={() => setModalAberto(false)} onCriada={carregar} />
    </div>
  );
}
