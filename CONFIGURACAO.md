# Configuração do Sistema

## 1. Criar Credenciais do Google

### 1.1 Service Account (Google Cloud Console)
1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Crie ou selecione um projeto
3. Ative a **Google Sheets API**: Menu → APIs e Serviços → Biblioteca → buscar "Google Sheets API" → Ativar
4. Crie uma Service Account: APIs e Serviços → Credenciais → Criar credenciais → Conta de serviço
   - Nome: `orcamento-civil`
   - Função: Nenhuma (não precisa de papel no projeto)
5. Na Service Account criada, vá em **Chaves** → Adicionar chave → JSON → Baixar o arquivo

### 1.2 Criar a Planilha Google Sheets
1. Acesse [sheets.google.com](https://sheets.google.com) e crie uma nova planilha
2. Copie o **ID** da URL: `https://docs.google.com/spreadsheets/d/**SEU_ID_AQUI**/edit`
3. Compartilhe a planilha com o **email da Service Account** (ex: `orcamento@projeto.iam.gserviceaccount.com`) com permissão **Editor**

## 2. Configurar o .env.local

```bash
# Copie o arquivo de exemplo
copy .env.local.example .env.local
```

Abra `.env.local` e preencha:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=orcamento@meu-projeto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
```

> **Dica**: A `GOOGLE_PRIVATE_KEY` está no campo `"private_key"` do arquivo JSON baixado. Cole o valor entre aspas duplas e mantenha os `\n`.

## 3. Inicializar o Sistema

```bash
npm run dev
```

Acesse `http://localhost:3000` e clique em **Inicializar planilhas** no Dashboard.

Isso criará automaticamente as seguintes abas na planilha:
- `INSUMOS`
- `COMPOSICOES`
- `ITENS_COMPOSICAO`
- `ORCAMENTOS`
- `ITENS_ORCAMENTO`
- `CONFIG`

## 4. Verificar Funcionamento

1. Vá em **Insumos** → Criar novo insumo
2. Verifique que apareceu uma linha na aba `INSUMOS` do Google Sheets
3. Vá em **Composições** → Criar composição → Abrir painel de itens → Adicionar insumo
4. Vá em **Orçamentos** → Criar orçamento → Adicionar item

## 5. Deploy no Vercel (Opcional)

```bash
npm install -g vercel
vercel login
vercel
```

Adicione as variáveis de ambiente no painel do Vercel:
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_SPREADSHEET_ID`

## Estrutura das Planilhas

| Aba | Finalidade |
|-----|-----------|
| INSUMOS | Materiais, mão de obra, equipamentos e serviços |
| COMPOSICOES | Composições de serviço |
| ITENS_COMPOSICAO | Itens vinculados a cada composição |
| ORCAMENTOS | Cabeçalho dos orçamentos |
| ITENS_ORCAMENTO | Itens de cada orçamento por etapa |
| CONFIG | Configurações do sistema |
