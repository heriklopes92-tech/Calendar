// ============================================
// CONFIGURAÇÃO E VARIÁVEIS GLOBAIS
// ============================================

// Data atual do calendário (mês/ano sendo visualizado)
let currentDate = new Date();

// Armazena os dados do calendário em memória
let calendarData = {};

// ID do usuário
let userId = null;

// Modo de operação: 'firebase' ou 'local'
let operationMode = 'local';

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
// FUNÇÕES UTILITÁRIAS BÁSICAS
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
 * Exibe uma mensagem de aviso
 */
function showWarning(message) {
    console.warn(message);
    
    // Remove notificação anterior se existir
    const oldNotification = document.getElementById('temp-notification');
    if (oldNotification) {
        oldNotification.remove();
    }
    
    // Cria nova notificação
    const notification = document.createElement('div');
    notification.id = 'temp-notification';
    notification.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #FF9800;
        color: white;
        padding: 10px 15px;
        border-radius: 5px;
        z-index: 10000;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease-out;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remove após 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

/**
 * Atualiza o indicador de modo (online/offline)
 */
function updateModeIndicator() {
    // Remove indicador anterior se existir
    const oldIndicator = document.getElementById('mode-indicator');
    if (oldIndicator) {
        oldIndicator.remove();
    }
    
    // Cria novo indicador
    const indicator = document.createElement('div');
    indicator.id = 'mode-indicator';
    indicator.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        padding: 5px 10px;
        border-radius: 5px;
        font-size: 12px;
        font-weight: bold;
        z-index: 1000;
        opacity: 0.8;
    `;
    
    if (operationMode === 'firebase') {
        indicator.textContent = '🟢 Online';
        indicator.style.backgroundColor = '#4CAF50';
        indicator.style.color = 'white';
    } else {
        indicator.textContent = '🟡 Local (offline)';
        indicator.style.backgroundColor = '#FF9800';
        indicator.style.color = 'white';
    }
    
    document.body.appendChild(indicator);
}

// ============================================
// FUNÇÕES DE NAVEGAÇÃO DO CALENDÁRIO
// ============================================

/**
 * Vai para o mês anterior
 */
function previousMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
}

/**
 * Vai para o próximo mês
 */
function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
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
    
    if (modalDateElement) {
        modalDateElement.textContent = dateStr;
    }
    
    if (messageInput) messageInput.value = '';
    if (charCount) charCount.textContent = '0';
    if (saveMessageBtn) saveMessageBtn.textContent = 'Salvar Mensagem';
    
    if (modal) {
        modal.style.display = 'block';
    }
    if (messageInput) messageInput.focus();
}

function openEditModal(year, month, day, currentMessage) {
    selectedDay = { year, month, day, isEdit: true };
    const dateStr = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
    
    if (modalDateElement) {
        modalDateElement.textContent = dateStr;
    }
    
    if (messageInput) messageInput.value = currentMessage;
    if (charCount) charCount.textContent = currentMessage.length;
    if (saveMessageBtn) saveMessageBtn.textContent = 'Atualizar Mensagem';
    
    if (modal) {
        modal.style.display = 'block';
    }
    if (messageInput) messageInput.focus();
}

function closeModalWindow() {
    if (modal) {
        modal.style.display = 'none';
    }
    selectedDay = null;
}

// ============================================
// FUNÇÕES DE RENDERIZAÇÃO DO CALENDÁRIO
// ============================================

function renderCalendar() {
    if (!calendarElement) return;
    
    calendarElement.innerHTML = '';
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    updateMonthTitle(year, month);
    renderWeekHeader();
    renderDays(year, month);
}

function updateMonthTitle(year, month) {
    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    if (currentMonthElement) {
        currentMonthElement.textContent = `${monthNames[month]} ${year}`;
    }
}

function renderWeekHeader() {
    if (!calendarElement) return;
    
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    weekDays.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.textContent = day;
        calendarElement.appendChild(dayHeader);
    });
}

function renderDays(year, month) {
    if (!calendarElement) return;
    
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const prevLastDate = new Date(year, month, 0).getDate();
    
    // Dias do mês anterior
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = prevLastDate - i;
        renderDayCell(year, month - 1, day, true);
    }
    
    // Dias do mês atual
    for (let day = 1; day <= lastDate; day++) {
        renderDayCell(year, month, day, false);
    }
    
    // Dias do próximo mês
    const totalCells = calendarElement.children.length - 7;
    const remainingCells = 35 - totalCells;
    
    for (let day = 1; day <= remainingCells; day++) {
        renderDayCell(year, month + 1, day, true);
    }
}

function renderDayCell(year, month, day, isOtherMonth) {
    if (!calendarElement) return;
    
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
        
        // Verifica se é mensagem do usuário atual
        const isOwnMessage = messageData.userId === userId;
        if (isOwnMessage) {
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
// FUNÇÕES DE DADOS (LOCALSTORAGE)
// ============================================

/**
 * Carrega dados salvos do localStorage
 */
function loadSavedData() {
    try {
        // Se já tiver dados no cache, não precisa carregar
        if (Object.keys(calendarData).length > 0) {
            return;
        }
        
        const savedData = localStorage.getItem('calendar-data');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            
            // Copia para o cache em memória
            Object.keys(parsedData).forEach(key => {
                calendarData[key] = parsedData[key];
            });
            
            console.log('Dados carregados do localStorage:', Object.keys(calendarData).length, 'entradas');
        }
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        calendarData = {};
    }
}

/**
 * Salva uma mensagem no localStorage
 */
function saveMessageToLocal(year, month, day, message, isEdit = false) {
    const dayKey = getDayKey(year, month, day);
    const timestamp = new Date().toISOString();
    
    // Se não tiver userId no modo local, cria um
    if (!userId) {
        userId = 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    const messageData = {
        message: message.trim(),
        timestamp: timestamp,
        userId: userId,
        edited: isEdit
    };
    
    try {
        // Carrega dados existentes
        let localData = {};
        const savedData = localStorage.getItem('calendar-data');
        if (savedData) {
            localData = JSON.parse(savedData);
        }
        
        // Verifica se já existe (apenas para novas mensagens)
        if (!isEdit && localData[dayKey]) {
            throw new Error('Este dia já foi preenchido!');
        }
        
        // Atualiza os dados
        localData[dayKey] = messageData;
        
        // Salva no localStorage
        localStorage.setItem('calendar-data', JSON.stringify(localData));
        
        // Atualiza o cache em memória
        calendarData[dayKey] = messageData;
        
        console.log('Mensagem salva localmente:', dayKey);
        return true;
    } catch (error) {
        console.error('Erro ao salvar localmente:', error);
        throw error;
    }
}

// ============================================
// FUNÇÕES DO FIREBASE
// ============================================

/**
 * Verifica se o Firebase está disponível
 */
function checkFirebaseAvailability() {
    try {
        return !!(window.firebaseDb && window.firestore);
    } catch (error) {
        console.error('Erro ao verificar Firebase:', error);
        return false;
    }
}

/**
 * Tenta inicializar o Firebase em modo degradado
 */
async function initializeFirebaseWithFallback() {
    // Primeiro, tenta usar o Firebase normalmente
    if (checkFirebaseAvailability()) {
        try {
            operationMode = 'firebase';
            await setupFirebaseAuth();
            setupFirestoreListener();
            return true;
        } catch (error) {
            console.warn('Falha ao inicializar Firebase, usando fallback local:', error);
            operationMode = 'local';
            return false;
        }
    } else {
        operationMode = 'local';
        return false;
    }
}

/**
 * Configura a autenticação do Firebase
 */
async function setupFirebaseAuth() {
    return new Promise((resolve, reject) => {
        const maxAttempts = 30;
        let attempts = 0;
        
        const checkAuth = () => {
            attempts++;
            
            if (window.userId) {
                userId = window.userId;
                resolve();
            } else if (attempts >= maxAttempts) {
                reject(new Error('Timeout na autenticação do Firebase'));
            } else {
                setTimeout(checkAuth, 100);
            }
        };
        
        checkAuth();
    });
}

/**
 * Configura o listener do Firestore
 */
function setupFirestoreListener() {
    try {
        const db = window.firebaseDb;
        const calendarRef = window.firestore.collection(db, 'calendar');
        
        unsubscribeListener = window.firestore.onSnapshot(
            calendarRef,
            (snapshot) => {
                const newCalendarData = {};
                
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    newCalendarData[doc.id] = {
                        message: data.message,
                        timestamp: data.timestamp,
                        userId: data.userId,
                        edited: data.edited || false
                    };
                });
                
                calendarData = newCalendarData;
                renderCalendar();
                updateModeIndicator();
                hideLoading();
            },
            (error) => {
                console.error('Erro no listener do Firestore:', error);
                showWarning('Conexão com servidor perdida. Trabalhando em modo local.');
                operationMode = 'local';
                updateModeIndicator();
            }
        );
        
        return true;
    } catch (error) {
        console.error('Erro ao configurar listener do Firestore:', error);
        throw error;
    }
}

/**
 * Salva uma mensagem no Firestore
 */
async function saveMessageToFirestore(year, month, day, message, isEdit = false) {
    const dayKey = getDayKey(year, month, day);
    const timestamp = new Date().toISOString();
    
    const messageData = {
        message: message.trim(),
        timestamp: timestamp,
        userId: userId,
        edited: isEdit
    };
    
    try {
        const db = window.firebaseDb;
        const docRef = window.firestore.doc(db, 'calendar', dayKey);
        
        if (isEdit) {
            await window.firestore.setDoc(docRef, messageData);
        } else {
            const docSnap = await window.firestore.getDoc(docRef);
            
            if (docSnap.exists()) {
                throw new Error('Este dia já foi preenchido por outro usuário!');
            }
            
            await window.firestore.setDoc(docRef, messageData);
        }
        
        return true;
    } catch (error) {
        console.error('Erro ao salvar no Firestore:', error);
        throw error;
    }
}

/**
 * Remove uma mensagem do Firestore
 */
async function deleteMessageFromFirestore(year, month, day) {
    const dayKey = getDayKey(year, month, day);
    
    try {
        const db = window.firebaseDb;
        const docRef = window.firestore.doc(db, 'calendar', dayKey);
        await window.firestore.deleteDoc(docRef);
        return true;
    } catch (error) {
        console.error('Erro ao excluir do Firestore:', error);
        throw error;
    }
}

// ============================================
// FUNÇÕES DE OPERAÇÃO DE DADOS
// ============================================

async function saveMessage(year, month, day, message, isEdit = false) {
    try {
        showLoading();
        
        if (operationMode === 'firebase') {
            return await saveMessageToFirestore(year, month, day, message, isEdit);
        } else {
            return saveMessageToLocal(year, month, day, message, isEdit);
        }
    } catch (error) {
        console.error('Erro ao salvar mensagem:', error);
        alert(error.message || 'Erro ao salvar a mensagem. Por favor, tente novamente.');
        return false;
    } finally {
        hideLoading();
    }
}

async function saveMessageHandler() {
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
    
    if (saveMessageBtn) {
        saveMessageBtn.disabled = true;
        const originalText = saveMessageBtn.textContent;
        saveMessageBtn.textContent = 'Salvando...';
    }
    
    const success = await saveMessage(
        selectedDay.year,
        selectedDay.month,
        selectedDay.day,
        message,
        selectedDay.isEdit
    );
    
    if (saveMessageBtn) {
        saveMessageBtn.disabled = false;
        saveMessageBtn.textContent = originalText;
    }
    
    if (success) {
        closeModalWindow();
        renderCalendar();
    }
}

async function deleteMessage(year, month, day) {
    try {
        showLoading();
        
        const dayKey = getDayKey(year, month, day);
        const messageData = calendarData[dayKey];
        
        if (!messageData) {
            throw new Error('Mensagem não encontrada!');
        }
        
        if (messageData.userId !== userId) {
            throw new Error('Você só pode excluir suas próprias mensagens!');
        }
        
        if (!confirm('Tem certeza que deseja excluir esta mensagem?')) {
            hideLoading();
            return false;
        }
        
        if (operationMode === 'firebase') {
            await deleteMessageFromFirestore(year, month, day);
        } else {
            let localData = {};
            const savedData = localStorage.getItem('calendar-data');
            if (savedData) {
                localData = JSON.parse(savedData);
                delete localData[dayKey];
                localStorage.setItem('calendar-data', JSON.stringify(localData));
            }
        }
        
        delete calendarData[dayKey];
        renderCalendar();
        return true;
    } catch (error) {
        console.error('Erro ao excluir mensagem:', error);
        alert(error.message || 'Erro ao excluir a mensagem.');
        return false;
    } finally {
        hideLoading();
    }
}

// ============================================
// FUNÇÕES UTILITÁRIAS ADICIONAIS
// ============================================

function updateCharCount() {
    if (!messageInput || !charCount) return;
    
    const length = messageInput.value.length;
    charCount.textContent = length;
    charCount.style.color = length > 200 ? 'red' : '#666';
}

function showLoading() {
    if (loadingOverlay) {
        loadingOverlay.classList.add('active');
    }
}

function hideLoading() {
    if (loadingOverlay) {
        loadingOverlay.classList.remove('active');
    }
}

// ============================================
// CONFIGURAÇÃO DE EVENT LISTENERS
// ============================================

function setupEventListeners() {
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', previousMonth);
    }
    
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', nextMonth);
    }
    
    if (closeModal) {
        closeModal.addEventListener('click', closeModalWindow);
    }
    
    if (saveMessageBtn) {
        saveMessageBtn.addEventListener('click', saveMessageHandler);
    }
    
    window.addEventListener('click', (event) => {
        if (modal && event.target === modal) {
            closeModalWindow();
        }
    });
    
    if (messageInput) {
        messageInput.addEventListener('input', updateCharCount);
        messageInput.addEventListener('keydown', (event) => {
            if (event.ctrlKey && event.key === 'Enter') {
                saveMessageHandler();
            }
        });
    }
}

// ============================================
// INICIALIZAÇÃO
// ============================================

async function init() {
    console.log('Iniciando Calendário Colaborativo...');
    showLoading();
    
    try {
        setupEventListeners();
        
        const firebaseSuccess = await initializeFirebaseWithFallback();
        
        if (!firebaseSuccess) {
            loadSavedData();
        }
        
        if (!userId) {
            userId = 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
        
        renderCalendar();
        updateModeIndicator();
        
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showWarning('Erro ao inicializar. Usando modo local.');
        operationMode = 'local';
        loadSavedData();
        renderCalendar();
        updateModeIndicator();
    } finally {
        hideLoading();
    }
}

// ============================================
// ESTILOS E INICIALIZAÇÃO FINAL
// ============================================

// Adiciona estilos CSS para animações
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Inicia quando a página carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}