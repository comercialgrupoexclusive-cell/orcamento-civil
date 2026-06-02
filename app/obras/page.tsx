'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Building2, Plus, MapPin, User, TrendingUp, CheckCircle2, Clock, ChevronRight, RefreshCw, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const STATUS_OBRA_COR: Record<string, string> = {
  nao_iniciado: 'bg-slate-100 text-slate-600 border-slate-200',
  em_andamento: 'bg-amber-100 text-amber-700 border-amber-300',
  concluido:    'bg-green-100 text-green-700 border-green-300',
  paralisado:   'bg-red-100 text-red-600 border-red-200',
};
const STATUS_OBRA_LABEL: Record<string, string> = {
  nao_iniciado: 'Não Iniciado', em_andamento: 'Em Andamento',
  concluido: 'Concluído', paralisado: 'Paralisado',
};

interface ObraResumo {
  id: string; nome: string; status: string;
  endereco: string; bairro: string; cidade: string; estado: string;
  area_construida: number; responsavel: string; foto_url: string;
  progresso: number; etapas_total: number; etapas_concluidas: number; etapas_em_andamento: number;
  svcs_total: number; svcs_comprados: number; total_orcamento: number; orcamento_titulo: string;
  data_inicio: string; data_prev_termino: string;
}

export default function ObrasPage() {
  const [obras, setObras] = useState<ObraResumo[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/obras').catch(() => null);
    if (res?.ok) setObras(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /> Obras</h1>
          <p className="text-sm text-muted-foreground">{obras.length} obra{obras.length !== 1 ? 's' : ''} cadastrada{obras.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Link href="/obras/novo">
            <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" /> Nova Obra</Button>
          </Link>
        </div>
      </div>

      {loading && <div className="py-12 text-center text-muted-foreground text-sm">Carregando...</div>}

      {!loading && obras.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed rounded-xl text-muted-foreground">
          <Building2 className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium mb-4">Nenhuma obra cadastrada</p>
          <Link href="/obras/novo"><Button><Plus className="h-4 w-4 mr-1.5" /> Cadastrar primeira obra</Button></Link>
        </div>
      )}

      <div className="space-y-3">
        {obras.map(obra => (
          <Card key={obra.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {/* Foto ou placeholder */}
                <div className="hidden sm:flex w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-muted items-center justify-center border">
                  {obra.foto_url ? (
                    <img src={obra.foto_url} alt={obra.nome} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="h-8 w-8 text-muted-foreground/40" />
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start gap-2 flex-wrap">
                    <h3 className="font-bold text-base leading-tight flex-1 min-w-0">{obra.nome}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${STATUS_OBRA_COR[obra.status] || ''}`}>
                      {STATUS_OBRA_LABEL[obra.status] || obra.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{obra.endereco}{obra.bairro ? `, ${obra.bairro}` : ''} — {obra.cidade}/{obra.estado}</span>
                    <span className="flex items-center gap-1"><User className="h-3 w-3" />{obra.responsavel}</span>
                    {obra.area_construida > 0 && <span>{obra.area_construida} m²</span>}
                  </div>

                  {/* Progress */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-xs">
                      <div className={`h-full rounded-full transition-all ${obra.progresso >= 75 ? 'bg-green-500' : obra.progresso >= 40 ? 'bg-amber-500' : 'bg-primary'}`}
                        style={{ width: `${obra.progresso}%` }} />
                    </div>
                    <span className="text-xs font-semibold tabular-nums">{obra.progresso}%</span>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs">
                    <span className="flex items-center gap-1 text-green-700"><CheckCircle2 className="h-3 w-3" />{obra.etapas_concluidas}/{obra.etapas_total} etapas</span>
                    {obra.etapas_em_andamento > 0 && (
                      <span className="flex items-center gap-1 text-amber-700"><Clock className="h-3 w-3" />{obra.etapas_em_andamento} em andamento</span>
                    )}
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />{obra.svcs_comprados}/{obra.svcs_total} serviços comprados
                    </span>
                    {obra.data_prev_termino && (
                      <span className="text-muted-foreground">Prev. término: {new Date(obra.data_prev_termino+'T00:00:00').toLocaleDateString('pt-BR')}</span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex flex-col gap-1.5">
                  <Link href={`/obras/${obra.id}`}>
                    <Button size="sm" variant="outline" className="h-8 text-xs w-full">
                      Detalhes <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </Link>
                  <Link href={`/obras/${obra.id}/editar`}>
                    <Button size="sm" variant="outline" className="h-8 text-xs w-full">
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                    </Button>
                  </Link>
                  <Link href={`/gerenciamento?obra_id=${obra.id}`}>
                    <Button size="sm" className="h-8 text-xs w-full">Gerenciar</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
