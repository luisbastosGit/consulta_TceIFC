// =================================================================
// ARQUIVO: javascript.js
// DESCRIÇÃO: Lógica do frontend para o Sistema de Busca de Estágios.
// =================================================================

// --- CONFIGURAÇÃO ---
const API_URL = "https://api-estagios-backend.onrender.com";

// --- VARIÁVEIS GLOBAIS ---
let currentResultsData = [];
let currentHeaders = [];

// =================================================================
// FUNÇÃO CENTRAL DE COMUNICAÇÃO COM A API
// =================================================================

/**
 * Função central para fazer chamadas à API.
 * @param {string} endpoint - O endpoint a ser chamado (ex: '/login', '/student-data').
 * @param {string} method - O método HTTP (ex: 'GET', 'POST').
 * @param {object} [body=null] - O corpo da requisição para métodos POST.
 * @returns {Promise<any>} - A promessa com os dados da resposta.
 */
async function callApi(endpoint, method = 'GET', body = null) {
  const authToken = localStorage.getItem('authToken');
  const headers = {
    'Content-Type': 'application/json',
  };

  // Adiciona o token de autenticação para rotas protegidas
  if (authToken && endpoint !== '/login') {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const config = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erro no servidor: ${response.status}`);
    }

    // Retorna os dados da resposta em formato JSON
    const result = await response.json();
    if (!result.success) {
        throw new Error(result.message);
    }
    return result.data;

  } catch (error) {
    // Se o token for inválido, desloga o usuário
    if (error.message.includes("inválido ou expirado")) {
        handleLogout();
    }
    // Propaga o erro para ser tratado pela função que chamou
    throw error;
  }
}

// =================================================================
// INICIALIZAÇÃO DA PÁGINA
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
  // 1. VERIFICA AUTENTICAÇÃO
  const authToken = localStorage.getItem('authToken');
  const user = JSON.parse(localStorage.getItem('user'));

  if (!authToken || !user) {
    window.location.href = 'login.html';
    return;
  }

  // 2. INICIALIZA A PÁGINA
  document.getElementById('user-name').textContent = user.nome;

  // 3. ADICIONA EVENT LISTENERS
  document.getElementById('search-form').addEventListener('submit', (e) => { e.preventDefault(); handleSearch(); });
  document.getElementById('clear-filters').addEventListener('click', () => { document.getElementById('search-form').reset(); handleSearch(); });
  document.getElementById('logout-link').addEventListener('click', (e) => { e.preventDefault(); handleLogout(); });
  document.getElementById('print-button').addEventListener('click', handlePrint);
  $('#save-grades-button').on('click', handleSaveGrades);

  // 4. CARREGA DADOS INICIAIS (FILTROS E TABELA)
  loadInitialData();
});

async function loadInitialData() {
    $('#loading-spinner').show();
    try {
        await populateFilters(); // Carrega os filtros primeiro
        await handleSearch();      // Depois carrega os dados da tabela
    } catch (error) {
        showAlert(`Erro ao carregar dados iniciais: ${error.message}`, 'danger');
    } finally {
        $('#loading-spinner').hide();
    }
}


// =================================================================
// FUNÇÕES DE LÓGICA DA APLICAÇÃO
// =================================================================

function handleLogout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

async function populateFilters() {
    try {
        const options = await callApi('/filter-options', 'GET');
        if (!options) return;

        const statusSelect = document.getElementById('filter-status');
        if (options.status) options.status.forEach(opt => statusSelect.innerHTML += `<option value="${opt}">${opt}</option>`);
        
        const cursoSelect = document.getElementById('filter-curso');
        if (options.cursos) options.cursos.forEach(opt => cursoSelect.innerHTML += `<option value="${opt}">${opt}</option>`);
        
        const orientadorSelect = document.getElementById('filter-orientador');
        if (options.orientadores) options.orientadores.forEach(opt => orientadorSelect.innerHTML += `<option value="${opt}">${opt}</option>`);

        const turmaSelect = document.getElementById('filter-turma');
        if (options.turmas) options.turmas.forEach(opt => turmaSelect.innerHTML += `<option value="${opt}">${opt}</option>`);
    } catch (error) {
        showAlert(`Não foi possível carregar as opções de filtro: ${error.message}`, 'warning');
    }
}

async function handleSearch() {
  const filters = {
    status: $('#filter-status').val(),
    curso: $('#filter-curso').val(),
    orientador: $('#filter-orientador').val(),
    nome: $('#filter-nome').val(),
    turma: $('#filter-turma').val()
  };
  $('#loading-spinner').show();
  $('#results-table-container').empty();
  $('#no-results-message').hide();

  try {
    const data = await callApi('/student-data', 'POST', filters);
    displayResults(data);
  } catch(error) {
    showAlert(`Erro ao buscar dados: ${error.message}`, 'danger');
  } finally {
    $('#loading-spinner').hide();
  }
}

function displayResults(data) {
  currentResultsData = data;
  const container = $('#results-table-container');

  if (!data || data.length === 0) {
    $('#no-results-message').show();
    container.empty();
    return;
  }

  // Define as colunas que queremos mostrar e a ordem delas
  currentHeaders = ['idRegistro', 'statusPreenchimento', 'nome-completo', 'cpf', 'matricula', 'curso', 'turma-fase', 'nome-orientador', 'nome-concedente', 'Nota Supervisor', 'Nota Relatório', 'Nota da Defesa', 'Média', 'Observações'];

  let table = '<div class="table-responsive"><table class="table table-striped table-bordered table-sm">';
  table += '<thead class="thead-light"><tr>';
  currentHeaders.forEach(h => table += `<th>${h}</th>`);
  table += '<th>Ações</th></tr></thead><tbody>';

  data.forEach((row, index) => {
    table += `<tr>`;
    currentHeaders.forEach(h => {
      const value = row.hasOwnProperty(h) && row[h] != null ? row[h] : '';
      table += `<td>${value}</td>`;
    });
    table += `<td><button class="btn btn-info btn-sm" onclick="openGradesModal(${index})">Notas</button></td>`;
    table += '</tr>';
  });

  table += '</tbody></table></div>';
  container.html(table);
}

function openGradesModal(rowIndex) {
  const student = currentResultsData[rowIndex];
  
  const hasGrades = student['Nota Supervisor'] || student['Nota Relatório'] || student['Nota da Defesa'];
  if (hasGrades) {
    if (!confirm("Atenção! Este aluno já possui notas cadastradas. Deseja visualizá-las e, se necessário, substituí-las?")) {
      return;
    }
  }

  $('#modal-title').text('Lançar Notas - ' + student['nome-completo']);
  $('#modal-idRegistro').val(student.idRegistro);
  $('#modal-nota-supervisor').val(student['Nota Supervisor']);
  $('#modal-nota-relatorio').val(student['Nota Relatório']);
  $('#modal-nota-defesa').val(student['Nota da Defesa']);
  $('#modal-observacoes').val(student.Observações);
  $('#grades-modal').modal('show');
}

async function handleSaveGrades() {
  const dataToSave = {
    idRegistro: $('#modal-idRegistro').val(),
    notaSupervisor: $('#modal-nota-supervisor').val(),
    notaRelatorio: $('#modal-nota-relatorio').val(),
    notaDefesa: $('#modal-nota-defesa').val(),
    observacoes: $('#modal-observacoes').val()
  };

  $('#saving-spinner').show();
  $('#save-grades-button').prop('disabled', true);

  try {
    const response = await callApi('/update-grades', 'POST', dataToSave);
    showAlert(response.message, 'success');
    handleSearch(); // Recarrega os dados para mostrar a nota atualizada
  } catch(error) {
    showAlert(`Erro ao salvar notas: ${error.message}`, 'danger');
  } finally {
    $('#saving-spinner').hide();
    $('#save-grades-button').prop('disabled', false);
    $('#grades-modal').modal('hide');
  }
}

// =================================================================
// FUNÇÕES UTILITÁRIAS DE UI
// =================================================================

function showAlert(message, type) {
  const alertHtml = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">${message}<button type="button" class="close" data-dismiss="alert">&times;</button></div>`;
  $('#alert-container').html(alertHtml);
  // Faz o alerta desaparecer após 5 segundos
  setTimeout(() => { $('.alert').alert('close'); }, 5000);
}

function handlePrint() {
  if (currentResultsData.length === 0) {
    showAlert('Não há dados na tabela para imprimir.', 'warning');
    return;
  }
  const tableContainer = document.getElementById('results-table-container');
  const printWindow = window.open('', '', 'height=600,width=800');
  printWindow.document.write('<html><head><title>Relatório de Estágios</title>');
  printWindow.document.write('<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">');
  printWindow.document.write('<style>body { padding: 20px; } table { font-size: 10px; } @media print { .btn { display: none; } }</style>');
  printWindow.document.write('</head><body><h1>Relatório de Estágios</h1>');
  printWindow.document.write(tableContainer.innerHTML);
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); }, 500);
}

