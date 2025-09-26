// js/utils/domCheck.js
// Utilidad para verificar el estado del DOM y corregir problemas comunes

/**
 * Verifica las imágenes cargadas y muestra advertencias para las que fallaron
 */
export function checkImagesLoaded() {
  window.addEventListener('load', () => {
    // Dar tiempo para que las imágenes se intenten cargar
    setTimeout(() => {
      const images = document.querySelectorAll('img');
      let allLoaded = true;
      let imagesWithIssues = [];
      
      images.forEach(img => {
        // Verificar si la imagen se cargó correctamente
        if (!img.complete || img.naturalWidth === 0) {
          console.warn(`Error al cargar imagen: ${img.src}`);
          allLoaded = false;
          imagesWithIssues.push(img);
          
          // Agregar clase para estilos de error
          img.classList.add('img-load-error');
          
          // Intentar corregir problemas comunes con URL
          let newSrc = img.src;
          
          // Si la URL no tiene parámetro v=1, agregarlo (para evitar caché)
          if (!newSrc.includes('?v=')) {
            newSrc = newSrc + '?v=1';
            console.log(`Intentando recargar con: ${newSrc}`);
            img.src = newSrc;
          }
          
          // Si es una URL relativa sin img/ al principio y no está en subdirectorio
          if (!newSrc.includes('/') && !newSrc.startsWith('img/')) {
            newSrc = 'img/' + newSrc;
            console.log(`Intentando ruta alternativa: ${newSrc}`);
            img.src = newSrc;
          }
        }
      });
      
      if (!allLoaded) {
        console.warn(`${imagesWithIssues.length} imágenes no se cargaron correctamente. Revisa la consola para más detalles.`);
      } else {
        console.log('Todas las imágenes se cargaron correctamente.');
      }
    }, 1000);
  });
}

/**
 * Verifica y corrige problemas en los modales de usuario
 */
export function checkUserModals() {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('Comprobando estructura del DOM para el formulario de usuarios...');
    
    // Verificar modal y formulario
    const modalUsuario = document.getElementById('modalUsuario');
    const formUsuario = modalUsuario ? modalUsuario.querySelector('#formUsuario') : null;
    
    if (!modalUsuario) {
      console.error('Error: No se encontró el modal con ID "modalUsuario"');
    } else {
      console.log('✓ Modal de usuario encontrado');
      
      // Asegurar que el modal tiene display flex para centrado
      if (!modalUsuario.style.display.includes('flex')) {
        modalUsuario.style.cssText = modalUsuario.style.cssText.replace('display:none', 'display:none; justify-content:center; align-items:center');
      }
    }
    
    if (!formUsuario) {
      console.error('Error: No se encontró el formulario con ID "formUsuario" dentro del modal');
    } else {
      console.log('✓ Formulario de usuario encontrado');
      
      // Verificar botones dentro del formulario
      const submitBtn = formUsuario.querySelector('button[type="submit"]');
      const cancelBtn = formUsuario.querySelector('#cancelarUsuario');
      
      if (!submitBtn) {
        console.error('Error: No se encontró el botón de envío (type="submit") en el formulario');
      } else {
        console.log('✓ Botón de envío encontrado');
      }
      
      if (!cancelBtn) {
        console.warn('Advertencia: No se encontró el botón de cancelar con ID "cancelarUsuario"');
      } else {
        console.log('✓ Botón de cancelar encontrado');
      }
    }
    
    // Verificar botones para abrir el modal
    const btnNuevoUsuario = document.getElementById('btnNuevoUsuario');
    const btnRegistrarUsuario = document.getElementById('btnRegistrarUsuario');
    
    if (!btnNuevoUsuario && !btnRegistrarUsuario) {
      console.warn('Advertencia: No se encontró ningún botón para abrir el modal de registro (btnNuevoUsuario o btnRegistrarUsuario)');
    } else {
      console.log('✓ Botón para abrir modal encontrado');
    }
  });
}

/**
 * Agrega la llamada de inicialización al controlador correspondiente según la página
 */
export function initializeControllers() {
  document.addEventListener('DOMContentLoaded', () => {
    // Determinar qué página está cargada basado en la URL o elementos en la página
    const currentPath = window.location.pathname;
    
    if (currentPath.includes('categoria-operaciones-control')) {
      // Importar e inicializar el controlador de operaciones (usando directamente el controlador en español)
      import('../controllers/operacionesController.js')
        .then(module => {
          if (module.initOperacionesController) {
            module.initOperacionesController();
            console.log('Controlador de operaciones inicializado');
          } else {
            console.error('No se encontró la función initOperacionesController');
          }
        })
        .catch(err => console.error('Error al cargar controlador de operaciones:', err));
    } 
    else if (currentPath.includes('categoria-pacientes')) {
      // Inicializar controlador de pacientes (usando directamente el controlador en español)
      import('../controllers/pacienteController.js')
        .then(module => {
          if (module.initPacienteController) {
            module.initPacienteController();
            console.log('Controlador de pacientes inicializado');
          } else {
            console.error('No se encontró la función initPacienteController');
          }
        })
        .catch(err => console.error('Error al cargar controlador de pacientes:', err));
    }
    else if (currentPath.includes('categoria-reportes')) {
      // Inicializar controlador de reportes (usando directamente el controlador en español)
      import('../controllers/reporteController.js')
        .then(module => {
          if (module.initReporteController) {
            module.initReporteController();
            console.log('Controlador de reportes inicializado');
          } else {
            console.error('No se encontró la función initReporteController');
          }
        })
        .catch(err => console.error('Error al cargar controlador de reportes:', err));
    }
    else if (currentPath.includes('categoria-usuarios-personal')) {
      // Importar e inicializar el controlador de usuarios/personal
      import('../utils/fixUserModal.js')
        .then(module => {
          if (module.fixUserModal) {
            module.fixUserModal();
            console.log('Utilidad de corrección de modales inicializada');
          }
        })
        .catch(err => console.error('Error al cargar utilidad de modales:', err));
      
      // También inicializar el controlador de usuarios si existe
      import('../controllers/usersController.js')
        .then(module => {
          if (module.initUsersController) {
            module.initUsersController();
            console.log('Controlador de usuarios inicializado');
          }
        })
        .catch(err => console.warn('No se pudo cargar controlador de usuarios:', err));
    }
  });
}

/**
 * Corrige problemas comunes con la visualización de fondos e imágenes
 */
export function fixBackgroundAndImages() {
  document.addEventListener('DOMContentLoaded', () => {
    // Verificar que el fondo esté correctamente configurado
    const body = document.body;
    const computedStyle = window.getComputedStyle(body);
    const backgroundImage = computedStyle.backgroundImage;
    
    if (!backgroundImage || backgroundImage === 'none' || backgroundImage.includes('url("")')) {
      console.warn('Fondo no definido o incorrecto, aplicando corrección...');
      body.style.backgroundImage = 'url("img/medical-background.png?v=1")';
      body.style.backgroundPosition = 'center center';
      body.style.backgroundSize = 'cover';
      body.style.backgroundRepeat = 'no-repeat';
    }
    
    // Verificar la carga del logo
    const logoImgs = document.querySelectorAll('img[src*="Logo Medical Developer"]');
    logoImgs.forEach(img => {
      if (!img.complete || img.naturalWidth === 0) {
        console.warn('Logo no cargado correctamente, aplicando corrección...');
        img.src = 'img/logo-medical-developer.jpg?v=2';
      }
    });
  });
}

/**
 * Insert dynamic CSS styles for activity log
 */
export function insertActivityStyles() {
  // If styles already exist, don't add again
  if (document.getElementById('activity-styles')) {
    return;
  }
  
  const style = document.createElement('style');
  style.id = 'activity-styles';
  style.innerHTML = `
    /* Activity log styles */
    .activities-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      background-color: white;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      overflow: hidden;
    }

    .activities-table th, 
    .activities-table td {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }

    .activities-table th {
      background-color: #f9fafb;
      color: #374151;
      font-weight: 600;
    }

    .activities-table tr:last-child td {
      border-bottom: none;
    }

    .activities-table tr:hover {
      background-color: #f9fafb;
    }

    .activities-table .badge {
      display: inline-block;
      padding: 5px 10px;
      border-radius: 15px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .action-login {
      background-color: #c7d2fe;
      color: #4338ca;
    }

    .action-logout {
      background-color: #e5e7eb;
      color: #4b5563;
    }

    .action-create {
      background-color: #a7f3d0;
      color: #047857;
    }

    .action-update {
      background-color: #bae6fd;
      color: #0369a1;
    }

    .action-delete {
      background-color: #fecaca;
      color: #b91c1c;
    }
    
    .action-view {
      background-color: #ddd6fe;
      color: #5b21b6;
    }
    
    .action-navigate {
      background-color: #fde68a;
      color: #92400e;
    }
    
    .action-menu {
      background-color: #c4b5fd;
      color: #6d28d9;
    }

    .action-default {
      background-color: #e5e7eb;
      color: #4b5563;
    }

    .info-message {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      color: #6b7280;
    }
  `;
  
  document.head.appendChild(style);
}

// Inicializar todas las verificaciones
export function initAllChecks() {
  checkImagesLoaded();
  checkUserModals();
  initializeControllers();
  fixBackgroundAndImages();
  insertActivityStyles();
  
  console.log('Sistema de verificación y corrección DOM inicializado.');
}

// Ejecutar automáticamente
initAllChecks();