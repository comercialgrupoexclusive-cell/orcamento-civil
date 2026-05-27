import { NextRequest, NextResponse } from 'next/server';
import { readSheet } from '@/lib/db';
import * as XLSX from 'xlsx';
import { ETAPAS } from '@/lib/types';

export const dynamic = 'force-dynamic';

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get('tipo') || 'insumos'; // insumos | composicoes | orcamento
    const orcamentoId = searchParams.get('id');

    const wb = XLSX.utils.book_new();

    if (tipo === 'insumos' || tipo === 'base') {
      const insumos = await readSheet('INSUMOS');
      const ws = XLSX.utils.json_to_sheet(
        insumos.map(i => ({
          ID: i.id,
          Código: i.codigo,
          Descrição: i.descricao,
          Unidade: i.unidade,
          'Preço (R$)': Number(i.preco) || 0,
          Tipo: i.tipo,
          Categoria: i.categoria,
          Status: i.status,
        }))
      );
      XLSX.utils.book_append_sheet(wb, ws, 'Insumos');
    }

    if (tipo === 'composicoes' || tipo === 'base') {
      const composicoes = await readSheet('COMPOSICOES');
      const itensComp = await readSheet('ITENS_COMPOSICAO');
      const insumos = await readSheet('INSUMOS');
      const insumoMap = Object.fromEntries(insumos.map(i => [i.id, i]));

      const wsComp = XLSX.utils.json_to_sheet(
        composicoes.map(c => ({
          ID: c.id,
          Código: c.codigo,
          Descrição: c.descricao,
          'Unidade Produção': c.unidade_producao,
          Produção: Number(c.producao) || 1,
          'Descrição Técnica': c.descricao_tecnica,
          Status: c.status,
        }))
      );
      XLSX.utils.book_append_sheet(wb, wsComp, 'Composições');

      const wsItens = XLSX.utils.json_to_sheet(
        itensComp.map(i => ({
          ID: i.id,
          'ID Composição': i.composicao_id,
          'ID Insumo': i.insumo_id,
          'Insumo': insumoMap[i.insumo_id]?.descricao || '',
          Coeficiente: Number(i.coeficiente) || 0,
          Unidade: i.unidade,
        }))
      );
      XLSX.utils.book_append_sheet(wb, wsItens, 'Itens_Composição');
    }

    if (tipo === 'orcamento' && orcamentoId) {
      const orcamentos = await readSheet('ORCAMENTOS');
      const orc = orcamentos.find(o => o.id === orcamentoId);
      if (!orc) return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 });

      const itensOrc = await readSheet('ITENS_ORCAMENTO');
      const composicoes = await readSheet('COMPOSICOES');
      const itensComp = await readSheet('ITENS_COMPOSICAO');
      const insumos = await readSheet('INSUMOS');

      const compMap = Object.fromEntries(composicoes.map(c => [c.id, c]));
      const insumoMap = Object.fromEntries(insumos.map(i => [i.id, i]));

      const custoBase = (cid: string) =>
        itensComp
          .filter(i => i.composicao_id === cid)
          .reduce((a, i) => a + Number(insumoMap[i.insumo_id]?.preco || 0) * Number(i.coeficiente || 0), 0);

      const orcItens = itensOrc
        .filter(i => i.orcamento_id === orcamentoId)
        .map(i => {
          const comp = compMap[i.composicao_id];
          const cu = Number(i.custo_unitario_override) || custoBase(i.composicao_id);
          const qtd = Number(i.quantidade) || 0;
          return {
            id: i.id,
            etapa_codigo: i.etapa_codigo,
            descricao_override: i.descricao_override,
            unidade_override: i.unidade_override,
            quantidade_tipo: i.quantidade_tipo,
            comp,
            cu,
            qtd,
            total: cu * qtd,
          };
        });

      const bdi = Number(orc.bdi_percentual) || 0;
      let totalDireto = 0;

      for (const etapa of ETAPAS) {
        const etapaItens = orcItens.filter(i => i.etapa_codigo === etapa.codigo);
        if (etapaItens.length === 0) continue;

        const subtotal = etapaItens.reduce((a, i) => a + i.total, 0);
        totalDireto += subtotal;

        const rows = [
          ...etapaItens.map(i => ({
            'ID Item': i.id,
            'Cód. Composição': i.comp?.codigo || '',
            Descrição: i.descricao_override || i.comp?.descricao || '',
            Unidade: i.unidade_override || i.comp?.unidade_producao || '',
            Quantidade: i.qtd,
            'Custo Unit. (R$)': i.cu,
            'Total (R$)': i.total,
            'Qtd Tipo': i.quantidade_tipo,
          })),
          { 'ID Item': '', 'Cód. Composição': '', Descrição: `SUBTOTAL ${etapa.codigo} – ${etapa.descricao}`, Unidade: '', Quantidade: '', 'Custo Unit. (R$)': '', 'Total (R$)': subtotal, 'Qtd Tipo': '' },
        ];

        const ws = XLSX.utils.json_to_sheet(rows);
        const sheetName = `${etapa.codigo}_${etapa.descricao}`.slice(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }

      const totalComBDI = totalDireto * (1 + bdi / 100);
      const wsResumo = XLSX.utils.json_to_sheet([
        { Item: 'Orçamento', Valor: orc.titulo },
        { Item: 'Data', Valor: orc.data_criacao },
        { Item: 'Total Direto (R$)', Valor: totalDireto },
        { Item: `BDI (${bdi}%)`, Valor: totalDireto * (bdi / 100) },
        { Item: 'Total com BDI (R$)', Valor: totalComBDI },
      ]);
      XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');
    }

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = tipo === 'orcamento'
      ? `orcamento_${orcamentoId?.slice(0, 8)}.xlsx`
      : `${tipo}_${new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
