'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, FileSpreadsheet, FileDown } from 'lucide-react';
import type { Orcamento } from '@/lib/types';

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function fmtData(iso?: string) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('pt-BR'); } catch { return ''; }
}

export default function ExportarPage() {
  const [orcamentos, setOrcamentos] = useState<(Orcamento & { total_com_bdi: number; area_construida?: number })[]>([]);

  useEffect(() => {
    fetch('/api/orcamentos').then(r => r.json()).then(d => setOrcamentos(Array.isArray(d) ? d : []));
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-bold mb-1">Exportar</h1>
        <p className="text-muted-foreground text-sm">Exporte dados do sistema em formato Excel.</p>
      </div>

      {/* Base de dados */}
      <section>
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Base de Dados</h2>
        <div className="space-y-2">
          {[
            { label: 'Base de Insumos', desc: 'Todos os insumos cadastrados (código, preço, categoria)', tipo: 'insumos' },
            { label: 'Base de Composições', desc: 'Composições e seus itens com coeficientes', tipo: 'composicoes' },
            { label: 'Base Completa', desc: 'Insumos + composições + itens em uma planilha', tipo: 'base' },
          ].map(item => (
            <Card key={item.tipo}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.open(`/api/exportar?tipo=${item.tipo}`, '_blank')}>
                  <Download className="h-3.5 w-3.5 mr-1.5" /> Exportar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Modelo de gabarito */}
      <section>
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Modelo para Importação</h2>
        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-sm flex items-center gap-2">
                <FileDown className="h-4 w-4 text-amber-600" />
                Exportar Modelo Excel
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Baixe o gabarito Excel com as composições disponíveis e seus custos unitários.
                Preencha as quantidades e importe pelo módulo de Importação.
              </p>
            </div>
            <Button variant="outline" size="sm" className="border-amber-400 text-amber-700 hover:bg-amber-100 shrink-0 ml-4"
              onClick={() => window.open('/api/exportar?tipo=modelo-orcamento', '_blank')}>
              <Download className="h-3.5 w-3.5 mr-1.5" /> Baixar Modelo
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Exportar orçamentos */}
      <section>
        <h2 className="text-sm font-semibold mb-1 text-muted-foreground uppercase tracking-wide">Exportar Orçamento</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Gera Excel com 5 abas: <strong>Orçamento Visual</strong> (hierárquico, colorido) · <strong>Dados Brutos</strong> (linha por insumo) · <strong>Curva ABC</strong> · <strong>Por Categoria</strong> · <strong>Resumo Dashboard</strong>
        </p>
        {orcamentos.filter(o => String(o.status) !== 'template').length === 0
          ? <p className="text-muted-foreground text-sm">Nenhum orçamento cadastrado.</p>
          : (
            <div className="space-y-2">
              {orcamentos.filter(o => String(o.status) !== 'template').map(orc => (
                <Card key={orc.id}>
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{orc.titulo}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtBRL(orc.total_com_bdi)}
                        {orc.area_construida ? ` · ${orc.area_construida} m²` : ''}
                        {' · '}{fmtData(orc.data_criacao)}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="shrink-0 ml-3"
                      onClick={() => window.open(`/api/exportar?tipo=orcamento&id=${orc.id}`, '_blank')}>
                      <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" /> Excel (5 abas)
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        }
      </section>
    </div>
  );
}
