'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Building2, Save, RefreshCw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface OrcamentoOpt { id: string; titulo: string; area_construida: number; }
interface ObraData { id: string; nome: string; endereco: string; bairro: string; cidade: string; estado: string; cep: string; status: string; data_inicio: string; data_prev_termino: string; area_construida: string; foto_url: string; responsavel: string; telefone_responsavel: string; orcamento_id: string; observacoes: string; }

const STATUS_OPTS = [
  { v: 'nao_iniciado', l: 'Não Iniciado' }, { v: 'em_andamento', l: 'Em Andamento' },
  { v: 'concluido', l: 'Concluído' }, { v: 'paralisado', l: 'Paralisado' },
];

export default function EditarObraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [orcamentos, setOrcamentos] = useState<OrcamentoOpt[]>([]);
  const [vincOrcAnterior, setVincOrcAnterior] = useState('');
  const [form, setForm] = useState<ObraData>({
    id: '', nome: '', endereco: '', bairro: '', cidade: '', estado: 'RS', cep: '',
    status: 'nao_iniciado', data_inicio: '', data_prev_termino: '',
    area_construida: '', foto_url: '', responsavel: '', telefone_responsavel: '',
    orcamento_id: '', observacoes: '',
  });

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [obraRes, orcRes] = await Promise.all([
      fetch(`/api/obras/${id}`),
      fetch('/api/orcamentos'),
    ]);
    if (obraRes.ok) {
      const d: ObraData = await obraRes.json();
      setForm(d);
      setVincOrcAnterior(d.orcamento_id || '');
    }
    if (orcRes.ok) {
      const d = await orcRes.json();
      if (Array.isArray(d)) setOrcamentos(d.map((o: OrcamentoOpt) => ({ id: o.id, titulo: o.titulo, area_construida: o.area_construida })));
    }
    setCarregando(false);
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

  function set(f: string, v: string) { setForm(p => ({ ...p, [f]: v })); }

  async function salvar() {
    if (!form.nome.trim()) { toast.error('Informe o nome da obra'); return; }
    setSalvando(true);
    try {
      const res = await fetch(`/api/obras/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, area_construida: String(form.area_construida) }),
      });
      if (!res.ok) { toast.error('Erro ao salvar'); return; }
      toast.success('Obra atualizada!');
      router.push(`/obras/${id}`);
    } catch { toast.error('Erro ao conectar'); } finally { setSalvando(false); }
  }

  if (carregando) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <RefreshCw className="h-6 w-6 animate-spin text-primary" />
    </div>
  );

  const orcSelecionado = orcamentos.find(o => o.id === form.orcamento_id);
  const mudouOrcamento = form.orcamento_id && form.orcamento_id !== vincOrcAnterior;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/obras/${id}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" /> Editar Obra
        </h1>
      </div>

      {/* Identificação */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Identificação</p>

          <div className="grid gap-1.5">
            <Label>Nome da obra <span className="text-destructive">*</span></Label>
            <Input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Residência Família Silva" className="h-10" />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v ?? '')}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTS.map(o => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Área construída (m²)</Label>
              <Input type="number" min="0" step="0.5" value={form.area_construida}
                onChange={e => set('area_construida', e.target.value)} placeholder="80" className="h-10" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Responsável</Label>
              <Input value={form.responsavel} onChange={e => set('responsavel', e.target.value)} placeholder="Nome do responsável" className="h-10" />
            </div>
            <div className="grid gap-1.5">
              <Label>Telefone</Label>
              <Input value={form.telefone_responsavel} onChange={e => set('telefone_responsavel', e.target.value)} placeholder="(51) 99999-9999" className="h-10" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Endereço */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Endereço</p>
          <div className="grid gap-1.5">
            <Label>Logradouro</Label>
            <Input value={form.endereco} onChange={e => set('endereco', e.target.value)} placeholder="Rua, Av., número..." className="h-10" />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label>Bairro</Label>
              <Input value={form.bairro} onChange={e => set('bairro', e.target.value)} placeholder="Bairro" className="h-10" />
            </div>
            <div className="grid gap-1.5">
              <Label>Cidade</Label>
              <Input value={form.cidade} onChange={e => set('cidade', e.target.value)} placeholder="Cidade" className="h-10" />
            </div>
            <div className="grid gap-1.5">
              <Label>UF</Label>
              <Input value={form.estado} onChange={e => set('estado', e.target.value)} maxLength={2} placeholder="RS" className="h-10" />
            </div>
          </div>
          <div className="grid gap-1.5 max-w-[160px]">
            <Label>CEP</Label>
            <Input value={form.cep} onChange={e => set('cep', e.target.value)} placeholder="00000-000" className="h-10" />
          </div>
        </CardContent>
      </Card>

      {/* Datas + Orçamento */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Datas e Orçamento</p>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Data de início</Label>
              <Input type="date" value={form.data_inicio} onChange={e => set('data_inicio', e.target.value)} className="h-10" />
            </div>
            <div className="grid gap-1.5">
              <Label>Previsão de término</Label>
              <Input type="date" value={form.data_prev_termino} onChange={e => set('data_prev_termino', e.target.value)} className="h-10" />
            </div>
          </div>

          {/* Vínculo com orçamento */}
          <div className="grid gap-1.5">
            <Label className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-500" /> Orçamento vinculado
            </Label>
            <Select value={form.orcamento_id || '_none'} onValueChange={v => set('orcamento_id', !v || v === '_none' ? '' : v)}>
              <SelectTrigger className={`h-10 ${form.orcamento_id ? 'border-amber-400' : ''}`}>
                <SelectValue placeholder="Selecionar orçamento..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">— Nenhum —</SelectItem>
                {orcamentos.map(o => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.titulo}{o.area_construida ? ` (${o.area_construida}m²)` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {orcSelecionado && (
              <p className="text-xs text-amber-700 flex items-center gap-1">
                <Zap className="h-3 w-3" /> Vinculado: {orcSelecionado.titulo}
              </p>
            )}
            {mudouOrcamento && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <p className="font-semibold mb-0.5">Orçamento alterado</p>
                <p>Após salvar, acesse <strong>Gerenciamento</strong> para atualizar as etapas desta obra com as etapas do novo orçamento.</p>
              </div>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label>Observações</Label>
            <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)}
              placeholder="Informações adicionais..." rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex gap-3 justify-end pb-6">
        <Link href={`/obras/${id}`}><Button variant="outline">Cancelar</Button></Link>
        <Button onClick={salvar} disabled={salvando || !form.nome.trim()}>
          <Save className="h-4 w-4 mr-1.5" />
          {salvando ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>
    </div>
  );
}
