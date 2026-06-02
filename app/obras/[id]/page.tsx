'use client';

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Building2, MapPin, User, Phone, Plus, Trash2,
  RefreshCw, ExternalLink, MessageCircle, CheckCircle2, Clock, AlertCircle, Pencil, Save, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const STATUS_EXEC_COR: Record<string, string> = {
  nao_iniciado: 'bg-slate-100 text-slate-600 border-slate-200',
  em_andamento: 'bg-amber-100 text-amber-700 border-amber-300',
  concluido:    'bg-green-100 text-green-700 border-green-300',
};
const STATUS_EXEC_LABEL: Record<string, string> = {
  nao_iniciado: 'Não Iniciado', em_andamento: 'Em Andamento', concluido: 'Concluído',
};
const STATUS_COMPRA_COR: Record<string, string> = {
  pendente: 'bg-red-100 text-red-700 border-red-200', pedido_feito: 'bg-blue-100 text-blue-700 border-blue-200',
  parcial: 'bg-amber-100 text-amber-700 border-amber-200', comprado: 'bg-green-100 text-green-700 border-green-200',
};
const STATUS_COMPRA_LABEL: Record<string, string> = {
  pendente: 'Pendente', pedido_feito: 'Pedido Feito', parcial: 'Parcial', comprado: 'Comprado',
};

interface Fornecedor { id: string; nome: string; especialidade: string; telefone: string; whatsapp: string; email: string; observacoes: string; status: string; }
interface Servico { id: string; servico_nome: string; unidade: string; quantidade: string; status_compra: string; observacao: string; fornecedor_id: string; }
interface Etapa { id: string; etapa_codigo: string; etapa_nome: string; status_execucao: string; data_inicio: string; data_fim_prevista: string; data_fim_real: string; ordem: string; servicos: Servico[]; }
interface ObraDetalhe { id: string; nome: string; endereco: string; bairro: string; cidade: string; estado: string; cep: string; status: string; data_inicio: string; data_prev_termino: string; area_construida: string; foto_url: string; responsavel: string; telefone_responsavel: string; orcamento_id: string; observacoes: string; etapas: Etapa[]; fornecedores: Fornecedor[]; orcamento: { titulo: string } | null; }

export default function ObraDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [obra, setObra] = useState<ObraDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [novoForn, setNovoForn] = useState({ nome: '', especialidade: '', telefone: '', whatsapp: '', email: '', observacoes: '' });
  const [showFornForm, setShowFornForm] = useState(false);
  const [editStatus, setEditStatus] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/obras/${id}`).catch(() => null);
    if (res?.ok) { const d = await res.json(); setObra(d); setEditStatus(d.status); }
    setLoading(false);
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

  async function salvarStatus() {
    if (!obra) return;
    const res = await fetch(`/api/obras/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: editStatus }) });
    if (res.ok) { toast.success('Status atualizado'); carregar(); }
    else toast.error('Erro ao salvar');
  }

  async function adicionarFornecedor() {
    if (!novoForn.nome.trim()) { toast.error('Informe o nome'); return; }
    const res = await fetch('/api/fornecedores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...novoForn, obra_id: id }) });
    if (res.ok) { toast.success('Fornecedor adicionado'); setNovoForn({ nome: '', especialidade: '', telefone: '', whatsapp: '', email: '', observacoes: '' }); setShowFornForm(false); carregar(); }
    else toast.error('Erro ao adicionar');
  }

  async function removerFornecedor(fid: string) {
    if (!confirm('Remover fornecedor?')) return;
    await fetch(`/api/fornecedores/${fid}`, { method: 'DELETE' });
    carregar();
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><RefreshCw className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!obra) return <div className="text-center py-20 text-muted-foreground">Obra não encontrada. <Link href="/obras" className="text-primary underline">Voltar</Link></div>;

  const etapasOrdenadas = [...obra.etapas].sort((a, b) => Number(a.ordem) - Number(b.ordem));
  const concluidas = etapasOrdenadas.filter(e => e.status_execucao === 'concluido').length;
  const progresso = etapasOrdenadas.length > 0 ? Math.round((concluidas / etapasOrdenadas.length) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/obras" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="text-xl font-bold flex-1">{obra.nome}</h1>
        <Button variant="outline" size="sm" onClick={carregar} disabled={loading}><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /></Button>
        <Link href={`/gerenciamento?obra_id=${id}`}><Button size="sm">Gerenciar Etapas</Button></Link>
      </div>

      {/* Info geral */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-24 h-24 shrink-0 rounded-xl border bg-muted flex items-center justify-center overflow-hidden">
              {obra.foto_url ? <img src={obra.foto_url} alt={obra.nome} className="w-full h-full object-cover" /> : <Building2 className="h-10 w-10 text-muted-foreground/30" />}
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={editStatus} onValueChange={v => setEditStatus(v ?? "")}>
                  <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_EXEC_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    <SelectItem value="paralisado">Paralisado</SelectItem>
                  </SelectContent>
                </Select>
                {editStatus !== obra.status && (
                  <Button size="sm" className="h-7 text-xs" onClick={salvarStatus}><Save className="h-3 w-3 mr-1" /> Salvar</Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{obra.endereco}{obra.bairro ? `, ${obra.bairro}` : ''}</span>
                <span className="flex items-center gap-1"><User className="h-3 w-3" />{obra.responsavel}</span>
                <span>{obra.cidade} – {obra.estado} {obra.cep}</span>
                <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{obra.telefone_responsavel}</span>
                {obra.area_construida && <span>{obra.area_construida} m²</span>}
                {obra.orcamento && <span>Orç: {obra.orcamento.titulo}</span>}
              </div>
              {obra.observacoes && <p className="text-xs text-muted-foreground italic">{obra.observacoes}</p>}
            </div>
          </div>

          {/* Progresso */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progresso geral</span><span className="font-bold">{progresso}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${progresso >= 75 ? 'bg-green-500' : progresso >= 40 ? 'bg-amber-500' : 'bg-primary'}`}
                style={{ width: `${progresso}%` }} />
            </div>
            <div className="flex gap-4 text-xs">
              <span className="text-green-700 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />{concluidas} concluídas</span>
              <span className="text-amber-700 flex items-center gap-1"><Clock className="h-3 w-3" />{etapasOrdenadas.filter(e=>e.status_execucao==='em_andamento').length} em andamento</span>
              <span className="text-slate-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{etapasOrdenadas.filter(e=>e.status_execucao==='nao_iniciado').length} não iniciadas</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Etapas resumo */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Etapas da Obra</p>
            <Link href={`/gerenciamento?obra_id=${id}`}><Button size="sm" variant="outline" className="h-7 text-xs"><Pencil className="h-3 w-3 mr-1" /> Gerenciar</Button></Link>
          </div>
          {etapasOrdenadas.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma etapa cadastrada. Vincule um orçamento para gerar etapas automaticamente.</p>
          ) : (
            <div className="space-y-2">
              {etapasOrdenadas.map(et => {
                const svcsTotal = et.servicos?.length || 0;
                const svcsComp = et.servicos?.filter(s => s.status_compra === 'comprado').length || 0;
                const svcsPend = et.servicos?.filter(s => s.status_compra === 'pendente').length || 0;
                const svcsPed = et.servicos?.filter(s => s.status_compra === 'pedido_feito').length || 0;
                return (
                  <div key={et.id} className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/20 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${STATUS_EXEC_COR[et.status_execucao] || ''}`}>
                      {STATUS_EXEC_LABEL[et.status_execucao] || et.status_execucao}
                    </span>
                    <span className="text-sm font-medium flex-1 min-w-0 truncate">{et.etapa_nome}</span>
                    <div className="flex gap-1.5 text-[10px] flex-wrap">
                      {svcsComp > 0 && <span className="px-1.5 py-0.5 rounded border bg-green-100 text-green-700 border-green-200">{svcsComp} comprado{svcsComp>1?'s':''}</span>}
                      {svcsPed > 0 && <span className="px-1.5 py-0.5 rounded border bg-blue-100 text-blue-700 border-blue-200">{svcsPed} pedido{svcsPed>1?'s':''}</span>}
                      {svcsPend > 0 && <span className="px-1.5 py-0.5 rounded border bg-red-100 text-red-700 border-red-200">{svcsPend} pendente{svcsPend>1?'s':''}</span>}
                      {svcsTotal === 0 && <span className="text-muted-foreground">sem serviços</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fornecedores */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Fornecedores</p>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowFornForm(s => !s)}>
              <Plus className="h-3 w-3 mr-1" /> Adicionar
            </Button>
          </div>

          {showFornForm && (
            <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
              <div className="grid sm:grid-cols-2 gap-2">
                <div className="grid gap-1"><Label className="text-xs">Nome *</Label><Input value={novoForn.nome} onChange={e => setNovoForn(p=>({...p,nome:e.target.value}))} placeholder="Nome do fornecedor" className="h-8 text-xs" /></div>
                <div className="grid gap-1"><Label className="text-xs">Especialidade</Label><Input value={novoForn.especialidade} onChange={e => setNovoForn(p=>({...p,especialidade:e.target.value}))} placeholder="Ex: Material de Construção" className="h-8 text-xs" /></div>
                <div className="grid gap-1"><Label className="text-xs">Telefone</Label><Input value={novoForn.telefone} onChange={e => setNovoForn(p=>({...p,telefone:e.target.value}))} placeholder="(51) 99999-9999" className="h-8 text-xs" /></div>
                <div className="grid gap-1"><Label className="text-xs">WhatsApp (só números)</Label><Input value={novoForn.whatsapp} onChange={e => setNovoForn(p=>({...p,whatsapp:e.target.value}))} placeholder="5551999999999" className="h-8 text-xs" /></div>
              </div>
              <div className="grid gap-1"><Label className="text-xs">Observações</Label><Input value={novoForn.observacoes} onChange={e => setNovoForn(p=>({...p,observacoes:e.target.value}))} placeholder="Observações..." className="h-8 text-xs" /></div>
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs" onClick={adicionarFornecedor}>Salvar</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowFornForm(false)}><X className="h-3 w-3 mr-1" /> Cancelar</Button>
              </div>
            </div>
          )}

          {obra.fornecedores.length === 0 && !showFornForm ? (
            <p className="text-xs text-muted-foreground">Nenhum fornecedor cadastrado para esta obra.</p>
          ) : (
            <div className="space-y-2">
              {obra.fornecedores.map(forn => (
                <div key={forn.id} className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-muted/20 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">{forn.nome}</p>
                    <p className="text-xs text-muted-foreground">{forn.especialidade}{forn.telefone ? ` · ${forn.telefone}` : ''}</p>
                    {forn.observacoes && <p className="text-[11px] text-muted-foreground italic mt-0.5">{forn.observacoes}</p>}
                  </div>
                  <div className="flex gap-2 items-center shrink-0">
                    {forn.whatsapp && (
                      <a href={`https://wa.me/${forn.whatsapp}`} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="h-7 text-xs border-green-400 text-green-700 hover:bg-green-50">
                          <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
                        </Button>
                      </a>
                    )}
                    {forn.telefone && (
                      <a href={`tel:${forn.telefone}`}>
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          <Phone className="h-3 w-3 mr-1" /> Ligar
                        </Button>
                      </a>
                    )}
                    <button onClick={() => removerFornecedor(forn.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
