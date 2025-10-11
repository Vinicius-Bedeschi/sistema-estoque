/**
 * Sistema de Gestão de Estoque - JavaScript de Produção
 * Versão 1.8.0 - 2025
 * Criado por: Vinícius Bedeschi
 * 
 * Este arquivo contém toda a lógica do frontend para produção,
 * incluindo integração com Google Apps Script e preenchimento automático de funcionários.
 */

// ============================================================================
// CONFIGURAÇÕES
// ============================================================================

/**
 * Configurações da aplicação - SUBSTITUA PELOS VALORES REAIS
 * @constant {string} SCRIPT_URL - URL do Google Apps Script implantado
 * @constant {string} SPREADSHEET_ID - ID da planilha Google Sheets
 */
const CONFIG = {
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbz7ac8uTSFJYr41xd0WCwVUeGqPsJ2eq_YGsbLTv5VQj_LjmOYdvfcJiq-hHXRH1eoCEA/exec', // URL do Google Apps Script
    SPREADSHEET_ID: '108kZQfRUYt9TcYOUlXNjuToyihUxH3n8QhDLwmcyVjA', // ID da planilha do usuário
    VERSION: '1.8.0',
    YEAR: '2025',
    AUTHOR: 'Vinícius Bedeschi'
};

// ============================================================================
// ESTADO GLOBAL DA APLICAÇÃO
// ============================================================================

/**
 * Estado global da aplicação
 * @type {Object}
 */
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
    funcionariosCache: new Map(), // Cache para melhor performance
    isLoading: false
};

// ============================================================================
// UTILITÁRIOS
// ============================================================================

/**
 * Função debounce para otimizar chamadas de API
 * @param {Function} func - Função a ser executada
 * @param {number} wait - Tempo de espera em ms
 * @returns {Function} Função com debounce aplicado
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Formatar data para exibição
 * @param {string|Date} date - Data a ser formatada
 * @returns {string} Data formatada
 */
function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR');
}

/**
 * Formatar valor monetário
 * @param {number} value - Valor a ser formatado
 * @returns {string} Valor formatado em R$
 */
function formatCurrency(value) {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

/**
 * Mostrar loading
 */
function showLoading() {
    AppState.isLoading = true;
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'flex';
}

/**
 * Esconder loading
 */
function hideLoading() {
    AppState.isLoading = false;
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
}

/**
 * Mostrar mensagem de erro
 * @param {string} message - Mensagem de erro
 */
function showError(message) {
    console.error('Erro:', message);
    alert('Erro: ' + message);
}

/**
 * Mostrar mensagem de sucesso
 * @param {string} message - Mensagem de sucesso
 */
function showSuccess(message) {
    console.log('Sucesso:', message);
    alert('Sucesso: ' + message);
}

// ============================================================================
// INTEGRAÇÃO COM GOOGLE APPS SCRIPT
// ============================================================================

/**
 * Fazer requisição para o Google Apps Script
 * @param {string} action - Ação a ser executada
 * @param {Object} data - Dados a serem enviados
 * @returns {Promise<Object>} Resposta da API
 */
async function makeRequest(action, data = {}) {
    try {
        showLoading();
        
        const response = await fetch(CONFIG.SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: action,
                data: data
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }

        return result;
    } catch (error) {
        console.error('Erro na requisição:', error);
        throw error;
    } finally {
        hideLoading();
    }
}

// ============================================================================
// AUTENTICAÇÃO
// ============================================================================

/**
 * Fazer login do usuário
 * @param {Event} e - Evento do formulário
 */
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
    } catch (error) {
        showError('Erro ao fazer login: ' + error.message);
    }
}

/**
 * Fazer logout do usuário
 */
function handleLogout() {
    AppState.currentUser = null;
    localStorage.removeItem('currentUser');
    showLoginModal();
    hideMainContent();
}

/**
 * Mostrar modal de login
 */
function showLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) modal.style.display = 'block';
}

/**
 * Esconder modal de login
 */
function hideLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) modal.style.display = 'none';
}

/**
 * Mostrar conteúdo principal
 */
function showMainContent() {
    const main = document.querySelector('.main-content');
    if (main) main.style.display = 'block';
    
    updateUserInfo();
    updateUIForUserProfile();
}

/**
 * Esconder conteúdo principal
 */
function hideMainContent() {
    const main = document.querySelector('.main-content');
    if (main) main.style.display = 'none';
}

/**
 * Atualizar informações do usuário na interface
 */
function updateUserInfo() {
    if (!AppState.currentUser) return;
    
    const userName = document.getElementById('user-name');
    const userProfile = document.getElementById('user-profile');
    
    if (userName) userName.textContent = AppState.currentUser.username;
    if (userProfile) userProfile.textContent = AppState.currentUser.perfil;
}

/**
 * Atualizar interface baseada no perfil do usuário
 */
function updateUIForUserProfile() {
    if (!AppState.currentUser) return;
    
    const isEstoque = AppState.currentUser.perfil === 'Estoque';
    
    // Mostrar/esconder elementos específicos do estoque
    document.querySelectorAll('.estoque-only').forEach(element => {
        element.style.display = isEstoque ? 'block' : 'none';
    });
    
    // Atualizar texto do botão de solicitações
    const tabSolicitacoes = document.getElementById('tab-solicitacoes');
    if (tabSolicitacoes) {
        tabSolicitacoes.innerHTML = isEstoque 
            ? '<i class="fas fa-clipboard-list"></i> Gerenciar Solicitações'
            : '<i class="fas fa-clipboard-list"></i> Minhas Solicitações';
    }
}

// ============================================================================
// NAVEGAÇÃO E INTERFACE
// ============================================================================

/**
 * Trocar aba ativa
 * @param {string} tabId - ID da aba a ser ativada
 */
function switchTab(tabId) {
    // Remover classe active de todas as abas
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    
    // Ativar aba selecionada
    const tabBtn = document.querySelector(`[data-tab="${tabId}"]`);
    const tabPane = document.getElementById(tabId);
    
    if (tabBtn) tabBtn.classList.add('active');
    if (tabPane) tabPane.classList.add('active');
    
    // Carregar dados específicos da aba
    loadTabData(tabId);
}

/**
 * Carregar dados específicos da aba
 * @param {string} tabId - ID da aba
 */
async function loadTabData(tabId) {
    switch (tabId) {
        case 'dashboard':
            await loadDashboardData();
            break;
        case 'solicitacoes':
            await loadSolicitacoes();
            break;
        case 'entradas':
            await loadEntradas();
            break;
        case 'saidas':
            await loadSaidas();
            break;
        case 'estoque':
            await loadEstoque();
            break;
        case 'relatorios':
            // Relatórios são carregados sob demanda
            break;
    }
}

/**
 * Abrir modal
 * @param {string} modalId - ID do modal
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        
        // Carregar dados necessários para o modal
        if (modalId === 'modal-nova-solicitacao' || modalId === 'modal-nova-entrada') {
            loadItensForSelect();
        }
        if (modalId === 'modal-nova-saida') {
            loadSolicitacoesAprovadas();
        }
    }
}

/**
 * Fechar modal
 * @param {string} modalId - ID do modal
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        
        // Limpar formulário
        const form = modal.querySelector('form');
        if (form) form.reset();
        
        // Limpar feedbacks de funcionário
        clearFuncionarioFeedback();
    }
}

// ============================================================================
// FUNCIONALIDADE DE FUNCIONÁRIOS
// ============================================================================

/**
 * Configurar preenchimento automático de funcionários
 */
function setupFuncionarioAutoComplete() {
    // Campo de matrícula na solicitação
    const matriculaSolicitacao = document.getElementById('solicitacao-matricula');
    if (matriculaSolicitacao) {
        matriculaSolicitacao.addEventListener('blur', (e) => handleMatriculaChange(e, 'solicitacao'));
        matriculaSolicitacao.addEventListener('input', debounce((e) => handleMatriculaInput(e, 'solicitacao'), 500));
    }
    
    // Campo de matrícula na saída
    const matriculaSaida = document.getElementById('saida-matricula');
    if (matriculaSaida) {
        matriculaSaida.addEventListener('blur', (e) => handleMatriculaChange(e, 'saida'));
        matriculaSaida.addEventListener('input', debounce((e) => handleMatriculaInput(e, 'saida'), 500));
    }
}

/**
 * Lidar com mudança no campo de matrícula
 * @param {Event} e - Evento
 * @param {string} context - Contexto (solicitacao ou saida)
 */
async function handleMatriculaChange(e, context) {
    const matricula = e.target.value.trim();
    if (matricula) {
        await buscarFuncionario(matricula, context);
    }
}

/**
 * Lidar com input no campo de matrícula (com debounce)
 * @param {Event} e - Evento
 * @param {string} context - Contexto (solicitacao ou saida)
 */
async function handleMatriculaInput(e, context) {
    const matricula = e.target.value.trim();
    if (matricula && matricula.length >= 3) {
        await buscarFuncionario(matricula, context);
    }
}

/**
 * Buscar funcionário por matrícula
 * @param {string} matricula - Matrícula do funcionário
 * @param {string} context - Contexto (solicitacao ou saida)
 */
async function buscarFuncionario(matricula, context) {
    try {
        // Verificar cache primeiro
        if (AppState.funcionariosCache.has(matricula)) {
            const funcionario = AppState.funcionariosCache.get(matricula);
            preencherDadosFuncionario(funcionario, context);
            return;
        }
        
        // Mostrar loading
        showMatriculaLoading(context, true);
        
        // Buscar no servidor
        const result = await makeRequest('getFuncionario', { matricula });
        
        if (result.success && result.funcionario) {
            // Adicionar ao cache
            AppState.funcionariosCache.set(matricula, result.funcionario);
            
            // Preencher campos
            preencherDadosFuncionario(result.funcionario, context);
            showFuncionarioFeedback('Funcionário encontrado!', 'success', context);
        } else {
            clearDadosFuncionario(context);
            showFuncionarioFeedback('Funcionário não encontrado', 'warning', context);
        }
    } catch (error) {
        console.error('Erro ao buscar funcionário:', error);
        clearDadosFuncionario(context);
        showFuncionarioFeedback('Erro ao buscar funcionário', 'warning', context);
    } finally {
        showMatriculaLoading(context, false);
    }
}

/**
 * Preencher dados do funcionário nos campos
 * @param {Object} funcionario - Dados do funcionário
 * @param {string} context - Contexto (solicitacao ou saida)
 */
function preencherDadosFuncionario(funcionario, context) {
    const nomeField = document.getElementById(`${context}-nome-funcionario`);
    const setorField = document.getElementById(`${context}-setor-funcionario`);
    
    if (nomeField) {
        nomeField.value = funcionario.nome;
        nomeField.classList.add('auto-filled');
    }
    
    if (setorField) {
        setorField.value = funcionario.setor;
        setorField.classList.add('auto-filled');
    }
}

/**
 * Limpar dados do funcionário
 * @param {string} context - Contexto (solicitacao ou saida)
 */
function clearDadosFuncionario(context) {
    const nomeField = document.getElementById(`${context}-nome-funcionario`);
    const setorField = document.getElementById(`${context}-setor-funcionario`);
    
    if (nomeField) {
        nomeField.value = '';
        nomeField.classList.remove('auto-filled');
    }
    
    if (setorField) {
        setorField.value = '';
        setorField.classList.remove('auto-filled');
    }
}

/**
 * Mostrar/esconder loading da matrícula
 * @param {string} context - Contexto (solicitacao ou saida)
 * @param {boolean} show - Mostrar ou esconder
 */
function showMatriculaLoading(context, show) {
    const loading = document.querySelector(`#${context}-matricula + .matricula-loading`);
    if (loading) {
        loading.style.display = show ? 'block' : 'none';
    }
}

/**
 * Mostrar feedback do funcionário
 * @param {string} message - Mensagem
 * @param {string} type - Tipo (success, warning, error)
 * @param {string} context - Contexto (solicitacao ou saida)
 */
function showFuncionarioFeedback(message, type, context) {
    // Remover feedback anterior
    clearFuncionarioFeedback();
    
    // Criar novo feedback
    const feedback = document.createElement('div');
    feedback.className = `funcionario-feedback ${type}`;
    feedback.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : 'exclamation-triangle'}"></i> ${message}`;
    
    // Inserir após o campo de setor
    const setorField = document.getElementById(`${context}-setor-funcionario`);
    if (setorField && setorField.parentNode) {
        setorField.parentNode.insertBefore(feedback, setorField.nextSibling);
    }
}

/**
 * Limpar feedback do funcionário
 */
function clearFuncionarioFeedback() {
    document.querySelectorAll('.funcionario-feedback').forEach(el => el.remove());
    document.querySelectorAll('.auto-filled').forEach(el => el.classList.remove('auto-filled'));
}

// ============================================================================
// CARREGAMENTO DE DADOS
// ============================================================================

/**
 * Carregar dados iniciais da aplicação
 */
async function loadInitialData() {
    try {
        await Promise.all([
            loadDashboardData(),
            loadFuncionarios()
        ]);
    } catch (error) {
        showError('Erro ao carregar dados iniciais: ' + error.message);
    }
}

/**
 * Carregar funcionários
 */
async function loadFuncionarios() {
    try {
        const result = await makeRequest('getFuncionarios');
        if (result.success) {
            AppState.data.funcionarios = result.funcionarios || [];
            
            // Pré-carregar cache com funcionários mais comuns
            AppState.data.funcionarios.forEach(funcionario => {
                AppState.funcionariosCache.set(funcionario.matricula, funcionario);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar funcionários:', error);
    }
}

/**
 * Carregar dados do dashboard
 */
async function loadDashboardData() {
    try {
        const result = await makeRequest('getDashboard');
        if (result.success) {
            updateDashboard(result.dashboard);
        }
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
    }
}

/**
 * Atualizar dashboard
 * @param {Object} dashboard - Dados do dashboard
 */
function updateDashboard(dashboard) {
    document.getElementById('total-itens').textContent = dashboard.totalItens || 0;
    document.getElementById('valor-total').textContent = formatCurrency(dashboard.valorTotal || 0);
    document.getElementById('itens-minimo').textContent = dashboard.itensMinimo || 0;
    document.getElementById('custo-mensal').textContent = formatCurrency(dashboard.custoMensal || 0);
}

/**
 * Carregar solicitações
 */
async function loadSolicitacoes() {
    try {
        const result = await makeRequest('getSolicitacoes');
        if (result.success) {
            AppState.data.solicitacoes = result.solicitacoes || [];
            renderSolicitacoesTable();
        }
    } catch (error) {
        console.error('Erro ao carregar solicitações:', error);
    }
}

/**
 * Renderizar tabela de solicitações
 */
function renderSolicitacoesTable() {
    const tbody = document.querySelector('#solicitacoes-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    AppState.data.solicitacoes.forEach(solicitacao => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${solicitacao.id}</td>
            <td>${formatDate(solicitacao.data)}</td>
            <td>${solicitacao.nomeFuncionario || solicitacao.setor}</td>
            <td>${solicitacao.nomeItem}</td>
            <td>${solicitacao.quantidade}</td>
            <td><span class="status-badge status-${solicitacao.status.toLowerCase()}">${solicitacao.status}</span></td>
            ${AppState.currentUser.perfil === 'Estoque' ? `
                <td>
                    ${solicitacao.status === 'Pendente' ? `
                        <button class="btn btn-success btn-sm" onclick="aprovarSolicitacao('${solicitacao.id}')">
                            <i class="fas fa-check"></i> Aprovar
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="rejeitarSolicitacao('${solicitacao.id}')">
                            <i class="fas fa-times"></i> Rejeitar
                        </button>
                    ` : ''}
                </td>
            ` : ''}
        `;
        tbody.appendChild(row);
    });
}

/**
 * Carregar entradas
 */
async function loadEntradas() {
    try {
        const result = await makeRequest('getEntradas');
        if (result.success) {
            AppState.data.entradas = result.entradas || [];
            renderEntradasTable();
        }
    } catch (error) {
        console.error('Erro ao carregar entradas:', error);
    }
}

/**
 * Renderizar tabela de entradas
 */
function renderEntradasTable() {
    const tbody = document.querySelector('#entradas-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    AppState.data.entradas.forEach(entrada => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${entrada.id}</td>
            <td>${formatDate(entrada.data)}</td>
            <td>${entrada.nomeItem}</td>
            <td>${entrada.quantidade}</td>
            <td>${entrada.fornecedor}</td>
            <td>${entrada.notaFiscal || ''}</td>
            <td>${entrada.registradoPor}</td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Carregar saídas
 */
async function loadSaidas() {
    try {
        const result = await makeRequest('getSaidas');
        if (result.success) {
            AppState.data.saidas = result.saidas || [];
            renderSaidasTable();
        }
    } catch (error) {
        console.error('Erro ao carregar saídas:', error);
    }
}

/**
 * Renderizar tabela de saídas
 */
function renderSaidasTable() {
    const tbody = document.querySelector('#saidas-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    AppState.data.saidas.forEach(saida => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${saida.id}</td>
            <td>${formatDate(saida.data)}</td>
            <td>${saida.nomeItem}</td>
            <td>${saida.quantidade}</td>
            <td>${saida.nomeFuncionario || 'N/A'}</td>
            <td>${saida.setorSolicitante}</td>
            <td>${saida.solicitacaoId || 'N/A'}</td>
            <td>${saida.registradoPor}</td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Carregar estoque
 */
async function loadEstoque() {
    try {
        const result = await makeRequest('getEstoque');
        if (result.success) {
            AppState.data.itensEstoque = result.itens || [];
            renderEstoqueTable();
        }
    } catch (error) {
        console.error('Erro ao carregar estoque:', error);
    }
}

/**
 * Renderizar tabela de estoque
 */
function renderEstoqueTable() {
    const tbody = document.querySelector('#estoque-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    AppState.data.itensEstoque.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.id}</td>
            <td>${item.nome}</td>
            <td>${item.descricao || ''}</td>
            <td>${item.unidade}</td>
            <td>${item.saldoAtual}</td>
            <td>${item.estoqueMinimo}</td>
            <td>${item.estoqueMaximo}</td>
            <td>${formatCurrency(item.precoUnitario)}</td>
            <td>${item.localizacao || ''}</td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="editarItem('${item.id}')">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * Carregar itens para select
 */
async function loadItensForSelect() {
    if (AppState.data.itensEstoque.length === 0) {
        await loadEstoque();
    }
    
    const selects = ['solicitacao-item', 'entrada-item'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Selecione um item</option>';
            AppState.data.itensEstoque.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = `${item.nome} (${item.saldoAtual} ${item.unidade})`;
                select.appendChild(option);
            });
        }
    });
}

/**
 * Carregar solicitações aprovadas para saída
 */
async function loadSolicitacoesAprovadas() {
    try {
        const result = await makeRequest('getSolicitacoesAprovadas');
        if (result.success) {
            const select = document.getElementById('saida-solicitacao');
            if (select) {
                select.innerHTML = '<option value="">Selecione uma solicitação</option>';
                result.solicitacoes.forEach(solicitacao => {
                    const option = document.createElement('option');
                    option.value = solicitacao.id;
                    option.textContent = `${solicitacao.id} - ${solicitacao.nomeItem} (${solicitacao.quantidade})`;
                    option.dataset.item = solicitacao.nomeItem;
                    option.dataset.quantidade = solicitacao.quantidade;
                    option.dataset.matricula = solicitacao.matriculaSolicitante || '';
                    option.dataset.nome = solicitacao.nomeFuncionario || '';
                    option.dataset.setor = solicitacao.setorSolicitante || '';
                    select.appendChild(option);
                });
                
                // Event listener para preencher campos automaticamente
                select.addEventListener('change', (e) => {
                    const option = e.target.selectedOptions[0];
                    if (option && option.value) {
                        document.getElementById('saida-item').value = option.dataset.item;
                        document.getElementById('saida-quantidade').value = option.dataset.quantidade;
                        document.getElementById('saida-matricula').value = option.dataset.matricula;
                        document.getElementById('saida-nome-funcionario').value = option.dataset.nome;
                        document.getElementById('saida-setor-funcionario').value = option.dataset.setor;
                    }
                });
            }
        }
    } catch (error) {
        console.error('Erro ao carregar solicitações aprovadas:', error);
    }
}

// ============================================================================
// HANDLERS DE FORMULÁRIOS
// ============================================================================

/**
 * Handler para nova solicitação
 * @param {Event} e - Evento do formulário
 */
async function handleNovaSolicitacao(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        matriculaSolicitante: formData.get('matricula'),
        nomeFuncionario: formData.get('nomeFuncionario'),
        setorSolicitante: formData.get('setorFuncionario'),
        idItem: formData.get('item'),
        quantidade: parseInt(formData.get('quantidade')),
        observacoes: formData.get('observacoes')
    };
    
    try {
        const result = await makeRequest('addSolicitacao', data);
        if (result.success) {
            showSuccess('Solicitação criada com sucesso!');
            closeModal('modal-nova-solicitacao');
            await loadSolicitacoes();
        } else {
            showError(result.message || 'Erro ao criar solicitação');
        }
    } catch (error) {
        showError('Erro ao criar solicitação: ' + error.message);
    }
}

/**
 * Handler para nova entrada
 * @param {Event} e - Evento do formulário
 */
async function handleNovaEntrada(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        idItem: formData.get('item'),
        quantidade: parseInt(formData.get('quantidade')),
        fornecedor: formData.get('fornecedor'),
        notaFiscal: formData.get('notaFiscal'),
        registradoPor: AppState.currentUser.username
    };
    
    try {
        const result = await makeRequest('addEntrada', data);
        if (result.success) {
            showSuccess('Entrada registrada com sucesso!');
            closeModal('modal-nova-entrada');
            await Promise.all([loadEntradas(), loadDashboardData()]);
        } else {
            showError(result.message || 'Erro ao registrar entrada');
        }
    } catch (error) {
        showError('Erro ao registrar entrada: ' + error.message);
    }
}

/**
 * Handler para nova saída
 * @param {Event} e - Evento do formulário
 */
async function handleNovaSaida(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        solicitacaoId: formData.get("solicitacao"),
        registradoPor: AppState.currentUser.username
    };
    
    try {
        const result = await makeRequest('addSaida', data);
        if (result.success) {
            showSuccess('Saída registrada com sucesso!');
            closeModal('modal-nova-saida');
            await Promise.all([loadSaidas(), loadSolicitacoes(), loadDashboardData()]);
        } else {
            showError(result.message || 'Erro ao registrar saída');
        }
    } catch (error) {
        showError('Erro ao registrar saída: ' + error.message);
    }
}

/**
 * Handler para novo item
 * @param {Event} e - Evento do formulário
 */
async function handleNovoItem(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        nome: formData.get('nome'),
        descricao: formData.get('descricao'),
        unidade: formData.get('unidade'),
        estoqueMinimo: parseInt(formData.get('estoqueMinimo')),
        estoqueMaximo: parseInt(formData.get('estoqueMaximo')),
        precoUnitario: parseFloat(formData.get('preco')),
        localizacao: formData.get('localizacao')
    };
    
    try {
        const result = await makeRequest('addItem', data);
        if (result.success) {
            showSuccess('Item cadastrado com sucesso!');
            closeModal('modal-novo-item');
            await loadEstoque();
        } else {
            showError(result.message || 'Erro ao cadastrar item');
        }
    } catch (error) {
        showError('Erro ao cadastrar item: ' + error.message);
    }
}

// ============================================================================
// AÇÕES DE SOLICITAÇÕES
// ============================================================================

/**
 * Aprovar solicitação
 * @param {string} solicitacaoId - ID da solicitação
 */
async function aprovarSolicitacao(solicitacaoId) {
    if (!confirm('Deseja aprovar esta solicitação?')) return;
    
    try {
        const result = await makeRequest("updateSolicitacaoStatus", { id: solicitacaoId, status: "Aprovado", atendidoPor: AppState.currentUser.username });
        if (result.success) {
            showSuccess('Solicitação aprovada com sucesso!');
            await loadSolicitacoes();
        } else {
            showError(result.message || 'Erro ao aprovar solicitação');
        }
    } catch (error) {
        showError('Erro ao aprovar solicitação: ' + error.message);
    }
}

/**
 * Rejeitar solicitação
 * @param {string} solicitacaoId - ID da solicitação
 */
async function rejeitarSolicitacao(solicitacaoId) {
    if (!confirm('Deseja rejeitar esta solicitação?')) return;
    
    try {
        const result = await makeRequest("updateSolicitacaoStatus", { id: solicitacaoId, status: "Rejeitado", atendidoPor: AppState.currentUser.username });
        if (result.success) {
            showSuccess('Solicitação rejeitada com sucesso!');
            await loadSolicitacoes();
        } else {
            showError(result.message || 'Erro ao rejeitar solicitação');
        }
    } catch (error) {
        showError('Erro ao rejeitar solicitação: ' + error.message);
    }
}

// ============================================================================
// INICIALIZAÇÃO
// ============================================================================

/**
 * Configurar event listeners
 */
function setupEventListeners() {
    // Login
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Navegação
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabId = e.target.closest('.tab-btn').dataset.tab;
            switchTab(tabId);
        });
    });
    
    // Modais
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = e.target.dataset.modal;
            closeModal(modalId);
        });
    });
    
    // Botões de ação
    document.getElementById('nova-solicitacao-btn').addEventListener('click', () => openModal('modal-nova-solicitacao'));
    document.getElementById('nova-entrada-btn').addEventListener('click', () => openModal('modal-nova-entrada'));
    document.getElementById('nova-saida-btn').addEventListener('click', () => openModal('modal-nova-saida'));
    document.getElementById('novo-item-btn').addEventListener('click', () => openModal('modal-novo-item'));
    
    // Formulários
    document.getElementById('form-nova-solicitacao').addEventListener('submit', handleNovaSolicitacao);
    document.getElementById('form-nova-entrada').addEventListener('submit', handleNovaEntrada);
    document.getElementById('form-nova-saida').addEventListener('submit', handleNovaSaida);
    document.getElementById('form-novo-item').addEventListener('submit', handleNovoItem);
    
    // Funcionalidade de funcionários
    setupFuncionarioAutoComplete();
    
    // Fechar modal clicando fora
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

/**
 * Inicializar aplicação
 */
function initializeApp() {
    console.log(`Sistema de Estoque v${CONFIG.VERSION} - ${CONFIG.YEAR}`);
    console.log(`Criado por: ${CONFIG.AUTHOR}`);
    
    // Configurar event listeners
    setupEventListeners();
    
    // Verificar se há usuário logado
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            AppState.currentUser = JSON.parse(savedUser);
            showMainContent();
            loadInitialData();
        } catch (error) {
            console.error('Erro ao carregar usuário salvo:', error);
            localStorage.removeItem('currentUser');
            showLoginModal();
        }
    } else {
        showLoginModal();
    }
}

// ============================================================================
// FUNCIONALIDADE DE TEMA (CLARO/ESCURO)
// ============================================================================

/**
 * Gerenciador de temas
 */
const ThemeManager = {
    /**
     * Inicializar o gerenciador de temas
     */
    init() {
        this.loadSavedTheme();
        this.setupThemeToggle();
    },

    /**
     * Carregar tema salvo do localStorage
     */
    loadSavedTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);
    },

    /**
     * Configurar o botão de alternância de tema
     */
    setupThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
    },

    /**
     * Alternar entre temas claro e escuro
     */
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    },

    /**
     * Definir tema
     * @param {string} theme - 'light' ou 'dark'
     */
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        // Atualizar ícone do botão
        this.updateThemeIcon(theme);
        
        // Log para debug
        console.log(`Tema alterado para: ${theme}`);
    },

    /**
     * Atualizar ícone do botão de tema
     * @param {string} theme - 'light' ou 'dark'
     */
    updateThemeIcon(theme) {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            const sunIcon = themeToggle.querySelector('.fa-sun');
            const moonIcon = themeToggle.querySelector('.fa-moon');
            
            if (theme === 'dark') {
                if (sunIcon) sunIcon.style.display = 'block';
                if (moonIcon) moonIcon.style.display = 'none';
                themeToggle.title = 'Alternar para modo claro';
            } else {
                if (sunIcon) sunIcon.style.display = 'none';
                if (moonIcon) moonIcon.style.display = 'block';
                themeToggle.title = 'Alternar para modo escuro';
            }
        }
    },

    /**
     * Obter tema atual
     * @returns {string} Tema atual ('light' ou 'dark')
     */
    getCurrentTheme() {
        return document.documentElement.getAttribute('data-theme') || 'light';
    },

    /**
     * Verificar se está no modo escuro
     * @returns {boolean} True se estiver no modo escuro
     */
    isDarkMode() {
        return this.getCurrentTheme() === 'dark';
    }
};

// ============================================================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ============================================================================

// Aguardar carregamento do DOM
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar tema primeiro (para evitar flash)
    ThemeManager.init();
    
    // Inicializar aplicação
    initializeApp();
});

// Expor funções globais necessárias
window.aprovarSolicitacao = aprovarSolicitacao;
window.rejeitarSolicitacao = rejeitarSolicitacao;

/**
 * LOCALIZAÇÃO DA MARCA D'ÁGUA NO CÓDIGO:
 * 
 * A marca d'água "Criado por: Vinícius Bedeschi ® - v 1.8.0 - 2025" está localizada em:
 * 
 * 1. HTML: Linha ~564 no elemento com classe "footer-watermark" e ID "watermark-info"
 * 2. CSS: Linhas ~459-466 na classe ".footer-watermark"
 * 3. JavaScript: Linhas ~15-19 no objeto CONFIG e linha ~1076 no console.log
 * 
 * Para alterar a versão ou outras informações:
 * - Atualize o objeto CONFIG no início deste arquivo
 * - Atualize o HTML no elemento #watermark-info
 * - Os estilos CSS podem ser mantidos como estão
 */
