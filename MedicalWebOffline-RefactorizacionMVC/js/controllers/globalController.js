import { authModel } from '../models/storageModel.js';
import { AuthGuard } from '../middleware/authGuard.js';
import eventBus, { EVENT_NAMES } from '../utils/eventBus.js';
import { registrarEntrada, registrarSalida } from '../models/operacionesModel.js';
import { registrarActividad } from '../models/operacionesModel.js';
import { setupEventLogging } from '../utils/eventLogger.js';
import app from '../models/firebaseConfig.js';

/**
 * Inicializa la lógica global común para todas las páginas (excepto login)
 */
export function initGlobalController() {
  console.log("Firebase configurado correctamente:", app);
  console.log('GlobalController: Inicializando controlador global');
  
  // Inicializar el sistema de registro de eventos
  setupEventLogging();
  
  // El AuthGuard ya maneja la verificación de autenticación
  const usuarioActual = authModel.getCurrentUser();
  if (!usuarioActual) {
    console.warn('GlobalController: No hay usuario autenticado');
    return;
  }

  console.log(`GlobalController: Usuario autenticado - ${usuarioActual.nombre} (${usuarioActual.rol})`);

  // Esperar a que el DOM esté completamente cargado
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeUserInterface(usuarioActual);
    });
  } else {
    initializeUserInterface(usuarioActual);
  }
  
  console.log('GlobalController: Inicialización completada');
}

function initializeUserInterface(usuarioActual) {
  console.log('GlobalController: Inicializando interfaz de usuario');
  
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

    // Manejo de desconexión y reconexión
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Eventos de autenticación
    eventBus.on(EVENT_NAMES.USER_LOGOUT, async (data) => {
        console.log('GlobalController: Usuario deslogueado, limpiando UI');
        try {
            const usuario = authModel.getCurrentUser();
            if (usuario) {
                await registrarSalida(usuario);
            }
            await cleanup();
            window.location.href = '/index.html';
        } catch (error) {
            console.error('Error durante logout:', error);
        }
    });

    // Eventos de permisos
    eventBus.on(EVENT_NAMES.PERMISSION_DENIED, (data) => {
        console.warn('GlobalController: Permiso denegado', data);
        showPermissionDeniedMessage(data);
    });

    // Eventos de navegación
    eventBus.on(EVENT_NAMES.NAVIGATE_TO, (data) => {
        console.log('GlobalController: Navegación solicitada', data);
        handleNavigation(data);
    });

    // Eventos de error
    eventBus.on(EVENT_NAMES.ERROR, handleError);
}

function handleOnline() {
    console.log('Conexión restaurada');
    document.body.classList.remove('offline-mode');
    showNotification('Conexión restaurada', 'success');

    // Sincronizar datos pendientes
    eventBus.emit(EVENT_NAMES.SYNC_REQUIRED);
}

function handleOffline() {
    console.log('Conexión perdida');
    document.body.classList.add('offline-mode');
    showNotification('Modo sin conexión activado', 'warning');
}

function handleError(error) {
    console.error('Error en la aplicación:', error);

    const errorMessage = error.message || 'Ha ocurrido un error';
    showNotification(errorMessage, 'error');

    // Registrar error para análisis
    eventBus.emit(EVENT_NAMES.LOG_ERROR, {
        timestamp: new Date().toISOString(),
        error: error,
        context: error.context || 'global'
    });
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    const container = document.getElementById('notification-container') || document.body;
    container.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

async function cleanup() {
    try {
        console.log('GlobalController: Limpiando recursos y sesión');

        // Notificar a otros modulos que deben limpiar sus propios recursos
        eventBus.emit(EVENT_NAMES.PAGE_UNLOAD, { source: 'global_controller' });

        // Limpiar datos sensibles de la sesion
        sessionStorage.clear();

        // Registrar la actividad de limpieza (si es necesario)
        await registrarActividad({
            accion: 'cleanup',
            descripcion: 'Limpieza de sesión al cerrar sesión'
        });

        // Limpiar los listeners de eventos globales para evitar fugas de memoria
        eventBus.off(EVENT_NAMES.USER_LOGOUT);
        eventBus.off(EVENT_NAMES.PERMISSION_DENIED);
        eventBus.off(EVENT_NAMES.NAVIGATE_TO);
        eventBus.off(EVENT_NAMES.ERROR);

        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);

    } catch (error) {
        console.error('Error durante el proceso de cleanup:', error);
    }
}

/**
 * Mostrar información del usuario en la interfaz
 */
function displayUserInfo(usuario) {
  console.log('GlobalController: Intentando mostrar información del usuario:', usuario);
  
  const userNameSpan = document.getElementById('userName');
  console.log('GlobalController: Elemento userName encontrado:', userNameSpan);
  
  if (userNameSpan) {
    let rolIcon = '';
    const rol = usuario.rol || usuario.role || 'usuario';
    
    // Corregir los iconos de rol
    switch (rol) {
      case 'admin':
        rolIcon = '🛡️ ';
        break;
      case 'practicante':
        rolIcon = '👨‍⚕️ ';
        break;
      default:
        rolIcon = '👤 ';
    }
    
    const displayText = `${rolIcon}${usuario.nombre}`;
    userNameSpan.textContent = displayText;
    console.log(`GlobalController: Info de usuario mostrada - ${displayText} (${rol})`);
    
    // También actualizar el título de la página si existe
    const userIcon = document.getElementById('userIcon');
    if (userIcon) {
      userIcon.title = `${usuario.nombre} - ${rol}`;
    }
  } else {
    console.warn('GlobalController: Elemento userName no encontrado en el DOM');
    
    // Intentar crearlo si no existe
    const userIcon = document.getElementById('userIcon');
    if (userIcon) {
      let userNameSpan = userIcon.querySelector('#userName');
      if (!userNameSpan) {
        userNameSpan = document.createElement('span');
        userNameSpan.id = 'userName';
        userIcon.appendChild(userNameSpan);
        userNameSpan.textContent = usuario.nombre;
        console.log('GlobalController: Elemento userName creado dinámicamente');
      }
    }
  }
}

/**
 * Configurar el dropdown del menú de usuario
 */
function setupUserDropdown() {
    const dropdownToggle = document.querySelector('.user-dropdown-toggle');
    const dropdownMenu = document.querySelector('.user-dropdown-menu');

    if (!dropdownToggle || !dropdownMenu) return;

    dropdownToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
    });

    document.addEventListener('click', () => {
        dropdownMenu.classList.remove('show');
    });
}

/**
 * Configurar el botón de cerrar sesión
 */
function setupLogoutButton() {
  const logoutBtn = document.getElementById('logoutBtn');
  console.log('GlobalController: Verificando botón de logout:', logoutBtn);
  
  if (logoutBtn) {
    // Verificar si ya tiene event listeners configurados
    if (logoutBtn.hasAttribute('data-logout-configured')) {
      console.log('GlobalController: Botón de logout ya configurado, saltando...');
      return;
    }
    
    logoutBtn.addEventListener('click', () => {
      console.log('GlobalController: Solicitud de logout');
      
      // Crear modal de confirmación elegante en lugar del confirm nativo
      showLogoutConfirmModal();
    });
    
    // Marcar como configurado
    logoutBtn.setAttribute('data-logout-configured', 'true');
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
  const backButton = document.querySelector('.back-button');
  if (!backButton) return;

  backButton.addEventListener('click', () => {
      const defaultPage = '/menuInicio.html';
      const previousPage = sessionStorage.getItem('previousPage') || defaultPage;

      if (previousPage === window.location.pathname) {
          window.location.href = defaultPage;
      } else {
          window.location.href = previousPage;
      }
  });

  // Guardar página actual para navegación
  sessionStorage.setItem('previousPage', window.location.pathname);
}

/**
 * Manejar navegación de regreso al menú
 */
function goBackToMenu() {
  // Registrar la navegación
  registrarActividad({
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
  
  registrarActividad({
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