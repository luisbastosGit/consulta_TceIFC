// =================================================================
// ARQUIVO: javascript.js
// DESCRIÇÃO: Lógica do frontend para o Sistema de Busca de Estágios.
// Comunica-se com a API do Google Apps Script.
// =================================================================

// --- CONFIGURAÇÃO ---
// ATENÇÃO: Substitua pela URL de implantação da sua API do Apps Script
const API_URL = "https://api-estagios-backend.onrender.com";

// --- VARIÁVEIS GLOBAIS ---
let currentResultsData = [];
let currentHeaders = [];

// =================================================================
// FUNÇÃO CENTRAL DE COMUNICAÇÃO COM A API
// =================================================================

/**
 * Função central para fazer chamadas à API do Google Apps Script.
 * @param {string} action - A ação a ser executada no backend (ex: 'getStudentData').
 * @param {object} [payload={}] - Os dados a serem enviados para a ação.
 * @returns {Promise<any>} - A promessa com os dados da resposta.
 */
async function callApi(action, payload = {}) {
  // Pega o token de autenticação armazenado no navegador
  const authToken = localStorage.getItem('authToken');

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action,
      authToken, // Envia o token em todas as requisições
      payload
    }),
    redirect: 'follow' // Necessário para Apps Script
  });

  const result = await response.json();

  if (!result.success) {
    // Se o token for inválido, desloga o usuário
    if (result.error && result.error.includes("Token inválido")) {
      handleLogout();
    }
    // Lança um erro para que seja capturado pelo .catch()
    throw new Error(result.error || 'Ocorreu um erro na API.');
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
  // Esconde spinners caso um erro ocorra durante uma operação
  $('#loading-spinner, #saving-spinner, #report-spinner').hide();
  $('#save-grades-button, #report-button').prop('disabled', false);
}


// =================================================================
// INICIALIZAÇÃO DA PÁGINA E AUTENTICAÇÃO
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
  // 1. VERIFICA AUTENTICAÇÃO
  const authToken = localStorage.getItem('authToken');
  const user = JSON.parse(localStorage.getItem('user'));

  if (!authToken || !user) {
    // Se não houver token ou dados de usuário, redireciona para o login
    window.location.href = 'login.html';
    return;
  }

  // 2. INICIALIZA A PÁGINA
  document.getElementById('user-name').textContent = user.nome;

  // 3. CARREGA DADOS INICIAIS (FILTROS)
  callApi('getFilterOptions')
    .then(populateFilters)
    .catch(handleApiError);

  // 4. ADICIONA EVENT LISTENERS
  document.getElementById('search-form').addEventListener('submit', (e) => { e.preventDefault(); handleSearch(); });
  document.getElementById('clear-filters').addEventListener('click', () => { document.getElementById('search-form').reset(); handleSearch(); });
  document.getElementById('logout-link').addEventListener('click', (e) => { e.preventDefault(); handleLogout(); });
  document.getElementById('print-button').addEventListener('click', handlePrint);
  document.getElementById('report-button').addEventListener('click', handleReport);
  $('#save-grades-button').on('click', handleSaveGrades);
});


// =================================================================
// FUNÇÕES DE LÓGICA DA APLICAÇÃO
// =================================================================

function handleLogout() {
  const token = localStorage.getItem('authToken');
  // Informa a API para invalidar o token (opcional, mas boa prática)
  if (token) {
    callApi('logout', { token }).catch(handleApiError); // Não precisa esperar a resposta
  }
  // Limpa o armazenamento local e redireciona
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

function populateFilters(options) {
  if (!options) return;
  const statusSelect = document.getElementById('filter-status');
  if (options.status) options.status.forEach(opt => statusSelect.innerHTML += `<option value="${opt}">${opt}</option>`);
  const cursoSelect = document.getElementById('filter-curso');
  if (options.cursos) options.cursos.forEach(opt => cursoSelect.innerHTML += `<option value="${opt}">${opt}</option>`);
  const orientadorSelect = document.getElementById('filter-orientador');
  if (options.orientadores) options.orientadores.forEach(opt => orientadorSelect.innerHTML += `<option value="${opt}">${opt}</option>`);
  const turmaSelect = document.getElementById('filter-turma');
  if (options.turmas) options.turmas.forEach(opt => turmaSelect.innerHTML += `<option value="${opt}">${opt}</option>`);
}

function handleSearch() {
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

  callApi('getStudentData', filters)
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

  currentHeaders = ['statusPreenchimento', 'nome-completo', 'cpf', 'matricula', 'data-nascimento', 'email-aluno', 'telefone-aluno', 'curso', 'turma-fase', 'nome-orientador', 'nome-concedente', 'responsavel-concedente', 'telefone-concedente', 'email-concedente', 'cidade-empresa', 'uf-empresa', 'nome-supervisor', 'cargo-supervisor', 'email-supervisor', 'data-inicio-estagio', 'data-termino-estagio', 'area-estagio', 'atividades-previstas', 'Nota Supervisor', 'Nota Relatório', 'Nota da Defesa', 'Média', 'Observações'];

  let table = '<table class="table table-striped table-bordered table-sm"> <thead class="thead-light"><tr>';
  currentHeaders.forEach(h => table += `<th>${h}</th>`);
  table += '<th>Ações</th></tr></thead><tbody>';

  data.forEach((row, index) => {
    table += `<tr>`;
    currentHeaders.forEach(h => {
      const value = row.hasOwnProperty(h) && row[h] != null ? row[h] : '';
      table += `<td>${value}</td>`;
    });
    table += `<td><button class="btn btn-info btn-sm" onclick="openGradesModal(${index})">Lançar Notas</button></td>`;
    table += '</tr>';
  });

  table += '</tbody></table>';
  container.html(table);
  $('#no-results-message').hide();
}

function openGradesModal(rowIndex) {
  const student = currentResultsData[rowIndex];
  
  // IMPORTANTE: A verificação de permissão (se o usuário é o orientador)
  // foi MOVIDA para o backend. Isso é mais seguro.
  // Removemos a verificação que existia aqui.

  const hasGrades = student['Nota Supervisor'] || student['Nota Relatório'] || student['Nota da Defesa'];
  if (hasGrades) {
    if (!confirm("Atenção! Este aluno já possui notas cadastradas. Deseja visualizá-las e substituí-las?")) {
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

  callApi('updateStudentGrades', dataToSave)
    .then(response => {
      showAlert(response.message, 'success');
      handleSearch(); // Recarrega os dados para mostrar a nota atualizada
    })
    .catch(handleApiError)
    .finally(() => {
      $('#saving-spinner').hide();
      $('#save-grades-button').prop('disabled', false);
      $('#grades-modal').modal('hide');
    });
}

function handleReport() {
  if (currentResultsData.length === 0) {
    showAlert('Não há dados na tabela para gerar o relatório.', 'warning');
    return;
  }
  $('#report-spinner').show();
  document.getElementById('report-button').disabled = true;

  const payload = {
    data: currentResultsData,
    headers: currentHeaders
  };

  callApi('generateSheetReport', payload)
    .then(response => {
      showAlert('Relatório gerado com sucesso! Abrindo planilha em nova aba...', 'success');
      window.open(response.url, '_blank');
    })
    .catch(handleApiError)
    .finally(() => {
      $('#report-spinner').hide();
      document.getElementById('report-button').disabled = false;
    });
}

// =================================================================
// FUNÇÕES UTILITÁRIAS DE UI (sem mudanças)
// =================================================================

function showAlert(message, type) {
  const alertHtml = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">${message}<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button></div>`;
  $('#alert-container').html(alertHtml);
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
  printWindow.document.write('<style>body { padding: 20px; } table { font-size: 10px; } </style>');
  printWindow.document.write('</head><body><h1>Relatório de Estágios</h1>');
  printWindow.document.write(tableContainer.innerHTML.replace(/<button.*?>.*?<\/button>/g, ''));
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); }, 500);
}
