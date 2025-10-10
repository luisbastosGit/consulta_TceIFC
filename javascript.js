// Arquivo: javascript.js
const API_URL = "https://api-estagios-backend.onrender.com";

// Função genérica para chamar a API
async function callApi(endpoint, method = 'POST', payload = {}) {
    const authToken = localStorage.getItem('authToken');
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const config = { method, headers };
    // Para requisições GET, não enviamos um 'body'
    if (method !== 'GET') {
        config.body = JSON.stringify(payload);
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);
        const result = await response.json();
        if (!result.success) {
            if (response.status === 401 || response.status === 403) {
                handleLogout(); // Desloga o usuário se o token for inválido
            }
            throw new Error(result.message || 'Ocorreu um erro na API.');
        }
        return result.data;
    } catch (error) {
        console.error(`Erro na chamada da API para ${endpoint}:`, error);
        showAlert(error.message, 'danger');
        // Garante que o spinner de loading seja escondido em caso de erro
        $('#loading-spinner').hide();
        throw error;
    }
}

// Roda quando a página termina de carregar
document.addEventListener('DOMContentLoaded', () => {
    const authToken = localStorage.getItem('authToken');
    const user = JSON.parse(localStorage.getItem('user'));
    if (!authToken || !user) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('user-name').textContent = user.nome;

    // Carrega os filtros e, em seguida, os dados iniciais
    loadFiltersAndInitialData();

    // Adiciona os eventos aos botões
    document.getElementById('search-form').addEventListener('submit', (e) => { e.preventDefault(); handleSearch(); });
    document.getElementById('clear-filters').addEventListener('click', () => { document.getElementById('search-form').reset(); handleSearch(); });
    document.getElementById('logout-link').addEventListener('click', (e) => { e.preventDefault(); handleLogout(); });
    document.getElementById('print-button').addEventListener('click', handlePrint);
    $('#save-grades-button').on('click', handleSaveGrades);
});

async function loadFiltersAndInitialData() {
    try {
        const filterOptions = await callApi('/filter-options', 'GET');
        populateFilters(filterOptions);
    } catch (error) {
        showAlert('Não foi possível carregar as opções de filtro.', 'warning');
    } finally {
        // Faz a busca inicial de dados, independentemente de os filtros terem carregado ou não
        handleSearch();
    }
}

function populateFilters(options) {
    if (!options) return;
    const createOptions = (selectId, data) => {
        const select = document.getElementById(selectId);
        // Limpa opções antigas antes de adicionar novas
        select.innerHTML = '<option value="">Todos</option>';
        if (data) {
            data.forEach(opt => {
                const optionEl = document.createElement('option');
                optionEl.value = opt;
                optionEl.textContent = opt;
                select.appendChild(optionEl);
            });
        }
    };
    createOptions('filter-status', options.status);
    createOptions('filter-curso', options.cursos);
    createOptions('filter-orientador', options.orientadores);
    createOptions('filter-turma', options.turmas);
}

function handleLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

function handleSearch() {
    const filters = {
        status: document.getElementById('filter-status').value,
        curso: document.getElementById('filter-curso').value,
        orientador: document.getElementById('filter-orientador').value,
        nome: document.getElementById('filter-nome').value,
        turma: document.getElementById('filter-turma').value,
    };
    $('#loading-spinner').show();
    $('#results-table-container').empty();
    $('#no-results-message').hide();

    callApi('/student-data', 'POST', filters)
        .then(displayResults)
        .catch(() => {
             // O erro já é tratado na função callApi, aqui apenas garantimos que o spinner some
             $('#loading-spinner').hide();
        });
}

function displayResults(data) {
    currentResultsData = data;
    $('#loading-spinner').hide(); // Esconde o spinner ao receber os dados
    const container = $('#results-table-container');

    if (!data || data.length === 0) {
        $('#no-results-message').show();
        container.empty();
        return;
    }

    currentHeaders = [
        'idRegistro', 'statusPreenchimento', 'nome-completo', 'cpf', 'matricula', 
        'data-nascimento', 'telefone-aluno', 'email-aluno', 'curso', 'turma-fase', 
        'nome-orientador', 'nome-concedente', 'responsavel-concedente', 
        'telefone-concedente', 'email-concedente', 'cidade-empresa', 'uf-empresa', 
        'nome-supervisor', 'cargo-supervisor', 'email-supervisor', 'data-inicio-estagio', 
        'data-termino-estagio', 'area-estagio', 'atividades-previstas', 'Nota Supervisor', 
        'Nota Relatório', 'Nota da Defesa', 'Média', 'Observações'
    ];

    let table = '<table class="table table-striped table-bordered table-sm" style="font-size: 0.8rem;"> <thead class="thead-light"><tr>';
    currentHeaders.forEach(h => {
        if(h) table += `<th>${h}</th>`;
    });
    table += '<th>Ações</th></tr></thead><tbody>';

    data.forEach((row, index) => {
        table += `<tr>`;
        currentHeaders.forEach(h => {
            if(h) {
                const value = row[h] != null ? row[h] : '';
                table += `<td>${value}</td>`;
            }
        });
        table += `<td><button class="btn btn-info btn-sm" onclick="openGradesModal(${index})">Notas</button></td>`;
        table += '</tr>';
    });

    table += '</tbody></table>';
    container.html(table);
}

function openGradesModal(rowIndex) {
    const student = currentResultsData[rowIndex];
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (student['nome-orientador'] && student['nome-orientador'].trim().toUpperCase() !== user.nome.trim().toUpperCase()) {
        showAlert('Acesso Negado: Você não é o orientador deste aluno.', 'danger');
        return;
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
    callApi('/update-grades', 'POST', dataToSave)
        .then(response => {
            showAlert("Notas salvas com sucesso!", 'success');
            handleSearch(); // Recarrega os dados para mostrar a nota atualizada
        })
        .finally(() => {
            $('#saving-spinner').hide();
            $('#save-grades-button').prop('disabled', false);
            $('#grades-modal').modal('hide');
        });
}

function handlePrint() {
    if (currentResultsData.length === 0) {
        showAlert('Não há dados na tabela para imprimir.', 'warning');
        return;
    }
    const tableContainer = document.getElementById('results-table-container').innerHTML;
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Relatório de Estágios</title>');
    printWindow.document.write('<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">');
    printWindow.document.write('<style>body { padding: 20px; } table { font-size: 10px; } .btn { display: none; } </style>');
    printWindow.document.write('</head><body><h1>Relatório de Estágios</h1>');
    printWindow.document.write(tableContainer);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
}

function showAlert(message, type) {
    const alertContainer = $('#alert-container');
    const alertHtml = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">${message}<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button></div>`;
    alertContainer.html(alertHtml);
    window.scrollTo(0, 0); // Rola a página para o topo para ver o alerta
}