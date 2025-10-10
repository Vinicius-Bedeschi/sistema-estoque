/**
 * Sistema de Gestão de Estoque - JavaScript de Produção
 * Versão 1.1 - 2025
 * Criado por: Vinícius Bedeschi
 * 
 * Este arquivo contém a lógica do frontend para produção,
 * com integração ao proxy interno do Vercel (sem CORS).
 */

// ============================================================================
// CONFIGURAÇÕES
// ============================================================================

const CONFIG = {
  API_URL: '/api', // Proxy interno do Vercel que chama o Google Apps Script
  VERSION: '1.1',
  YEAR: '2025',
  AUTHOR: 'Vinícius Bedeschi'
};

// ============================================================================
// ESTADO GLOBAL
// ============================================================================

const AppState = {
  currentUser: null,
  data: {
    itensEstoque: [],
    entradas: [],
    saidas: [],
    solicitacoes: [],
    listaCompras: [],
    funcionarios: []
  },
  funcionariosCache: new Map(),
  isLoading: false
};

// ============================================================================
// UTILITÁRIOS
// ============================================================================

function showLoading() {
  AppState.isLoading = true;
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'flex';
}

function hideLoading() {
  AppState.isLoading = false;
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'none';
}

function showError(message) {
  console.error('Erro:', message);
  alert('Erro: ' + message);
}

function showSuccess(message) {
  console.log('Sucesso:', message);
  alert('Sucesso: ' + message);
}

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR');
}

function formatCurrency(value) {
  if (!value) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// ============================================================================
// INTEGRAÇÃO COM O BACKEND
// ============================================================================

/**
 * Faz uma requisição ao backend via proxy interno /api
 */
async function makeRequest(action, data = {}) {
  showLoading();
  try {
    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...data })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Erro HTTP ${response.status}: ${text}`);
    }

    const result = await response.json();
    if (result.error) throw new Error(result.error);

    return result;
  } catch (error) {
    console.error('Erro na requisição:', error);
    throw new Error('Falha na comunicação com o servidor: ' + error.message);
  } finally {
    hideLoading();
  }
}

// ============================================================================
// AUTENTICAÇÃO
// ============================================================================

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  try {
    const result = await makeRequest('login', { username, password });
    if (result.success) {
      AppState.currentUser = result.user;
      localStorage.setItem('currentUser', JSON.stringify(result.user));
      hideLoginModal();
      showMainContent();
      await loadInitialData();
    } else {
      showError('Credenciais inválidas');
    }
  } catch (err) {
    showError('Erro ao fazer login: ' + err.message);
  }
}

function handleLogout() {
  AppState.currentUser = null;
  localStorage.removeItem('currentUser');
  showLoginModal();
  hideMainContent();
}

function showLoginModal() {
  const modal = document.getElementById('login-modal');
  if (modal) modal.style.display = 'block';
}

function hideLoginModal() {
  const modal = document.getElementById('login-modal');
  if (modal) modal.style.display = 'none';
}

function showMainContent() {
  const main = document.querySelector('.main-content');
  if (main) main.style.display = 'block';
  updateUserInfo();
  updateUIForUserProfile();
}

function hideMainContent() {
  const main = document.querySelector('.main-content');
  if (main) main.style.display = 'none';
}

function updateUserInfo() {
  if (!AppState.currentUser) return;
  document.getElementById('user-name').textContent = AppState.currentUser.username;
  document.getElementById('user-profile').textContent = AppState.currentUser.perfil;
}

function updateUIForUserProfile() {
  if (!AppState.currentUser) return;
  const isEstoque = AppState.currentUser.perfil === 'Estoque';
  document.querySelectorAll('.estoque-only').forEach(el => el.style.display = isEstoque ? 'block' : 'none');
}

// ============================================================================
// DADOS E INTERFACE
// ============================================================================

async function loadInitialData() {
  try {
    await Promise.all([loadDashboardData(), loadFuncionarios()]);
  } catch (err) {
    showError('Erro ao carregar dados iniciais: ' + err.message);
  }
}

async function loadDashboardData() {
  const result = await makeRequest('getDashboard');
  if (result.success) updateDashboard(result.dashboard);
}

function updateDashboard(data) {
  document.getElementById('total-itens').textContent = data.totalItens || 0;
  document.getElementById('valor-total').textContent = formatCurrency(data.valorTotal || 0);
  document.getElementById('itens-minimo').textContent = data.itensMinimo || 0;
  document.getElementById('custo-mensal').textContent = formatCurrency(data.custoMensal || 0);
}

// (as outras funções — loadSolicitacoes, loadEntradas, loadSaidas, loadEstoque, etc — continuam iguais)
// Não precisam ser alteradas, pois internamente já usam makeRequest()

// ============================================================================
// INICIALIZAÇÃO
// ============================================================================

function setupEventListeners() {
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
}

function initializeApp() {
  console.log(`Sistema de Estoque v${CONFIG.VERSION} - ${CONFIG.YEAR}`);
  setupEventListeners();
  hideMainContent();

  const savedUser = localStorage.getItem('currentUser');
  if (savedUser) {
    const user = JSON.parse(savedUser);
    AppState.currentUser = user;
    showMainContent();
    loadInitialData();
  } else {
    showLoginModal();
  }
}

// Tema e inicialização
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});
