// js/views/operacionesView.js
import { eliminarRegistro } from '../models/operacionesModel.js';
import eventBus, { EVENT_NAMES } from '../utils/eventBus.js';

/**
 * Shows a mini modal for operation actions
 */
function showOperationMiniModal(title, content, actions = []) {
  // Remove existing mini modal
  const existing = document.getElementById('operation-mini-modal');
  if (existing) {
    existing.remove();
  }
  
  // Create mini modal
  const miniModal = document.createElement('div');
  miniModal.id = 'operation-mini-modal';
  miniModal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border-radius: 10px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    z-index: 10000;
    min-width: 300px;
    max-width: 500px;
    animation: slideIn 0.3s ease;
  `;
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 9999;
  `;
  
  // Modal content
  miniModal.innerHTML = `
    <style>
      @keyframes slideIn {
        from { transform: translate(-50%, -60%); opacity: 0; }
        to { transform: translate(-50%, -50%); opacity: 1; }
      }
    </style>
    <div style="padding: 20px;">
      <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">${title}</h3>
      <div style="margin-bottom: 20px; color: #666;">${content}</div>
      <div id="operation-mini-modal-actions" style="display: flex; gap: 10px; justify-content: flex-end;">
        ${actions.map(action => `
          <button 
            data-action="${action.id}" 
            style="
              padding: 8px 16px; 
              border: none; 
              border-radius: 6px; 
              cursor: pointer; 
              font-weight: 500;
              background: ${action.color || '#6b7280'}; 
              color: white;
              transition: all 0.2s;
            "
            onmouseover="this.style.opacity='0.8'"
            onmouseout="this.style.opacity='1'"
          >
            ${action.label}
          </button>
        `).join('')}
      </div>
    </div>
  `;
  
  // Close modal function
  const closeMiniModal = () => {
    overlay.remove();
    miniModal.remove();
  };
  
  // Close on overlay click
  overlay.onclick = closeMiniModal;
  
  // Add action listeners
  miniModal.addEventListener('click', (e) => {
    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
      const actionId = actionBtn.getAttribute('data-action');
      const action = actions.find(a => a.id === actionId);
      if (action && action.callback) {
        action.callback();
      }
      closeMiniModal();
    }
  });
  
  // Add to DOM
  document.body.appendChild(overlay);
  document.body.appendChild(miniModal);
}

/**
 * Setup delete buttons for operation records
 */
function setupDeleteButtons(container) {
  const deleteButtons = container.querySelectorAll('.delete-registro-btn');
  
  deleteButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const registroId = button.getAttribute('data-registro-id');
      const registroIndex = parseInt(button.getAttribute('data-registro-index'));
      
      console.log('OperacionesView: Solicitando eliminar registro:', registroId);
      
      showOperationMiniModal(
        '🗑️ Eliminar Registro',
        `¿Estás seguro de eliminar este registro?<br><br>
        <strong>ID:</strong> ${registroId}<br>
        <small style="color: #ef4444;">⚠️ Esta acción no se puede deshacer</small>`,
        [
          {
            id: 'cancel',
            label: '✕ Cancelar',
            color: '#6b7280',
            callback: () => console.log('Eliminación de registro cancelada')
          },
          {
            id: 'confirm',
            label: '🗑️ Eliminar',
            color: '#ef4444',
            callback: () => {
              const success = eliminarRegistro(registroId);
              
              if (success) {
                console.log('OperacionesView: Registro eliminado exitosamente');
                
                // Emitir evento de registro eliminado
                eventBus.emit(EVENT_NAMES.OPERACION_DELETED, {
                  registroId: registroId,
                  timestamp: new Date().toISOString()
                });
                
                // Recargar los registros
                setTimeout(() => {
                  window.location.reload();
                }, 500);
                
                showOperationMiniModal('✅ Éxito', 'Registro eliminado correctamente', [
                  { id: 'ok', label: 'Aceptar', color: '#10b981', callback: () => {} }
                ]);
                
              } else {
                console.error('OperacionesView: Error al eliminar registro');
                showOperationMiniModal('❌ Error', 'No se pudo eliminar el registro', [
                  { id: 'ok', label: 'Aceptar', color: '#ef4444', callback: () => {} }
                ]);
              }
            }
          }
        ]
      );
    });
  });
}

/**
 * Renderiza la tabla con el historial de entradas y salidas.
 * @param {Array} historial - Los datos del historial a mostrar.
 * @param {HTMLElement} container - El elemento <div> donde se insertará la tabla.
 */
export function renderRegistroEntradasSalidas(historial, container) {
  if (!container) return;

  if (!historial || historial.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: #6b7280; font-size: 1.1rem; padding: 20px;">
        No hay registros que coincidan con los filtros.
      </div>
    `;
    return;
  }

  // Crea la tabla de registros.
  container.innerHTML = `
    <table class="tabla-registros">
      <thead>
        <tr>
          <th>Usuario</th>
          <th>Matrícula</th>
          <th>Mesa</th>
          <th>Rol</th>
          <th>Entrada</th>
          <th>Salida</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${historial.map((s, index) => `
          <tr>
            <td><strong>${s.nombre || 'N/A'}</strong></td>
            <td>${s.matricula || '-'}</td>
            <td>${s.mesa || '-'}</td>
            <td>${s.rol === 'admin' ? '🛡️ Administrador' : '👨‍⚕️ Practicante'}</td>
            <td>${s.entrada || 'No registrada'}</td>
            <td>${s.salida || 'En servicio'}</td>
            <td>
              <button 
                class="delete-registro-btn" 
                data-registro-id="${s.id}" 
                data-registro-index="${index}"
                style="
                  background: #ef4444; 
                  color: white; 
                  border: none; 
                  padding: 4px 8px; 
                  border-radius: 4px; 
                  cursor: pointer; 
                  font-size: 12px;
                  transition: all 0.2s;
                "
                onmouseover="this.style.background='#dc2626'"
                onmouseout="this.style.background='#ef4444'"
                title="Eliminar registro"
              >
                🗑️
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  // Agregar event listeners para los botones de eliminar
  setupDeleteButtons(container);
}

/**
 * Renderiza las tarjetas con el estado de los módulos de salud.
 * @param {Array} modulos - Los datos de los módulos a mostrar.
 * @param {HTMLElement} container - El elemento <div> donde se insertarán las tarjetas.
 */
export function renderModulos(modulos, container) {
  if (!container) return;

  if (!modulos || modulos.length === 0) {
    container.innerHTML = `<p class="welcome-message">No hay módulos configurados.</p>`;
    return;
  }

  // Importamos gestionModel para poder obtener información de grupos
  import('../models/gestionModel.js').then(({ gestionModel }) => {
    container.innerHTML = modulos.map(modulo => {
      let statusClass = modulo.estado.toLowerCase().replace(' ', '-');
      let grupoAsignado = null;
      
      // Buscar información del grupo asignado, si existe
      if (modulo.grupoAsignadoId) {
        grupoAsignado = gestionModel.getGrupoById(modulo.grupoAsignadoId);
      }

      return `
        <div class="modulo-item">
          <div class="modulo-nombre">${modulo.nombre}</div>
          <div class="modulo-ubicacion">${modulo.ubicacion}</div>
          <div class="modulo-status ${statusClass}">${modulo.estado}</div>
          <div class="modulo-info">
            ${grupoAsignado ? `
              <p><strong>Grupo Asignado:</strong> ${grupoAsignado.nombre}</p>
              <p><strong>Turno:</strong> ${grupoAsignado.turno}</p>
              <p><strong>Horario:</strong> ${grupoAsignado.horario}</p>
              <p><strong>Miembros:</strong> ${grupoAsignado.miembros.length}</p>
            ` : '<p><strong>Sin grupo asignado</strong></p>'}
          </div>
        </div>
      `;
    }).join('');
  });
}