// ============================================
// CONFIGURAÇÃO E VARIÁVEIS GLOBAIS
// ============================================

// Data atual do calendário (mês/ano sendo visualizado)
let currentDate = new Date();

// Armazena os dados do calendário em memória
let calendarData = {};

// Referências aos elementos DOM
const calendarElement = document.getElementById('calendar');
const currentMonthElement = document.getElementById('currentMonth');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const modal = document.getElementById('modal');
const modalDateElement = document.getElementById('modalDate');
const messageInput = document.getElementById('messageInput');
const saveMessageBtn = document.getElementById('saveMessage');
const closeModal = document.querySelector('.close');
const charCount = document.getElementById('charCount');
const loadingOverlay = document.getElementById('loadingOverlay');

// Variável para armazenar o dia selecionado
let selectedDay = null;

// ============================================
// FUNÇÕES DE ARMAZENAMENTO (LOCALSTORAGE)
// ============================================

/**
 * Carrega os dados do calendário do localStorage
 * Dados ficam salvos no navegador de cada usuário
 */
function loadCalendarData() {
    try {
        // Tenta carregar os dados do localStorage
        const savedData = localStorage.getItem('calendar-data');
        
        if (savedData) {
            // Parse dos dados JSON armazenados
            calendarData = JSON.parse(savedData);
            console.log('Dados carregados:', Object.keys(calendarData).length, 'entradas');
        } else {
            // Se não houver dados, inicia com objeto vazio
            calendarData = {};
            console.log('Nenhum dado encontrado, iniciando calendário vazio');
        }
    } catch (error) {
        // Se houver erro no parse, inicia vazio
        console.log('Erro ao carregar dados:', error.message);
        calendarData = {};
    }
}

/**
 * Salva os dados do calendário no localStorage
 * Dados ficam salvos no navegador de cada usuário
 */
function saveCalendarData() {
    try {
        // Salva como JSON no localStorage
        localStorage.setItem('calendar-data', JSON.stringify(calendarData));
        console.log('Dados salvos com sucesso');
        return true;
    } catch (error) {
        console.error('Erro ao salvar dados:', error);
        alert('Erro ao salvar a mensagem. Por favor, tente novamente.');
        return false;
    }
}

/**
 * Gera uma chave única para cada dia (formato: YYYY-MM-DD)
 */
function getDayKey(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Verifica se um dia tem mensagem
 */
function hasMessage(year, month, day) {
    const key = getDayKey(year, month, day);
    return calendarData[key] !== undefined;
}

/**
 * Obtém a mensagem de um dia específico
 */
function getMessage(year, month, day) {
    const key = getDayKey(year, month, day);
    return calendarData[key] || null;
}

/**
 * Adiciona uma mensagem para um dia específico
 */
function addMessage(year, month, day, message) {
    const key = getDayKey(year, month, day);
    
    // Verifica se já existe mensagem (proteção extra)
    if (calendarData[key]) {
        alert('Este dia já foi preenchido!');
        return false;
    }
    
    // Adiciona a mensagem com timestamp
    calendarData[key] = {
        message: message.trim(),
        timestamp: new Date().toISOString()
    };
    
    // Salva no armazenamento
    const saved = saveCalendarData();
    
    if (saved) {
        // Recarrega o calendário para mostrar a atualização
        renderCalendar();
    }
    
    return saved;
}

// ============================================
// FUNÇÕES DE RENDERIZAÇÃO DO CALENDÁRIO
// ============================================

/**
 * Renderiza o calendário completo
 */
function renderCalendar() {
    // Limpa o calendário atual
    calendarElement.innerHTML = '';
    
    // Obtém informações do mês atual
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Atualiza o título do mês
    updateMonthTitle(year, month);
    
    // Renderiza cabeçalho (dias da semana)
    renderWeekHeader();
    
    // Renderiza os dias do mês
    renderDays(year, month);
}

/**
 * Atualiza o título do mês/ano
 */
function updateMonthTitle(year, month) {
    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    currentMonthElement.textContent = `${monthNames[month]} ${year}`;
}

/**
 * Renderiza o cabeçalho com os dias da semana
 */
function renderWeekHeader() {
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    weekDays.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.textContent = day;
        calendarElement.appendChild(dayHeader);
    });
}

/**
 * Renderiza todos os dias do mês
 */
function renderDays(year, month) {
    // Primeiro dia do mês (0 = domingo, 6 = sábado)
    const firstDay = new Date(year, month, 1).getDay();
    
    // Último dia do mês
    const lastDate = new Date(year, month + 1, 0).getDate();
    
    // Último dia do mês anterior
    const prevLastDate = new Date(year, month, 0).getDate();
    
    // Dias do mês anterior (para preencher início)
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = prevLastDate - i;
        renderDayCell(year, month - 1, day, true);
    }
    
    // Dias do mês atual
    for (let day = 1; day <= lastDate; day++) {
        renderDayCell(year, month, day, false);
    }
    
    // Dias do próximo mês (para preencher final)
    const totalCells = calendarElement.children.length - 7; // Subtrai cabeçalho
    const remainingCells = 35 - totalCells; // Grid de 5 semanas
    
    for (let day = 1; day <= remainingCells; day++) {
        renderDayCell(year, month + 1, day, true);
    }
}

/**
 * Renderiza uma célula individual de dia
 */
function renderDayCell(year, month, day, isOtherMonth) {
    const dayCell = document.createElement('div');
    dayCell.className = 'day-cell';
    
    // Adiciona classe se for de outro mês
    if (isOtherMonth) {
        dayCell.classList.add('other-month');
    }
    
    // Número do dia
    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;
    dayCell.appendChild(dayNumber);
    
    // Verifica se tem mensagem
    const messageData = getMessage(year, month, day);
    
    if (messageData) {
        // Dia preenchido
        dayCell.classList.add('filled');
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'day-message';
        messageDiv.textContent = messageData.message;
        dayCell.appendChild(messageDiv);
    } else if (!isOtherMonth) {
        // Dia vazio (disponível para preenchimento)
        dayCell.classList.add('empty');
        
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.textContent = 'Clique para adicionar';
        dayCell.appendChild(emptyState);
        
        // Adiciona evento de clique apenas para dias vazios do mês atual
        dayCell.addEventListener('click', () => openModal(year, month, day));
    }
    
    calendarElement.appendChild(dayCell);
}

// ============================================
// FUNÇÕES DO MODAL
// ============================================

/**
 * Abre o modal para adicionar mensagem
 */
function openModal(year, month, day) {
    // Verifica novamente se o dia está vazio (proteção dupla)
    if (hasMessage(year, month, day)) {
        alert('Este dia já foi preenchido!');
        return;
    }
    
    selectedDay = { year, month, day };
    
    // Formata a data para exibição
    const dateStr = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
    modalDateElement.textContent = dateStr;
    
    // Limpa o input
    messageInput.value = '';
    charCount.textContent = '0';
    
    // Exibe o modal
    modal.style.display = 'block';
    messageInput.focus();
}

/**
 * Fecha o modal
 */
function closeModalWindow() {
    modal.style.display = 'none';
    selectedDay = null;
}

/**
 * Salva a mensagem do modal
 */
function saveMessage() {
    if (!selectedDay) return;
    
    const message = messageInput.value.trim();
    
    // Validação
    if (!message) {
        alert('Por favor, digite uma mensagem!');
        return;
    }
    
    if (message.length > 200) {
        alert('A mensagem deve ter no máximo 200 caracteres!');
        return;
    }
    
    // Desabilita o botão durante o salvamento
    saveMessageBtn.disabled = true;
    saveMessageBtn.textContent = 'Salvando...';
    
    // Adiciona a mensagem
    const success = addMessage(
        selectedDay.year,
        selectedDay.month,
        selectedDay.day,
        message
    );
    
    // Reabilita o botão
    saveMessageBtn.disabled = false;
    saveMessageBtn.textContent = 'Salvar Mensagem';
    
    if (success) {
        closeModalWindow();
    }
}

// ============================================
// FUNÇÕES DE NAVEGAÇÃO
// ============================================

/**
 * Navega para o mês anterior
 */
function previousMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
}

/**
 * Navega para o próximo mês
 */
function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Exibe/oculta overlay de carregamento
 */
function showLoading(show) {
    if (show) {
        loadingOverlay.classList.add('active');
    } else {
        loadingOverlay.classList.remove('active');
    }
}

/**
 * Atualiza o contador de caracteres
 */
function updateCharCount() {
    const length = messageInput.value.length;
    charCount.textContent = length;
    
    if (length > 200) {
        charCount.style.color = 'red';
    } else {
        charCount.style.color = '#666';
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

// Navegação do calendário
prevMonthBtn.addEventListener('click', previousMonth);
nextMonthBtn.addEventListener('click', nextMonth);

// Modal
closeModal.addEventListener('click', closeModalWindow);
saveMessageBtn.addEventListener('click', saveMessage);

// Fecha modal ao clicar fora dele
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        closeModalWindow();
    }
});

// Contador de caracteres
messageInput.addEventListener('input', updateCharCount);

// Permite salvar com Enter (Ctrl+Enter)
messageInput.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key === 'Enter') {
        saveMessage();
    }
});

// ============================================
// INICIALIZAÇÃO
// ============================================

/**
 * Inicializa o aplicativo
 */
function init() {
    console.log('Iniciando Calendário Colaborativo...');
    
    // Carrega os dados salvos
    loadCalendarData();
    
    // Renderiza o calendário inicial
    renderCalendar();
    
    console.log('Calendário pronto!');
}

// Inicia quando a página carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
