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
        if (!window.firebaseDb) {
            console.warn('Firebase não está disponível (firebaseDb é undefined)');
            console.log('window.firebaseDb:', window.firebaseDb);
            console.log('window.firestore:', window.firestore);
            return false;
        }
        
        // Verifica se temos as funções essenciais do Firestore
        // As funções agora estão disponíveis globalmente via importação de módulos
        const essentialFunctions = ['collection', 'doc', 'setDoc', 'getDoc', 'deleteDoc', 'onSnapshot'];
        
        for (const funcName of essentialFunctions) {
            if (typeof window[funcName] !== 'function' && !window.firestore?.[funcName]) {
                console.warn(`Função do Firestore ${funcName} não está disponível`);
                return false;
            }
        }
        
        console.log('✅ Firebase está disponível e pronto para uso');
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
 * Configura o listener do Firestore (VERSÃO CORRIGIDA)
 */
function setupFirestoreListener() {
    try {
        console.log('Configurando listener do Firestore...');
        
        // Obtém as referências corretas das funções do Firestore
        // As funções agora podem estar disponíveis globalmente
        const db = window.firebaseDb;
        const firestoreFunctions = window.firestore || {};
        
        // Usa collection() corretamente
        const calendarRef = window.collection 
            ? window.collection(db, 'calendar')
            : (firestoreFunctions.collection ? firestoreFunctions.collection(db, 'calendar') : null);
        
        if (!calendarRef) {
            throw new Error('Função collection não disponível');
        }
        
        // Configura o listener em tempo real usando onSnapshot
        const onSnapshotFunc = window.onSnapshot || firestoreFunctions.onSnapshot;
        
        if (!onSnapshotFunc) {
            throw new Error('Função onSnapshot não disponível');
        }
        
        unsubscribeListener = onSnapshotFunc(
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
        operationMode = 'local';
        showWarning('Erro na conexão com o servidor. Trabalhando em modo local.');
        return false;
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
        // Obtém as funções do Firestore corretamente
        const db = window.firebaseDb;
        const docFunc = window.doc || (window.firestore && window.firestore.doc);
        const setDocFunc = window.setDoc || (window.firestore && window.firestore.setDoc);
        const getDocFunc = window.getDoc || (window.firestore && window.firestore.getDoc);
        
        if (!docFunc || !setDocFunc || !getDocFunc) {
            throw new Error('Funções do Firestore não disponíveis');
        }
        
        const docRef = docFunc(db, 'calendar', dayKey);
        
        if (isEdit) {
            // Atualiza mensagem existente
            await setDocFunc(docRef, messageData);
            console.log('✅ Mensagem atualizada no Firestore:', dayKey);
        } else {
            // Verifica se já existe
            const docSnap = await getDocFunc(docRef);
            
            if (docSnap.exists()) {
                throw new Error('Este dia já foi preenchido por outro usuário!');
            }
            
            // Cria nova mensagem
            await setDocFunc(docRef, messageData);
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
            const db = window.firebaseDb;
            const docFunc = window.doc || (window.firestore && window.firestore.doc);
            const deleteDocFunc = window.deleteDoc || (window.firestore && window.firestore.deleteDoc);
            
            if (!docFunc || !deleteDocFunc) {
                throw new Error('Funções do Firestore não disponíveis');
            }
            
            const docRef = docFunc(db, 'calendar', dayKey);
            await deleteDocFunc(docRef);
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
// FUNÇÕES UTILITÁRIAS (RESTANTE DO CÓDIGO MANTIDO IGUAL)
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

// ... (O restante do código permanece igual) ...

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
