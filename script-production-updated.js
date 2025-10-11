/* script-production-updated.js
   Sistema de Gestão de Estoque - Frontend (limpo e pronto para produção)
   Versão: 1.5.1 - 2025
   Autor: Vinícius Bedeschi
*/

const CONFIG = {
  SPREADSHEET_ID: '108kZQfRUYt9TcYOUlXNjuToyihUxH3n8QhDLwmcyVjA',
  VERSION: '1.5.1',
  YEAR: '2025',
  AUTHOR: 'Vinícius Bedeschi'
};

// ponto de entrada do proxy (Vercel serverless)
const API_ENDPOINT = '/api';

// estado da aplicação
const AppState = {
  currentUser: null,
  data: {
    itensEstoque: [], entradas: [], saidas: [], solicitacoes: [], funcionarios: []
  },
  funcionariosCache: new Map(),
  isLoading: false
};

// utilitários mínimos
function debounce(fn, wait) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}
function formatDate(d){ if(!d) return ''; return new Date(d).toLocaleDateString('pt-BR'); }
function formatCurrency(v){ return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0); }
function showLoading(){ AppState.isLoading = true; const el = document.getElementById('loading'); if(el) el.style.display='flex'; }
function hideLoading(){ AppState.isLoading = false; const el = document.getElementById('loading'); if(el) el.style.display='none'; }
function showError(msg){ console.error(msg); alert('Erro: ' + msg); }
function showSuccess(msg){ console.log(msg); alert(msg); }

// Faz requisição ao endpoint /api (proxy no Vercel)
async function makeRequest(action, data = {}) {
  showLoading();
  try {
    const res = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, data })
    });

    const text = await res.text();
    // tenta parsear JSON, se não JSON devolve texto
    let payload;
    try { payload = JSON.parse(text); } catch(e) { payload = text; }

    if (!res.ok) {
      const msg = (payload && payload.error) ? payload.error : `HTTP ${res.status}`;
      throw new Error(msg);
    }
    if (payload && payload.error) throw new Error(payload.error);
    return payload;
  } catch (err) {
    console.error('Erro na requisição:', err);
    if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('502') )) {
      throw new Error('Erro de conexão: verifique se o Apps Script está implantado e APPS_SCRIPT_URL configurada no Vercel. ' + err.message);
    }
    throw err;
  } finally {
    hideLoading();
  }
}

/* ------------------------
   Autenticação e UI
   ------------------------ */
async function handleLogin(e){
  e && e.preventDefault && e.preventDefault();
  const username = (document.getElementById('username') || {}).value || '';
  const password = (document.getElementById('password') || {}).value || '';
  try {
    const result = await makeRequest('login', { username, password });
    if (result && result.success) {
      AppState.currentUser = result.user;
      localStorage.setItem('currentUser', JSON.stringify(result.user));
      hideLoginModal();
      showMainContent();
      await loadInitialData();
    } else {
      showError(result.message || 'Credenciais inválidas');
    }
  } catch(err){ showError('Erro ao fazer login: ' + (err.message||err)); }
}
function handleLogout(){ AppState.currentUser=null; localStorage.removeItem('currentUser'); showLoginModal(); hideMainContent(); }
function showLoginModal(){ const m = document.getElementById('login-modal'); if(m) m.style.display='block'; }
function hideLoginModal(){ const m = document.getElementById('login-modal'); if(m) m.style.display='none'; }
function showMainContent(){ const main = document.querySelector('.main-content'); if(main) main.style.display='block'; updateUserInfo(); updateUIForUserProfile(); }
function hideMainContent(){ const main = document.querySelector('.main-content'); if(main) main.style.display='none'; }
function updateUserInfo(){ if(!AppState.currentUser) return; const u = document.getElementById('user-name'); const p = document.getElementById('user-profile'); if(u) u.textContent = AppState.currentUser.username; if(p) p.textContent = AppState.currentUser.perfil; }
function updateUIForUserProfile(){
  if(!AppState.currentUser) return;
  const isEstoque = AppState.currentUser.perfil === 'Estoque';
  document.querySelectorAll('.estoque-only').forEach(el=> el.style.display = isEstoque ? 'block' : 'none');
  const tabSolicitacoes = document.getElementById('tab-solicitacoes');
  if(tabSolicitacoes) tabSolicitacoes.innerHTML = isEstoque ? '<i class="fas fa-clipboard-list"></i> Gerenciar Solicitações' : '<i class="fas fa-clipboard-list"></i> Minhas Solicitações';
}

/* ------------------------
   Funcionários (autocomplete)
   ------------------------ */
function setupFuncionarioAutoComplete(){
  const s = document.getElementById('solicitacao-matricula');
  if(s){ s.addEventListener('blur', e=> handleMatriculaChange(e,'solicitacao')); s.addEventListener('input', debounce(e=> handleMatriculaInput(e,'solicitacao'),500)); }
  const sa = document.getElementById('saida-matricula');
  if(sa){ sa.addEventListener('blur', e=> handleMatriculaChange(e,'saida')); sa.addEventListener('input', debounce(e=> handleMatriculaInput(e,'saida'),500)); }
}
async function handleMatriculaChange(e,ctx){ const m=(e.target.value||'').trim(); if(m) await buscarFuncionario(m,ctx); }
async function handleMatriculaInput(e,ctx){ const m=(e.target.value||'').trim(); if(m && m.length>=3) await buscarFuncionario(m,ctx); }
async function buscarFuncionario(matricula, context){
  try {
    if (AppState.funcionariosCache.has(matricula)) { preencherDadosFuncionario(AppState.funcionariosCache.get(matricula), context); return; }
    showMatriculaLoading(context, true);
    const r = await makeRequest('getFuncionario', { matricula });
    if (r && r.success && r.funcionario) {
      AppState.funcionariosCache.set(matricula, r.funcionario);
      preencherDadosFuncionario(r.funcionario, context);
      showFuncionarioFeedback('Funcionário encontrado!', 'success', context);
    } else {
      clearDadosFuncionario(context); showFuncionarioFeedback('Funcionário não encontrado','warning',context);
    }
  } catch(err){
    console.error(err); clearDadosFuncionario(context); showFuncionarioFeedback('Erro ao buscar funcionário','warning',context);
  } finally { showMatriculaLoading(context,false); }
}
function preencherDadosFuncionario(f,ctx){ const n=document.getElementById(`${ctx}-nome-funcionario`); const s=document.getElementById(`${ctx}-setor-funcionario`); if(n){ n.value = f.nome || ''; n.classList.add('auto-filled'); } if(s){ s.value = f.setor || ''; s.classList.add('auto-filled'); } }
function clearDadosFuncionario(ctx){ const n=document.getElementById(`${ctx}-nome-funcionario`); const s=document.getElementById(`${ctx}-setor-funcionario`); if(n){ n.value=''; n.classList.remove('auto-filled'); } if(s){ s.value=''; s.classList.remove('auto-filled'); } }
function showMatriculaLoading(ctx,show){ const loading = document.querySelector(`#${ctx}-matricula + .matricula-loading`); if(loading) loading.style.display = show ? 'block' : 'none'; }
function showFuncionarioFeedback(msg,type,ctx){
  clearFuncionarioFeedback();
  const feedback = document.createElement('div');
  feedback.className = `funcionario-feedback ${type}`;
  feedback.textContent = msg;
  const setor = document.getElementById(`${ctx}-setor-funcionario`);
  if(setor && setor.parentNode) setor.parentNode.insertBefore(feedback, setor.nextSibling);
}
function clearFuncionarioFeedback(){ document.querySelectorAll('.funcionario-feedback').forEach(el=>el.remove()); document.querySelectorAll('.auto-filled').forEach(el=>el.classList.remove('auto-filled')); }

/* ------------------------
   Carregamento de dados (dashboard, funcionarios...)
   ------------------------ */
async function loadInitialData(){
  try { await Promise.all([ loadDashboardData(), loadFuncionarios() ]); } catch(err){ showError('Erro ao carregar dados iniciais: ' + (err.message||err)); }
}
async function loadFuncionarios(){
  try {
    const r = await makeRequest('getFuncionarios');
    if (r && r.success) { AppState.data.funcionarios = r.funcionarios || []; AppState.data.funcionarios.forEach(f=> AppState.funcionariosCache.set(f.matricula, f)); }
  } catch(err){ console.error('Erro ao carregar funcionarios:', err); }
}
async function loadDashboardData(){
  try {
    const r = await makeRequest('getDashboard');
    if (r && r.success) updateDashboard(r.dashboard || {});
  } catch(err){ console.error('Erro ao carregar dashboard:', err); }
}
function updateDashboard(d){
  const total = document.getElementById('total-itens'); const valor = document.getElementById('valor-total'); const minimo = document.getElementById('itens-minimo'); const custo = document.getElementById('custo-mensal');
  if(total) total.textContent = d.totalItens || 0;
  if(valor) valor.textContent = formatCurrency(d.valorTotal || 0);
  if(minimo) minimo.textContent = d.itensMinimo || 0;
  if(custo) custo.textContent = formatCurrency(d.custoMensal || 0);
}

/* ------------------------
   Handlers simples de formulários (exemplos)
   ------------------------ */
async function handleNovaSolicitacao(e){
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form);
  const payload = {
    matriculaSolicitante: fd.get('matricula'),
    nomeFuncionario: fd.get('nomeFuncionario'),
    setorSolicitante: fd.get('setorFuncionario'),
    idItem: fd.get('item'),
    quantidade: parseInt(fd.get('quantidade')||0,10),
    observacoes: fd.get('observacoes')
  };
  try {
    const r = await makeRequest('addSolicitacao', payload);
    if (r && r.success) { showSuccess('Solicitação criada'); closeModal('modal-nova-solicitacao'); await loadSolicitacoes(); } else showError(r.message || 'Erro ao criar solicitacao');
  } catch(err){ showError('Erro ao criar solicitacao: ' + (err.message||err)); }
}
async function handleNovaEntrada(e){
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = { idItem: fd.get('item'), quantidade: parseInt(fd.get('quantidade')||0,10), fornecedor: fd.get('fornecedor'), notaFiscal: fd.get('notaFiscal'), registradoPor: AppState.currentUser?.username || '' };
  try { const r = await makeRequest('addEntrada', payload); if(r && r.success){ showSuccess('Entrada registrada'); closeModal('modal-nova-entrada'); await Promise.all([loadEntradas(), loadDashboardData()]); } else showError(r.message||'Erro'); } catch(err){ showError(err.message||err); }
}
async function handleNovaSaida(e){
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = { solicitacaoId: fd.get('solicitacao'), matriculaSolicitante: fd.get('matricula'), nomeFuncionario: fd.get('nomeFuncionario'), setorSolicitante: fd.get('setorFuncionario'), registradoPor: AppState.currentUser?.username || '' };
  try { const r = await makeRequest('addSaida', payload); if(r && r.success){ showSuccess('Saída registrada'); closeModal('modal-nova-saida'); await Promise.all([loadSaidas(), loadSolicitacoes(), loadDashboardData()]); } else showError(r.message||'Erro'); } catch(err){ showError(err.message||err); }
}

/* ------------------------
   Modal / UI helpers e eventos
   ------------------------ */
function openModal(id){ const m = document.getElementById(id); if(m){ m.style.display='block'; if(id === 'modal-nova-solicitacao' || id === 'modal-nova-entrada') loadItensForSelect(); if(id === 'modal-nova-saida') loadSolicitacoesAprovadas(); } }
function closeModal(id){ const m = document.getElementById(id); if(m){ m.style.display='none'; const f = m.querySelector('form'); if(f) f.reset(); clearFuncionarioFeedback(); } }

async function loadSolicitacoes(){ try { const r = await makeRequest('getSolicitacoes'); if(r && r.success){ AppState.data.solicitacoes = r.solicitacoes || []; renderSolicitacoesTable(); } } catch(e){ console.error(e); } }
function renderSolicitacoesTable(){ const tbody = document.querySelector('#solicitacoes-table tbody'); if(!tbody) return; tbody.innerHTML=''; AppState.data.solicitacoes.forEach(s=>{ const tr = document.createElement('tr'); tr.innerHTML = `<td>${s.id}</td><td>${formatDate(s.data)}</td><td>${s.nomeFuncionario||s.setor}</td><td>${s.nomeItem}</td><td>${s.quantidade}</td><td><span class="status-badge">${s.status}</span></td>`; tbody.appendChild(tr); }); }

async function loadEntradas(){ try { const r = await makeRequest('getEntradas'); if(r && r.success){ AppState.data.entradas = r.entradas || []; renderEntradasTable(); } } catch(e){ console.error(e); } }
function renderEntradasTable(){ const tbody = document.querySelector('#entradas-table tbody'); if(!tbody) return; tbody.innerHTML=''; AppState.data.entradas.forEach(en=>{ const tr = document.createElement('tr'); tr.innerHTML = `<td>${en.id}</td><td>${formatDate(en.data)}</td><td>${en.nomeItem}</td><td>${en.quantidade}</td><td>${en.fornecedor}</td><td>${en.notaFiscal||''}</td><td>${en.registradoPor||''}</td>`; tbody.appendChild(tr); }); }

async function loadSaidas(){ try { const r = await makeRequest('getSaidas'); if(r && r.success){ AppState.data.saidas = r.saidas || []; renderSaidasTable(); } } catch(e){ console.error(e); } }
function renderSaidasTable(){ const tbody = document.querySelector('#saidas-table tbody'); if(!tbody) return; tbody.innerHTML=''; AppState.data.saidas.forEach(s=>{ const tr = document.createElement('tr'); tr.innerHTML = `<td>${s.id}</td><td>${formatDate(s.data)}</td><td>${s.nomeItem}</td><td>${s.quantidade}</td><td>${s.nomeFuncionario||'N/A'}</td><td>${s.setorSolicitante||''}</td><td>${s.solicitacaoId||'N/A'}</td><td>${s.registradoPor||''}</td>`; tbody.appendChild(tr); }); }

async function loadEstoque(){ try { const r = await makeRequest('getEstoque'); if(r && r.success){ AppState.data.itensEstoque = r.itens || []; renderEstoqueTable(); } } catch(e){ console.error(e); } }
function renderEstoqueTable(){ const tbody = document.querySelector('#estoque-table tbody'); if(!tbody) return; tbody.innerHTML=''; AppState.data.itensEstoque.forEach(item=>{ const tr = document.createElement('tr'); tr.innerHTML = `<td>${item.id}</td><td>${item.nome}</td><td>${item.descricao||''}</td><td>${item.unidade||''}</td><td>${item.saldoAtual||0}</td><td>${item.estoqueMinimo||0}</td><td>${item.estoqueMaximo||0}</td><td>${formatCurrency(item.precoUnitario||0)}</td><td>${item.localizacao||''}</td>`; tbody.appendChild(tr); }); }

async function loadItensForSelect(){ if(AppState.data.itensEstoque.length===0) await loadEstoque(); ['solicitacao-item','entrada-item'].forEach(id=>{ const sel = document.getElementById(id); if(sel){ sel.innerHTML = '<option value="">Selecione um item</option>'; AppState.data.itensEstoque.forEach(it=>{ const o = document.createElement('option'); o.value = it.id; o.textContent = `${it.nome} (${it.saldoAtual} ${it.unidade||''})`; sel.appendChild(o); }); } }); }

async function loadSolicitacoesAprovadas(){ try { const r = await makeRequest('getSolicitacoesAprovadas'); if(r && r.success){ const sel = document.getElementById('saida-solicitacao'); if(sel){ sel.innerHTML = '<option value="">Selecione uma solicitação</option>'; r.solicitacoes.forEach(s=>{ const o = document.createElement('option'); o.value = s.id; o.textContent = `${s.id} - ${s.nomeItem} (${s.quantidade})`; o.dataset.item = s.nomeItem; o.dataset.quantidade = s.quantidade; o.dataset.matricula = s.matriculaSolicitante||''; o.dataset.nome = s.nomeFuncionario||''; o.dataset.setor = s.setorSolicitante||''; sel.appendChild(o); }); sel.addEventListener('change', e=>{ const opt = e.target.selectedOptions[0]; if(opt && opt.value){ document.getElementById('saida-item').value = opt.dataset.item || ''; document.getElementById('saida-quantidade').value = opt.dataset.quantidade || ''; document.getElementById('saida-matricula').value = opt.dataset.matricula || ''; document.getElementById('saida-nome-funcionario').value = opt.dataset.nome || ''; document.getElementById('saida-setor-funcionario').value = opt.dataset.setor || ''; } }); } } } catch(err){ console.error(err); } }

/* ------------------------
   Eventos e inicialização
   ------------------------ */
function setupEventListeners(){
  const loginForm = document.getElementById('login-form'); if(loginForm) loginForm.addEventListener('submit', handleLogin);
  const logoutBtn = document.getElementById('logout-btn'); if(logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', e => { const tabId = e.currentTarget.dataset.tab; if(tabId) switchTab(tabId); }));
  document.querySelectorAll('.close-btn').forEach(btn => btn.addEventListener('click', e => { const id = e.currentTarget.dataset.modal; if(id) closeModal(id); }));

  const novaSolic = document.getElementById('nova-solicitacao-btn'); if(novaSolic) novaSolic.addEventListener('click', ()=> openModal('modal-nova-solicitacao'));
  const novaEntrada = document.getElementById('nova-entrada-btn'); if(novaEntrada) novaEntrada.addEventListener('click', ()=> openModal('modal-nova-entrada'));
  const novaSaida = document.getElementById('nova-saida-btn'); if(novaSaida) novaSaida.addEventListener('click', ()=> openModal('modal-nova-saida'));
  const novoItem = document.getElementById('novo-item-btn'); if(novoItem) novoItem.addEventListener('click', ()=> openModal('modal-novo-item'));

  const formNovaSol = document.getElementById('form-nova-solicitacao'); if(formNovaSol) formNovaSol.addEventListener('submit', handleNovaSolicitacao);
  const formNovaEnt = document.getElementById('form-nova-entrada'); if(formNovaEnt) formNovaEnt.addEventListener('submit', handleNovaEntrada);
  const formNovaSai = document.getElementById('form-nova-saida'); if(formNovaSai) formNovaSai.addEventListener('submit', handleNovaSaida);
  const formNovoItem = document.getElementById('form-novo-item'); if(formNovoItem) formNovoItem.addEventListener('submit', handleNovoItem);

  setupFuncionarioAutoComplete();

  window.addEventListener('click', (e) => {
    if (e.target.classList && e.target.classList.contains('modal') && !String(e.target.id || '').includes('login')) e.target.style.display = 'none';
  });

  // Prevenir acessos sem login
  document.addEventListener('click', (e) => {
    if (!AppState.currentUser && !e.target.closest('#login-modal') && !e.target.closest('#login-form')) {
      const interactiveSelectors = ['button', 'a', 'input[type="submit"]', '.tab-btn', '.btn'];
      if (interactiveSelectors.some(sel => e.target.matches(sel) || e.target.closest(sel))) {
        e.preventDefault(); e.stopPropagation();
        showLoginModal(); showError('Você precisa fazer login para acessar esta funcionalidade.');
        return false;
      }
    }
  });
}

function initializeApp(){
  console.log(`Sistema de Estoque v${CONFIG.VERSION} - ${CONFIG.YEAR}`);
  setupEventListeners();
  hideMainContent();
  const savedUser = localStorage.getItem('currentUser');
  if (savedUser) {
    try { const u = JSON.parse(savedUser); if(u && u.username){ AppState.currentUser = u; showMainContent(); loadInitialData(); } else { localStorage.removeItem('currentUser'); showLoginModal(); } } catch(e){ console.error(e); localStorage.removeItem('currentUser'); showLoginModal(); }
  } else showLoginModal();
}

document.addEventListener('DOMContentLoaded', () => { initializeApp(); });

// manter funções usadas globalmente por botões inline (se tiver)
window.aprovarSolicitacao = async function(id){ if(!confirm('Deseja aprovar esta solicitação?')) return; try { const r = await makeRequest('aprovarSolicitacao',{ solicitacaoId: id }); if(r && r.success) { showSuccess('Solicitação aprovada'); await loadSolicitacoes(); } } catch(e){ showError(e.message||e); } };
window.rejeitarSolicitacao = async function(id){ if(!confirm('Deseja rejeitar esta solicitação?')) return; try { const r = await makeRequest('rejeitarSolicitacao',{ solicitacaoId: id }); if(r && r.success) { showSuccess('Solicitação rejeitada'); await loadSolicitacoes(); } } catch(e){ showError(e.message||e); } };
