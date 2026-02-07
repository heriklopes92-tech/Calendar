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

// Variável para armazenar o dia selecionado
let selectedDay = null;

// ============================================
// EXIBIÇÃO DE AVISOS
// ============================================

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
// CONFIGURAÇÃO DE EVENT LISTENERS
// ============================================

/**
 * Configura todos os event listeners
 */
function setupEventListeners() {
    console.log('Configurando event listeners...');
    
    // Tenta obter referências aos elementos DOM
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const closeModal = document.querySelector('.close');
    const saveMessageBtn = document.getElementById('saveMessage');
    const messageInput = document.getElementById('messageInput');
    const modal = document.getElementById('modal');
    
    // Verifica se os elementos existem antes de adicionar listeners
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', previousMonth);
        console.log('✅ Listener para mês anterior configurado');
    } else {
        console.error('❌ Botão prevMonthBtn não encontrado');
    }
    
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', nextMonth);
        console.log('✅ Listener para próximo mês configurado');
    } else {
        console.error('❌ Botão nextMonthBtn não encontrado');
    }
    
    if (closeModal) {
        closeModal.addEventListener('click', closeModalWindow);
        console.log('✅ Listener para fechar modal configurado');
    } else {
        console.error('❌ Botão closeModal não encontrado');
    }
    
    if (saveMessageBtn) {
        saveMessageBtn.addEventListener('click', saveMessageHandler);
        console.log('✅ Listener para salvar mensagem configurado');
    } else {
        console.error('❌ Botão saveMessageBtn não encontrado');
    }
    
    // Adiciona listener para fechar modal ao clicar fora
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
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
        console.log('✅ Listeners para input de mensagem configurados');
    } else {
        console.error('❌ Input messageInput não encontrado');
    }
    
    // Adiciona listener para redimensionamento da janela
    window.addEventListener('resize', function() {
        setTimeout(corrigirMobileEmergencia, 300);
    });
}

// ============================================
// MONITORAMENTO E CORREÇÕES PARA MOBILE
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
    console.log('📱 Iniciando monitoramento mobile...');
    
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
        console.log('📱 Agendando verificações periódicas para mobile...');
        setInterval(corrigirMobileEmergencia, 2000);
    }
}

// ============================================
// INICIALIZAÇÃO
// ============================================

async function init() {
    console.log('Iniciando Calendário Colaborativo...');
    
    // Primeiro, mostra loading
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('active');
    }
    
    try {
        // Configura os event listeners primeiro
        setupEventListeners();
        
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
        
        // Obtém referência ao calendário
        const calendarElement = document.getElementById('calendar');
        if (calendarElement) {
            renderCalendar();
        } else {
            console.error('❌ Elemento calendar não encontrado');
        }
        
        updateModeIndicator();
        
        // Aplica correções para mobile
        setTimeout(corrigirMobileEmergencia, 100);
        setTimeout(corrigirMobileEmergencia, 500);
        
        console.log('✅ Calendário pronto! Modo:', operationMode);
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showWarning('Erro ao inicializar. Usando modo local.');
        operationMode = 'local';
        loadSavedData();
        
        const calendarElement = document.getElementById('calendar');
        if (calendarElement) {
            renderCalendar();
        }
        updateModeIndicator();
    } finally {
        // Esconde loading
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
        }
    }
}

// ============================================
// CONFIGURAÇÃO INICIAL
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

// ============================================
// FUNÇÕES DE TESTE E DEPURAÇÃO
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

window.arrumarMobile = function() {
    console.log('🔨 Forçando correção mobile...');
    corrigirMobileEmergencia();
    alert('Correção mobile aplicada! Verifique se as datas estão visíveis.');
};

window.verificarListeners = function() {
    console.log('🔍 Verificando event listeners...');
    
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    
    if (prevMonthBtn) {
        console.log('prevMonthBtn encontrado, verificando listeners...');
    } else {
        console.error('prevMonthBtn não encontrado');
    }
    
    if (nextMonthBtn) {
        console.log('nextMonthBtn encontrado, verificando listeners...');
    } else {
        console.error('nextMonthBtn não encontrado');
    }
};

window.recarregarCalendario = function() {
    console.log('🔄 Recarregando calendário...');
    renderCalendar();
    corrigirMobileEmergencia();
};

// ============================================
// EXECUÇÃO INICIAL
// ============================================

// Verifica se estamos no navegador
if (typeof window !== 'undefined') {
    // Inicia quando a página carregar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            console.log('DOM completamente carregado - Iniciando aplicação');
            init();
            monitorarEMobile();
        });
    } else {
        // Se o DOM já estiver carregado
        console.log('DOM já carregado - Iniciando aplicação');
        init();
        monitorarEMobile();
    }
} else {
    console.error('Este script deve ser executado em um navegador');
}
