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

  // Activa la primera sección por defecto.
  const firstButton = document.querySelector('.sidebar-menu button');
  if (firstButton) {
    firstButton.click();
  }
  
  console.log('UsersController: Inicialización completada');
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

  sidebarButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetSectionId = button.getAttribute('data-section');
      console.log(`UsersController: Navegando a sección ${targetSectionId}`);

      // Oculta todo.
      sidebarButtons.forEach(btn => btn.classList.remove('active'));
      sections.forEach(sec => sec.classList.remove('active'));
      if (defaultSection) defaultSection.style.display = 'none';

      // Muestra lo necesario.
      button.classList.add('active');
      const activeSection = document.getElementById(`${targetSectionId}-section`);
      if (activeSection) {
        activeSection.classList.add('active');

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
      
      console.log('UsersController: Datos del usuario:', userData);

      const success = authModel.addUser(userData);

      if (success) {
        console.log('UsersController: Usuario creado exitosamente');
        
        // Emitir evento de usuario creado
        eventBus.emit(EVENT_NAMES.USER_CREATED, {
          user: userData,
          timestamp: new Date().toISOString()
        });
        
        // Si el usuario se asignó a un grupo, actualizar el grupo también
        if (userData.grupoId) {
          gestionModel.asignarUsuarioAGrupo(userData.grupoId, userData.id);
        }
        
        alert('¡Usuario Registrado! El usuario ha sido registrado correctamente.');
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