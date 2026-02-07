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
 * Verifica se o Firebase está disponível e funcionando (VERSÃO CORRIGIDA)
 */
function checkFirebaseAvailability() {
    try {
        console.log('Verificando disponibilidade do Firebase...');
        
        // Verifica se as variáveis globais do Firebase existem
        if (!window.firebaseDb || !window.firestore) {
            console.warn('Firebase não está disponível (firebaseDb ou firestore são undefined)');
            console.log('window.firebaseDb:', window.firebaseDb);
            console.log('window.firestore:', window.firestore);
            return false;
        }
        
        // Verifica se temos as funções essenciais do Firestore
        const essentialFunctions = ['collection', 'doc', 'setDoc', 'getDoc', 'deleteDoc', 'onSnapshot'];
        
        for (const funcName of essentialFunctions) {
            if (typeof window.firestore[funcName] !== 'function') {
                console.warn(`Função do Firestore ${funcName} não está disponível`);
                console.log(`window.firestore.${funcName}:`, window.firestore[funcName]);
                return false;
            }
        }
        
        console.log('✅ Firebase está disponível e pronto para uso');
        console.log('Funções disponíveis:', Object.keys(window.firestore));
        return true;
    } catch (error) {
        console.error('Erro ao verificar Firebase:', error);
        return false;
    }
}

/**
 * Tenta inicializar o Firebase em modo degradado
 */
async function initializeFirebaseWithFallback() {
    console.log('Tentando inicializar Firebase com fallback...');
    
    // Primeiro, tenta usar o Firebase normalmente
    if (checkFirebaseAvailability()) {
        try {
            operationMode = 'firebase';
            await setupFirebaseAuth();
            setupFirestoreListener();
            console.log('Firebase inicializado com sucesso no modo online');
            return true;
        } catch (error) {
            console.warn('Falha ao inicializar Firebase, usando fallback local:', error);
            operationMode = 'local';
            return false;
        }
    } else {
        console.warn('Firebase não disponível, usando modo local');
        operationMode = 'local';
        return false;
    }
}

/**
 * Configura a autenticação do Firebase
 */
async function setupFirebaseAuth() {
    return new Promise((resolve, reject) => {
        const maxAttempts = 30; // 3 segundos
        let attempts = 0;
        
        const checkAuth = () => {
            attempts++;
            
            if (window.userId) {
                userId = window.userId;
                console.log('Usuário autenticado no Firebase:', userId);
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
 * Configura o listener do Firestore (modo online)
 */
/**
 * Configura o listener do Firestore (VERSÃO CORRIGIDA)
 */
function setupFirestoreListener() {
    try {
        console.log('Configurando listener do Firestore...');
        
        // Usa as funções do Firestore corretamente
        const calendarRef = window.firestore.collection(window.firebaseDb, 'calendar');
        
        // Configura o listener em tempo real
        unsubscribeListener = window.firestore.onSnapshot(
            calendarRef,
            (snapshot) => {
                console.log('📊 Dados atualizados do Firestore:', snapshot.size, 'documentos');
                
                // Limpa dados anteriores
                const newCalendarData = {};
                
                // Processa todos os documentos
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    newCalendarData[doc.id] = {
                        message: data.message,
                        timestamp: data.timestamp,
                        userId: data.userId,
                        edited: data.edited || false
                    };
                });
                
                // Atualiza o cache em memória
                calendarData = newCalendarData;
                
                // Atualiza a interface
                renderCalendar();
                updateModeIndicator();
                hideLoading();
            },
            (error) => {
                console.error('❌ Erro no listener do Firestore:', error);
                showWarning('Conexão com servidor perdida. Trabalhando em modo local.');
                operationMode = 'local';
                updateModeIndicator();
            }
        );
        
        console.log('✅ Listener do Firestore configurado com sucesso');
        return true;
    } catch (error) {
        console.error('❌ Erro ao configurar listener do Firestore:', error);
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
            // Modo online: salva no Firestore
            const success = await saveMessageToFirestore(year, month, day, message, isEdit);
            return success;
        } else {
            // Modo offline: salva no localStorage
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
 * Salva uma mensagem no Firestore (VERSÃO CORRIGIDA)
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
        const docRef = window.firestore.doc(window.firebaseDb, 'calendar', dayKey);
        
        if (isEdit) {
            // Atualiza mensagem existente
            await window.firestore.setDoc(docRef, messageData);
            console.log('✅ Mensagem atualizada no Firestore:', dayKey);
        } else {
            // Verifica se já existe
            const docSnap = await window.firestore.getDoc(docRef);
            
            if (docSnap.exists()) {
                throw new Error('Este dia já foi preenchido por outro usuário!');
            }
            
            // Cria nova mensagem
            await window.firestore.setDoc(docRef, messageData);
            console.log('✅ Mensagem salva no Firestore:', dayKey);
        }
        
        return true;
    } catch (error) {
        console.error('❌ Erro ao salvar no Firestore:', error);
        throw error;
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
        
        // Verifica se é o autor
        if (messageData.userId !== userId) {
            throw new Error('Você só pode excluir suas próprias mensagens!');
        }
        
        // Confirma a exclusão
        if (!confirm('Tem certeza que deseja excluir esta mensagem?')) {
            hideLoading();
            return false;
        }
        
        if (operationMode === 'firebase') {
            // Modo online: exclui do Firestore
            const { doc, deleteDoc } = window.firestore;
            const db = window.db;
            
            const docRef = doc(db, 'calendar', dayKey);
            await deleteDoc(docRef);
            console.log('Mensagem excluída do Firestore:', dayKey);
        } else {
            // Modo offline: exclui do localStorage
            let localData = {};
            const savedData = localStorage.getItem('calendar-data');
            if (savedData) {
                localData = JSON.parse(savedData);
                delete localData[dayKey];
                localStorage.setItem('calendar-data', JSON.stringify(localData));
            }
            
            console.log('Mensagem excluída localmente:', dayKey);
        }
        
        // Remove do cache em memória
        delete calendarData[dayKey];
        
        // Atualiza a interface
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
        // Primeiro tenta carregar do cache em memória (se já tiver dados do Firestore)
        if (Object.keys(calendarData).length > 0) {
            console.log('Usando dados do cache em memória');
            return;
        }
        
        // Se não tiver dados no cache, carrega do localStorage
        const savedData = localStorage.getItem('calendar-data');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            
            // Copia para o cache em memória
            Object.keys(parsedData).forEach(key => {
                calendarData[key] = parsedData[key];
            });
            
            console.log('Dados carregados do localStorage:', Object.keys(calendarData).length, 'entradas');
        } else {
            console.log('Nenhum dado salvo encontrado');
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

// ============================================
// FUNÇÕES DE RENDERIZAÇÃO DO CALENDÁRIO
// ============================================

function renderCalendar() {
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
    
    currentMonthElement.textContent = `${monthNames[month]} ${year}`;
}

function renderWeekHeader() {
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    weekDays.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.textContent = day;
        calendarElement.appendChild(dayHeader);
    });
}

function renderDays(year, month) {
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
    
    saveMessageBtn.disabled = true;
    const originalText = saveMessageBtn.textContent;
    saveMessageBtn.textContent = 'Salvando...';
    
    const success = await saveMessage(
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
    loadingOverlay.classList.add('active');
}

function hideLoading() {
    loadingOverlay.classList.remove('active');
}

function updateCharCount() {
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
        // Tenta inicializar o Firebase
        const firebaseSuccess = await initializeFirebaseWithFallback();
        
        if (!firebaseSuccess) {
            // Modo local: carrega dados do localStorage
            loadSavedData();
            console.log('Usando modo local (offline)');
        }
        
        // Se não tiver userId (modo local), cria um
        if (!userId) {
            userId = 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            console.log('ID do usuário local criado:', userId);
        }
        
        // Renderiza o calendário
        renderCalendar();
        updateModeIndicator();
        
        console.log('Calendário pronto! Modo:', operationMode);
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

prevMonthBtn.addEventListener('click', previousMonth);
nextMonthBtn.addEventListener('click', nextMonth);
closeModal.addEventListener('click', closeModalWindow);
saveMessageBtn.addEventListener('click', saveMessageHandler);

window.addEventListener('click', (event) => {
    if (event.target === modal) {
        closeModalWindow();
    }
});

messageInput.addEventListener('input', updateCharCount);
messageInput.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key === 'Enter') {
        saveMessageHandler();
    }
});

// Estilos para animações
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

// Reset básico
{
    margin: 0;
    padding: 0;
    //box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    padding: 20px;
    color: #333;
    font-size: 16px; /* BASE para mobile */
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    background: white;
    border-radius: 20px;
    padding: 30px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

/* Header */
header {
    text-align: center;
    margin-bottom: 30px;
}

header h1 {
    font-size: 2.5rem;
    color: #667eea;
    margin-bottom: 10px;
}

.subtitle {
    color: #666;
    font-size: 1.1rem;
}

/* Controles de navegação */
.controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 10px;
}

#currentMonth {
    font-size: 1.8rem;
    color: #333;
    flex: 1;
    text-align: center;
}

.btn-nav {
    background: #667eea;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.3s;
    font-weight: 600;
}

.btn-nav:hover {
    background: #5568d3;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

/* Legenda */
.legend {
    display: flex;
    justify-content: center;
    gap: 30px;
    margin-bottom: 20px;
    flex-wrap: wrap;
}

.legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    color: #666;
}

.box {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 2px solid #ddd;
}

.box.available {
    background: #fff;
}

.box.filled {
    background: #a8e6cf;
    border-color: #4caf50;
}

.box.own {
    background: linear-gradient(135deg, #ffd89b 0%, #ffb347 100%);
    border-color: #ff9800;
}

/* Grid do calendário */
.calendar {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 10px;
    margin-bottom: 30px;
}

/* Cabeçalho dos dias da semana */
.day-header {
    text-align: center;
    font-weight: 700;
    color: #667eea;
    padding: 15px 5px;
    font-size: 0.9rem;
    background: #f0f4ff;
    border-radius: 8px;
}

/* Células dos dias */
.day-cell {
    background: white;
    border: 2px solid #e0e0e0;
    border-radius: 12px;
    padding: 15px 10px;
    min-height: 120px;
    cursor: pointer;
    transition: all 0.3s;
    position: relative;
    overflow: hidden;
}

.day-cell:hover {
    border-color: #667eea;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
    transform: translateY(-2px);
}

.day-cell.empty {
    background: #fafafa;
}

.day-cell.other-month {
    background: #f5f5f5;
    opacity: 0.5;
    cursor: default;
}

.day-cell.other-month:hover {
    transform: none;
    border-color: #e0e0e0;
    box-shadow: none;
}

.day-cell.filled {
    background: linear-gradient(135deg, #a8e6cf 0%, #8fd3c7 100%);
    border-color: #4caf50;
    cursor: default;
}

.day-cell.filled:hover {
    transform: none;
}

/* Mensagens do próprio usuário */
.day-cell.own-message {
    background: linear-gradient(135deg, #ffd89b 0%, #ffb347 100%);
    border-color: #ff9800;
    cursor: pointer;
}

.day-cell.own-message:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(255, 152, 0, 0.3);
}

/* Botões de ação (Editar/Excluir) */
.message-actions {
    display: flex;
    gap: 5px;
    margin-top: 8px;
    opacity: 0;
    transition: opacity 0.3s;
}

.day-cell.own-message:hover .message-actions {
    opacity: 1;
}

.btn-edit,
.btn-delete {
    flex: 1;
    padding: 4px 8px;
    border: none;
    border-radius: 4px;
    font-size: 0.7rem;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 600;
}

.btn-edit {
    background: #4CAF50;
    color: white;
}

.btn-edit:hover {
    background: #45a049;
    transform: scale(1.05);
}

.btn-delete {
    background: #f44336;
    color: white;
}

.btn-delete:hover {
    background: #da190b;
    transform: scale(1.05);
}

/* Label de editado */
.edited-label {
    font-size: 0.7rem;
    color: #666;
    font-style: italic;
    opacity: 0.8;
}

.day-number {
    font-weight: 700;
    font-size: 1.2rem;
    color: #333;
    margin-bottom: 8px;
}

.day-cell.other-month .day-number {
    color: #999;
}

.day-message {
    font-size: 0.85rem;
    color: #555;
    line-height: 1.4;
    word-wrap: break-word;
    max-height: 80px;
    overflow: auto;
}

.empty-state {
    color: #999;
    font-size: 0.8rem;
    font-style: italic;
    text-align: center;
}

/* Modal */
.modal {
    display: none;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.6);
    animation: fadeIn 0.3s;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.modal-content {
    background-color: white;
    margin: 10% auto;
    padding: 30px;
    border-radius: 16px;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    animation: slideIn 0.3s;
}

@keyframes slideIn {
    from {
        transform: translateY(-50px);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}

.close {
    color: #aaa;
    float: right;
    font-size: 28px;
    font-weight: bold;
    cursor: pointer;
    line-height: 20px;
}

.close:hover,
.close:focus {
    color: #000;
}

.modal-content h3 {
    margin-bottom: 20px;
    color: #333;
}

#modalDate {
    color: #667eea;
}

#messageInput {
    width: 100%;
    min-height: 120px;
    padding: 15px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 1rem;
    font-family: inherit;
    resize: vertical;
    margin-bottom: 10px;
    transition: border-color 0.3s;
}

#messageInput:focus {
    outline: none;
    border-color: #667eea;
}

.char-counter {
    text-align: right;
    color: #666;
    font-size: 0.85rem;
    margin-bottom: 15px;
}

.btn-save {
    width: 100%;
    background: #667eea;
    color: white;
    border: none;
    padding: 15px;
    border-radius: 8px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
}

.btn-save:hover {
    background: #5568d3;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-save:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
}

/* Loading overlay */
.loading-overlay {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.9);
    z-index: 2000;
    justify-content: center;
    align-items: center;
    flex-direction: column;
}

.loading-overlay.active {
    display: flex;
}

.spinner {
    border: 4px solid #f3f3f3;
    border-top: 4px solid #667eea;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    animation: spin 1s linear infinite;
    margin-bottom: 20px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* Info */
.info {
    background: #f0f4ff;
    padding: 20px;
    border-radius: 12px;
    border-left: 4px solid #667eea;
}

.info p {
    font-weight: 600;
    margin-bottom: 10px;
    color: #333;
}

.info ul {
    list-style: none;
    padding-left: 0;
}

.info li {
    padding: 5px 0;
    color: #666;
}

.info li:before {
    content: "✓ ";
    color: #4caf50;
    font-weight: bold;
    margin-right: 5px;
}

// ============================================
// CORREÇÃO DE EMERGÊNCIA PARA MOBILE
// ============================================

/**
 * Função que GARANTE que tudo está visível no mobile
 */
function corrigirMobileEmergencia() {
    const largura = window.innerWidth;
    const isMobile = largura <= 768;
    
    console.log(`📱 Largura: ${largura}px, Mobile: ${isMobile}`);
    
    if (isMobile) {
        console.log('🔧 Aplicando correções de emergência para mobile...');
        
        // 1. GARANTE que todos os números dos dias estão visíveis
        const todosNumeros = document.querySelectorAll('.day-number');
        console.log(`Encontrados ${todosNumeros.length} números de dias`);
        
        todosNumeros.forEach((numero, index) => {
            // Aplica estilos INLINE para garantir visibilidade
            numero.style.cssText = `
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                font-size: ${largura <= 480 ? '1rem' : '1.1rem'} !important;
                font-weight: 700 !important;
                color: #333 !important;
                margin-bottom: 6px !important;
            `;
        });
        
        // 2. GARANTE que todas as mensagens estão visíveis
        document.querySelectorAll('.day-message').forEach(mensagem => {
            mensagem.style.cssText = `
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                font-size: ${largura <= 480 ? '0.8rem' : '0.85rem'} !important;
                line-height: 1.3 !important;
                color: #555 !important;
                max-height: 60px !important;
                overflow-y: auto !important;
            `;
        });
        
        // 3. GARANTE altura mínima das células
        document.querySelectorAll('.day-cell').forEach(celula => {
            const altura = largura <= 480 ? '95px' : '100px';
            celula.style.minHeight = `${altura} !important`;
            celula.style.padding = largura <= 480 ? '8px 4px !important' : '10px 6px !important';
        });
        
        // 4. GARANTE que botões de ação estão visíveis
        document.querySelectorAll('.message-actions').forEach(acoes => {
            acoes.style.cssText = `
                opacity: 1 !important;
                display: flex !important;
                gap: 5px !important;
                margin-top: 8px !important;
            `;
        });
        
        // 5. Ajusta dias de outros meses (mantém visíveis mas com opacidade)
        document.querySelectorAll('.day-cell.other-month .day-number').forEach(numero => {
            numero.style.color = '#999 !important';
            numero.style.opacity = '0.7 !important';
        });
        
        console.log('✅ Correções de emergência aplicadas com sucesso!');
    }
}

/**
 * Verifica e aplica correções periodicamente
 */
function monitorarEMobile() {
    // Executa imediatamente
    corrigirMobileEmergencia();
    
    // Executa após renderização do calendário
    const renderOriginal = window.renderCalendar;
    if (renderOriginal) {
        window.renderCalendar = function() {
            const resultado = renderOriginal.apply(this, arguments);
            setTimeout(corrigirMobileEmergencia, 100);
            return resultado;
        };
    }
    
    // Executa a cada 2 segundos por segurança (apenas em mobile)
    if (window.innerWidth <= 768) {
        setInterval(corrigirMobileEmergencia, 2000);
    }
}

// ============================================
// INICIALIZAÇÃO
// ============================================

// Quando o DOM carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('📋 DOM carregado - Iniciando correções mobile');
        monitorarEMobile();
        
        // Aplica novamente após 1 segundo para garantir
        setTimeout(corrigirMobileEmergencia, 1000);
        setTimeout(corrigirMobileEmergencia, 2000);
    });
} else {
    // Se o DOM já estiver carregado
    console.log('📋 DOM já carregado - Aplicando correções mobile');
    monitorarEMobile();
}

// Quando a janela for redimensionada
window.addEventListener('resize', function() {
    setTimeout(corrigirMobileEmergencia, 300);
});

// ============================================
// FUNÇÃO DE TESTE PARA O CONSOLE
// ============================================

window.testeMobile = function() {
    console.log('🧪 Testando visibilidade mobile...');
    console.log(`Largura: ${window.innerWidth}px`);
    
    const numeros = document.querySelectorAll('.day-number');
    const mensagens = document.querySelectorAll('.day-message');
    const celulas = document.querySelectorAll('.day-cell');
    
    console.log(`✅ ${numeros.length} números de dias`);
    console.log(`✅ ${mensagens.length} mensagens`);
    console.log(`✅ ${celulas.length} células`);
    
    // Testa se estão visíveis
    numeros.forEach((num, i) => {
        const estilo = window.getComputedStyle(num);
        if (estilo.display === 'none' || estilo.visibility === 'hidden' || estilo.opacity === '0') {
            console.warn(`⚠️ Número ${i+1} NÃO está visível!`);
            console.warn(`   display: ${estilo.display}, visibility: ${estilo.visibility}, opacity: ${estilo.opacity}`);
        }
    });
    
    // Aplica correção de emergência
    corrigirMobileEmergencia();
    console.log('✅ Teste completo - Correções aplicadas');
};

// Comando rápido para forçar correção
window.arrumarMobile = function() {
    console.log('🔨 Forçando correção mobile...');
    corrigirMobileEmergencia();
    alert('Correção mobile aplicada! Verifique se as datas estão visíveis.');
};
