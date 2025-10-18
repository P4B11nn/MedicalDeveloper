// Herramienta de debugging para dropdown
console.log('🔧 Dropdown Debug Tool cargada');

// Función para debuggear el estado del dropdown
function debugDropdown() {
    console.log('=== DROPDOWN DEBUG ===');
    
    const userName = document.getElementById('userName');
    const userIcon = document.getElementById('userIcon');
    const userDropdown = document.getElementById('userDropdown');
    
    console.log('1. Elementos del DOM:');
    console.log('   - userName:', !!userName, userName?.textContent);
    console.log('   - userIcon:', !!userIcon);
    console.log('   - userDropdown:', !!userDropdown);
    
    if (userDropdown) {
        const styles = window.getComputedStyle(userDropdown);
        console.log('2. Estilos del dropdown:');
        console.log('   - display:', styles.display);
        console.log('   - position:', styles.position);
        console.log('   - zIndex:', styles.zIndex);
        console.log('   - top:', styles.top);
        console.log('   - right:', styles.right);
        console.log('   - visibility:', styles.visibility);
        console.log('   - opacity:', styles.opacity);
        
        console.log('3. Estilos inline:');
        console.log('   - display:', userDropdown.style.display);
        console.log('   - visibility:', userDropdown.style.visibility);
    }
    
    console.log('4. Funciones globales:');
    console.log('   - initUserDisplay:', typeof window.initUserDisplay);
    console.log('   - showLogoutConfirmModal:', typeof window.showLogoutConfirmModal);
    
    console.log('5. Event listeners en userIcon:');
    if (userIcon) {
        // Clonar para ver eventos (aproximado)
        console.log('   - userIcon tiene eventos:', userIcon.onclick ? 'onclick definido' : 'verificar addEventListener');
    }
    
    return {
        userName: !!userName,
        userIcon: !!userIcon,
        userDropdown: !!userDropdown,
        dropdownVisible: userDropdown?.style.display === 'block',
        functions: {
            initUserDisplay: typeof window.initUserDisplay,
            showLogoutConfirmModal: typeof window.showLogoutConfirmModal
        }
    };
}

// Función para forzar mostrar/ocultar dropdown
function toggleDropdownForce() {
    const userDropdown = document.getElementById('userDropdown');
    if (userDropdown) {
        const isVisible = userDropdown.style.display === 'block';
        userDropdown.style.display = isVisible ? 'none' : 'block';
        console.log('🔄 Dropdown forzado a:', isVisible ? 'hidden' : 'visible');
        
        // Debug después del cambio
        setTimeout(() => {
            debugDropdown();
        }, 100);
        
        return !isVisible;
    }
    return false;
}

// Función para simular click
function simulateClick() {
    const userIcon = document.getElementById('userIcon');
    if (userIcon) {
        console.log('👆 Simulando click en userIcon...');
        
        // Crear evento de click real
        const event = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        
        userIcon.dispatchEvent(event);
        
        setTimeout(() => {
            debugDropdown();
        }, 100);
    } else {
        console.error('❌ userIcon no encontrado');
    }
}

// Función para verificar que userDisplayGlobal funcione
function testUserDisplayGlobal() {
    console.log('🧪 Probando initUserDisplay...');
    
    if (typeof window.initUserDisplay === 'function') {
        try {
            window.initUserDisplay();
            console.log('✅ initUserDisplay ejecutado correctamente');
            
            setTimeout(() => {
                debugDropdown();
            }, 500);
        } catch (error) {
            console.error('❌ Error en initUserDisplay:', error);
        }
    } else {
        console.error('❌ initUserDisplay no está disponible');
    }
}

// Hacer funciones disponibles globalmente
window.debugDropdown = debugDropdown;
window.toggleDropdownForce = toggleDropdownForce;
window.simulateClick = simulateClick;
window.testUserDisplayGlobal = testUserDisplayGlobal;

// Auto-debug al cargar
setTimeout(() => {
    console.log('🔍 Auto-debug inicial:');
    debugDropdown();
}, 2000);

console.log('📋 Comandos disponibles:');
console.log('   - debugDropdown() - Ver estado completo');
console.log('   - toggleDropdownForce() - Forzar toggle');
console.log('   - simulateClick() - Simular click en userIcon');
console.log('   - testUserDisplayGlobal() - Probar initUserDisplay');