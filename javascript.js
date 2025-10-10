// Arquivo: javascript.js
const API_URL = "https://api-estagios-backend.onrender.com";

let currentResultsData = [];
let currentHeaders = [];

async function callApi(endpoint, method = 'POST', payload = {}) {
    const authToken = localStorage.getItem('authToken');
    const headers = {
        'Content-Type': 'application/json',
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method,
            headers,
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!result.success) {
            if (response.status === 401 || response.status === 403) {
                handleLogout();
            }
            throw new Error(result.message || 'Ocorreu um erro na API.');
        }

        return result.data;
    } catch (error) {
        console.error(`Erro na chamada da API para ${endpoint}:`, error);
        showAlert(error.message, 'danger');
        throw error; // Propaga o erro para ser tratado por quem chamou
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const authToken = localStorage.getItem('authToken');
    const user = JSON.parse(localStorage.getItem('user'));
    if (!authToken || !user) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('user-name').textContent = user.nome;
    // Carrega filtros dinamicamente (precisamos criar este endpoint)
    // callApi('/filter-options', 'GET').then(populateFilters).catch(() => {});

    document.getElementById('search-form').addEventListener('submit', (e) => { e.preventDefault(); handleSearch(); });
    document.getElementById('clear-filters').addEventListener('click', () => { document.getElementById('search-form').reset(); handleSearch(); });
    document.getElementById('logout-link').addEventListener('click', (e) => { e.preventDefault(); handleLogout(); });
    document.getElementById('print-button').addEventListener('click', handlePrint);
    // document.getElementById('report-button').addEventListener('click', handleReport);
    $('#save-grades-button').on('click', handleSaveGrades);
});

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
        .catch(() => { // Em caso de erro, esconde o spinner
             $('#loading-spinner').hide();
        });
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

    currentHeaders = Object.keys(data[0]);
    let table = '<table class="table table-striped table-bordered table-sm"> <thead class="thead-light"><tr>';
    currentHeaders.forEach(h => table += `<th>${h}</th>`);
    table += '<th>Ações</th></tr></thead><tbody>';

    data.forEach((row, index) => {
        table += `<tr>`;
        currentHeaders.forEach(h => {
            const value = row[h] != null ? row[h] : '';
            table += `<td>${value}</td>`;
        });
        table += `<td><button class="btn btn-info btn-sm" onclick="openGradesModal(${index})">Lançar Notas</button></td>`;
        table += '</tr>';
    });

    table += '</tbody></table>';
    container.html(table);
}

function openGradesModal(rowIndex) {
    const student = currentResultsData[rowIndex];
    const user = JSON.parse(localStorage.getItem('user'));
    
    // Verificação de permissão no frontend para uma melhor experiência do usuário
    if (student['nome-orientador'].trim().toUpperCase() !== user.nome.trim().toUpperCase()) {
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
            showAlert(response.message || "Notas salvas com sucesso!", 'success');
            handleSearch();
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

function showAlert(message, type) {
    const alertHtml = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">${message}<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button></div>`;
    $('#alert-container').html(alertHtml);
    window.scrollTo(0, 0);
}