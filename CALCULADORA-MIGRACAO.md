# 🧮 Calculadora de Orçamento — Plano de Reconstrução (MIGRAÇÃO)

> **Use este arquivo para continuar o trabalho em outro terminal/máquina.**
> Cole o conteúdo no início da conversa com o Claude Code e diga: *"continue a partir deste MD"*.

- **Projeto:** `C:\Users\PC\orcamento-civil` (Next.js 16 + React 19 + Turbopack)
- **Produção:** Vercel → publica automático no **push pro GitHub** (escolha do usuário)
- **Banco/Storage:** JSON em `/data` (local) · `/tmp` ou Vercel KV (produção) — ver `lib/db.ts`
- **App online:** https://orcamento-civil.vercel.app/
- **Data:** 2026-05-30

---

## 🎯 OBJETIVO
Refazer a aba **/calculadora** para que seja a ferramenta central: o usuário preenche
poucos campos → o sistema calcula a quantidade de cada serviço → devolve **já vinculado
à composição real do catálogo** (mesmos códigos do Excel/`COMPOSICOES.json`), com **custo
automático** (Σ coeficiente × preço dos insumos).

A versão local (localhost:3000) tinha boa UX (acordeões + preview ao vivo + desconto de
vãos + verga/contraverga), mas o motor apontava para composições **`cmp-001…cmp-021`**
(seed antigo) que **não existem** no catálogo real → custo zerado/quebrado quando jogado
no orçamento. **Essa é a causa raiz.**

---

## 🔑 DIAGNÓSTICO CONFIRMADO (causa raiz)
- Catálogo real usa códigos **`cmp-1000`, `cmp-2001`, `cmp-4002`, `cmp-15009`…** (do Excel).
- Motor antigo (`calc-engine.ts`) usava **`cmp-001…cmp-021`** (seed `lib/seed-data.ts`) → **não batem**.
- **Correção:** religar TODOS os templates da calculadora aos códigos reais (`cmp-<codigo>`).

### ✅ Validação de custo (Σ coef × preço) — bate 100% com o Excel
Rodado via script de análise cruzando `COMPOSICOES × ITENS_COMPOSICAO × INSUMOS`
(93 composições, 422 itens, 241 insumos — **0 composições vazias**):

| Código | Custo calculado | Excel | OK? |
|---|---|---|---|
| 1000 (raspagem) | 367,50 | 367,5 | ✅ |
| 2001 (estaca C25 3m) | 282,46 | 282,46 | ✅ |
| 4002 (alv. estrutural) | 103,66 | 103,66 | ✅ |
| 9001 (emboço/reboco) | 52,23 | 52,23 | ✅ |
| 13012 (piso cerâmico) | 135,44 | 135,44 | ✅ |
| 15009 (tomada simples) | 489,50 | 489,5 | ✅ |

⚠️ **Evitar** (insumo sem preço → custo 0): `cmp-15007` (Eletroduto PEAD) e `cmp-19000`
(Limpeza Final). Usar `cmp-19001` para limpeza.

---

## 📐 MAPA: bloco da calculadora → composição real

| Grupo (UI) | Entrada do usuário | Templates → composição |
|---|---|---|
| 01 Preliminares | área terreno, perímetro, área construída | raspagem `1000`, placa `1002`, tapume `1003`(=perím), inst. hidro `1005`, inst. energia `1006`, poste `1010`, hidrômetro `1011` |
| 02 Fundação Baldrame | comp. baldrame, seção b×h | gabarito `2000`, armadura `2003.1`, fôrma `2003.2`, travamento `2003.3`, concreto `2002.3`(=b·h·comp), reaterro `2004`, imperm `2005`, contrapiso `2006` |
| 02b **Estacas (profundidade)** | nº estacas + **profundidade (m) livre** + nº blocos | estaca `2001` (**linear: equiv = Σ qtd·prof/3**, NÃO trava em múltiplos de 3), bloco `2002` |
| 03 Laje | tabela de lajes (qtd, comp, larg, esp) | laje `3007`(=área), fôrma fechamento `3008`(=perím), concreto `3009`(=volume) |
| 03 Pilares | tabela (qtd, l1, l2, h) | concreto `3009`(=Σ vol) |
| 03 Vigas | tabela (b, h, comp) | concreto `3009`(=Σ vol) |
| 04 Alvenaria | comp. paredes, altura, **tipo (vedação/estrutural)**, portas/janelas | estrutural `4002` OU vedação `4000` (área líquida = comp·alt − vãos), verga `4001`(=vergas+contravergas) |
| 05 Esquadrias (auto dos vãos) | — | porta `5006`(=nº portas), janela `5004`(=área janelas em m²) |
| 07 Cobertura | área telhado, **tipo telha**, rufos, calhas | barro: madeira `7004`+telha `7005`; aluzinco: `7000`+`7001`; rufo `7002`, calha `7003` |
| 08 Impermeab. | área molhada | `8001` |
| 09 Revest. interno | área revest., área cerâmica parede | chapisco `9000`, reboco `9001`, cerâmica `9004` |
| 10 Forro | área forro | PVC `10002` |
| 12 Pintura | área int/ext | massa int `12002`, pint int `12000`, teto `12005`(=forro), massa ext `12003`, pint ext `12001` |
| 13 Pisos | área piso | contrapiso `13000`, cerâmica `13012` |
| 14 Acabamento | perímetro rodapé | rodapé `14002` |
| 15 **Elétrica (por ambiente)** | tabela ambientes — **default 3 tomadas + 1 luz, editável** | QD `15005`, aterr. `15006`, tomada simples `15009`, dupla `15011`, interruptor `15002`, luminária `15004`, chuveiro `15013` |
| 16 Hidráulica | nº pontos água, metros rede | ponto `16000`, rede `16006`, reservatório `16005` |
| 17 Esgoto | nº pontos, sifonadas, inspeções | conexões `17001`, gordura `17003`, sifonada `17004`, inspeção `17006` |
| 18 **Banheiro (kit)** | nº banheiros | louças `18000`(×n) + metais `18001`(×n) |
| 19 Limpeza | — | limpeza final `19001` |

> Composições disponíveis também (opções extras p/ dropdowns): porcelanato piso `13002`,
> laminado `13005`, porcelanato parede `9002`, forro drywall `10000`, telha esmaltada `7006`,
> esquadria sob medida `5002`/`5003`, reservatório 500L `16011`, escada `3016`, etc.

---

## ✅ JÁ FEITO NESTA SESSÃO (commitar / levar junto)
1. **`lib/types.ts`** — adicionados ao `CalcParamsRaw` os campos derivados novos
   (tipo_alv, n_portas, area_telhado, tipo_telha, comp_rufos/calhas, area_imper_molhada,
   area_revest_interno, area_ceramica_parede, area_forro, area_pintura_interna/externa,
   area_piso, comp_rodape, ele_* , n_pontos_agua/esgoto, n_caixa_*, n_banheiros,
   estacas_equiv, n_blocos_estaca, comp_forma_laje). Novas interfaces:
   **`CalcEstacaItem`** (id, desc, qtd, prof, blocos) e **`CalcAmbienteEle`**
   (id, nome, tomadas, tomadas_duplas, interruptores, luminarias, chuveiro).
2. **`lib/calc-engine.ts`** — **REESCRITO**: 20 `CALC_GRUPOS` e ~60 `CALC_TEMPLATES`
   todos religados às composições reais `cmp-<codigo>`. `derivarParams()` agora recebe
   também `estacas[]` e `ambientesEle[]`. Lógica de **estaca por profundidade**
   (`estacas_equiv = Σ qtd·prof/3`) e de **elétrica por ambiente** (somatório).
   `calcularQuantitativos()` ganhou os 2 novos parâmetros.

---

## 🔜 FALTA FAZER (ordem sugerida)

### 1. `app/calculadora/page.tsx` — reescrever a UI (arquivo grande, ~1200 linhas)
Manter o padrão atual (componente `GrupoSection` acordeão + `PainelPreview` sticky +
`InputNum`). Acrescentar/ajustar **states**:
```ts
const [estacas, setEstacas] = useState<CalcEstacaItem[]>([]);
const [ambientesEle, setAmbientesEle] = useState<CalcAmbienteEle[]>([]);
```
E passar para o motor:
```ts
const calcItems = useMemo(
  () => calcularQuantitativos(params, vaos, pilares, vigas, lajes, estacas, ambientesEle),
  [params, vaos, pilares, vigas, lajes, estacas, ambientesEle],
);
```
Atualizar `expandidos` para conter os novos `grupo.id` (estacas, esquadrias, cobertura,
imperme, revest, forro, pintura, pisos, acabamento, eletrica, hidraulica, esgoto,
banheiro, complementos).

**Novas seções de UI a criar:**
- `SecaoEstacas` — tabela: descrição, **qtd**, **profundidade (m)** (input livre, step 0.5),
  **nº blocos**. Mostrar prévia "equiv. = Σ qtd·prof/3 estacas".
- `SecaoEletrica` — tabela de ambientes; botão "Adicionar ambiente" já cria com
  **{tomadas:3, tomadas_duplas:0, interruptores:1, luminarias:1, chuveiro:false}**.
  Sugерir botões rápidos: "+ Quarto", "+ Sala", "+ Cozinha", "+ Banheiro"(chuveiro=true).
- `SecaoCobertura` — área telhado (ou projeção × fator inclinação), select tipo telha
  (barro/aluzinco), rufos (m), calhas (m).
- Campos simples (InputNum) para: imperm molhada, revest interno, cerâmica parede, forro,
  pintura int/ext, piso, rodapé, pontos água/esgoto, metros rede, sifonadas, inspeções,
  nº banheiros, tipo alvenaria (select vedação/estrutural → `params.tipo_alv` 1 ou 2).
- Reaproveitar área líquida da alvenaria como sugestão p/ revest/pintura (helper).

**Manter:** `SecaoPreliminares`, `SecaoFundacoes` (baldrame), `SecaoAlvenaria` (vãos
porta/janela + verga/contraverga), `SecaoPilares`, `SecaoVigas`, `SecaoLaje`.

### 2. Defaults de `params` (useState inicial)
```ts
const [params, setParams] = useState<Partial<CalcParamsRaw>>({
  esp_estribo: 0.15, n_barras_long: 4, tabua_larg: 0.20,
  tipo_alv: 2,      // estrutural por padrão (ajustar conforme uso)
  tipo_telha: 1,    // barro colonial
});
```

### 3. API `app/api/calculadora/route.ts`
Já aceita `CalcItem[]` e grava em `ITENS_ORCAMENTO` com `composicao_id` + `quantidade` +
`quantidade_tipo: 'MANUAL'`. **Conferir** que o `sub_etapa` e `etapa_codigo` dos novos
templates existem em `ETAPAS` (lib/types.ts) — todos os códigos usados (01,02,03,04,05,07,
08,09,10,12,13,14,15,16,17,18,19) já estão lá. ✅

### 4. Build + teste local
```bash
cd C:\Users\PC\orcamento-civil
npm run build           # tem que passar sem erro TS
npm run dev             # abrir http://localhost:3000/calculadora
```
Testar: preencher campos → ver quantidades no preview → selecionar → "Adicionar ao
Orçamento" → abrir o orçamento e conferir que **custo unitário ≠ 0** e bate com o catálogo.
Validar contra o Excel "Casa Geminada 42m²" (`C:\Users\PC\Downloads\orcamento_orc-gemi.xlsx`).

### 5. Deploy (GitHub → Vercel)
Repo local ainda **sem remote**. O usuário tem GitHub + Vercel abertos no Chrome.
```bash
cd C:\Users\PC\orcamento-civil
git add -A
git commit -m "Calculadora completa religada ao catalogo real (custo automatico)"
git remote add origin https://github.com/<owner>/<repo>.git   # pegar a URL do repo
git push -u origin <branch>      # Vercel publica automático
```
> Pegar a URL exata do repositório (ler aba do GitHub no Chrome ou o usuário cola).
> Confirmar branch que o Vercel observa (main/master).

---

## 🧰 ARQUIVOS-CHAVE
```
lib/types.ts                 -> tipos, ETAPAS, CalcParamsRaw, CalcEstacaItem, CalcAmbienteEle  [EDITADO]
lib/calc-engine.ts           -> CALC_GRUPOS, CALC_TEMPLATES, derivarParams, calcularQuantitativos  [REESCRITO]
app/calculadora/page.tsx     -> UI do wizard (FALTA reescrever)
app/api/calculadora/route.ts -> grava itens calculados no orçamento (ok)
lib/db.ts                    -> storage JSON/tmp/KV
data/COMPOSICOES.json        -> 93 composições reais (cmp-<codigo>)
data/ITENS_COMPOSICAO.json   -> 422 vínculos composição↔insumo (coeficiente)
data/INSUMOS.json            -> 241 insumos com preço
```

## 🧪 Script de conferência de custos (recriar se precisar)
Cruza `COMPOSICOES × ITENS_COMPOSICAO × INSUMOS` e soma `coeficiente × preço`;
compara com valores do Excel. (Estava em `_analise_comp.mjs` — pode apagar/refazer.)

## 🧹 Limpeza
Remover arquivos temporários antes do commit: `_analise_comp.mjs`, `_dump_xlsx.py`,
`_diag_marker.txt` (se existirem).

## ⚖️ Regras de negócio importantes (do usuário)
- **Estaca = por profundidade em metros (livre)**, não por múltiplos de 3. ✔ implementado.
- **Elétrica = por ambiente**, já vem **3 tomadas + 1 luz por peça**, usuário aumenta. ✔
- **Banheiro = kit único** por unidade (louças+metais), multiplicado por nº de banheiros. ✔
- Armadura/fôrma/concreto de fundação calculados pelo **perímetro/seção** (como no localhost). ✔
- A planilha **devolve o cálculo direto na quantidade** (não precisa o usuário digitar). ✔
- Pode usar coeficientes, mas o custo vem dos **insumos** da composição. ✔
