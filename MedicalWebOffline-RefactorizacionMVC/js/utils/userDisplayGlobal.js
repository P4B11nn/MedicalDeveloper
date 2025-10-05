/**
 * Global User Display Manager
 * Ensures consistent user display and logout functionality across all pages
 */

import { authModel } from '../models/storageModel.js';
import eventBus, { EVENT_NAMES } from './eventBus.js';

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
    
    // Setup click outside handler
    setupClickOutsideHandler();
    
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

    // Get role icon
    const roleIcon = getRoleIcon(user.role);
    
    // Update display
    userNameElement.textContent = `${roleIcon} ${user.nombre || user.username || 'Usuario'}`;
    
    console.log(`UserDisplayGlobal: Nombre de usuario actualizado: ${user.nombre} (${user.role})`);
    
    // Emit event
    eventBus.emit(EVENT_NAMES.USER_DISPLAY_UPDATED, {
        user: user,
        element: 'userName',
        timestamp: new Date().toISOString()
    });
}

/**
 * Get role icon based on user role
 */
function getRoleIcon(role) {
    switch (role) {
        case 'admin':
            return '🛡️';
        case 'practicante':
            return '👨‍⚕️';
        default:
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

    // Remove existing listeners
    const newUserIcon = userIcon.cloneNode(true);
    userIcon.parentNode.replaceChild(newUserIcon, userIcon);
    
    // Add new click listener
    newUserIcon.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('UserDisplayGlobal: Click en icono de usuario');
        
        if (userDropdown) {
            const isVisible = userDropdown.style.display === 'block';
            userDropdown.style.display = isVisible ? 'none' : 'block';
            
            console.log(`UserDisplayGlobal: Dropdown ${isVisible ? 'ocultado' : 'mostrado'}`);
            
            // Emit event
            eventBus.emit(EVENT_NAMES.USER_DROPDOWN_TOGGLED, {
                visible: !isVisible,
                timestamp: new Date().toISOString()
            });
        } else {
            console.warn('UserDisplayGlobal: userDropdown no encontrado');
        }
    });
    
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

// Auto-initialize when module loads
document.addEventListener('DOMContentLoaded', () => {
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
    // Create modal backdrop
    const modal = document.createElement('div');
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

    // Event handlers
    modal.querySelector('#cancelar-logout').addEventListener('click', () => {
        console.log('UserDisplayGlobal: Usuario canceló cerrar sesión');
        modal.style.animation = 'fadeIn 0.3s ease reverse';
        setTimeout(() => modal.remove(), 300);
    });

    modal.querySelector('#confirmar-logout').addEventListener('click', () => {
        console.log('UserDisplayGlobal: Usuario confirmó cerrar sesión');
        
        // Show loading state
        const confirmBtn = modal.querySelector('#confirmar-logout');
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i>Cerrando...';
        confirmBtn.disabled = true;
        
        setTimeout(() => {
            // Emit logout event
            eventBus.emit(EVENT_NAMES.USER_LOGOUT, {
                source: 'logout_button',
                timestamp: new Date().toISOString()
            });
            
            // Clear session
            authModel.logout();
            
            // Redirect to login
            const currentPath = window.location.pathname;
            const isInPagesFolder = currentPath.includes('/pages/');
            const loginPath = isInPagesFolder ? '../index.html' : 'index.html';
            
            console.log('UserDisplayGlobal: Redirigiendo a login:', loginPath);
            modal.remove();
            window.location.href = loginPath;
        }, 1000);
    });

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            console.log('UserDisplayGlobal: Usuario canceló cerrar sesión (click fuera)');
            modal.style.animation = 'fadeIn 0.3s ease reverse';
            setTimeout(() => modal.remove(), 300);
        }
    });

    // Close on Escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            console.log('UserDisplayGlobal: Usuario canceló cerrar sesión (Escape)');
            modal.style.animation = 'fadeIn 0.3s ease reverse';
            setTimeout(() => modal.remove(), 300);
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}