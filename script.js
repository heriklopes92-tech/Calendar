// ============================================
// CONFIGURAÇÃO E VARIÁVEIS GLOBAIS
// ============================================

// Data atual do calendário (mês/ano sendo visualizado)
let currentDate = new Date();

// Armazena os dados do calendário em memória
let calendarData = {};

// ID do usuário (agora do Firebase Auth)
let userId = null;

// Referência do Firestore
let unsubscribeListener = null;

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
// FUNÇÕES DO FIRESTORE
// ============================================

/**
 * Inicializa o Firebase e configura o listener
 */
async function initFirebase() {
    try {
        console.log('Iniciando Firebase...');
        
        // Aguarda o login anônimo
        await waitForAuth();
        
        // Configura listener em tempo real
        setupRealtimeListener();
        
        console.log('Firebase inicializado com sucesso!');
        return true;
    } catch (error) {
        console.error('Erro ao inicializar Firebase:', error);
        showError('Erro ao conectar com o servidor.');
        return false;
    }
}

/**
 * Aguarda o login anônimo ser concluído
 */
function waitForAuth() {
    return new Promise((resolve, reject) => {
        const maxAttempts = 50; // 5 segundos máximo
        let attempts = 0;
        
        const checkAuth = () => {
            attempts++;
            
            if (window.userId) {
                userId = window.userId;
                console.log('Usuário autenticado:', userId);
                resolve();
            } else if (attempts >= maxAttempts) {
                reject(new Error('Timeout ao aguardar autenticação'));
            } else {
                setTimeout(checkAuth, 100);
            }
        };
        
        checkAuth();
    });
}

/**
 * Configura o listener em tempo real do Firestore
 */
// ============================================
// FUNÇÕES DO FIRESTORE (VERSÃO CORRIGIDA)
// ============================================

/**
 * Configura o listener em tempo real do Firestore
 */
function setupRealtimeListener() {
    try {
        console.log('Configurando listener do Firestore...');
        
        // Limpa dados locais
        calendarData = {};
        
        // Usa collection() do Firestore corretamente
        // IMPORTANTE: window.firestore é um objeto que contém as funções, não tem método collection()
        const calendarRef = window.firestore.collection(window.db, 'calendar');
        
        // Escuta todas as mudanças na coleção 'calendar'
        unsubscribeListener = window.firestore.onSnapshot(
            calendarRef,
            (snapshot) => {
                console.log('Dados recebidos do Firestore:', snapshot.docs.length, 'documentos');
                
                snapshot.docChanges().forEach((change) => {
                    const data = change.doc.data();
                    const dayKey = change.doc.id;
                    
                    console.log('Mudança detectada:', change.type, 'para', dayKey, data);
                    
                    if (change.type === 'added' || change.type === 'modified') {
                        // Adiciona ou atualiza no cache local
                        calendarData[dayKey] = {
                            message: data.message,
                            timestamp: data.timestamp,
                            userId: data.userId,
                            edited: data.edited || false
                        };
                    } else if (change.type === 'removed') {
                        // Remove do cache local
                        delete calendarData[dayKey];
                    }
                });
                
                // Renderiza o calendário com os novos dados
                renderCalendar();
                hideLoading();
            },
            (error) => {
                console.error('Erro no listener do Firestore:', error);
                showError('Erro na conexão em tempo real.');
                hideLoading();
            }
        );
        
        console.log('Listener do Firestore configurado');
        return true;
    } catch (error) {
        console.error('Erro ao configurar listener:', error);
        showError('Erro ao configurar conexão em tempo real.');
        return false;
    }
}

/**
 * Salva uma mensagem no Firestore
 */
async function saveMessageToFirestore(year, month, day, message, isEdit = false) {
    try {
        showLoading();
        
        const dayKey = getDayKey(year, month, day);
        const timestamp = new Date().toISOString();
        
        const messageData = {
            message: message.trim(),
            timestamp: timestamp,
            userId: userId,
            edited: isEdit
        };
        
        const docRef = window.firestore.doc(window.db, 'calendar', dayKey);
        
        if (isEdit) {
            // Atualiza mensagem existente
            await window.firestore.setDoc(docRef, messageData);
            console.log('Mensagem atualizada no Firestore:', dayKey);
        } else {
            // Verifica se já existe
            const docSnap = await window.firestore.getDoc(docRef);
            
            if (docSnap.exists()) {
                throw new Error('Este dia já foi preenchido por outro usuário!');
            }
            
            // Cria nova mensagem
            await window.firestore.setDoc(docRef, messageData);
            console.log('Mensagem salva no Firestore:', dayKey);
        }
        
        return true;
    } catch (error) {
        console.error('Erro ao salvar no Firestore:', error);
        alert(error.message || 'Erro ao salvar a mensagem. Por favor, tente novamente.');
        return false;
    } finally {
        hideLoading();
    }
}

/**
 * Remove uma mensagem do Firestore
 */
async function deleteMessageFromFirestore(year, month, day) {
    try {
        showLoading();
        
        const dayKey = getDayKey(year, month, day);
        const docRef = window.firestore.doc(window.db, 'calendar', dayKey);
        const docSnap = await window.firestore.getDoc(docRef);
        
        if (!docSnap.exists()) {
            throw new Error('Mensagem não encontrada!');
        }
        
        const data = docSnap.data();
        
        // Verifica se é o autor
        if (data.userId !== userId) {
            throw new Error('Você só pode excluir suas próprias mensagens!');
        }
        
        // Confirma a exclusão
        if (!confirm('Tem certeza que deseja excluir esta mensagem?')) {
            hideLoading();
            return false;
        }
        
        await window.firestore.deleteDoc(docRef);
        console.log('Mensagem excluída do Firestore:', dayKey);
        return true;
    } catch (error) {
        console.error('Erro ao excluir do Firestore:', error);
        alert(error.message || 'Erro ao excluir a mensagem.');
        return false;
    } finally {
        hideLoading();
    }
}

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

/**
 * Gera uma chave única para cada dia (formato: YYYY-MM-DD)
 */
function getDayKey(year, month, day) {
    const date = new Date(year, month, day);
    return date.toISOString().split('T')[0];
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
    const totalCells = calendarElement.children.length - 7;
    const remainingCells = 35 - totalCells;
    
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
    
    if (isOtherMonth) {
        dayCell.classList.add('other-month');
    }
    
    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;
    dayCell.appendChild(dayNumber);
    
    const key = getDayKey(year, month, day);
    const messageData = calendarData[key];
    
    if (messageData) {
        dayCell.classList.add('filled');
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'day-message';
        messageDiv.textContent = messageData.message;
        
        if (messageData.edited) {
            const editedLabel = document.createElement('span');
            editedLabel.className = 'edited-label';
            editedLabel.textContent = ' (editado)';
            messageDiv.appendChild(editedLabel);
        }
        
        dayCell.appendChild(messageDiv);
        
        if (messageData.userId === userId) {
            dayCell.classList.add('own-message');
            
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'message-actions';
            
            const editBtn = document.createElement('button');
            editBtn.className = 'btn-edit';
            editBtn.innerHTML = '✏️ Editar';
            editBtn.onclick = (e) => {
                e.stopPropagation();
                openEditModal(year, month, day, messageData.message);
            };
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-delete';
            deleteBtn.innerHTML = '🗑️ Excluir';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deleteMessage(year, month, day);
            };
            
            actionsDiv.appendChild(editBtn);
            actionsDiv.appendChild(deleteBtn);
            dayCell.appendChild(actionsDiv);
        }
    } else if (!isOtherMonth) {
        dayCell.classList.add('empty');
        
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.textContent = 'Clique para adicionar';
        dayCell.appendChild(emptyState);
        
        dayCell.addEventListener('click', () => openModal(year, month, day));
    }
    
    calendarElement.appendChild(dayCell);
}

// ============================================
// FUNÇÕES DO MODAL
// ============================================

function openModal(year, month, day) {
    if (hasMessage(year, month, day)) {
        alert('Este dia já foi preenchido!');
        return;
    }
    
    selectedDay = { year, month, day, isEdit: false };
    const dateStr = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
    modalDateElement.textContent = dateStr;
    
    messageInput.value = '';
    charCount.textContent = '0';
    saveMessageBtn.textContent = 'Salvar Mensagem';
    
    modal.style.display = 'block';
    messageInput.focus();
}

function openEditModal(year, month, day, currentMessage) {
    selectedDay = { year, month, day, isEdit: true };
    const dateStr = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
    modalDateElement.textContent = dateStr;
    
    messageInput.value = currentMessage;
    charCount.textContent = currentMessage.length;
    saveMessageBtn.textContent = 'Atualizar Mensagem';
    
    modal.style.display = 'block';
    messageInput.focus();
}

function closeModalWindow() {
    modal.style.display = 'none';
    selectedDay = null;
}

async function saveMessage() {
    if (!selectedDay) return;
    
    const message = messageInput.value.trim();
    
    if (!message) {
        alert('Por favor, digite uma mensagem!');
        return;
    }
    
    if (message.length > 200) {
        alert('A mensagem deve ter no máximo 200 caracteres!');
        return;
    }
    
    saveMessageBtn.disabled = true;
    const originalText = saveMessageBtn.textContent;
    saveMessageBtn.textContent = 'Salvando...';
    
    const success = await saveMessageToFirestore(
        selectedDay.year,
        selectedDay.month,
        selectedDay.day,
        message,
        selectedDay.isEdit
    );
    
    saveMessageBtn.disabled = false;
    saveMessageBtn.textContent = originalText;
    
    if (success) {
        closeModalWindow();
    }
}

async function deleteMessage(year, month, day) {
    const success = await deleteMessageFromFirestore(year, month, day);
    if (success) {
        renderCalendar();
    }
}

// ============================================
// FUNÇÕES DE NAVEGAÇÃO
// ============================================

function previousMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function showLoading() {
    loadingOverlay.classList.add('active');
}

function hideLoading() {
    loadingOverlay.classList.remove('active');
}

function showError(message) {
    console.error(message);
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'position:fixed;top:10px;right:10px;background:#f44336;color:white;padding:10px;border-radius:5px;z-index:10000;';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

function updateCharCount() {
    const length = messageInput.value.length;
    charCount.textContent = length;
    charCount.style.color = length > 200 ? 'red' : '#666';
}

// ============================================
// EVENT LISTENERS
// ============================================

prevMonthBtn.addEventListener('click', previousMonth);
nextMonthBtn.addEventListener('click', nextMonth);
closeModal.addEventListener('click', closeModalWindow);
saveMessageBtn.addEventListener('click', saveMessage);

window.addEventListener('click', (event) => {
    if (event.target === modal) {
        closeModalWindow();
    }
});

messageInput.addEventListener('input', updateCharCount);
messageInput.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key === 'Enter') {
        saveMessage();
    }
});

// ============================================
// INICIALIZAÇÃO
// ============================================

async function init() {
    console.log('Iniciando Calendário Colaborativo com Firebase...');
    showLoading();
    
    try {
        // Inicializa Firebase
        await initFirebase();
        console.log('Firebase inicializado, User ID:', userId);
        
        // Renderiza calendário (dados virão do listener em tempo real)
        renderCalendar();
        
        console.log('Calendário pronto para uso colaborativo!');
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showError('Erro ao inicializar o aplicativo. Verifique sua conexão.');
        hideLoading();
    }
}

// Inicia quando a página carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
