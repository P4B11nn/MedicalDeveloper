import { authModel } from '../models/storageModel.js';
import { AuthGuard } from '../middleware/authGuard.js';
import eventBus, { EVENT_NAMES } from '../utils/eventBus.js';
import { registrarEntrada, registrarSalida } from '../models/operacionesModel.js';
import { setupEventLogging } from '../utils/eventLogger.js';

/**
 * Inicializa la lógica global común para todas las páginas (excepto login)
 */
export function initGlobalController() {
  console.log('GlobalController: Inicializando controlador global');
  
  // Inicializar el sistema de registro de eventos
  setupEventLogging();
  
  // El AuthGuard ya maneja la verificación de autenticación
  const usuarioActual = authModel.getCurrentUser();
  if (!usuarioActual) {
    console.warn('GlobalController: No hay usuario autenticado');
    return;
  }

  console.log(`GlobalController: Usuario autenticado - ${usuarioActual.nombre} (${usuarioActual.role || usuarioActual.rol})`);

  // Registrar entrada del usuario si no está ya registrada
  registrarEntradaUsuario(usuarioActual);

  // Suscribirse a eventos del Event Bus
  setupEventListeners();

  // Mostrar información del usuario
  displayUserInfo(usuarioActual);
  
  // Configurar menú de usuario
  setupUserDropdown();
  
  // Configurar botón de cerrar sesión
  setupLogoutButton();
  
  // Configurar navegación con botón de regreso
  setupBackButton();
  
  console.log('GlobalController: Inicialización completada');
}

/**
 * Registra la entrada del usuario actual
 */
function registrarEntradaUsuario(usuario) {
  try {
    // Verificar si ya tiene una sesión activa
    const historial = JSON.parse(localStorage.getItem('servicioHistorial')) || [];
    const sesionActiva = historial.find(r => 
      r.matricula === usuario.matricula && 
      r.salida === null
    );
    
    if (!sesionActiva) {
      const registro = registrarEntrada(usuario);
      if (registro) {
        console.log('GlobalController: Entrada registrada automáticamente');
        
        // Emitir evento de nueva entrada
        eventBus.emit(EVENT_NAMES.OPERACION_CREATED, {
          type: 'entrada',
          usuario: usuario,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      console.log('GlobalController: Usuario ya tiene sesión activa');
    }
  } catch (error) {
    console.error('Error registrando entrada automática:', error);
  }
}

/**
 * Configurar listeners de eventos globales
 */
function setupEventListeners() {
  console.log('GlobalController: Configurando Event Bus listeners');
  
  // Escuchar logout para limpiar UI
  eventBus.on(EVENT_NAMES.USER_LOGOUT, (data) => {
    console.log('GlobalController: Usuario deslogueado, limpiando UI');
    cleanup();
  });
  
  // Escuchar eventos de permisos denegados
  eventBus.on(EVENT_NAMES.PERMISSION_DENIED, (data) => {
    console.warn('GlobalController: Permiso denegado', data);
    showPermissionDeniedMessage(data);
  });
  
  // Escuchar eventos de navegación
  eventBus.on(EVENT_NAMES.NAVIGATE_TO, (data) => {
    console.log('GlobalController: Navegación solicitada', data);
    handleNavigation(data);
  });
  
  // Escuchar eventos de botón de regreso
  eventBus.on(EVENT_NAMES.BACK_BUTTON_CLICKED, () => {
    console.log('GlobalController: Botón de regreso clickeado via Event Bus');
    goBackToMenu();
  });

  // Escuchar eventos de visualización de usuario
  eventBus.on(EVENT_NAMES.USER_DISPLAY_UPDATED, (data) => {
    console.log('GlobalController: Visualización de usuario actualizada', data);
  });

  // Escuchar eventos de dropdown de usuario
  eventBus.on(EVENT_NAMES.USER_DROPDOWN_TOGGLED, (data) => {
    console.log('GlobalController: Dropdown de usuario toggle', data);
  });
}

/**
 * Mostrar información del usuario en la interfaz
 */
function displayUserInfo(usuario) {
  const userNameSpan = document.getElementById('userName');
  if (userNameSpan) {
    let rolIcon = '';
    // Corregir los iconos de rol
    switch (usuario.rol || usuario.role) {
      case 'admin':
        rolIcon = '🛡️ ';
        break;
      case 'practicante':
        rolIcon = '👨‍⚕️ ';
        break;
      default:
        rolIcon = '👤 ';
    }
    userNameSpan.textContent = `${rolIcon}${usuario.nombre}`;
    console.log(`GlobalController: Info de usuario mostrada - ${usuario.nombre} (${usuario.rol || usuario.role})`);
  } else {
    console.warn('GlobalController: Elemento userName no encontrado');
  }
}

/**
 * Configurar el dropdown del menú de usuario
 */
function setupUserDropdown() {
  const userIcon = document.getElementById('userIcon');
  const userDropdown = document.getElementById('userDropdown');
  
  if (userIcon && userDropdown) {
    userIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = userDropdown.style.display === 'block';
      userDropdown.style.display = isVisible ? 'none' : 'block';
      console.log(`GlobalController: Dropdown ${isVisible ? 'cerrado' : 'abierto'}`);
    });

    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (!userIcon.contains(e.target) && !userDropdown.contains(e.target)) {
        userDropdown.style.display = 'none';
      }
    });
    
    console.log('GlobalController: Dropdown del usuario configurado');
  } else {
    console.warn('GlobalController: Elementos del dropdown no encontrados');
  }
}

/**
 * Configurar el botón de cerrar sesión
 */
function setupLogoutButton() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      console.log('GlobalController: Solicitud de logout');
      
      // Crear modal de confirmación elegante en lugar del confirm nativo
      showLogoutConfirmModal();
    });
    
    console.log('GlobalController: Botón de logout configurado');
  } else {
    console.warn('GlobalController: Botón de logout no encontrado');
  }
}

/**
 * Muestra un modal de confirmación elegante para cerrar sesión
 */
function showLogoutConfirmModal() {
  // Crea el overlay del modal
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(5px);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  modalOverlay.innerHTML = `
    <div style="
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border: 2px solid rgba(125, 211, 252, 0.3);
      border-radius: 20px;
      padding: 30px;
      text-align: center;
      box-shadow: 0 8px 25px rgba(125, 211, 252, 0.2);
      max-width: 400px;
      width: 90%;
    ">
      <h3 style="
        margin: 0 0 20px 0;
        color: #1f2937;
        font-size: 1.4rem;
        font-weight: 600;
      ">Cerrar Sesión</h3>
      
      <p style="
        margin: 0 0 25px 0;
        color: #4b5563;
        font-size: 1rem;
        line-height: 1.5;
      ">¿Estás seguro de que deseas cerrar la sesión?</p>
      
      <div style="
        display: flex;
        gap: 15px;
        justify-content: center;
      ">
        <button id="btn-cancel-logout" style="
          background: linear-gradient(135deg, #e5e7eb, #d1d5db);
          border: none;
          border-radius: 20px;
          padding: 12px 25px;
          color: #374151;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        ">Cancelar</button>
        
        <button id="btn-confirm-logout" style="
          background: linear-gradient(135deg, #f87171, #fca5a5);
          border: none;
          border-radius: 20px;
          padding: 12px 25px;
          color: white;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        ">Cerrar Sesión</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modalOverlay);
  
  // Configurar botones
  const cerrarModal = () => document.body.removeChild(modalOverlay);
  
  modalOverlay.querySelector('#btn-cancel-logout').addEventListener('click', cerrarModal);
  
  modalOverlay.querySelector('#btn-confirm-logout').addEventListener('click', () => {
    cerrarModal();
    
    const usuarioActual = authModel.getCurrentUser();
    
    // Registrar salida automáticamente
    if (usuarioActual) {
      const salidaRegistrada = registrarSalida(usuarioActual.matricula);
      if (salidaRegistrada) {
        console.log('GlobalController: Salida registrada automáticamente');
        
        // Emitir evento de salida
        eventBus.emit(EVENT_NAMES.OPERACION_UPDATED, {
          type: 'salida',
          usuario: usuarioActual,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Emitir evento antes del logout
    eventBus.emit(EVENT_NAMES.USER_LOGOUT, { source: 'logout_button' });
    
    // Limpiar sesión
    authModel.logout();
    
    // Redirigir al login
    const currentPath = window.location.pathname;
    const isInPagesFolder = currentPath.includes('/pages/');
    const loginPath = isInPagesFolder ? '../index.html' : 'index.html';
    
    console.log('GlobalController: Redirigiendo a login:', loginPath);
    window.location.href = loginPath;
  });
  
  // Cerrar al hacer clic fuera
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      cerrarModal();
    }
  });
}

/**
 * Configurar el botón de regreso
 */
function setupBackButton() {
  const backBtn = document.querySelector('.back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      console.log('GlobalController: Navegando de regreso al menú');
      
      // Emitir evento de navegación
      eventBus.emit(EVENT_NAMES.BACK_BUTTON_CLICKED);
    });
    
    console.log('GlobalController: Botón de regreso configurado');
  } else {
    console.warn('GlobalController: Botón de regreso no encontrado');
  }
}

/**
 * Manejar navegación de regreso al menú
 */
function goBackToMenu() {
  // Registrar la navegación
  authModel.registrarActividad({
    accion: 'navigation',
    descripcion: 'Regreso al menú principal'
  });
  
  // Determinar la ruta correcta según la ubicación actual
  const currentPath = window.location.pathname;
  const isInPagesFolder = currentPath.includes('/pages/');
  const menuPath = isInPagesFolder ? '../menuInicio.html' : 'menuInicio.html';
  
  // Emitir evento de navegación
  eventBus.emit(EVENT_NAMES.NAVIGATE_TO, { target: menuPath, source: 'back_button' });
  
  window.location.href = menuPath;
}

/**
 * Manejar eventos de navegación
 */
function handleNavigation(data) {
  console.log('GlobalController: Manejando navegación', data);
  
  authModel.registrarActividad({
    accion: 'navigation',
    descripcion: `Navegación a: ${data.target} (${data.source})`
  });
}

/**
 * Mostrar mensaje de permiso denegado
 */
function showPermissionDeniedMessage(data) {
  const message = `Acceso denegado a "${data.page}". Se requiere uno de los siguientes roles: ${data.requiredRoles.join(', ')}`;
  
  // Crear notificación temporal
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 9999;
    background: #fee2e2; border: 1px solid #fca5a5; color: #991b1b;
    padding: 12px 16px; border-radius: 8px; font-size: 14px;
    max-width: 300px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  `;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Remover después de 5 segundos
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 5000);
}

/**
 * Limpiar recursos al cerrar sesión
 */
function cleanup() {
  console.log('GlobalController: Limpiando recursos');
  
  // Limpiar timers, listeners, etc.
  eventBus.emit(EVENT_NAMES.PAGE_UNLOAD, { source: 'global_controller' });
}