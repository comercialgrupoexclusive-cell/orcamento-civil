# CLAUDE.md — Orçamento Civil

Documentação completa do sistema para migração ou continuação em outro terminal.

---

## Visão Geral

Sistema web de gestão de orçamentos para obras civis. Permite cadastrar insumos, composições de serviço e montar planilhas orçamentárias por etapas de obra, com exportação XLSX e Curva ABC.

**Stack:** Next.js 16 (App Router) + Turbopack · TypeScript · Tailwind CSS v4 · shadcn/ui · `xlsx`
**Armazenamento:** Arquivos JSON locais em `/data/*.json` (sem banco de dados)

---

## Instalação e Execução

```bash
# Pré-requisito: Node.js 18+
cd orcamento-civil
npm install
npm run dev
# Acesse: http://localhost:3000
```

Na primeira vez, o sistema cria automaticamente os arquivos JSON em `/data/` via `/api/init`.

---

## Estrutura de Pastas

```
orcamento-civil/
├── app/
│   ├── api/
│   │   ├── insumos/                  # CRUD insumos
│   │   ├── composicoes/              # CRUD composições + itens
│   │   ├── orcamentos/               # CRUD orçamentos + itens
│   │   │   └── [id]/
│   │   │       ├── clone/            # Clonar / salvar como template
│   │   │       └── itens/[itemId]/   # PUT/DELETE item individual
│   │   ├── exportar/                 # Export XLSX
│   │   └── importar/                 # Import XLSX
│   ├── insumos/page.tsx
│   ├── composicoes/page.tsx
│   ├── orcamentos/
│   │   ├── page.tsx                  # Lista de orçamentos + templates
│   │   └── [id]/page.tsx             # Detalhe do orçamento
│   └── importar/page.tsx
├── lib/
│   ├── db.ts                         # JSON DB layer
│   ├── types.ts                      # Tipos + ETAPAS (20 etapas de obra)
│   ├── validators.ts                 # Validações + normalizar()
│   └── codigo-generator.ts           # Gerador de códigos
├── components/ui/                    # shadcn/ui components
└── data/                             # Dados JSON (criado automaticamente)
    ├── INSUMOS.json
    ├── COMPOSICOES.json
    ├── ITENS_COMPOSICAO.json
    ├── ORCAMENTOS.json
    ├── ITENS_ORCAMENTO.json
    └── CONFIG.json
```

---

## Esquema de Dados

### INSUMOS
| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid | Chave primária |
| codigo | string | Ex: MAT-001 |
| descricao | string | Nome do insumo |
| unidade | string | m³, kg, un, h... |
| preco | number | Preço unitário R$ |
| tipo | M/MO/E/S | Material/Mão de Obra/Equipamento/Serviço |
| categoria | string | Categoria livre |
| status | ativo/inativo | |
| data_alteracao | ISO date | |

### COMPOSICOES
| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid | |
| codigo | string | Ex: COMP-001 |
| descricao | string | Nome da composição |
| unidade_producao | string | Unidade do serviço final |
| producao | number | Taxa de produção |
| descricao_tecnica | string | Detalhamento técnico |
| status | ativo/inativo | |

### ITENS_COMPOSICAO
| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid | |
| composicao_id | uuid | FK → COMPOSICOES |
| insumo_id | uuid | FK → INSUMOS |
| coeficiente | number | Qtd de insumo por unidade de produção |
| unidade | string | Unidade do insumo |

### ORCAMENTOS
| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid | |
| titulo | string | Nome do orçamento |
| descricao | string | |
| data_criacao | ISO date | |
| data_atualizacao | ISO date | |
| status | em_andamento/aguardando_aprovacao/aprovado/template | template = orçamento-modelo |
| bdi_percentual | number | BDI em % |

### ITENS_ORCAMENTO
| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid | |
| orcamento_id | uuid | FK → ORCAMENTOS |
| etapa_codigo | string | 01–20 (ver ETAPAS) |
| sub_etapa | string | Nome do serviço/grupo (opcional) |
| composicao_id | uuid | FK → COMPOSICOES |
| descricao_override | string | Substitui descrição da composição |
| unidade_override | string | Substitui unidade |
| custo_unitario_override | number | Substitui custo calculado |
| quantidade | number | Quantidade do serviço |
| quantidade_tipo | AUTO/MANUAL | AUTO=calculado, MANUAL=confirmado |
| ordem | number | Posição para drag-and-drop |
| qtd_overrides | JSON string | {"[insumo_id]": number} — override de qtd por insumo |

---

## API Endpoints

### Insumos
| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/insumos?q=&tipo=&status=` | Listar/buscar |
| POST | `/api/insumos` | Criar (bloqueia duplicata por descrição) |
| PUT | `/api/insumos/[id]` | Editar |
| DELETE | `/api/insumos/[id]` | Excluir |

### Composições
| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/composicoes?q=&status=&custo=1` | Listar (custo=1 calcula custo unitário) |
| POST | `/api/composicoes` | Criar (bloqueia duplicata) |
| GET | `/api/composicoes/[id]/itens` | Listar insumos da composição |
| POST | `/api/composicoes/[id]/itens` | Adicionar insumo (bloqueia duplicata) |
| PUT | `/api/composicoes/[id]/itens/[itemId]` | Editar coeficiente |
| DELETE | `/api/composicoes/[id]/itens/[itemId]` | Remover insumo |

### Orçamentos
| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/orcamentos` | Lista orçamentos ativos |
| GET | `/api/orcamentos?templates=1` | Lista templates |
| POST | `/api/orcamentos` | Criar (ou {template_id} para criar de template) |
| GET | `/api/orcamentos/[id]` | Detalhe completo (etapas, itens, insumos, totais) |
| PUT | `/api/orcamentos/[id]` | Atualizar título/BDI/status/descrição |
| DELETE | `/api/orcamentos/[id]` | Excluir |
| POST | `/api/orcamentos/[id]/itens` | Adicionar composição |
| PUT | `/api/orcamentos/[id]/itens/[itemId]` | Editar item (qtd, etapa_codigo, sub_etapa, qtd_overrides...) |
| DELETE | `/api/orcamentos/[id]/itens/[itemId]` | Remover item |
| POST | `/api/orcamentos/[id]/clone` | Clonar ({as_template:true} para template) |

### Exportar / Importar
| Endpoint | Descrição |
|---|---|
| GET `/api/exportar?tipo=insumos` | XLSX de insumos |
| GET `/api/exportar?tipo=composicoes` | XLSX de composições |
| GET `/api/exportar?tipo=orcamento&id=[id]` | XLSX do orçamento (por etapa + resumo) |
| GET `/api/exportar?tipo=modelo-orcamento` | Modelo em branco para importação |
| POST `/api/importar?tipo=insumos` | Importar insumos de XLSX |
| POST `/api/importar?tipo=composicoes` | Importar composições de XLSX |
| POST `/api/importar?tipo=orcamento` | Importar orçamento de XLSX (Etapa, Sub-Etapa, Código Composição, Quantidade) |

---

## Todas as Alterações Implementadas (cronologia)

### Sessão 1 — Setup inicial
- Projeto descompactado e executado no Windows
- Node.js instalado e PATH configurado

### Sessão 2 — Funcionalidades de Orçamento (Round 1)
**Arquivo:** `app/orcamentos/[id]/page.tsx`
- Expansão de itens para mostrar insumos com qtd calculada (coef × qtd)
- Sub-item sem composição obrigatória (somente descrição)
- Delete/editar sub-itens e grupos de sub-etapa
- Curva ABC de Insumos (nova aba na página de detalhe)
- Filtros por tipo e busca na Curva ABC

**Arquivo:** `app/api/importar/route.ts`
- Import de orçamento via XLSX (colunas: Etapa, Sub-Etapa, Código Composição, Quantidade)

**Arquivo:** `app/api/exportar/route.ts`
- Endpoint `tipo=modelo-orcamento`: baixa template em branco com referências

### Sessão 3 — Melhorias de UX (Round 2)
**Arquivo:** `app/orcamentos/[id]/page.tsx`
- Select de etapas: `w-[480px]` para texto completo; descrição primeiro, código depois
- Sub-etapa renomeada para "Serviço" na UI; `ServicoHeader` com subtotal do grupo
- `CelulaNum` com prop `corStatus`: amarelo=AUTO, verde=MANUAL para qtd
- "Salvar como Template" via botão no cabeçalho (clone com `as_template:true`)
- Drag-and-drop para reordenar itens dentro da etapa

**Arquivo:** `app/api/orcamentos/[id]/clone/route.ts` *(novo)*
- Endpoint POST que duplica orçamento + todos os ITENS_ORCAMENTO
- `{as_template: true}` → status = 'template'

**Arquivo:** `app/orcamentos/page.tsx`
- Seção separada de Templates (fundo violeta)
- Botão Duplicar em cada card
- Botão "Modelo Importação"
- Modal de criação com opção de selecionar template

**Arquivo:** `app/composicoes/page.tsx`
- qtdSimulada começa em 1
- Botão + com check verde 2s após adicionar; sem bloquear no campo vazio
- Descrição primeiro, depois código nos dropdowns

**Arquivo:** `app/api/orcamentos/route.ts`
- GET: filtro `?templates=1` retorna só templates; padrão exclui templates
- POST: suporte a `template_id` para criar a partir de template

### Sessão 4 — qtd_overrides + Dois botões (Round 3)
**Arquivo:** `lib/db.ts`
- Adicionado campo `qtd_overrides` no schema de `ITENS_ORCAMENTO`

**Arquivo:** `app/api/orcamentos/[id]/route.ts` GET
- Parseia `qtd_overrides` JSON por item
- Para cada insumo: calcula `qtd_adotada` e `has_override`
- `custo_item = preco × qtd_adotada` (usa override se existir)
- `custoTotal` soma direto dos insumos (respeita `custo_unitario_override`)
- Breakdown M/MO/E calculado a partir dos custos reais dos insumos
- Removida função `tipoBreakdownBase` (substituída por cálculo direto)

**Arquivo:** `app/api/orcamentos/[id]/itens/[itemId]/route.ts` PUT
- Aceita `qtd_overrides` (objeto JSON) e serializa como string

**Arquivo:** `app/orcamentos/[id]/page.tsx`
- `InsumoItem` interface: adicionados `qtd_adotada` e `has_override`
- Curva ABC usa `qtd_adotada`
- Novo botão `+ Composição` (modal simples: etapa + busca + qtd)
- Novo botão `+ Serviço` (modal: nome + etapa + N composições com qtd)
- Coluna "Qtd. Adotada" na tabela de insumos expandida: editável com `CelulaNum`
  - 🟡 Amarelo = calculada automaticamente
  - 🟢 Verde = override do usuário
- Função `atualizarQtdInsumo()`: salva override mantendo overrides existentes
- Função `adicionarServico()`: POST N itens com mesmo `sub_etapa`
- Função `buscarCompsServico()`: busca dinâmica por linha no modal Serviço

### Sessão 5 — Qualidade e Migração (Round 4 — atual)
**Arquivo:** `app/api/insumos/route.ts` POST
- Bloqueia cadastro de insumo com descrição normalizada duplicada (HTTP 409)

**Arquivo:** `app/api/composicoes/route.ts` POST
- Bloqueia composição com descrição normalizada duplicada (HTTP 409)

**Arquivo:** `app/api/composicoes/[id]/itens/route.ts` POST
- Bloqueia insumo duplicado na mesma composição (HTTP 409)

**Arquivo:** `app/api/orcamentos/[id]/itens/[itemId]/route.ts` PUT
- Aceita `etapa_codigo` para mover item para outra etapa

**Arquivo:** `app/orcamentos/[id]/page.tsx`
- Edição inline do **título** do orçamento (CelulaTexto)
- Edição inline da **descrição** do orçamento (CelulaTexto)
- Modal `+ Composição`: somente busca de composição, sem campos livres; composição obrigatória
- `ServicoHeader`: clique abre modal de edição (não mais inline)
- Modal "Editar Serviço": nome + mover para outra etapa (aviso visual ao mudar etapa)

---

## Notas de Migração

1. **Copie a pasta `/data`** do servidor antigo para o novo — ela contém todos os dados
2. Copie também o arquivo `.env.local` se houver variáveis configuradas
3. Execute `npm install` no novo terminal
4. Execute `npm run dev` para desenvolvimento
5. Para produção: `npm run build && npm start`
6. Os arquivos JSON em `/data` são criados automaticamente se não existirem (vazios)

---

## Dependências Principais

```json
{
  "next": "16.2.6",
  "react": "^19.0.0",
  "typescript": "^5",
  "tailwindcss": "^4",
  "xlsx": "^0.18.5",
  "uuid": "^9.0.0",
  "sonner": "^1",
  "lucide-react": "latest"
}
```

---

*Gerado automaticamente em 2026-05-28. Implementado via Claude (Anthropic).*
