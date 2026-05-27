'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Search, Trash2, RefreshCw, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Insumo, TipoInsumo } from '@/lib/types';
import { TIPO_INSUMO_LABEL, TIPOS_INSUMO_ATIVOS, UNIDADES_PADRAO, CATEGORIAS_PADRAO } from '@/lib/types';

const TIPO_STYLE: Record<TipoInsumo, string> = {
  M:  'bg-blue-100 text-blue-700 border-blue-200',
  MO: 'bg-orange-100 text-orange-700 border-orange-200',
  E:  'bg-purple-100 text-purple-700 border-purple-200',
  S:  'bg-gray-100 text-gray-500 border-gray-200',
};

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtData(iso: string) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }); }
  catch { return '—'; }
}

// Combobox que mostra todas as opções ao focar, filtra enquanto digita
function ComboboxInput({
  value, onChange, opcoes, placeholder, className,
}: {
  value: string; onChange: (v: string) => void;
  opcoes: string[]; placeholder?: string; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const filtered = value.trim()
    ? opcoes.filter(o => o.toLowerCase().includes(value.toLowerCase()))
    : opcoes; // mostra TUDO quando vazio

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className={className}
      />
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 border rounded-md bg-background shadow-lg max-h-52 overflow-auto">
          {filtered.map(o => (
            <button key={o} type="button"
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent"
              onMouseDown={e => { e.preventDefault(); onChange(o); setOpen(false); }}>
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Célula de texto editável com campo largo
function CelulaTexto({
  valor, onSalvar, className = '',
}: { valor: string; onSalvar: (v: string) => Promise<void>; className?: string }) {
  const [editando, setEditando] = useState(false);
  const [val, setVal] = useState(valor);

  async function salvar() {
    if (val.trim() === String(valor).trim()) { setEditando(false); return; }
    await onSalvar(val);
    setEditando(false);
  }

  if (editando) {
    return (
      <div className="flex items-center gap-1 min-w-[180px]">
        <Input
          autoFocus value={val}
          onFocus={e => e.target.select()}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') salvar(); if (e.key === 'Escape') { setVal(valor); setEditando(false); } }}
          className="h-7 px-2 text-sm border-2 border-primary bg-background w-full"
        />
        <button className="text-green-600 hover:text-green-700 shrink-0 p-0.5" onClick={salvar}><Check className="h-3.5 w-3.5" /></button>
        <button className="text-muted-foreground hover:text-foreground shrink-0 p-0.5" onClick={() => { setVal(valor); setEditando(false); }}><X className="h-3.5 w-3.5" /></button>
      </div>
    );
  }
  return (
    <span className={`cursor-pointer hover:bg-primary/10 hover:ring-1 hover:ring-primary/30 rounded px-1 -mx-1 transition-colors ${className}`}
      title="Clique para editar" onClick={() => { setVal(valor); setEditando(true); }}>
      {valor || <span className="text-muted-foreground/40 italic text-xs">—</span>}
    </span>
  );
}

// Célula numérica (preço) editável
function CelulaPreco({ valor, onSalvar }: { valor: number; onSalvar: (v: number) => Promise<void> }) {
  const [editando, setEditando] = useState(false);
  const [val, setVal] = useState(String(valor));

  async function salvar() {
    const num = Number(val);
    if (isNaN(num) || num === valor) { setEditando(false); return; }
    await onSalvar(num);
    setEditando(false);
  }

  if (editando) {
    return (
      <div className="flex items-center gap-1 justify-end">
        <Input autoFocus type="number" min="0" step="0.01"
          value={val} onFocus={e => e.target.select()}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') salvar(); if (e.key === 'Escape') { setVal(String(valor)); setEditando(false); } }}
          className="h-7 w-28 px-2 text-sm border-2 border-primary bg-background text-right"
        />
        <button className="text-green-600 hover:text-green-700 p-0.5" onClick={salvar}><Check className="h-3.5 w-3.5" /></button>
        <button className="text-muted-foreground hover:text-foreground p-0.5" onClick={() => { setVal(String(valor)); setEditando(false); }}><X className="h-3.5 w-3.5" /></button>
      </div>
    );
  }
  return (
    <span className="cursor-pointer tabular-nums font-medium hover:bg-primary/10 hover:ring-1 hover:ring-primary/30 rounded px-1 -mx-1 transition-colors"
      title="Clique para editar" onClick={() => { setVal(String(valor)); setEditando(true); }}>
      {fmtBRL(valor)}
    </span>
  );
}

// Célula de unidade com combobox inline
function CelulaUnidade({ valor, onSalvar }: { valor: string; onSalvar: (v: string) => Promise<void> }) {
  const [editando, setEditando] = useState(false);
  const [val, setVal] = useState(valor);

  async function salvar(v?: string) {
    const novo = v ?? val;
    if (novo === valor) { setEditando(false); return; }
    await onSalvar(novo);
    setEditando(false);
  }

  if (!editando) {
    return (
      <span className="cursor-pointer text-muted-foreground text-xs hover:bg-primary/10 hover:ring-1 hover:ring-primary/30 rounded px-1 -mx-1 transition-colors"
        onClick={() => { setVal(valor); setEditando(true); }}>
        {valor || '—'}
      </span>
    );
  }

  const filtered = val.trim() ? UNIDADES_PADRAO.filter(u => u.toLowerCase().includes(val.toLowerCase())) : UNIDADES_PADRAO;

  return (
    <div className="relative min-w-[80px]">
      <Input autoFocus value={val}
        onFocus={e => e.target.select()}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') salvar(); if (e.key === 'Escape') { setVal(valor); setEditando(false); } }}
        onBlur={() => setTimeout(() => setEditando(false), 150)}
        className="h-7 px-2 text-xs border-2 border-primary bg-background w-full"
      />
      {filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-0.5 border rounded-md bg-background shadow-lg max-h-40 overflow-auto">
          {filtered.map(u => (
            <button key={u} type="button"
              className="w-full text-left px-2 py-1 text-xs hover:bg-accent"
              onMouseDown={e => { e.preventDefault(); salvar(u); }}>
              {u}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Célula de categoria com combobox inline
function CelulaCategoria({ valor, onSalvar }: { valor: string; onSalvar: (v: string) => Promise<void> }) {
  const [editando, setEditando] = useState(false);
  const [val, setVal] = useState(valor);

  async function salvar(v?: string) {
    const novo = v ?? val;
    if (novo === valor) { setEditando(false); return; }
    await onSalvar(novo);
    setEditando(false);
  }

  if (!editando) {
    return (
      <span className="cursor-pointer text-muted-foreground text-xs hover:bg-primary/10 hover:ring-1 hover:ring-primary/30 rounded px-1 -mx-1 transition-colors"
        onClick={() => { setVal(valor); setEditando(true); }}>
        {valor || <span className="italic opacity-40">—</span>}
      </span>
    );
  }

  const filtered = val.trim() ? CATEGORIAS_PADRAO.filter(c => c.toLowerCase().includes(val.toLowerCase())) : CATEGORIAS_PADRAO;

  return (
    <div className="relative min-w-[140px]">
      <Input autoFocus value={val}
        onFocus={e => e.target.select()}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') salvar(); if (e.key === 'Escape') { setVal(valor); setEditando(false); } }}
        onBlur={() => setTimeout(() => setEditando(false), 150)}
        className="h-7 px-2 text-xs border-2 border-primary bg-background w-full"
      />
      {filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-0.5 border rounded-md bg-background shadow-lg max-h-52 overflow-auto">
          {filtered.map(c => (
            <button key={c} type="button"
              className="w-full text-left px-2 py-1 text-xs hover:bg-accent"
              onMouseDown={e => { e.preventDefault(); salvar(c); }}>
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FormInsumo({ open, onClose, onSalvo }: { open: boolean; onClose: () => void; onSalvo: () => void }) {
  const [form, setForm] = useState({ descricao: '', unidade: '', preco: '', tipo: 'M' as TipoInsumo, categoria: '' });
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    try {
      const res = await fetch('/api/insumos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, preco: Number(form.preco) || 0 }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.erros?.join(', ') || data.error); return; }
      toast.success(`Insumo ${data.codigo} criado`);
      onSalvo(); onClose();
      setForm({ descricao: '', unidade: '', preco: '', tipo: 'M', categoria: '' });
    } finally { setSalvando(false); }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo Insumo</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Tipo</Label>
            <div className="grid grid-cols-3 gap-2">
              {TIPOS_INSUMO_ATIVOS.map(t => (
                <button key={t} type="button"
                  onClick={() => setForm(f => ({ ...f, tipo: t }))}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                    form.tipo === t
                      ? `${TIPO_STYLE[t]} ring-2 ring-offset-1 ring-current`
                      : 'border-border bg-muted/30 hover:bg-muted/60 text-muted-foreground'
                  }`}>
                  <div className="font-bold">{t}</div>
                  <div className="text-xs opacity-80">{TIPO_INSUMO_LABEL[t]}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Descrição *</Label>
            <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Cimento CP-II 50kg" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Unidade *</Label>
              <ComboboxInput value={form.unidade} onChange={v => setForm(f => ({ ...f, unidade: v }))} opcoes={UNIDADES_PADRAO} placeholder="sc, m², kg..." />
            </div>
            <div className="grid gap-1.5">
              <Label>Preço (R$)</Label>
              <Input type="number" min="0" step="0.01" value={form.preco} placeholder="0,00"
                onFocus={e => e.target.select()} onChange={e => setForm(f => ({ ...f, preco: e.target.value }))} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Categoria</Label>
            <ComboboxInput value={form.categoria} onChange={v => setForm(f => ({ ...f, categoria: v }))} opcoes={CATEGORIAS_PADRAO} placeholder="Ex: Material Básico, Aço..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Criar Insumo'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function InsumosPage() {
  const [insumos, setInsumos] = useState<(Insumo & { data_alteracao?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('ativo');
  const [modalAberto, setModalAberto] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtroTipo !== 'todos') params.set('tipo', filtroTipo);
      if (filtroStatus !== 'todos') params.set('status', filtroStatus);
      if (busca) params.set('q', busca);
      const res = await fetch(`/api/insumos?${params}`);
      const data = await res.json();
      setInsumos(Array.isArray(data) ? data : []);
    } catch { toast.error('Erro ao carregar insumos'); }
    finally { setLoading(false); }
  }, [busca, filtroTipo, filtroStatus]);

  useEffect(() => { carregar(); }, [carregar]);

  async function atualizar(id: string, campo: string, valor: unknown) {
    const insumo = insumos.find(i => i.id === id);
    if (!insumo) return;
    try {
      const res = await fetch(`/api/insumos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...insumo, [campo]: valor }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || 'Erro'); return; }
      const updated = await res.json();
      setInsumos(prev => prev.map(i => i.id === id ? { ...i, [campo]: valor, data_alteracao: updated.data_alteracao } : i));
    } catch { toast.error('Erro ao atualizar'); }
  }

  async function excluir(id: string, codigo: string) {
    if (!confirm(`Excluir insumo ${codigo}?`)) return;
    const res = await fetch(`/api/insumos/${id}`, { method: 'DELETE' });
    if (res.ok) { setInsumos(prev => prev.filter(i => i.id !== id)); toast.success('Excluído'); }
    else toast.error('Erro ao excluir');
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Insumos</h1>
          <p className="text-muted-foreground text-xs">{insumos.length} registros</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" onClick={() => setModalAberto(true)}>
            <Plus className="h-3 w-3 mr-1" /> Novo Insumo
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="pl-8 h-8 text-sm" placeholder="Buscar por código, descrição ou categoria..."
            value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <Select value={filtroTipo} onValueChange={v => v !== null && setFiltroTipo(v)}>
          <SelectTrigger className="w-40 h-8 text-sm"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {TIPOS_INSUMO_ATIVOS.map(t => <SelectItem key={t} value={t}>{TIPO_INSUMO_LABEL[t]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroStatus} onValueChange={v => v !== null && setFiltroStatus(v)}>
          <SelectTrigger className="w-32 h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground w-24">Código</th>
              <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground">Descrição</th>
              <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground w-20">Un.</th>
              <th className="text-right px-3 py-2 font-medium text-xs text-muted-foreground w-32">Preço</th>
              <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground w-28">Tipo</th>
              <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground w-40">Categoria</th>
              <th className="text-left px-3 py-2 font-medium text-xs text-muted-foreground w-36">Última Alt.</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="text-center py-8 text-muted-foreground text-xs">Carregando...</td></tr>}
            {!loading && insumos.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-muted-foreground text-xs">Nenhum insumo encontrado</td></tr>}
            {!loading && insumos.map(ins => (
              <tr key={ins.id} className="border-b hover:bg-muted/20 transition-colors group">
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{ins.codigo}</td>
                <td className="px-3 py-2">
                  <CelulaTexto valor={ins.descricao} onSalvar={v => atualizar(ins.id, 'descricao', v)} />
                </td>
                <td className="px-3 py-2">
                  <CelulaUnidade valor={ins.unidade} onSalvar={v => atualizar(ins.id, 'unidade', v)} />
                </td>
                <td className="px-3 py-2 text-right">
                  <CelulaPreco valor={ins.preco} onSalvar={v => atualizar(ins.id, 'preco', v)} />
                </td>
                <td className="px-3 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TIPO_STYLE[ins.tipo]}`}>
                    {ins.tipo} — {TIPO_INSUMO_LABEL[ins.tipo]}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <CelulaCategoria valor={ins.categoria || ''} onSalvar={v => atualizar(ins.id, 'categoria', v)} />
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground tabular-nums">
                  {fmtData((ins as { data_alteracao?: string }).data_alteracao || '')}
                </td>
                <td className="px-3 py-2">
                  <button className="text-muted-foreground hover:text-destructive transition-colors p-0.5 rounded opacity-0 group-hover:opacity-100"
                    onClick={() => excluir(ins.id, ins.codigo)} title="Excluir">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <FormInsumo open={modalAberto} onClose={() => setModalAberto(false)} onSalvo={carregar} />
    </div>
  );
}
