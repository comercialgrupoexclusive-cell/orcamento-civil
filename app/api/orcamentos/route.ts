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

    const custoComposicao = (composicaoId: string) =>
      itensComposicao
        .filter(i => i.composicao_id === composicaoId)
        .reduce((acc, i) => acc + Number(insumoMap[i.insumo_id]?.preco || 0) * Number(i.coeficiente || 0), 0);

    const filtrados = soTemplates
      ? rows.filter(r => r.status === 'template')
      : rows.filter(r => r.status !== 'template');

    const result = filtrados.map(row => {
      const bdi = Number(row.bdi_percentual) || 0;
      const orcItens = itens.filter(i => i.orcamento_id === row.id);
      const totalDireto = orcItens.reduce((acc, i) => {
        const custo = Number(i.custo_unitario_override) || custoComposicao(i.composicao_id);
        return acc + custo * Number(i.quantidade || 0);
      }, 0);
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
