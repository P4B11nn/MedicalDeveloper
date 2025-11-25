import { authModel } from '../models/storageModel.js';
import { AuthGuard } from '../middleware/authGuard.js';
import eventBus, { EVENT_NAMES } from '../utils/eventBus.js';
import { setupEventLogging } from '../utils/eventLogger.js';
// import globalOfflineSync - ELIMINADO: Solo funcionalidad offline de pacientes

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

  // Nota: La entrada ya no se registra automáticamente al iniciar sesión.
  // El registro de 'entrada' ahora debe realizarse explícitamente desde la ventana de Asistencia
  // para cumplir con el nuevo flujo de trabajo de asistencia.

  // Suscribirse a eventos del Event Bus
  setupEventListeners();

  // Configurar menú de usuario (displayUserInfo se maneja ahora en userDisplayGlobal.js)
  setupUserDropdown();
  
  // Configurar botón de cerrar sesión - DESHABILITADO: ahora se maneja en userDisplayGlobal.js
  // setupLogoutButton();
  
  // Configurar navegación con botón de regreso
  setupBackButton();
  
  // ELIMINADO: Sistema global de sincronización offline
  // initGlobalOfflineSync(); // Solo mantenemos offline de pacientes
  
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
 * Configurar el dropdown del menú de usuario
 */
function setupUserDropdown() {
  const userName = document.getElementById('userName');
  const userIcon = document.getElementById('userIcon');
  const userDropdown = document.getElementById('userDropdown');
  
  // Verificar si userDisplayGlobal.js ya está manejando el dropdown
  if (window.initUserDisplay && typeof window.initUserDisplay === 'function') {
    console.log('GlobalController: userDisplayGlobal.js está activo, omitiendo setupUserDropdown para evitar conflictos');
    return;
  }
  
  if (userName && userIcon && userDropdown) {
    
    // Función para posicionar el dropdown automáticamente justo debajo del área de usuario
    function positionDropdown() {
      const userNameRect = userName.getBoundingClientRect();
      const userIconRect = userIcon.getBoundingClientRect();
      
      // Usar el área completa del usuario (desde el ícono hasta el final del nombre)
      const userAreaLeft = Math.min(userIconRect.left, userNameRect.left);
      const userAreaRight = Math.max(userIconRect.right, userNameRect.right);
      const userAreaBottom = Math.max(userIconRect.bottom, userNameRect.bottom);
      
      const dropdownWidth = 200;
      const margin = 20;
      const viewportWidth = window.innerWidth;
      
      // Posicionar justo debajo del área del usuario
      userDropdown.style.top = (userAreaBottom + 5) + 'px';
      
      let rightPosition = viewportWidth - userAreaRight;
      let leftPosition = 'auto';
      
      // Verificar si hay espacio suficiente a la derecha
      if (userAreaRight + dropdownWidth + margin > viewportWidth) {
        // Alinear a la derecha del área de usuario
        rightPosition = viewportWidth - userAreaRight;
      } else {
        // Hay espacio, mantener alineado a la derecha
        rightPosition = viewportWidth - userAreaRight;
      }
      
      // Si el dropdown se saldría por la izquierda, ajustar
      if (viewportWidth - rightPosition - dropdownWidth < margin) {
        leftPosition = margin + 'px';
        rightPosition = 'auto';
      }
      
      userDropdown.classList.add('auto-positioned');
      if (leftPosition !== 'auto') {
        userDropdown.style.left = leftPosition;
        userDropdown.style.right = 'auto';
      } else {
        userDropdown.style.right = rightPosition + 'px';
        userDropdown.style.left = 'auto';
      }
      
      const maxWidth = Math.min(viewportWidth - (2 * margin), dropdownWidth);
      userDropdown.style.maxWidth = maxWidth + 'px';
    }
    
    // Hacer clickeable el nombre del usuario en lugar del ícono
    userName.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Usar getComputedStyle para obtener el estado real
      const currentDisplay = getComputedStyle(userDropdown).display;
      const isCurrentlyVisible = currentDisplay === 'block';
      
      if (isCurrentlyVisible) {
        userDropdown.style.display = 'none';
      } else {
        positionDropdown(); // Calcular posición antes de mostrar
        userDropdown.style.display = 'block';
      }
      
      console.log(`GlobalController: Dropdown ${isCurrentlyVisible ? 'cerrado' : 'abierto'}`);
      
      // Emitir evento de toggle del dropdown
      eventBus.emit(EVENT_NAMES.USER_DROPDOWN_TOGGLED, { 
        isVisible: !isCurrentlyVisible,
        source: 'user_name_click' 
      });
    });

    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (!userName.contains(e.target) && !userIcon.contains(e.target) && !userDropdown.contains(e.target)) {
        const wasVisible = getComputedStyle(userDropdown).display === 'block';
        if (wasVisible) {
          userDropdown.style.display = 'none';
          eventBus.emit(EVENT_NAMES.USER_DROPDOWN_TOGGLED, { 
            isVisible: false,
            source: 'click_outside' 
          });
        }
      }
    });

    // Reposicionar en resize de ventana
    window.addEventListener('resize', function() {
      if (getComputedStyle(userDropdown).display === 'block') {
        positionDropdown();
      }
    });
    
    console.log('GlobalController: Dropdown del usuario configurado');
  } else {
    console.log('GlobalController: Elementos del dropdown no encontrados (posiblemente usando HeaderComponent)', {
      userName: !!userName,
      userIcon: !!userIcon, 
      userDropdown: !!userDropdown
    });
  }
}

/**
 * Configurar el botón de cerrar sesión
 */
function setupLogoutButton() {
  const logoutBtn = document.getElementById('logoutBtn');
  const sidebarLogoutBtn = document.getElementById('sidebarLogoutBtn');

  const attach = (el) => {
    if (!el) return;
    el.addEventListener('click', () => {
      console.log('GlobalController: Solicitud de logout (botón)', el.id);
      showLogoutConfirmModal();
    });
    console.log(`GlobalController: Botón de logout configurado - ${el.id}`);
  };

  if (logoutBtn) attach(logoutBtn);
  if (sidebarLogoutBtn) attach(sidebarLogoutBtn);

  if (!logoutBtn && !sidebarLogoutBtn) {
    console.log('GlobalController: Botón de logout no encontrado (posiblemente usando HeaderComponent)');
  }
}

/**
 * Delega el modal de logout a UserDisplayGlobal
 */
function showLogoutConfirmModal() {
  console.log('GlobalController: Delegando logout a nueva función SIN DUPLICADOS');
  
  // Verificar si tenemos la nueva función sin duplicados
  if (typeof window.showLogoutConfirmationModal === 'function') {
    console.log('GlobalController: Llamando a showLogoutConfirmationModal (SIN DUPLICADOS)');
    window.showLogoutConfirmationModal();
  } else if (window.UserDisplayGlobal && typeof window.UserDisplayGlobal.showLogoutConfirmation === 'function') {
    console.log('GlobalController: Fallback a UserDisplayGlobal.showLogoutConfirmation');
    window.UserDisplayGlobal.showLogoutConfirmation();
  } else if (typeof showLogoutConfirmation === 'function') {
    console.log('GlobalController: Fallback a función global showLogoutConfirmation');
    showLogoutConfirmation();
  } else {
    console.warn('GlobalController: No se encontró función de logout, usando fallback básico');
    if (confirm('¿Estás seguro de que deseas cerrar la sesión?')) {
      globalLogout();
    }
  }
}

// Hacer la función disponible globalmente para que HeaderComponent pueda usarla
window.showLogoutConfirmModal = showLogoutConfirmModal;

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
    console.log('GlobalController: Botón de regreso no encontrado (posiblemente usando HeaderComponent)');
  }
}

/**
 * Manejar navegación de regreso al menú
 */
function goBackToMenu() {
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
 * Inicializa el sistema global de sincronización offline
 */
// async function initGlobalOfflineSync() - ELIMINADO
// Solo mantenemos funcionalidad offline para pacientes
// La sincronización global de navegación fue eliminada

/**
 * Limpiar recursos al cerrar sesión
 */
function cleanup() {
  console.log('GlobalController: Limpiando recursos');
  
  // Limpiar timers, listeners, etc.
  eventBus.emit(EVENT_NAMES.PAGE_UNLOAD, { source: 'global_controller' });
}