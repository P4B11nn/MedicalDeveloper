// js/views/operacionesView.js
import { eliminarRegistro } from '../models/operacionesModel.js';
import { authModel } from '../models/storageModel.js';
import eventBus, { EVENT_NAMES } from '../utils/eventBus.js';

/**
 * Calcula el número de practicantes asignados a un grupo
 * @param {string} grupoId - ID del grupo
 * @returns {number} Número de practicantes asignados
 */
function contarPracticantesEnGrupo(grupoId) {
    if (!grupoId) return 0;
    const usuarios = authModel.getAllUsers();
    return usuarios.filter(usuario => 
        usuario.rol === 'practicante' && 
        usuario.grupoId === grupoId &&
        usuario.activo !== false
    ).length;
}

/**
 * Formatea la ubicación de un módulo para mostrar coordenadas y lugar de forma elegante
 * @param {Object} modulo - El objeto módulo con datos de ubicación
 * @returns {string} Ubicación formateada para mostrar
 */
function formatearUbicacion(modulo) {
    if (modulo.latitud && modulo.longitud && modulo.lugar) {
        return `${modulo.lugar}`;
    } else if (modulo.lugar) {
        return modulo.lugar;
    } else {
        return modulo.ubicacion || 'Sin ubicación';
    }
}

/**
 * Formatea las coordenadas para mostrar
 * @param {Object} modulo - El objeto módulo con datos de ubicación
 * @returns {string} Coordenadas formateadas o cadena vacía
 */
function formatearCoordenadas(modulo) {
    if (modulo.latitud && modulo.longitud) {
        return `Lat: ${modulo.latitud}, Lng: ${modulo.longitud}`;
    }
    return '';
}

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
    container.innerHTML = `
      <div style="
        text-align: center; 
        padding: 30px; 
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        border-radius: 12px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.05);
      ">
        <i class="fas fa-heartbeat" style="font-size: 3rem; color: #94a3b8; margin-bottom: 15px;"></i>
        <p style="font-size: 1.2rem; color: #64748b; margin: 0;">No hay módulos de salud configurados</p>
      </div>
    `;
    return;
  }

  // Importamos gestionModel para poder obtener información de grupos
  import('../models/gestionModel.js').then(({ gestionModel }) => {
    // Creamos un contenedor con estilo de cuadrícula para los módulos
    container.innerHTML = `
      <div style="
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 20px;
        padding: 10px 0;
      ">
        ${modulos.map(modulo => {
          let statusClass = modulo.estado.toLowerCase().replace(' ', '-');
          let grupoAsignado = null;
          
          // Definir colores según el estado
          let statusColor = '#10b981'; // Verde por defecto (activo)
          let statusBgColor = 'rgba(16, 185, 129, 0.1)';
          let statusIcon = 'fa-check-circle';
          
          if (statusClass.includes('inactivo')) {
            statusColor = '#f59e0b'; // Naranja
            statusBgColor = 'rgba(245, 158, 11, 0.1)';
            statusIcon = 'fa-exclamation-triangle';
          } else if (statusClass.includes('mantenimiento')) {
            statusColor = '#6366f1'; // Indigo
            statusBgColor = 'rgba(99, 102, 241, 0.1)';
            statusIcon = 'fa-tools';
          } else if (statusClass.includes('emergencia')) {
            statusColor = '#ef4444'; // Rojo
            statusBgColor = 'rgba(239, 68, 68, 0.1)';
            statusIcon = 'fa-exclamation-circle';
          }
          
          // Buscar información del grupo asignado, si existe
          if (modulo.grupoAsignadoId) {
            grupoAsignado = gestionModel.getGrupoById(modulo.grupoAsignadoId);
          }

          return `
            <div style="
              background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
              border-radius: 16px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.05);
              padding: 20px;
              transition: all 0.3s ease;
              border: 1px solid rgba(226, 232, 240, 0.6);
              overflow: hidden;
              position: relative;
            " onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 10px 25px rgba(0,0,0,0.1)';" 
               onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 20px rgba(0,0,0,0.05)';">
              
              ${modulo.tipo ? `
                <div style="
                  position: absolute;
                  top: 12px;
                  right: 12px;
                  background: #e2e8f0;
                  color: #475569;
                  font-size: 0.7rem;
                  padding: 3px 8px;
                  border-radius: 30px;
                  font-weight: 500;
                ">
                  ${modulo.tipo}
                </div>
              ` : ''}
              
              <h3 style="
                margin-top: 0;
                margin-bottom: 15px;
                color: #1e40af;
                font-size: 1.5rem;
                display: flex;
                align-items: center;
                gap: 8px;
              ">
                <i class="fas fa-hospital-alt" style="color: #60a5fa;"></i>
                ${modulo.nombre}
              </h3>
              
              <div style="
                display: flex;
                align-items: center;
                margin-bottom: 15px;
              ">
                <i class="fas fa-map-marker-alt" style="
                  color: #64748b;
                  margin-right: 8px;
                "></i>
                <div style="
                  color: #334155;
                  font-weight: 500;
                ">
                  <div>${formatearUbicacion(modulo)}</div>
                  ${formatearCoordenadas(modulo) ? `<div style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">${formatearCoordenadas(modulo)}</div>` : ''}
                </div>
              </div>
              
              <div style="
                display: inline-flex;
                align-items: center;
                padding: 6px 12px;
                border-radius: 30px;
                font-weight: 500;
                font-size: 0.9rem;
                margin-bottom: 20px;
                color: ${statusColor};
                background-color: ${statusBgColor};
              ">
                <i class="fas ${statusIcon}" style="margin-right: 8px;"></i>
                ${modulo.estado}
              </div>
              
              <div style="
                background: ${grupoAsignado ? 'rgba(96, 165, 250, 0.08)' : 'rgba(226, 232, 240, 0.5)'};
                border-radius: 12px;
                padding: 15px;
                margin-top: 10px;
              ">
                <h4 style="
                  margin-top: 0;
                  margin-bottom: 12px;
                  color: #334155;
                  font-size: 1.1rem;
                  border-bottom: 1px solid rgba(203, 213, 225, 0.5);
                  padding-bottom: 8px;
                  display: flex;
                  align-items: center;
                  gap: 8px;
                ">
                  <i class="fas fa-users" style="color: #60a5fa;"></i>
                  Equipo Asignado
                </h4>
                
                ${grupoAsignado ? `
                  <div style="font-size: 0.95rem;">
                    <div style="
                      display: flex;
                      align-items: center;
                      margin-bottom: 8px;
                    ">
                      <div style="
                        width: 24px;
                        color: #60a5fa;
                      "><i class="fas fa-user-friends"></i></div>
                      <div style="
                        color: #334155;
                        font-weight: 500;
                      ">${grupoAsignado.nombre}</div>
                    </div>
                    
                    <div style="
                      display: flex;
                      align-items: center;
                      margin-bottom: 8px;
                    ">
                      <div style="
                        width: 24px;
                        color: #60a5fa;
                      "><i class="fas fa-clock"></i></div>
                      <div style="
                        color: #334155;
                      ">Turno: <strong>${grupoAsignado.turno}</strong></div>
                    </div>
                    
                    <div style="
                      display: flex;
                      align-items: center;
                      margin-bottom: 8px;
                    ">
                      <div style="
                        width: 24px;
                        color: #60a5fa;
                      "><i class="fas fa-calendar-alt"></i></div>
                      <div style="
                        color: #334155;
                      ">Horario: <strong>${grupoAsignado.horario}</strong></div>
                    </div>
                    
                    <div style="
                      display: flex;
                      align-items: center;
                    ">
                      <div style="
                        width: 24px;
                        color: #60a5fa;
                      "><i class="fas fa-user-md"></i></div>
                      <div style="
                        color: #334155;
                      ">Miembros: <strong>${contarPracticantesEnGrupo(grupoAsignado.id)}</strong></div>
                    </div>
                  </div>
                ` : `
                  <div style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 10px;
                  ">
                    <i class="fas fa-user-slash" style="
                      font-size: 1.5rem;
                      color: #94a3b8;
                      margin-bottom: 8px;
                    "></i>
                    <p style="
                      color: #64748b;
                      margin: 0;
                      text-align: center;
                    ">Sin grupo asignado</p>
                  </div>
                `}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  });
}