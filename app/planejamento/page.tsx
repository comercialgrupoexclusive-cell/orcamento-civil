'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw, Save, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

const EXEC_COR: Record<string, string> = {
  nao_iniciado: 'bg-slate-200',
  em_andamento: 'bg-amber-400',
  concluido:    'bg-green-500',
};
const EXEC_COR_TEXT: Record<string, string> = {
  nao_iniciado: 'bg-slate-100 text-slate-600 border-slate-200',
  em_andamento: 'bg-amber-100 text-amber-700 border-amber-300',
  concluido:    'bg-green-100 text-green-700 border-green-300',
};
const EXEC_LABEL: Record<string, string> = {
  nao_iniciado: 'Não Iniciado', em_andamento: 'Em Andamento', concluido: 'Concluído',
};

interface Etapa {
  id: string; etapa_codigo: string; etapa_nome: string;
  status_execucao: string; data_inicio: string; data_fim_prevista: string;
  data_fim_real: string; ordem: string;
}
interface Obra { id: string; nome: string; cidade: string; estado: string; }

function toDate(s: string): Date | null {
  if (!s || s.length < 10) return null;
  return new Date(s + 'T00:00:00');
}
function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function diasNoMes(a: number, m: number) { return new Date(a, m + 1, 0).getDate(); }

// ── Clique no Gantt define início ou fim da etapa selecionada ────────────────
// Estado do clique: 'inicio' → próximo clique define data_inicio; 'fim' → define data_fim_prevista
type ModoClick = 'inicio' | 'fim';

function PlanejamentoContent() {
  const searchParams = useSearchParams();
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraId, setObraId] = useState(searchParams.get('obra_id') || '');
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'mensal' | 'semanal'>('mensal');

  const today = new Date();
  const [ano, setAno] = useState(today.getFullYear());
  const [mes, setMes] = useState(today.getMonth());
  const [semanaBase, setSemanaBase] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d;
  });

  // Etapa selecionada + modo de clique
  const [etapaSelecionada, setEtapaSelecionada] = useState<string>('');
  const [modoClick, setModoClick] = useState<ModoClick>('inicio');

  // Estado local das etapas (para edição sem reload a cada keystroke)
  const [etapasLocal, setEtapasLocal] = useState<Record<string, Etapa>>({});

  useEffect(() => {
    fetch('/api/obras').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setObras(d);
    }).catch(() => {});
  }, []);

  const carregar = useCallback(async () => {
    if (!obraId) return;
    setLoading(true);
    const res = await fetch(`/api/etapas-obra?obra_id=${obraId}`);
    if (res.ok) {
      const data: Etapa[] = await res.json();
      const sorted = data.sort((a, b) => Number(a.ordem) - Number(b.ordem));
      setEtapas(sorted);
      const local: Record<string, Etapa> = {};
      sorted.forEach(e => { local[e.id] = { ...e }; });
      setEtapasLocal(local);
    }
    setLoading(false);
  }, [obraId]);

  useEffect(() => { carregar(); }, [carregar]);

  function updLocal(id: string, patch: Partial<Etapa>) {
    setEtapasLocal(p => ({ ...p, [id]: { ...p[id], ...patch } }));
  }

  async function salvarEtapa(id: string) {
    const et = etapasLocal[id];
    if (!et) return;
    setSaving(p => ({ ...p, [id]: true }));
    const res = await fetch(`/api/etapas-obra/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status_execucao: et.status_execucao,
        data_inicio: et.data_inicio,
        data_fim_prevista: et.data_fim_prevista,
        data_fim_real: et.data_fim_real,
      }),
    });
    if (res.ok) {
      toast.success(`${et.etapa_nome} — salvo`);
      setEtapas(prev => prev.map(e => e.id === id ? { ...e, ...et } : e));
    } else toast.error('Erro ao salvar');
    setSaving(p => ({ ...p, [id]: false }));
  }

  // ── Click no Gantt ────────────────────────────────────────────────────────
  function handleClickDia(data: Date) {
    if (!etapaSelecionada) {
      toast.info('Selecione uma etapa na lista à esquerda primeiro', { duration: 2000 });
      return;
    }
    const dateStr = fmtDate(data);
    if (modoClick === 'inicio') {
      updLocal(etapaSelecionada, { data_inicio: dateStr });
      setModoClick('fim');
      toast.success(`Início: ${data.toLocaleDateString('pt-BR')} — agora clique no dia de término`, { duration: 2000 });
    } else {
      const ini = toDate(etapasLocal[etapaSelecionada]?.data_inicio || '');
      if (ini && data < ini) {
        toast.error('Data de término deve ser após o início');
        return;
      }
      updLocal(etapaSelecionada, { data_fim_prevista: dateStr });
      setModoClick('inicio');
      toast.success(`Término: ${data.toLocaleDateString('pt-BR')} — salve para confirmar`, { duration: 2000 });
    }
  }

  // ── Painel lateral de etapas ──────────────────────────────────────────────
  function PainelEtapas() {
    return (
      <div className="flex flex-col gap-1 overflow-y-auto">
        {etapas.length === 0 && (
          <p className="text-xs text-muted-foreground p-3 text-center">Nenhuma etapa</p>
        )}
        {etapas.map(et => {
          const loc = etapasLocal[et.id] || et;
          const selecionada = etapaSelecionada === et.id;
          const dirty = loc.data_inicio !== et.data_inicio || loc.data_fim_prevista !== et.data_fim_prevista || loc.status_execucao !== et.status_execucao;

          return (
            <div key={et.id}
              onClick={() => { setEtapaSelecionada(selecionada ? '' : et.id); setModoClick('inicio'); }}
              className={`rounded-lg border p-2.5 cursor-pointer transition-all select-none ${selecionada ? 'border-primary bg-primary/8 ring-1 ring-primary/30' : 'border-border hover:border-primary/40 hover:bg-muted/30'}`}>

              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold text-muted-foreground w-5">{et.etapa_codigo}</span>
                <span className="text-xs font-medium flex-1 leading-tight">{et.etapa_nome}</span>
                {dirty && (
                  <button onClick={e => { e.stopPropagation(); salvarEtapa(et.id); }}
                    disabled={saving[et.id]}
                    className="h-5 px-1.5 text-[10px] rounded bg-primary text-primary-foreground font-semibold shrink-0 flex items-center gap-0.5 hover:bg-primary/90">
                    <Save className="h-2.5 w-2.5" /> {saving[et.id] ? '...' : 'Salvar'}
                  </button>
                )}
              </div>

              {/* Status */}
              <div onClick={e => e.stopPropagation()}>
                <Select value={loc.status_execucao} onValueChange={v => { updLocal(et.id, { status_execucao: v ?? '' }); }}>
                  <SelectTrigger className={`h-6 text-[10px] font-bold border px-2 ${EXEC_COR_TEXT[loc.status_execucao] || ''}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EXEC_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-1 mt-1.5" onClick={e => e.stopPropagation()}>
                <div>
                  <p className="text-[9px] text-muted-foreground mb-0.5">Início</p>
                  <Input type="date" value={loc.data_inicio}
                    onChange={e => updLocal(et.id, { data_inicio: e.target.value })}
                    className="h-6 text-[10px] px-1.5" />
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground mb-0.5">Término prev.</p>
                  <Input type="date" value={loc.data_fim_prevista}
                    onChange={e => updLocal(et.id, { data_fim_prevista: e.target.value })}
                    className="h-6 text-[10px] px-1.5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Gantt Mensal ──────────────────────────────────────────────────────────
  function GanttMensal() {
    const dias = diasNoMes(ano, mes);
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes, dias);
    const etVisiveis = etapas.filter(e => {
      const loc = etapasLocal[e.id] || e;
      const ini = toDate(loc.data_inicio);
      const fim = toDate(loc.data_fim_prevista) || toDate(loc.data_fim_real);
      if (!ini && !fim) return false;
      if (ini && ini <= ultimoDia && (!fim || fim >= primeiroDia)) return true;
      if (fim && fim >= primeiroDia && (!ini || ini <= ultimoDia)) return true;
      return false;
    }).sort((a, b) => Number(a.ordem) - Number(b.ordem));

    const ativa = etapaSelecionada ? (etapasLocal[etapaSelecionada] || etapas.find(e => e.id === etapaSelecionada)) : null;

    return (
      <div className="overflow-x-auto">
        <div style={{ minWidth: `${dias * 28 + 4}px` }}>
          {/* Header dias */}
          <div className="flex border-b border-border">
            {Array.from({ length: dias }, (_, i) => {
              const d = new Date(ano, mes, i + 1);
              const isHoje = d.toDateString() === today.toDateString();
              const isSabDom = d.getDay() === 0 || d.getDay() === 6;
              return (
                <div key={i}
                  onClick={() => handleClickDia(new Date(ano, mes, i + 1))}
                  className={`w-7 shrink-0 text-center py-1 text-[10px] font-medium border-l border-border cursor-pointer transition-colors select-none
                    ${isHoje ? 'bg-primary text-primary-foreground font-bold' : isSabDom ? 'text-muted-foreground/50 bg-muted/30' : 'text-muted-foreground hover:bg-primary/10'}
                    ${etapaSelecionada ? (modoClick === 'inicio' ? 'hover:bg-green-100' : 'hover:bg-amber-100') : ''}`}>
                  <span className="block">{i + 1}</span>
                  <span className="block text-[8px] opacity-60">{DIAS_SEMANA[d.getDay()].slice(0,1)}</span>
                </div>
              );
            })}
          </div>

          {/* Aviso de etapa selecionada */}
          {etapaSelecionada && (
            <div className={`flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium ${modoClick === 'inicio' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'} border-b`}>
              <Info className="h-3 w-3 shrink-0" />
              {ativa?.etapa_nome} — clique no dia para marcar {modoClick === 'inicio' ? '🟢 INÍCIO' : '🔴 TÉRMINO'}
            </div>
          )}

          {/* Linhas de etapas */}
          {etVisiveis.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">Nenhuma etapa com datas neste mês. Configure as datas no painel à esquerda ou clique nos dias acima.</div>
          ) : etVisiveis.map(etapa => {
            const loc = etapasLocal[etapa.id] || etapa;
            const ini = toDate(loc.data_inicio);
            const fim = toDate(loc.data_fim_prevista) || toDate(loc.data_fim_real);
            const selecionada = etapaSelecionada === etapa.id;
            return (
              <div key={etapa.id}
                onClick={() => { setEtapaSelecionada(selecionada ? '' : etapa.id); setModoClick('inicio'); }}
                className={`flex items-center border-b cursor-pointer transition-colors ${selecionada ? 'bg-primary/5' : 'hover:bg-muted/10'}`}>
                {Array.from({ length: dias }, (_, i) => {
                  const dia = new Date(ano, mes, i + 1);
                  const ativo = ini && fim && dia >= ini && dia <= fim;
                  const isHoje = dia.toDateString() === today.toDateString();
                  const isSabDom = dia.getDay() === 0 || dia.getDay() === 6;
                  const isIni = ini && dia.toDateString() === ini.toDateString();
                  const isFim = fim && dia.toDateString() === fim.toDateString();
                  return (
                    <div key={i}
                      onClick={e => { e.stopPropagation(); handleClickDia(new Date(ano, mes, i + 1)); }}
                      className={`w-7 h-9 shrink-0 border-l border-border flex items-center justify-center cursor-pointer transition-colors
                        ${isHoje ? 'bg-primary/10' : isSabDom ? 'bg-muted/20' : ''}
                        ${etapaSelecionada ? 'hover:bg-primary/20' : ''}`}>
                      {ativo && (
                        <div className={`w-6 h-4 rounded-sm flex items-center justify-center text-[8px] text-white font-bold ${EXEC_COR[loc.status_execucao] || 'bg-slate-200'}
                          ${isIni ? 'rounded-l-full' : ''} ${isFim ? 'rounded-r-full' : ''}`}>
                          {isIni && 'S'}
                          {isFim && !isIni && 'F'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Legenda do Gantt */}
        <div className="flex flex-wrap gap-3 pt-2 text-[10px] text-muted-foreground">
          <span><span className="font-bold text-green-600">S</span> = início da etapa</span>
          <span><span className="font-bold text-amber-600">F</span> = término previsto</span>
          <span>Clique no cabeçalho do dia para marcar início/término da etapa selecionada</span>
        </div>
      </div>
    );
  }

  // ── Gantt Semanal ─────────────────────────────────────────────────────────
  function GanttSemanal() {
    const dias: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(semanaBase); d.setDate(semanaBase.getDate() + i); dias.push(d);
    }
    const fimSemana = dias[6];

    const etVisiveis = etapas.filter(e => {
      const loc = etapasLocal[e.id] || e;
      const ini = toDate(loc.data_inicio); const fim = toDate(loc.data_fim_prevista);
      if (!ini && !fim) return false;
      if (ini && ini <= fimSemana && (!fim || fim >= dias[0])) return true;
      if (fim && fim >= dias[0] && (!ini || ini <= fimSemana)) return true;
      return false;
    }).sort((a, b) => Number(a.ordem) - Number(b.ordem));

    const ativa = etapaSelecionada ? (etapasLocal[etapaSelecionada] || etapas.find(e => e.id === etapaSelecionada)) : null;

    return (
      <div className="overflow-x-auto">
        <div style={{ minWidth: '480px' }}>
          <div className="grid grid-cols-8 gap-px bg-border rounded-t-lg overflow-hidden">
            <div className="bg-muted/40 px-2 py-2 text-[10px] font-bold uppercase text-muted-foreground">Etapa</div>
            {dias.map((dia, i) => {
              const isHoje = dia.toDateString() === today.toDateString();
              const isSabDom = dia.getDay() === 0 || dia.getDay() === 6;
              return (
                <div key={i}
                  onClick={() => handleClickDia(dia)}
                  className={`px-2 py-2 text-center text-[11px] font-medium cursor-pointer transition-colors select-none
                    ${isHoje ? 'bg-primary text-primary-foreground' : isSabDom ? 'bg-muted/60 text-muted-foreground' : 'bg-muted/30 hover:bg-primary/10'}
                    ${etapaSelecionada ? (modoClick === 'inicio' ? 'hover:bg-green-200' : 'hover:bg-amber-200') : ''}`}>
                  <p>{DIAS_SEMANA[dia.getDay()]}</p>
                  <p className="font-bold">{dia.getDate()}</p>
                  <p className="text-[9px]">{MESES[dia.getMonth()]}</p>
                </div>
              );
            })}
          </div>

          {etapaSelecionada && (
            <div className={`grid grid-cols-8 gap-px bg-border`}>
              <div className={`col-span-8 px-3 py-1 text-[11px] font-medium flex items-center gap-1.5 ${modoClick === 'inicio' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                <Info className="h-3 w-3" /> {ativa?.etapa_nome} — clique no dia para marcar {modoClick === 'inicio' ? '🟢 INÍCIO' : '🔴 TÉRMINO'}
              </div>
            </div>
          )}

          {etVisiveis.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground border border-t-0 rounded-b-lg">Nenhuma etapa com datas nesta semana</div>
          ) : etVisiveis.map(etapa => {
            const loc = etapasLocal[etapa.id] || etapa;
            const ini = toDate(loc.data_inicio); const fim = toDate(loc.data_fim_prevista) || toDate(loc.data_fim_real);
            const selecionada = etapaSelecionada === etapa.id;
            return (
              <div key={etapa.id}
                className={`grid grid-cols-8 gap-px bg-border border-t cursor-pointer ${selecionada ? 'ring-1 ring-inset ring-primary' : ''}`}
                onClick={() => { setEtapaSelecionada(selecionada ? '' : etapa.id); setModoClick('inicio'); }}>
                <div className={`bg-background px-2 py-2 ${selecionada ? 'bg-primary/5' : ''}`}>
                  <p className="text-[10px] font-semibold leading-tight">{etapa.etapa_nome}</p>
                  <span className={`text-[9px] px-1 py-0.5 rounded border font-bold ${EXEC_COR_TEXT[loc.status_execucao] || ''}`}>
                    {EXEC_LABEL[loc.status_execucao]?.split(' ')[0]}
                  </span>
                </div>
                {dias.map((dia, i) => {
                  const ativo = ini && fim && dia >= ini && dia <= fim;
                  const isSabDom = dia.getDay() === 0 || dia.getDay() === 6;
                  const isIni = ini && dia.toDateString() === ini.toDateString();
                  const isFim = fim && dia.toDateString() === fim.toDateString();
                  return (
                    <div key={i}
                      onClick={e => { e.stopPropagation(); handleClickDia(dia); }}
                      className={`bg-background h-12 flex items-center justify-center cursor-pointer transition-colors
                        ${isSabDom ? 'bg-muted/20' : ''}
                        ${etapaSelecionada ? 'hover:bg-primary/15' : ''}`}>
                      {ativo && (
                        <div className={`w-full h-7 mx-0.5 rounded-sm flex items-center justify-center text-[9px] text-white font-bold ${EXEC_COR[loc.status_execucao] || 'bg-slate-200'}
                          ${isIni ? 'ml-2 rounded-l-full' : ''} ${isFim ? 'mr-2 rounded-r-full' : ''}`}>
                          {isIni && 'Início'}
                          {isFim && !isIni && 'Fim'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Render principal ──────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" /> Cronograma
        </h1>
        <div className="flex-1 min-w-48 max-w-sm">
          <Select value={obraId} onValueChange={v => setObraId(v ?? '')}>
            <SelectTrigger className="h-9 text-sm bg-background">
              <SelectValue placeholder="Selecionar obra..." />
            </SelectTrigger>
            <SelectContent>
              {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex rounded-lg border overflow-hidden">
          <button onClick={() => setViewMode('mensal')} className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'mensal' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}>Mensal</button>
          <button onClick={() => setViewMode('semanal')} className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'semanal' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}>Semanal</button>
        </div>
        {obraId && <Button variant="outline" size="sm" onClick={carregar} disabled={loading}><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /></Button>}
      </div>

      {!obraId ? (
        <div className="text-center py-20 border-2 border-dashed rounded-xl text-muted-foreground">
          <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p>Selecione uma obra para ver e planejar o cronograma</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[300px_1fr] gap-4 items-start">

          {/* ── Painel de etapas ── */}
          <div className="space-y-2 lg:sticky lg:top-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Etapas</p>
              {etapaSelecionada && (
                <button onClick={() => { setEtapaSelecionada(''); setModoClick('inicio'); }}
                  className="text-[10px] text-muted-foreground hover:text-foreground underline">
                  limpar seleção
                </button>
              )}
            </div>

            {/* Instrução de uso */}
            <div className="rounded-lg border bg-blue-50 border-blue-200 px-3 py-2 text-[11px] text-blue-700 space-y-0.5">
              <p className="font-semibold">Como usar:</p>
              <p>1. Selecione uma etapa (clique nela)</p>
              <p>2. Clique no <strong>dia de início</strong> no Gantt</p>
              <p>3. Clique no <strong>dia de término</strong></p>
              <p>4. Clique <strong>Salvar</strong> na etapa</p>
              <p>Ou preencha as datas diretamente nos campos.</p>
            </div>

            {loading ? (
              <div className="py-8 text-center text-muted-foreground text-sm">Carregando...</div>
            ) : etapas.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm border-2 border-dashed rounded-xl">
                Nenhuma etapa cadastrada
              </div>
            ) : (
              <PainelEtapas />
            )}
          </div>

          {/* ── Gantt ── */}
          <Card>
            <CardContent className="p-4 space-y-3">
              {/* Navegação de período */}
              <div className="flex items-center gap-2 flex-wrap">
                {viewMode === 'mensal' ? (
                  <>
                    <Button variant="outline" size="sm" className="h-8"
                      onClick={() => { let m = mes - 1; let a = ano; if (m < 0) { m = 11; a--; } setMes(m); setAno(a); }}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-semibold min-w-[140px] text-center">{MESES_FULL[mes]} {ano}</span>
                    <Button variant="outline" size="sm" className="h-8"
                      onClick={() => { let m = mes + 1; let a = ano; if (m > 11) { m = 0; a++; } setMes(m); setAno(a); }}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-xs"
                      onClick={() => { setMes(today.getMonth()); setAno(today.getFullYear()); }}>
                      Hoje
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" className="h-8"
                      onClick={() => { const d = new Date(semanaBase); d.setDate(d.getDate() - 7); setSemanaBase(d); }}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-semibold min-w-[200px] text-center">
                      {semanaBase.toLocaleDateString('pt-BR')} – {new Date(semanaBase.getTime() + 6 * 86400000).toLocaleDateString('pt-BR')}
                    </span>
                    <Button variant="outline" size="sm" className="h-8"
                      onClick={() => { const d = new Date(semanaBase); d.setDate(d.getDate() + 7); setSemanaBase(d); }}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-xs"
                      onClick={() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); setSemanaBase(d); }}>
                      Hoje
                    </Button>
                  </>
                )}

                {/* Legenda */}
                <div className="flex gap-2 ml-auto text-[10px] flex-wrap">
                  {Object.entries(EXEC_LABEL).map(([k, l]) => (
                    <span key={k} className={`px-2 py-0.5 rounded border font-medium ${EXEC_COR_TEXT[k]}`}>{l}</span>
                  ))}
                </div>
              </div>

              {loading ? (
                <div className="py-10 text-center text-muted-foreground text-sm">Carregando...</div>
              ) : viewMode === 'mensal' ? <GanttMensal /> : <GanttSemanal />}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function PlanejamentoPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><RefreshCw className="h-6 w-6 animate-spin text-primary" /></div>}>
      <PlanejamentoContent />
    </Suspense>
  );
}
