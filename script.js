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
/*
// Detectar dispositivo móvel e ajustar interface
function detectMobileAndAdjust() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        console.log('Dispositivo móvel detectado, aplicando ajustes...');
        
        // Adiciona classe ao body para estilos específicos
        document.body.classList.add('is-mobile');
        
        // Aumenta tamanho da fonte se for muito pequeno
        const baseFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
        if (baseFontSize < 16) {
            document.documentElement.style.fontSize = '16px';
        }
        
        // Ajusta altura mínima para toque
        document.querySelectorAll('.day-cell').forEach(cell => {
            if (cell.classList.contains('empty')) {
                cell.style.minHeight = '110px';
            }
        });
    }
}

// Chame esta função após init()
detectMobileAndAdjust();
*/
// Ajuste automático para dispositivos móveis
function adjustForMobile() {
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        console.log('Aplicando ajustes para mobile...');
        
        // Aumenta fontes
        document.querySelectorAll('.day-message').forEach(el => {
            el.style.fontSize = '14px';
            el.style.lineHeight = '1.4';
        });
        
        document.querySelectorAll('.day-number').forEach(el => {
            el.style.fontSize = '16px';
            el.style.fontWeight = 'bold';
        });
        
        document.querySelectorAll('.day-cell').forEach(el => {
            el.style.minHeight = '100px';
        });
        
        // Mostra botões de ação sempre
        document.querySelectorAll('.message-actions').forEach(el => {
            el.style.opacity = '1';
            el.style.display = 'flex';
        });
        
        // Ajusta cabeçalho
        const title = document.querySelector('header h1');
        if (title && window.innerWidth <= 480) {
            title.style.fontSize = '1.5rem';
        }
    }
}

// Executa após renderizar e quando redimensionar
window.addEventListener('resize', adjustForMobile);

// Chame após init() ou renderCalendar()
setTimeout(adjustForMobile, 1000);
