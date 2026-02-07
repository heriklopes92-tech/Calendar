// ============================================
// GARANTIA DE VISUALIZAÇÃO IGUAL EM TODOS OS DISPOSITIVOS
// ============================================

/**
 * Garante que a interface se mantém a mesma para computador e celular
 */
function garantirInterfaceConsistente() {
    const largura = window.innerWidth;
    
    console.log(`📱 Largura da tela: ${largura}px`);
    
    // Remove quaisquer estilos inline que possam interferir
    document.querySelectorAll('.day-number').forEach(numero => {
        numero.style.cssText = '';
    });
    
    document.querySelectorAll('.day-message').forEach(mensagem => {
        mensagem.style.cssText = '';
    });
    
    document.querySelectorAll('.day-cell').forEach(celula => {
        celula.style.minHeight = '';
        celula.style.padding = '';
    });
    
    document.querySelectorAll('.message-actions').forEach(acoes => {
        acoes.style.cssText = '';
    });
    
    // Aplica apenas ajustes MÍNIMOS se necessário
    if (largura <= 480) {
        console.log('📱 Aplicando ajustes mínimos para telas pequenas');
        
        // Garante que botões de ação estão sempre visíveis
        document.querySelectorAll('.message-actions').forEach(acoes => {
            acoes.style.cssText = 'opacity: 1 !important; display: flex !important;';
        });
    }
}

/**
 * Inicia o monitoramento da interface
 */
function iniciarMonitorInterface() {
    // Aplica imediatamente
    garantirInterfaceConsistente();
    
    // Monitora redimensionamento
    window.addEventListener('resize', function() {
        setTimeout(garantirInterfaceConsistente, 100);
    });
    
    // Aplica após renderização do calendário
    const renderOriginal = window.renderCalendar;
    if (renderOriginal) {
        window.renderCalendar = function() {
            const resultado = renderOriginal.apply(this, arguments);
            setTimeout(garantirInterfaceConsistente, 50);
            return resultado;
        };
    }
    
    console.log('👁️ Monitor de interface consistente iniciado');
}

// ============================================
// INICIALIZAÇÃO
// ============================================

// Inicia quando o DOM carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🚀 Iniciando garantia de interface consistente...');
        setTimeout(iniciarMonitorInterface, 1000); // Dá tempo para o CSS carregar
    });
} else {
    console.log('🚀 DOM pronto, aplicando interface consistente...');
    setTimeout(iniciarMonitorInterface, 1000);
}