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
 * @param {string} endpoint - O endpoint a ser chamado (ex: '/login').
 * @param {string} method - O método HTTP (ex: 'GET', 'POST').
 * @param {object} [payload={}] - Os dados a serem enviados no corpo da requisição.
 * @returns {Promise<any>} - A promessa com os dados da resposta.
 */
async function callApi(endpoint, method, payload = {}) {
  const authToken = localStorage.getItem('authToken');
  const headers = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const config = {
    method,
    headers,
  };

  if (method === 'POST') {
    config.body = JSON.stringify(payload);
  }

  const response = await fetch(`${API_URL}${endpoint}`, config);
  const result = await response.json();

  if (!response.ok || !result.success) {
    if (response.status === 401 || response.status === 403) {
      handleLogout();
    }
    throw new Error(result.message || 'Ocorreu um erro na API.');
  }

  return result.data;
}

/**
 * Lida com erros da API de forma centralizada.
 * @param {Error} error - O objeto de erro.
 */
function handleApiError(error) {
  console.error('Erro na API:', error);
  showAlert(error.message, 'danger');
  $('#loading-spinner').hide();
}

// =================================================================
// INICIALIZAÇÃO DA PÁGINA E AUTENTICAÇÃO
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
  const authToken = localStorage.getItem('authToken');
  const user = JSON.parse(localStorage.getItem('user'));

  if (!authToken || !user) {
    window.location.href = 'login.html';
    return;
  }

  document.getElementById('user-name').textContent = user.nome;
  
  initializePage();

  // Adiciona Event Listeners
  document.getElementById('search-form').addEventListener('submit', (e) => { e.preventDefault(); handleSearch(); });
  document.getElementById('clear-filters').addEventListener('click', () => { document.getElementById('search-form').reset(); handleSearch(); });
  document.getElementById('logout-link').addEventListener('click', (e) => { e.preventDefault(); handleLogout(); });
  document.getElementById('print-button').addEventListener('click', handlePrint);
  $('#save-grades-button').on('click', handleSaveGrades);
});

async function initializePage() {
    $('#loading-spinner').show();
    try {
        const filterOptions = await callApi('/filter-options', 'GET');
        populateFilters(filterOptions);
        
        // Dispara uma busca inicial com filtros vazios
        handleSearch();
    } catch (error) {
        handleApiError(error);
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

function populateFilters(options) {
  if (!options) return;

  const populateSelect = (elementId, items) => {
    const select = document.getElementById(elementId);
    if (items) {
      items.forEach(opt => {
        select.innerHTML += `<option value="${opt}">${opt}</option>`;
      });
    }
  };

  populateSelect('filter-status', options.status);
  populateSelect('filter-curso', options.cursos);
  populateSelect('filter-orientador', options.orientadores);
  populateSelect('filter-turma', options.turmas);
  populateSelect('filter-ano', options.anos); // Popula o novo filtro de ano
}

function handleSearch() {
  const filters = {
    status: $('#filter-status').val(),
    curso: $('#filter-curso').val(),
    orientador: $('#filter-orientador').val(),
    turma: $('#filter-turma').val(),
    ano: $('#filter-ano').val(), // Lê o novo filtro de ano
    nome: $('#filter-nome').val(),
    cpf: $('#filter-cpf').val() // Lê o novo filtro de CPF
  };
  $('#loading-spinner').show();
  $('#results-table-container').empty();
  $('#no-results-message').hide();

  callApi('/student-data', 'POST', filters)
    .then(displayResults)
    .catch(handleApiError);
}

function displayResults(data) {
  currentResultsData = data;
  $('#loading-spinner').hide();
  const container = $('#results-table-container');

  if (!data || data.length === 0) {
    $('#no-results-message').show();
    container.empty();
    return;
  }

  // Define a lista de colunas a serem exibidas na tabela
  currentHeaders = ['idRegistro', 'statusPreenchimento', 'nome-completo', 'cpf', 'matricula', 'data-nascimento', 'email-aluno', 'telefone-aluno', 'curso', 'turma-fase', 'nome-orientador', 'nome-concedente', 'responsavel-concedente', 'telefone-concedente', 'email-concedente', 'cidade-empresa', 'uf-empresa', 'nome-supervisor', 'cargo-supervisor', 'email-supervisor','data-inicio-estagio', 'data-termino-estagio', 'area-estagio', 'atividades-previstas', 'Nota Supervisor', 'Nota Relatório', 'Nota da Defesa', 'Média', 'Observações'];

  let table = '<div class="table-responsive"><table class="table table-striped table-bordered table-sm"> <thead class="thead-light"><tr>';
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
  $('#no-results-message').hide();
}

function openGradesModal(rowIndex) {
  const student = currentResultsData[rowIndex];
  
  $('#modal-title').text('Lançar Notas - ' + student['nome-completo']);
  $('#modal-idRegistro').val(student.idRegistro);
  $('#modal-nota-supervisor').val(student['Nota Supervisor']);
  $('#modal-nota-relatorio').val(student['Nota Relatório']);
  $('#modal-nota-defesa').val(student['Nota da Defesa']);
  $('#modal-observacoes').val(student.Observações);
  $('#grades-modal').modal('show');
}

function handleSaveGrades() {
  const dataToSave = {
    idRegistro: $('#modal-idRegistro').val(),
    notaSupervisor: $('#modal-nota-supervisor').val(),
    notaRelatorio: $('#modal-nota-relatorio').val(),
    notaDefesa: $('#modal-nota-defesa').val(),
    observacoes: $('#modal-observacoes').val()
  };

  $('#saving-spinner').show();
  $('#save-grades-button').prop('disabled', true);

  callApi('/update-grades', 'POST', dataToSave)
    .then(response => {
      showAlert(response.message || "Notas salvas com sucesso!", 'success');
      handleSearch();
    })
    .catch(handleApiError)
    .finally(() => {
      $('#saving-spinner').hide();
      $('#save-grades-button').prop('disabled', false);
      $('#grades-modal').modal('hide');
    });
}

// =================================================================
// FUNÇÕES UTILITÁRIAS DE UI
// =================================================================

function showAlert(message, type) {
  const alertHtml = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">${message}<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button></div>`;
  $('#alert-container').html(alertHtml).find('.alert').delay(4000).fadeOut();
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
  printWindow.document.write('<style>body { padding: 20px; } table { font-size: 10px; } @media print { .btn { display: none; } } </style>');
  printWindow.document.write('</head><body><h1>Relatório de Estágios</h1>');
  printWindow.document.write(tableContainer.innerHTML);
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); }, 500);
}

