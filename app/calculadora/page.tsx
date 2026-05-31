'use client';

import { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, Plus, Trash2, Calculator, ChevronDown, ChevronRight,
  Check, Info, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import type { CalcVao, CalcParamsRaw, CalcItem, CalcPilarItem, CalcVigaIndItem, CalcLajeItem, CalcEstacaItem, CalcAmbienteEle } from '@/lib/types';
import {
  CALC_GRUPOS, calcularQuantitativos, fmtQtd, derivarParams,
} from '@/lib/calc-engine';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function InputNum({
  label, campo, params, setParams, placeholder, min = 0, step = 0.01, helper, suffix,
}: {
  label: string;
  campo: keyof CalcParamsRaw;
  params: Partial<CalcParamsRaw>;
  setParams: (fn: (p: Partial<CalcParamsRaw>) => Partial<CalcParamsRaw>) => void;
  placeholder?: string;
  min?: number;
  step?: number;
  helper?: string;
  suffix?: string;
}) {
  const val = params[campo];
  return (
    <div className="grid gap-1">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          min={min}
          step={step}
          value={val ?? ''}
          onFocus={e => e.target.select()}
          onChange={e => {
            const n = e.target.value === '' ? undefined : Number(e.target.value);
            setParams(p => ({ ...p, [campo]: n }));
          }}
          placeholder={placeholder || '0'}
          className={`h-9 text-sm ${suffix ? 'pr-10' : ''}`}
        />
        {suffix && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {helper && <p className="text-[11px] text-muted-foreground">{helper}</p>}
    </div>
  );
}

// ─── Seção: Serviços Preliminares ─────────────────────────────────────────────
function SecaoPreliminares({
  params, setParams,
}: {
  params: Partial<CalcParamsRaw>;
  setParams: (fn: (p: Partial<CalcParamsRaw>) => Partial<CalcParamsRaw>) => void;
}) {
  return (
    <div className="grid sm:grid-cols-3 gap-3">
      <InputNum label="Área do terreno" campo="area_terreno" params={params} setParams={setParams}
        suffix="m²" helper="Área total do lote" step={1} />
      <InputNum label="Perímetro do terreno" campo="perimetro_terreno" params={params} setParams={setParams}
        suffix="m" helper="Para cálculo de tapumes" step={0.5} />
      <InputNum label="Área construída / intervenção" campo="area_construida" params={params} setParams={setParams}
        suffix="m²" helper="Para marcação de obra" step={1} />
    </div>
  );
}

// ─── Seção: Vigas de Fundação ─────────────────────────────────────────────────
const OPCOES_SECAO: { label: string; b: number; h: number }[] = [
  { label: '15 × 30 cm', b: 0.15, h: 0.30 },
  { label: '20 × 40 cm', b: 0.20, h: 0.40 },
  { label: '20 × 50 cm', b: 0.20, h: 0.50 },
  { label: '20 × 60 cm', b: 0.20, h: 0.60 },
  { label: '25 × 50 cm', b: 0.25, h: 0.50 },
  { label: '25 × 60 cm', b: 0.25, h: 0.60 },
  { label: '30 × 60 cm', b: 0.30, h: 0.60 },
  { label: 'Personalizada', b: 0, h: 0 },
];

const OPCOES_TABUA = [
  { label: 'Tábua 15 cm', value: 0.15 },
  { label: 'Tábua 20 cm', value: 0.20 },
  { label: 'Tábua 30 cm', value: 0.30 },
];

const BITOLAS_CA50 = ['8,0', '10,0', '12,5', '16,0', '20,0'];
const BITOLAS_CA60 = ['5,0', '6,3', '8,0'];

function SecaoFundacoes({
  params, setParams,
}: {
  params: Partial<CalcParamsRaw>;
  setParams: (fn: (p: Partial<CalcParamsRaw>) => Partial<CalcParamsRaw>) => void;
}) {
  const [secaoCustom, setSecaoCustom] = useState(false);
  const [bitolaLong, setBitolaLong] = useState('10,0');
  const [bitolaEstribo, setBitolaEstribo] = useState('6,3');

  const secaoKey = useMemo(() => {
    if (!params.secao_b || !params.secao_h) return '';
    const match = OPCOES_SECAO.find(o => o.b === params.secao_b && o.h === params.secao_h);
    return match ? match.label : 'Personalizada';
  }, [params.secao_b, params.secao_h]);

  function onSelecionarSecao(label: string) {
    const opcao = OPCOES_SECAO.find(o => o.label === label);
    if (!opcao) return;
    if (opcao.label === 'Personalizada') {
      setSecaoCustom(true);
    } else {
      setSecaoCustom(false);
      setParams(p => ({ ...p, secao_b: opcao.b, secao_h: opcao.h }));
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <InputNum label="Comprimento total de vigas" campo="comp_vigas" params={params} setParams={setParams}
          suffix="m" helper="Soma de todas as vigas de fundação" step={0.5} />
        <div className="grid gap-1">
          <Label className="text-xs font-medium">Seção da viga (b × h)</Label>
          <Select value={secaoKey} onValueChange={v => v && onSelecionarSecao(v)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Selecionar seção..." />
            </SelectTrigger>
            <SelectContent>
              {OPCOES_SECAO.map(o => (
                <SelectItem key={o.label} value={o.label}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {(secaoCustom || secaoKey === 'Personalizada') && (
        <div className="grid grid-cols-2 gap-3 p-3 border rounded-lg bg-muted/30">
          <InputNum label="Largura b (m)" campo="secao_b" params={params} setParams={setParams}
            suffix="m" placeholder="0.20" step={0.01} />
          <InputNum label="Altura h (m)" campo="secao_h" params={params} setParams={setParams}
            suffix="m" placeholder="0.40" step={0.01} />
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-3">
        <InputNum label="Qtd. barras longitudinais" campo="n_barras_long" params={params} setParams={setParams}
          min={2} step={1} placeholder="4" helper="Ex.: 4 barras CA-50" />
        <InputNum label="Espaçamento estribos" campo="esp_estribo" params={params} setParams={setParams}
          suffix="m" placeholder="0.15" step={0.05} helper="Ex.: 0,15 m = a cada 15 cm" />
        <div className="grid gap-1">
          <Label className="text-xs font-medium">Largura da tábua (fôrma)</Label>
          <Select
            value={params.tabua_larg ? String(params.tabua_larg) : ''}
            onValueChange={v => v && setParams(p => ({ ...p, tabua_larg: Number(v) }))}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Selecionar..." />
            </SelectTrigger>
            <SelectContent>
              {OPCOES_TABUA.map(o => (
                <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">Tábuas de pinus 2,70 m</p>
        </div>
      </div>

      {/* Bitola do aço */}
      <div className="grid sm:grid-cols-2 gap-3 p-3 border rounded-lg bg-blue-50/40 border-blue-200">
        <div className="grid gap-1">
          <Label className="text-xs font-medium text-blue-800">Bitola — Aço longitudinal (CA-50)</Label>
          <Select value={bitolaLong} onValueChange={v => v && setBitolaLong(v)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BITOLAS_CA50.map(b => (
                <SelectItem key={b} value={b}>ø {b} mm</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-blue-600">Selecionado: CA-50 ø{bitolaLong} mm</p>
        </div>
        <div className="grid gap-1">
          <Label className="text-xs font-medium text-blue-800">Bitola — Estribo (CA-60)</Label>
          <Select value={bitolaEstribo} onValueChange={v => v && setBitolaEstribo(v)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BITOLAS_CA60.map(b => (
                <SelectItem key={b} value={b}>ø {b} mm</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-blue-600">Selecionado: CA-60 ø{bitolaEstribo} mm</p>
        </div>
      </div>
    </div>
  );
}

// ─── Seção: Alvenaria — com tabela de vãos ────────────────────────────────────
function SecaoAlvenaria({
  params, setParams, vaos, setVaos,
}: {
  params: Partial<CalcParamsRaw>;
  setParams: (fn: (p: Partial<CalcParamsRaw>) => Partial<CalcParamsRaw>) => void;
  vaos: CalcVao[];
  setVaos: (v: CalcVao[]) => void;
}) {
  function addVao(tipo: 'porta' | 'janela') {
    const defaults = tipo === 'porta'
      ? { largura: 0.90, altura: 2.10 }
      : { largura: 1.20, altura: 1.20 };
    setVaos([...vaos, { id: Math.random().toString(36).slice(2), tipo, qtd: 1, ...defaults }]);
  }

  function updateVao<K extends keyof CalcVao>(id: string, field: K, value: CalcVao[K]) {
    setVaos(vaos.map(v => v.id === id ? { ...v, [field]: value } : v));
  }

  function removeVao(id: string) {
    setVaos(vaos.filter(v => v.id !== id));
  }

  const derived = derivarParams(params, vaos);
  const areaParedes = (params.comp_paredes || 0) * (params.alt_paredes || 0);
  const areaLiquida = Math.max(0, areaParedes - (derived.area_vaos || 0));
  const showResumo = (params.comp_paredes || 0) > 0 && (params.alt_paredes || 0) > 0;

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-3 items-end">
        <InputNum label="Comprimento total de paredes" campo="comp_paredes" params={params} setParams={setParams}
          suffix="m" helper="Soma do perímetro externo + paredes internas" step={0.5} />
        <InputNum label="Altura das paredes" campo="alt_paredes" params={params} setParams={setParams}
          suffix="m" placeholder="2.80" step={0.05} helper="Pé-direito líquido (sem laje)" />
        <div className="grid gap-1">
          <Label className="text-xs font-medium">Tipo de alvenaria</Label>
          <Select value={String(params.tipo_alv ?? 2)} onValueChange={v => setParams(p => ({ ...p, tipo_alv: Number(v) }))}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2">Estrutural (bloco horizontal)</SelectItem>
              <SelectItem value="1">Vedação (bloco vertical)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">Define a composição usada</p>
        </div>
      </div>

      {/* Resumo de área — aparece assim que comp_paredes e alt_paredes são preenchidos */}
      {showResumo && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-lg border bg-muted/30 px-3 py-2">
            <p className="text-muted-foreground">Área bruta</p>
            <p className="font-bold tabular-nums">{areaParedes.toFixed(2)} m²</p>
          </div>
          <div className="rounded-lg border bg-red-50 border-red-200 px-3 py-2">
            <p className="text-red-600">Área vãos (−)</p>
            <p className="font-bold tabular-nums text-red-700">
              {(derived.area_vaos || 0).toFixed(2)} m²
            </p>
          </div>
          <div className="rounded-lg border bg-green-50 border-green-200 px-3 py-2">
            <p className="text-green-700 font-medium">Área líquida</p>
            <p className="font-bold tabular-nums text-green-800">{areaLiquida.toFixed(2)} m²</p>
          </div>
        </div>
      )}

      {/* Vãos */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Vãos de portas e janelas
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addVao('porta')}>
              <Plus className="h-3 w-3 mr-1" /> Porta
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addVao('janela')}>
              <Plus className="h-3 w-3 mr-1" /> Janela
            </Button>
          </div>
        </div>

        {vaos.length === 0 ? (
          <div className="border border-dashed rounded-lg py-4 text-center text-xs text-muted-foreground">
            Nenhum vão cadastrado — adicione portas e janelas para calcular vergas e descontos
          </div>
        ) : (
          <div className="border rounded-lg overflow-auto">
            <table className="w-full text-xs min-w-[560px]">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-24">Tipo</th>
                  <th className="text-center px-2 py-2 font-semibold text-muted-foreground w-16">Qtd</th>
                  <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Largura (m)</th>
                  <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Altura (m)</th>
                  <th className="text-right px-2 py-2 font-semibold text-muted-foreground">Área total</th>
                  <th className="text-right px-2 py-2 font-semibold text-muted-foreground">Verga</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {vaos.map(v => (
                  <tr key={v.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-3 py-1.5">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border
                        ${v.tipo === 'porta' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-violet-50 border-violet-200 text-violet-700'}`}>
                        {v.tipo === 'porta' ? '🚪 Porta' : '🪟 Janela'}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" min={1} step={1} value={v.qtd}
                        onFocus={e => e.target.select()}
                        onChange={e => updateVao(v.id, 'qtd', Number(e.target.value))}
                        className="h-7 text-xs border rounded px-2 text-center w-14 block mx-auto" />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number" min={0} step={0.05}
                        value={v.largura}
                        onFocus={e => e.target.select()}
                        onChange={e => updateVao(v.id, 'largura', Number(e.target.value))}
                        className="h-7 text-xs text-center w-20 mx-auto" />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number" min={0} step={0.05}
                        value={v.altura}
                        onFocus={e => e.target.select()}
                        onChange={e => updateVao(v.id, 'altura', Number(e.target.value))}
                        className="h-7 text-xs text-center w-20 mx-auto" />
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                      {(v.qtd * v.largura * v.altura).toFixed(2)} m²
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                      {(v.qtd * (v.largura + 0.60)).toFixed(2)} m
                    </td>
                    <td className="px-1 py-1.5">
                      <button onClick={() => removeVao(v.id)}
                        className="text-muted-foreground hover:text-destructive p-0.5 rounded">
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
  );
}

// --- Novas Secoes ---
function SecaoEstacas({ estacas, setEstacas }: { estacas: CalcEstacaItem[]; setEstacas: (v: CalcEstacaItem[]) => void }) {
  function add() { setEstacas([...estacas, { id: Math.random().toString(36).slice(2), desc: '', qtd: 1, prof: 3, blocos: 1 }]); }
  function remove(id: string) { setEstacas(estacas.filter(e => e.id !== id)); }
  function upd<K extends keyof CalcEstacaItem>(id: string, f: K, v: CalcEstacaItem[K]) { setEstacas(estacas.map(e => e.id === id ? { ...e, [f]: v } : e)); }
  const totalEquiv = estacas.reduce((s, e) => s + e.qtd * (e.prof / 3), 0);
  const totalBlocos = estacas.reduce((s, e) => s + e.blocos, 0);
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">Profundidade em metros <strong>livre</strong>. Custo = equiv. trechos de 3 m.</p>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={add}><Plus className="h-3 w-3 mr-1" /> Adicionar Estaca</Button>
      </div>
      {estacas.length === 0 && <div className="border border-dashed rounded-lg py-4 text-center text-xs text-muted-foreground">Nenhuma estaca cadastrada</div>}
      {estacas.length > 0 && (
        <div className="border rounded-lg overflow-auto"><table className="w-full text-xs min-w-[520px]">
          <thead><tr className="bg-muted/50 border-b"><th className="text-left px-3 py-2">Descricao</th><th className="text-center px-2 py-2 w-16">Qtd</th><th className="text-center px-2 py-2">Prof.(m)</th><th className="text-center px-2 py-2">Blocos</th><th className="text-right px-2 py-2">Equiv.</th><th className="w-8"></th></tr></thead>
          <tbody>{estacas.map(e => { const eq = e.qtd*(e.prof/3); return (
            <tr key={e.id} className="border-b last:border-0 hover:bg-muted/20">
              <td className="px-2 py-1.5"><input type="text" value={e.desc} onChange={ev=>upd(e.id,'desc',ev.target.value)} placeholder="E1" className="h-7 text-xs border rounded px-2 w-full"/></td>
              <td className="px-2 py-1.5"><input type="number" min={1} step={1} value={e.qtd} onFocus={ev=>ev.target.select()} onChange={ev=>upd(e.id,'qtd',Number(ev.target.value))} className="h-7 text-xs border rounded px-2 text-center w-14 block mx-auto"/></td>
              <td className="px-2 py-1.5"><input type="number" min={0.5} step={0.5} value={e.prof} onFocus={ev=>ev.target.select()} onChange={ev=>upd(e.id,'prof',Number(ev.target.value))} className="h-7 text-xs border rounded px-2 text-center w-20 block mx-auto"/></td>
              <td className="px-2 py-1.5"><input type="number" min={0} step={1} value={e.blocos} onFocus={ev=>ev.target.select()} onChange={ev=>upd(e.id,'blocos',Number(ev.target.value))} className="h-7 text-xs border rounded px-2 text-center w-16 block mx-auto"/></td>
              <td className="px-2 py-1.5 text-right font-semibold text-blue-700">{eq.toFixed(2)} un</td>
              <td className="px-1 py-1.5"><button onClick={()=>remove(e.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3"/></button></td>
            </tr>); })}
          </tbody></table></div>
      )}
      {estacas.length > 0 && (<div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg border bg-blue-50 border-blue-200 px-3 py-2 col-span-2"><p className="text-blue-700">Equiv. total (Sigma qtd x prof / 3)</p><p className="font-bold tabular-nums text-blue-800">{totalEquiv.toFixed(2)} un de 3 m</p></div>
        <div className="rounded-lg border bg-muted/30 px-3 py-2"><p className="text-muted-foreground">Blocos de coroamento</p><p className="font-bold tabular-nums">{totalBlocos} un</p></div>
      </div>)}
    </div>
  );
}
function SecaoCobertura({ params, setParams }: { params: Partial<CalcParamsRaw>; setParams: (fn: (p: Partial<CalcParamsRaw>) => Partial<CalcParamsRaw>) => void }) {
  return (<div className="space-y-3">
    <div className="grid sm:grid-cols-2 gap-3">
      <InputNum label="Area do telhado" campo="area_telhado" params={params} setParams={setParams} suffix="m2" step={1} helper="Area real com beiral" />
      <div className="grid gap-1"><Label className="text-xs font-medium">Tipo de telha</Label>
        <Select value={String(params.tipo_telha ?? 1)} onValueChange={v => setParams(p => ({ ...p, tipo_telha: Number(v) }))}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="1">Barro colonial (madeira + telha)</SelectItem><SelectItem value="2">Aluzinco (estrutura metalica)</SelectItem></SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">{params.tipo_telha === 2 ? 'cmp-7000+cmp-7001' : 'cmp-7004+cmp-7005'}</p>
      </div>
    </div>
    <div className="grid sm:grid-cols-2 gap-3">
      <InputNum label="Rufos" campo="comp_rufos" params={params} setParams={setParams} suffix="m" step={0.5} helper="cmp-7002" />
      <InputNum label="Calhas" campo="comp_calhas" params={params} setParams={setParams} suffix="m" step={0.5} helper="cmp-7003" />
    </div>
  </div>);
}
function SecaoImperme({ params, setParams }: { params: Partial<CalcParamsRaw>; setParams: (fn: (p: Partial<CalcParamsRaw>) => Partial<CalcParamsRaw>) => void }) {
  return <div className="grid sm:grid-cols-2 gap-3"><InputNum label="Area molhada" campo="area_imper_molhada" params={params} setParams={setParams} suffix="m2" step={0.5} helper="Banheiros, cozinha - cmp-8001" /></div>;
}
function SecaoRevest({ params, setParams }: { params: Partial<CalcParamsRaw>; setParams: (fn: (p: Partial<CalcParamsRaw>) => Partial<CalcParamsRaw>) => void }) {
  return (<div className="grid sm:grid-cols-2 gap-3"><InputNum label="Chapisco+reboco" campo="area_revest_interno" params={params} setParams={setParams} suffix="m2" step={1} helper="cmp-9000+cmp-9001" /><InputNum label="Ceramica parede" campo="area_ceramica_parede" params={params} setParams={setParams} suffix="m2" step={0.5} helper="cmp-9004" /></div>);
}
function SecaoForro({ params, setParams }: { params: Partial<CalcParamsRaw>; setParams: (fn: (p: Partial<CalcParamsRaw>) => Partial<CalcParamsRaw>) => void }) {
  return <div className="grid sm:grid-cols-2 gap-3"><InputNum label="Area de forro" campo="area_forro" params={params} setParams={setParams} suffix="m2" step={1} helper="Forro PVC - cmp-10002" /></div>;
}
function SecaoPintura({ params, setParams }: { params: Partial<CalcParamsRaw>; setParams: (fn: (p: Partial<CalcParamsRaw>) => Partial<CalcParamsRaw>) => void }) {
  return (<div className="grid sm:grid-cols-2 gap-3"><InputNum label="Pintura interna" campo="area_pintura_interna" params={params} setParams={setParams} suffix="m2" step={1} helper="cmp-12002+cmp-12000" /><InputNum label="Pintura externa" campo="area_pintura_externa" params={params} setParams={setParams} suffix="m2" step={1} helper="cmp-12003+cmp-12001" /></div>);
}
function SecaoPisos({ params, setParams }: { params: Partial<CalcParamsRaw>; setParams: (fn: (p: Partial<CalcParamsRaw>) => Partial<CalcParamsRaw>) => void }) {
  return <div className="grid sm:grid-cols-2 gap-3"><InputNum label="Area de piso" campo="area_piso" params={params} setParams={setParams} suffix="m2" step={1} helper="Contrapiso cmp-13000 + ceramica cmp-13012" /></div>;
}
function SecaoAcabamento({ params, setParams }: { params: Partial<CalcParamsRaw>; setParams: (fn: (p: Partial<CalcParamsRaw>) => Partial<CalcParamsRaw>) => void }) {
  return <div className="grid sm:grid-cols-2 gap-3"><InputNum label="Comprimento rodape" campo="comp_rodape" params={params} setParams={setParams} suffix="m" step={0.5} helper="Rodape ceramico - cmp-14002" /></div>;
}
function SecaoHidraulica({ params, setParams }: { params: Partial<CalcParamsRaw>; setParams: (fn: (p: Partial<CalcParamsRaw>) => Partial<CalcParamsRaw>) => void }) {
  return (<div className="grid sm:grid-cols-2 gap-3"><InputNum label="Pontos de agua fria" campo="n_pontos_agua" params={params} setParams={setParams} step={1} helper="cmp-16000 + reservatorio cmp-16005" /><InputNum label="Metros de rede" campo="metros_rede_agua" params={params} setParams={setParams} suffix="m" step={1} helper="cmp-16006" /></div>);
}
function SecaoEsgoto({ params, setParams }: { params: Partial<CalcParamsRaw>; setParams: (fn: (p: Partial<CalcParamsRaw>) => Partial<CalcParamsRaw>) => void }) {
  return (<div className="grid sm:grid-cols-2 gap-3"><InputNum label="Pontos de esgoto" campo="n_pontos_esgoto" params={params} setParams={setParams} step={1} helper="cmp-17001+cmp-17003" /><InputNum label="Cx. sifonadas" campo="n_caixa_sifonada" params={params} setParams={setParams} step={1} helper="cmp-17004" /><InputNum label="Cx. inspecao" campo="n_caixa_inspecao" params={params} setParams={setParams} step={1} helper="cmp-17006" /></div>);
}
function SecaoBanheiro({ params, setParams }: { params: Partial<CalcParamsRaw>; setParams: (fn: (p: Partial<CalcParamsRaw>) => Partial<CalcParamsRaw>) => void }) {
  return <div className="grid sm:grid-cols-2 gap-3"><InputNum label="Numero de banheiros" campo="n_banheiros" params={params} setParams={setParams} step={1} min={0} helper="Loucas cmp-18000 + metais cmp-18001" /></div>;
}
function SecaoComplementos() {
  return <div className="p-3 rounded-lg border bg-green-50/40 border-green-200"><p className="text-xs text-green-800 font-medium">Limpeza final incluida automaticamente - cmp-19001 (1 vb).</p></div>;
}
const AMBIENTES_RAPIDOS_ELE = [
  { label: 'Quarto',   defaults: { tomadas: 3, tomadas_duplas: 0, interruptores: 1, luminarias: 1, chuveiro: false } },
  { label: 'Sala',     defaults: { tomadas: 4, tomadas_duplas: 1, interruptores: 1, luminarias: 2, chuveiro: false } },
  { label: 'Cozinha',  defaults: { tomadas: 4, tomadas_duplas: 1, interruptores: 1, luminarias: 1, chuveiro: false } },
  { label: 'Banheiro', defaults: { tomadas: 1, tomadas_duplas: 0, interruptores: 1, luminarias: 1, chuveiro: true  } },
];
function SecaoEletrica({ ambientes, setAmbientes }: { ambientes: CalcAmbienteEle[]; setAmbientes: (v: CalcAmbienteEle[]) => void }) {
  function addAmb(nome: string, def: Omit<CalcAmbienteEle,'id'|'nome'>) { setAmbientes([...ambientes, { id: Math.random().toString(36).slice(2), nome, ...def }]); }
  function remove(id: string) { setAmbientes(ambientes.filter(a => a.id !== id)); }
  function upd<K extends keyof CalcAmbienteEle>(id: string, f: K, v: CalcAmbienteEle[K]) { setAmbientes(ambientes.map(a => a.id === id ? { ...a, [f]: v } : a)); }
  const tot = ambientes.reduce((acc, a) => ({ tomadas: acc.tomadas+a.tomadas, duplas: acc.duplas+a.tomadas_duplas, inter: acc.inter+a.interruptores, lum: acc.lum+a.luminarias, ch: acc.ch+(a.chuveiro?1:0) }), { tomadas:0, duplas:0, inter:0, lum:0, ch:0 });
  return (
    <div className="space-y-3">
      <div><p className="text-xs text-muted-foreground mb-2">Adicione ambientes. Padrao: 3 tomadas + 1 luz.</p>
        <div className="flex flex-wrap gap-2">
          {AMBIENTES_RAPIDOS_ELE.map(a => <Button key={a.label} size="sm" variant="outline" className="h-7 text-xs" onClick={() => addAmb(a.label, a.defaults)}><Plus className="h-3 w-3 mr-1"/>{a.label}</Button>)}
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addAmb('Ambiente', { tomadas:3, tomadas_duplas:0, interruptores:1, luminarias:1, chuveiro:false })}><Plus className="h-3 w-3 mr-1"/> Outro</Button>
        </div>
      </div>
      {ambientes.length === 0 && <div className="border border-dashed rounded-lg py-4 text-center text-xs text-muted-foreground">Nenhum ambiente - use os botoes acima</div>}
      {ambientes.length > 0 && (<div className="border rounded-lg overflow-auto">
        <table className="w-full text-xs min-w-[640px]"><thead><tr className="bg-muted/50 border-b">
          <th className="text-left px-3 py-2 w-28">Ambiente</th><th className="text-center px-2 py-2">Tom.s</th><th className="text-center px-2 py-2">Tom.d</th>
          <th className="text-center px-2 py-2">Interrup.</th><th className="text-center px-2 py-2">Luminarias</th><th className="text-center px-2 py-2">Chuveiro</th><th className="w-8"></th>
        </tr></thead>
        <tbody>{ambientes.map(a => (
          <tr key={a.id} className="border-b last:border-0 hover:bg-muted/20">
            <td className="px-2 py-1.5"><input type="text" value={a.nome} onChange={e=>upd(a.id,'nome',e.target.value)} className="h-7 text-xs border rounded px-2 w-full"/></td>
            <td className="px-2 py-1.5"><input type="number" min={0} step={1} value={a.tomadas} onFocus={e=>e.target.select()} onChange={e=>upd(a.id,'tomadas',Number(e.target.value))} className="h-7 text-xs border rounded px-2 text-center w-14 block mx-auto"/></td>
            <td className="px-2 py-1.5"><input type="number" min={0} step={1} value={a.tomadas_duplas} onFocus={e=>e.target.select()} onChange={e=>upd(a.id,'tomadas_duplas',Number(e.target.value))} className="h-7 text-xs border rounded px-2 text-center w-14 block mx-auto"/></td>
            <td className="px-2 py-1.5"><input type="number" min={0} step={1} value={a.interruptores} onFocus={e=>e.target.select()} onChange={e=>upd(a.id,'interruptores',Number(e.target.value))} className="h-7 text-xs border rounded px-2 text-center w-14 block mx-auto"/></td>
            <td className="px-2 py-1.5"><input type="number" min={0} step={1} value={a.luminarias} onFocus={e=>e.target.select()} onChange={e=>upd(a.id,'luminarias',Number(e.target.value))} className="h-7 text-xs border rounded px-2 text-center w-14 block mx-auto"/></td>
            <td className="px-2 py-1.5 text-center"><input type="checkbox" checked={a.chuveiro} onChange={e=>upd(a.id,'chuveiro',e.target.checked)} className="h-4 w-4 accent-primary"/></td>
            <td className="px-1 py-1.5"><button onClick={()=>remove(a.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3"/></button></td>
          </tr>
        ))}</tbody>
        </table></div>
      )}
      {ambientes.length > 0 && (<div className="grid grid-cols-5 gap-2 text-xs">
        <div className="rounded-lg border bg-amber-50 border-amber-200 px-3 py-2"><p className="opacity-70">Tom.simples</p><p className="font-bold">{tot.tomadas}</p></div>
        <div className="rounded-lg border bg-orange-50 border-orange-200 px-3 py-2"><p className="opacity-70">Tom.duplas</p><p className="font-bold">{tot.duplas}</p></div>
        <div className="rounded-lg border bg-violet-50 border-violet-200 px-3 py-2"><p className="opacity-70">Interruptores</p><p className="font-bold">{tot.inter}</p></div>
        <div className="rounded-lg border bg-teal-50 border-teal-200 px-3 py-2"><p className="opacity-70">Luminarias</p><p className="font-bold">{tot.lum}</p></div>
        <div className="rounded-lg border bg-blue-50 border-blue-200 px-3 py-2"><p className="opacity-70">Chuveiros</p><p className="font-bold">{tot.ch}</p></div>
      </div>)}
    </div>
  );
}


// ─── Painel de preview ────────────────────────────────────────────────────────
function PainelPreview({
  items, selecionados, setSelecionados, onAplicar, aplicando, orcamentoId,
}: {
  items: CalcItem[];
  selecionados: Set<string>;
  setSelecionados: (s: Set<string>) => void;
  onAplicar: () => void;
  aplicando: boolean;
  orcamentoId: string;
}) {
  const itensPorGrupo = useMemo(() => {
    const map = new Map<string, CalcItem[]>();
    for (const item of items) {
      if (!map.has(item.grupo_id)) map.set(item.grupo_id, []);
      map.get(item.grupo_id)!.push(item);
    }
    return map;
  }, [items]);

  const itensSelecionados = items.filter(i => selecionados.has(i.template_id));
  const itensComQtd = items.filter(i => i.quantidade > 0);
  const todosChecados = itensComQtd.length > 0 && itensComQtd.every(i => selecionados.has(i.template_id));

  function toggleTodos() {
    if (todosChecados) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(itensComQtd.map(i => i.template_id)));
    }
  }

  function toggle(id: string) {
    const next = new Set(selecionados);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelecionados(next);
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            Quantitativos calculados
          </h3>
          {itensComQtd.length > 0 && (
            <button onClick={toggleTodos}
              className="text-xs text-primary hover:underline">
              {todosChecados ? 'Desmarcar todos' : 'Marcar todos'}
            </button>
          )}
        </div>

        {itensComQtd.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            <Calculator className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>Preencha os parâmetros ao lado</p>
            <p className="mt-0.5">para ver os quantitativos calculados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {CALC_GRUPOS.map(grupo => {
              const grupoItems = (itensPorGrupo.get(grupo.id) || []).filter(i => i.quantidade > 0);
              if (grupoItems.length === 0) return null;
              return (
                <div key={grupo.id}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                    <span>{grupo.emoji}</span> {grupo.nome}
                  </p>
                  <div className="space-y-1">
                    {grupoItems.map(item => (
                      <label key={item.template_id}
                        className={`flex items-start gap-2 rounded-lg px-2 py-1.5 cursor-pointer transition-colors
                          ${selecionados.has(item.template_id) ? 'bg-primary/5 border border-primary/20' : 'bg-muted/30 border border-transparent hover:bg-muted/50'}`}>
                        <input
                          type="checkbox"
                          checked={selecionados.has(item.template_id)}
                          onChange={() => toggle(item.template_id)}
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium leading-tight truncate">{item.nome}</p>
                          <p className="text-[10px] text-muted-foreground">
                            etapa {item.etapa_codigo} · {item.sub_etapa}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold tabular-nums text-primary">
                            {fmtQtd(item.quantidade, item.unidade)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{item.unidade}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {itensSelecionados.length > 0 && (
          <>
            <div className="border-t pt-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{itensSelecionados.length}</span> item(s) selecionado(s)
            </div>
            <Button
              className="w-full"
              disabled={!orcamentoId || aplicando}
              onClick={onAplicar}>
              {aplicando ? (
                'Adicionando...'
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5 mr-1.5" />
                  Adicionar {itensSelecionados.length} item(s) ao Orçamento
                </>
              )}
            </Button>
            {!orcamentoId && (
              <p className="text-xs text-center text-amber-600">
                Selecione um orçamento acima para continuar
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Componente accordion para cada grupo ────────────────────────────────────
function GrupoSection({
  grupo, expanded, onToggle, children, itensAtivos,
}: {
  grupo: (typeof CALC_GRUPOS)[0];
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  itensAtivos: number;
}) {
  const cores: Record<string, string> = {
    amber: 'border-amber-200 bg-amber-50/30',
    blue: 'border-blue-200 bg-blue-50/30',
    orange: 'border-orange-200 bg-orange-50/30',
    green: 'border-green-200 bg-green-50/30',
    violet: 'border-violet-200 bg-violet-50/30',
    teal: 'border-teal-200 bg-teal-50/30',
  };
  const coresBadge: Record<string, string> = {
    amber: 'bg-amber-100 text-amber-700 border-amber-300',
    blue: 'bg-blue-100 text-blue-700 border-blue-300',
    orange: 'bg-orange-100 text-orange-700 border-orange-300',
    green: 'bg-green-100 text-green-700 border-green-300',
    violet: 'bg-violet-100 text-violet-700 border-violet-300',
    teal: 'bg-teal-100 text-teal-700 border-teal-300',
  };

  return (
    <Card className={`border-2 transition-all ${expanded ? cores[grupo.cor] : 'border-border'}`}>
      <CardContent className="p-0">
        <button
          onClick={onToggle}
          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors rounded-xl">
          <span className="text-xl">{grupo.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{grupo.nome}</p>
            <p className="text-xs text-muted-foreground">{grupo.descricao}</p>
          </div>
          {itensAtivos > 0 && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${coresBadge[grupo.cor]}`}>
              {itensAtivos} calculado{itensAtivos > 1 ? 's' : ''}
            </span>
          )}
          {expanded
            ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
        </button>

        {expanded && (
          <div className="px-4 pb-4 border-t mt-0 pt-4">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Seção: Pilares ───────────────────────────────────────────────────────────
function SecaoPilares({
  pilares, setPilares,
}: {
  pilares: CalcPilarItem[];
  setPilares: (v: CalcPilarItem[]) => void;
}) {
  function add() {
    setPilares([...pilares, { id: Math.random().toString(36).slice(2), desc: '', qtd: 1, l1: 0.15, l2: 0.30, h: 3.0 }]);
  }
  function remove(id: string) {
    setPilares(pilares.filter(p => p.id !== id));
  }
  function update<K extends keyof CalcPilarItem>(id: string, field: K, value: CalcPilarItem[K]) {
    setPilares(pilares.map(p => p.id === id ? { ...p, [field]: value } : p));
  }
  const totalConc = pilares.reduce((s, p) => s + p.qtd * p.l1 * p.l2 * p.h, 0);
  const totalForma = pilares.reduce((s, p) => s + p.qtd * 2 * (p.l1 + p.l2) * p.h, 0);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">Adicione cada tipo de pilar com suas dimensões e quantidade</p>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={add}>
          <Plus className="h-3 w-3 mr-1" /> Adicionar Pilar
        </Button>
      </div>
      {pilares.length === 0 ? (
        <div className="border border-dashed rounded-lg py-4 text-center text-xs text-muted-foreground">
          Nenhum pilar cadastrado — clique em &quot;Adicionar Pilar&quot;
        </div>
      ) : (
        <div className="border rounded-lg overflow-auto">
          <table className="w-full text-xs min-w-[580px]">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-24">Ref.</th>
                <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Qtd</th>
                <th className="text-center px-2 py-2 font-semibold text-muted-foreground">L1 (m)</th>
                <th className="text-center px-2 py-2 font-semibold text-muted-foreground">L2 (m)</th>
                <th className="text-center px-2 py-2 font-semibold text-muted-foreground">H (m)</th>
                <th className="text-right px-2 py-2 font-semibold text-muted-foreground">Concreto</th>
                <th className="text-right px-2 py-2 font-semibold text-muted-foreground">Fôrma</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {pilares.map(p => {
                const conc = p.qtd * p.l1 * p.l2 * p.h;
                const forma = p.qtd * 2 * (p.l1 + p.l2) * p.h;
                return (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-2 py-1.5">
                      <input type="text" value={p.desc} onChange={e => update(p.id, 'desc', e.target.value)}
                        placeholder="P1" className="h-7 text-xs border rounded px-2 w-full" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" min={1} step={1} value={p.qtd}
                        onFocus={e => e.target.select()}
                        onChange={e => update(p.id, 'qtd', Number(e.target.value))}
                        className="h-7 text-xs border rounded px-2 text-center w-16 block mx-auto" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" min={0} step={0.05} value={p.l1}
                        onFocus={e => e.target.select()}
                        onChange={e => update(p.id, 'l1', Number(e.target.value))}
                        className="h-7 text-xs border rounded px-2 text-center w-20 block mx-auto" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" min={0} step={0.05} value={p.l2}
                        onFocus={e => e.target.select()}
                        onChange={e => update(p.id, 'l2', Number(e.target.value))}
                        className="h-7 text-xs border rounded px-2 text-center w-20 block mx-auto" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" min={0} step={0.1} value={p.h}
                        onFocus={e => e.target.select()}
                        onChange={e => update(p.id, 'h', Number(e.target.value))}
                        className="h-7 text-xs border rounded px-2 text-center w-20 block mx-auto" />
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-green-700">
                      {conc.toFixed(3)} m³
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                      {forma.toFixed(2)} m²
                    </td>
                    <td className="px-1 py-1.5">
                      <button onClick={() => remove(p.id)}
                        className="text-muted-foreground hover:text-destructive p-0.5 rounded">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {pilares.length > 0 && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border bg-green-50 border-green-200 px-3 py-2">
            <p className="text-green-700">Concreto total (pilares)</p>
            <p className="font-bold tabular-nums text-green-800">{totalConc.toFixed(3)} m³</p>
          </div>
          <div className="rounded-lg border bg-muted/30 px-3 py-2">
            <p className="text-muted-foreground">Fôrma total</p>
            <p className="font-bold tabular-nums">{totalForma.toFixed(2)} m²</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Seção: Vigas Formas e Concreto ───────────────────────────────────────────
function SecaoVigas({
  vigas, setVigas,
}: {
  vigas: CalcVigaIndItem[];
  setVigas: (v: CalcVigaIndItem[]) => void;
}) {
  function add() {
    setVigas([...vigas, {
      id: Math.random().toString(36).slice(2),
      desc: '', b: 0.15, h: 0.30, comp: 10.0,
      tipo: 'baldrame', esp_escoras: 1.0,
    }]);
  }
  function remove(id: string) {
    setVigas(vigas.filter(v => v.id !== id));
  }
  function update<K extends keyof CalcVigaIndItem>(id: string, field: K, value: CalcVigaIndItem[K]) {
    setVigas(vigas.map(v => v.id === id ? { ...v, [field]: value } : v));
  }

  const totalConc = vigas.reduce((s, v) => s + v.b * v.h * v.comp, 0);
  const totalTabPinus = vigas.reduce((s, v) => s + Math.ceil((v.comp || 0) * 2 / 2.70), 0);
  const totalTabEuclp = vigas.filter(v => v.tipo === 'aerea').reduce((s, v) => s + Math.ceil((v.comp || 0) / 5.40), 0);
  const totalEscoras = vigas.filter(v => v.tipo === 'aerea').reduce(
    (s, v) => s + (v.esp_escoras > 0 ? Math.ceil((v.comp || 0) / v.esp_escoras) : 0), 0,
  );
  const temAerea = vigas.some(v => v.tipo === 'aerea');

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
          Informe o total de metros de cada tipo — <strong>baldrame</strong> (apoiado no solo, 2 faces) ou <strong>aérea</strong> (suspensa, 3 faces + escoras)
        </p>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={add}>
          <Plus className="h-3 w-3 mr-1" /> Adicionar Viga
        </Button>
      </div>
      {vigas.length === 0 ? (
        <div className="border border-dashed rounded-lg py-4 text-center text-xs text-muted-foreground">
          Nenhuma viga cadastrada — clique em &quot;Adicionar Viga&quot;
        </div>
      ) : (
        <div className="border rounded-lg overflow-auto">
          <table className="w-full text-xs min-w-[680px]">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-24">Ref.</th>
                <th className="text-center px-2 py-2 font-semibold text-muted-foreground">b (m)</th>
                <th className="text-center px-2 py-2 font-semibold text-muted-foreground">h (m)</th>
                <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Total (m)</th>
                <th className="text-center px-2 py-2 font-semibold text-muted-foreground w-28">Tipo</th>
                <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Esc./m</th>
                <th className="text-right px-2 py-2 font-semibold text-muted-foreground">Concreto</th>
                <th className="text-right px-2 py-2 font-semibold text-muted-foreground">Tb. Pinus</th>
                <th className="text-right px-2 py-2 font-semibold text-muted-foreground">Tb. Euclp</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {vigas.map(v => {
                const conc = v.b * v.h * v.comp;
                const tabPinus = Math.ceil((v.comp || 0) * 2 / 2.70);
                const tabEuclp = v.tipo === 'aerea' ? Math.ceil((v.comp || 0) / 5.40) : 0;
                return (
                  <tr key={v.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-2 py-1.5">
                      <input type="text" value={v.desc} onChange={e => update(v.id, 'desc', e.target.value)}
                        placeholder="V1" className="h-7 text-xs border rounded px-2 w-full" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" min={0} step={0.05} value={v.b}
                        onFocus={e => e.target.select()}
                        onChange={e => update(v.id, 'b', Number(e.target.value))}
                        className="h-7 text-xs border rounded px-2 text-center w-18 block mx-auto" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" min={0} step={0.05} value={v.h}
                        onFocus={e => e.target.select()}
                        onChange={e => update(v.id, 'h', Number(e.target.value))}
                        className="h-7 text-xs border rounded px-2 text-center w-18 block mx-auto" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" min={0} step={0.5} value={v.comp}
                        onFocus={e => e.target.select()}
                        onChange={e => update(v.id, 'comp', Number(e.target.value))}
                        className="h-7 text-xs border rounded px-2 text-center w-20 block mx-auto" />
                    </td>
                    <td className="px-2 py-1.5">
                      <Select value={v.tipo} onValueChange={val => update(v.id, 'tipo', val as 'baldrame' | 'aerea')}>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="baldrame">Baldrame</SelectItem>
                          <SelectItem value="aerea">Aérea</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-1.5">
                      {v.tipo === 'aerea' ? (
                        <input type="number" min={0.5} step={0.5} value={v.esp_escoras}
                          onFocus={e => e.target.select()}
                          onChange={e => update(v.id, 'esp_escoras', Number(e.target.value))}
                          className="h-7 text-xs border rounded px-2 text-center w-16 block mx-auto" />
                      ) : (
                        <span className="block text-center text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-violet-700">
                      {conc.toFixed(3)} m³
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                      {tabPinus} un
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                      {tabEuclp > 0 ? `${tabEuclp} un` : '—'}
                    </td>
                    <td className="px-1 py-1.5">
                      <button onClick={() => remove(v.id)}
                        className="text-muted-foreground hover:text-destructive p-0.5 rounded">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {vigas.length > 0 && (
        <div className={`grid gap-2 text-xs ${temAerea ? 'grid-cols-4' : 'grid-cols-2'}`}>
          <div className="rounded-lg border bg-violet-50 border-violet-200 px-3 py-2">
            <p className="text-violet-700">Concreto total</p>
            <p className="font-bold tabular-nums text-violet-800">{totalConc.toFixed(3)} m³</p>
          </div>
          <div className="rounded-lg border bg-amber-50 border-amber-200 px-3 py-2">
            <p className="text-amber-700">Tábuas pinus (2,70 m)</p>
            <p className="font-bold tabular-nums text-amber-800">{totalTabPinus} un</p>
          </div>
          {temAerea && (
            <>
              <div className="rounded-lg border bg-orange-50 border-orange-200 px-3 py-2">
                <p className="text-orange-700">Tábuas eucalipto (5,40 m)</p>
                <p className="font-bold tabular-nums text-orange-800">{totalTabEuclp} un</p>
              </div>
              <div className="rounded-lg border bg-muted/30 px-3 py-2">
                <p className="text-muted-foreground">Escoras (vigas aéreas)</p>
                <p className="font-bold tabular-nums">~{totalEscoras} un</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Seção: Laje ──────────────────────────────────────────────────────────────
function SecaoLaje({
  lajes, setLajes,
}: {
  lajes: CalcLajeItem[];
  setLajes: (v: CalcLajeItem[]) => void;
}) {
  function add() {
    setLajes([...lajes, { id: Math.random().toString(36).slice(2), desc: '', qtd: 1, comp: 5.0, larg: 4.0, esp: 0.10 }]);
  }
  function remove(id: string) {
    setLajes(lajes.filter(l => l.id !== id));
  }
  function update<K extends keyof CalcLajeItem>(id: string, field: K, value: CalcLajeItem[K]) {
    setLajes(lajes.map(l => l.id === id ? { ...l, [field]: value } : l));
  }
  const totalArea = lajes.reduce((s, l) => s + l.qtd * l.comp * l.larg, 0);
  const totalConc = lajes.reduce((s, l) => s + l.qtd * l.comp * l.larg * l.esp, 0);
  const totalEscoras = Math.ceil(totalArea / 1.5);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">Adicione cada laje ou região de laje separadamente</p>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={add}>
          <Plus className="h-3 w-3 mr-1" /> Adicionar Laje
        </Button>
      </div>
      {lajes.length === 0 ? (
        <div className="border border-dashed rounded-lg py-4 text-center text-xs text-muted-foreground">
          Nenhuma laje cadastrada — clique em &quot;Adicionar Laje&quot;
        </div>
      ) : (
        <div className="border rounded-lg overflow-auto">
          <table className="w-full text-xs min-w-[580px]">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-24">Ref.</th>
                <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Qtd</th>
                <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Comp (m)</th>
                <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Larg (m)</th>
                <th className="text-center px-2 py-2 font-semibold text-muted-foreground">Esp (m)</th>
                <th className="text-right px-2 py-2 font-semibold text-muted-foreground">Área</th>
                <th className="text-right px-2 py-2 font-semibold text-muted-foreground">Concreto</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {lajes.map(l => {
                const area = l.qtd * l.comp * l.larg;
                const conc = l.qtd * l.comp * l.larg * l.esp;
                return (
                  <tr key={l.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-2 py-1.5">
                      <input type="text" value={l.desc} onChange={e => update(l.id, 'desc', e.target.value)}
                        placeholder="L1" className="h-7 text-xs border rounded px-2 w-full" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" min={1} step={1} value={l.qtd}
                        onFocus={e => e.target.select()}
                        onChange={e => update(l.id, 'qtd', Number(e.target.value))}
                        className="h-7 text-xs border rounded px-2 text-center w-16 block mx-auto" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" min={0} step={0.5} value={l.comp}
                        onFocus={e => e.target.select()}
                        onChange={e => update(l.id, 'comp', Number(e.target.value))}
                        className="h-7 text-xs border rounded px-2 text-center w-20 block mx-auto" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" min={0} step={0.5} value={l.larg}
                        onFocus={e => e.target.select()}
                        onChange={e => update(l.id, 'larg', Number(e.target.value))}
                        className="h-7 text-xs border rounded px-2 text-center w-20 block mx-auto" />
                    </td>
                    <td className="px-2 py-1.5">
                      <input type="number" min={0} step={0.01} value={l.esp}
                        onFocus={e => e.target.select()}
                        onChange={e => update(l.id, 'esp', Number(e.target.value))}
                        className="h-7 text-xs border rounded px-2 text-center w-20 block mx-auto" />
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                      {area.toFixed(2)} m²
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-teal-700">
                      {conc.toFixed(3)} m³
                    </td>
                    <td className="px-1 py-1.5">
                      <button onClick={() => remove(l.id)}
                        className="text-muted-foreground hover:text-destructive p-0.5 rounded">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {lajes.length > 0 && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-lg border bg-teal-50 border-teal-200 px-3 py-2">
            <p className="text-teal-700">Área total</p>
            <p className="font-bold tabular-nums text-teal-800">{totalArea.toFixed(2)} m²</p>
          </div>
          <div className="rounded-lg border bg-teal-50 border-teal-200 px-3 py-2">
            <p className="text-teal-700">Concreto total</p>
            <p className="font-bold tabular-nums text-teal-800">{totalConc.toFixed(3)} m³</p>
          </div>
          <div className="rounded-lg border bg-muted/30 px-3 py-2">
            <p className="text-muted-foreground">Escoras estimadas</p>
            <p className="font-bold tabular-nums">~{totalEscoras} un</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
function CalculadoraContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const orcIdParam = searchParams.get('orcamento_id') || '';
  const orcTituloParam = searchParams.get('orcamento_titulo') || '';

  const [orcamentos, setOrcamentos] = useState<{ id: string; titulo: string }[]>([]);
  const [orcamentoId, setOrcamentoId] = useState(orcIdParam);
  const [orcamentoTitulo, setOrcamentoTitulo] = useState(orcTituloParam);

  const [params, setParams] = useState<Partial<CalcParamsRaw>>({
    esp_estribo: 0.15, n_barras_long: 4, tabua_larg: 0.20,
    tipo_alv: 2, tipo_telha: 1,
  });
  const [vaos, setVaos] = useState<CalcVao[]>([]);
  const [pilares, setPilares] = useState<CalcPilarItem[]>([]);
  const [vigas, setVigas] = useState<CalcVigaIndItem[]>([]);
  const [lajes, setLajes] = useState<CalcLajeItem[]>([]);
  const [estacas, setEstacas] = useState<CalcEstacaItem[]>([]);
  const [ambientesEle, setAmbientesEle] = useState<CalcAmbienteEle[]>([]);

  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({
    preliminares: true, fundacoes: false, estacas: false, laje: false,
    pilares: false, vigas_ind: false, alvenaria: false, esquadrias: false,
    cobertura: false, imperme: false, revest: false, forro: false,
    pintura: false, pisos: false, acabamento: false, eletrica: false,
    hidraulica: false, esgoto: false, banheiro: false, complementos: false,
  });

  const calcItems = useMemo(
    () => calcularQuantitativos(params, vaos, pilares, vigas, lajes, estacas, ambientesEle),
    [params, vaos, pilares, vigas, lajes, estacas, ambientesEle],
  );
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [aplicando, setAplicando] = useState(false);

  const calcItemsKey = useMemo(
    () => calcItems.map(i => `${i.template_id}:${i.quantidade}`).join('|'),
    [calcItems],
  );

  useEffect(() => {
    setSelecionados(prev => {
      const next = new Set(prev);
      for (const item of calcItems) {
        if (item.quantidade > 0 && item.incluir) {
          next.add(item.template_id);
        } else if (item.quantidade === 0) {
          next.delete(item.template_id);
        }
      }
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calcItemsKey]);

  useEffect(() => {
    fetch('/api/orcamentos')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setOrcamentos(data.map((o: { id: string; titulo: string }) => ({
            id: o.id, titulo: o.titulo,
          })));
        }
      })
      .catch(() => { /* silencioso */ });
  }, []);

  const itensPorGrupo = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of calcItems) {
      if (item.quantidade > 0) {
        map[item.grupo_id] = (map[item.grupo_id] || 0) + 1;
      }
    }
    return map;
  }, [calcItems]);

  function toggleGrupo(id: string) {
    setExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
  }

  const aplicar = useCallback(async () => {
    if (!orcamentoId) { toast.error('Selecione um orçamento'); return; }
    const itensSel = calcItems.filter(i => selecionados.has(i.template_id) && i.quantidade > 0);
    if (itensSel.length === 0) { toast.error('Nenhum item selecionado'); return; }

    setAplicando(true);
    try {
      const res = await fetch('/api/calculadora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orcamento_id: orcamentoId, itens: itensSel }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Erro ao adicionar itens'); return; }

      const titulo = orcamentoTitulo || orcamentos.find(o => o.id === orcamentoId)?.titulo || 'orçamento';
      toast.success(`${data.adicionados} item(s) adicionado(s) a "${titulo}"!`);
      if (data.erros?.length > 0) {
        toast.warning(`${data.erros.length} item(s) com erro: ${data.erros.join(', ')}`);
      }
      router.push(`/orcamentos/${orcamentoId}`);
    } catch {
      toast.error('Erro ao conectar com o servidor');
    } finally {
      setAplicando(false);
    }
  }, [orcamentoId, calcItems, selecionados, orcamentos, orcamentoTitulo, router]);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-start gap-4 mb-6 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link href="/orcamentos" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Calculadora de Quantitativos
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Informe os dados mínimos do projeto — o sistema calcula automaticamente os quantitativos para cada serviço.
          </p>
        </div>
      </div>

      {/* Seletor de orçamento */}
      <Card className="mb-6 border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 shrink-0">
              <FileIcon className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Orçamento de destino</span>
            </div>
            <div className="flex-1 min-w-48 max-w-sm">
              <Select
                value={orcamentoId}
                onValueChange={v => {
                  if (!v) return;
                  setOrcamentoId(v);
                  const orc = orcamentos.find(o => o.id === v);
                  setOrcamentoTitulo(orc?.titulo || '');
                }}>
                <SelectTrigger className="h-9 text-sm bg-background">
                  <SelectValue placeholder="Selecionar orçamento..." />
                </SelectTrigger>
                <SelectContent>
                  {orcamentos.map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.titulo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {orcamentoId && (
              <Link href={`/orcamentos/${orcamentoId}`}
                className="text-xs text-primary hover:underline flex items-center gap-1">
                <Check className="h-3 w-3" /> Selecionado
              </Link>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 flex items-start gap-1">
            <Info className="h-3 w-3 mt-0.5 shrink-0" />
            Os itens calculados serão adicionados a este orçamento com composições pré-vinculadas (custo automático).
          </p>
        </CardContent>
      </Card>

      {/* Conteúdo principal: parâmetros + preview */}
      <div className="grid xl:grid-cols-[1fr_360px] gap-6 items-start">
        {/* Parâmetros */}
        <div className="space-y-3">
          {CALC_GRUPOS.map(grupo => (
            <GrupoSection
              key={grupo.id}
              grupo={grupo}
              expanded={expandidos[grupo.id] ?? false}
              onToggle={() => toggleGrupo(grupo.id)}
              itensAtivos={itensPorGrupo[grupo.id] || 0}>
              {grupo.id === 'preliminares' && (
                <SecaoPreliminares params={params} setParams={setParams} />
              )}
              {grupo.id === 'fundacoes' && (
                <SecaoFundacoes params={params} setParams={setParams} />
              )}
              {grupo.id === 'pilares' && (
                <SecaoPilares pilares={pilares} setPilares={setPilares} />
              )}
              {grupo.id === 'vigas_ind' && (
                <SecaoVigas vigas={vigas} setVigas={setVigas} />
              )}
              {grupo.id === 'laje' && (
                <SecaoLaje lajes={lajes} setLajes={setLajes} />
              )}
              {grupo.id === 'estacas' && (
                <SecaoEstacas estacas={estacas} setEstacas={setEstacas} />
              )}
              {grupo.id === 'alvenaria' && (
                <SecaoAlvenaria params={params} setParams={setParams} vaos={vaos} setVaos={setVaos} />
              )}
              {grupo.id === 'esquadrias' && (
                <div className='p-3 rounded-lg border bg-amber-50/40 border-amber-200'>
                  <p className='text-xs text-amber-800 font-medium'>Gerado automaticamente dos vãos</p>
                  <p className='text-[11px] text-amber-700 mt-1'>Adicione portas e janelas na seção Alvenaria.</p>
                </div>
              )}
              {grupo.id === 'cobertura' && (
                <SecaoCobertura params={params} setParams={setParams} />
              )}
              {grupo.id === 'imperme' && (
                <SecaoImperme params={params} setParams={setParams} />
              )}
              {grupo.id === 'revest' && (
                <SecaoRevest params={params} setParams={setParams} />
              )}
              {grupo.id === 'forro' && (
                <SecaoForro params={params} setParams={setParams} />
              )}
              {grupo.id === 'pintura' && (
                <SecaoPintura params={params} setParams={setParams} />
              )}
              {grupo.id === 'pisos' && (
                <SecaoPisos params={params} setParams={setParams} />
              )}
              {grupo.id === 'acabamento' && (
                <SecaoAcabamento params={params} setParams={setParams} />
              )}
              {grupo.id === 'eletrica' && (
                <SecaoEletrica ambientes={ambientesEle} setAmbientes={setAmbientesEle} />
              )}
              {grupo.id === 'hidraulica' && (
                <SecaoHidraulica params={params} setParams={setParams} />
              )}
              {grupo.id === 'esgoto' && (
                <SecaoEsgoto params={params} setParams={setParams} />
              )}
              {grupo.id === 'banheiro' && (
                <SecaoBanheiro params={params} setParams={setParams} />
              )}
              {grupo.id === 'complementos' && (
                <SecaoComplementos />
              )}
            </GrupoSection>
          ))}
        </div>

        {/* Preview sticky */}
        <div className="xl:sticky xl:top-6">
          <PainelPreview
            items={calcItems}
            selecionados={selecionados}
            setSelecionados={setSelecionados}
            onAplicar={aplicar}
            aplicando={aplicando}
            orcamentoId={orcamentoId}
          />
        </div>
      </div>
    </div>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}

export default function CalculadoraPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh] text-muted-foreground text-sm">
        Carregando calculadora...
      </div>
    }>
      <CalculadoraContent />
    </Suspense>
  );
}
