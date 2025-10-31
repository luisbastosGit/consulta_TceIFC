    // =================================================================
    // ARQUIVO: javascript.js
    // DESCRIÇÃO: Lógica do frontend para o Sistema de Busca de Estágios.
    // Comunica-se com a API do Node.js.
    // =================================================================

    // --- CONFIGURAÇÃO ---
    const API_URL = "https://api-estagios-backend.onrender.com";

    // --- VARIÁVEIS GLOBAIS ---
    let currentResultsData = [];
    let currentHeaders = [];
    let sortState = {
    column: null,
    direction: 'asc'
    };

    // =================================================================
    // FUNÇÃO CENTRAL DE COMUNICAÇÃO COM A API
    // =================================================================
    async function callApi(endpoint, payload = {}, method = 'POST') {
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

    if (method !== 'GET') {
        config.body = JSON.stringify(payload);
    }

    const response = await fetch(`${API_URL}${endpoint}`, config);

    if (!response.ok) {
        const errorResult = await response.json().catch(() => ({ message: 'Erro desconhecido na API.' }));
        if (response.status === 401 || response.status === 403) {
        handleLogout();
        }
        throw new Error(errorResult.message || `Erro ${response.status}`);
    }

    return response.json();
    }

    function handleApiError(error) {
    console.error('Erro na API:', error);
    showAlert(error.message, 'danger');
    $('#loading-spinner, #saving-spinner').hide();
    $('#save-grades-button, #export-button').prop('disabled', false);
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
    callApi('/filter-options', null, 'GET')
        .then(response => {
        populateFilters(response.data);
        handleSearch(); // Busca inicial após carregar os filtros
        })
        .catch(handleApiError);

    document.getElementById('search-form').addEventListener('submit', (e) => { e.preventDefault(); handleSearch(); });
    document.getElementById('clear-filters').addEventListener('click', () => {
        document.getElementById('search-form').reset();
        handleSearch();
    });
    document.getElementById('logout-link').addEventListener('click', (e) => { e.preventDefault(); handleLogout(); });
    document.getElementById('export-button').addEventListener('click', handleExport);
    $('#save-grades-button').on('click', handleSaveGrades);
    });

    // =================================================================
    // LÓGICA DA APLICAÇÃO
    // =================================================================

    function handleLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
    }

    function populateFilters(options) {
    if (!options) return;
    const populate = (selectId, data) => {
        const select = document.getElementById(selectId);
        if (data) {
        data.forEach(opt => {
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
        // 👇 ESTA É A LINHA IMPORTANTE 👇
        empresa: $('#filter-empresa').val()
    };
    $('#loading-spinner').show();
    $('#results-table-container').empty();
    $('#no-results-message').hide();
    $('#stats-container').hide(); // Esconde as estatísticas durante a busca

    callApi('/student-data', filters)
        .then(displayResults)
        .catch(handleApiError);
    }

    function displayResults(response) {
    const data = response.data;
    const stats = response.stats;

    $('#loading-spinner').hide();
    
    // ATUALIZAÇÃO AQUI: Preenche os campos de estatísticas
    if (stats) {
        $('#stats-total').text(`Registos Encontrados: ${stats.total}`);
        $('#stats-completos').text(`Completos: ${stats.completos}`);
        $('#stats-pendentes').text(`Pendentes: ${stats.pendentes}`);
        $('#stats-container').show();
    }

    const container = $('#results-table-container');
    if (!data || data.length === 0) {
        $('#no-results-message').show();
        container.empty();
        currentResultsData = [];
        return;
    }
    
    currentResultsData = data;
    
    currentHeaders = ['idRegistro', 'statusPreenchimento', 'nome-completo', 'cpf', 'matricula', 'data-nascimento', 'email-aluno', 'telefone-aluno', 'curso', 'turma-fase', 'nome-orientador', 'nome-concedente', 'responsavel-concedente', 'telefone-concedente', 'email-concedente', 'cidade-empresa', 'uf-empresa', 'nome-supervisor', 'cargo-supervisor', 'email-supervisor','data-inicio-estagio', 'data-termino-estagio', 'area-estagio', 'atividades-previstas', 'Nota Supervisor', 'Nota Relatório', 'Nota da Defesa', 'Média', 'Observações'];

    let table = '<div class="table-responsive"><table class="table table-striped table-bordered table-sm">';
    table += '<thead class="thead-light"><tr>';
    currentHeaders.forEach(h => {
        table += `<th class="sortable" onclick="handleSort('${h}')">${h}</th>`;
    });
    table += '<th>Ações</th></tr></thead><tbody>';

    data.forEach((row, index) => {
        table += `<tr>`;
        currentHeaders.forEach(h => {
            const isWide = h === 'atividades-previstas';
            const value = row.hasOwnProperty(h) && row[h] != null ? row[h] : '';
            table += `<td class="${isWide ? 'wide-column' : ''}">${value}</td>`;
        });
        table += `<td><button class="btn btn-info btn-sm" onclick="openGradesModal(${index})">Notas</button></td>`;
        table += '</tr>';
    });

    table += '</tbody></table></div>';
    container.html(table);
    $('#no-results-message').hide();
    updateSortIndicator();
    }

    function openGradesModal(rowIndex) {
    const student = currentResultsData[rowIndex];
    const user = JSON.parse(localStorage.getItem('user'));

    if (student['nome-orientador'].trim().toUpperCase() !== user.nome.trim().toUpperCase()) {
        showAlert('Acesso Negado: Você não é o orientador deste aluno.', 'danger');
        return;
    }

    const hasGrades = student['Nota Supervisor'] || student['Nota Relatório'] || student['Nota da Defesa'];
    if (hasGrades) {
        if (!confirm("Atenção! Este aluno já possui notas. Deseja visualizá-las e/ou substituí-las?")) {
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

    callApi('/update-grades', dataToSave)
        .then(response => {
        showAlert(response.message, 'success');
        handleSearch();
        })
        .catch(handleApiError)
        .finally(() => {
        $('#saving-spinner').hide();
        $('#save-grades-button').prop('disabled', false);
        $('#grades-modal').modal('hide');
        });
    }


    function handleSort(column) {
    if (sortState.column === column) {
        sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
        sortState.column = column;
        sortState.direction = 'asc';
    }

    currentResultsData.sort((a, b) => {
        let valA = a[column] || '';
        let valB = b[column] || '';
        if (typeof valA === 'string') valA = valA.toUpperCase();
        if (typeof valB === 'string') valB = valB.toUpperCase();

        if (valA < valB) return sortState.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortState.direction === 'asc' ? 1 : -1;
        return 0;
    });
    
    // Simplesmente redesenha a tabela com os dados já ordenados
    const response = { data: currentResultsData, stats: { total: currentResultsData.length, completos: currentResultsData.filter(r => r.statusPreenchimento === 'Concluído').length, pendentes: currentResultsData.filter(r => r.statusPreenchimento === 'ALUNO').length }};
    displayResults(response);
    }

    function updateSortIndicator() {
        $('th.sortable').removeClass('sort-asc sort-desc');
        if (sortState.column) {
            const th = $(`th.sortable:contains(${sortState.column})`);
            if (th.length) {
                th.addClass(sortState.direction === 'asc' ? 'sort-asc' : 'sort-desc');
            }
        }
    }


    function handleExport() {
    if (currentResultsData.length === 0) {
        showAlert('Não há dados na tabela para gerar a planilha.', 'warning');
        return;
    }
    
    // Prepara os dados para a planilha, usando apenas os cabeçalhos definidos
    const dataForSheet = currentResultsData.map(row => {
        const newRow = {};
        currentHeaders.forEach(header => {
        newRow[header] = row[header] || '';
        });
        return newRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Resultados");
    
    XLSX.writeFile(workbook, "Relatorio_Estagios.xlsx");
    }

    // =================================================================
    // FUNÇÕES UTILITÁRIAS DE UI
    // =================================================================
    function showAlert(message, type) {
    const alertHtml = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">${message}<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button></div>`;
    $('#alert-container').html(alertHtml).find('.alert').delay(5000).fadeOut();
    }

