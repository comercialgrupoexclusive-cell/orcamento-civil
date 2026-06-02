'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Building2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function NovaObraPage() {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const [orcamentos, setOrcamentos] = useState<{ id: string; titulo: string }[]>([]);
  const [form, setForm] = useState({
    nome: '', endereco: '', bairro: '', cidade: '', estado: 'RS', cep: '',
    status: 'nao_iniciado', data_inicio: '', data_prev_termino: '',
    area_construida: '', responsavel: '', telefone_responsavel: '',
    orcamento_id: '', observacoes: '',
  });

  useEffect(() => {
    fetch('/api/orcamentos').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setOrcamentos(d.map((o: { id: string; titulo: string }) => ({ id: o.id, titulo: o.titulo })));
    }).catch(() => {});
  }, []);

  function set(f: string, v: string) { setForm(p => ({ ...p, [f]: v })); }

  async function salvar() {
    if (!form.nome.trim()) { toast.error('Informe o nome da obra'); return; }
    setSalvando(true);
    try {
      const res = await fetch('/api/obras', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, area_construida: Number(form.area_construida) || 0 }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Erro ao salvar'); return; }
      toast.success('Obra cadastrada!');
      router.push(`/obras/${data.id}`);
    } catch { toast.error('Erro ao conectar'); } finally { setSalvando(false); }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/obras" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="text-xl font-bold flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /> Nova Obra</h1>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Identificação</p>
          <div className="grid gap-1.5">
            <Label>Nome da obra <span className="text-destructive">*</span></Label>
            <Input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Residência Família Silva" className="h-10" />
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
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v ?? '')}>
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nao_iniciado">Não Iniciado</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="paralisado">Paralisado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Área construída (m²)</Label>
              <Input type="number" min="0" step="0.5" value={form.area_construida} onChange={e => set('area_construida', e.target.value)} placeholder="80" className="h-10" />
            </div>
          </div>
        </CardContent>
      </Card>

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
          <div className="grid gap-1.5">
            <Label>Orçamento vinculado</Label>
            <Select value={form.orcamento_id} onValueChange={v => set('orcamento_id', v ?? '')}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Selecionar orçamento (opcional)..." /></SelectTrigger>
              <SelectContent>
                {orcamentos.map(o => <SelectItem key={o.id} value={o.id}>{o.titulo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Observações</Label>
            <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)}
              placeholder="Informações adicionais..." rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Link href="/obras"><Button variant="outline">Cancelar</Button></Link>
        <Button onClick={salvar} disabled={salvando || !form.nome.trim()}>
          <Save className="h-4 w-4 mr-1.5" />{salvando ? 'Salvando...' : 'Salvar Obra'}
        </Button>
      </div>
    </div>
  );
}
