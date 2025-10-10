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
        throw error;
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

    document.getElementById('search-form').addEventListener('submit', (e) => { e.preventDefault(); handleSearch(); });
    document.getElementById('clear-filters').addEventListener('click', () => { document.getElementById('search-form').reset(); handleSearch(); });
    document.getElementById('logout-link').addEventListener('click', (e) => { e.preventDefault(); handleLogout(); });
    document.getElementById('print-button').addEventListener('click', handlePrint);
    $('#save-grades-button').on('click', handleSaveGrades);

    // --- LINHA ADICIONADA AQUI ---
    // Inicia uma busca automática assim que a página carrega
    handleSearch();
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
        .catch(() => {
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

    // Pega os cabeçalhos do primeiro objeto, garantindo a ordem
    currentHeaders = [
        'idRegistro', 'statusPreenchimento', 'nome-completo', 'cpf', 'matricula', 
        'data-nascimento', 'telefone-aluno', 'email-aluno', 'curso', 'turma-fase', 
        'nome-orientador', 'nome-concedente', 'responsavel-concedente', 
        'telefone-concedente', 'email-concedente', 'cidade-empresa', 'uf-empresa', 
        'nome-supervisor', 'cargo-supervisor', 'email-supervisor', 'data-inicio-estagio', 
        'data-termino-estagio', 'area-estagio', 'atividades-previstas', 'Nota Supervisor', 
        'Nota Relatório', 'Nota da Defesa', 'Média', 'Observações'
    ];

    let table = '<table class="table table-striped table-bordered table-sm"> <thead class="thead-light"><tr>';
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
        table += `<td><button class="btn btn-info btn-sm" onclick="openGradesModal(${index})">Lançar Notas</button></td>`;
        table += '</tr>';
    });

    table += '</tbody></table>';
    container.html(table);
}

function openGradesModal(rowIndex) {
    const student = currentResultsData[rowIndex];
    const user = JSON.parse(localStorage.getItem('user'));
    
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
            showAlert("Notas salvas com sucesso!", 'success');
            handleSearch();
        })
        .finally(() => {
            $('#saving-spinner').hide();
            $('#save-grades-button').prop('disabled', false);
            $('#grades-modal').modal('hide');
        });
}

function handlePrint() {
    // ... (código de impressão, sem alterações) ...
}

function showAlert(message, type) {
    const alertHtml = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">${message}<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button></div>`;
    $('#alert-container').html(alertHtml);
    window.scrollTo(0, 0);
}