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
// DETECÇÃO E FALLBACK DO FIREBASE
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

// ============================================
// OPERAÇÕES DE DADOS (MODO ONLINE E OFFLINE)
// ============================================

/**
 * Salva uma mensagem (modo online ou offline)
 */
async function saveMessage(year, month, day, message, isEdit = false) {
    try {
        showLoading();
        
        if (operationMode === 'firebase') {
            const success = await saveMessageToFirestore(year, month, day, message, isEdit);
            return success;
        } else {
            const success = saveMessageToLocal(year, month, day, message, isEdit);
            return success;
        }
    } catch (error) {
        console.error('Erro ao salvar mensagem:', error);
        alert(error.message || 'Erro ao salvar a mensagem. Por favor, tente novamente.');
        return false;
    } finally {
        hideLoading();
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
 * Salva uma mensagem no localStorage
 */
function saveMessageToLocal(year, month, day, message, isEdit = false) {
    const dayKey = getDayKey(year, month, day);
    const timestamp = new Date().toISOString();
    
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
        let localData = {};
        const savedData = localStorage.getItem('calendar-data');
        if (savedData) {
            localData = JSON.parse(savedData);
        }
        
        if (!isEdit && localData[dayKey]) {
            throw new Error('Este dia já foi preenchido!');
        }
        
        localData[dayKey] = messageData;
        localStorage.setItem('calendar-data', JSON.stringify(localData));
        calendarData[dayKey] = messageData;
        
        return true;
    } catch (error) {
        console.error('Erro ao salvar localmente:', error);
        throw error;
    }
}

/**
 * Remove uma mensagem
 */
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
            const db = window.firebaseDb;
            const docRef = window.firestore.doc(db, 'calendar', dayKey);
            await window.firestore.deleteDoc(docRef);
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

/**
 * Carrega dados salvos
 */
function loadSavedData() {
    try {
        if (Object.keys(calendarData).length > 0) {
            return;
        }
        
        const savedData = localStorage.getItem('calendar-data');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            
            Object.keys(parsedData).forEach(key => {
                calendarData[key] = parsedData[key];
            });
        }
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        calendarData = {};
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
 * Atualiza o indicador de modo (online/offline)
 */
function updateModeIndicator() {
    const oldIndicator = document.getElementById('mode-indicator');
    if (oldIndicator) {
        oldIndicator.remove();
    }
    
    const indicator = document.createElement('div');
    indicator.id = 'mode-indicator';
    indicator.className = 'mode-indicator';
    
    if (operationMode === 'firebase') {
        indicator.textContent = '🟢 Online';
        indicator.classList.add('online');
    } else {
        indicator.textContent = '🟡 Local (offline)';
        indicator.classList.add('offline');
    }
    
    document.body.appendChild(indicator);
}

/**
 * Exibe uma mensagem de aviso
 */
function showWarning(message) {
    console.warn(message);
    
    const oldNotification = document.getElementById('temp-notification');
    if (oldNotification) {
        oldNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.id = 'temp-notification';
    notification.className = 'notification';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
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
    
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = prevLastDate - i;
        renderDayCell(year, month - 1, day, true);
    }
    
    for (let day = 1; day <= lastDate; day++) {
        renderDayCell(year, month, day, false);
    }
    
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

// ============================================
// FUNÇÕES DE NAVEGAÇÃO E UTILITÁRIAS
// ============================================

function previousMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
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

function updateCharCount() {
    if (!messageInput || !charCount) return;
    
    const length = messageInput.value.length;
    charCount.textContent = length;
    charCount.style.color = length > 200 ? 'red' : '#666';
}

// ============================================
// INICIALIZAÇÃO
// ============================================

async function init() {
    console.log('Iniciando Calendário Colaborativo...');
    showLoading();
    
    try {
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
// EVENT LISTENERS
// ============================================

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

// Inicia quando a página carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
