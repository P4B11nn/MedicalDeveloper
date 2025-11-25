// js/controllers/menuController.js
// Controller for menu and navigation functionality

import { authModel } from '../models/storageModel.js';
import { renderUserList, setupUserForm, resetFormForNewUser } from '../views/userView.js';
import { renderMenu } from '../views/menuView.js';
import { renderActivityLog } from '../views/activityView.js';
import { showAlert, showConfirmation } from '../utils/modalUtil.js';

/**
 * Shows a custom confirmation modal
 * @param {string} title - Confirmation message title
 * @param {string} message - Confirmation message text
 * @param {function} callback - Function to execute on accept
 */
function showConfirmationModal(title, message, callback = null) {
  const modalConfirmacion = document.getElementById('modalConfirmacion');
  const tituloConfirmacion = document.getElementById('tituloConfirmacion');
  const mensajeConfirmacion = document.getElementById('mensajeConfirmacion');
  const btnAceptarConfirmacion = document.getElementById('btnAceptarConfirmacion');
  
  tituloConfirmacion.textContent = title;
  mensajeConfirmacion.textContent = message;
  
  // Configure accept button
  btnAceptarConfirmacion.onclick = () => {
    modalConfirmacion.style.display = 'none';
    if (callback && typeof callback === 'function') {
      callback();
    }
  };
  
  // Show modal
  modalConfirmacion.style.display = 'flex';
}

/**
 * Initialize the menu controller
 */
export function initMenuController() {
  console.log('Initializing menu controller...');
  
  // Check if user is logged in
  const currentUser = authModel.getCurrentUser();
  console.log('Menu Controller - Usuario actual:', currentUser);
  
  if (!currentUser) {
    // Redirect to login page if not logged in using direct redirect
    console.log('Menu Controller - No hay usuario, redirigiendo a index.html');
    window.location.href = 'index.html';
    return;
  }
  
  // Display welcome message
  document.title = `Medical Developer - Menu (${currentUser.rol})`;
  
  // Set user name in header
  const userNameSpan = document.getElementById('userName');
  if (userNameSpan) {
    const role = currentUser.rol;
    const roleIcon = (role === 'admin') ? '👑 ' : '👤 ';
    userNameSpan.innerHTML = `${roleIcon}${currentUser.nombre || ''}`;
  }
  
  // Render menu based on user role
  renderMenu(currentUser);
  
  // Setup user dropdown
  setupUserDropdown();
  
  // Setup activity buttons
  setupActivityButtons();
  
  // Setup category buttons
  setupCategoryButtons();
  
  // Setup admin features if needed
  if (currentUser.rol === 'admin') {
    setupAdminFeatures();
  } else {
    // Hide admin-only buttons for non-admin users
    const adminButtons = document.querySelectorAll('#btnPersonal, #btnNuevoUsuario');
    adminButtons.forEach(btn => {
      if (btn) btn.style.display = 'none';
    });
  }
  
  console.log('Menú inicializado correctamente');
}

/**
 * Set up user dropdown menu
 */
function setupUserDropdown() {
  const userIcon = document.getElementById('userIcon');
  const userDropdown = document.getElementById('userDropdown');
  
  if (userIcon && userDropdown) {
    userIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('hidden');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!userIcon.contains(e.target) && !userDropdown.contains(e.target)) {
        userDropdown.classList.add('hidden');
      }
    });
  }
  
  // Set up logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      showConfirmationModal('Cerrar Sesión', '¿Está seguro que desea cerrar la sesión?', () => {
        // Log activity
        authModel.registrarActividad({
          accion: 'logout',
          descripcion: 'Usuario cerró sesión'
        });
        
        // Logout and redirect
        authModel.logout();
        window.location.href = 'index.html';
      });
    };
  }

  // Registrar callback para refrescar datos cuando se restaure la conexión
  setTimeout(() => {
    if (window.advancedOfflineIndicator) {
      // AdvancedOfflineIndicator maneja automáticamente la reconexión
      window.addEventListener('online', async () => {
        console.log('🔄 Refrescando datos del menú principal tras restaurar conexión...');
        try {
          // Refrescar el menú principal y los datos de usuario
          await renderMenu();
          
          // Refrescar lista de usuarios si el modal está abierto
          const modalUsuario = document.getElementById('modalUsuario');
          if (modalUsuario && modalUsuario.style.display === 'flex') {
            await renderUserList();
          }

          // Refrescar el log de actividades si el modal está abierto
          const modalRegistroES = document.getElementById('modalRegistroES');
          if (modalRegistroES && modalRegistroES.style.display === 'flex') {
            await renderActivityLog('registroESLista');
          }

          console.log('✅ Datos del menú principal refrescados correctamente tras restaurar conexión');
        } catch (error) {
          console.error('❌ Error al refrescar datos del menú principal tras restaurar conexión:', error);
        }
      });
    } else {
      console.warn('⚠️ ConnectionIndicator no disponible para registrar callback de restauración de conexión en menuController');
    }
  }, 500);
}

/**
 * Set up activity log buttons
 */
function setupActivityButtons() {
  // Activity button in user dropdown
  const viewActivityBtn = document.getElementById('verActividadBtn');
  if (viewActivityBtn) {
    viewActivityBtn.addEventListener('click', () => {
      renderActivityLog('registroESLista');
      document.getElementById('modalRegistroES').style.display = 'flex';
      document.getElementById('userDropdown').style.display = 'none';
    });
  }

  // Activity button in main interface
  const activityLogBtn = document.getElementById('btnRegistroES');
  if (activityLogBtn) {
    activityLogBtn.addEventListener('click', () => {
      renderActivityLog('registroESLista');
      document.getElementById('modalRegistroES').style.display = 'flex';
    });
  }
  
  // Close activity log modal button
  const closeActivityBtn = document.getElementById('cerrarRegistroES');
  if (closeActivityBtn) {
    closeActivityBtn.addEventListener('click', () => {
      document.getElementById('modalRegistroES').style.display = 'none';
    });
  }
}

/**
 * Set up close buttons for all modals
 */
function setupModalCloseButtons() {
  // Close button for User modal
  const cerrarUsuarioBtn = document.getElementById('cerrarUsuario');
  const cancelarUsuarioBtn = document.getElementById('cancelarUsuario');
  
  if (cerrarUsuarioBtn) {
    cerrarUsuarioBtn.addEventListener('click', () => {
      document.getElementById('modalUsuario').style.display = 'none';
    });
  }
  
  if (cancelarUsuarioBtn) {
    cancelarUsuarioBtn.addEventListener('click', () => {
      document.getElementById('modalUsuario').style.display = 'none';
    });
  }
  
  // Close button for Personal modal
  const cerrarPersonalBtn = document.getElementById('cerrarPersonal');
  if (cerrarPersonalBtn) {
    cerrarPersonalBtn.addEventListener('click', () => {
      document.getElementById('modalPersonal').style.display = 'none';
    });
  }
}

/**
 * Set up category navigation buttons
 */
function setupCategoryButtons() {
  const categoryButtons = document.querySelectorAll('.menu button[data-category]');
  categoryButtons.forEach(button => {
    const category = button.getAttribute('data-category');

    // Bloquear navegación para operaciones-control: el botón sólo debe mostrar submenu
    if (category === 'operaciones-control') {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('menuController: Click en operaciones-control bloqueado (no navega)');
      });
      return; // saltar configuración normal para este botón
    }

    button.addEventListener('click', () => {
      // Para otros botones, procesar navegación
      window.location.href = `/js/views/pages/categoria-${category}.html`;
    });
  });
}

/**
 * Set up admin-specific features
 */
function setupAdminFeatures() {
  // Staff management button
  const staffBtn = document.getElementById('btnPersonal');
  if (staffBtn) {
    staffBtn.addEventListener('click', () => {
      renderUserList();
      document.getElementById('modalPersonal').style.display = 'flex';
    });
  }
  
  // Set up user form
  setupUserForm();
  
  // New user button from menu
  const newUserBtn = document.getElementById('btnNuevoUsuario');
  if (newUserBtn) {
    newUserBtn.addEventListener('click', () => {
      resetFormForNewUser();
      document.getElementById('modalUsuario').style.display = 'flex';
    });
  }
  
  // Alternative new user button
  const registerUserBtn = document.getElementById('btnRegistrarUsuario');
  if (registerUserBtn) {
    registerUserBtn.addEventListener('click', () => {
      resetFormForNewUser();
      document.getElementById('modalUsuario').style.display = 'flex';
    });
  }
  
  // Setup close buttons for modals
  setupModalCloseButtons();
}

/**
 * Handle authentication for login
 */
export async function handleLogin(username, password) {
  // Validate inputs
  if (!username || !password) {
    showAlert('error', 'Por favor ingrese usuario y contraseña');
    return false;
  }
  
  try {
    // Attempt login
    const user = await authModel.login(username, password);
    
    if (user) {
      // Log login activity
      authModel.registrarActividad({
        accion: 'login',
        descripcion: 'Usuario inició sesión correctamente'
      });
      
      // Check if password reset is required
      if (user.passwordResetRequired) {
        console.log('🔐 Usuario tiene contraseña temporal, mostrando modal de cambio de contraseña');
        showPasswordChangeModal(user);
        return true; // Login successful, but password change required
      }
      
      // Redirect to menu
      window.location.href = 'menu.html';
      return true;
    } else {
      // Show error message
      showAlert('error', 'Usuario o contraseña incorrectos');
      return false;
    }
  } catch (error) {
    console.error('Error en login:', error);
    showAlert('error', 'Error al iniciar sesión: ' + error.message);
    return false;
  }
}

/**
 * Initialize the login page
 */
export function initLoginPage() {
  console.log('Initializing login page...');
  
  // Check if user is already logged in
  const currentUser = authModel.getCurrentUser();
  if (currentUser) {
    // Redirect to menu if already logged in
    window.location.href = 'menu.html';
    return;
  }
  
  // Set up login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      
      handleLogin(username, password);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('Página de menú cargada.');
  
  // Check if this is the login page
  if (document.getElementById('loginForm')) {
    initLoginPage();
  } else {
    // Otherwise initialize the main menu
    initMenuController();
  }
});

/**
 * Muestra un modal para que el usuario cambie su contraseña temporal
 * @param {Object} user - Datos del usuario
 */
function showPasswordChangeModal(user) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
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
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      text-align: center;
    ">
      <div class="modal-header" style="margin-bottom: 20px;">
        <div style="font-size: 48px; margin-bottom: 16px;">🔐</div>
        <h2 style="margin: 0; color: #1f2937; font-size: 20px;">Cambiar Contraseña</h2>
        <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px;">
          Has iniciado sesión con una contraseña temporal. Debes cambiarla por una nueva.
        </p>
      </div>

      <div class="password-form" style="margin-bottom: 24px;">
        <div style="margin-bottom: 16px; text-align: left;">
          <label style="display: block; margin-bottom: 4px; color: #374151; font-weight: 500;">
            Nueva Contraseña
          </label>
          <input type="password" id="newPassword" placeholder="Ingresa tu nueva contraseña"
                 style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px;">
        </div>

        <div style="margin-bottom: 16px; text-align: left;">
          <label style="display: block; margin-bottom: 4px; color: #374151; font-weight: 500;">
            Confirmar Contraseña
          </label>
          <input type="password" id="confirmPassword" placeholder="Confirma tu nueva contraseña"
                 style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px;">
        </div>

        <div id="passwordError" style="color: #ef4444; font-size: 14px; margin-top: 8px; display: none;">
        </div>
      </div>

      <div class="modal-actions" style="display: flex; gap: 12px; justify-content: center;">
        <button id="changePasswordBtn" class="btn btn-primary" style="
          background: #3b82f6;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          flex: 1;
        ">
          Cambiar Contraseña
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Event listeners
  const changeBtn = modal.querySelector('#changePasswordBtn');
  const newPasswordInput = modal.querySelector('#newPassword');
  const confirmPasswordInput = modal.querySelector('#confirmPassword');
  const errorDiv = modal.querySelector('#passwordError');

  changeBtn.addEventListener('click', async () => {
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Validar contraseñas
    if (!newPassword || !confirmPassword) {
      errorDiv.textContent = 'Por favor completa ambos campos';
      errorDiv.style.display = 'block';
      return;
    }

    if (newPassword !== confirmPassword) {
      errorDiv.textContent = 'Las contraseñas no coinciden';
      errorDiv.style.display = 'block';
      return;
    }

    if (newPassword.length < 6) {
      errorDiv.textContent = 'La contraseña debe tener al menos 6 caracteres';
      errorDiv.style.display = 'block';
      return;
    }

    // Deshabilitar botón mientras procesa
    changeBtn.disabled = true;
    changeBtn.textContent = 'Cambiando...';

    try {
      // Cambiar la contraseña directamente (usuario ya autenticado con contraseña temporal)
      const { auth } = await import('../models/firebaseConfig.js');
      const { updatePassword } = await import('https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js');
      
      await updatePassword(auth.currentUser, newPassword);

      // Limpiar flags de reset en Firestore
      await authModel.updateUser(user.uid, {
        passwordResetRequired: false,
        temporaryPassword: null,
        passwordResetTimestamp: null
      });

      // Actualizar usuario en sessionStorage
      const updatedUser = { ...user, passwordResetRequired: false };
      sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));

      // Cerrar modal y redirigir
      modal.remove();
      showAlert('success', 'Contraseña cambiada exitosamente');
      window.location.href = 'menu.html';

    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      errorDiv.textContent = 'Error al cambiar la contraseña: ' + error.message;
      errorDiv.style.display = 'block';

      // Rehabilitar botón
      changeBtn.disabled = false;
      changeBtn.textContent = 'Cambiar Contraseña';
    }
  });

  // Permitir cambiar contraseña con Enter
  [newPasswordInput, confirmPasswordInput].forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        changeBtn.click();
      }
    });
  });

  // Limpiar errores cuando el usuario escribe
  [newPasswordInput, confirmPasswordInput].forEach(input => {
    input.addEventListener('input', () => {
      errorDiv.style.display = 'none';
    });
  });
}
