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
  setupSearchFunctionality(); // Agregar funcionalidad de búsqueda
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
 * Configura la funcionalidad de búsqueda para usuarios
 */
function setupSearchFunctionality() {
  const searchInput = document.getElementById('buscarUsuario');
  if (!searchInput) {
    console.warn('Campo de búsqueda de usuarios no encontrado');
    return;
  }

  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    filtrarUsuarios(searchTerm);
  });

  console.log('UsersController: Funcionalidad de búsqueda configurada');
}

/**
 * Filtra la lista de usuarios por matrícula o nombre
 * @param {string} searchTerm - Término de búsqueda
 */
function filtrarUsuarios(searchTerm) {
  const userItems = document.querySelectorAll('.personal-item');
  const personalLista = document.getElementById('personalLista');
  
  // Remover mensaje anterior de "no results"
  const existingMessage = personalLista.querySelector('.no-results-message');
  if (existingMessage) {
    existingMessage.remove();
  }
  
  if (!searchTerm) {
    // Si no hay término de búsqueda, mostrar todos los usuarios
    userItems.forEach(item => {
      item.classList.remove('hidden');
      item.style.display = 'flex';
    });
    return;
  }

  let visibleCount = 0;
  
  userItems.forEach(item => {
    const userName = item.querySelector('h4')?.textContent?.toLowerCase() || '';
    const userInfo = item.querySelector('p')?.textContent?.toLowerCase() || '';
    
    // Extraer matrícula del texto (formato: "Matrícula: ABC123")
    const matriculaMatch = userInfo.match(/matrícula:\s*([^\s|]+)/i);
    const matricula = matriculaMatch ? matriculaMatch[1].toLowerCase() : '';
    
    // Verificar si el término de búsqueda coincide con matrícula o nombre completo
    const fullName = userName; // El h4 contiene "Nombre Apellidos"
    const matchesMatricula = matricula.includes(searchTerm);
    const matchesName = fullName.includes(searchTerm);
    
    // Mostrar u ocultar el elemento con transición suave
    if (matchesMatricula || matchesName) {
      item.classList.remove('hidden');
      item.style.display = 'flex';
      visibleCount++;
    } else {
      item.classList.add('hidden');
      // Mantener el elemento en el DOM pero oculto para preservar el layout
      setTimeout(() => {
        if (item.classList.contains('hidden')) {
          item.style.display = 'none';
        }
      }, 300); // Esperar a que termine la transición
    }
  });
  
  // Mostrar mensaje si no hay resultados
  if (visibleCount === 0 && searchTerm) {
    const noResultsMessage = document.createElement('div');
    noResultsMessage.className = 'no-results-message';
    noResultsMessage.innerHTML = `
      <i class="fas fa-search"></i>
      <strong>No se encontraron usuarios</strong>
      <p>No hay usuarios que coincidan con "${searchTerm}"</p>
      <small>Intenta buscar por matrícula o nombre completo</small>
    `;
    personalLista.appendChild(noResultsMessage);
  }
}