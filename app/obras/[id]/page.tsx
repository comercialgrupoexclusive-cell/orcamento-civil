'use client';

import { useEffect, useState, useCallback, use, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Building2, MapPin, User, Phone, Plus, Trash2,
  RefreshCw, MessageCircle, CheckCircle2, Clock, AlertCircle,
  Pencil, Save, X, Camera, Upload, Calendar, FileText,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

// ── Status helpers ────────────────────────────────────────────────────────────
const STATUS_COR: Record<string, string> = {
  nao_iniciado: 'bg-slate-100 text-slate-600 border-slate-200',
  em_andamento: 'bg-amber-100 text-amber-700 border-amber-300',
  concluido:    'bg-green-100 text-green-700 border-green-300',
  paralisado:   'bg-red-100 text-red-600 border-red-200',
};
const STATUS_LABEL: Record<string, string> = {
  nao_iniciado: 'Não Iniciado', em_andamento: 'Em Andamento',
  concluido: 'Concluído', paralisado: 'Paralisado',
};
const COMPRA_COR: Record<string, string> = {
  pendente: 'bg-red-100 text-red-700 border-red-200',
  pedido_feito: 'bg-blue-100 text-blue-700 border-blue-200',
  parcial: 'bg-amber-100 text-amber-700 border-amber-200',
  comprado: 'bg-green-100 text-green-700 border-green-200',
};
const COMPRA_LABEL: Record<string, string> = {
  pendente: 'Pendente', pedido_feito: 'Pedido Feito', parcial: 'Parcial', comprado: 'Comprado',
};

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Fornecedor {
  id: string; nome: string; especialidade: string; telefone: string;
  whatsapp: string; email: string; observacoes: string; status: string;
}
interface Servico {
  id: string; servico_nome: string; unidade: string;
  quantidade: string; status_compra: string; observacao: string;
}
interface Etapa {
  id: string; etapa_codigo: string; etapa_nome: string;
  status_execucao: string; data_inicio: string; data_fim_prevista: string;
  data_fim_real: string; ordem: string; servicos: Servico[];
}
interface ObraDetalhe {
  id: string; nome: string; endereco: string; bairro: string; cidade: string;
  estado: string; cep: string; status: string; data_inicio: string;
  data_prev_termino: string; area_construida: string; foto_url: string;
  responsavel: string; telefone_responsavel: string; orcamento_id: string;
  observacoes: string; etapas: Etapa[]; fornecedores: Fornecedor[];
  orcamento: { titulo: string } | null;
}

// ── Upload de foto ────────────────────────────────────────────────────────────
function FotoHero({
  obraId, fotoUrl, nomObra, onFotoChange,
}: {
  obraId: string; fotoUrl: string; nomObra: string; onFotoChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function upload(file: File) {
    if (!file.type.startsWith('image/')) { toast.error('Apenas imagens'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Máx 5 MB'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/obras/${obraId}/foto`, { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) { onFotoChange(data.url); toast.success('Foto atualizada!'); }
      else toast.error(data.error || 'Erro ao enviar');
    } catch { toast.error('Erro de conexão'); } finally { setUploading(false); }
  }

  async function removerFoto() {
    if (!confirm('Remover foto da obra?')) return;
    const res = await fetch(`/api/obras/${obraId}/foto`, { method: 'DELETE' });
    if (res.ok) { onFotoChange(''); toast.success('Foto removida'); }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }

  return (
    <div className="relative w-full" style={{ height: '360px' }}>
      {fotoUrl ? (
        <>
          {/* Foto com overlay de ações */}
          <img
            src={fotoUrl}
            alt={nomObra}
            className="w-full h-full object-cover rounded-xl"
          />
          {/* Gradiente inferior para os botões */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          {/* Botões sobre a foto */}
          <div className="absolute bottom-4 right-4 flex gap-2">
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-white text-xs font-semibold hover:bg-white/30 transition-colors border border-white/30">
              <Camera className="h-3.5 w-3.5" />
              {uploading ? 'Enviando...' : 'Trocar foto'}
            </button>
            <button
              onClick={removerFoto}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/70 backdrop-blur-sm text-white text-xs font-semibold hover:bg-red-600/80 transition-colors">
              <Trash2 className="h-3.5 w-3.5" /> Remover
            </button>
          </div>
        </>
      ) : (
        /* Área de upload (sem foto) */
        <div
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => inputRef.current?.click()}
          className={`w-full h-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all
            ${dragOver ? 'border-primary bg-primary/10 scale-[1.01]' : 'border-border bg-muted/30 hover:border-primary/60 hover:bg-muted/50'}`}>
          <div className="text-center space-y-3 p-6">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
              {uploading
                ? <RefreshCw className="h-7 w-7 text-primary animate-spin" />
                : <Camera className="h-7 w-7 text-muted-foreground" />}
            </div>
            <div>
              <p className="font-semibold text-sm">{uploading ? 'Enviando...' : 'Adicionar foto da obra'}</p>
              <p className="text-xs text-muted-foreground mt-1">Arraste uma imagem ou clique para selecionar</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">JPG, PNG, WEBP — máx 5 MB</p>
            </div>
            {!uploading && (
              <Button size="sm" variant="outline" className="h-8" onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}>
                <Upload className="h-3.5 w-3.5 mr-1.5" /> Selecionar foto
              </Button>
            )}
          </div>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function ObraDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [obra, setObra] = useState<ObraDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [fotoUrl, setFotoUrl] = useState('');
  const [novoForn, setNovoForn] = useState({ nome: '', especialidade: '', telefone: '', whatsapp: '', email: '', observacoes: '' });
  const [showFornForm, setShowFornForm] = useState(false);
  const [editStatus, setEditStatus] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/obras/${id}`).catch(() => null);
    if (res?.ok) {
      const d = await res.json();
      setObra(d);
      setFotoUrl(d.foto_url || '');
      setEditStatus(d.status);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

  async function salvarStatus() {
    if (!obra) return;
    const res = await fetch(`/api/obras/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: editStatus }),
    });
    if (res.ok) { toast.success('Status atualizado'); carregar(); }
    else toast.error('Erro ao salvar');
  }

  async function adicionarFornecedor() {
    if (!novoForn.nome.trim()) { toast.error('Informe o nome'); return; }
    const res = await fetch('/api/fornecedores', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...novoForn, obra_id: id }),
    });
    if (res.ok) {
      toast.success('Fornecedor adicionado');
      setNovoForn({ nome: '', especialidade: '', telefone: '', whatsapp: '', email: '', observacoes: '' });
      setShowFornForm(false);
      carregar();
    } else toast.error('Erro ao adicionar');
  }

  async function removerFornecedor(fid: string) {
    if (!confirm('Remover fornecedor?')) return;
    await fetch(`/api/fornecedores/${fid}`, { method: 'DELETE' });
    carregar();
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <RefreshCw className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
  if (!obra) return (
    <div className="text-center py-20 text-muted-foreground">
      Obra não encontrada. <Link href="/obras" className="text-primary underline">Voltar</Link>
    </div>
  );

  const etapasOrdenadas = [...obra.etapas].sort((a, b) => Number(a.ordem) - Number(b.ordem));
  const concluidas = etapasOrdenadas.filter(e => e.status_execucao === 'concluido').length;
  const emAndamento = etapasOrdenadas.filter(e => e.status_execucao === 'em_andamento').length;
  const progresso = etapasOrdenadas.length > 0 ? Math.round((concluidas / etapasOrdenadas.length) * 100) : 0;
  const proxima = etapasOrdenadas.find(e => e.status_execucao !== 'concluido');

  return (
    <div className="max-w-4xl mx-auto space-y-0">

      {/* Barra de navegação */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Link href="/obras" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-muted-foreground text-sm">Obras</span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm font-medium truncate max-w-[200px]">{obra.nome}</span>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Link href={`/obras/${id}/editar`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
            </Button>
          </Link>
          <Link href={`/gerenciamento?obra_id=${id}`}>
            <Button size="sm">Gerenciar Etapas</Button>
          </Link>
        </div>
      </div>

      {/* ── Card principal: Foto + Info ── */}
      <Card className="overflow-hidden">
        {/* Foto hero */}
        <div className="p-4 pb-3">
          <FotoHero
            obraId={id}
            fotoUrl={fotoUrl}
            nomObra={obra.nome}
            onFotoChange={setFotoUrl}
          />
        </div>

        {/* Info abaixo da foto */}
        <CardContent className="px-5 pb-5 space-y-4">
          {/* Nome + Status */}
          <div className="flex items-start gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold leading-tight">{obra.nome}</h1>
              {obra.orcamento && (
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <FileText className="h-3 w-3" /> {obra.orcamento.titulo}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Select value={editStatus} onValueChange={v => setEditStatus(v ?? '')}>
                <SelectTrigger className={`h-8 text-xs font-bold border px-2 min-w-[130px] ${STATUS_COR[editStatus] || ''}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABEL).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editStatus !== obra.status && (
                <Button size="sm" className="h-8 text-xs shrink-0" onClick={salvarStatus}>
                  <Save className="h-3 w-3 mr-1" /> Salvar
                </Button>
              )}
            </div>
          </div>

          {/* Grid de informações */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Localização */}
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Localização</p>
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p>{obra.endereco}{obra.bairro ? `, ${obra.bairro}` : ''}</p>
                  <p className="text-muted-foreground text-xs">{obra.cidade} — {obra.estado}{obra.cep ? ` · ${obra.cep}` : ''}</p>
                </div>
              </div>
            </div>

            {/* Responsável */}
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Responsável</p>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p>{obra.responsavel || '—'}</p>
                  {obra.telefone_responsavel && (
                    <a href={`tel:${obra.telefone_responsavel}`} className="text-xs text-primary flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {obra.telefone_responsavel}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Datas */}
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Datas</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 shrink-0" />
                <span>
                  {obra.data_inicio
                    ? new Date(obra.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')
                    : '—'}
                  {' → '}
                  {obra.data_prev_termino
                    ? new Date(obra.data_prev_termino + 'T00:00:00').toLocaleDateString('pt-BR')
                    : '—'}
                </span>
              </div>
            </div>

            {/* Área */}
            {obra.area_construida && Number(obra.area_construida) > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Área construída</p>
                <p className="text-sm flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  {obra.area_construida} m²
                </p>
              </div>
            )}
          </div>

          {/* Observações */}
          {obra.observacoes && (
            <p className="text-xs text-muted-foreground italic border-t pt-3">{obra.observacoes}</p>
          )}
        </CardContent>
      </Card>

      {/* ── Progresso ── */}
      <div className="pt-4">
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Progresso da Obra</p>
              <span className={`text-sm font-bold tabular-nums ${progresso >= 75 ? 'text-green-600' : progresso >= 40 ? 'text-amber-600' : 'text-primary'}`}>
                {progresso}%
              </span>
            </div>

            {/* Barra */}
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${progresso >= 75 ? 'bg-green-500' : progresso >= 40 ? 'bg-amber-500' : 'bg-primary'}`}
                style={{ width: `${progresso}%` }}
              />
            </div>

            {/* Badges */}
            <div className="flex gap-4 text-xs flex-wrap">
              <span className="flex items-center gap-1.5 font-medium text-green-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> {concluidas} concluída{concluidas !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1.5 font-medium text-amber-700">
                <Clock className="h-3.5 w-3.5" /> {emAndamento} em andamento
              </span>
              <span className="flex items-center gap-1.5 text-slate-500">
                <AlertCircle className="h-3.5 w-3.5" />
                {etapasOrdenadas.length - concluidas - emAndamento} não iniciada{etapasOrdenadas.length - concluidas - emAndamento !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Próxima etapa */}
            {proxima && (
              <div className="rounded-lg border bg-amber-50 border-amber-200 px-3 py-2 text-xs">
                <span className="text-muted-foreground">Próxima etapa: </span>
                <span className="font-semibold text-amber-800">{proxima.etapa_nome}</span>
                {proxima.data_fim_prevista && (
                  <span className="text-muted-foreground ml-2">
                    · até {new Date(proxima.data_fim_prevista + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Etapas ── */}
      {etapasOrdenadas.length > 0 && (
        <div className="pt-4">
          <Card>
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold">Etapas</p>
                <Link href={`/gerenciamento?obra_id=${id}`}>
                  <Button size="sm" variant="outline" className="h-7 text-xs">
                    <Pencil className="h-3 w-3 mr-1" /> Gerenciar
                  </Button>
                </Link>
              </div>
              {etapasOrdenadas.map(et => {
                const svcs = et.servicos || [];
                const comp = svcs.filter(s => s.status_compra === 'comprado').length;
                const ped = svcs.filter(s => s.status_compra === 'pedido_feito').length;
                const pend = svcs.filter(s => s.status_compra === 'pendente').length;
                return (
                  <div key={et.id} className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/20 transition-colors flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${STATUS_COR[et.status_execucao] || ''}`}>
                      {STATUS_LABEL[et.status_execucao] || et.status_execucao}
                    </span>
                    <span className="text-xs font-medium flex-1 min-w-0 truncate">{et.etapa_nome}</span>
                    <div className="flex gap-1 flex-wrap shrink-0">
                      {comp > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${COMPRA_COR.comprado}`}>{comp} comprado{comp > 1 ? 's' : ''}</span>}
                      {ped > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${COMPRA_COR.pedido_feito}`}>{ped} pedido{ped > 1 ? 's' : ''}</span>}
                      {pend > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${COMPRA_COR.pendente}`}>{pend} pendente{pend > 1 ? 's' : ''}</span>}
                      {svcs.length === 0 && <span className="text-[10px] text-muted-foreground">sem serviços</span>}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Fornecedores ── */}
      <div className="pt-4 pb-8">
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Fornecedores</p>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowFornForm(s => !s)}>
                <Plus className="h-3 w-3 mr-1" /> Adicionar
              </Button>
            </div>

            {/* Formulário novo fornecedor */}
            {showFornForm && (
              <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
                <div className="grid sm:grid-cols-2 gap-2">
                  <div className="grid gap-1"><Label className="text-xs">Nome *</Label>
                    <Input value={novoForn.nome} onChange={e => setNovoForn(p => ({ ...p, nome: e.target.value }))} placeholder="Nome do fornecedor" className="h-8 text-xs" />
                  </div>
                  <div className="grid gap-1"><Label className="text-xs">Especialidade</Label>
                    <Input value={novoForn.especialidade} onChange={e => setNovoForn(p => ({ ...p, especialidade: e.target.value }))} placeholder="Ex: Material de Construção" className="h-8 text-xs" />
                  </div>
                  <div className="grid gap-1"><Label className="text-xs">Telefone</Label>
                    <Input value={novoForn.telefone} onChange={e => setNovoForn(p => ({ ...p, telefone: e.target.value }))} placeholder="(51) 99999-9999" className="h-8 text-xs" />
                  </div>
                  <div className="grid gap-1"><Label className="text-xs">WhatsApp (só números)</Label>
                    <Input value={novoForn.whatsapp} onChange={e => setNovoForn(p => ({ ...p, whatsapp: e.target.value }))} placeholder="5551999999999" className="h-8 text-xs" />
                  </div>
                </div>
                <div className="grid gap-1"><Label className="text-xs">Observações</Label>
                  <Input value={novoForn.observacoes} onChange={e => setNovoForn(p => ({ ...p, observacoes: e.target.value }))} placeholder="Observações..." className="h-8 text-xs" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs" onClick={adicionarFornecedor}>Salvar</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowFornForm(false)}>
                    <X className="h-3 w-3 mr-1" /> Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Lista de fornecedores */}
            {obra.fornecedores.length === 0 && !showFornForm ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum fornecedor cadastrado para esta obra.</p>
            ) : (
              <div className="space-y-2">
                {obra.fornecedores.map(forn => (
                  <div key={forn.id} className="flex items-start gap-3 p-3 rounded-xl border hover:bg-muted/20 transition-colors">
                    {/* Avatar inicial */}
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 font-bold text-primary text-sm">
                      {forn.nome.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-tight">{forn.nome}</p>
                      {forn.especialidade && (
                        <p className="text-xs text-muted-foreground">{forn.especialidade}</p>
                      )}
                      {forn.observacoes && (
                        <p className="text-[11px] text-muted-foreground italic mt-0.5">{forn.observacoes}</p>
                      )}
                    </div>

                    <div className="flex gap-1.5 items-center shrink-0 flex-wrap justify-end">
                      {forn.whatsapp && (
                        <a
                          href={`https://wa.me/${forn.whatsapp.replace(/\D/g, '')}`}
                          target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline"
                            className="h-8 text-xs border-green-400 text-green-700 hover:bg-green-50">
                            <MessageCircle className="h-3.5 w-3.5 mr-1" /> WhatsApp
                          </Button>
                        </a>
                      )}
                      {forn.telefone && (
                        <a href={`tel:${forn.telefone}`}>
                          <Button size="sm" variant="outline" className="h-8 text-xs">
                            <Phone className="h-3.5 w-3.5 mr-1" /> Ligar
                          </Button>
                        </a>
                      )}
                      <button
                        onClick={() => removerFornecedor(forn.id)}
                        className="text-muted-foreground hover:text-destructive p-1 rounded">
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

    </div>
  );
}
