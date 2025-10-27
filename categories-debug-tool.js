// Debug tool específico para páginas de categorías
console.log('🔧 Categorías Dropdown Debug Tool cargada');

function debugCategoriesDropdown() {
    console.log('=== CATEGORÍAS DROPDOWN DEBUG ===');

    const userName = document.getElementById('userName');
    const userIcon = document.getElementById('userIcon');
    const userDropdown = document.getElementById('userDropdown');

    console.log('1. Elementos del DOM:');
    console.log('   - userName:', !!userName, userName?.textContent);
    console.log('   - userIcon:', !!userIcon);
    console.log('   - userDropdown:', !!userDropdown);

    if (userDropdown) {
        const styles = window.getComputedStyle(userDropdown);
        const rect = userDropdown.getBoundingClientRect();

        console.log('2. Estilos computados del dropdown:');
        console.log('   - display:', styles.display);
        console.log('   - position:', styles.position);
        console.log('   - zIndex:', styles.zIndex);
        console.log('   - top:', styles.top);
        console.log('   - right:', styles.right);
        console.log('   - visibility:', styles.visibility);
        console.log('   - opacity:', styles.opacity);
        console.log('   - width:', styles.width);
        console.log('   - height:', styles.height);

        console.log('3. Posición calculada (getBoundingClientRect):');
        console.log('   - top:', rect.top);
        console.log('   - right:', rect.right);
        console.log('   - bottom:', rect.bottom);
        console.log('   - left:', rect.left);
        console.log('   - width:', rect.width);
        console.log('   - height:', rect.height);

        console.log('4. Estilos inline:');
        console.log('   - display:', userDropdown.style.display);
        console.log('   - visibility:', userDropdown.style.visibility);
        console.log('   - zIndex:', userDropdown.style.zIndex);

        // Verificar si está oculto por algún elemento padre
        console.log('5. Elemento padre:');
        console.log('   - padre:', userDropdown.parentElement?.tagName);
        console.log('   - overflow del padre:', window.getComputedStyle(userDropdown.parentElement).overflow);
    }

    // Verificar otros elementos con z-index alto que puedan interferir
    console.log('6. Elementos con z-index alto:');
    document.querySelectorAll('*').forEach(el => {
        const zIndex = window.getComputedStyle(el).zIndex;
        if (zIndex !== 'auto' && parseInt(zIndex) > 1000) {
            console.log(`   - ${el.tagName}${el.id ? '#' + el.id : ''}${el.className ? '.' + el.className.split(' ')[0] : ''}: z-index ${zIndex}`);
        }
    });

    console.log('7. Funciones globales:');
    console.log('   - initUserDisplay:', typeof window.initUserDisplay);
    console.log('   - showLogoutConfirmModal:', typeof window.showLogoutConfirmModal);

    console.log('8. Event listeners (UserDisplayGlobal):');
    // Verificar si userDisplayGlobal está manejando los eventos
    console.log('   - EventBus disponible:', typeof eventBus !== 'undefined');

    return {
        elements: {
            userName: !!userName,
            userIcon: !!userIcon,
            userDropdown: !!userDropdown
        },
        dropdown: {
            visible: userDropdown?.style.display === 'block',
            computedDisplay: userDropdown ? window.getComputedStyle(userDropdown).display : 'N/A',
            zIndex: userDropdown ? window.getComputedStyle(userDropdown).zIndex : 'N/A'
        }
    };
}

function forceShowDropdown() {
    const userDropdown = document.getElementById('userDropdown');
    if (userDropdown) {
        console.log('🔧 Forzando mostrar dropdown...');

        // Aplicar estilos de fuerza bruta
        userDropdown.style.display = 'block';
        userDropdown.style.position = 'fixed';
        userDropdown.style.top = '80px';
        userDropdown.style.right = '60px';
        userDropdown.style.zIndex = '99999';
        userDropdown.style.background = 'white';
        userDropdown.style.border = '2px solid red'; // Para ver si aparece
        userDropdown.style.width = '200px';
        userDropdown.style.height = 'auto';
        userDropdown.style.visibility = 'visible';
        userDropdown.style.opacity = '1';

        console.log('✅ Estilos aplicados, dropdown debería ser visible');

        setTimeout(() => {
            debugCategoriesDropdown();
        }, 500);

        return true;
    }
    console.error('❌ userDropdown no encontrado');
    return false;
}

function testUserDisplayClick() {
    console.log('🧪 Probando UserDisplayGlobal click...');

    const userIcon = document.getElementById('userIcon');
    if (userIcon && typeof window.initUserDisplay === 'function') {

        // Ejecutar initUserDisplay para asegurar que esté configurado
        window.initUserDisplay();

        // Simular click después de un momento
        setTimeout(() => {
            const event = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            });

            userIcon.dispatchEvent(event);
            console.log('✅ Click simulado en userIcon');

            setTimeout(() => {
                debugCategoriesDropdown();
            }, 200);
        }, 500);

    } else {
        console.error('❌ userIcon o initUserDisplay no disponible');
    }
}

// Hacer funciones disponibles globalmente
window.debugCategoriesDropdown = debugCategoriesDropdown;
window.forceShowDropdown = forceShowDropdown;
window.testUserDisplayClick = testUserDisplayClick;

// Auto-debug al cargar
setTimeout(() => {
    console.log('🔧 Auto-debug para categorías:');
    debugCategoriesDropdown();
}, 3000);

console.log('🔧 Comandos para categorías:');
console.log('   - debugCategoriesDropdown() - Debug completo');
console.log('   - forceShowDropdown() - Forzar mostrar dropdown');
console.log('   - testUserDisplayClick() - Probar click de UserDisplayGlobal');
