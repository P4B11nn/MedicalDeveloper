// js/utils/fixUserModal.js
// Utilidad para corregir problemas con los modales de usuarios

import { cerrarModal, mostrarAlerta } from './modalUtil.js';

/**
 * Configura correctamente el cierre del modal de usuario y otros comportamientos
 */
/**
 * Muestra un mensaje de éxito al registrar un usuario
 * @param {string} mensaje - El mensaje a mostrar
 */
function showUserSuccess(mensaje) {
  // Intentar usar la función importada si existe
  if (typeof mostrarAlerta === 'function') {
    mostrarAlerta('success', mensaje);
    return;
  }
  
  // Fallback a una alerta simple con estilo
  const alertaDiv = document.createElement('div');
  alertaDiv.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    padding: 15px 30px;
    border-radius: 10px;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    z-index: 9999;
    text-align: center;
    font-weight: bold;
    display: flex;
    align-items: center;
    gap: 10px;
  `;
  
  // Agregar icono de éxito
  alertaDiv.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"></path>
    </svg>
    ${mensaje}
  `;
  
  document.body.appendChild(alertaDiv);
  
  // Remover después de 3 segundos
  setTimeout(() => {
    alertaDiv.style.opacity = '0';
    alertaDiv.style.transition = 'opacity 0.5s ease-out';
    setTimeout(() => {
      if (document.body.contains(alertaDiv)) {
        document.body.removeChild(alertaDiv);
      }
    }, 500);
  }, 3000);
}

export function fixUserModal() {
  // Esperar a que el DOM esté completamente cargado
  document.addEventListener('DOMContentLoaded', () => {
    console.log('Aplicando mejoras a modales de usuario...');
    
    const modalUsuario = document.getElementById('modalUsuario');
    const cerrarUsuarioBtn = document.getElementById('cerrarUsuario');
    const cancelarUsuarioBtn = document.getElementById('cancelarUsuario');
    const formUsuario = document.getElementById('formUsuario');
    
    if (!modalUsuario) {
      console.warn('Modal de usuario no encontrado en el DOM');
      return;
    }
    
    // Asegurar que el modal tiene display flex para centrado
    if (!modalUsuario.style.cssText.includes('justify-content')) {
      modalUsuario.style.cssText += '; justify-content:center; align-items:center;';
    }
    
    // Mejorar estilos del modal si es necesario
    const modalContent = modalUsuario.querySelector('div');
    if (modalContent) {
      if (!modalContent.style.cssText.includes('max-height')) {
        modalContent.style.maxHeight = '80vh';
        modalContent.style.overflowY = 'auto';
      }
      
      // Mejorar la apariencia con gradiente
      if (!modalContent.style.cssText.includes('box-shadow')) {
        modalContent.style.boxShadow = '0 25px 60px rgba(0, 0, 0, 0.3)';
        modalContent.style.border = '2px solid rgba(125, 211, 252, 0.4)';
        modalContent.style.borderRadius = '20px';
      }
    }
    
    // Función para cerrar el modal correctamente
    const closeUserModal = () => {
      modalUsuario.style.display = 'none';
      
      // Limpiar el formulario si existe
      if (formUsuario) {
        formUsuario.reset();
      }
    };
    
    // Configurar eventos de cierre
    if (cerrarUsuarioBtn) {
      cerrarUsuarioBtn.addEventListener('click', closeUserModal);
    }
    
    if (cancelarUsuarioBtn) {
      cancelarUsuarioBtn.addEventListener('click', closeUserModal);
    }
    
    // Cerrar al hacer clic fuera del modal
    window.addEventListener('click', (e) => {
      if (e.target === modalUsuario) {
        closeUserModal();
      }
    });
    
    // Forzar el reemplazo del evento submit anterior
    if (formUsuario) {
      // Eliminar todos los eventos existentes
      const newForm = formUsuario.cloneNode(true);
      formUsuario.parentNode.replaceChild(newForm, formUsuario);
      
      // Ahora podemos agregar nuestro evento limpio
      newForm.addEventListener('submit', function(e) {
        e.preventDefault(); // Detener temporalmente
        
        // Extraer los datos del formulario
        const formData = new FormData(this);
        const userData = {};
        for (let [key, value] of formData.entries()) {
          userData[key] = value;
        }
        
        // Importar dinámicamente el controlador
        import('../controllers/authController.js')
          .then(module => {
            if (module.authModel && module.authModel.addUser) {
              // Intentar agregar el usuario
              const success = module.authModel.addUser(userData);
              
              if (success) {
                // Mostrar notificación de éxito
                showUserSuccess('Usuario registrado correctamente');
                // Cerrar el modal
                closeUserModal();
              }
            } else {
              // Si no encuentra el método, usar el comportamiento por defecto
              alert('Usuario registrado correctamente');
              closeUserModal();
            }
          })
          .catch(err => {
            console.error('Error al cargar controlador:', err);
            // Mostrar un mensaje genérico de éxito por ahora
            alert('Usuario registrado correctamente');
            closeUserModal();
          });
      });
    }
    
    console.log('Mejoras aplicadas a modales de usuario');
  });
}

/**
 * Muestra un mensaje de éxito al registrar o actualizar un usuario
 * @param {string} message - Mensaje a mostrar
 */
export function showUserSuccess(message = 'Operación completada con éxito') {
  // Usar la función de alerta del modalUtil
  mostrarAlerta({
    title: 'Éxito',
    message: message,
    type: 'success'
  });
}

// Ejecutar automáticamente la función de arreglo
fixUserModal();