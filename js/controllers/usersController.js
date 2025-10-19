// js/controllers/usersController.js
import { authModel } from '../models/storageModel.js';
import { init as initUserView, mostrarUsuarios } from '../views/userView.js';
import eventBus, { EVENT_NAMES } from '../utils/eventBus.js';
import { gestionModel } from '../models/gestionModel.js';

/**
 * Función principal para inicializar la página de Usuarios y Personal.
 */
export function initUsersController() {
  console.log('UsersController: Inicializando controlador de usuarios');
  
  setupEventListeners();
  setupSidebarNavigation();
  setupNewUserForm();
  initUserView(); // Inicializar vista de usuario

  // Comentado: no activar automáticamente para permitir navegación manual
  // const firstButton = document.querySelector('.sidebar-menu button');
  // if (firstButton) {
  //   firstButton.click();
  // }
  
  console.log('UsersController: Inicialización completada');
  
  // Hacer disponible globalmente para depuración
  window.UsersController = {
    createUser: (userData) => {
      console.log('UsersController.createUser llamado con:', userData);
      
      // Generar ID automático antes de crear el usuario
      if (!userData.id) {
        userData.id = authModel.generateUserId();
      }
      
      const success = authModel.addUser(userData);
      if (success) {
        eventBus.emit(EVENT_NAMES.USER_CREATED, { user: userData });
        const usuarioActual = obtenerUsuarioActual();
        mostrarMensaje('success', '✅ Usuario Registrado', 
          `${userData.nombre} ha sido registrado exitosamente.\n\n🆔 ID generado: ${userData.id}\n👤 Rol: ${userData.rol}`, 5000);
        return true;
      }
      return false;
    },
    
    // Funciones de utilidad para gestión de usuarios
    generateUserId: () => authModel.generateUserId(),
    cleanupIncorrectUserIds: () => authModel.cleanupIncorrectUserIds(),
    getAllUsers: () => authModel.getAllUsers(),
    
    // Función para mostrar información de usuarios
    showUserInfo: () => {
      const usuarios = authModel.getAllUsers();
      console.table(usuarios.map(u => ({
        ID: u.id,
        Nombre: u.nombre,
        Apellidos: u.apellidos,
        Matricula: u.matricula,
        Rol: u.rol,
        Estado: u.estado,
        'ID Válido': /^U\d+$/.test(u.id) ? '✅' : '❌'
      })));
      
      const usuariosInvalidos = usuarios.filter(u => !/^U\d+$/.test(u.id));
      if (usuariosInvalidos.length > 0) {
        console.warn(`⚠️ Encontrados ${usuariosInvalidos.length} usuarios con IDs incorretos:`);
        console.table(usuariosInvalidos.map(u => ({ ID: u.id, Nombre: u.nombre, Rol: u.rol })));
        console.log('💡 Ejecuta UsersController.cleanupIncorrectUserIds() para eliminarlos');
      } else {
        console.log('✅ Todos los usuarios tienen IDs válidos');
      }
    }
  };
}

/**
 * Configurar listeners de eventos del Event Bus
 */
function setupEventListeners() {
  console.log('UsersController: Configurando Event Bus listeners');
  
  // Escuchar eventos de creación de usuarios
  eventBus.on(EVENT_NAMES.USER_CREATED, (data) => {
    console.log('UsersController: Usuario creado', data);
    mostrarUsuarios(); // Refrescar lista
  });
  
  // Escuchar eventos de actualización de usuarios
  eventBus.on(EVENT_NAMES.USER_UPDATED, (data) => {
    console.log('UsersController: Usuario actualizado', data);
    mostrarUsuarios(); // Refrescar lista
  });
  
  // Escuchar eventos de eliminación de usuarios
  eventBus.on(EVENT_NAMES.USER_DELETED, (data) => {
    console.log('UsersController: Usuario eliminado', data);
    mostrarUsuarios(); // Refrescar lista
  });
}

/**
 * Configura los eventos de clic para el menú lateral de navegación.
 */
function setupSidebarNavigation() {
  console.log('UsersController: Configurando navegación sidebar');
  
  const sidebarButtons = document.querySelectorAll('.sidebar-menu button');
  const sections = document.querySelectorAll('.content-area .form-section');
  const defaultSection = document.getElementById('default-section');

  // Verificar si ya hay listeners del sistema HTML
  if (window.location.search.includes('compact=1') || window.location.hash) {
    console.log('UsersController: Sistema HTML manejando navegación, omitiendo setup');
    return;
  }

  sidebarButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetSectionId = button.getAttribute('data-section');
      console.log(`UsersController: Navegando a sección ${targetSectionId}`);

      // Oculta todo.
      sidebarButtons.forEach(btn => btn.classList.remove('active'));
      sections.forEach(sec => {
        sec.classList.remove('active');
        sec.style.display = 'none';
      });
      if (defaultSection) defaultSection.style.display = 'none';

      // Muestra lo necesario.
      button.classList.add('active');
      const activeSection = document.getElementById(`${targetSectionId}-section`);
      if (activeSection) {
        activeSection.classList.add('active');
        activeSection.style.display = 'block';

        // Si se selecciona "Personal", carga la lista de usuarios.
        if (targetSectionId === 'personal') {
          console.log('UsersController: Cargando lista de personal');
          mostrarUsuarios();
          
          // Emitir evento de datos cargados
          eventBus.emit(EVENT_NAMES.DATA_LOADED, { 
            type: 'users', 
            section: 'personal' 
          });
        }
        
        // Si se selecciona "nuevo-usuario", preparar formulario
        if (targetSectionId === 'nuevo-usuario') {
          console.log('UsersController: Preparando formulario nuevo usuario');
          // Limpiar formulario si es necesario
          const formUsuario = document.getElementById('formUsuario');
          if (formUsuario) {
            formUsuario.reset();
          }
        }
      }
    });
  });
}

/**
 * Configura el formulario para agregar un nuevo usuario.
 */
function setupNewUserForm() {
  console.log('UsersController: Configurando formulario nuevo usuario');
  
  const formUsuario = document.getElementById('formUsuario');
  if (formUsuario) {
    // Cargar los grupos disponibles en el selector
    cargarGruposEnFormulario();
    
    formUsuario.addEventListener('submit', function(e) {
      e.preventDefault();
      console.log('UsersController: Procesando envío de formulario');
      
      const formData = new FormData(formUsuario);
      const userData = Object.fromEntries(formData.entries());
      
      // Procesar campos especiales
      if (!userData.grupoId) {
        delete userData.grupoId; // Eliminar si no se seleccionó ningún grupo
      }
      
      // Generar ID automático
      userData.id = authModel.generateUserId();
      
      console.log('UsersController: Datos del usuario (con ID generado):', userData);

      const success = authModel.addUser(userData);

      if (success) {
        console.log('UsersController: Usuario creado exitosamente');
        
        // Mostrar mensaje de éxito con el ID generado
        mostrarMensaje('success', '✅ Usuario Registrado', 
          `${userData.nombre} ${userData.apellidos || ''} ha sido registrado exitosamente.\n\n🆔 ID generado: ${userData.id}\n👤 Rol: ${userData.rol}\n📧 Matrícula: ${userData.matricula}`, 6000);
        
        // Emitir evento de usuario creado
        eventBus.emit(EVENT_NAMES.USER_CREATED, {
          user: userData,
          timestamp: new Date().toISOString()
        });
        
        // Si el usuario se asignó a un grupo, actualizar el grupo también
        if (userData.grupoId) {
          gestionModel.asignarUsuarioAGrupo(userData.grupoId, userData.id);
        }
        
        const usuarioActual = obtenerUsuarioActual();
        mostrarMensaje('success', '✅ Usuario Registrado', 
          `${userData.nombre} ha sido registrado exitosamente en el sistema.\nMatrícula/ID: ${userData.id}\nRol: ${userData.rol}\n\nRegistrado por: ${usuarioActual.nombre}`, 6000);
        formUsuario.reset();
        
        // Vuelve a la sección de personal para ver al nuevo usuario
        const personalButton = document.querySelector('button[data-section="personal"]');
        if (personalButton) {
          personalButton.click();
        }
      } else {
        console.error('UsersController: Error al crear usuario');
        eventBus.emit(EVENT_NAMES.DATA_ERROR, {
          operation: 'create_user',
          error: 'Failed to create user'
        });
      }
    });
    
    // Suscribirse a eventos de actualización de grupos
    eventBus.on('gestion-grupo-updated', () => {
      cargarGruposEnFormulario();
    });
    
    console.log('UsersController: Formulario configurado correctamente');
  } else {
    console.error('UsersController: Formulario de usuario no encontrado');
  }
}

/**
 * Carga la lista de grupos disponibles en el formulario con información de módulos asignados
 */
function cargarGruposEnFormulario() {
  const grupoSelect = document.getElementById('grupoId');
  if (!grupoSelect) return;
  
  // Obtener lista de grupos y módulos
  const grupos = gestionModel.getGrupos();
  const modulos = gestionModel.getModulos();
  
  // Guardar el valor seleccionado actualmente
  const valorSeleccionado = grupoSelect.value;
  
  // Limpiar opciones existentes excepto la primera
  while (grupoSelect.options.length > 1) {
    grupoSelect.remove(1);
  }
  
  // Agregar los grupos como opciones con información de módulos
  grupos.forEach(grupo => {
    const option = document.createElement('option');
    option.value = grupo.id;
    
    // Buscar módulos asignados a este grupo
    const modulosAsignados = modulos.filter(modulo => modulo.grupoAsignadoId === grupo.id);
    
    let textoOption = `${grupo.nombre} (${grupo.turno} - ${grupo.horario})`;
    
    if (modulosAsignados.length > 0) {
      const nombresModulos = modulosAsignados.map(m => m.nombre).join(', ');
      textoOption += ` → ${nombresModulos}`;
    } else {
      textoOption += ' → Sin módulo asignado';
    }
    
    option.textContent = textoOption;
    grupoSelect.appendChild(option);
  });
  
  // Restaurar el valor seleccionado si todavía existe
  if (valorSeleccionado) {
    grupoSelect.value = valorSeleccionado;
  }
}

/**
 * Sistema de mensajes personalizados para usuarios
 */
function mostrarMensaje(tipo, titulo, mensaje, duracion = 5000) {
  // Crear container si no existe
  let container = document.getElementById('message-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'message-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      max-width: 400px;
    `;
    document.body.appendChild(container);
  }

  const messageEl = document.createElement('div');
  messageEl.className = `custom-message ${tipo}`;
  messageEl.style.cssText = `
    background: ${tipo === 'success' ? '#10b981' : tipo === 'error' ? '#ef4444' : '#f59e0b'};
    color: white;
    padding: 16px;
    margin-bottom: 10px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: messageSlideIn 0.3s ease-out;
    display: flex;
    align-items: flex-start;
    gap: 12px;
  `;
  
  const iconos = {
    success: '✅',
    error: '❌', 
    warning: '⚠️',
    info: 'ℹ️'
  };

  messageEl.innerHTML = `
    <div style="font-size: 20px; flex-shrink: 0;">${iconos[tipo] || 'ℹ️'}</div>
    <div style="flex: 1;">
      <div style="font-weight: bold; margin-bottom: 4px;">${titulo}</div>
      <div style="font-size: 14px; line-height: 1.4; white-space: pre-line;">${mensaje}</div>
    </div>
    <button style="background: none; border: none; color: white; font-size: 18px; cursor: pointer; flex-shrink: 0;" onclick="this.parentElement.remove()">×</button>
  `;

  // Añadir estilos de animación si no existen
  if (!document.getElementById('message-styles')) {
    const style = document.createElement('style');
    style.id = 'message-styles';
    style.textContent = `
      @keyframes messageSlideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  container.appendChild(messageEl);

  // Auto-cerrar después del tiempo especificado
  if (duracion > 0) {
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.style.animation = 'messageSlideIn 0.3s ease-in reverse';
        setTimeout(() => {
          if (messageEl.parentNode) {
            messageEl.remove();
          }
        }, 300);
      }
    }, duracion);
  }
}

/**
 * Obtener usuario actual para mensajes
 */
function obtenerUsuarioActual() {
  const usuarioActual = authModel.getCurrentUser();
  return usuarioActual || { nombre: 'Administrador' };
}