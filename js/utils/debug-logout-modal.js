/**
 * Herramienta de debug para el modal de logout
 */

console.log('🔍 Herramienta de debug para modal de logout cargada');

window.debugLogoutModal = function() {
    console.log('=== DEBUG MODAL LOGOUT ===');
    
    // 1. Verificar elementos del DOM
    const logoutBtn = document.getElementById('logoutBtn');
    const existingModal = document.querySelector('[id*="logout-confirmation-modal"]');
    
    console.log('1. Elementos del DOM:');
    console.log('   - Botón logout:', !!logoutBtn);
    console.log('   - Modal existente:', !!existingModal);
    
    if (logoutBtn) {
        console.log('   - Botón logout visible:', logoutBtn.offsetParent !== null);
        console.log('   - Event listeners en botón:', getEventListeners ? getEventListeners(logoutBtn) : 'No disponible en consola normal');
    }
    
    // 2. Verificar funciones disponibles
    console.log('2. Funciones disponibles:');
    console.log('   - window.showLogoutConfirmModal:', typeof window.showLogoutConfirmModal);
    console.log('   - window.showLogoutConfirmation:', typeof window.showLogoutConfirmation);
    console.log('   - UserDisplayGlobal.showLogoutConfirmation:', typeof window.UserDisplayGlobal?.showLogoutConfirmation);
    
    // 3. Verificar estado de UserDisplayGlobal
    console.log('3. Estado de UserDisplayGlobal:');
    console.log('   - Disponible:', !!window.UserDisplayGlobal);
    console.log('   - Configurado:', window.UserDisplayGlobal?.isConfigured);
    console.log('   - Funciones:', window.UserDisplayGlobal ? Object.keys(window.UserDisplayGlobal) : 'No disponible');
    
    return {
        logoutBtn: !!logoutBtn,
        existingModal: !!existingModal,
        showLogoutConfirmModal: typeof window.showLogoutConfirmModal,
        showLogoutConfirmation: typeof window.showLogoutConfirmation,
        userDisplayGlobal: !!window.UserDisplayGlobal,
        configured: window.UserDisplayGlobal?.isConfigured
    };
};

window.testLogoutFlow = function() {
    console.log('🧪 Probando flujo de logout...');
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        console.log('Simulando click en botón logout...');
        logoutBtn.click();
    } else {
        console.warn('Botón logout no encontrado');
    }
};

window.forceCloseLogoutModal = function() {
    console.log('🚫 Forzando cierre de modal de logout...');
    
    const modal = document.querySelector('[id*="logout-confirmation-modal"]');
    if (modal) {
        console.log('Modal encontrado, removiendo...');
        modal.remove();
        console.log('Modal removido');
    } else {
        console.log('No se encontró modal para cerrar');
    }
};

console.log('📋 Comandos disponibles:');
console.log('   - debugLogoutModal() - Debug completo');
console.log('   - testLogoutFlow() - Probar flujo de logout');
console.log('   - forceCloseLogoutModal() - Forzar cierre de modal');