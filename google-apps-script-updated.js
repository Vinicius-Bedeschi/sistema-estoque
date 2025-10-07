/**
 * Google Apps Script para Sistema de Gestão de Estoque
 * Versão atualizada com funcionalidade de funcionários
 * 
 * Este script serve como API entre o frontend e o Google Sheets
 */

// Configurações
const SPREADSHEET_ID = '108kZQfRUYt9TcYOUlXNjuToyihUxH3n8QhDLwmcyVjA'; // ID da planilha do usuário

// Nomes das abas (devem corresponder exatamente aos nomes na planilha)
const SHEET_NAMES = {
  ITENS_ESTOQUE: 'Itens em Estoque',
  ENTRADA_MATERIAL: 'Entrada de Material',
  SAIDA_MATERIAL: 'Saída de Material',
  SOLICITACAO_MATERIAIS: 'Solicitação de Materiais',
  LISTA_COMPRAS: 'Lista de Compras',
  ANALISE: 'Análise',
  USUARIOS: 'Usuários',
  FUNCIONARIOS: 'Funcionários' // Nova aba
};

/**
 * Função principal para processar requisições POST
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    console.log('Ação recebida:', action);
    console.log('Dados recebidos:', data);
    
    let result;
    
    switch (action) {
      case 'login':
        result = handleLogin(data.username, data.password);
        break;
      case 'getItensEstoque':
        result = getItensEstoque();
        break;
      case 'getEntradas':
        result = getEntradas();
        break;
      case 'getSaidas':
        result = getSaidas();
        break;
      case 'getSolicitacoes':
        result = getSolicitacoes();
        break;
      case 'getListaCompras':
        result = getListaCompras();
        break;
      case 'addItem':
        result = addItem(data.item);
        break;
      case 'addEntrada':
        result = addEntrada(data.entrada);
        break;
      case 'addSaida':
        result = addSaida(data.saida);
        break;
      case 'addSolicitacao':
        result = addSolicitacao(data.solicitacao);
        break;
      case 'updateSolicitacaoStatus':
        result = updateSolicitacaoStatus(data.id, data.status, data.atendidoPor);
        break;
      case 'getFuncionario':
        result = getFuncionario(data.matricula);
        break;
      case 'getFuncionarios':
        result = getFuncionarios();
        break;
      case 'addFuncionario':
        result = addFuncionario(data.funcionario);
        break;
      default:
        result = { success: false, error: 'Ação não reconhecida: ' + action };
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Erro no doPost:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ 
        success: false, 
        error: error.toString() 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Função para processar requisições GET (para testes)
 */
function doGet(e) {
  return ContentService
    .createTextOutput('Sistema de Estoque API - Funcionando!')
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Configurar cabeçalhos das abas (executar uma vez)
 */
function setupSheetHeaders() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Configurar aba Itens em Estoque
  setupItensEstoqueHeaders(ss);
  
  // Configurar aba Entrada de Material
  setupEntradaMaterialHeaders(ss);
  
  // Configurar aba Saída de Material (atualizada)
  setupSaidaMaterialHeaders(ss);
  
  // Configurar aba Solicitação de Materiais (atualizada)
  setupSolicitacaoMateriaisHeaders(ss);
  
  // Configurar aba Lista de Compras
  setupListaComprasHeaders(ss);
  
  // Configurar aba Usuários
  setupUsuariosHeaders(ss);
  
  // Configurar nova aba Funcionários
  setupFuncionariosHeaders(ss);
  
  console.log('Cabeçalhos configurados com sucesso!');
}

/**
 * Configurar cabeçalhos da aba Funcionários
 */
function setupFuncionariosHeaders(ss) {
  let sheet = ss.getSheetByName(SHEET_NAMES.FUNCIONARIOS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.FUNCIONARIOS);
  }
  
  const headers = [
    'Matrícula',
    'Nome Completo',
    'Setor'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  
  // Adicionar alguns funcionários de exemplo
  const exemploFuncionarios = [
    ['001', 'João Silva Santos', 'Marketing'],
    ['002', 'Maria Oliveira Costa', 'Vendas'],
    ['003', 'Pedro Souza Lima', 'Recursos Humanos'],
    ['004', 'Ana Paula Ferreira', 'Financeiro'],
    ['005', 'Carlos Eduardo Alves', 'TI']
  ];
  
  if (sheet.getLastRow() === 1) { // Se só tem cabeçalho
    sheet.getRange(2, 1, exemploFuncionarios.length, 3).setValues(exemploFuncionarios);
  }
}

/**
 * Configurar cabeçalhos da aba Saída de Material (atualizada)
 */
function setupSaidaMaterialHeaders(ss) {
  let sheet = ss.getSheetByName(SHEET_NAMES.SAIDA_MATERIAL);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.SAIDA_MATERIAL);
  }
  
  const headers = [
    'ID da Saída',
    'Data',
    'ID do Item',
    'Nome do Item',
    'Quantidade',
    'Matrícula do Solicitante', // Nova coluna
    'Nome do Solicitante',      // Nova coluna
    'Setor Solicitante',
    'Solicitação ID',
    'Registrado Por'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
}

/**
 * Configurar cabeçalhos da aba Solicitação de Materiais (atualizada)
 */
function setupSolicitacaoMateriaisHeaders(ss) {
  let sheet = ss.getSheetByName(SHEET_NAMES.SOLICITACAO_MATERIAIS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.SOLICITACAO_MATERIAIS);
  }
  
  const headers = [
    'ID da Solicitação',
    'Data da Solicitação',
    'Matrícula do Solicitante', // Nova coluna
    'Nome do Solicitante',      // Nova coluna
    'Setor Solicitante',
    'ID do Item',
    'Nome do Item',
    'Quantidade Solicitada',
    'Status',
    'Observações',
    'Atendido Por',
    'Data de Atendimento'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
}

/**
 * Configurar outras abas (mantidas iguais)
 */
function setupItensEstoqueHeaders(ss) {
  let sheet = ss.getSheetByName(SHEET_NAMES.ITENS_ESTOQUE);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.ITENS_ESTOQUE);
  }
  
  const headers = [
    'ID do Item',
    'Nome do Item',
    'Descrição',
    'Unidade',
    'Saldo Atual',
    'Estoque Mínimo',
    'Estoque Máximo',
    'Preço Unitário',
    'Localização'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
}

function setupEntradaMaterialHeaders(ss) {
  let sheet = ss.getSheetByName(SHEET_NAMES.ENTRADA_MATERIAL);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.ENTRADA_MATERIAL);
  }
  
  const headers = [
    'ID da Entrada',
    'Data',
    'ID do Item',
    'Nome do Item',
    'Quantidade',
    'Fornecedor',
    'Nota Fiscal',
    'Registrado Por'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
}

function setupListaComprasHeaders(ss) {
  let sheet = ss.getSheetByName(SHEET_NAMES.LISTA_COMPRAS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.LISTA_COMPRAS);
  }
  
  const headers = [
    'ID do Item',
    'Nome do Item',
    'Saldo Atual',
    'Estoque Mínimo',
    'Quantidade a Comprar',
    'Prioridade',
    'Status'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
}

function setupUsuariosHeaders(ss) {
  let sheet = ss.getSheetByName(SHEET_NAMES.USUARIOS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAMES.USUARIOS);
  }
  
  const headers = [
    'Username',
    'Password',
    'Perfil',
    'Setor'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  
  // Adicionar usuários padrão
  const usuariosPadrao = [
    ['admin', 'admin123', 'Estoque', ''],
    ['marketing', 'marketing123', 'Setor', 'Marketing'],
    ['vendas', 'vendas123', 'Setor', 'Vendas'],
    ['rh', 'rh123', 'Setor', 'Recursos Humanos']
  ];
  
  if (sheet.getLastRow() === 1) { // Se só tem cabeçalho
    sheet.getRange(2, 1, usuariosPadrao.length, 4).setValues(usuariosPadrao);
  }
}

/**
 * Buscar funcionário por matrícula
 */
function getFuncionario(matricula) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.FUNCIONARIOS);
    
    if (!sheet) {
      return { success: false, error: 'Aba Funcionários não encontrada' };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Encontrar índices das colunas
    const matriculaIndex = headers.indexOf('Matrícula');
    const nomeIndex = headers.indexOf('Nome Completo');
    const setorIndex = headers.indexOf('Setor');
    
    if (matriculaIndex === -1 || nomeIndex === -1 || setorIndex === -1) {
      return { success: false, error: 'Colunas não encontradas na aba Funcionários' };
    }
    
    // Buscar funcionário
    for (let i = 1; i < data.length; i++) {
      if (data[i][matriculaIndex] == matricula) {
        return {
          success: true,
          funcionario: {
            matricula: data[i][matriculaIndex],
            nome: data[i][nomeIndex],
            setor: data[i][setorIndex]
          }
        };
      }
    }
    
    return { success: false, error: 'Funcionário não encontrado' };
    
  } catch (error) {
    console.error('Erro ao buscar funcionário:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * Obter todos os funcionários
 */
function getFuncionarios() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.FUNCIONARIOS);
    
    if (!sheet) {
      return { success: false, error: 'Aba Funcionários não encontrada' };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const funcionarios = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) { // Se tem matrícula
        const funcionario = {};
        headers.forEach((header, index) => {
          funcionario[header.toLowerCase().replace(/\s+/g, '')] = data[i][index];
        });
        funcionarios.push(funcionario);
      }
    }
    
    return { success: true, funcionarios: funcionarios };
    
  } catch (error) {
    console.error('Erro ao obter funcionários:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * Adicionar novo funcionário
 */
function addFuncionario(funcionario) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.FUNCIONARIOS);
    
    if (!sheet) {
      return { success: false, error: 'Aba Funcionários não encontrada' };
    }
    
    // Verificar se matrícula já existe
    const existingFuncionario = getFuncionario(funcionario.matricula);
    if (existingFuncionario.success) {
      return { success: false, error: 'Matrícula já existe' };
    }
    
    const newRow = [
      funcionario.matricula,
      funcionario.nome,
      funcionario.setor
    ];
    
    sheet.appendRow(newRow);
    
    return { success: true, message: 'Funcionário adicionado com sucesso' };
    
  } catch (error) {
    console.error('Erro ao adicionar funcionário:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * Adicionar nova saída (atualizada para incluir dados do funcionário)
 */
function addSaida(saida) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const saidaSheet = ss.getSheetByName(SHEET_NAMES.SAIDA_MATERIAL);
    const estoqueSheet = ss.getSheetByName(SHEET_NAMES.ITENS_ESTOQUE);
    
    if (!saidaSheet || !estoqueSheet) {
      return { success: false, error: 'Abas não encontradas' };
    }
    
    // Gerar ID da saída
    const lastRow = saidaSheet.getLastRow();
    const saidaId = 'SAI' + String(lastRow).padStart(3, '0');
    
    // Buscar dados do funcionário se matrícula foi fornecida
    let nomeSolicitante = saida.nomeSolicitante || '';
    let setorSolicitante = saida.setorSolicitante || '';
    
    if (saida.matriculaSolicitante) {
      const funcionarioResult = getFuncionario(saida.matriculaSolicitante);
      if (funcionarioResult.success) {
        nomeSolicitante = funcionarioResult.funcionario.nome;
        setorSolicitante = funcionarioResult.funcionario.setor;
      }
    }
    
    const newRow = [
      saidaId,
      new Date(),
      saida.idItem,
      saida.nomeItem,
      saida.quantidade,
      saida.matriculaSolicitante || '',
      nomeSolicitante,
      setorSolicitante,
      saida.solicitacaoId || '',
      saida.registradoPor
    ];
    
    saidaSheet.appendRow(newRow);
    
    // Atualizar saldo do item
    const estoqueData = estoqueSheet.getDataRange().getValues();
    for (let i = 1; i < estoqueData.length; i++) {
      if (estoqueData[i][0] === saida.idItem) {
        const novoSaldo = estoqueData[i][4] - saida.quantidade;
        estoqueSheet.getRange(i + 1, 5).setValue(novoSaldo);
        break;
      }
    }
    
    // Atualizar lista de compras
    updateListaCompras();
    
    return { success: true, message: 'Saída registrada com sucesso', id: saidaId };
    
  } catch (error) {
    console.error('Erro ao adicionar saída:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * Adicionar nova solicitação (atualizada para incluir dados do funcionário)
 */
function addSolicitacao(solicitacao) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.SOLICITACAO_MATERIAIS);
    
    if (!sheet) {
      return { success: false, error: 'Aba Solicitação de Materiais não encontrada' };
    }
    
    // Gerar ID da solicitação
    const lastRow = sheet.getLastRow();
    const solicitacaoId = 'SOL' + String(lastRow).padStart(3, '0');
    
    // Buscar dados do funcionário se matrícula foi fornecida
    let nomeSolicitante = solicitacao.nomeSolicitante || '';
    let setorSolicitante = solicitacao.setorSolicitante || '';
    
    if (solicitacao.matriculaSolicitante) {
      const funcionarioResult = getFuncionario(solicitacao.matriculaSolicitante);
      if (funcionarioResult.success) {
        nomeSolicitante = funcionarioResult.funcionario.nome;
        setorSolicitante = funcionarioResult.funcionario.setor;
      }
    }
    
    const newRow = [
      solicitacaoId,
      new Date(),
      solicitacao.matriculaSolicitante || '',
      nomeSolicitante,
      setorSolicitante,
      solicitacao.idItem,
      solicitacao.nomeItem,
      solicitacao.quantidadeSolicitada,
      'Pendente',
      solicitacao.observacoes || '',
      '',
      ''
    ];
    
    sheet.appendRow(newRow);
    
    return { success: true, message: 'Solicitação criada com sucesso', id: solicitacaoId };
    
  } catch (error) {
    console.error('Erro ao adicionar solicitação:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * Obter saídas (atualizada para incluir novos campos)
 */
function getSaidas() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.SAIDA_MATERIAL);
    
    if (!sheet) {
      return { success: false, error: 'Aba Saída de Material não encontrada' };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const saidas = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) { // Se tem ID
        const saida = {};
        headers.forEach((header, index) => {
          const key = header.toLowerCase()
            .replace(/\s+/g, '')
            .replace('ç', 'c')
            .replace('ã', 'a');
          saida[key] = data[i][index];
        });
        saidas.push(saida);
      }
    }
    
    return { success: true, saidas: saidas };
    
  } catch (error) {
    console.error('Erro ao obter saídas:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * Obter solicitações (atualizada para incluir novos campos)
 */
function getSolicitacoes() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.SOLICITACAO_MATERIAIS);
    
    if (!sheet) {
      return { success: false, error: 'Aba Solicitação de Materiais não encontrada' };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const solicitacoes = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) { // Se tem ID
        const solicitacao = {};
        headers.forEach((header, index) => {
          const key = header.toLowerCase()
            .replace(/\s+/g, '')
            .replace('ç', 'c')
            .replace('ã', 'a');
          solicitacao[key] = data[i][index];
        });
        solicitacoes.push(solicitacao);
      }
    }
    
    return { success: true, solicitacoes: solicitacoes };
    
  } catch (error) {
    console.error('Erro ao obter solicitações:', error);
    return { success: false, error: error.toString() };
  }
}

// Manter todas as outras funções existentes (handleLogin, getItensEstoque, etc.)
function handleLogin(username, password) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.USUARIOS);
    
    if (!sheet) {
      return { success: false, error: 'Aba Usuários não encontrada' };
    }
    
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === username && data[i][1] === password) {
        return {
          success: true,
          user: {
            username: data[i][0],
            perfil: data[i][2],
            setor: data[i][3]
          }
        };
      }
    }
    
    return { success: false, error: 'Credenciais inválidas' };
    
  } catch (error) {
    console.error('Erro no login:', error);
    return { success: false, error: error.toString() };
  }
}

function getItensEstoque() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.ITENS_ESTOQUE);
    
    if (!sheet) {
      return { success: false, error: 'Aba Itens em Estoque não encontrada' };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const itens = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) { // Se tem ID
        const item = {};
        headers.forEach((header, index) => {
          const key = header.toLowerCase().replace(/\s+/g, '').replace('ç', 'c').replace('ã', 'a');
          item[key] = data[i][index];
        });
        itens.push(item);
      }
    }
    
    return { success: true, itens: itens };
    
  } catch (error) {
    console.error('Erro ao obter itens:', error);
    return { success: false, error: error.toString() };
  }
}

function getEntradas() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.ENTRADA_MATERIAL);
    
    if (!sheet) {
      return { success: false, error: 'Aba Entrada de Material não encontrada' };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const entradas = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) { // Se tem ID
        const entrada = {};
        headers.forEach((header, index) => {
          const key = header.toLowerCase().replace(/\s+/g, '').replace('ç', 'c').replace('ã', 'a');
          entrada[key] = data[i][index];
        });
        entradas.push(entrada);
      }
    }
    
    return { success: true, entradas: entradas };
    
  } catch (error) {
    console.error('Erro ao obter entradas:', error);
    return { success: false, error: error.toString() };
  }
}

function getListaCompras() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.LISTA_COMPRAS);
    
    if (!sheet) {
      return { success: false, error: 'Aba Lista de Compras não encontrada' };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const lista = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) { // Se tem ID
        const item = {};
        headers.forEach((header, index) => {
          const key = header.toLowerCase().replace(/\s+/g, '').replace('ç', 'c').replace('ã', 'a');
          item[key] = data[i][index];
        });
        lista.push(item);
      }
    }
    
    return { success: true, lista: lista };
    
  } catch (error) {
    console.error('Erro ao obter lista de compras:', error);
    return { success: false, error: error.toString() };
  }
}

function addItem(item) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.ITENS_ESTOQUE);
    
    if (!sheet) {
      return { success: false, error: 'Aba Itens em Estoque não encontrada' };
    }
    
    // Gerar ID do item
    const lastRow = sheet.getLastRow();
    const itemId = 'ITM' + String(lastRow).padStart(3, '0');
    
    const newRow = [
      itemId,
      item.nome,
      item.descricao,
      item.unidade,
      0, // Saldo inicial
      item.estoqueMinimo,
      item.estoqueMaximo,
      item.precoUnitario,
      item.localizacao
    ];
    
    sheet.appendRow(newRow);
    
    return { success: true, message: 'Item adicionado com sucesso', id: itemId };
    
  } catch (error) {
    console.error('Erro ao adicionar item:', error);
    return { success: false, error: error.toString() };
  }
}

function addEntrada(entrada) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const entradaSheet = ss.getSheetByName(SHEET_NAMES.ENTRADA_MATERIAL);
    const estoqueSheet = ss.getSheetByName(SHEET_NAMES.ITENS_ESTOQUE);
    
    if (!entradaSheet || !estoqueSheet) {
      return { success: false, error: 'Abas não encontradas' };
    }
    
    // Gerar ID da entrada
    const lastRow = entradaSheet.getLastRow();
    const entradaId = 'ENT' + String(lastRow).padStart(3, '0');
    
    const newRow = [
      entradaId,
      new Date(),
      entrada.idItem,
      entrada.nomeItem,
      entrada.quantidade,
      entrada.fornecedor,
      entrada.notaFiscal,
      entrada.registradoPor
    ];
    
    entradaSheet.appendRow(newRow);
    
    // Atualizar saldo do item
    const estoqueData = estoqueSheet.getDataRange().getValues();
    for (let i = 1; i < estoqueData.length; i++) {
      if (estoqueData[i][0] === entrada.idItem) {
        const novoSaldo = estoqueData[i][4] + entrada.quantidade;
        estoqueSheet.getRange(i + 1, 5).setValue(novoSaldo);
        break;
      }
    }
    
    // Atualizar lista de compras
    updateListaCompras();
    
    return { success: true, message: 'Entrada registrada com sucesso', id: entradaId };
    
  } catch (error) {
    console.error('Erro ao adicionar entrada:', error);
    return { success: false, error: error.toString() };
  }
}

function updateSolicitacaoStatus(id, status, atendidoPor) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.SOLICITACAO_MATERIAIS);
    
    if (!sheet) {
      return { success: false, error: 'Aba Solicitação de Materiais não encontrada' };
    }
    
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        sheet.getRange(i + 1, 9).setValue(status); // Status
        sheet.getRange(i + 1, 11).setValue(atendidoPor); // Atendido Por
        sheet.getRange(i + 1, 12).setValue(new Date()); // Data de Atendimento
        break;
      }
    }
    
    return { success: true, message: 'Status atualizado com sucesso' };
    
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    return { success: false, error: error.toString() };
  }
}

function updateListaCompras() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const estoqueSheet = ss.getSheetByName(SHEET_NAMES.ITENS_ESTOQUE);
    const listaSheet = ss.getSheetByName(SHEET_NAMES.LISTA_COMPRAS);
    
    if (!estoqueSheet || !listaSheet) {
      return { success: false, error: 'Abas não encontradas' };
    }
    
    // Limpar lista atual (exceto cabeçalho)
    const lastRow = listaSheet.getLastRow();
    if (lastRow > 1) {
      listaSheet.deleteRows(2, lastRow - 1);
    }
    
    // Obter itens em estoque
    const estoqueData = estoqueSheet.getDataRange().getValues();
    
    for (let i = 1; i < estoqueData.length; i++) {
      const saldoAtual = estoqueData[i][4];
      const estoqueMinimo = estoqueData[i][5];
      const estoqueMaximo = estoqueData[i][6];
      
      if (saldoAtual < estoqueMinimo) {
        const quantidadeComprar = estoqueMaximo - saldoAtual;
        const prioridade = saldoAtual === 0 ? 'Alta' : saldoAtual < (estoqueMinimo / 2) ? 'Média' : 'Baixa';
        
        const newRow = [
          estoqueData[i][0], // ID do Item
          estoqueData[i][1], // Nome do Item
          saldoAtual,
          estoqueMinimo,
          quantidadeComprar,
          prioridade,
          'Pendente'
        ];
        
        listaSheet.appendRow(newRow);
      }
    }
    
    return { success: true, message: 'Lista de compras atualizada' };
    
  } catch (error) {
    console.error('Erro ao atualizar lista de compras:', error);
    return { success: false, error: error.toString() };
  }
}
