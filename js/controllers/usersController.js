// js/controllers/usersController.js
import { authModel } from '../models/storageModel.js';
import { init as initUserView, mostrarUsuarios } from '../views/userView.js';
import eventBus, { EVENT_NAMES } from '../utils/eventBus.js';
import { gestionModel } from '../models/gestionModel.js';
import { mostrarCredencialesUsuario } from '../utils/credentialsModal.js';

/**
 * Función de validación completa para formularios
 * @param {string} formType - Tipo de formulario ('usuario', 'paciente', 'datos-medicos')
 * @param {FormData} formData - Datos del formulario
 * @returns {Object} - {isValid: boolean, errors: Array, warnings: Array}
 */
export function validateForm(formType, formData) {
  const errors = [];
  const warnings = [];

  switch (formType) {
    case 'usuario':
      return validateUsuarioForm(formData);
    case 'paciente':
      return validatePacienteForm(formData);
    case 'datos-medicos':
      return validateDatosMedicosForm(formData);
    default:
      return { isValid: false, errors: ['Tipo de formulario no reconocido'], warnings: [] };
  }
}

/**
 * Validación específica para formulario de usuario
 */
function validateUsuarioForm(formData) {
  const errors = [];
  const warnings = [];

  // Email
  const email = formData.get('email')?.trim();
  if (!email) {
    errors.push('El correo electrónico es obligatorio');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('El formato del correo electrónico no es válido');
  }

  // Nombre
  const nombre = formData.get('nombre')?.trim();
  if (!nombre) {
    errors.push('El nombre es obligatorio');
  } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombre)) {
    errors.push('El nombre solo puede contener letras y espacios');
  } else if (nombre.length < 2) {
    errors.push('El nombre debe tener al menos 2 caracteres');
  } else if (nombre.length > 50) {
    errors.push('El nombre no puede tener más de 50 caracteres');
  }

  // Apellidos
  const apellidos = formData.get('apellidos')?.trim();
  if (!apellidos) {
    errors.push('Los apellidos son obligatorios');
  } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(apellidos)) {
    errors.push('Los apellidos solo pueden contener letras y espacios');
  } else if (apellidos.length < 2) {
    errors.push('Los apellidos deben tener al menos 2 caracteres');
  } else if (apellidos.length > 50) {
    errors.push('Los apellidos no pueden tener más de 50 caracteres');
  }

  // Edad
  const edadStr = formData.get('edad')?.trim();
  if (!edadStr) {
    errors.push('La edad es obligatoria');
  } else {
    const edad = parseInt(edadStr);
    if (isNaN(edad)) {
      errors.push('La edad debe ser un número válido');
    } else if (edad < 0) {
      errors.push('La edad no puede ser negativa');
    } else if (edad > 120) {
      errors.push('La edad no puede ser mayor a 120 años');
    } else if (edad < 18) {
      warnings.push('El usuario es menor de edad');
    }
  }

  // Sexo
  const sexo = formData.get('sexo');
  if (!sexo) {
    errors.push('El sexo es obligatorio');
  } else if (!['M', 'F'].includes(sexo)) {
    errors.push('El sexo debe ser Masculino (M) o Femenino (F)');
  }

  // Matrícula
  const matricula = formData.get('matricula')?.trim();
  if (!matricula) {
    errors.push('La matrícula es obligatoria');
  } else if (!/^[A-Z0-9]{3,15}$/.test(matricula)) {
    errors.push('La matrícula debe contener solo letras mayúsculas y números (3-15 caracteres)');
  }

  // Rol
  const rol = formData.get('rol');
  if (!rol) {
    errors.push('El rol es obligatorio');
  } else if (!['admin', 'practicante'].includes(rol)) {
    errors.push('El rol debe ser Administrador o Practicante');
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Función principal para inicializar la página de Usuarios y Personal.
 */
export function initUsersController() {
  console.log('UsersController: Inicializando controlador de usuarios');
  
  setupEventListeners();
  setupSidebarNavigation();
  setupNewUserForm();
  initUserView(); // Inicializar vista de usuario

  // Registrar callback para refrescar datos cuando se restaure la conexión
  // Usar un timeout para asegurar que ConnectionIndicator esté inicializado
  setTimeout(() => {
    if (window.connectionIndicator) {
      window.connectionIndicator.onConnectionRestored(async () => {
        console.log('🔄 Refrescando datos de usuarios tras restaurar conexión...');
        try {
          // Mostrar mensaje de carga
          mostrarMensaje('info', '🔄 Sincronizando Datos', 'Actualizando información de usuarios desde Firebase...', 3000);

          // Refrescar la vista de usuarios
          await mostrarUsuarios();

          mostrarMensaje('success', '✅ Datos Actualizados', 'La información de usuarios se ha sincronizado correctamente con Firebase.', 3000);
        } catch (error) {
          console.error('❌ Error al refrescar datos de usuarios tras restaurar conexión:', error);
          mostrarMensaje('warning', '⚠️ Error de Sincronización', 'No se pudieron actualizar los datos de usuarios. Refresca la página manualmente.', 5000);
        }
      });
    } else {
      console.warn('⚠️ ConnectionIndicator no disponible para registrar callback de restauración de conexión en usersController');
    }
  }, 500);

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
    button.addEventListener('click', async () => { // <-- Convertido a async
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
          await mostrarUsuarios(); // <-- Usar await

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
          // Cargar grupos al acceder a la sección
          await cargarGruposEnFormulario();
        }
      }
    });
  });
}/**
 * Configura el formulario para agregar un nuevo usuario.
 */
function setupNewUserForm() {
    console.log('UsersController: Configurando formulario nuevo usuario');

    const formUsuario = document.getElementById('formUsuario');
    if (!formUsuario) return;

    // Cargar grupos al inicializar el formulario
    cargarGruposEnFormulario();

    formUsuario.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitButton = formUsuario.querySelector('button[type="submit"]');
        submitButton.disabled = true;

        try {
            const formData = new FormData(formUsuario);
            
            // Validación completa del formulario
            const validation = validateForm('usuario', formData);
            if (!validation.isValid) {
                // Mostrar errores de validación
                const errorMessage = validation.errors.join('\n');
                mostrarMensaje('error', '❌ Errores de Validación', errorMessage, 8000);
                throw new Error('Datos inválidos en el formulario');
            }
            
            // Mostrar advertencias si existen
            if (validation.warnings.length > 0) {
                const warningMessage = validation.warnings.join('\n');
                mostrarMensaje('warning', '⚠️ Advertencias', warningMessage, 6000);
            }
            
            const userData = {
                email: formData.get('email'), // Usar email completo
                password: authModel.generateTemporaryPassword(), // Generar contraseña temporal
                nombre: formData.get('nombre'),
                apellidos: formData.get('apellidos'),
                edad: parseInt(formData.get('edad')),
                sexo: formData.get('sexo'),
                matricula: formData.get('matricula'),
                grupo_trabajo: formData.get('grupoId') || '',
                rol: formData.get('rol')
            };

            // Crear usuario
            const nuevoUsuario = await authModel.addUser(userData);
            if (!nuevoUsuario) {
                throw new Error('No se pudo crear el usuario');
            }

            // Mostrar modal con credenciales del usuario
            mostrarCredencialesUsuario(nuevoUsuario);

            eventBus.emit(EVENT_NAMES.USER_CREATED, {
                success: true,
                message: 'Usuario creado exitosamente',
                user: nuevoUsuario
            });

            formUsuario.reset();
            await cargarGruposEnFormulario(); // Recargar grupos después de limpiar

        } catch (error) {
            console.error('Error al crear usuario:', error);
            eventBus.emit(EVENT_NAMES.ERROR, {
                context: 'crear_usuario',
                error: error.message
            });
            alert(error.message || 'Error al crear usuario');
        } finally {
            submitButton.disabled = false;
        }
    });

    // Suscribirse a eventos de actualización de grupos
    eventBus.on('gestion-grupo-updated', async () => {
        await cargarGruposEnFormulario();
    });

    console.log('UsersController: Formulario configurado correctamente');
}

/**
 * Carga la lista de grupos disponibles en el formulario con información de módulos asignados
 */
async function cargarGruposEnFormulario() {
  const grupoSelect = document.getElementById('grupoId');
  if (!grupoSelect) return;
  
  try {
    // Obtener lista de grupos y módulos de forma asíncrona
    const grupos = await gestionModel.getGrupos();
    const modulos = await gestionModel.getModulos();
    
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
  } catch (error) {
    console.error('Error al cargar grupos en formulario:', error);
  }
}/**
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

/**
 * Mostrar perfil del usuario actual
 */
export function showUserProfile() {
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

// Hacer disponible globalmente
window.showUserProfile = showUserProfile;
window.showChangePasswordModal = showChangePasswordModal;