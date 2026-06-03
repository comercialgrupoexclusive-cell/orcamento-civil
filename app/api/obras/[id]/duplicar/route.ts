import { NextRequest, NextResponse } from 'next/server';
import { readSheet, writeFile } from '@/lib/db';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [obras, etapasAll, svcsAll] = await Promise.all([
      readSheet('OBRAS'),
      readSheet('ETAPAS_OBRA'),
      readSheet('SERVICOS_ETAPA'),
    ]);

    const obra = obras.find(o => o.id === id);
    if (!obra) return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 });

    const novaObraId = randomUUID();
    const novaObra = {
      ...obra,
      id:              novaObraId,
      nome:            `${obra.nome} (cópia)`,
      status:          'nao_iniciado',
      data_criacao:    new Date().toISOString(),
      data_atualizacao:new Date().toISOString(),
    };

    // Duplica etapas mapeando IDs antigos → novos
    const etapasObra = etapasAll.filter(e => e.obra_id === id);
    const etapaIdMap = new Map<string, string>();
    const novasEtapas = etapasObra.map(et => {
      const novoId = randomUUID();
      etapaIdMap.set(et.id, novoId);
      return { ...et, id: novoId, obra_id: novaObraId };
    });

    // Duplica serviços usando novo etapa_obra_id
    const svcsObra = svcsAll.filter(s => s.obra_id === id);
    const novosSvcs = svcsObra.map(s => ({
      ...s,
      id:           randomUUID(),
      obra_id:      novaObraId,
      etapa_obra_id: etapaIdMap.get(s.etapa_obra_id) ?? s.etapa_obra_id,
      status_compra: 'pendente', // reseta status de compra
    }));

    // Grava em batch
    await Promise.all([
      writeFile('OBRAS',          [...obras, novaObra]),
      writeFile('ETAPAS_OBRA',    [...etapasAll, ...novasEtapas]),
      writeFile('SERVICOS_ETAPA', [...svcsAll,   ...novosSvcs]),
    ]);

    return NextResponse.json({
      ok: true,
      id: novaObraId,
      nome: novaObra.nome,
      etapas: novasEtapas.length,
      servicos: novosSvcs.length,
    });
  } catch (err) {
    console.error('[duplicar-obra]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
