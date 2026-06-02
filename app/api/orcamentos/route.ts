import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { readSheet, appendRow } from '@/lib/db';
import { validarCampoObrigatorio, validarBDI, coletarErros } from '@/lib/validators';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const soTemplates = searchParams.get('templates') === '1';

    const rows = await readSheet('ORCAMENTOS');
    const itens = await readSheet('ITENS_ORCAMENTO');
    const insumos = await readSheet('INSUMOS');
    const composicoes = await readSheet('COMPOSICOES');
    const itensComposicao = await readSheet('ITENS_COMPOSICAO');

    const insumoMap = Object.fromEntries(insumos.map(i => [i.id, i]));

    // Calcula custo efetivo de um item do orçamento considerando qtd_overrides
    // (mesma lógica do /api/orcamentos/[id]/route.ts)
    function custoItemEfetivo(item: Record<string, string>): number {
      const qtd = Number(item.quantidade) || 0;
      const cuOverride = Number(item.custo_unitario_override) || 0;
      if (cuOverride) return cuOverride * qtd;

      const qtdOvs: Record<string, number> = {};
      try { Object.assign(qtdOvs, JSON.parse(item.qtd_overrides || '{}')); } catch { /**/ }

      const insItens = itensComposicao.filter(ic => ic.composicao_id === item.composicao_id);
      if (insItens.length === 0) return 0;

      return insItens.reduce((acc, ic) => {
        const preco  = Number(insumoMap[ic.insumo_id]?.preco || 0);
        const qtdIns = ic.insumo_id in qtdOvs ? qtdOvs[ic.insumo_id] : Number(ic.coeficiente || 0) * qtd;
        return acc + preco * qtdIns;
      }, 0);
    }

    const filtrados = soTemplates
      ? rows.filter(r => r.status === 'template')
      : rows.filter(r => r.status !== 'template');

    const result = filtrados.map(row => {
      const bdi = Number(row.bdi_percentual) || 0;
      const orcItens = itens.filter(i => i.orcamento_id === row.id);
      const totalDireto = orcItens.reduce((acc, i) => acc + custoItemEfetivo(i), 0);
      return {
        id: row.id,
        titulo: row.titulo,
        descricao: row.descricao,
        area_construida: Number(row.area_construida) || 0,
        data_criacao: row.data_criacao,
        status: row.status,
        bdi_percentual: bdi,
        total_direto: totalDireto,
        total_com_bdi: totalDireto * (1 + bdi / 100),
        num_itens: orcItens.length,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Criar a partir de template
    if (body.template_id) {
      const orcamentos = await readSheet('ORCAMENTOS');
      const template = orcamentos.find(o => o.id === body.template_id && o.status === 'template');
      if (!template) return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 });

      const novoId = uuidv4();
      const novoOrc = {
        ...template,
        id: novoId,
        titulo: String(body.titulo || template.titulo.replace('[Template] ', '')).trim(),
        descricao: String(body.descricao || template.descricao || '').trim(),
        bdi_percentual: Number(body.bdi_percentual ?? template.bdi_percentual) || 0,
        status: 'em_andamento',
        data_criacao: new Date().toISOString(),
        data_atualizacao: new Date().toISOString(),
      };
      await appendRow('ORCAMENTOS', novoOrc);

      const itens = await readSheet('ITENS_ORCAMENTO');
      for (const item of itens.filter(i => i.orcamento_id === body.template_id)) {
        await appendRow('ITENS_ORCAMENTO', { ...item, id: uuidv4(), orcamento_id: novoId });
      }
      return NextResponse.json({ id: novoId, titulo: novoOrc.titulo, status: 'em_andamento' }, { status: 201 });
    }

    const erros = coletarErros([
      validarCampoObrigatorio(body.titulo, 'Título'),
      validarCampoObrigatorio(body.area_construida, 'Área construída'),
      validarBDI(body.bdi_percentual ?? 0),
    ]);
    if (erros.length > 0) return NextResponse.json({ erros }, { status: 400 });

    const orcamento = {
      id: uuidv4(),
      titulo: String(body.titulo).trim(),
      descricao: String(body.descricao || '').trim(),
      area_construida: Number(body.area_construida) || 0,
      data_criacao: new Date().toISOString(),
      data_atualizacao: new Date().toISOString(),
      status: 'em_andamento',
      bdi_percentual: Number(body.bdi_percentual) || 0,
    };

    await appendRow('ORCAMENTOS', orcamento);
    return NextResponse.json(orcamento, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
