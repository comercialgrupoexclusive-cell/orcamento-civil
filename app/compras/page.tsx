'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ShoppingCart, Building2, ChevronRight, RefreshCw, CheckCircle2, Clock, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const COMPRA_COR: Record<string, string> = {
  pendente:     'bg-red-100 text-red-700 border-red-300',
  pedido_feito: 'bg-blue-100 text-blue-700 border-blue-300',
  parcial:      'bg-amber-100 text-amber-700 border-amber-300',
  comprado:     'bg-green-100 text-green-700 border-green-300',
};
const COMPRA_LABEL: Record<string, string> = {
  pendente: 'Pendente', pedido_feito: 'Pedido Feito', parcial: 'Parcial', comprado: 'Comprado',
};

interface ObraResumo {
  id: string; nome: string; status: string;
  svcs_total: number; svcs_comprados: number;
  progresso: number;
}

export default function ComprasGlobalPage() {
  const [obras, setObras] = useState<ObraResumo[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/obras').catch(() => null);
    if (res?.ok) setObras(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const obrasComItens = obras.filter(o => o.svcs_total > 0);
  const totalItens    = obras.reduce((a, o) => a + o.svcs_total, 0);
  const totalComprados = obras.reduce((a, o) => a + o.svcs_comprados, 0);
  const pctGeral = totalItens > 0 ? Math.round((totalComprados / totalItens) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" /> Lista de Compras
          </h1>
          <p className="text-sm text-muted-foreground">
            {totalComprados}/{totalItens} itens comprados em todas as obras ({pctGeral}%)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Barra de progresso geral */}
      {totalItens > 0 && (
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-green-500 transition-all duration-500"
            style={{ width: `${pctGeral}%` }} />
        </div>
      )}

      {loading && <div className="py-12 text-center text-muted-foreground text-sm">Carregando...</div>}

      {!loading && obrasComItens.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed rounded-xl text-muted-foreground">
          <Package className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium mb-1">Nenhuma lista de compras</p>
          <p className="text-xs">Importe um orçamento para uma obra para gerar a lista de compras</p>
        </div>
      )}

      <div className="space-y-3">
        {obrasComItens.map(obra => {
          const pct      = obra.svcs_total > 0 ? Math.round((obra.svcs_comprados / obra.svcs_total) * 100) : 0;
          const pendentes = obra.svcs_total - obra.svcs_comprados;
          return (
            <Card key={obra.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm flex-1 min-w-0 truncate">{obra.nome}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0
                        ${pct === 100 ? COMPRA_COR.comprado : pendentes > 0 ? COMPRA_COR.pendente : COMPRA_COR.pedido_feito}`}>
                        {pct === 100 ? '✓ Completo' : `${pendentes} pendente${pendentes !== 1 ? 's' : ''}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-primary'}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-semibold tabular-nums shrink-0">{pct}%</span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1 text-green-700">
                        <CheckCircle2 className="h-3 w-3" /> {obra.svcs_comprados} comprados
                      </span>
                      {pendentes > 0 && (
                        <span className="flex items-center gap-1 text-red-600">
                          <Clock className="h-3 w-3" /> {pendentes} pendentes
                        </span>
                      )}
                      <span>{obra.svcs_total} total</span>
                    </div>
                  </div>

                  <Link href={`/obras/${obra.id}/compras`} className="shrink-0">
                    <Button size="sm" variant="outline" className="h-8 text-xs border-green-300 text-green-700 hover:bg-green-50">
                      Ver lista <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
