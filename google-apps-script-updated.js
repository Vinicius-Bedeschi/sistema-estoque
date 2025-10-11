// === Google Apps Script Corrigido ===

// Normaliza cabeçalhos: remove acentos e espaços
function normalizeHeader(header) {
  return header
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    let result;

    switch (action) {
      case 'addSolicitacao':
        result = addSolicitacao(data);
        break;
      case 'getSolicitacoes':
        result = getSolicitacoes();
        break;
      case 'addSaida':
        result = addSaida(data);
        break;
      case 'getSaidas':
        result = getSaidas();
        break;
      case 'getItensEstoque':
        result = getItensEstoque();
        break;
      case 'getFuncionarios':
        result = getFuncionarios();
        break;
      case 'getFuncionario':
        result = getFuncionario(data);
        break;
      case 'getSolicitacoesAprovadas':
        result = getSolicitacoesAprovadas();
        break;
      default:
        result = { success: false, error: 'Ação desconhecida: ' + action };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSolicitacoesAprovadas() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.SOLICITACAO_MATERIAIS);
    if (!sheet) return { success: false, error: 'Aba Solicitação de Materiais não encontrada' };

    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => normalizeHeader(h));

    const idx = {};
    headers.forEach((h, i) => idx[h] = i);

    const solicitacoes = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const status = (row[idx['status']] || '').toString().toLowerCase();

      if (status === 'aprovada') {
        solicitacoes.push({
          id: row[idx['id']] || row[0],
          nomeItem: row[idx['nomeitem']] || '',
          quantidade: row[idx['quantidadesolicitada']] || '',
          matriculaSolicitante: row[idx['matriculasolicitante']] || '',
          nomeFuncionario: row[idx['nomesolicitante']] || '',
          setorSolicitante: row[idx['setorsolicitante']] || ''
        });
      }
    }

    return { success: true, solicitacoes };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function getFuncionarios() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.FUNCIONARIOS);
    if (!sheet) return { success: false, error: 'Aba de Funcionários não encontrada' };

    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => normalizeHeader(h));

    const idx = {};
    headers.forEach((h, i) => idx[h] = i);

    const funcionarios = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      funcionarios.push({
        matricula: row[idx['matricula']] || '',
        nome: row[idx['nome']] || '',
        setor: row[idx['setor']] || ''
      });
    }

    return { success: true, funcionarios };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function getSolicitacoes() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.SOLICITACAO_MATERIAIS);
    if (!sheet) return { success: false, error: 'Aba Solicitação de Materiais não encontrada' };

    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => normalizeHeader(h));

    const idx = {};
    headers.forEach((h, i) => idx[h] = i);

    const solicitacoes = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      solicitacoes.push({
        id: row[idx['id']] || row[0],
        nomeItem: row[idx['nomeitem']] || '',
        quantidade: row[idx['quantidadesolicitada']] || '',
        status: row[idx['status']] || '',
        matriculaSolicitante: row[idx['matriculasolicitante']] || '',
        nomeFuncionario: row[idx['nomesolicitante']] || '',
        setorSolicitante: row[idx['setorsolicitante']] || ''
      });
    }

    return { success: true, solicitacoes };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
