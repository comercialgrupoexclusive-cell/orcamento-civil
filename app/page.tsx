'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2, TrendingUp, CheckCircle2, Clock,
  AlertCircle, ShoppingCart, ChevronRight, Plus, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  PieChart, Pie, Legend,
} from 'recharts';

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

const STATUS_EXEC_COR: Record<string, string> = {
  nao_iniciado: 'bg-slate-100 text-slate-600 border-slate-200',
  em_andamento: 'bg-amber-100 text-amber-700 border-amber-300',
  concluido:    'bg-green-100 text-green-700 border-green-300',
};
const STATUS_EXEC_LABEL: Record<string, string> = {
  nao_iniciado: 'Não Iniciado', em_andamento: 'Em Andamento', concluido: 'Concluído',
};
const STATUS_COMPRA_COR: Record<string, string> = {
  pendente:     'bg-red-100 text-red-700 border-red-200',
  pedido_feito: 'bg-blue-100 text-blue-700 border-blue-200',
  parcial:      'bg-amber-100 text-amber-700 border-amber-200',
  comprado:     'bg-green-100 text-green-700 border-green-200',
};
const STATUS_COMPRA_LABEL: Record<string, string> = {
  pendente: 'Pendente', pedido_feito: 'Pedido Feito', parcial: 'Parcial', comprado: 'Comprado',
};
const CORES = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6'];

function GaugeProgresso({ valor, label }: { valor: number; label: string }) {
  const cor = valor >= 75 ? '#10b981' : valor >= 40 ? '#f59e0b' : '#6366f1';
  const data = [{ name: label, value: valor, fill: cor }];
  return (
    <div className="relative flex flex-col items-center justify-center h-36">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart cx="50%" cy="68%" innerRadius="58%" outerRadius="88%"
          startAngle={180} endAngle={0} data={data} barSize={12}>
          <RadialBar dataKey="value" cornerRadius={6} background={{ fill: '#f1f5f9' }}
            isAnimationActive animationBegin={200} animationDuration={1200} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute bottom-2 text-center">
        <p className="text-2xl font-black tabular-nums" style={{ color: cor }}>{valor}%</p>
        <p className="text-[10px] text-muted-foreground max-w-[90px] leading-tight truncate">{label}</p>
      </div>
    </div>
  );
}

interface ProximaEtapa {
  id: string; etapa_nome: string; data_fim_prevista: string;
  status_compra_geral: string; svcs_total: number; svcs_comprados: number;
}
interface ObraDash {
  id: string; nome: string; status: string; cidade: string; estado: string;
  area_construida: number; responsavel: string;
  progresso: number; etapas_total: number; etapas_concluidas: number; etapas_em_andamento: number;
  proximas_etapas: ProximaEtapa[];
  svcs_total: number; svcs_comprados: number; svcs_pendentes: number;
  total_orcamento: number; orcamento_titulo: string;
}
interface DashData {
  resumo: { total_obras: number; obras_ativas: number; total_investimento: number };
  obras: ObraDash[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

  async function carregar() {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) setData(await res.json());
    } finally { setLoading(false); }
  }
  useEffect(() => { carregar(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-2">
        <RefreshCw className="h-7 w-7 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-3">
        <p className="text-muted-foreground">Erro ao carregar dashboard.</p>
        <Button variant="outline" onClick={carregar}>Tentar novamente</Button>
      </div>
    </div>
  );

  const { resumo, obras } = data;
  const totalSvcs = obras.reduce((s, o) => s + o.svcs_total, 0);
  const totalComp = obras.reduce((s, o) => s + o.svcs_comprados, 0);
  const totalPend = obras.reduce((s, o) => s + o.svcs_pendentes, 0);

  const barData = obras.map((o, i) => ({
    name: o.nome.split(' ').slice(0, 2).join(' '),
    progresso: o.progresso,
    fill: CORES[i % CORES.length],
  }));

  const pizzaData = [
    { name: 'Comprado', value: totalComp, fill: '#10b981' },
    { name: 'Pendente', value: totalPend, fill: '#ef4444' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral das obras e compras</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
          <Link href="/obras/novo">
            <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" /> Nova Obra</Button>
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Obras', value: String(resumo.total_obras), icon: Building2, bg: 'bg-indigo-50 border-indigo-200', cor: 'text-indigo-700' },
          { label: 'Obras Ativas', value: String(resumo.obras_ativas), icon: TrendingUp, bg: 'bg-amber-50 border-amber-200', cor: 'text-amber-700' },
          { label: 'Serviços Comprados', value: `${totalComp}/${totalSvcs}`, icon: CheckCircle2, bg: 'bg-green-50 border-green-200', cor: 'text-green-700' },
          { label: 'Investimento', value: fmtBRL(resumo.total_investimento), icon: ShoppingCart, bg: 'bg-violet-50 border-violet-200', cor: 'text-violet-700' },
        ].map(k => (
          <Card key={k.label} className={`border ${k.bg}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${k.bg} border`}>
                <k.icon className={`h-4 w-4 ${k.cor}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground leading-tight">{k.label}</p>
                <p className={`text-lg font-bold tabular-nums leading-tight ${k.cor}`}>{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {obras.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed rounded-xl text-muted-foreground">
          <Building2 className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium mb-4">Nenhuma obra cadastrada</p>
          <Link href="/obras/novo"><Button><Plus className="h-4 w-4 mr-1.5" /> Cadastrar Obra</Button></Link>
        </div>
      ) : (
        <>
          {/* Gráficos */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-semibold mb-3">📊 Progresso por Obra</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={barData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barSize={22}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                    <Tooltip formatter={(v) => [`${v}%`, 'Progresso']} />
                    <Bar dataKey="progresso" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={900}>
                      {barData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-semibold mb-3">🛒 Status de Compras</p>
                {pizzaData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={pizzaData} cx="50%" cy="50%" innerRadius={42} outerRadius={68}
                        dataKey="value" nameKey="name" paddingAngle={3}
                        isAnimationActive animationBegin={100} animationDuration={900}>
                        {pizzaData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [v, 'Serviços']} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">Sem serviços</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Obras */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Detalhes por Obra</h2>
            {obras.map(obra => (
              <Card key={obra.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  <div className="grid sm:grid-cols-[160px_1fr_auto] gap-0">
                    {/* Gauge */}
                    <div className="hidden sm:flex items-center justify-center border-r bg-muted/10 px-2">
                      <GaugeProgresso valor={obra.progresso} label={obra.nome.split(' ')[0]} />
                    </div>

                    {/* Info */}
                    <div className="p-4 space-y-2.5">
                      <div className="flex items-start gap-2 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm leading-tight">{obra.nome}</h3>
                          <p className="text-xs text-muted-foreground">{obra.cidade}–{obra.estado} · {obra.area_construida}m² · {obra.responsavel}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${STATUS_EXEC_COR[obra.status] || ''}`}>
                          {STATUS_EXEC_LABEL[obra.status] || obra.status}
                        </span>
                      </div>

                      {/* Progress mobile */}
                      <div className="sm:hidden flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${obra.progresso}%` }} />
                        </div>
                        <span className="text-xs font-bold">{obra.progresso}%</span>
                      </div>

                      <div className="flex gap-4 text-xs flex-wrap">
                        <span className="flex items-center gap-1 text-green-700"><CheckCircle2 className="h-3 w-3" />{obra.etapas_concluidas} concluídas</span>
                        <span className="flex items-center gap-1 text-amber-700"><Clock className="h-3 w-3" />{obra.etapas_em_andamento} em andamento</span>
                        <span className="flex items-center gap-1 text-slate-500"><AlertCircle className="h-3 w-3" />{obra.etapas_total - obra.etapas_concluidas - obra.etapas_em_andamento} não iniciadas</span>
                      </div>

                      {obra.proximas_etapas.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Próximas etapas</p>
                          {obra.proximas_etapas.map(et => (
                            <div key={et.id} className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs">{et.etapa_nome}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${STATUS_COMPRA_COR[et.status_compra_geral] || ''}`}>
                                {STATUS_COMPRA_LABEL[et.status_compra_geral] || et.status_compra_geral}
                              </span>
                              {et.data_fim_prevista && (
                                <span className="text-[10px] text-muted-foreground">
                                  até {new Date(et.data_fim_prevista + 'T00:00:00').toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex sm:flex-col gap-2 p-3 border-t sm:border-t-0 sm:border-l bg-muted/10 items-center justify-end">
                      <Link href={`/obras/${obra.id}`}>
                        <Button size="sm" variant="outline" className="h-8 text-xs w-full">
                          <Building2 className="h-3.5 w-3.5 mr-1" /> Obra
                        </Button>
                      </Link>
                      <Link href={`/gerenciamento?obra_id=${obra.id}`}>
                        <Button size="sm" className="h-8 text-xs w-full">
                          Gerenciar <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
