// =================================================================
// ARQUIVO: javascript.js
// DESCRIÇÃO: Lógica do frontend para o Sistema de Busca de Estágios.
// =================================================================

// --- CONFIGURAÇÃO ---
const API_URL = "https://api-estagios-backend.onrender.com";

// --- VARIÁVEIS GLOBAIS ---
let allStudentsData = []; // Armazena todos os resultados da API
let currentDisplayData = []; // Armazena os dados atualmente exibidos (e ordenados)
let currentHeaders = [];
let sortColumn = '';
let sortDirection = 'asc';

// =================================================================
// FUNÇÃO CENTRAL DE COMUNICAÇÃO COM A API
// =================================================================

async function callApi(endpoint, payload = {}, method = 'POST') {
  const authToken = localStorage.getItem('authToken');
  const url = `${API_URL}/${endpoint}`;
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (authToken) {
    options.headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  if (method !== 'GET') {
      options.body = JSON.stringify(payload);
  }

  const response = await fetch(url, options);
  const result = await response.json();

  if (!result.success) {
    if (result.message && (result.message.includes("Token inválido") || result.message.includes("expirado"))) {
      handleLogout();
    }
    throw new Error(result.message || 'Ocorreu um erro na API.');
  }

  return result.data;
}

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

  // Carrega os filtros e depois faz a busca inicial
  callApi('filter-options', {}, 'GET')
    .then(populateFilters)
    .then(handleSearch) // Chama a busca inicial após preencher os filtros
    .catch(handleApiError);

  // Adiciona Event Listeners
  document.getElementById('search-form').addEventListener('submit', (e) => { e.preventDefault(); handleSearch(); });
  document.getElementById('clear-filters').addEventListener('click', () => { 
      document.getElementById('search-form').reset(); 
      handleSearch(); 
  });
  document.getElementById('logout-link').addEventListener('click', (e) => { e.preventDefault(); handleLogout(); });
  document.getElementById('export-button').addEventListener('click', handleExport);
  $('#save-grades-button').on('click', handleSaveGrades);

  // Listener para ordenação da tabela
  $('#results-table-container').on('click', '.sortable', function() {
      const column = $(this).data('column');
      handleSort(column);
  });
});


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
  const populate = (selectId, values) => {
    const select = document.getElementById(selectId);
    if (values) {
        values.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            select.appendChild(option);
        });
    }
  };
  populate('filter-status', options.status);
  populate('filter-curso', options.cursos);
  populate('filter-orientador', options.orientadores);
  populate('filter-turma', options.turmas);
}

function handleSearch() {
  const filters = {
    status: $('#filter-status').val(),
    curso: $('#filter-curso').val(),
    orientador: $('#filter-orientador').val(),
    turma: $('#filter-turma').val(),
    ano: $('#filter-ano').val(),
    nome: $('#filter-nome').val(),
    cpf: $('#filter-cpf').val(),
  };
  $('#loading-spinner').show();
  $('#results-table-container').empty();
  $('#no-results-message').hide();

  callApi('student-data', filters)
    .then(data => {
        allStudentsData = data; // Armazena os dados brutos
        currentDisplayData = [...allStudentsData]; // Cria uma cópia para exibição/ordenação
        displayResults();
    })
    .catch(handleApiError);
}

function displayResults() {
  $('#loading-spinner').hide();
  const container = $('#results-table-container');

  if (!currentDisplayData || currentDisplayData.length === 0) {
    $('#no-results-message').show();
    container.empty();
    return;
  }

  currentHeaders = ['idRegistro', 'statusPreenchimento', 'nome-completo', 'cpf', 'matricula', 'data-nascimento', 'email-aluno', 'telefone-aluno', 'curso', 'turma-fase', 'nome-orientador', 'nome-concedente', 'responsavel-concedente', 'telefone-concedente', 'email-concedente', 'cidade-empresa', 'uf-empresa', 'nome-supervisor', 'cargo-supervisor', 'email-supervisor','data-inicio-estagio', 'data-termino-estagio', 'area-estagio', 'atividades-previstas', 'Nota Supervisor', 'Nota Relatório', 'Nota da Defesa', 'Média', 'Observações'];

  let table = `<div class="table-responsive"><table class="table table-striped table-bordered table-sm table-results">
               <thead class="thead-light"><tr>`;
  
  currentHeaders.forEach(h => {
    const isSortable = sortColumn === h;
    const sortClass = isSortable ? sortDirection : '';
    table += `<th class="sortable ${sortClass}" data-column="${h}">${h}</th>`;
  });
  
  table += `<th>Ações</th></tr></thead><tbody>`;

  currentDisplayData.forEach((row, index) => {
    table += `<tr>`;
    currentHeaders.forEach(h => {
      const value = row.hasOwnProperty(h) && row[h] != null ? row[h] : '';
      // Adiciona a classe 'wide-column' se o cabeçalho for 'atividades-previstas'
      const tdClass = h === 'atividades-previstas' ? 'class="wide-column"' : '';
      table += `<td ${tdClass}>${value}</td>`;
    });
    table += `<td><button class="btn btn-info btn-sm" onclick="openGradesModal(${index})">Notas</button></td>`;
    table += '</tr>';
  });

  table += '</tbody></table></div>';
  container.html(table);
  $('#no-results-message').hide();
}

// --- NOVAS FUNÇÕES ---

function handleSort(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }

    currentDisplayData.sort((a, b) => {
        let valA = a[sortColumn] || '';
        let valB = b[sortColumn] || '';

        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) {
            return sortDirection === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
            return sortDirection === 'asc' ? 1 : -1;
        }
        return 0;
    });

    displayResults();
}

function handleExport() {
    if (currentDisplayData.length === 0) {
        showAlert('Não há dados na tabela para gerar a planilha.', 'warning');
        return;
    }

    const dataToExport = currentDisplayData.map(row => {
        const newRow = { ...row };
        return newRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Resultados");

    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `Relatorio_Estagios_${date}.xlsx`);
}

// --- FUNÇÕES DE MODAL E ALERTAS ---

function openGradesModal(displayIndex) {
  const student = allStudentsData.find(s => s.idRegistro === currentDisplayData[displayIndex].idRegistro);
  
  if (!student) {
      showAlert('Erro ao encontrar os dados do aluno. Tente novamente.', 'danger');
      return;
  }

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

  callApi('update-grades', dataToSave)
    .then(response => {
      showAlert(response.message, 'success');
      handleSearch();
    })
    .catch(error => {
        handleApiError(error);
        showAlert(error.message, 'danger');
    })
    .finally(() => {
      $('#saving-spinner').hide();
      $('#save-grades-button').prop('disabled', false);
      $('#grades-modal').modal('hide');
    });
}

function showAlert(message, type) {
  const alertHtml = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">
                      ${message}
                      <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                      </button>
                    </div>`;
  $('#alert-container').html(alertHtml).find('.alert').delay(5000).fadeOut();
}

