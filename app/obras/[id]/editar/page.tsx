'use client';

import { useState, useEffect, useCallback, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Building2, Save, RefreshCw, Zap, Camera, Upload, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface OrcamentoOpt { id: string; titulo: string; area_construida: number; }
interface ObraData {
  id: string; nome: string; endereco: string; bairro: string; cidade: string;
  estado: string; cep: string; status: string; data_inicio: string;
  data_prev_termino: string; area_construida: string; foto_url: string;
  responsavel: string; telefone_responsavel: string; orcamento_id: string; observacoes: string;
}

const STATUS_OPTS = [
  { v: 'nao_iniciado', l: 'Não Iniciado' }, { v: 'em_andamento', l: 'Em Andamento' },
  { v: 'concluido', l: 'Concluído' }, { v: 'paralisado', l: 'Paralisado' },
];

// ── Upload de foto ────────────────────────────────────────────────────────────
function FotoEditor({
  obraId, fotoUrl, onFotoChange,
}: {
  obraId: string; fotoUrl: string; onFotoChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  // URL do proxy para exibição (evita problema de URL privada do Blob expirando)
  const proxyUrl = fotoUrl ? `/api/obras/${obraId}/foto/imagem` : '';
  const [preview, setPreview] = useState(proxyUrl);

  useEffect(() => { setPreview(fotoUrl ? `/api/obras/${obraId}/foto/imagem` : ''); }, [fotoUrl, obraId]);

  async function upload(file: File) {
    if (!file.type.startsWith('image/')) { toast.error('Apenas imagens (JPG, PNG, WEBP)'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem muito grande — máx 5 MB'); return; }

    // Preview imediato com object URL local (antes do upload terminar)
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/obras/${obraId}/foto`, { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) {
        onFotoChange(data.url);
        // Após upload, usar o proxy (adiciona timestamp para forçar reload do cache)
        setPreview(`/api/obras/${obraId}/foto/imagem?t=${Date.now()}`);
        toast.success('Foto salva com sucesso!');
      } else {
        toast.error(data.error || 'Erro ao enviar foto');
        setPreview(fotoUrl ? `/api/obras/${obraId}/foto/imagem` : ''); // reverte
      }
    } catch {
      toast.error('Erro de conexão');
      setPreview(fotoUrl ? `/api/obras/${obraId}/foto/imagem` : '');
    } finally {
      setUploading(false);
    }
  }

  async function remover() {
    if (!confirm('Remover a foto da obra?')) return;
    const res = await fetch(`/api/obras/${obraId}/foto`, { method: 'DELETE' });
    if (res.ok) { onFotoChange(''); setPreview(''); toast.success('Foto removida'); }
    else toast.error('Erro ao remover');
  }

  // URL de exibição: proxy ou object URL local
  const exibicaoUrl = preview;

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5">
        <Camera className="h-3.5 w-3.5 text-muted-foreground" /> Foto da Obra
      </Label>

      {preview ? (
        /* Com foto: mostrar imagem + botões de troca/remoção */
        <div className="relative rounded-xl overflow-hidden border" style={{ height: '260px' }}>
          <img src={exibicaoUrl} alt="Foto da obra" className="w-full h-full object-cover" />

          {/* Overlay com gradiente e botões */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/20 backdrop-blur-sm text-white text-xs font-semibold hover:bg-white/35 transition-all border border-white/30 disabled:opacity-60">
              {uploading
                ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Enviando...</>
                : <><Camera className="h-3.5 w-3.5" /> Trocar foto</>}
            </button>
            <button
              onClick={remover}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/70 backdrop-blur-sm text-white text-xs font-semibold hover:bg-red-600/80 transition-all disabled:opacity-60">
              <Trash2 className="h-3.5 w-3.5" /> Remover
            </button>
          </div>

          {uploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
              <div className="text-white text-center space-y-2">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto" />
                <p className="text-sm font-medium">Enviando foto...</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Sem foto: área de upload */
        <div
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all select-none
            ${uploading ? 'pointer-events-none opacity-70' : ''}
            ${dragOver ? 'border-primary bg-primary/8 scale-[1.01]' : 'border-border bg-muted/20 hover:border-primary/60 hover:bg-muted/40'}`}
          style={{ height: '200px' }}>
          <div className="text-center space-y-2 p-6">
            <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
              {uploading
                ? <RefreshCw className="h-6 w-6 text-primary animate-spin" />
                : <Upload className="h-6 w-6 text-muted-foreground" />}
            </div>
            <p className="font-medium text-sm">
              {uploading ? 'Enviando...' : dragOver ? 'Solte aqui!' : 'Adicionar foto da obra'}
            </p>
            <p className="text-xs text-muted-foreground">Arraste ou clique · JPG, PNG, WEBP · máx 5 MB</p>
          </div>
        </div>
      )}

      <input
        ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }}
      />
    </div>
  );
}

// ── Página de edição ──────────────────────────────────────────────────────────
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
      if (Array.isArray(d))
        setOrcamentos(d.map((o: OrcamentoOpt) => ({ id: o.id, titulo: o.titulo, area_construida: o.area_construida })));
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

      {/* ── FOTO ── */}
      <Card>
        <CardContent className="p-5">
          <FotoEditor
            obraId={id}
            fotoUrl={form.foto_url}
            onFotoChange={url => setForm(p => ({ ...p, foto_url: url }))}
          />
        </CardContent>
      </Card>

      {/* ── Identificação ── */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Identificação</p>

          <div className="grid gap-1.5">
            <Label>Nome da obra <span className="text-destructive">*</span></Label>
            <Input value={form.nome} onChange={e => set('nome', e.target.value)}
              placeholder="Ex: Residência Família Silva" className="h-10" />
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
              <Input value={form.responsavel} onChange={e => set('responsavel', e.target.value)}
                placeholder="Nome do responsável" className="h-10" />
            </div>
            <div className="grid gap-1.5">
              <Label>Telefone</Label>
              <Input value={form.telefone_responsavel} onChange={e => set('telefone_responsavel', e.target.value)}
                placeholder="(51) 99999-9999" className="h-10" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Endereço ── */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Endereço</p>
          <div className="grid gap-1.5">
            <Label>Logradouro</Label>
            <Input value={form.endereco} onChange={e => set('endereco', e.target.value)}
              placeholder="Rua, Av., número..." className="h-10" />
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

      {/* ── Datas + Orçamento ── */}
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
            <Label className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-500" /> Orçamento vinculado
            </Label>
            <Select value={form.orcamento_id || '_none'} onValueChange={v => set('orcamento_id', !v || v === '_none' ? '' : v)}>
              <SelectTrigger className={`h-10 ${form.orcamento_id ? 'border-amber-400' : ''}`}>
                <span className={`flex-1 text-left truncate text-sm ${!form.orcamento_id || form.orcamento_id === '_none' ? 'text-muted-foreground' : ''}`}>
                  {form.orcamento_id && form.orcamento_id !== '_none'
                    ? (orcamentos.find(o => o.id === form.orcamento_id)?.titulo || form.orcamento_id)
                    : 'Selecionar orçamento...'}
                </span>
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
                <Zap className="h-3 w-3" /> {orcSelecionado.titulo}
              </p>
            )}
            {form.orcamento_id && form.orcamento_id !== '_none' && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                <p className="text-xs text-green-800 font-semibold mb-1.5 flex items-center gap-1">
                  <Zap className="h-3 w-3" /> Importar etapas do orçamento para a obra
                </p>
                <p className="text-[11px] text-green-700 mb-2">
                  Cria as etapas e serviços do orçamento dentro da obra automaticamente.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-green-700 hover:text-green-900 underline"
                    onClick={async () => {
                      const res = await fetch(`/api/obras/${id}/importar-orcamento`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ modo: 'merge', orcamento_id: form.orcamento_id }),
                      });
                      const d = await res.json();
                      if (res.ok) { alert(`✅ ${d.message}`); }
                      else { alert(`❌ ${d.error}`); }
                    }}>
                    + Importar (adicionar)
                  </button>
                  <span className="text-green-400">·</span>
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-red-600 hover:text-red-800 underline"
                    onClick={async () => {
                      if (!confirm('Apaga todas as etapas atuais da obra e reimporta do orçamento. Continuar?')) return;
                      const res = await fetch(`/api/obras/${id}/importar-orcamento`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ modo: 'replace', orcamento_id: form.orcamento_id }),
                      });
                      const d = await res.json();
                      alert(res.ok ? `✅ ${d.message}` : `❌ ${d.error}`);
                    }}>
                    Reimportar (substituir tudo)
                  </button>
                </div>
              </div>
            )}
            {mudouOrcamento && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <p className="font-semibold">⚠ Orçamento alterado — salve primeiro, depois importe as etapas</p>
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
