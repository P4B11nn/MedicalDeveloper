// js/utils/modalUtil.js
// Utilidades para la gestión de modales

/**
 * Crea un modal personalizado para ver el registro de actividad
 * @param {string} id - ID del modal
 * @param {string} titulo - Título del modal
 * @param {string} contenido - Contenido HTML del modal
 * @returns {HTMLElement} - El elemento modal creado
 */
export function crearModal(id, titulo, contenido) {
  // Crear el modal si no existe
  let modal = document.getElementById(id);
  
  if (!modal) {
    modal = document.createElement('div');
    modal.id = id;
    modal.style.cssText = `
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, rgba(125, 211, 252, 0.8), rgba(254, 243, 199, 0.8)), url('img/medical-background.png?v=1') center center / cover no-repeat;
      z-index: 1000;
      overflow-y: auto;
    `;
    
    // Crear el contenido del modal
    const modalHTML = `
      <div class="modal-dialog" style="
        background: white;
        max-width: 800px;
        margin: 40px auto;
        border-radius: 12px;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
        position: relative;
      ">
        <div class="modal-header" style="
          padding: 15px 20px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <h3>${titulo}</h3>
          <button class="cerrar-modal" style="
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
          ">×</button>
        </div>
        
        <div class="modal-body" style="padding: 20px; max-height: 70vh; overflow-y: auto;">
          ${contenido}
        </div>
      </div>
    `;
    
    modal.innerHTML = modalHTML;
    document.body.appendChild(modal);
    
    // Configurar eventos
    const btnCerrar = modal.querySelector('.cerrar-modal');
    if (btnCerrar) {
      btnCerrar.addEventListener('click', () => {
        cerrarModal(id);
      });
    }
    
    // Cerrar al hacer clic fuera del modal
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        cerrarModal(id);
      }
    });
  } else {
    // Actualizar título y contenido si el modal ya existe
    const headerH3 = modal.querySelector('.modal-header h3');
    const modalBody = modal.querySelector('.modal-body');
    
    if (headerH3) headerH3.textContent = titulo;
    if (modalBody) modalBody.innerHTML = contenido;
  }
  
  return modal;
}

/**
 * Mostrar modal
 * @param {string|HTMLElement} modal - ID del modal o elemento modal
 */
export function mostrarModal(modal) {
  if (typeof modal === 'string') {
    modal = document.getElementById(modal);
  }
  
  if (modal) {
    modal.style.display = 'block';
    
    // Enfocar el primer input si existe
    setTimeout(() => {
      const primerInput = modal.querySelector('input, select, textarea');
      if (primerInput) primerInput.focus();
    }, 100);
  }
}

/**
 * Ocultar/cerrar modal
 * @param {string|HTMLElement} modal - ID del modal o elemento modal
 * @param {Function} callback - Función a ejecutar después de cerrar
 */
export function cerrarModal(modal, callback) {
  if (typeof modal === 'string') {
    modal = document.getElementById(modal);
  }
  
  if (modal) {
    modal.style.display = 'none';
    
    // Ejecutar callback si existe
    if (callback && typeof callback === 'function') {
      callback();
    }
  }
}

/**
 * Alias para cerrarModal para mantener compatibilidad
 */
export function ocultarModal(id) {
  cerrarModal(id);
}

/**
 * Muestra un modal de confirmación
 * @param {Object} options - Opciones de configuración
 * @param {string} options.title - Título del modal
 * @param {string} options.message - Mensaje de confirmación
 * @param {Function} options.onConfirm - Función a ejecutar al confirmar
 * @param {Function} options.onCancel - Función a ejecutar al cancelar
 */
export function confirmarAccion(options = {}) {
  const {
    title = '¿Estás seguro?',
    message = '¿Deseas continuar con esta acción?',
    onConfirm = null,
    onCancel = null
  } = options;
  
  const modalId = `confirm-modal-${Date.now()}`;
  
  // Crear contenido del modal
  const contenido = `
    <div style="text-align: center; font-size: 1.1rem; margin: 20px 0;">
      <p>${message}</p>
    </div>
    <div style="display: flex; justify-content: center; gap: 15px; margin-top: 25px;">
      <button id="${modalId}-cancel" style="
        background: linear-gradient(135deg, #7dd3fc, #fef3c7);
        color: #1f2937;
        border: none;
        border-radius: 25px;
        padding: 12px 30px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
      ">Cancelar</button>
      
      <button id="${modalId}-confirm" style="
        background: linear-gradient(135deg, #0ea5e9, #0284c7);
        color: white;
        border: none;
        border-radius: 25px;
        padding: 12px 30px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
      ">Confirmar</button>
    </div>
  `;
  
  const modal = crearModal(modalId, title, contenido);
  
  // Configurar eventos de los botones
  const btnConfirm = document.getElementById(`${modalId}-confirm`);
  const btnCancel = document.getElementById(`${modalId}-cancel`);
  
  if (btnConfirm) {
    btnConfirm.addEventListener('click', () => {
      cerrarModal(modal);
      if (onConfirm && typeof onConfirm === 'function') {
        onConfirm();
      }
    });
  }
  
  if (btnCancel) {
    btnCancel.addEventListener('click', () => {
      cerrarModal(modal);
      if (onCancel && typeof onCancel === 'function') {
        onCancel();
      }
    });
  }
  
  mostrarModal(modal);
}

/**
 * Muestra un modal de alerta/notificación
 * @param {Object} options - Opciones de configuración
 * @param {string} options.title - Título del modal
 * @param {string} options.message - Mensaje a mostrar
 * @param {string} options.type - Tipo: 'success', 'error', 'warning', 'info'
 * @param {Function} options.onClose - Función a ejecutar al cerrar
 */
export function mostrarAlerta(options = {}) {
  const {
    title = 'Notificación',
    message = '',
    type = 'info',
    onClose = null
  } = options;
  
  let icon, buttonStyle;
  
  switch (type) {
    case 'success':
      icon = '✅';
      buttonStyle = 'background: linear-gradient(135deg, #10b981, #34d399); color: white;';
      break;
    case 'error':
      icon = '❌';
      buttonStyle = 'background: linear-gradient(135deg, #ef4444, #f87171); color: white;';
      break;
    case 'warning':
      icon = '⚠️';
      buttonStyle = 'background: linear-gradient(135deg, #f59e0b, #fbbf24); color: white;';
      break;
    case 'info':
    default:
      icon = 'ℹ️';
      buttonStyle = 'background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white;';
      break;
  }
  
  const modalId = `alert-modal-${Date.now()}`;
  
  // Crear contenido del modal
  const contenido = `
    <div style="text-align: center;">
      <div style="font-size: 3rem; margin-bottom: 15px;">${icon}</div>
      <p style="font-size: 1.1rem;">${message}</p>
    </div>
    <div style="display: flex; justify-content: center; margin-top: 25px;">
      <button id="${modalId}-ok" style="
        ${buttonStyle}
        border: none;
        border-radius: 25px;
        padding: 12px 30px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
      ">Aceptar</button>
    </div>
  `;
  
  const modal = crearModal(modalId, title, contenido);
  
  // Configurar evento del botón
  const btnOk = document.getElementById(`${modalId}-ok`);
  if (btnOk) {
    btnOk.addEventListener('click', () => {
      cerrarModal(modal);
      if (onClose && typeof onClose === 'function') {
        onClose();
      }
    });
  }
  
  mostrarModal(modal);
}