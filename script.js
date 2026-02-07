// ============================================
// FUNÇÕES DE NAVEGAÇÃO E UTILITÁRIAS
// ============================================

/**
 * Vai para o mês anterior
 */
function previousMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
    corrigirMobileEmergencia(); // Aplica correções mobile
}

/**
 * Vai para o próximo mês
 */
function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
    corrigirMobileEmergencia(); // Aplica correções mobile
}

/**
 * Mostra overlay de carregamento
 */
function showLoading() {
    loadingOverlay.classList.add('active');
}

/**
 * Esconde overlay de carregamento
 */
function hideLoading() {
    loadingOverlay.classList.remove('active');
}

/**
 * Atualiza contador de caracteres
 */
function updateCharCount() {
    const length = messageInput.value.length;
    charCount.textContent = length;
    charCount.style.color = length > 200 ? 'red' : '#666';
}

// ============================================
// EVENT LISTENERS
// ============================================

// Configura os event listeners quando o DOM estiver pronto
function setupEventListeners() {
    console.log('Configurando event listeners...');
    
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
// INICIALIZAÇÃO
// ============================================

async function init() {
    console.log('Iniciando Calendário Colaborativo...');
    showLoading();
    
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
        
        // Renderiza o calendário
        renderCalendar();
        updateModeIndicator();
        
        // Aplica correções para mobile
        setTimeout(corrigirMobileEmergencia, 100);
        setTimeout(corrigirMobileEmergencia, 500);
        
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

// Inicia quando a página carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM completamente carregado - Iniciando aplicação');
        init();
        
        // Configura correções mobile
        monitorarEMobile();
    });
} else {
    // Se o DOM já estiver carregado
    console.log('DOM já carregado - Iniciando aplicação');
    init();
    monitorarEMobile();
}

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

// Comando para verificar listeners
window.verificarListeners = function() {
    console.log('🔍 Verificando event listeners...');
    console.log('prevMonthBtn listeners:', prevMonthBtn ? getEventListeners(prevMonthBtn) : 'Não encontrado');
    console.log('nextMonthBtn listeners:', nextMonthBtn ? getEventListeners(nextMonthBtn) : 'Não encontrado');
    
    // Função auxiliar para obter listeners
    function getEventListeners(element) {
        const listeners = [];
        const types = ['click', 'mouseover', 'mouseout', 'keydown', 'keyup'];
        
        types.forEach(type => {
            const listener = element[`on${type}`];
            if (listener) {
                listeners.push(`${type}: ${listener.toString()}`);
            }
        });
        
        return listeners.length > 0 ? listeners : 'Nenhum listener direto encontrado';
    }
};

// Comando para forçar renderização
window.recarregarCalendario = function() {
    console.log('🔄 Recarregando calendário...');
    renderCalendar();
    corrigirMobileEmergencia();
};
