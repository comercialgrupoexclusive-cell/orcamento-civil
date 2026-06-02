'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const EXEC_COR_BG: Record<string, string> = {
  nao_iniciado: 'bg-slate-100 border-slate-300',
  em_andamento: 'bg-amber-100 border-amber-400',
  concluido:    'bg-green-100 border-green-400',
};
const EXEC_LABEL: Record<string, string> = {
  nao_iniciado: 'Não Iniciado', em_andamento: 'Em Andamento', concluido: 'Concluído',
};

interface Etapa { id: string; etapa_nome: string; status_execucao: string; data_inicio: string; data_fim_prevista: string; data_fim_real: string; ordem: string; }
interface Obra { id: string; nome: string; cidade: string; estado: string; }

function diasNoMes(ano: number, mes: number) { return new Date(ano, mes + 1, 0).getDate(); }
function parseDate(s: string): Date | null { if (!s) return null; return new Date(s + 'T00:00:00'); }

function PlanejamentoContent() {
  const searchParams = useSearchParams();
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraId, setObraId] = useState(searchParams.get('obra_id') || '');
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'mensal' | 'semanal'>('mensal');
  const today = new Date();
  const [ano, setAno] = useState(today.getFullYear());
  const [mes, setMes] = useState(today.getMonth());
  const [semanaBase, setSemanaBase] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d;
  });

  useEffect(() => {
    fetch('/api/obras').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setObras(d);
    }).catch(() => {});
  }, []);

  const carregar = useCallback(async () => {
    if (!obraId) return;
    setLoading(true);
    const res = await fetch(`/api/etapas-obra?obra_id=${obraId}`);
    if (res.ok) setEtapas(await res.json());
    setLoading(false);
  }, [obraId]);

  useEffect(() => { carregar(); }, [carregar]);

  // Verifica se etapa está ativa em determinado período
  function etapaAtivaNoPeriodo(etapa: Etapa, inicioP: Date, fimP: Date): boolean {
    const ini = parseDate(etapa.data_inicio);
    const fim = parseDate(etapa.data_fim_prevista) || parseDate(etapa.data_fim_real);
    if (!ini || !fim) return false;
    return ini <= fimP && fim >= inicioP;
  }

  // ── Visualização Mensal (Gantt simples) ──────────────────────────────────
  function ViewMensal() {
    const dias = diasNoMes(ano, mes);
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes, dias);
    const etApenas = etapas.filter(e => etapaAtivaNoPeriodo(e, primeiroDia, ultimoDia))
      .sort((a, b) => Number(a.ordem) - Number(b.ordem));

    return (
      <div className="overflow-x-auto">
        <div style={{ minWidth: `${dias * 28 + 200}px` }}>
          {/* Header dias */}
          <div className="flex border-b mb-1">
            <div className="w-48 shrink-0 px-2 py-1 text-[11px] font-bold uppercase text-muted-foreground">Etapa</div>
            {Array.from({ length: dias }, (_, i) => {
              const d = new Date(ano, mes, i + 1);
              const isHoje = d.toDateString() === today.toDateString();
              const isSab = d.getDay() === 6;
              const isDom = d.getDay() === 0;
              return (
                <div key={i} className={`w-7 shrink-0 text-center py-1 text-[10px] font-medium border-l ${isHoje ? 'bg-primary text-primary-foreground rounded' : (isSab || isDom) ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
                  {i + 1}
                </div>
              );
            })}
          </div>
          {/* Linhas de etapas */}
          {etApenas.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma etapa neste mês</div>
          ) : etApenas.map(etapa => {
            const ini = parseDate(etapa.data_inicio);
            const fim = parseDate(etapa.data_fim_prevista) || parseDate(etapa.data_fim_real);
            return (
              <div key={etapa.id} className="flex items-center border-b hover:bg-muted/10">
                <div className="w-48 shrink-0 px-2 py-2">
                  <p className="text-xs font-medium truncate">{etapa.etapa_nome}</p>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${EXEC_COR_BG[etapa.status_execucao] || ''}`}>
                    {EXEC_LABEL[etapa.status_execucao]}
                  </span>
                </div>
                {Array.from({ length: dias }, (_, i) => {
                  const dia = new Date(ano, mes, i + 1);
                  const ativo = ini && fim && dia >= ini && dia <= fim;
                  const isHoje = dia.toDateString() === today.toDateString();
                  const isSabDom = dia.getDay() === 0 || dia.getDay() === 6;
                  return (
                    <div key={i} className={`w-7 h-8 shrink-0 border-l flex items-center justify-center ${isHoje ? 'bg-primary/10' : isSabDom ? 'bg-muted/30' : ''}`}>
                      {ativo && (
                        <div className={`w-6 h-4 rounded-sm ${etapa.status_execucao === 'concluido' ? 'bg-green-500' : etapa.status_execucao === 'em_andamento' ? 'bg-amber-500' : 'bg-slate-300'}`} />
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

  // ── Visualização Semanal ──────────────────────────────────────────────────
  function ViewSemanal() {
    const dias: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(semanaBase);
      d.setDate(semanaBase.getDate() + i);
      dias.push(d);
    }
    const fimSemana = dias[6];
    const etApenas = etapas.filter(e => etapaAtivaNoPeriodo(e, dias[0], fimSemana))
      .sort((a, b) => Number(a.ordem) - Number(b.ordem));

    return (
      <div className="overflow-x-auto">
        <div style={{ minWidth: '600px' }}>
          <div className="grid grid-cols-8 gap-px bg-border rounded-lg overflow-hidden">
            <div className="bg-muted/40 px-3 py-2 text-[11px] font-bold uppercase text-muted-foreground">Etapa</div>
            {dias.map((dia, i) => {
              const isHoje = dia.toDateString() === today.toDateString();
              const isSabDom = dia.getDay() === 0 || dia.getDay() === 6;
              return (
                <div key={i} className={`px-2 py-2 text-center text-[11px] font-medium ${isHoje ? 'bg-primary text-primary-foreground' : isSabDom ? 'bg-muted/60 text-muted-foreground' : 'bg-muted/30'}`}>
                  <p>{['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][dia.getDay()]}</p>
                  <p className="font-bold">{dia.getDate()}</p>
                </div>
              );
            })}
          </div>
          {etApenas.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma etapa nesta semana</div>
          ) : etApenas.map(etapa => {
            const ini = parseDate(etapa.data_inicio);
            const fim = parseDate(etapa.data_fim_prevista) || parseDate(etapa.data_fim_real);
            return (
              <div key={etapa.id} className="grid grid-cols-8 gap-px bg-border border-t">
                <div className="bg-background px-3 py-2">
                  <p className="text-xs font-medium">{etapa.etapa_nome}</p>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${EXEC_COR_BG[etapa.status_execucao] || ''}`}>
                    {EXEC_LABEL[etapa.status_execucao]}
                  </span>
                </div>
                {dias.map((dia, i) => {
                  const ativo = ini && fim && dia >= ini && dia <= fim;
                  return (
                    <div key={i} className={`bg-background h-12 flex items-center justify-center ${dia.getDay() === 0 || dia.getDay() === 6 ? 'bg-muted/20' : ''}`}>
                      {ativo && <div className={`w-full h-7 mx-0.5 rounded-sm ${etapa.status_execucao === 'concluido' ? 'bg-green-400' : etapa.status_execucao === 'em_andamento' ? 'bg-amber-400' : 'bg-slate-200'}`} />}
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

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /> Cronograma</h1>
        <div className="flex-1 min-w-48 max-w-sm">
          <Select value={obraId} onValueChange={v => setObraId(v ?? "")}>
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

      {/* Legenda */}
      <div className="flex flex-wrap gap-2 text-xs">
        {Object.entries(EXEC_LABEL).map(([k, l]) => (
          <span key={k} className={`px-2 py-0.5 rounded border font-medium ${EXEC_COR_BG[k]}`}>{l}</span>
        ))}
        <span className="text-muted-foreground">· Fim de semana em cinza · Hoje destacado</span>
      </div>

      {!obraId ? (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl">
          <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p>Selecione uma obra para ver o cronograma</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-4 space-y-3">
            {/* Navegação de período */}
            <div className="flex items-center gap-2">
              {viewMode === 'mensal' ? (
                <>
                  <Button variant="outline" size="sm" className="h-8" onClick={() => { let m = mes - 1; let a = ano; if (m < 0) { m = 11; a--; } setMes(m); setAno(a); }}><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="text-sm font-semibold min-w-[140px] text-center">{MESES[mes]} {ano}</span>
                  <Button variant="outline" size="sm" className="h-8" onClick={() => { let m = mes + 1; let a = ano; if (m > 11) { m = 0; a++; } setMes(m); setAno(a); }}><ChevronRight className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setMes(today.getMonth()); setAno(today.getFullYear()); }}>Hoje</Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" className="h-8" onClick={() => { const d = new Date(semanaBase); d.setDate(d.getDate() - 7); setSemanaBase(d); }}><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="text-sm font-semibold min-w-[200px] text-center">
                    {semanaBase.toLocaleDateString('pt-BR')} – {new Date(semanaBase.getTime() + 6 * 86400000).toLocaleDateString('pt-BR')}
                  </span>
                  <Button variant="outline" size="sm" className="h-8" onClick={() => { const d = new Date(semanaBase); d.setDate(d.getDate() + 7); setSemanaBase(d); }}><ChevronRight className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); setSemanaBase(d); }}>Hoje</Button>
                </>
              )}
            </div>

            {loading ? <div className="py-8 text-center text-muted-foreground text-sm">Carregando...</div>
              : viewMode === 'mensal' ? <ViewMensal /> : <ViewSemanal />
            }
          </CardContent>
        </Card>
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
