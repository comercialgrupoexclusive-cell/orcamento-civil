'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface Resultado {
  importados: number;
  ignorados: number;
  erros: string[];
}

export default function ImportarPage() {
  const [tipo, setTipo] = useState('insumos');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function importar() {
    if (!arquivo) { toast.error('Selecione um arquivo .xlsx'); return; }
    setCarregando(true);
    setResultado(null);
    try {
      const fd = new FormData();
      fd.append('file', arquivo);
      fd.append('tipo', tipo);
      const res = await fetch('/api/importar', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      setResultado(data);
      if (data.importados > 0) toast.success(`${data.importados} registros importados`);
      else toast.warning('Nenhum registro importado');
    } catch {
      toast.error('Erro ao importar');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-2">Importar Excel</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Importe dados a partir de arquivos .xlsx exportados pelo sistema.
      </p>

      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Configurações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1.5">
            <Label>Tipo de dados</Label>
            <Select value={tipo} onValueChange={v => v !== null && setTipo(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="insumos">Insumos</SelectItem>
                <SelectItem value="composicoes">Composições + Itens</SelectItem>
              </SelectContent>
            </Select>
            {/* Select.Root onValueChange wrapper handled via cast */}
          </div>

          <div className="grid gap-1.5">
            <Label>Arquivo .xlsx</Label>
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              {arquivo ? (
                <div>
                  <p className="font-medium text-sm">{arquivo.name}</p>
                  <p className="text-xs text-muted-foreground">{(arquivo.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">Clique para selecionar ou arraste o arquivo</p>
                  <p className="text-xs text-muted-foreground mt-1">.xlsx (formato exportado pelo sistema)</p>
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={e => setArquivo(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          <Button className="w-full" onClick={importar} disabled={carregando || !arquivo}>
            {carregando ? 'Importando...' : 'Importar'}
          </Button>
        </CardContent>
      </Card>

      {resultado && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="font-medium text-sm">Resultado da importação</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{resultado.importados}</p>
                <p className="text-xs text-green-600">importados</p>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center">
                <p className="text-2xl font-bold text-amber-700">{resultado.ignorados}</p>
                <p className="text-xs text-amber-600">ignorados</p>
              </div>
            </div>
            {resultado.erros.length > 0 && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                  <span className="text-xs font-medium text-red-700">Avisos ({resultado.erros.length})</span>
                </div>
                <ul className="text-xs text-red-600 space-y-0.5 max-h-32 overflow-auto">
                  {resultado.erros.map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="mt-6 text-sm text-muted-foreground space-y-1">
        <p className="font-medium">Como usar</p>
        <p>1. Exporte os dados pelo módulo <strong>Exportar</strong></p>
        <p>2. Edite o arquivo no Excel conforme necessário</p>
        <p>3. Reimporte aqui. Registros com código duplicado são ignorados.</p>
      </div>
    </div>
  );
}
