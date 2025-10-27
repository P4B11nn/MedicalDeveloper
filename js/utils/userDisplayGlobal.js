/**
 * Global User Display Manager
 * Ensures consistent user display and logout functionality across all pages
 */

import { authModel } from '../models/storageModel.js';
import eventBus, { EVENT_NAMES } from './eventBus.js';

// Hacer la función disponible globalmente INMEDIATAMENTE para que HeaderComponent pueda usarla
window.initUserDisplay = initUserDisplay;

/**
 * Initialize user display for any page
 * This is a centralized function to ensure consistent behavior
 */
export function initUserDisplay() {
    console.log('UserDisplayGlobal: Inicializando visualización de usuario');
    
    const currentUser = authModel.getCurrentUser();
    if (!currentUser) {
        console.warn('UserDisplayGlobal: No hay usuario autenticado');
        return false;
    }

    // Update user name display
    updateUserNameDisplay(currentUser);
    
    // Setup user icon click handler
    setupUserIconHandler();
    
    // Setup logout button
    setupLogoutHandler();
    
    // Setup profile button
    setupProfileHandler();
    
    // Setup click outside handler
    setupClickOutsideHandler();
    
    // Mark as configured
    if (window.UserDisplayGlobal) {
        window.UserDisplayGlobal.isConfigured = true;
    }
    
    console.log('UserDisplayGlobal: Visualización de usuario inicializada correctamente');
    return true;
}

/**
 * Update the user name display in the header
 */
function updateUserNameDisplay(user) {
    const userNameElement = document.getElementById('userName');
    if (!userNameElement) {
        console.warn('UserDisplayGlobal: Elemento userName no encontrado');
        return;
    }

    // Get role icon and display name
    const roleIcon = getRoleIcon(user.rol || user.role);
    const displayName = user.nombre || user.name || user.username || 'Usuario';
    
    // SIEMPRE actualizar el display con el icono de rol
    userNameElement.textContent = `${roleIcon} ${displayName}`;
    console.log(`UserDisplayGlobal: Nombre de usuario actualizado: ${displayName} (${user.rol || user.role}) con icono: ${roleIcon}`);

    // SIEMPRE actualizar el dropdown interno
    updateDropdownUserInfo(user);
    
    // Emit event
    eventBus.emit(EVENT_NAMES.USER_DISPLAY_UPDATED, {
        user: user,
        element: 'userName',
        roleIcon: roleIcon,
        displayName: displayName,
        timestamp: new Date().toISOString()
    });
}

/**
 * Update the dropdown user information
 */
function updateDropdownUserInfo(user) {
    const dropdownUserName = document.getElementById('dropdownUserName');
    const dropdownUserRole = document.getElementById('dropdownUserRole');
    
    const displayName = user.nombre || user.name || user.username || 'Usuario';
    const displayRole = getRoleDisplayName(user.rol || user.role || 'sin-rol');
    
    if (dropdownUserName) {
        dropdownUserName.textContent = displayName;
        console.log(`UserDisplayGlobal: Dropdown userName actualizado: ${displayName}`);
    }
    
    if (dropdownUserRole) {
        dropdownUserRole.textContent = displayRole;
        console.log(`UserDisplayGlobal: Dropdown userRole actualizado: ${displayRole}`);
    }
}

/**
 * Get display name for role
 */
function getRoleDisplayName(role) {
    switch (role) {
        case 'admin':
            return 'Administrador';
        case 'practicante':
            return 'Practicante';
        case 'supervisor':
            return 'Supervisor';
        default:
            return 'Usuario';
    }
}

/**
 * Get role icon based on user role
 * This is the centralized function for all role icons across the application
 */
function getRoleIcon(role) {
    console.log(`UserDisplayGlobal: Obteniendo icono para rol: ${role}`);
    switch (role) {
        case 'admin':
            return '🛡️';
        case 'practicante':
            return '👨‍⚕️';
        case 'supervisor':
            return '👨‍💼';
        case 'enfermero':
        case 'enfermera':
            return '👩‍⚕️';
        case 'doctor':
        case 'medico':
            return '👨‍⚕️';
        default:
            console.log(`UserDisplayGlobal: Rol no reconocido '${role}', usando icono por defecto`);
            return '👤';
    }
}

/**
 * Setup user icon click handler for dropdown toggle
 */
function setupUserIconHandler() {
    const userIcon = document.getElementById('userIcon');
    const userDropdown = document.getElementById('userDropdown');
    
    if (!userIcon) {
        console.warn('UserDisplayGlobal: Elemento userIcon no encontrado');
        return;
    }

    // Remove existing listeners más agresivamente
    const newUserIcon = userIcon.cloneNode(true);
    userIcon.parentNode.replaceChild(newUserIcon, userIcon);
    
    // Add new click listener
    newUserIcon.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('UserDisplayGlobal: Click en icono de usuario');
        
        if (userDropdown) {
            const isVisible = userDropdown.style.display === 'block';
            const newDisplay = isVisible ? 'none' : 'block';
            userDropdown.style.display = newDisplay;
            
            console.log(`UserDisplayGlobal: Dropdown ${isVisible ? 'ocultado' : 'mostrado'} - display set to: ${newDisplay}`);
            console.log('UserDisplayGlobal: Current computed display:', window.getComputedStyle(userDropdown).display);
            
            // Emit event
            eventBus.emit(EVENT_NAMES.USER_DROPDOWN_TOGGLED, {
                visible: !isVisible,
                display: newDisplay,
                timestamp: new Date().toISOString()
            });
        } else {
            console.warn('UserDisplayGlobal: userDropdown no encontrado');
        }
    });
    
    // También agregar listener al userName si existe
    const userName = document.getElementById('userName');
    if (userName) {
        const newUserName = userName.cloneNode(true);
        userName.parentNode.replaceChild(newUserName, userName);
        
        newUserName.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('UserDisplayGlobal: Click en userName, delegando a userIcon');
            newUserIcon.click();
        });
    }
    
    console.log('UserDisplayGlobal: Handler de icono de usuario configurado');
}

/**
 * Setup logout button handler
 */
function setupLogoutHandler() {
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (!logoutBtn) {
        console.warn('UserDisplayGlobal: Botón de logout no encontrado');
        return;
    }

    // Remove existing listeners
    const newLogoutBtn = logoutBtn.cloneNode(true);
    logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
    
    // Add new click listener
    newLogoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('UserDisplayGlobal: Click en botón de cerrar sesión');
        
        // Show elegant logout confirmation modal
        showLogoutConfirmation();
    });
    
    console.log('UserDisplayGlobal: Handler de logout configurado');
}

/**
 * Setup profile button handler
 */
function setupProfileHandler() {
    const profileBtn = document.getElementById('profileBtn');
    
    if (!profileBtn) {
        console.warn('UserDisplayGlobal: Botón de perfil no encontrado');
        return;
    }

    // Remove existing listeners
    const newProfileBtn = profileBtn.cloneNode(true);
    profileBtn.parentNode.replaceChild(newProfileBtn, profileBtn);
    
    // Add new click listener
    newProfileBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('UserDisplayGlobal: Click en botón de ver perfil');
        
        // Close dropdown
        const userDropdown = document.getElementById('userDropdown');
        if (userDropdown) {
            userDropdown.style.display = 'none';
        }
        
        // Show user profile
        if (typeof window.showUserProfile === 'function') {
            window.showUserProfile();
        } else {
            console.warn('UserDisplayGlobal: Función showUserProfile no disponible');
        }
    });
    
    console.log('UserDisplayGlobal: Handler de perfil configurado');
}

/**
 * Setup click outside handler to close dropdown
 */
function setupClickOutsideHandler() {
    const userDropdown = document.getElementById('userDropdown');
    const userIcon = document.getElementById('userIcon');
    
    if (!userDropdown || !userIcon) {
        console.warn('UserDisplayGlobal: Elementos para click outside no encontrados');
        return;
    }

    // Remove existing listener if any
    document.removeEventListener('click', handleClickOutside);
    
    // Add new listener
    document.addEventListener('click', handleClickOutside);
    
    function handleClickOutside(e) {
        if (!userIcon.contains(e.target) && !userDropdown.contains(e.target)) {
            if (userDropdown.style.display === 'block') {
                userDropdown.style.display = 'none';
                console.log('UserDisplayGlobal: Dropdown cerrado por click outside');
                
                eventBus.emit(EVENT_NAMES.USER_DROPDOWN_TOGGLED, {
                    visible: false,
                    source: 'click_outside',
                    timestamp: new Date().toISOString()
                });
            }
        }
    }
    
    console.log('UserDisplayGlobal: Handler de click outside configurado');
}

/**
 * Force refresh user display
 */
export function refreshUserDisplay() {
    console.log('UserDisplayGlobal: Forzando actualización de visualización');
    return initUserDisplay();
}

/**
 * Get current user display info
 */
export function getCurrentUserDisplayInfo() {
    const currentUser = authModel.getCurrentUser();
    const userNameElement = document.getElementById('userName');
    
    return {
        user: currentUser,
        isDisplayed: !!userNameElement && userNameElement.textContent.trim() !== '',
        displayText: userNameElement?.textContent || '',
        timestamp: new Date().toISOString()
    };
}

// Auto-initialize when module loads (only if not manually initialized)
document.addEventListener('DOMContentLoaded', () => {
    // Check if already initialized by manual call
    if (window.UserDisplayGlobal && window.UserDisplayGlobal.isConfigured) {
        console.log('UserDisplayGlobal: Ya inicializado manualmente, omitiendo auto-inicialización');
        return;
    }
    
    // Small delay to ensure other scripts have loaded
    setTimeout(() => {
        const currentUser = authModel.getCurrentUser();
        if (currentUser) {
            console.log('UserDisplayGlobal: Auto-inicializando visualización de usuario');
            initUserDisplay();
        }
    }, 100);
});

/**
 * Show elegant logout confirmation modal
 */
function showLogoutConfirmation() {
    console.log('🔍 showLogoutConfirmation() llamada');
    
    // Check if modal already exists
    const existingModal = document.querySelector('[id*="logout-confirmation-modal"]');
    if (existingModal) {
        console.warn('UserDisplayGlobal: Modal de logout ya existe, no creando duplicado');
        console.log('Existing modal:', existingModal);
        return;
    }

    console.log('UserDisplayGlobal: Creando nuevo modal de logout');

    // Create modal backdrop
    const modal = document.createElement('div');
    modal.id = 'logout-confirmation-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(8px);
        z-index: 15000;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease;
    `;

    modal.innerHTML = `
        <div style="
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(15px);
            border: 2px solid rgba(125, 211, 252, 0.3);
            border-radius: 25px;
            padding: 40px;
            box-shadow: 0 15px 35px rgba(125, 211, 252, 0.2);
            max-width: 450px;
            width: 90%;
            text-align: center;
            animation: slideUp 0.3s ease;
        ">
            <div style="
                width: 80px;
                height: 80px;
                border-radius: 50%;
                background: linear-gradient(135deg, #f87171, #fca5a5);
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 25px auto;
                box-shadow: 0 8px 20px rgba(248, 113, 113, 0.3);
            ">
                <i class="fas fa-sign-out-alt" style="
                    color: white;
                    font-size: 2rem;
                "></i>
            </div>
            
            <h3 style="
                margin: 0 0 15px 0;
                color: #1f2937;
                font-size: 1.4rem;
                font-weight: 600;
            ">Cerrar Sesión</h3>
            
            <p style="
                margin: 0 0 30px 0;
                color: #6b7280;
                font-size: 1rem;
                line-height: 1.5;
            ">¿Está seguro que desea cerrar sesión?<br>
            Será redirigido a la página de inicio.</p>
            
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button id="cancelar-logout" style="
                    background: linear-gradient(135deg, #e5e7eb, #d1d5db);
                    border: none;
                    border-radius: 20px;
                    padding: 12px 30px;
                    color: #374151;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-size: 1rem;
                " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    <i class="fas fa-times" style="margin-right: 8px;"></i>
                    Cancelar
                </button>
                
                <button id="confirmar-logout" style="
                    background: linear-gradient(135deg, #f87171, #fca5a5);
                    border: none;
                    border-radius: 20px;
                    padding: 12px 30px;
                    color: white;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-size: 1rem;
                " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    <i class="fas fa-sign-out-alt" style="margin-right: 8px;"></i>
                    Cerrar Sesión
                </button>
            </div>
        </div>
    `;

    // Add animation styles if not already present
    if (!document.getElementById('logout-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'logout-modal-styles';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from { 
                    transform: translateY(30px); 
                    opacity: 0; 
                }
                to { 
                    transform: translateY(0); 
                    opacity: 1; 
                }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(modal);

    // Event handlers with improved event handling
    const cancelButton = modal.querySelector('#cancelar-logout');
    const confirmButton = modal.querySelector('#confirmar-logout');
    
    if (cancelButton) {
        cancelButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🚫 UserDisplayGlobal: Usuario canceló cerrar sesión - BOTÓN CANCELAR');
            modal.style.animation = 'fadeIn 0.3s ease reverse';
            setTimeout(() => {
                if (modal.parentNode) {
                    console.log('🗑️ UserDisplayGlobal: Removiendo modal (cancelar)');
                    modal.remove();
                }
            }, 300);
        });
    }

    if (confirmButton) {
        confirmButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('UserDisplayGlobal: Usuario confirmó cerrar sesión');
            
            // Show loading state
            confirmButton.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i>Cerrando...';
            confirmButton.disabled = true;
            
            setTimeout(() => {
                // Emit logout event
                if (typeof eventBus !== 'undefined' && eventBus.emit) {
                    eventBus.emit(EVENT_NAMES.USER_LOGOUT, {
                        source: 'logout_button',
                        timestamp: new Date().toISOString()
                    });
                }
                
                // Clear session
                if (typeof authModel !== 'undefined' && authModel.logout) {
                    authModel.logout();
                }
                
                // Redirect to login
                const currentPath = window.location.pathname;
                const isInPagesFolder = currentPath.includes('/pages/');
                const loginPath = isInPagesFolder ? '../index.html' : 'index.html';
                
                console.log('UserDisplayGlobal: Redirigiendo a login:', loginPath);
                if (modal.parentNode) {
                    modal.remove();
                }
                window.location.href = loginPath;
            }, 1000);
        });
    }

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🚫 UserDisplayGlobal: Usuario canceló cerrar sesión (click fuera)');
            modal.style.animation = 'fadeIn 0.3s ease reverse';
            setTimeout(() => {
                if (modal.parentNode) {
                    console.log('🗑️ UserDisplayGlobal: Removiendo modal (click fuera)');
                    modal.remove();
                }
            }, 300);
        }
    });

    // Close on Escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            console.log('UserDisplayGlobal: Usuario canceló cerrar sesión (Escape)');
            modal.style.animation = 'fadeIn 0.3s ease reverse';
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.remove();
                }
                document.removeEventListener('keydown', handleEscape);
            }, 300);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

// Export functions globally for compatibility
window.UserDisplayGlobal = {
    initUserDisplay,
    updateUserNameDisplay,
    setupUserIconHandler,
    setupLogoutHandler,
    showLogoutConfirmation,
    getRoleIcon, // Exportar función de iconos de rol
    getRoleDisplayName, // Exportar función de nombres de rol
    isConfigured: false
};

// Auto-initialize when script loads (only if not manually initialized)
document.addEventListener('DOMContentLoaded', () => {
    // Check if already initialized by manual call
    if (window.UserDisplayGlobal && window.UserDisplayGlobal.isConfigured) {
        console.log('UserDisplayGlobal: Ya inicializado manualmente, omitiendo auto-inicialización');
        return;
    }
    
    setTimeout(() => {
        const currentUser = authModel.getCurrentUser();
        if (currentUser) {
            console.log('UserDisplayGlobal: Auto-inicializando visualización de usuario');
            initUserDisplay();
        }
    }, 100);
});

// Also export standalone functions for backward compatibility
window.initUserDisplay = initUserDisplay;
window.showLogoutConfirmation = showLogoutConfirmation;
window.getRoleIcon = getRoleIcon; // Hacer disponible globalmente
window.getRoleDisplayName = getRoleDisplayName; // Hacer disponible globalmente

/**
 * Mostrar perfil del usuario actual
 */
function showUserProfile() {
  const currentUser = authModel.getCurrentUser();
  if (!currentUser) {
    alert('No se pudo obtener la información del usuario actual');
    return;
  }

  // Crear modal de perfil
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;

  modal.innerHTML = `
    <div class="modal-content" style="
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 500px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    ">
      <div class="modal-header" style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 16px;
      ">
        <h2 style="margin: 0; color: #1f2937; font-size: 24px;">Mi Perfil</h2>
        <button class="close-btn" style="
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #6b7280;
          padding: 4px;
        ">&times;</button>
      </div>

      <div class="profile-info">
        <div class="info-section" style="margin-bottom: 20px;">
          <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 18px;">Información Personal</h3>
          <div class="info-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="info-item">
              <label style="display: block; font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; margin-bottom: 4px;">Nombre</label>
              <span style="color: #1f2937;">${currentUser.nombre || 'No especificado'}</span>
            </div>
            <div class="info-item">
              <label style="display: block; font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; margin-bottom: 4px;">Apellidos</label>
              <span style="color: #1f2937;">${currentUser.apellidos || 'No especificado'}</span>
            </div>
            <div class="info-item">
              <label style="display: block; font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; margin-bottom: 4px;">Email</label>
              <span style="color: #1f2937;">${currentUser.email || 'No especificado'}</span>
            </div>
            <div class="info-item">
              <label style="display: block; font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; margin-bottom: 4px;">Matrícula</label>
              <span style="color: #1f2937;">${currentUser.matricula || 'No especificado'}</span>
            </div>
            <div class="info-item">
              <label style="display: block; font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; margin-bottom: 4px;">Edad</label>
              <span style="color: #1f2937;">${currentUser.edad || 'No especificado'}</span>
            </div>
            <div class="info-item">
              <label style="display: block; font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; margin-bottom: 4px;">Sexo</label>
              <span style="color: #1f2937;">${currentUser.sexo === 'M' ? 'Masculino' : currentUser.sexo === 'F' ? 'Femenino' : 'No especificado'}</span>
            </div>
            <div class="info-item">
              <label style="display: block; font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; margin-bottom: 4px;">Rol</label>
              <span style="color: #1f2937;">${currentUser.rol === 'admin' ? 'Administrador' : currentUser.rol === 'practicante' ? 'Practicante' : currentUser.rol || 'No especificado'}</span>
            </div>
            <div class="info-item">
              <label style="display: block; font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; margin-bottom: 4px;">Grupo</label>
              <span style="color: #1f2937;">${currentUser.grupo_trabajo || 'Sin asignar'}</span>
            </div>
          </div>
        </div>

        <div class="profile-actions" style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
          <button id="changePasswordBtn" class="btn btn-primary" style="
            background: #3b82f6;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            width: 100%;
          ">
            <i class="fas fa-key" style="margin-right: 8px;"></i>
            Cambiar Contraseña
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Event listeners
  const closeBtn = modal.querySelector('.close-btn');
  const changePasswordBtn = modal.querySelector('#changePasswordBtn');

  closeBtn.addEventListener('click', () => {
    modal.remove();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  changePasswordBtn.addEventListener('click', () => {
    modal.remove();
    showChangePasswordModal();
  });
}

/**
 * Mostrar modal para cambiar contraseña
 */
function showChangePasswordModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;

  modal.innerHTML = `
    <div class="modal-content" style="
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    ">
      <div class="modal-header" style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 16px;
      ">
        <h2 style="margin: 0; color: #1f2937; font-size: 20px;">Cambiar Contraseña</h2>
        <button class="close-btn" style="
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #6b7280;
          padding: 4px;
        ">&times;</button>
      </div>

      <form id="changePasswordForm">
        <div class="form-group" style="margin-bottom: 16px;">
          <label for="currentPassword" style="display: block; margin-bottom: 8px; color: #374151; font-weight: 500;">Contraseña Actual</label>
          <input type="password" id="currentPassword" name="currentPassword" required style="
            width: 100%;
            padding: 12px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            font-size: 14px;
            box-sizing: border-box;
          ">
        </div>

        <div class="form-group" style="margin-bottom: 16px;">
          <label for="newPassword" style="display: block; margin-bottom: 8px; color: #374151; font-weight: 500;">Nueva Contraseña</label>
          <input type="password" id="newPassword" name="newPassword" required style="
            width: 100%;
            padding: 12px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            font-size: 14px;
            box-sizing: border-box;
          ">
          <div id="passwordStrengthIndicator" class="password-strength" style="
            margin-top: 8px;
            height: 4px;
            background: #e5e7eb;
            border-radius: 2px;
            overflow: hidden;
            display: none;
          ">
            <div class="strength-bar" style="
              height: 100%;
              width: 0%;
              transition: all 0.3s ease;
              border-radius: 2px;
            "></div>
          </div>
          <div id="passwordStrengthText" class="strength-text" style="
            margin-top: 4px;
            font-size: 12px;
            font-weight: 500;
            display: none;
          "></div>
        </div>

        <div class="form-group" style="margin-bottom: 24px;">
          <label for="confirmPassword" style="display: block; margin-bottom: 8px; color: #374151; font-weight: 500;">Confirmar Nueva Contraseña</label>
          <input type="password" id="confirmPassword" name="confirmPassword" required style="
            width: 100%;
            padding: 12px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            font-size: 14px;
            box-sizing: border-box;
          ">
        </div>

        <div class="form-actions" style="display: flex; gap: 12px; justify-content: flex-end;">
          <button type="button" class="btn btn-secondary cancel-btn" style="
            background: #6b7280;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
          ">Cancelar</button>
          <button type="submit" class="btn btn-primary" style="
            background: #10b981;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
          ">Cambiar Contraseña</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // Event listeners
  const closeBtn = modal.querySelector('.close-btn');
  const cancelBtn = modal.querySelector('.cancel-btn');
  const form = modal.querySelector('#changePasswordForm');
  const newPasswordInput = modal.querySelector('#newPassword');
  const strengthIndicator = modal.querySelector('#passwordStrengthIndicator');
  const strengthBar = modal.querySelector('.strength-bar');
  const strengthText = modal.querySelector('#passwordStrengthText');

  const closeModal = () => modal.remove();

  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Event listener para el indicador de fuerza de contraseña
  newPasswordInput.addEventListener('input', (e) => {
    const password = e.target.value;
    const strength = calculatePasswordStrength(password);

    if (password.length > 0) {
      strengthIndicator.style.display = 'block';
      strengthText.style.display = 'block';

      let width, color, text;
      switch (strength.level) {
        case 'weak':
          width = '33%';
          color = '#ef4444';
          text = 'Débil';
          break;
        case 'medium':
          width = '66%';
          color = '#f59e0b';
          text = 'Media';
          break;
        case 'strong':
          width = '100%';
          color = '#10b981';
          text = 'Fuerte';
          break;
        default:
          width = '0%';
          color = '#e5e7eb';
          text = '';
      }

      strengthBar.style.width = width;
      strengthBar.style.backgroundColor = color;
      strengthText.textContent = `Fuerza: ${text}`;
      strengthText.style.color = color;
    } else {
      strengthIndicator.style.display = 'none';
      strengthText.style.display = 'none';
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentPassword = form.currentPassword.value;
    const newPassword = form.newPassword.value;
    const confirmPassword = form.confirmPassword.value;

    // Validaciones
    if (newPassword !== confirmPassword) {
      alert('Las contraseñas nuevas no coinciden');
      return;
    }

    if (newPassword.length < 6) {
      alert('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      const success = await authModel.changePassword(currentPassword, newPassword);
      if (success) {
        alert('Contraseña cambiada exitosamente');
        closeModal();
      } else {
        alert('Error al cambiar la contraseña. Verifica tu contraseña actual.');
      }
    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      alert('Error al cambiar la contraseña: ' + error.message);
    }
  });
}

/**
 * Calcular la fuerza de una contraseña
 * @param {string} password - La contraseña a evaluar
 * @returns {object} - Objeto con el nivel de fuerza y puntaje
 */
function calculatePasswordStrength(password) {
  let score = 0;
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /\d/.test(password),
    specialChars: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  };

  // Puntaje por cada criterio cumplido
  Object.values(checks).forEach(check => {
    if (check) score += 20;
  });

  // Determinar nivel
  let level;
  if (score < 40) {
    level = 'weak';
  } else if (score < 80) {
    level = 'medium';
  } else {
    level = 'strong';
  }

  return { level, score, checks };
}

// Hacer las funciones disponibles globalmente
window.showUserProfile = showUserProfile;
window.showChangePasswordModal = showChangePasswordModal;