/* script-production-updated-clean.js
   Versão 1.7.7
   Frontend -> comunica com /api (Vercel proxy) que encaminha para Apps Script.
*/

const CONFIG = {
  API_PROXY: '/api', // relative endpoint implemented on Vercel (api/index.js)
  VERSION: '1.7.7',
  YEAR: '2025',
  AUTHOR: 'Vinícius Bedeschi'
};

const AppState = {
  currentUser: null,
  data: { itensEstoque: [], entradas: [], saidas: [], solicitacoes: [], funcionarios: [] },
  funcionariosCache: new Map(),
  isLoading: false
};

function debounce(fn, wait){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); }; }
function formatDate(d){ if(!d) return ''; const x=new Date(d); return x.toLocaleDateString('pt-BR'); }
function formatCurrency(v){ if(v===0) return 'R$ 0,00'; if(!v) return 'R$ 0,00'; return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v); }
function showLoading(){ AppState.isLoading=true; const e=document.getElementById('loading'); if(e) e.style.display='flex'; }
function hideLoading(){ AppState.isLoading=false; const e=document.getElementById('loading'); if(e) e.style.display='none'; }
function showError(msg){ console.error('Erro:',msg); alert('Erro: '+msg); }
function showSuccess(msg){ console.log('Sucesso:',msg); alert('Sucesso: '+msg); }

// Proxy request to /api
async function makeRequest(action, data={}) {
  try {
    showLoading();
    const res = await fetch(CONFIG.API_PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, data })
    });

    const text = await res.text();
    let parsed;
    try { parsed = text ? JSON.parse(text) : {}; } catch(e){
      throw new Error('Resposta inesperada do servidor (não JSON). Conteúdo: ' + text.slice(0,200));
    }

    if (!res.ok) {
      throw new Error(parsed.error || `Erro HTTP: ${res.status}`);
    }
    if (parsed.error) throw new Error(parsed.error);
    return parsed;
  } catch (err) {
    console.error('Erro na requisição:', err);
    if (err.message.includes('Falha ao conectar') || err.message.includes('502')) {
      throw new Error('Erro de conexão: verifique APPS_SCRIPT_URL nas Environment Variables do Vercel. ' + err.message);
    }
    throw err;
  } finally {
    hideLoading();
  }
}

/* --- AQUI: mantenha o restante da sua lógica (login, loadDashboardData, loadFuncionarios, handlers, renderers, etc)
   Ex.: handleLogin chama makeRequest('login', {username,password}) e processa result.success.
   Certifique-se de:
    - Não usar proxies públicos
    - Usar makeRequest(action, data)
    - Tratar respostas não-JSON com mensagem clara
*/

async function handleLogin(e){
  e && e.preventDefault && e.preventDefault();
  const username = document.getElementById('username')?.value || '';
  const password = document.getElementById('password')?.value || '';
  try {
    const result = await makeRequest('login', { username, password });
    if (result.success) {
      AppState.currentUser = result.user;
      localStorage.setItem('currentUser', JSON.stringify(result.user));
      // ... atualizar UI
    } else {
      showError('Credenciais inválidas');
    }
  } catch (err) {
    showError(err.message || 'Erro ao fazer login');
  }
}

// (Reimplemente as outras funções do seu script aqui seguindo o mesmo padrão)
document.addEventListener('DOMContentLoaded', () => {
  console.log(`Sistema de Estoque v${CONFIG.VERSION} - ${CONFIG.YEAR}`);
  // configurar listeners -> ex: document.getElementById('login-form').addEventListener('submit', handleLogin);
});
