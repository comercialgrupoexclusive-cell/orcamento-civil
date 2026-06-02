'use client';

import { useEffect, useState, useMemo, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, Plus, Trash2, Calculator, ChevronDown, ChevronRight,
  Check, Info, Zap, Search, X,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import type {
  CalcVao, CalcParamsRaw, CalcItem, CalcPilarItem, CalcVigaIndItem,
  CalcLajeItem, CalcEstacaItem, CalcAmbiente, TipoAmbiente, Composicao,
} from '@/lib/types';
import {
  CALC_GRUPOS, calcularQuantitativos, derivarParams,
} from '@/lib/calc-engine';

// --- Utilitarios ---
function normalizeStr(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
// --- CompositionSearch ---
function CompositionSearch({
  etapaCodigo, composicoes, value, onChange, placeholder = 'Selecionar composicao...',
}: {
  etapaCodigo: string; composicoes: Composicao[]; value: string | null;
  onChange: (id: string) => void; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const norm = normalizeStr(search);
    if (!norm) return [];
    return composicoes
      .filter(c => c.status === 'ativo')
      .filter(c => normalizeStr(c.descricao).includes(norm) || normalizeStr(c.codigo).includes(norm))
      .slice(0, 20);
  }, [composicoes, search]);

  const selected = composicoes.find(c => c.id === value);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function selectItem(c: Composicao) { onChange(c.id); setSearch(''); setOpen(false); }
  function clear(e: React.MouseEvent) { e.stopPropagation(); onChange(''); setSearch(''); }

  return (
    <div ref={ref} className="relative w-full">
      <div
        className={`flex items-center gap-1.5 h-8 px-2 border rounded-md bg-background cursor-text text-xs ${open ? 'border-primary ring-1 ring-primary/30' : 'border-input hover:border-muted-foreground/50'}`}
        onClick={() => setOpen(true)}>
        <Search className="h-3 w-3 text-muted-foreground shrink-0" />
        {open ? (
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
            placeholder={selected ? selected.descricao : placeholder}
            className="flex-1 bg-transparent outline-none text-xs placeholder:text-muted-foreground min-w-0" />
        ) : (
          <span className={`flex-1 truncate ${selected ? 'text-foreground' : 'text-muted-foreground'}`}>
            {selected ? selected.descricao : placeholder}
          </span>
        )}
        {selected && !open && (
          <button onClick={clear} className="shrink-0 text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
        )}
        {!open && <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />}
      </div>
      {open && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-xs text-muted-foreground text-center">
              {search ? `Nenhum resultado para "${search}"` : 'Digite para buscar composicoes...'}
            </div>
          ) : (
            filtered.map(c => (
              <button key={c.id} onClick={() => selectItem(c)}
                className={`w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-muted/60 transition-colors ${c.id === value ? 'bg-primary/5 border-l-2 border-primary' : ''}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium leading-tight truncate">{c.descricao}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Cod. {c.codigo} &middot; {c.unidade_producao}
                    {c.custo_unitario ? ` · R$ ${c.custo_unitario.toFixed(2)}` : ''}
                  </p>
                </div>
                {c.id === value && <Check className="h-3 w-3 text-primary shrink-0 mt-0.5" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
// --- InputNum ---
function InputNum({ label, campo, params, setParams, placeholder, min = 0, step = 0.01, helper, suffix }: { label: string; campo: keyof CalcParamsRaw; params: Partial<CalcParamsRaw>; setParams: (fn: (p: Partial<CalcParamsRaw>) => Partial<CalcParamsRaw>) => void; placeholder?: string; min?: number; step?: number; helper?: string; suffix?: string }) {
  const val = params[campo];
  return (
    <div className="grid gap-1">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="relative">
        <Input type="number" min={min} step={step} value={val ?? ''} onFocus={e => e.target.select()}
          onChange={e => { const n = e.target.value === '' ? undefined : Number(e.target.value); setParams(p => ({ ...p, [campo]: n })); }}
          placeholder={placeholder || '0'} className={`h-9 text-sm ${suffix ? 'pr-10' : ''}`} />
        {suffix && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">{suffix}</span>}
      </div>
      {helper && <p className="text-[11px] text-muted-foreground">{helper}</p>}
    </div>
  );
}

// --- Ambientes (espelho) — defaults por tipo ---
const AMBIENTES_DEFAULTS: Record<string, Omit<CalcAmbiente, 'id' | 'nome'>> = {
  Quarto:           { tipo: 'quarto',       qtd: 1, area: 12, comp_parede: 14, pe_direito: 2.8, area_molhada: false, tomadas: 3, tomadas_duplas: 0, interruptores: 1, luminarias: 1, pontos_agua: 0, pontos_esgoto: 0 },
  Sala:             { tipo: 'sala',         qtd: 1, area: 20, comp_parede: 18, pe_direito: 2.8, area_molhada: false, tomadas: 4, tomadas_duplas: 1, interruptores: 1, luminarias: 2, pontos_agua: 0, pontos_esgoto: 0 },
  Cozinha:          { tipo: 'cozinha',      qtd: 1, area: 12, comp_parede: 14, pe_direito: 2.8, area_molhada: true,  tomadas: 2, tomadas_duplas: 2, interruptores: 1, luminarias: 1, pontos_agua: 2, pontos_esgoto: 2 },
  Banheiro:         { tipo: 'banheiro',     qtd: 1, area: 4,  comp_parede: 8,  pe_direito: 2.8, area_molhada: true,  tomadas: 1, tomadas_duplas: 0, interruptores: 1, luminarias: 1, pontos_agua: 2, pontos_esgoto: 2 },
  'Área de Serviço':{ tipo: 'area_servico', qtd: 1, area: 6,  comp_parede: 10, pe_direito: 2.8, area_molhada: true,  tomadas: 2, tomadas_duplas: 0, interruptores: 1, luminarias: 1, pontos_agua: 2, pontos_esgoto: 2 },
  Outro:            { tipo: 'outro',        qtd: 1, area: 10, comp_parede: 12, pe_direito: 2.8, area_molhada: false, tomadas: 3, tomadas_duplas: 0, interruptores: 1, luminarias: 1, pontos_agua: 0, pontos_esgoto: 0 },
};
const TIPO_AMB_LABEL: Record<TipoAmbiente, string> = {
  quarto: 'Quarto', sala: 'Sala', cozinha: 'Cozinha', banheiro: 'Banheiro', area_servico: 'Área de Serviço', outro: 'Outro',
};

function AmbientesEditor({ ambientes, setAmbientes, modo }: {
  ambientes: CalcAmbiente[]; setAmbientes: (v: CalcAmbiente[]) => void;
  modo: 'full' | 'eletrica' | 'hidro' | 'loucas';
}) {
  function add(nome: string) {
    const def = AMBIENTES_DEFAULTS[nome] ?? AMBIENTES_DEFAULTS['Outro'];
    setAmbientes([...ambientes, { id: Math.random().toString(36).slice(2), nome, ...def }]);
  }
  function remove(id: string) { setAmbientes(ambientes.filter(a => a.id !== id)); }
  function upd<K extends keyof CalcAmbiente>(id: string, f: K, v: CalcAmbiente[K]) {
    setAmbientes(ambientes.map(a => a.id === id ? { ...a, [f]: v } : a));
  }
  const numIn = (id: string, f: keyof CalcAmbiente, min = 0, step = 1) => (
    <input type="number" min={min} step={step} value={ambientes.find(a => a.id === id)?.[f] as number ?? 0}
      onFocus={e => e.target.select()} onChange={e => upd(id, f, Number(e.target.value) as never)}
      className="h-7 text-xs border rounded px-2 text-center w-full block" />
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {Object.keys(AMBIENTES_DEFAULTS).map(nome => (
          <Button key={nome} size="sm" variant="outline" className="h-7 text-xs" onClick={() => add(nome)}>
            <Plus className="h-3 w-3 mr-1" />{nome}
          </Button>
        ))}
      </div>
      {ambientes.length === 0
        ? <div className="border border-dashed rounded-lg py-3 text-center text-xs text-muted-foreground">Nenhum ambiente — opcional. Se cadastrar, alimenta elétrica, hidro, louças, impermeabilização e cerâmica.</div>
        : <div className="border rounded-lg overflow-auto"><table className="w-full text-xs min-w-[620px]">
            <thead><tr className="bg-muted/50 border-b">
              <th className="text-left px-3 py-2 w-28">Ambiente</th>
              <th className="text-center px-2 py-2 w-12">Qtd</th>
              {modo === 'full' && <><th className="text-center px-2 py-2">Tipo</th><th className="text-center px-2 py-2">Área m²</th><th className="text-center px-2 py-2">Parede m</th><th className="text-center px-2 py-2">Pé-dir.</th><th className="text-center px-2 py-2">Molh.</th></>}
              {modo === 'eletrica' && <><th className="text-center px-2 py-2">Tom.S</th><th className="text-center px-2 py-2">Tom.D</th><th className="text-center px-2 py-2">Int.</th><th className="text-center px-2 py-2">Lum.</th></>}
              {modo === 'hidro' && <><th className="text-center px-2 py-2">Pts Água</th><th className="text-center px-2 py-2">Pts Esgoto</th><th className="text-center px-2 py-2">Molh.</th></>}
              {modo === 'loucas' && <><th className="text-center px-2 py-2">Tipo</th></>}
              <th className="w-8"></th>
            </tr></thead>
            <tbody>{ambientes.map(a => (
              <tr key={a.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-2 py-1"><input type="text" value={a.nome} onChange={e => upd(a.id, 'nome', e.target.value)} className="h-7 text-xs border rounded px-2 w-full" /></td>
                <td className="px-2 py-1">{numIn(a.id, 'qtd', 1)}</td>
                {modo === 'full' && <>
                  <td className="px-2 py-1">
                    <Select value={a.tipo} onValueChange={v => upd(a.id, 'tipo', v as TipoAmbiente)}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{(Object.keys(TIPO_AMB_LABEL) as TipoAmbiente[]).map(t => <SelectItem key={t} value={t}>{TIPO_AMB_LABEL[t]}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="px-2 py-1">{numIn(a.id, 'area', 0, 0.5)}</td>
                  <td className="px-2 py-1">{numIn(a.id, 'comp_parede', 0, 0.5)}</td>
                  <td className="px-2 py-1">{numIn(a.id, 'pe_direito', 0, 0.05)}</td>
                  <td className="px-2 py-1 text-center"><input type="checkbox" checked={a.area_molhada} onChange={e => upd(a.id, 'area_molhada', e.target.checked)} className="h-4 w-4 accent-primary" /></td>
                </>}
                {modo === 'eletrica' && <>
                  <td className="px-2 py-1">{numIn(a.id, 'tomadas')}</td>
                  <td className="px-2 py-1">{numIn(a.id, 'tomadas_duplas')}</td>
                  <td className="px-2 py-1">{numIn(a.id, 'interruptores')}</td>
                  <td className="px-2 py-1">{numIn(a.id, 'luminarias')}</td>
                </>}
                {modo === 'hidro' && <>
                  <td className="px-2 py-1">{numIn(a.id, 'pontos_agua')}</td>
                  <td className="px-2 py-1">{numIn(a.id, 'pontos_esgoto')}</td>
                  <td className="px-2 py-1 text-center"><input type="checkbox" checked={a.area_molhada} onChange={e => upd(a.id, 'area_molhada', e.target.checked)} className="h-4 w-4 accent-primary" /></td>
                </>}
                {modo === 'loucas' && <td className="px-2 py-1">
                <Select value={a.tipo} onValueChange={v => upd(a.id, 'tipo', v as TipoAmbiente)}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(TIPO_AMB_LABEL) as TipoAmbiente[]).map(t => <SelectItem key={t} value={t}>{TIPO_AMB_LABEL[t]}</SelectItem>)}</SelectContent>
                </Select>
              </td>}
                <td className="px-1 py-1"><button onClick={() => remove(a.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button></td>
              </tr>
            ))}</tbody>
          </table></div>
      }
    </div>
  );
}

// --- SecaoLoucas (louças e metais — resumo derivado dos ambientes) ---
function SecaoLoucas({ ambientes, setAmbientes }: { ambientes: CalcAmbiente[]; setAmbientes: (v: CalcAmbiente[]) => void }) {
  const nBanheiros = ambientes.filter(a => a.tipo === 'banheiro').reduce((s, a) => s + (a.qtd || 1), 0);
  const nCozinhas = ambientes.filter(a => a.tipo === 'cozinha').reduce((s, a) => s + (a.qtd || 1), 0);
  const nMolhadas = ambientes.filter(a => a.area_molhada).reduce((s, a) => s + (a.qtd || 1), 0);
  const itens = [
    { label: 'Vaso sanitário (bacia c/ caixa)', qtd: nBanheiros },
    { label: 'Lavatório / pia com pedestal', qtd: nBanheiros },
    { label: 'Pia / cuba de cozinha', qtd: nCozinhas },
    { label: 'Chuveiro', qtd: nBanheiros },
    { label: 'Torneiras e registros (metais)', qtd: nBanheiros + nCozinhas },
    { label: 'Tanque (área de serviço)', qtd: Math.max(0, nMolhadas - nBanheiros - nCozinhas) },
  ];
  return (
    <div className="space-y-3">
      <AmbientesEditor ambientes={ambientes} setAmbientes={setAmbientes} modo="loucas" />
      {(nBanheiros + nCozinhas) > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Quantidades sugeridas</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {itens.filter(i => i.qtd > 0).map(i => (
              <div key={i.label} className="flex items-center justify-between rounded-lg border bg-amber-50 border-amber-300 px-3 py-1.5">
                <span className="text-xs text-amber-900">{i.label}</span>
                <span className="text-sm font-bold text-amber-800">{i.qtd}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">No painel: <strong>Louças</strong> (kit por banheiro) e <strong>Metais</strong> entram com a quantidade sugerida — edite no orçamento se precisar.</p>
        </div>
      ) : (
        <div className="text-[11px] text-muted-foreground">Cadastre ambientes do tipo <strong>banheiro</strong> ou <strong>cozinha</strong> (acima ou em Dados do Projeto) para sugerir louças e metais.</div>
      )}
    </div>
  );
}

// --- Campo obrigatório com asterisco e destaque quando vazio ---
function InputNumReq({ label, campo, params, setParams, suffix, step, placeholder, helper }: Parameters<typeof InputNum>[0]) {
  const vazio = !params[campo];
  return (
    <div className="grid gap-1">
      <Label className="text-xs font-medium flex items-center gap-1">
        {label}
        <span className="text-destructive font-bold">*</span>
        {vazio && <span className="text-[10px] text-amber-600 font-normal">(obrigatório)</span>}
      </Label>
      <div className="relative">
        <Input type="number" min={0} step={step ?? 0.01}
          value={params[campo] ?? ''}
          onFocus={e => e.target.select()}
          onChange={e => { const n = e.target.value === '' ? undefined : Number(e.target.value); setParams(p => ({ ...p, [campo]: n })); }}
          placeholder={placeholder || '0'}
          className={`h-9 text-sm ${suffix ? 'pr-10' : ''} ${vazio ? 'border-amber-400 bg-amber-50/40 focus:border-amber-500' : 'border-green-400 bg-green-50/30'}`} />
        {suffix && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">{suffix}</span>}
      </div>
      {helper && <p className="text-[11px] text-muted-foreground">{helper}</p>}
    </div>
  );
}

// --- SecaoPreliminares (Dados do Projeto) ---
function SecaoPreliminares({ params, setParams, ambientes, setAmbientes }: {
  params: Partial<CalcParamsRaw>; setParams: (fn: (p: Partial<CalcParamsRaw>) => Partial<CalcParamsRaw>) => void;
  ambientes: CalcAmbiente[]; setAmbientes: (v: CalcAmbiente[]) => void;
}) {
  const camposObrig: Array<keyof CalcParamsRaw> = ['area_construida','area_terreno','perimetro_terreno','perimetro_paredes','perimetro_externo','comp_paredes_internas','pe_direito'];
  const preenchidos = camposObrig.filter(c => params[c] && (params[c] as number) > 0).length;
  return (
    <div className="space-y-4">
      {/* Barra de progresso dos campos obrigatórios */}
      <div className="flex items-center gap-2 text-xs">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${preenchidos === camposObrig.length ? 'bg-green-500' : 'bg-amber-400'}`}
            style={{ width: `${(preenchidos / camposObrig.length) * 100}%` }} />
        </div>
        <span className={`shrink-0 font-medium ${preenchidos === camposObrig.length ? 'text-green-600' : 'text-amber-600'}`}>
          {preenchidos}/{camposObrig.length} campos
        </span>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <InputNumReq label="Área Construída Total" campo="area_construida" params={params} setParams={setParams} suffix="m²" step={1} />
        <InputNumReq label="Área Terreno" campo="area_terreno" params={params} setParams={setParams} suffix="m²" step={1} />
        <InputNumReq label="Perímetro Terreno" campo="perimetro_terreno" params={params} setParams={setParams} suffix="m" step={0.5} helper="Para tapumes" />
        <InputNumReq label="Perímetro de Paredes" campo="perimetro_paredes" params={params} setParams={setParams} suffix="m" step={0.5} helper="Total de paredes" />
        <InputNumReq label="Perímetro Externo Edificação" campo="perimetro_externo" params={params} setParams={setParams} suffix="m" step={0.5} />
        <InputNumReq label="Comprimento Paredes Internas" campo="comp_paredes_internas" params={params} setParams={setParams} suffix="m" step={0.5} />
        <InputNumReq label="Pé Direito" campo="pe_direito" params={params} setParams={setParams} suffix="m" step={0.05} placeholder="2.80" />
      </div>
      <div className="border-t pt-4">
        <div className="flex items-center gap-2 mb-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ambientes (opcional)</p>
          <span className="text-[10px] text-muted-foreground">— espelho: alimenta elétrica, hidro, louças, impermeabilização e cerâmica</span>
        </div>
        <AmbientesEditor ambientes={ambientes} setAmbientes={setAmbientes} modo="full" />
      </div>
    </div>
  );
}

// --- SecaoFundacoes ---
const OPCOES_SECAO = [
  { label: '15 x 30 cm', b: 0.15, h: 0.30 }, { label: '20 x 40 cm', b: 0.20, h: 0.40 },
  { label: '20 x 50 cm', b: 0.20, h: 0.50 }, { label: '20 x 60 cm', b: 0.20, h: 0.60 },
  { label: '25 x 50 cm', b: 0.25, h: 0.50 }, { label: '25 x 60 cm', b: 0.25, h: 0.60 },
  { label: '30 x 60 cm', b: 0.30, h: 0.60 }, { label: 'Personalizada', b: 0, h: 0 },
];
function SecaoFundacoes({ params, setParams }: { params: Partial<CalcParamsRaw>; setParams: (fn: (p: Partial<CalcParamsRaw>) => Partial<CalcParamsRaw>) => void }) {
  const [custom, setCustom] = useState(false);
  const key = useMemo(() => {
    if (!params.secao_b || !params.secao_h) return '';
    return OPCOES_SECAO.find(o => o.b === params.secao_b && o.h === params.secao_h)?.label ?? 'Personalizada';
  }, [params.secao_b, params.secao_h]);
  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <InputNum label="Comprimento total de vigas" campo="comp_vigas" params={params} setParams={setParams} suffix="m" step={0.5} />
        <div className="grid gap-1"><Label className="text-xs font-medium">Secao da viga (b x h)</Label>
          <Select value={key} onValueChange={v => { const o = OPCOES_SECAO.find(x => x.label === v); if (!o) return; if (o.label === 'Personalizada') setCustom(true); else { setCustom(false); setParams(p => ({ ...p, secao_b: o.b, secao_h: o.h })); } }}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar seccao..." /></SelectTrigger>
            <SelectContent>{OPCOES_SECAO.map(o => <SelectItem key={o.label} value={o.label}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      {(custom || key === 'Personalizada') && (
        <div className="grid grid-cols-2 gap-3 p-3 border rounded-lg bg-muted/30">
          <InputNum label="Largura b (m)" campo="secao_b" params={params} setParams={setParams} suffix="m" step={0.01} />
          <InputNum label="Altura h (m)" campo="secao_h" params={params} setParams={setParams} suffix="m" step={0.01} />
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        <InputNum label="No. barras longitudinais" campo="n_barras_long" params={params} setParams={setParams} min={2} step={1} placeholder="4" />
        <div className="grid gap-1"><Label className="text-xs font-medium">Bitola do ferro longitudinal</Label>
          <Select value={params.bitola_baldrame ? String(params.bitola_baldrame) : '8'} onValueChange={v => setParams(p => ({ ...p, bitola_baldrame: Number(v) }))}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="6.3">6,3 mm</SelectItem>
              <SelectItem value="8">8,0 mm</SelectItem>
              <SelectItem value="10">10,0 mm</SelectItem>
              <SelectItem value="12.5">12,5 mm</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <InputNum label="Espacamento estribos" campo="esp_estribo" params={params} setParams={setParams} suffix="m" placeholder="0.15" step={0.05} />
        <div className="grid gap-1"><Label className="text-xs font-medium">Largura da tabua (forma)</Label>
          <Select value={params.tabua_larg ? String(params.tabua_larg) : ''} onValueChange={v => setParams(p => ({ ...p, tabua_larg: Number(v) }))}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0.15">Tabua 15 cm</SelectItem>
              <SelectItem value="0.20">Tabua 20 cm</SelectItem>
              <SelectItem value="0.30">Tabua 30 cm</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

// --- SecaoEstacas ---
function SecaoEstacas({ estacas, setEstacas }: { estacas: CalcEstacaItem[]; setEstacas: (v: CalcEstacaItem[]) => void }) {
  function add() { setEstacas([...estacas, { id: Math.random().toString(36).slice(2), desc: '', qtd: 1, prof: 3, blocos: 1 }]); }
  function remove(id: string) { setEstacas(estacas.filter(e => e.id !== id)); }
  function upd<K extends keyof CalcEstacaItem>(id: string, f: K, v: CalcEstacaItem[K]) { setEstacas(estacas.map(e => e.id === id ? { ...e, [f]: v } : e)); }
  const totalEquiv = estacas.reduce((s, e) => s + e.qtd * (e.prof / 3), 0);
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">Profundidade livre em metros. Equiv. = Sigma qtd x prof / 3.</p>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={add}><Plus className="h-3 w-3 mr-1" /> Estaca</Button>
      </div>
      {estacas.length === 0 ? <div className="border border-dashed rounded-lg py-3 text-center text-xs text-muted-foreground">Nenhuma estaca</div>
        : <div className="border rounded-lg overflow-auto"><table className="w-full text-xs min-w-[480px]">
            <thead><tr className="bg-muted/50 border-b"><th className="text-left px-3 py-2">Desc.</th><th className="text-center px-2 py-2 w-14">Qtd</th><th className="text-center px-2 py-2">Prof.(m)</th><th className="text-center px-2 py-2">Blocos</th><th className="text-right px-2 py-2">Equiv.</th><th className="w-8"></th></tr></thead>
            <tbody>{estacas.map(e => (
              <tr key={e.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-2 py-1"><input type="text" value={e.desc} onChange={ev => upd(e.id,'desc',ev.target.value)} placeholder="E1" className="h-7 text-xs border rounded px-2 w-full" /></td>
                <td className="px-2 py-1"><input type="number" min={1} step={1} value={e.qtd} onFocus={ev=>ev.target.select()} onChange={ev=>upd(e.id,'qtd',Number(ev.target.value))} className="h-7 text-xs border rounded px-2 text-center w-full block" /></td>
                <td className="px-2 py-1"><input type="number" min={0.5} step={0.5} value={e.prof} onFocus={ev=>ev.target.select()} onChange={ev=>upd(e.id,'prof',Number(ev.target.value))} className="h-7 text-xs border rounded px-2 text-center w-full block" /></td>
                <td className="px-2 py-1"><input type="number" min={0} step={1} value={e.blocos} onFocus={ev=>ev.target.select()} onChange={ev=>upd(e.id,'blocos',Number(ev.target.value))} className="h-7 text-xs border rounded px-2 text-center w-full block" /></td>
                <td className="px-2 py-1 text-right font-semibold text-blue-700">{(e.qtd*(e.prof/3)).toFixed(2)}</td>
                <td className="px-1 py-1"><button onClick={()=>remove(e.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3"/></button></td>
              </tr>
            ))}</tbody>
          </table></div>
      }
      {estacas.length > 0 && <p className="text-xs text-blue-700 font-medium">Total equiv.: {totalEquiv.toFixed(2)} un de 3 m</p>}
    </div>
  );
}
// --- SecaoAlvenaria ---
function SecaoAlvenaria({ params, setParams, vaos, setVaos }: { params: Partial<CalcParamsRaw>; setParams: (fn: (p: Partial<CalcParamsRaw>) => Partial<CalcParamsRaw>) => void; vaos: CalcVao[]; setVaos: (v: CalcVao[]) => void }) {
  function addVao(tipo: 'porta' | 'janela') { const d = tipo === 'porta' ? { largura: 0.90, altura: 2.10 } : { largura: 1.20, altura: 1.20 }; setVaos([...vaos, { id: Math.random().toString(36).slice(2), tipo, qtd: 1, ...d }]); }
  function updVao<K extends keyof CalcVao>(id: string, f: K, v: CalcVao[K]) { setVaos(vaos.map(x => x.id === id ? { ...x, [f]: v } : x)); }
  const derived = derivarParams(params, vaos);
  // comp_paredes efetivo = manual ou fallback do perimetro_paredes
  const compParedesEfetivo = params.comp_paredes ?? params.perimetro_paredes;
  const bruta = (compParedesEfetivo || 0) * (params.alt_paredes || 0);
  const liquida = Math.max(0, bruta - (derived.area_vaos || 0));
  const comCinta = (params.cinta_coroamento ?? 0) === 1;

  // derived para SugEdit de comp_paredes: sugestão = perimetro_paredes
  const derivedAlv: Partial<CalcParamsRaw> = { ...derived, comp_paredes: params.perimetro_paredes };

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        <SugEdit label="Comprimento total de paredes" campo="comp_paredes" params={params} setParams={setParams} derived={derivedAlv} unidade="m" obs="Sugerido = Perímetro de Paredes (Dados do Projeto)" />
        <InputNum label="Altura das paredes" campo="alt_paredes" params={params} setParams={setParams} suffix="m" step={0.05} placeholder="2.80" />
        <div className="grid gap-1"><Label className="text-xs font-medium">Tipo de alvenaria</Label>
          <Select value={String(params.tipo_alv ?? 2)} onValueChange={v => setParams(p => ({ ...p, tipo_alv: Number(v) }))}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="2">Estrutural</SelectItem><SelectItem value="1">Vedacao</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      {bruta > 0 && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-lg border bg-muted/30 px-3 py-2"><p className="text-muted-foreground">Area bruta</p><p className="font-bold">{bruta.toFixed(2)} m2</p></div>
          <div className="rounded-lg border bg-red-50 border-red-200 px-3 py-2"><p className="text-red-600">Vaos (-)</p><p className="font-bold text-red-700">{(derived.area_vaos||0).toFixed(2)} m2</p></div>
          <div className="rounded-lg border bg-green-50 border-green-200 px-3 py-2"><p className="text-green-700">Area liquida</p><p className="font-bold text-green-800">{liquida.toFixed(2)} m2</p></div>
        </div>
      )}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vaos</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addVao('porta')}><Plus className="h-3 w-3 mr-1" /> Porta</Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addVao('janela')}><Plus className="h-3 w-3 mr-1" /> Janela</Button>
          </div>
        </div>
        {vaos.length === 0 ? <div className="border border-dashed rounded-lg py-3 text-center text-xs text-muted-foreground">Sem vaos</div>
          : <div className="border rounded-lg overflow-auto"><table className="w-full text-xs min-w-[500px]">
              <thead><tr className="bg-muted/50 border-b"><th className="text-left px-3 py-2 w-24">Tipo</th><th className="text-center px-2 py-2 w-14">Qtd</th><th className="text-center px-2 py-2">Larg.(m)</th><th className="text-center px-2 py-2">Alt.(m)</th><th className="text-right px-2 py-2">Area</th><th className="w-8"></th></tr></thead>
              <tbody>{vaos.map(v => (
                <tr key={v.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-1.5"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${v.tipo === 'porta' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-violet-50 border-violet-200 text-violet-700'}`}>{v.tipo}</span></td>
                  <td className="px-2 py-1.5"><input type="number" min={1} step={1} value={v.qtd} onFocus={e=>e.target.select()} onChange={e=>updVao(v.id,'qtd',Number(e.target.value))} className="h-7 text-xs border rounded px-2 text-center w-full" /></td>
                  <td className="px-2 py-1.5"><input type="number" min={0} step={0.05} value={v.largura} onFocus={e=>e.target.select()} onChange={e=>updVao(v.id,'largura',Number(e.target.value))} className="h-7 text-xs border rounded px-2 text-center w-full" /></td>
                  <td className="px-2 py-1.5"><input type="number" min={0} step={0.05} value={v.altura} onFocus={e=>e.target.select()} onChange={e=>updVao(v.id,'altura',Number(e.target.value))} className="h-7 text-xs border rounded px-2 text-center w-full" /></td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{(v.qtd*v.largura*v.altura).toFixed(2)} m2</td>
                  <td className="px-1 py-1.5"><button onClick={() => setVaos(vaos.filter(x => x.id !== v.id))} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3"/></button></td>
                </tr>
              ))}</tbody>
            </table></div>
        }
      </div>

      {/* Cinta de coroamento (opcional) */}
      <div className={`rounded-lg border p-3 space-y-2 transition-colors ${comCinta ? 'border-orange-300 bg-orange-50/40' : 'border-dashed border-border bg-muted/20'}`}>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={comCinta}
            onChange={e => setParams(p => ({ ...p, cinta_coroamento: e.target.checked ? 1 : 0 }))}
            className="h-4 w-4 accent-primary" />
          <span className="text-xs font-semibold">Incluir Cinta Superior de Coroamento</span>
          <span className="text-[10px] text-muted-foreground">— Cinta de Coroamento em Canaleta Cerâmica</span>
        </label>
        {comCinta && (
          <div className="ml-6">
            <SugEdit
              label="Comprimento da cinta (perímetro de paredes)"
              campo="comp_paredes"
              params={params}
              setParams={setParams}
              derived={derivedAlv}
              unidade="m"
              obs="Sugerido = Perímetro de Paredes (Dados do Projeto)"
            />
          </div>
        )}
      </div>
    </div>
  );
}
// --- Secoes de tabela: Pilares, Vigas, Lajes ---
function SecaoPilares({ pilares, setPilares }: { pilares: CalcPilarItem[]; setPilares: (v: CalcPilarItem[]) => void }) {
  function add() { setPilares([...pilares, { id: Math.random().toString(36).slice(2), desc: '', qtd: 1, l1: 0.15, l2: 0.30, h: 3.0 }]); }
  function remove(id: string) { setPilares(pilares.filter(p => p.id !== id)); }
  function upd<K extends keyof CalcPilarItem>(id: string, f: K, v: CalcPilarItem[K]) { setPilares(pilares.map(p => p.id === id ? { ...p, [f]: v } : p)); }
  const totalConc = pilares.reduce((s, p) => s + p.qtd * p.l1 * p.l2 * p.h, 0);
  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button size="sm" variant="outline" className="h-7 text-xs" onClick={add}><Plus className="h-3 w-3 mr-1" /> Pilar</Button></div>
      {pilares.length === 0 ? <div className="border border-dashed rounded-lg py-3 text-center text-xs text-muted-foreground">Nenhum pilar</div>
        : <div className="border rounded-lg overflow-auto"><table className="w-full text-xs min-w-[520px]">
            <thead><tr className="bg-muted/50 border-b"><th className="px-3 py-2 text-left">Ref.</th><th className="px-2 py-2 text-center">Qtd</th><th className="px-2 py-2 text-center">L1(m)</th><th className="px-2 py-2 text-center">L2(m)</th><th className="px-2 py-2 text-center">H(m)</th><th className="px-2 py-2 text-right">Concreto</th><th className="w-8"></th></tr></thead>
            <tbody>{pilares.map(p => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-2 py-1"><input type="text" value={p.desc} onChange={e=>upd(p.id,'desc',e.target.value)} placeholder="P1" className="h-7 text-xs border rounded px-2 w-full"/></td>
                <td className="px-2 py-1"><input type="number" min={1} step={1} value={p.qtd} onFocus={e=>e.target.select()} onChange={e=>upd(p.id,'qtd',Number(e.target.value))} className="h-7 text-xs border rounded px-2 text-center w-full block"/></td>
                <td className="px-2 py-1"><input type="number" min={0} step={0.05} value={p.l1} onFocus={e=>e.target.select()} onChange={e=>upd(p.id,'l1',Number(e.target.value))} className="h-7 text-xs border rounded px-2 text-center w-full block"/></td>
                <td className="px-2 py-1"><input type="number" min={0} step={0.05} value={p.l2} onFocus={e=>e.target.select()} onChange={e=>upd(p.id,'l2',Number(e.target.value))} className="h-7 text-xs border rounded px-2 text-center w-full block"/></td>
                <td className="px-2 py-1"><input type="number" min={0} step={0.1} value={p.h} onFocus={e=>e.target.select()} onChange={e=>upd(p.id,'h',Number(e.target.value))} className="h-7 text-xs border rounded px-2 text-center w-full block"/></td>
                <td className="px-2 py-1 text-right font-semibold text-green-700">{(p.qtd*p.l1*p.l2*p.h).toFixed(3)} m3</td>
                <td className="px-1 py-1"><button onClick={()=>remove(p.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3"/></button></td>
              </tr>
            ))}</tbody>
          </table></div>
      }
      {pilares.length > 0 && <p className="text-xs text-green-700 font-medium">Concreto total: {totalConc.toFixed(3)} m3</p>}
    </div>
  );
}
function SecaoVigas({ vigas, setVigas }: { vigas: CalcVigaIndItem[]; setVigas: (v: CalcVigaIndItem[]) => void }) {
  function add() { setVigas([...vigas, { id: Math.random().toString(36).slice(2), desc: '', b: 0.15, h: 0.30, comp: 10, tipo: 'sob_parede', esp_escoras: 1.0 }]); }
  function remove(id: string) { setVigas(vigas.filter(v => v.id !== id)); }
  function upd<K extends keyof CalcVigaIndItem>(id: string, f: K, v: CalcVigaIndItem[K]) { setVigas(vigas.map(x => x.id === id ? { ...x, [f]: v } : x)); }
  const totalConc = vigas.reduce((s, v) => s + v.b * v.h * v.comp, 0);
  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button size="sm" variant="outline" className="h-7 text-xs" onClick={add}><Plus className="h-3 w-3 mr-1" /> Viga</Button></div>
      {vigas.length === 0 ? <div className="border border-dashed rounded-lg py-3 text-center text-xs text-muted-foreground">Nenhuma viga</div>
        : <div className="border rounded-lg overflow-auto"><table className="w-full text-xs min-w-[560px]">
            <thead><tr className="bg-muted/50 border-b"><th className="px-3 py-2 text-left">Ref.</th><th className="px-2 py-2 text-center">b(m)</th><th className="px-2 py-2 text-center">h(m)</th><th className="px-2 py-2 text-center">Total(m)</th><th className="px-2 py-2 text-center w-24">Tipo</th><th className="px-2 py-2 text-right">Concreto</th><th className="w-8"></th></tr></thead>
            <tbody>{vigas.map(v => (
              <tr key={v.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-2 py-1"><input type="text" value={v.desc} onChange={e=>upd(v.id,'desc',e.target.value)} placeholder="V1" className="h-7 text-xs border rounded px-2 w-full"/></td>
                <td className="px-2 py-1"><input type="number" min={0} step={0.05} value={v.b} onFocus={e=>e.target.select()} onChange={e=>upd(v.id,'b',Number(e.target.value))} className="h-7 text-xs border rounded px-2 text-center w-full block"/></td>
                <td className="px-2 py-1"><input type="number" min={0} step={0.05} value={v.h} onFocus={e=>e.target.select()} onChange={e=>upd(v.id,'h',Number(e.target.value))} className="h-7 text-xs border rounded px-2 text-center w-full block"/></td>
                <td className="px-2 py-1"><input type="number" min={0} step={0.5} value={v.comp} onFocus={e=>e.target.select()} onChange={e=>upd(v.id,'comp',Number(e.target.value))} className="h-7 text-xs border rounded px-2 text-center w-full block"/></td>
                <td className="px-2 py-1">
                  <Select value={v.tipo} onValueChange={val=>upd(v.id,'tipo',val as 'sob_parede'|'aerea')}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue/></SelectTrigger>
                    <SelectContent><SelectItem value="sob_parede">Sob parede</SelectItem><SelectItem value="aerea">Aérea</SelectItem></SelectContent>
                  </Select>
                </td>
                <td className="px-2 py-1 text-right font-semibold text-violet-700">{(v.b*v.h*v.comp).toFixed(3)} m3</td>
                <td className="px-1 py-1"><button onClick={()=>remove(v.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3"/></button></td>
              </tr>
            ))}</tbody>
          </table></div>
      }
      {vigas.length > 0 && <p className="text-xs text-violet-700 font-medium">Concreto total: {totalConc.toFixed(3)} m3</p>}
    </div>
  );
}
function SecaoLaje({ lajes, setLajes }: { lajes: CalcLajeItem[]; setLajes: (v: CalcLajeItem[]) => void }) {
  function add() { setLajes([...lajes, { id: Math.random().toString(36).slice(2), desc: '', qtd: 1, comp: 5.0, larg: 4.0, esp: 0.10 }]); }
  function remove(id: string) { setLajes(lajes.filter(l => l.id !== id)); }
  function upd<K extends keyof CalcLajeItem>(id: string, f: K, v: CalcLajeItem[K]) { setLajes(lajes.map(l => l.id === id ? { ...l, [f]: v } : l)); }
  const totalArea = lajes.reduce((s, l) => s + l.qtd * l.comp * l.larg, 0);
  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button size="sm" variant="outline" className="h-7 text-xs" onClick={add}><Plus className="h-3 w-3 mr-1" /> Laje</Button></div>
      {lajes.length === 0 ? <div className="border border-dashed rounded-lg py-3 text-center text-xs text-muted-foreground">Nenhuma laje</div>
        : <div className="border rounded-lg overflow-auto"><table className="w-full text-xs min-w-[520px]">
            <thead><tr className="bg-muted/50 border-b"><th className="px-3 py-2 text-left">Ref.</th><th className="px-2 py-2 text-center">Qtd</th><th className="px-2 py-2 text-center">Comp(m)</th><th className="px-2 py-2 text-center">Larg(m)</th><th className="px-2 py-2 text-center">Esp(m)</th><th className="px-2 py-2 text-right">Area</th><th className="w-8"></th></tr></thead>
            <tbody>{lajes.map(l => { const area = l.qtd*l.comp*l.larg; return (
              <tr key={l.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-2 py-1"><input type="text" value={l.desc} onChange={e=>upd(l.id,'desc',e.target.value)} placeholder="L1" className="h-7 text-xs border rounded px-2 w-full"/></td>
                <td className="px-2 py-1"><input type="number" min={1} step={1} value={l.qtd} onFocus={e=>e.target.select()} onChange={e=>upd(l.id,'qtd',Number(e.target.value))} className="h-7 text-xs border rounded px-2 text-center w-full block"/></td>
                <td className="px-2 py-1"><input type="number" min={0} step={0.5} value={l.comp} onFocus={e=>e.target.select()} onChange={e=>upd(l.id,'comp',Number(e.target.value))} className="h-7 text-xs border rounded px-2 text-center w-full block"/></td>
                <td className="px-2 py-1"><input type="number" min={0} step={0.5} value={l.larg} onFocus={e=>e.target.select()} onChange={e=>upd(l.id,'larg',Number(e.target.value))} className="h-7 text-xs border rounded px-2 text-center w-full block"/></td>
                <td className="px-2 py-1"><input type="number" min={0} step={0.01} value={l.esp} onFocus={e=>e.target.select()} onChange={e=>upd(l.id,'esp',Number(e.target.value))} className="h-7 text-xs border rounded px-2 text-center w-full block"/></td>
                <td className="px-2 py-1 text-right font-semibold text-teal-700">{area.toFixed(2)} m2</td>
                <td className="px-1 py-1"><button onClick={()=>remove(l.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3"/></button></td>
              </tr>
            ); })}</tbody>
          </table></div>
      }
      {lajes.length > 0 && <p className="text-xs text-teal-700 font-medium">Area total: {totalArea.toFixed(2)} m2</p>}
    </div>
  );
}
// Caixa de sugestão EDITÁVEL: amarelo = sugerido pelo sistema, verde = alterado pelo usuário
function SugEdit({ label, campo, params, setParams, derived, unidade, obs }: {
  label: string; campo: keyof CalcParamsRaw;
  params: Partial<CalcParamsRaw>; setParams: (fn: (p: Partial<CalcParamsRaw>) => Partial<CalcParamsRaw>) => void;
  derived: Partial<CalcParamsRaw>; unidade: string; obs?: string;
}) {
  const isManual = params[campo] !== undefined;
  const display = isManual ? (params[campo] as number) : (derived[campo] as number | undefined);
  const tem = display !== undefined && display > 0;
  const restaurar = () => setParams(p => { const n = { ...p }; delete n[campo]; return n; });
  return (
    <div className={`rounded-lg border px-3 py-2 ${isManual ? 'bg-green-50 border-green-400' : tem ? 'bg-amber-50 border-amber-300' : 'bg-muted/30 border-border'}`}>
      <div className="flex items-center justify-between gap-1">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        {isManual && <button onClick={restaurar} className="text-muted-foreground hover:text-amber-600" title="Restaurar sugerido"><X className="h-3 w-3" /></button>}
      </div>
      <div className="flex items-center gap-1 mt-0.5">
        <input type="number" min={0} step={0.01} value={display ?? ''} onFocus={e => e.target.select()}
          onChange={e => { const v = e.target.value; setParams(p => ({ ...p, [campo]: v === '' ? undefined : Number(v) })); }}
          className={`h-8 w-28 text-sm font-bold text-right border rounded px-2 tabular-nums ${isManual ? 'bg-green-50 border-green-400 text-green-800' : 'bg-amber-50 border-amber-300 text-amber-800'}`} />
        <span className="text-xs text-muted-foreground">{unidade}</span>
      </div>
      {obs && <p className="text-[10px] text-muted-foreground mt-0.5">{obs}</p>}
    </div>
  );
}
function ChkOpt({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 h-9 px-3 border rounded-md bg-background cursor-pointer text-sm hover:border-muted-foreground/50">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="h-4 w-4 accent-primary" />
      <span className="text-xs font-medium">{label}</span>
    </label>
  );
}
function VaosInfo({ derived }: { derived: Partial<CalcParamsRaw> }) {
  const v = derived.area_vaos ?? 0;
  if (v <= 0) return null;
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
      <X className="h-3 w-3 shrink-0" /> Vãos descontados: <span className="font-bold">{v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} m²</span>
      <span className="text-muted-foreground">(portas + janelas)</span>
    </div>
  );
}
function TipoSelect({ label, value, onChange, opcoes }: { label: string; value: number; onChange: (v: number) => void; opcoes: { v: number; t: string }[] }) {
  return (
    <div className="grid gap-1"><Label className="text-xs font-medium">{label}</Label>
      <Select value={String(value)} onValueChange={v => onChange(Number(v))}>
        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
        <SelectContent>{opcoes.map(o => <SelectItem key={o.v} value={String(o.v)}>{o.t}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}
// --- Secoes ---
function SecaoCobertura({ params, setParams }: { params: Partial<CalcParamsRaw>; setParams: (fn: (p: Partial<CalcParamsRaw>) => Partial<CalcParamsRaw>) => void }) {
  return (<div className="space-y-3">
    <div className="grid sm:grid-cols-2 gap-3">
      <TipoSelect label="Tipo de telha" value={params.tipo_telha ?? 1} onChange={v => setParams(p => ({ ...p, tipo_telha: v }))} opcoes={[{ v: 1, t: 'Barro colonial' }, { v: 2, t: 'Aluzinco' }]} />
      <InputNum label="Área do telhado" campo="area_telhado" params={params} setParams={setParams} suffix="m²" step={1} />
    </div>
    <div className="grid sm:grid-cols-2 gap-3">
      <InputNum label="Rufos" campo="comp_rufos" params={params} setParams={setParams} suffix="m" step={0.5} />
      <InputNum label="Calhas" campo="comp_calhas" params={params} setParams={setParams} suffix="m" step={0.5} />
    </div>
  </div>);
}
function SecaoImperme({ params, setParams, derived }: { params: Partial<CalcParamsRaw>; setParams: (fn: (p: Partial<CalcParamsRaw>) => Partial<CalcParamsRaw>) => void; derived: Partial<CalcParamsRaw> }) {
  return (<div className="space-y-2">
    <div className="grid sm:grid-cols-2 gap-3">
      <SugEdit label="Paredes — argamassa polimérica H=1,00m" campo="area_imper_paredes" params={params} setParams={setParams} derived={derived} unidade="m²" obs="= perímetro de paredes × 2" />
      <SugEdit label="Áreas molhadas H=1,80m (ambientes)" campo="area_imper_molhada" params={params} setParams={setParams} derived={derived} unidade="m²" obs="área dos ambientes marcados como molhados" />
    </div>
    <p className="text-[11px] text-muted-foreground">Amarelo = sugerido pelo sistema · digite para alterar (fica verde). Restaure no ✕.</p>
  </div>);
}
function SecaoRevest({ params, setParams, derived }: { params: Partial<CalcParamsRaw>; setParams: (fn: (p: Partial<CalcParamsRaw>) => Partial<CalcParamsRaw>) => void; derived: Partial<CalcParamsRaw> }) {
  return (<div className="space-y-2">
    <div className="grid sm:grid-cols-3 gap-3">
      <SugEdit label="Chapisco + reboco interno" campo="area_revest_interno" params={params} setParams={setParams} derived={derived} unidade="m²" obs="perím. interno × pé-direito − vãos" />
      <SugEdit label="Chapisco + reboco externo" campo="area_revest_externo" params={params} setParams={setParams} derived={derived} unidade="m²" obs="perím. externo × pé-direito − vãos" />
      <SugEdit label="Cerâmica de parede (molhadas)" campo="area_ceramica_parede" params={params} setParams={setParams} derived={derived} unidade="m²" obs="perímetro × pé-direito (digite a altura ajustando aqui)" />
    </div>
    <VaosInfo derived={derived} />
    <p className="text-[11px] text-muted-foreground">Amarelo = sugerido · digite para alterar (fica verde).</p>
  </div>);
}
function SecaoForro({ params, setParams, derived }: { params: Partial<CalcParamsRaw>; setParams: (fn: (p: Partial<CalcParamsRaw>) => Partial<CalcParamsRaw>) => void; derived: Partial<CalcParamsRaw> }) {
  return (<div className="grid sm:grid-cols-2 gap-3">
    <TipoSelect label="Tipo de forro" value={params.forro_tipo ?? 1} onChange={v => setParams(p => ({ ...p, forro_tipo: v }))} opcoes={[{ v: 1, t: 'PVC + trama de madeira' }, { v: 2, t: 'Drywall' }]} />
    <SugEdit label="Área de forro" campo="area_forro" params={params} setParams={setParams} derived={derived} unidade="m²" obs="= área construída" />
  </div>);
}
function SecaoPintura({ params, setParams, derived }: { params: Partial<CalcParamsRaw>; setParams: (fn: (p: Partial<CalcParamsRaw>) => Partial<CalcParamsRaw>) => void; derived: Partial<CalcParamsRaw> }) {
  return (<div className="space-y-2">
    <div className="grid sm:grid-cols-2 gap-3">
      <SugEdit label="Pintura interna" campo="area_pintura_interna" params={params} setParams={setParams} derived={derived} unidade="m²" obs="perím. interno × pé-direito" />
      <SugEdit label="Pintura externa" campo="area_pintura_externa" params={params} setParams={setParams} derived={derived} unidade="m²" obs="perím. externo × pé-direito − vãos" />
    </div>
    <ChkOpt label="Aplicar massa fina de acabamento interna" checked={(params.massa_int ?? 1) === 1} onChange={c => setParams(p => ({ ...p, massa_int: c ? 1 : 0 }))} />
    <VaosInfo derived={derived} />
  </div>);
}
function SecaoPisos({ params, setParams, derived }: { params: Partial<CalcParamsRaw>; setParams: (fn: (p: Partial<CalcParamsRaw>) => Partial<CalcParamsRaw>) => void; derived: Partial<CalcParamsRaw> }) {
  return (<div className="space-y-3">
    <div className="grid sm:grid-cols-2 gap-3">
      <TipoSelect label="Revestimento de piso" value={params.piso_tipo ?? 1} onChange={v => setParams(p => ({ ...p, piso_tipo: v }))} opcoes={[{ v: 1, t: 'Cerâmica classe A' }, { v: 2, t: 'Porcelanato' }]} />
      <SugEdit label="Área de piso/contrapiso" campo="area_piso" params={params} setParams={setParams} derived={derived} unidade="m²" obs="= área construída" />
    </div>
    <ChkOpt label="Contrapiso de concreto armado (em vez de regularização)" checked={(params.contrapiso_armado ?? 0) === 1} onChange={c => setParams(p => ({ ...p, contrapiso_armado: c ? 1 : 0 }))} />
  </div>);
}
function SecaoAcabamento({ params, setParams, derived }: { params: Partial<CalcParamsRaw>; setParams: (fn: (p: Partial<CalcParamsRaw>) => Partial<CalcParamsRaw>) => void; derived: Partial<CalcParamsRaw> }) {
  return (<div className="space-y-3">
    <div className="grid sm:grid-cols-2 gap-3">
      <TipoSelect label="Tipo de rodapé" value={params.rodape_tipo ?? 1} onChange={v => setParams(p => ({ ...p, rodape_tipo: v }))} opcoes={[{ v: 1, t: 'Poliestireno 7cm' }, { v: 2, t: 'Próprio piso (7cm)' }]} />
      <SugEdit label="Comprimento de rodapé" campo="comp_rodape" params={params} setParams={setParams} derived={derived} unidade="m" obs="perímetro interno − larguras das portas" />
    </div>
    <div className="grid sm:grid-cols-2 gap-3">
      <SugEdit label="Pingadeiras" campo="comp_pingadeiras" params={params} setParams={setParams} derived={derived} unidade="m" obs="Σ largura das janelas + 5cm" />
      <SugEdit label="Soleiras" campo="comp_soleiras" params={params} setParams={setParams} derived={derived} unidade="m" obs="Σ largura das portas + 5cm" />
    </div>
  </div>);
}
// --- GrupoSection Accordion ---
function GrupoSection({ grupo, expanded, onToggle, onProximo, isUltimo, children, itensAtivos }: {
  grupo: (typeof CALC_GRUPOS)[0]; expanded: boolean; onToggle: () => void;
  onProximo: () => void; isUltimo: boolean;
  children: React.ReactNode; itensAtivos: number;
}) {
  const cores: Record<string,string> = { amber:'border-amber-200 bg-amber-50/30', blue:'border-blue-200 bg-blue-50/30', orange:'border-orange-200 bg-orange-50/30', green:'border-green-200 bg-green-50/30', violet:'border-violet-200 bg-violet-50/30', teal:'border-teal-200 bg-teal-50/30' };
  const badge: Record<string,string> = { amber:'bg-amber-100 text-amber-700 border-amber-300', blue:'bg-blue-100 text-blue-700 border-blue-300', orange:'bg-orange-100 text-orange-700 border-orange-300', green:'bg-green-100 text-green-700 border-green-300', violet:'bg-violet-100 text-violet-700 border-violet-300', teal:'bg-teal-100 text-teal-700 border-teal-300' };
  const btnNext: Record<string,string> = { amber:'bg-amber-500 hover:bg-amber-600', blue:'bg-blue-500 hover:bg-blue-600', orange:'bg-orange-500 hover:bg-orange-600', green:'bg-green-600 hover:bg-green-700', violet:'bg-violet-500 hover:bg-violet-600', teal:'bg-teal-500 hover:bg-teal-600' };
  return (
    <Card id={`grupo-${grupo.id}`} className={`border-2 transition-all ${expanded ? (cores[grupo.cor] ?? 'border-border') : 'border-border'}`}>
      <CardContent className="p-0">
        <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors rounded-xl">
          <span className="text-xl">{grupo.emoji}</span>
          <div className="flex-1 min-w-0"><p className="font-semibold text-sm">{grupo.nome}</p><p className="text-xs text-muted-foreground">{grupo.descricao}</p></div>
          {itensAtivos > 0 && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${badge[grupo.cor] ?? ''}`}>{itensAtivos} item{itensAtivos > 1 ? 's' : ''}</span>}
          {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
        </button>
        {expanded && (
          <div className="px-4 pb-4 border-t pt-4">
            {children}
            <div className="mt-4 flex justify-end">
              {isUltimo ? (
                <span className="text-xs text-muted-foreground italic">✓ Última etapa — confira o painel de quantitativos ao lado.</span>
              ) : (
                <button onClick={onProximo}
                  className={`flex items-center gap-1.5 text-xs font-semibold text-white px-4 py-2 rounded-lg transition-colors ${btnNext[grupo.cor] ?? 'bg-primary hover:bg-primary/90'}`}>
                  Próximo <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Estado por item ---
interface ItemUserState {
  composicao_id: string;
  qtd_override: string;
  incluir: boolean;
}

// --- PainelResultados (nova UX central) ---
function PainelResultados({ calcItems, composicoes, userStates, setUserStates, onAplicar, aplicando, orcamentoId }: {
  calcItems: CalcItem[]; composicoes: Composicao[]; userStates: Record<string, ItemUserState>;
  setUserStates: React.Dispatch<React.SetStateAction<Record<string, ItemUserState>>>;
  onAplicar: () => void; aplicando: boolean; orcamentoId: string;
}) {
  const ativos = calcItems.filter(i => i.quantidade > 0);

  function updState(tid: string, patch: Partial<ItemUserState>) {
    setUserStates(prev => ({ ...prev, [tid]: { ...prev[tid], ...patch } }));
  }

  const prontos = ativos.filter(i => { const s = userStates[i.template_id]; return s?.incluir && s?.composicao_id; });
  const totalInclui = ativos.filter(i => userStates[i.template_id]?.incluir).length;
  const totalSemComp = ativos.filter(i => userStates[i.template_id]?.incluir && !userStates[i.template_id]?.composicao_id).length;

  return (
    <Card className="border-2 border-primary/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" /> Quantitativos calculados
          </h3>
          {ativos.length > 0 && (
            <button onClick={() => {
              const allIncluir = ativos.every(i => userStates[i.template_id]?.incluir);
              setUserStates(prev => { const next = { ...prev }; ativos.forEach(i => { next[i.template_id] = { ...next[i.template_id], incluir: !allIncluir }; }); return next; });
            }} className="text-xs text-primary hover:underline">
              {ativos.every(i => userStates[i.template_id]?.incluir) ? 'Desmarcar todos' : 'Marcar todos'}
            </button>
          )}
        </div>

        {ativos.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            <Calculator className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>Preencha os parametros ao lado</p>
            <p className="mt-0.5 opacity-70">para ver os quantitativos calculados</p>
          </div>
        ) : (
          <div className="space-y-2">
            {CALC_GRUPOS.map(grupo => {
              const grupoItems = ativos.filter(i => i.grupo_id === grupo.id);
              if (grupoItems.length === 0) return null;
              return (
                <div key={grupo.id}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                    <span>{grupo.emoji}</span> {grupo.nome}
                  </p>
                  <div className="space-y-1.5">
                    {grupoItems.map(item => {
                      const s = userStates[item.template_id] ?? { composicao_id: item.composicao_id ?? '', qtd_override: '', incluir: true };
                      const qtdAuto = item.quantidade;
                      const qtdFinal = s.qtd_override !== '' ? Number(s.qtd_override) : qtdAuto;
                      const isOverride = s.qtd_override !== '';
                      const comp = composicoes.find(c => c.id === s.composicao_id);
                      return (
                        <div key={item.template_id} className={`rounded-lg border p-2 transition-colors ${s.incluir ? 'border-primary/20 bg-primary/5' : 'border-border bg-muted/20 opacity-60'}`}>
                          <div className="flex items-start gap-2 mb-2">
                            <input type="checkbox" checked={s.incluir ?? true} onChange={e => updState(item.template_id, { incluir: e.target.checked })} className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-primary" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium leading-tight">{item.nome}</p>
                              <p className="text-[10px] text-muted-foreground">Etapa {item.etapa_codigo} &middot; {item.sub_etapa}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-[auto_1fr] gap-2 ml-5">
                            <div className="flex items-center gap-1">
                              <input type="number" min={0} step={0.01}
                                value={s.qtd_override !== '' ? s.qtd_override : qtdAuto.toFixed(2)}
                                onFocus={e => e.target.select()}
                                onChange={e => updState(item.template_id, { qtd_override: e.target.value })}
                                onBlur={e => { if (e.target.value === '' || Number(e.target.value) === qtdAuto) updState(item.template_id, { qtd_override: '' }); }}
                                className={`h-7 w-24 text-xs text-right border rounded px-2 tabular-nums font-semibold ${isOverride ? 'bg-green-50 border-green-400 text-green-800' : 'bg-amber-50 border-amber-300 text-amber-800'}`} />
                              <span className="text-[10px] text-muted-foreground shrink-0">{comp?.unidade_producao ?? item.unidade}</span>
                              {isOverride && (
                                <button onClick={() => updState(item.template_id, { qtd_override: '' })} className="text-muted-foreground hover:text-amber-600" title="Restaurar automatico">
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                            <CompositionSearch etapaCodigo={item.etapa_codigo} composicoes={composicoes} value={s.composicao_id || null} onChange={cid => updState(item.template_id, { composicao_id: cid })} placeholder="Selecionar composicao..." />
                          </div>
                          {comp?.custo_unitario && qtdFinal > 0 && (
                            <p className="ml-5 mt-1 text-[10px] text-muted-foreground">
                              Estimativa: <span className="font-semibold text-foreground">{(comp.custo_unitario * qtdFinal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                              <span className="opacity-60"> ({comp.custo_unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/{comp.unidade_producao})</span>
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalInclui > 0 && (
          <>
            {totalSemComp > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <Info className="h-3.5 w-3.5 shrink-0" />
                {totalSemComp} item{totalSemComp > 1 ? 's' : ''} sem composicao selecionada
              </div>
            )}
            <div className="border-t pt-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{prontos.length}</span>/{totalInclui} item{prontos.length !== 1 ? 's' : ''} pronto{prontos.length !== 1 ? 's' : ''}
            </div>
            <Button className="w-full" disabled={!orcamentoId || aplicando || prontos.length === 0} onClick={onAplicar}>
              {aplicando ? 'Adicionando...' : <><Zap className="h-3.5 w-3.5 mr-1.5" /> Adicionar {prontos.length} item{prontos.length !== 1 ? 's' : ''} ao Orcamento</>}
            </Button>
            {!orcamentoId && <p className="text-xs text-center text-amber-600">Selecione um orcamento acima</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
// --- Pagina principal ---
function CalculadoraContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orcIdParam = searchParams.get('orcamento_id') || '';
  const orcTituloParam = searchParams.get('orcamento_titulo') || '';

  const [orcamentos, setOrcamentos] = useState<{ id: string; titulo: string }[]>([]);
  const [orcamentoId, setOrcamentoId] = useState(orcIdParam);
  const [orcamentoTitulo, setOrcamentoTitulo] = useState(orcTituloParam);
  const [composicoes, setComposicoes] = useState<Composicao[]>([]);

  const [params, setParams] = useState<Partial<CalcParamsRaw>>({
    esp_estribo: 0.15, n_barras_long: 4, tabua_larg: 0.20, bitola_baldrame: 8, tipo_alv: 2,
    tipo_telha: 1, forro_tipo: 1, piso_tipo: 1, rodape_tipo: 1, pe_direito: 2.8,
    massa_int: 1, contrapiso_armado: 0, cinta_coroamento: 0,
  });
  const [vaos, setVaos] = useState<CalcVao[]>([]);
  const [pilares, setPilares] = useState<CalcPilarItem[]>([]);
  const [vigas, setVigas] = useState<CalcVigaIndItem[]>([]);
  const [lajes, setLajes] = useState<CalcLajeItem[]>([]);
  const [estacas, setEstacas] = useState<CalcEstacaItem[]>([]);
  const [ambientes, setAmbientes] = useState<CalcAmbiente[]>([]);

  const [stepAtual, setStepAtual] = useState(0);

  const [userStates, setUserStates] = useState<Record<string, ItemUserState>>({});
  const [aplicando, setAplicando] = useState(false);
  const [modalNovo, setModalNovo] = useState(false);
  const [novoForm, setNovoForm] = useState({ titulo: '', area_construida: '', descricao: '', bdi_percentual: '0' });
  const [salvandoNovo, setSalvandoNovo] = useState(false);

  async function criarOrcamento() {
    const titulo = novoForm.titulo.trim();
    const area = novoForm.area_construida;
    if (!titulo) { toast.error('Informe um título'); return; }
    if (!area) { toast.error('Informe a área construída'); return; }
    setSalvandoNovo(true);
    try {
      const res = await fetch('/api/orcamentos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, area_construida: Number(area), descricao: novoForm.descricao, bdi_percentual: Number(novoForm.bdi_percentual) }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || (Array.isArray(data.erros) ? data.erros.join(', ') : 'Erro ao criar orçamento')); return; }
      setOrcamentos(prev => [{ id: data.id, titulo: data.titulo }, ...prev]);
      setOrcamentoId(data.id);
      setOrcamentoTitulo(data.titulo);
      setNovoForm({ titulo: '', area_construida: '', descricao: '', bdi_percentual: '0' });
      setModalNovo(false);
      toast.success(`Orçamento "${data.titulo}" criado e selecionado!`);
    } catch { toast.error('Erro ao conectar'); } finally { setSalvandoNovo(false); }
  }

  const calcItems = useMemo(
    () => calcularQuantitativos(params, vaos, pilares, vigas, lajes, estacas, ambientes),
    [params, vaos, pilares, vigas, lajes, estacas, ambientes],
  );
  const derived = useMemo(
    () => derivarParams(params, vaos, pilares, vigas, lajes, estacas, ambientes),
    [params, vaos, pilares, vigas, lajes, estacas, ambientes],
  );

  useEffect(() => {
    setUserStates(prev => {
      const next = { ...prev };
      for (const item of calcItems) {
        if (!next[item.template_id]) {
          next[item.template_id] = {
            composicao_id: item.composicao_id ?? '',
            qtd_override: '',
            incluir: item.quantidade > 0 && item.incluir,
          };
        } else if (item.quantidade === 0) {
          next[item.template_id] = { ...next[item.template_id], incluir: false };
        }
      }
      return next;
    });
  }, [calcItems]);

  useEffect(() => {
    fetch('/api/orcamentos').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setOrcamentos(data.map((o: { id: string; titulo: string }) => ({ id: o.id, titulo: o.titulo })));
    }).catch(() => {});
    fetch('/api/composicoes').then(r => r.json()).then((data: Composicao[]) => {
      if (Array.isArray(data)) setComposicoes(data.filter(c => c.status === 'ativo'));
    }).catch(() => {});
  }, []);

  const itensPorGrupo = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of calcItems) { if (item.quantidade > 0) map[item.grupo_id] = (map[item.grupo_id] || 0) + 1; }
    return map;
  }, [calcItems]);

  const aplicar = useCallback(async () => {
    if (!orcamentoId) { toast.error('Selecione um orcamento'); return; }
    const prontos = calcItems.filter(i => { const s = userStates[i.template_id]; return s?.incluir && s?.composicao_id && i.quantidade > 0; });
    if (prontos.length === 0) { toast.error('Nenhum item pronto - selecione uma composicao'); return; }
    const payload = prontos.map(i => { const s = userStates[i.template_id]; const qtd = s.qtd_override !== '' ? Number(s.qtd_override) : i.quantidade; return { ...i, composicao_id: s.composicao_id, quantidade: qtd }; });
    setAplicando(true);
    try {
      const res = await fetch('/api/calculadora', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orcamento_id: orcamentoId, itens: payload }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Erro ao adicionar itens'); return; }
      const titulo = orcamentoTitulo || orcamentos.find(o => o.id === orcamentoId)?.titulo || 'orcamento';
      toast.success(`${data.adicionados} item(s) adicionado(s) a "${titulo}"!`, {
        action: { label: 'Ver orcamento', onClick: () => router.push(`/orcamentos/${orcamentoId}`) },
        duration: 6000,
      });
    } catch { toast.error('Erro ao conectar'); } finally { setAplicando(false); }
  }, [orcamentoId, calcItems, userStates, orcamentos, orcamentoTitulo, router]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-start gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link href="/orcamentos" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
            <h1 className="text-xl font-bold flex items-center gap-2"><Zap className="h-5 w-5 text-amber-500" /> Calculadora de Quantitativos</h1>
          </div>
          <p className="text-sm text-muted-foreground">Preencha os dados &rarr; confira os quantitativos &rarr; escolha a composicao &rarr; adicione ao orcamento.</p>
        </div>
      </div>

      <Card className="mb-6 border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium shrink-0">Orcamento de destino</span>
            <div className="flex-1 min-w-48 max-w-sm">
              <Select value={orcamentoId} onValueChange={v => { if (!v) return; setOrcamentoId(v); setOrcamentoTitulo(orcamentos.find(o=>o.id===v)?.titulo||''); }}>
                <SelectTrigger className="h-9 text-sm bg-background">
                  <span className={`flex-1 text-sm text-left truncate ${!orcamentoId ? 'text-muted-foreground' : ''}`}>
                    {orcamentoId ? (orcamentoTitulo || orcamentos.find(o=>o.id===orcamentoId)?.titulo || orcamentoId) : 'Selecionar orcamento...'}
                  </span>
                </SelectTrigger>
                <SelectContent>{orcamentos.map(o => <SelectItem key={o.id} value={o.id}>{o.titulo}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button size="sm" variant="outline" className="h-9 text-xs shrink-0 bg-background"
              onClick={() => { setNovoForm({ titulo: '', area_construida: '', descricao: '', bdi_percentual: '0' }); setModalNovo(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Novo orçamento
            </Button>
            {orcamentoId && <Link href={`/orcamentos/${orcamentoId}`} className="text-xs text-primary hover:underline flex items-center gap-1"><Check className="h-3 w-3" /> Selecionado</Link>}
          </div>

          {/* Dialog novo orçamento (mesmo formulário da lista) */}
          <Dialog open={modalNovo} onOpenChange={setModalNovo}>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Novo Orçamento</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <div className="grid gap-1.5">
                  <Label>Título <span className="text-destructive">*</span></Label>
                  <Input autoFocus value={novoForm.titulo} onChange={e => setNovoForm(f => ({ ...f, titulo: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') criarOrcamento(); }}
                    placeholder="Ex: Residência Unifamiliar 120m²" className="h-10" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Área Construída (m²) <span className="text-destructive">*</span></Label>
                  <Input type="number" min="1" step="0.5" value={novoForm.area_construida}
                    onChange={e => setNovoForm(f => ({ ...f, area_construida: e.target.value }))}
                    placeholder="Ex: 80" className="h-10" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Descrição</Label>
                  <Input value={novoForm.descricao} onChange={e => setNovoForm(f => ({ ...f, descricao: e.target.value }))}
                    placeholder="Descrição opcional..." className="h-10" />
                </div>
                <div className="grid gap-1.5">
                  <Label>BDI (%)</Label>
                  <Input type="number" min="0" max="100" step="0.1" value={novoForm.bdi_percentual}
                    onChange={e => setNovoForm(f => ({ ...f, bdi_percentual: e.target.value }))} className="h-10" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setModalNovo(false)}>Cancelar</Button>
                <Button onClick={criarOrcamento} disabled={salvandoNovo || !novoForm.titulo.trim() || !novoForm.area_construida}>
                  {salvandoNovo ? 'Criando...' : 'Criar e selecionar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <p className="text-[11px] text-muted-foreground mt-2 flex items-start gap-1"><Info className="h-3 w-3 mt-0.5 shrink-0" /> Items com composicao selecionada serao adicionados com custo automatico.</p>
        </CardContent>
      </Card>

      <div className="grid xl:grid-cols-[1fr_400px] gap-6 items-start">
        {/* ── Stepper ── */}
        <div className="space-y-4">

          {/* Barra de progresso + dots */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium">{CALC_GRUPOS[stepAtual].emoji} {CALC_GRUPOS[stepAtual].nome}</span>
              <span>{stepAtual + 1} / {CALC_GRUPOS.length}</span>
            </div>
            {/* Barra */}
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${((stepAtual + 1) / CALC_GRUPOS.length) * 100}%` }} />
            </div>
            {/* Dots clicáveis */}
            <div className="flex items-center gap-1 flex-wrap">
              {CALC_GRUPOS.map((g, i) => {
                const temItens = (itensPorGrupo[g.id] || 0) > 0;
                const atual = i === stepAtual;
                const passado = i < stepAtual;
                return (
                  <button key={g.id} title={g.nome} onClick={() => setStepAtual(i)}
                    className={`transition-all rounded-full flex items-center justify-center
                      ${atual ? 'w-7 h-7 bg-primary text-white text-[10px] font-bold ring-2 ring-primary/30' :
                        passado ? 'w-5 h-5 bg-primary/20 text-primary text-[9px] font-bold hover:bg-primary/40' :
                        'w-5 h-5 bg-muted text-muted-foreground text-[9px] hover:bg-muted-foreground/20'}
                      ${temItens && !atual ? 'ring-1 ring-green-400' : ''}`}>
                    {atual ? i + 1 : temItens ? <Check className="h-2.5 w-2.5" /> : i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card da etapa atual */}
          {(() => {
            const grupo = CALC_GRUPOS[stepAtual];
            const corBorder: Record<string,string> = { amber:'border-amber-200 bg-amber-50/20', blue:'border-blue-200 bg-blue-50/20', orange:'border-orange-200 bg-orange-50/20', green:'border-green-200 bg-green-50/20', violet:'border-violet-200 bg-violet-50/20', teal:'border-teal-200 bg-teal-50/20' };
            return (
              <Card className={`border-2 ${corBorder[grupo.cor] ?? 'border-border'}`}>
                <CardContent className="p-5 space-y-4">
                  {/* Cabeçalho da etapa */}
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{grupo.emoji}</span>
                    <div>
                      <h2 className="font-bold text-base">{grupo.nome}</h2>
                      <p className="text-xs text-muted-foreground">{grupo.descricao}</p>
                    </div>
                    {(itensPorGrupo[grupo.id] || 0) > 0 && (
                      <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border bg-green-100 text-green-700 border-green-300 shrink-0">
                        {itensPorGrupo[grupo.id]} item{itensPorGrupo[grupo.id] > 1 ? 's' : ''} calculado{itensPorGrupo[grupo.id] > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Conteúdo da etapa */}
                  <div className="border-t pt-4">
                    {grupo.id === 'preliminares' && <SecaoPreliminares params={params} setParams={setParams} ambientes={ambientes} setAmbientes={setAmbientes} />}
                    {grupo.id === 'fundacoes'    && <SecaoFundacoes params={params} setParams={setParams} />}
                    {grupo.id === 'estacas'      && <SecaoEstacas estacas={estacas} setEstacas={setEstacas} />}
                    {grupo.id === 'laje'         && <SecaoLaje lajes={lajes} setLajes={setLajes} />}
                    {grupo.id === 'pilares'      && <SecaoPilares pilares={pilares} setPilares={setPilares} />}
                    {grupo.id === 'vigas_ind'    && <SecaoVigas vigas={vigas} setVigas={setVigas} />}
                    {grupo.id === 'alvenaria'    && <SecaoAlvenaria params={params} setParams={setParams} vaos={vaos} setVaos={setVaos} />}
                    {grupo.id === 'cobertura'    && <SecaoCobertura params={params} setParams={setParams} />}
                    {grupo.id === 'imperme'      && <SecaoImperme params={params} setParams={setParams} derived={derived} />}
                    {grupo.id === 'revest'       && <SecaoRevest params={params} setParams={setParams} derived={derived} />}
                    {grupo.id === 'forro'        && <SecaoForro params={params} setParams={setParams} derived={derived} />}
                    {grupo.id === 'pintura'      && <SecaoPintura params={params} setParams={setParams} derived={derived} />}
                    {grupo.id === 'pisos'        && <SecaoPisos params={params} setParams={setParams} derived={derived} />}
                    {grupo.id === 'acabamento'   && <SecaoAcabamento params={params} setParams={setParams} derived={derived} />}
                    {grupo.id === 'eletrica'     && <AmbientesEditor ambientes={ambientes} setAmbientes={setAmbientes} modo="eletrica" />}
                    {grupo.id === 'hidraulica'   && <AmbientesEditor ambientes={ambientes} setAmbientes={setAmbientes} modo="hidro" />}
                    {grupo.id === 'banheiro'     && <SecaoLoucas ambientes={ambientes} setAmbientes={setAmbientes} />}
                  </div>

                  {/* Navegação Anterior / Próximo */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <Button variant="outline" size="sm" className="h-9"
                      disabled={stepAtual === 0}
                      onClick={() => { setStepAtual(s => s - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                      <ChevronRight className="h-4 w-4 mr-1 rotate-180" /> Anterior
                    </Button>
                    <span className="text-xs text-muted-foreground">{stepAtual + 1} de {CALC_GRUPOS.length}</span>
                    {stepAtual < CALC_GRUPOS.length - 1 ? (
                      <Button size="sm" className="h-9"
                        onClick={() => { setStepAtual(s => s + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                        Próximo <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    ) : (
                      <Button size="sm" variant="default" className="h-9 bg-green-600 hover:bg-green-700"
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <Check className="h-4 w-4 mr-1" /> Concluído
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </div>

        {/* ── Painel de resultados (sticky) ── */}
        <div className="xl:sticky xl:top-6">
          <PainelResultados calcItems={calcItems} composicoes={composicoes} userStates={userStates} setUserStates={setUserStates} onAplicar={aplicar} aplicando={aplicando} orcamentoId={orcamentoId} />
        </div>
      </div>
    </div>
  );
}

export default function CalculadoraPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh] text-muted-foreground text-sm">Carregando calculadora...</div>}>
      <CalculadoraContent />
    </Suspense>
  );
}