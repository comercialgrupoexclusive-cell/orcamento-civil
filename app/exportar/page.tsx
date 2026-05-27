'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download } from 'lucide-react';
import type { Orcamento } from '@/lib/types';

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function ExportarPage() {
  const [orcamentos, setOrcamentos] = useState<(Orcamento & { total_com_bdi: number })[]>([]);

  useEffect(() => {
    fetch('/api/orcamentos').then(r => r.json()).then(d => setOrcamentos(Array.isArray(d) ? d : []));
  }, []);

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-2">Exportar Excel</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Exporte seus dados para editar externamente e reimportar.
      </p>

      <div className="space-y-3 mb-6">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-sm">Base de Insumos</p>
              <p className="text-xs text-muted-foreground">Todos os insumos cadastrados</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.open('/api/exportar?tipo=insumos', '_blank')}>
              <Download className="h-3 w-3 mr-1" /> Exportar
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-sm">Base de Composições</p>
              <p className="text-xs text-muted-foreground">Composições e seus itens</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.open('/api/exportar?tipo=composicoes', '_blank')}>
              <Download className="h-3 w-3 mr-1" /> Exportar
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-sm">Base Completa</p>
              <p className="text-xs text-muted-foreground">Insumos + composições + itens</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.open('/api/exportar?tipo=base', '_blank')}>
              <Download className="h-3 w-3 mr-1" /> Exportar
            </Button>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-3">Exportar Orçamento</h2>
        {orcamentos.length === 0 && <p className="text-muted-foreground text-sm">Nenhum orçamento cadastrado</p>}
        <div className="space-y-2">
          {orcamentos.map(orc => (
            <Card key={orc.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{orc.titulo}</p>
                  <p className="text-xs text-muted-foreground">{fmtBRL(orc.total_com_bdi)} · {orc.data_criacao}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.open(`/api/exportar?tipo=orcamento&id=${orc.id}`, '_blank')}>
                  <Download className="h-3 w-3 mr-1" /> XLSX
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
