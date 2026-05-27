import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !key) {
    throw new Error(
      'Credenciais Google Sheets não configuradas. ' +
      'Defina GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_PRIVATE_KEY no .env.local'
    );
  }
  return new google.auth.JWT({ email, key, scopes: SCOPES });
}

function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SPREADSHEET_ID;
  if (!id) throw new Error('GOOGLE_SPREADSHEET_ID não definido no .env.local');
  return id;
}

export const SHEET_HEADERS: Record<string, string[]> = {
  INSUMOS: ['id', 'codigo', 'descricao', 'unidade', 'preco', 'tipo', 'categoria', 'status'],
  COMPOSICOES: ['id', 'codigo', 'descricao', 'unidade_producao', 'producao', 'descricao_tecnica', 'status'],
  ITENS_COMPOSICAO: ['id', 'composicao_id', 'insumo_id', 'coeficiente', 'unidade'],
  ORCAMENTOS: ['id', 'titulo', 'descricao', 'data_criacao', 'status', 'bdi_percentual'],
  ITENS_ORCAMENTO: [
    'id', 'orcamento_id', 'etapa_codigo', 'composicao_id',
    'descricao_override', 'unidade_override', 'custo_unitario_override',
    'quantidade', 'quantidade_tipo',
  ],
  CONFIG: ['chave', 'valor'],
};

export async function readSheet(sheetName: string): Promise<Record<string, string>[]> {
  const sheets = google.sheets({ version: 'v4', auth: getAuth() });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: sheetName,
  });

  const rows = res.data.values || [];
  if (rows.length <= 1) return [];

  const headers = rows[0] as string[];
  return rows.slice(1).map(row => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = String(row[i] ?? ''); });
    return obj;
  });
}

export async function appendRow(sheetName: string, data: Record<string, unknown>): Promise<void> {
  const sheets = google.sheets({ version: 'v4', auth: getAuth() });
  const headers = SHEET_HEADERS[sheetName];
  const row = headers.map(h => String(data[h] ?? ''));

  await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });
}

export async function updateRowById(
  sheetName: string,
  id: string,
  data: Record<string, unknown>
): Promise<boolean> {
  const sheets = google.sheets({ version: 'v4', auth: getAuth() });
  const spreadsheetId = getSpreadsheetId();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetName,
  });

  const rows = res.data.values || [];
  const headers = rows[0] as string[];
  const rowIndex = rows.findIndex((row, i) => i > 0 && row[0] === id);
  if (rowIndex === -1) return false;

  const updated = headers.map(h => {
    if (h in data) return String(data[h] ?? '');
    return String(rows[rowIndex][headers.indexOf(h)] ?? '');
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A${rowIndex + 1}`,
    valueInputOption: 'RAW',
    requestBody: { values: [updated] },
  });

  return true;
}

export async function deleteRowById(sheetName: string, id: string): Promise<boolean> {
  const sheets = google.sheets({ version: 'v4', auth: getAuth() });
  const spreadsheetId = getSpreadsheetId();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetName,
  });

  const rows = res.data.values || [];
  const rowIndex = rows.findIndex((row, i) => i > 0 && row[0] === id);
  if (rowIndex === -1) return false;

  const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = sheetMeta.data.sheets?.find(s => s.properties?.title === sheetName);
  if (!sheet?.properties?.sheetId && sheet?.properties?.sheetId !== 0) return false;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheet.properties!.sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex,
            endIndex: rowIndex + 1,
          },
        },
      }],
    },
  });

  return true;
}

export async function initSheets(): Promise<{ criadas: string[] }> {
  const sheets = google.sheets({ version: 'v4', auth: getAuth() });
  const spreadsheetId = getSpreadsheetId();

  const res = await sheets.spreadsheets.get({ spreadsheetId });
  const existingTitles = (res.data.sheets || []).map(s => s.properties?.title || '');

  const toCreate = Object.keys(SHEET_HEADERS).filter(n => !existingTitles.includes(n));
  if (toCreate.length === 0) return { criadas: [] };

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: toCreate.map(title => ({ addSheet: { properties: { title } } })),
    },
  });

  for (const name of toCreate) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${name}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [SHEET_HEADERS[name]] },
    });
  }

  return { criadas: toCreate };
}
