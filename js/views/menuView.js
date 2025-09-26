// js/views/menuView.js
// View for menu rendering and customization

/**
 * Renders the menu based on the current user's role
 * @param {Object} currentUser - The currently logged in user
 */
export function renderMenu(currentUser) {
    console.log('renderMenu - currentUser:', currentUser);
    
    if (!currentUser) {
        console.error('renderMenu: No hay información de usuario disponible');
        window.location.href = 'index.html';
        return;
    }
    
    const userNameSpan = document.getElementById('userName');
    const welcomeHeader = document.querySelector('h2');

    // Set user name in header
    if (userNameSpan) {
        const role = currentUser.rol;
        const roleIcon = (role === 'admin') ? '👑 ' : '👤 ';
        userNameSpan.innerHTML = `${roleIcon}${currentUser.nombre || ''}`;
    }
    
    // Set welcome message if exists
    if (welcomeHeader) welcomeHeader.innerHTML = `Bienvenido <strong>${currentUser.nombre}</strong>`;

    // Handle visibility of admin-only categories
    const operacionesBtn = document.querySelector('button[data-category="operaciones-control"]');
    const usuariosBtn = document.querySelector('button[data-category="usuarios-personal"]');
    
    if (operacionesBtn && usuariosBtn) {
        // Mostrar u ocultar botones según el rol
        if (currentUser.rol !== 'admin') {
            operacionesBtn.style.display = 'none';
            usuariosBtn.style.display = 'none';
        } else {
            operacionesBtn.style.display = 'flex';
            usuariosBtn.style.display = 'flex';
        }
    }
}

/**
 * Show or hide admin-only buttons based on user role
 * @param {Object} currentUser - The currently logged in user
 */
function handleAdminButtonsVisibility(currentUser) {
    // Get all admin-only buttons
    const adminButtons = document.querySelectorAll('#btnPersonal, #btnNuevoUsuario');
    
    // Show admin buttons only for admin users
    if (currentUser.rol === 'admin') {
        adminButtons.forEach(btn => {
            if (btn) btn.style.display = 'block';
        });
    } else {
        // Hide admin buttons for non-admin users
        adminButtons.forEach(btn => {
            if (btn) btn.style.display = 'none';
        });
    }
}