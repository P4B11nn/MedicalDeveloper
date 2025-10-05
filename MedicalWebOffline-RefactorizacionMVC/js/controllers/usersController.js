// js/controllers/usersController.js
import { authModel } from '../models/storageModel.js';
import { init as initUserView, mostrarUsuarios, mostrarPerfilUsuario } from '../views/userView.js';
import eventBus, { EVENT_NAMES } from '../utils/eventBus.js';
import { gestionModel } from '../models/gestionModel.js';
import { mostrarCredencialesUsuario } from '../utils/credentialsModal.js';

/**
 * Función principal para inicializar la página de Usuarios y Personal.
 */
function initUsersController() {
  console.log('UsersController: Inicializando controlador de usuarios');
  
  setupEventListeners();
  setupSidebarNavigation();
  setupNewUserForm();
  initUserView();

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
  
  eventBus.on(EVENT_NAMES.USER_CREATED, async (data) => {
    console.log('UsersController: Usuario creado', data);
    await mostrarUsuarios();
  });
  
  eventBus.on(EVENT_NAMES.USER_UPDATED, async (data) => {
    console.log('UsersController: Usuario actualizado', data);
    await mostrarUsuarios();
  });
  
  eventBus.on(EVENT_NAMES.USER_DELETED, async (data) => {
    console.log('UsersController: Usuario eliminado', data);
    await mostrarUsuarios();
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
    button.addEventListener('click', async () => { // <-- CAMBIO: Convertido a async
      const targetSectionId = button.getAttribute('data-section');
      console.log(`UsersController: Navegando a sección ${targetSectionId}`);

      sidebarButtons.forEach(btn => btn.classList.remove('active'));
      sections.forEach(sec => sec.classList.remove('active'));
      if (defaultSection) defaultSection.style.display = 'none';

      button.classList.add('active');
      const activeSection = document.getElementById(`${targetSectionId}-section`);
      if (activeSection) {
        activeSection.classList.add('active');

        if (targetSectionId === 'personal') {
          console.log('UsersController: Cargando lista de personal');
          await mostrarUsuarios(); // <-- CAMBIO: Se usa await para esperar a que se muestren los usuarios
          
          eventBus.emit(EVENT_NAMES.DATA_LOADED, { 
            type: 'users', 
            section: 'personal' 
          });
        }

        if (targetSectionId === 'mi-perfil') {
          console.log('UsersController: Cargando perfil de usuario');
          mostrarPerfilUsuario();
          
          eventBus.emit(EVENT_NAMES.DATA_LOADED, { 
            type: 'profile', 
            section: 'mi-perfil' 
          });
        }
        
        if (targetSectionId === 'nuevo-usuario') {
          console.log('UsersController: Preparando formulario nuevo usuario');
          const formUsuario = document.getElementById('formUsuario');
          if (formUsuario) {
            formUsuario.reset();
          }
          // Cargar grupos al acceder a la sección
          await cargarGrupos();
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
    if (!formUsuario) return;

    // Cargar grupos al inicializar el formulario
    cargarGrupos();

    formUsuario.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitButton = formUsuario.querySelector('button[type="submit"]');
        submitButton.disabled = true;

        try {
            const formData = new FormData(formUsuario);
            const userData = {
                email: formData.get('id') + '@medical.com', // Generar email a partir del ID
                password: 'temp123456', // Contraseña temporal por defecto
                nombre: formData.get('nombre'),
                apellidos: formData.get('apellidos'),
                edad: parseInt(formData.get('edad')),
                sexo: formData.get('sexo'),
                matricula: formData.get('matricula'),
                grupo_trabajo: formData.get('grupoId') || '',
                rol: formData.get('rol')
            };

            // Validaciones
            if (!userData.email?.includes('@')) {
                throw new Error('Por favor ingresa un ID válido para generar el email');
            }

            if (!userData.nombre || !userData.matricula || !userData.rol) {
                throw new Error('Nombre, matrícula y rol son obligatorios');
            }

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
            cargarGrupos(); // Recargar grupos después de limpiar

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
}

/**
 * Carga los grupos desde Firebase y los muestra en el select
 */
async function cargarGrupos() {
    const grupoSelect = document.getElementById('grupoId');
    if (!grupoSelect) return;

    try {
        // Mostrar loading
        grupoSelect.innerHTML = '<option value="">Cargando grupos...</option>';
        grupoSelect.disabled = true;

        // Obtener grupos de Firebase
        const grupos = await gestionModel.getGrupos();
        
        // Limpiar select
        grupoSelect.innerHTML = '<option value="">Sin grupo asignado</option>';
        
        // Agregar cada grupo como opción
        grupos.forEach(grupo => {
            const option = document.createElement('option');
            option.value = grupo.id;
            option.textContent = `${grupo.nombre} - ${grupo.turno} (${grupo.horario})`;
            grupoSelect.appendChild(option);
        });

        grupoSelect.disabled = false;
        console.log('UsersController: Grupos cargados:', grupos.length);

    } catch (error) {
        console.error('Error cargando grupos:', error);
        grupoSelect.innerHTML = '<option value="">Error cargando grupos</option>';
        grupoSelect.disabled = false;
    }
}

async function handleUserUpdate(userId, updatedData) {
    try {
        const submitButton = document.querySelector(`button[data-user-id="${userId}"]`);
        if (submitButton) submitButton.disabled = true;

        // Validaciones
        if (updatedData.email && !updatedData.email.includes('@')) {
            throw new Error('Email inválido');
        }

        if (updatedData.password && updatedData.password.length < 6) {
            throw new Error('La contraseña debe tener al menos 6 caracteres');
        }

        const success = await authModel.updateUser(userId, updatedData);
        if (!success) {
            throw new Error('No se pudo actualizar el usuario');
        }

        eventBus.emit(EVENT_NAMES.USER_UPDATED, {
            success: true,
            message: 'Usuario actualizado exitosamente',
            userId
        });

        await mostrarUsuarios();
        return true;

    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        eventBus.emit(EVENT_NAMES.ERROR, {
            context: 'actualizar_usuario',
            error: error.message
        });
        alert(error.message || 'Error al actualizar usuario');
        return false;
    } finally {
        const submitButton = document.querySelector(`button[data-user-id="${userId}"]`);
        if (submitButton) submitButton.disabled = false;
    }
}

async function handleUserDelete(userId) {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
        return;
    }

    try {
        const deleteButton = document.querySelector(`button[data-delete-id="${userId}"]`);
        if (deleteButton) deleteButton.disabled = true;

        const success = await authModel.deleteUser(userId);
        if (!success) {
            throw new Error('No se pudo eliminar el usuario');
        }

        eventBus.emit(EVENT_NAMES.USER_DELETED, {
            success: true,
            message: 'Usuario eliminado exitosamente',
            userId
        });

        await mostrarUsuarios();

    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        eventBus.emit(EVENT_NAMES.ERROR, {
            context: 'eliminar_usuario',
            error: error.message
        });
        alert(error.message || 'Error al eliminar usuario');
    } finally {
        const deleteButton = document.querySelector(`button[data-delete-id="${userId}"]`);
        if (deleteButton) deleteButton.disabled = false;
    }
}

// Exportar funciones necesarias
export {
    initUsersController,
    handleUserUpdate,
    handleUserDelete
};
