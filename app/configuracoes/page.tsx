'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Settings, CheckCircle2, Download, Upload, Database, AlertTriangle } from 'lucide-react';
import { UNIDADES_PADRAO, CATEGORIAS_PADRAO } from '@/lib/types';
import { toast } from 'sonner';

export default function ConfiguracoesPage() {
  const [unidades, setUnidades] = useState<string[]>([...UNIDADES_PADRAO]);
  const [categorias, setCategorias] = useState<string[]>([...CATEGORIAS_PADRAO]);
  const [novaUnidade, setNovaUnidade] = useState('');
  const [novaCategoria, setNovaCategoria] = useState('');

  // Backup / Restore
  const [restaurando, setRestaurando] = useState(false);
  const [confirmarRestaurar, setConfirmarRestaurar] = useState(false);
  const [arquivoBackup, setArquivoBackup] = useState<File | null>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  function adicionarUnidade() {
    const v = novaUnidade.trim();
    if (!v || unidades.includes(v)) return;
    setUnidades(prev => [...prev, v]);
    setNovaUnidade('');
  }

  function removerUnidade(u: string) {
    setUnidades(prev => prev.filter(x => x !== u));
  }

  function adicionarCategoria() {
    const v = novaCategoria.trim();
    if (!v || categorias.includes(v)) return;
    setCategorias(prev => [...prev, v]);
    setNovaCategoria('');
  }

  function removerCategoria(c: string) {
    setCategorias(prev => prev.filter(x => x !== c));
  }

  function baixarBackup() {
    const a = document.createElement('a');
    a.href = '/api/backup';
    a.download = '';
    a.click();
    toast.success('Backup sendo gerado...');
  }

  async function restaurarBackup() {
    if (!arquivoBackup) { toast.error('Selecione um arquivo de backup'); return; }
    if (!confirmarRestaurar) { setConfirmarRestaurar(true); return; }
    setRestaurando(true);
    try {
      const fd = new FormData();
      fd.append('file', arquivoBackup);
      const res = await fetch('/api/backup', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Erro ao restaurar'); return; }
      toast.success('Backup restaurado! Recarregue a página para ver os dados.');
      setConfirmarRestaurar(false);
      setArquivoBackup(null);
    } catch {
      toast.error('Erro ao restaurar backup');
    } finally {
      setRestaurando(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-bold">Configurações</h1>
      </div>

      <div className="grid gap-8">

        {/* ─── Backup & Restauração ─────────────────────────── */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Database className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Backup e Restauração</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-5">
            Exporte todos os dados (insumos, composições, orçamentos) para um arquivo JSON.
            Use para migrar, fazer cópia de segurança ou sincronizar entre ambientes (local ↔ online).
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Exportar */}
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:bg-green-950/20 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <Download className="h-4 w-4 text-green-700 dark:text-green-400" />
                <h3 className="font-medium text-sm text-green-800 dark:text-green-300">Exportar Backup</h3>
              </div>
              <p className="text-xs text-green-700 dark:text-green-400 mb-3">
                Baixa todos os dados do sistema em um arquivo <code>.json</code>. Guarde este arquivo com segurança.
              </p>
              <Button
                size="sm"
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={baixarBackup}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Baixar Backup Completo
              </Button>
            </div>

            {/* Restaurar */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:bg-blue-950/20 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <Upload className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                <h3 className="font-medium text-sm text-blue-800 dark:text-blue-300">Restaurar Backup</h3>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-400 mb-3">
                Selecione um arquivo <code>.json</code> exportado anteriormente para restaurar todos os dados.
              </p>
              <div
                className="border-2 border-dashed border-blue-300 dark:border-blue-700 rounded p-2 text-center cursor-pointer hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors mb-2"
                onClick={() => backupInputRef.current?.click()}
              >
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {arquivoBackup ? (
                    <span className="font-medium">{arquivoBackup.name}</span>
                  ) : (
                    'Clique para selecionar backup.json'
                  )}
                </p>
                <input
                  ref={backupInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={e => { setArquivoBackup(e.target.files?.[0] || null); setConfirmarRestaurar(false); }}
                />
              </div>

              {confirmarRestaurar && arquivoBackup && (
                <div className="flex items-start gap-1.5 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-2 mb-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    <strong>Atenção:</strong> todos os dados atuais serão substituídos. Clique novamente em &quot;Restaurar&quot; para confirmar.
                  </p>
                </div>
              )}

              <Button
                size="sm"
                className="w-full"
                variant={confirmarRestaurar ? 'destructive' : 'default'}
                disabled={!arquivoBackup || restaurando}
                onClick={restaurarBackup}
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                {restaurando ? 'Restaurando...' : confirmarRestaurar ? 'Confirmar Restauração' : 'Restaurar Backup'}
              </Button>
            </div>
          </div>

          <div className="mt-3 rounded bg-muted/40 border px-3 py-2 text-xs text-muted-foreground">
            <strong>Fluxo recomendado para uso online:</strong>{' '}
            1. Exporte o backup aqui (local) → 2. Acesse o sistema online → 3. Restaure o backup lá → 4. Trabalhe online → 5. Exporte o backup do online → 6. Restaure localmente.
          </div>
        </div>

        {/* ─── Unidades de medida ───────────────────────────── */}
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-1">Unidades de Medida</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Disponíveis nos dropdowns de cadastro de insumos e composições.
          </p>

          <div className="flex gap-2 mb-3">
            <Input
              className="h-8 text-sm flex-1"
              placeholder="Nova unidade (ex: dm³, ton...)"
              value={novaUnidade}
              onChange={e => setNovaUnidade(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && adicionarUnidade()}
            />
            <Button size="sm" className="h-8" onClick={adicionarUnidade} disabled={!novaUnidade.trim()}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {unidades.map(u => (
              <span key={u} className="flex items-center gap-1 text-xs border rounded-full px-2.5 py-0.5 bg-muted/50">
                {u}
                <button
                  onClick={() => removerUnidade(u)}
                  className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                  title="Remover"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* ─── Categorias de insumos ────────────────────────── */}
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-1">Categorias de Insumos</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Usadas para classificar e filtrar insumos no módulo de cadastro.
          </p>

          <div className="flex gap-2 mb-3">
            <Input
              className="h-8 text-sm flex-1"
              placeholder="Nova categoria (ex: Impermeabilizante...)"
              value={novaCategoria}
              onChange={e => setNovaCategoria(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && adicionarCategoria()}
            />
            <Button size="sm" className="h-8" onClick={adicionarCategoria} disabled={!novaCategoria.trim()}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {categorias.map(c => (
              <span key={c} className="flex items-center gap-1 text-xs border rounded-full px-2.5 py-0.5 bg-muted/50">
                {c}
                <button
                  onClick={() => removerCategoria(c)}
                  className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                  title="Remover"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* ─── Tipos de insumo (fixo) ───────────────────────── */}
        <div className="border rounded-lg p-4 bg-muted/20">
          <h2 className="font-semibold mb-1">Tipos de Insumo</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Classificação fixa usada nos breakdowns de custo das composições e orçamentos.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { tipo: 'M',  label: 'Material',     cor: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800' },
              { tipo: 'MO', label: 'Mão de Obra',  cor: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800' },
              { tipo: 'E',  label: 'Equipamento',  cor: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800' },
            ].map(({ tipo, label, cor }) => (
              <div key={tipo} className={`rounded-lg border p-3 text-xs ${cor}`}>
                <p className="font-bold text-base mb-0.5">{tipo}</p>
                <p className="font-medium">{label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Estes tipos são fixos e não podem ser alterados pelo usuário.
          </p>
        </div>

        {/* ─── Status de orçamento ─────────────────────────── */}
        <div className="border rounded-lg p-4 bg-muted/20">
          <h2 className="font-semibold mb-1">Status de Orçamento</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Estágios de aprovação disponíveis em cada orçamento.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { valor: 'em_andamento',        label: 'Em Andamento',      desc: 'Orçamento em elaboração',        cor: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700' },
              { valor: 'aguardando_aprovacao', label: 'Aguard. Aprovação', desc: 'Aguardando revisão do cliente', cor: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700' },
              { valor: 'aprovado',            label: 'Aprovado',          desc: 'Orçamento aceito',               cor: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700' },
            ].map(({ valor, label, desc, cor }) => (
              <div key={valor} className={`rounded-lg border p-3 text-xs ${cor}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <p className="font-bold">{label}</p>
                </div>
                <p className="opacity-80 leading-snug">{desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
