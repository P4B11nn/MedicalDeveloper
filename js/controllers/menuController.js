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
  
  // Log menu initialization
  authModel.registrarActividad({
    accion: 'menu',
    descripcion: `Acceso al menú principal como ${currentUser.rol}`
  });
  
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
        // Registrar intento de navegación pero no redirigir
        authModel.registrarActividad({ accion: 'navegacion-bloqueada', descripcion: `Intento de navegar desde ${category}` });
      });
      return; // saltar configuración normal para este botón
    }

    button.addEventListener('click', () => {
      // Para otros botones, procesar navegación
      authModel.registrarActividad({
        accion: 'navegar',
        descripcion: `Navegando a sección ${category}`
      });
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
export function handleLogin(username, password) {
  // Validate inputs
  if (!username || !password) {
    showAlert('error', 'Por favor ingrese usuario y contraseña');
    return false;
  }
  
  // Attempt login
  const loginSuccess = authModel.login(username, password);
  
  if (loginSuccess) {
    // Log login activity
    authModel.registrarActividad({
      accion: 'login',
      descripcion: 'Usuario inició sesión correctamente'
    });
    
    // Redirect to menu
    window.location.href = 'menu.html';
    return true;
  } else {
    // Show error message
    showAlert('error', 'Usuario o contraseña incorrectos');
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