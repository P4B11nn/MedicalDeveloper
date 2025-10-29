// js/views/operacionesView.js
import { eliminarRegistro, getRegistroEntradasSalidas, getRegistroActivoPorUsuarioId, registrarEntradaAsistencia, registrarSalidaAsistencia, getAsistencias, registrarAsistencia, actualizarAsistencia, eliminarAsistencia, getEstadisticasAsistencias } from '../models/operacionesModel.js';
import { authModel } from '../models/storageModel.js';
import { gestionModel } from '../models/gestionModel.js';
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
 * Formatea una fecha/hora almacenada en el registro.
 * Acepta strings (ya formateados) o objetos Date/ISO y devuelve una cadena legible.
 */
function formatDateTime(value) {
  if (!value && value !== 0) return null;
  try {
    // Si ya es una cadena no vacía, devolverla (se asume que viene de toLocaleString o similar)
    if (typeof value === 'string') {
      const v = value.trim();
      if (v === '' || v.toLowerCase() === 'null') return null;
      return v;
    }

    // Si es Date u otro tipo, intentar convertir a fecha legible
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString();
  } catch (e) {
    return null;
  }
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
 * Renderiza la vista general de asistencias con filtros
 * @param {Array} asistencias - Los datos de asistencias a mostrar
 * @param {HTMLElement} container - El elemento donde se insertará la vista
 */
export async function renderAsistenciasGenerales(container) {
  if (!container) return;

  // Obtener usuarios para los filtros
  const { authModel } = await import('../models/storageModel.js');
  const usuarios = await authModel.getAllUsers() || [];
  
  // Crear la estructura de filtros y tabla
  container.innerHTML = `
    <div class="asistencias-header">
      
      <!-- Panel de Filtros -->
      <div class="filtros-panel">
        <div class="filtros-grid">
          <div class="filtro-group">
            <label for="filtroUsuario">Usuario:</label>
            <select id="filtroUsuario">
              <option value="">Todos los usuarios</option>
              ${usuarios.map(u => `<option value="${u.id || u.uid}">${u.nombre} ${u.apellidos || ''} (${u.matricula})</option>`).join('')}
            </select>
          </div>
          
          <div class="filtro-group">
            <label for="filtroFechaDesde">Fecha desde:</label>
            <input type="date" id="filtroFechaDesde">
          </div>
          
          <div class="filtro-group">
            <label for="filtroFechaHasta">Fecha hasta:</label>
            <input type="date" id="filtroFechaHasta">
          </div>
          
          <div class="filtro-group">
            <label for="filtroEstado">Estado:</label>
            <select id="filtroEstado">
              <option value="">Todos los estados</option>
              <option value="activa">Activa</option>
              <option value="completada">Completada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
          
          <div class="filtro-group">
            <label for="filtroBusqueda">Buscar:</label>
            <input type="text" id="filtroBusqueda" placeholder="Nombre, matrícula...">
          </div>
        </div>
        
        <div class="filtros-actions">
          <button id="btnAplicarFiltros" class="btn btn-primary">
            <i class="fas fa-search"></i> Aplicar Filtros
          </button>
          <button id="btnLimpiarFiltros" class="btn btn-secondary">
            <i class="fas fa-times"></i> Limpiar
          </button>
          <button id="btnExportarAsistencias" class="btn btn-export">
            <i class="fas fa-download"></i> Exportar
          </button>
        </div>
      </div>
      
      <!-- Estadísticas rápidas -->
      <div id="estadisticasContainer" class="estadisticas-container">
        <div class="loading-container">
          <div class="loading-spinner-modern">
            <div class="loading-spinner-circle"></div>
            <div class="loading-spinner-circle"></div>
            <div class="loading-spinner-circle"></div>
          </div>
          <div class="loading-text">Cargando estadísticas...</div>
        </div>
      </div>
    </div>
    
    <!-- Tabla de asistencias -->
    <div id="asistenciasTableContainer">
      <div class="loading-container">
        <div class="loading-spinner-modern">
          <div class="loading-spinner-circle"></div>
          <div class="loading-spinner-circle"></div>
          <div class="loading-spinner-circle"></div>
        </div>
        <div class="loading-text">Cargando asistencias...</div>
        <div class="loading-progress">
          <div class="loading-progress-bar"></div>
        </div>
      </div>
    </div>
  `;
  
  // Configurar event listeners para filtros
  setupFiltrosHandlers(container);
  
  // Cargar datos iniciales
  await cargarAsistencias(container);
  await cargarEstadisticas(container);
}

/**
 * Configura los event listeners para los filtros
 */
function setupFiltrosHandlers(container) {
  const btnAplicarFiltros = container.querySelector('#btnAplicarFiltros');
  const btnLimpiarFiltros = container.querySelector('#btnLimpiarFiltros');
  const btnExportar = container.querySelector('#btnExportarAsistencias');
  
  // Aplicar filtros
  btnAplicarFiltros?.addEventListener('click', async () => {
    await cargarAsistencias(container);
    await cargarEstadisticas(container);
  });
  
  // Limpiar filtros
  btnLimpiarFiltros?.addEventListener('click', () => {
    container.querySelector('#filtroUsuario').value = '';
    container.querySelector('#filtroFechaDesde').value = '';
    container.querySelector('#filtroFechaHasta').value = '';
    container.querySelector('#filtroEstado').value = '';
    container.querySelector('#filtroBusqueda').value = '';
    
    cargarAsistencias(container);
    cargarEstadisticas(container);
  });
  
  // Exportar datos
  btnExportar?.addEventListener('click', () => {
    exportarAsistenciasFiltradas(container);
  });
  
  // Filtros en tiempo real para búsqueda
  const filtroBusqueda = container.querySelector('#filtroBusqueda');
  let searchTimeout;
  filtroBusqueda?.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      cargarAsistencias(container);
    }, 500);
  });
}

/**
 * Carga y muestra las asistencias con los filtros aplicados
 */
async function cargarAsistencias(container) {
  const tableContainer = container.querySelector('#asistenciasTableContainer');
  
  if (!tableContainer) return;
  
  // Mostrar loading
  tableContainer.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner-modern">
        <div class="loading-spinner-circle"></div>
        <div class="loading-spinner-circle"></div>
        <div class="loading-spinner-circle"></div>
      </div>
      <div class="loading-text">Cargando asistencias...</div>
      <div class="loading-progress">
        <div class="loading-progress-bar"></div>
      </div>
    </div>
  `;
  
  try {
    // Obtener filtros
    const filtros = obtenerFiltrosDesdeUI(container);
    
    // Obtener asistencias
    const asistencias = await getAsistencias(filtros);
    
    // Aplicar filtro de búsqueda local (si existe)
    const busqueda = container.querySelector('#filtroBusqueda')?.value?.toLowerCase() || '';
    let asistenciasFiltradas = asistencias;
    
    if (busqueda) {
      asistenciasFiltradas = asistencias.filter(a => 
        a.nombreUsuario?.toLowerCase().includes(busqueda) ||
        a.matricula?.toLowerCase().includes(busqueda)
      );
    }
    
    // Renderizar tabla
    await renderTablaAsistencias(asistenciasFiltradas, tableContainer);
    
  } catch (error) {
    console.error('Error cargando asistencias:', error);
    tableContainer.innerHTML = `
      <div style="text-align: center; color: #ef4444; padding: 20px;">
        <i class="fas fa-exclamation-triangle"></i>
        Error al cargar las asistencias. Verifique la conexión a Firebase.
      </div>
    `;
  }
}

/**
 * Carga y muestra las estadísticas
 */
async function cargarEstadisticas(container) {
  const statsContainer = container.querySelector('#estadisticasContainer');
  
  if (!statsContainer) return;
  
  try {
    const filtros = obtenerFiltrosDesdeUI(container);
    const estadisticas = await getEstadisticasAsistencias(filtros);
    
    statsContainer.innerHTML = `
      <div class="estadisticas-grid">
        <div class="estadistica-card">
          <div class="estadistica-icon">
            <i class="fas fa-calendar-check"></i>
          </div>
          <div class="estadistica-content">
            <div class="estadistica-numero">${estadisticas.total}</div>
            <div class="estadistica-label">Total Asistencias</div>
          </div>
        </div>
        
        <div class="estadistica-card">
          <div class="estadistica-icon activa">
            <i class="fas fa-clock"></i>
          </div>
          <div class="estadistica-content">
            <div class="estadistica-numero">${estadisticas.activas}</div>
            <div class="estadistica-label">Asistencias Activas</div>
          </div>
        </div>
        
        <div class="estadistica-card">
          <div class="estadistica-icon completada">
            <i class="fas fa-check-circle"></i>
          </div>
          <div class="estadistica-content">
            <div class="estadistica-numero">${estadisticas.completadas}</div>
            <div class="estadistica-label">Asistencias Completadas</div>
          </div>
        </div>
        
        <div class="estadistica-card">
          <div class="estadistica-icon">
            <i class="fas fa-users"></i>
          </div>
          <div class="estadistica-content">
            <div class="estadistica-numero">${estadisticas.usuariosUnicos}</div>
            <div class="estadistica-label">Usuarios Únicos</div>
          </div>
        </div>
      </div>
    `;
    
  } catch (error) {
    console.error('Error cargando estadísticas:', error);
    statsContainer.innerHTML = `
      <div style="text-align: center; color: #6b7280; padding: 20px;">
        Error al cargar estadísticas
      </div>
    `;
  }
}

/**
 * Obtiene los filtros desde la UI
 */
function obtenerFiltrosDesdeUI(container) {
  const filtros = {};
  
  const usuarioId = container.querySelector('#filtroUsuario')?.value;
  if (usuarioId) filtros.usuarioId = usuarioId;
  
  const fechaDesde = container.querySelector('#filtroFechaDesde')?.value;
  if (fechaDesde) filtros.fechaDesde = fechaDesde;
  
  const fechaHasta = container.querySelector('#filtroFechaHasta')?.value;
  if (fechaHasta) filtros.fechaHasta = fechaHasta;
  
  const estado = container.querySelector('#filtroEstado')?.value;
  if (estado) filtros.estado = estado;
  
  return filtros;
}

/**
 * Renderiza la tabla de asistencias
 */
async function renderTablaAsistencias(asistencias, container) {
  if (!asistencias || asistencias.length === 0) {
    container.innerHTML = `
      <div class="no-data-container">
        <div class="no-data-icon">
          <i class="fas fa-calendar-times"></i>
        </div>
        <h3 class="no-data-title">No se encontraron asistencias</h3>
        <p class="no-data-message">No hay registros de asistencia que coincidan con los filtros aplicados. Intente ajustar los criterios de búsqueda.</p>
        <div class="no-data-actions">
          <button id="btn-limpiar-filtros-vacio" class="btn btn-secondary">
            <i class="fas fa-times"></i> Limpiar Filtros
          </button>
          <button id="btn-nueva-asistencia" class="btn btn-primary">
            <i class="fas fa-plus"></i> Registrar Asistencia
          </button>
        </div>
      </div>
    `;
    
    // Configurar event listeners para botones vacíos
    container.querySelector('#btn-limpiar-filtros-vacio')?.addEventListener('click', () => {
      // Limpiar filtros y recargar
      const filtrosContainer = document.querySelector('.filtros-panel');
      if (filtrosContainer) {
        filtrosContainer.querySelector('#filtroUsuario').value = '';
        filtrosContainer.querySelector('#filtroFechaDesde').value = '';
        filtrosContainer.querySelector('#filtroFechaHasta').value = '';
        filtrosContainer.querySelector('#filtroEstado').value = '';
        filtrosContainer.querySelector('#filtroBusqueda').value = '';
        cargarAsistencias(container);
        cargarEstadisticas(container);
      }
    });
    
    container.querySelector('#btn-nueva-asistencia')?.addEventListener('click', () => {
      showOperationMiniModal('Nueva Asistencia', 'Funcionalidad de registro manual próximamente disponible', [
        { id: 'ok', label: 'Aceptar', color: '#10b981', callback: () => {} }
      ]);
    });
    
    return;
  }

  // Procesar asistencias de forma asíncrona para obtener etiquetas de módulo
  const asistenciasProcesadas = await Promise.all(asistencias.map(async asistencia => {
    const fecha = asistencia.fecha ? new Date(asistencia.fecha).toLocaleDateString('es-ES') : '';
    const horaEntrada = asistencia.horaEntrada ? new Date(asistencia.horaEntrada).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';
    const horaSalida = asistencia.horaSalida ? new Date(asistencia.horaSalida).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';
    
    // Calcular duración
    let duracion = '';
    let duracionClass = '';
    if (asistencia.horaEntrada && asistencia.horaSalida) {
      const entrada = new Date(asistencia.horaEntrada);
      const salida = new Date(asistencia.horaSalida);
      const diffMs = salida - entrada;
      const horas = Math.floor(diffMs / (1000 * 60 * 60));
      const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      duracion = `${horas}h ${minutos}m`;
      
      // Colorear duración según tiempo trabajado
      if (horas >= 8) duracionClass = 'duracion-excelente';
      else if (horas >= 6) duracionClass = 'duracion-buena';
      else if (horas >= 4) duracionClass = 'duracion-regular';
      else duracionClass = 'duracion-corta';
    } else if (asistencia.horaEntrada && !asistencia.horaSalida) {
      duracion = 'En servicio';
      duracionClass = 'duracion-activa';
    }
    
    // Estado con colores mejorados
    const estadoClass = asistencia.estado === 'activa' ? 'estado-activa' : 
                       asistencia.estado === 'completada' ? 'estado-completada' : 'estado-cancelada';
    
    // Icono según estado
    const estadoIcon = asistencia.estado === 'activa' ? 'fa-clock' : 
                      asistencia.estado === 'completada' ? 'fa-check-circle' : 'fa-times-circle';
    
    // Obtener etiqueta de módulo de forma asíncrona
    const moduloLabel = await obtenerEtiquetaModulo(asistencia.moduloId);
    
    return {
      ...asistencia,
      fecha,
      horaEntrada,
      horaSalida,
      duracion,
      duracionClass,
      estadoClass,
      estadoIcon,
      moduloLabel
    };
  }));

  container.innerHTML = `
    <table class="tabla-asistencias">
      <thead>
        <tr>
          <th>Usuario</th>
          <th>Matrícula</th>
          <th>Módulo</th>
          <th>Fecha</th>
          <th>Hora Entrada</th>
          <th>Hora Salida</th>
          <th>Estado</th>
          <th>Duración</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${asistenciasProcesadas.map(asistencia => `
          <tr class="asistencia-row ${asistencia.estado === 'activa' ? 'asistencia-activa' : ''}">
            <td>
              <div class="usuario-info">
                <div class="usuario-nombre"><strong>${asistencia.nombreUsuario || 'N/A'}</strong></div>
                <div class="usuario-avatar">${(asistencia.nombreUsuario || 'N')[0].toUpperCase()}</div>
              </div>
            </td>
            <td><span class="matricula-badge">${asistencia.matricula || '-'}</span></td>
            <td><span class="modulo-label">${asistencia.moduloLabel}</span></td>
            <td><span class="fecha-display">${asistencia.fecha}</span></td>
            <td><span class="hora-entrada">${asistencia.horaEntrada}</span></td>
            <td><span class="hora-salida">${asistencia.horaSalida}</span></td>
            <td><span class="estado-badge ${asistencia.estadoClass}"><i class="fas ${asistencia.estadoIcon}"></i> ${asistencia.estado || 'N/A'}</span></td>
            <td><span class="duracion-display ${asistencia.duracionClass}">${asistencia.duracion}</span></td>
            <td>
              <div class="acciones-container">
                <button class="btn-accion btn-edit-asistencia" data-id="${asistencia.id}" title="Editar asistencia">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn-accion btn-view-details" data-id="${asistencia.id}" title="Ver detalles">
                  <i class="fas fa-eye"></i>
                </button>
                <button class="btn-accion btn-delete-asistencia" data-id="${asistencia.id}" title="Eliminar asistencia">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  // Configurar event listeners para acciones
  setupTablaAsistenciasHandlers(container);
}

/**
 * Configura los event listeners para la tabla de asistencias
 */
function setupTablaAsistenciasHandlers(container) {
  // Editar asistencia
  container.querySelectorAll('.btn-edit-asistencia').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const asistenciaId = e.currentTarget.dataset.id;
      mostrarModalEditarAsistencia(asistenciaId);
    });
  });
  
  // Ver detalles
  container.querySelectorAll('.btn-view-details').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const asistenciaId = e.currentTarget.dataset.id;
      mostrarModalDetallesAsistencia(asistenciaId);
    });
  });
  
  // Eliminar asistencia
  container.querySelectorAll('.btn-delete-asistencia').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const asistenciaId = e.currentTarget.dataset.id;
      confirmarEliminarAsistencia(asistenciaId);
    });
  });
}

/**
 * Muestra modal con detalles de asistencia
 */
async function mostrarModalDetallesAsistencia(asistenciaId) {
  try {
    // Obtener la asistencia específica
    const asistencias = await getAsistencias({ id: asistenciaId });
    const asistencia = asistencias.find(a => a.id === asistenciaId);
    
    if (!asistencia) {
      showOperationMiniModal('Error', 'No se encontró la asistencia especificada', [
        { id: 'ok', label: 'Aceptar', color: '#ef4444', callback: () => {} }
      ]);
      return;
    }
    
    // Calcular duración
    let duracion = 'N/A';
    if (asistencia.horaEntrada && asistencia.horaSalida) {
      const entrada = new Date(asistencia.horaEntrada);
      const salida = new Date(asistencia.horaSalida);
      const diffMs = salida - entrada;
      const horas = Math.floor(diffMs / (1000 * 60 * 60));
      const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      duracion = `${horas}h ${minutos}m`;
    } else if (asistencia.horaEntrada) {
      duracion = 'En servicio';
    }
    
    // Formatear fechas
    const fecha = asistencia.fecha ? new Date(asistencia.fecha).toLocaleDateString('es-ES', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    }) : 'N/A';
    
    const horaEntrada = asistencia.horaEntrada ? new Date(asistencia.horaEntrada).toLocaleString('es-ES') : 'N/A';
    const horaSalida = asistencia.horaSalida ? new Date(asistencia.horaSalida).toLocaleString('es-ES') : 'N/A';
    
    // Crear contenido del modal
    const contenido = `
      <div style="text-align: left; max-width: 400px;">
        <div style="margin-bottom: 15px;">
          <strong style="color: #374151;">Usuario:</strong><br>
          <span style="font-size: 1.1rem; color: #1f2937;">${asistencia.nombreUsuario || 'N/A'}</span>
        </div>
        
        <div style="margin-bottom: 15px;">
          <strong style="color: #374151;">Matrícula:</strong><br>
          <span style="font-family: monospace; background: rgba(139, 92, 246, 0.1); padding: 2px 6px; border-radius: 4px;">${asistencia.matricula || 'N/A'}</span>
        </div>
        
        <div style="margin-bottom: 15px;">
          <strong style="color: #374151;">Módulo:</strong><br>
          <span style="background: rgba(16, 185, 129, 0.1); color: #059669; padding: 2px 6px; border-radius: 4px;">${await obtenerEtiquetaModulo(asistencia.moduloId) || 'N/A'}</span>
        </div>
        
        <div style="margin-bottom: 15px;">
          <strong style="color: #374151;">Fecha:</strong><br>
          <span>${fecha}</span>
        </div>
        
        <div style="margin-bottom: 15px;">
          <strong style="color: #374151;">Hora de Entrada:</strong><br>
          <span style="font-family: monospace;">${horaEntrada}</span>
        </div>
        
        <div style="margin-bottom: 15px;">
          <strong style="color: #374151;">Hora de Salida:</strong><br>
          <span style="font-family: monospace;">${horaSalida}</span>
        </div>
        
        <div style="margin-bottom: 15px;">
          <strong style="color: #374151;">Duración:</strong><br>
          <span style="font-weight: 600;">${duracion}</span>
        </div>
        
        <div style="margin-bottom: 15px;">
          <strong style="color: #374151;">Estado:</strong><br>
          <span class="estado-badge ${asistencia.estado === 'activa' ? 'estado-activa' : asistencia.estado === 'completada' ? 'estado-completada' : 'estado-cancelada'}">
            <i class="fas ${asistencia.estado === 'activa' ? 'fa-clock' : asistencia.estado === 'completada' ? 'fa-check-circle' : 'fa-times-circle'}"></i>
            ${asistencia.estado || 'N/A'}
          </span>
        </div>
        
        ${asistencia.observaciones ? `
          <div style="margin-bottom: 15px;">
            <strong style="color: #374151;">Observaciones:</strong><br>
            <span style="font-style: italic;">${asistencia.observaciones}</span>
          </div>
        ` : ''}
        
        <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
          <strong style="color: #374151;">ID de Registro:</strong><br>
          <span style="font-family: monospace; font-size: 0.8rem; background: #f3f4f6; padding: 2px 4px; border-radius: 2px;">${asistencia.id}</span>
        </div>
      </div>
    `;
    
    showOperationMiniModal('Detalles de Asistencia', contenido, [
      { id: 'ok', label: 'Cerrar', color: '#6b7280', callback: () => {} }
    ]);
    
  } catch (error) {
    console.error('Error obteniendo detalles de asistencia:', error);
    showOperationMiniModal('Error', 'No se pudieron cargar los detalles de la asistencia', [
      { id: 'ok', label: 'Aceptar', color: '#ef4444', callback: () => {} }
    ]);
  }
}

/**
 * Confirma eliminación de asistencia
 */
function confirmarEliminarAsistencia(asistenciaId) {
  showOperationMiniModal(
    '🗑️ Eliminar Asistencia',
    '¿Estás seguro de eliminar esta asistencia?<br><br><small style="color: #ef4444;">⚠️ Esta acción no se puede deshacer</small>',
    [
      {
        id: 'cancel',
        label: '✕ Cancelar',
        color: '#6b7280',
        callback: () => console.log('Eliminación cancelada')
      },
      {
        id: 'confirm',
        label: '🗑️ Eliminar',
        color: '#ef4444',
        callback: () => eliminarAsistenciaHandler(asistenciaId)
      }
    ]
  );
}

/**
 * Maneja la eliminación de asistencia
 */
async function eliminarAsistenciaHandler(asistenciaId) {
  try {
    const success = await eliminarAsistencia(asistenciaId);
    if (success) {
      showOperationMiniModal('✅ Éxito', 'Asistencia eliminada correctamente', [
        { id: 'ok', label: 'Aceptar', color: '#10b981', callback: () => {
          // Recargar la vista
          window.location.reload();
        }}
      ]);
    } else {
      throw new Error('Error al eliminar');
    }
  } catch (error) {
    console.error('Error eliminando asistencia:', error);
    showOperationMiniModal('❌ Error', 'No se pudo eliminar la asistencia', [
      { id: 'ok', label: 'Aceptar', color: '#ef4444', callback: () => {} }
    ]);
  }
}

/**
 * Exporta las asistencias filtradas
 */
async function exportarAsistenciasFiltradas(container) {
  try {
    // Obtener filtros actuales
    const filtros = obtenerFiltrosDesdeUI(container);
    
    // Obtener asistencias con filtros aplicados
    const asistencias = await getAsistencias(filtros);
    
    if (!asistencias || asistencias.length === 0) {
      showOperationMiniModal('Sin Datos', 'No hay asistencias para exportar con los filtros actuales', [
        { id: 'ok', label: 'Aceptar', color: '#f59e0b', callback: () => {} }
      ]);
      return;
    }
    
    // Procesar asistencias para exportación
    const asistenciasProcesadas = await Promise.all(asistencias.map(async asistencia => {
      const fecha = asistencia.fecha ? new Date(asistencia.fecha).toLocaleDateString('es-ES') : '';
      const horaEntrada = asistencia.horaEntrada ? new Date(asistencia.horaEntrada).toLocaleString('es-ES') : '';
      const horaSalida = asistencia.horaSalida ? new Date(asistencia.horaSalida).toLocaleString('es-ES') : '';
      
      // Calcular duración
      let duracion = '';
      if (asistencia.horaEntrada && asistencia.horaSalida) {
        const entrada = new Date(asistencia.horaEntrada);
        const salida = new Date(asistencia.horaSalida);
        const diffMs = salida - entrada;
        const horas = Math.floor(diffMs / (1000 * 60 * 60));
        const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        duracion = `${horas}h ${minutos}m`;
      } else if (asistencia.horaEntrada) {
        duracion = 'En servicio';
      }
      
      const moduloLabel = await obtenerEtiquetaModulo(asistencia.moduloId);
      
      return [
        `"${asistencia.nombreUsuario || ''}"`,
        `"${asistencia.matricula || ''}"`,
        `"${moduloLabel}"`,
        `"${fecha}"`,
        `"${horaEntrada}"`,
        `"${horaSalida}"`,
        `"${asistencia.estado || ''}"`,
        `"${duracion}"`,
        `"${asistencia.observaciones || ''}"`
      ].join(',');
    }));
    
    // Crear contenido CSV
    const headers = [
      '"Usuario"',
      '"Matrícula"',
      '"Módulo"',
      '"Fecha"',
      '"Hora Entrada"',
      '"Hora Salida"',
      '"Estado"',
      '"Duración"',
      '"Observaciones"'
    ];
    const csvContent = [
      headers.join(','),
      ...asistenciasProcesadas
    ];
    
    // Esperar a que todas las promesas se resuelvan
    const csvLines = await Promise.all(csvContent);
    const csvData = csvLines.join('\n');
    
    // Crear y descargar archivo
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      // Generar nombre de archivo con fecha
      const fechaActual = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `asistencias_${fechaActual}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showOperationMiniModal('✅ Exportación Exitosa', `Se exportaron ${asistencias.length} registros de asistencia`, [
        { id: 'ok', label: 'Aceptar', color: '#10b981', callback: () => {} }
      ]);
    } else {
      // Fallback para navegadores antiguos
      showOperationMiniModal('Error', 'Su navegador no soporta la descarga automática de archivos', [
        { id: 'ok', label: 'Aceptar', color: '#ef4444', callback: () => {} }
      ]);
    }
    
  } catch (error) {
    console.error('Error exportando asistencias:', error);
    showOperationMiniModal('❌ Error', 'No se pudieron exportar las asistencias', [
      { id: 'ok', label: 'Aceptar', color: '#ef4444', callback: () => {} }
    ]);
  }
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

/**
 * Renderiza la lista de asistencia con checkboxes de entrada/salida
 */
export async function renderAsistencia(listaUsuarios, container) {
  if (!container) return;

  if (!listaUsuarios || listaUsuarios.length === 0) {
    console.log('OperacionesView: renderAsistencia llamada pero listaUsuarios está vacía');
    container.innerHTML = `
      <div style="text-align:center; color:#6b7280; padding:20px;">
        <div style="font-weight:600; margin-bottom:8px;">No hay usuarios disponibles para mostrar</div>
        <div style="font-size:13px; color:#9ca3af;">Verifica que hayas creado usuarios en el módulo de Usuarios. Revisa la consola para más detalles.</div>
      </div>
    `;
    return;
  }

  // Obtener asistencias activas desde Firebase
  const asistenciasActivas = await getAsistencias({ estado: 'activa', limit: 100 });
  console.log('OperacionesView: renderAsistencia - usuarios recibidos:', listaUsuarios.length, 'asistencias activas:', asistenciasActivas.length);

  // Ordenar alfabéticamente por nombre
  listaUsuarios = (listaUsuarios || []).slice().sort((a,b) => {
    const na = (a.nombre || a.id || '').toLowerCase();
    const nb = (b.nombre || b.id || '').toLowerCase();
    return na.localeCompare(nb, 'es', { sensitivity: 'base' });
  });

  // Renderizar con etiquetas de módulo asíncronas
  const userRows = await Promise.all(listaUsuarios.map(async u => {
    // Buscar si el usuario tiene una asistencia activa
    const asistenciaActiva = asistenciasActivas.find(a => a.matricula === u.matricula);
    const activo = !!asistenciaActiva;
    const entradaTime = asistenciaActiva ? (formatDateTime(asistenciaActiva.horaEntrada) || '') : '';
    const moduloLabel = await obtenerEtiquetaModulo(u.modulo || u.mesa || u.moduloId, u.grupoId);

    return `
      <div class="asistencia-row" data-matricula="${u.matricula}" data-usuario-id="${u.id || u.uid}" style="display:flex; align-items:center; gap:12px; padding:10px; border:1px solid #e2e8f0; border-radius:8px;">
        <div style="flex:2; min-width:200px; display:flex; flex-direction:column;">
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="font-weight:600;">${u.nombre || u.id}</div>

          </div>
          <div style="font-size:12px; color:#64748b;">Matrícula: ${u.matricula || '-'}</div>
        </div>
        <div style="flex:1; min-width:100px;">Módulo: <strong>${moduloLabel}</strong></div>
        <div style="flex:1; min-width:140px; font-size:13px; color:#374151;">Entrada: <span class="entrada-time">${entradaTime}</span></div>
        <div style="flex:1; min-width:140px; font-size:13px; color:#374151;">Salida: <span class="salida-time"></span></div>
        <div style="display:flex; gap:8px; align-items:center;">
          <label style="display:flex; align-items:center; gap:6px;">
            <input type="checkbox" class="entrada-chk" ${activo ? 'checked disabled' : ''} /> Entrada
          </label>
          <label style="display:flex; align-items:center; gap:6px;">
            <input type="checkbox" class="salida-chk" ${activo ? '' : 'disabled'} /> Salida
          </label>
        </div>
      </div>
    `;
  }));

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:8px;">
      ${userRows.join('')}
    </div>
  `;

  // Agregar event listeners
  setupAsistenciaHandlers(container);
}

function setupAsistenciaHandlers(container) {
  const rows = container.querySelectorAll('.asistencia-row');
  rows.forEach(row => {
    const matricula = row.getAttribute('data-matricula');
    const usuarioId = row.getAttribute('data-usuario-id');
    const entradaChk = row.querySelector('.entrada-chk');
    const salidaChk = row.querySelector('.salida-chk');
    const entradaTimeEl = row.querySelector('.entrada-time');
    const salidaTimeEl = row.querySelector('.salida-time');

    if (entradaChk) {
      entradaChk.addEventListener('change', async (e) => {
        if (entradaChk.checked) {
          try {
            // Registrar entrada usando el usuario ID directamente
            const usuario = { id: usuarioId, matricula: matricula, nombre: matricula };
            const registro = await registrarEntradaAsistencia(usuario);

            if (registro) {
              // After registering, disable entrada and enable salida
              entradaChk.disabled = true;
              salidaChk.disabled = false;
              entradaChk.checked = true;
              // Update displayed entrada time
              if (registro.entrada && entradaTimeEl) entradaTimeEl.textContent = registro.entrada;

              console.log('OperacionesView: Entrada registrada exitosamente para usuario ID:', usuarioId);
            } else {
              console.error('OperacionesView: Error registrando entrada');
              entradaChk.checked = false;
              showOperationMiniModal('Error', 'No se pudo registrar la entrada. Verifique la conexión a Firebase.', [
                { id: 'ok', label: 'Aceptar', color: '#ef4444', callback: () => {} }
              ]);
            }
          } catch (error) {
            console.error('Error en registro de entrada:', error);
            entradaChk.checked = false;
            showOperationMiniModal('Error', 'Error al registrar entrada: ' + error.message, [
              { id: 'ok', label: 'Aceptar', color: '#ef4444', callback: () => {} }
            ]);
          }
        }
      });
    }

    if (salidaChk) {
        salidaChk.addEventListener('change', async (e) => {
          if (salidaChk.checked) {
            try {
              // Only allow salida if there is an active registro
              const activo = await getRegistroActivoPorUsuarioId(usuarioId);
              if (!activo) {
                console.warn('OperacionesView: No existe entrada activa para usuario ID:', usuarioId);
                showOperationMiniModal('Sin entrada activa', 'No existe una entrada activa para registrar la salida.', [
                  { id: 'ok', label: 'Aceptar', color: '#f59e0b', callback: () => { salidaChk.checked = false; } }
                ]);
                salidaChk.checked = false;
                return;
              }

              // Mostrar confirmación usando el mini modal
              showOperationMiniModal('Confirmar salida', `¿Deseas registrar la salida de <strong>${activo.nombre || activo.matricula}</strong>?`, [
                { id: 'cancel', label: 'Cancelar', color: '#6b7280', callback: () => { salidaChk.checked = false; } },
                { id: 'confirm', label: 'Registrar Salida', color: '#ef4444', callback: async () => {
                  try {
                    const resultado = await registrarSalidaAsistencia(usuarioId);

                    if (resultado) {
                      // After registering salida, disable both and update UI
                      salidaChk.disabled = true;
                      entradaChk.disabled = false; // allow new entrada next time
                      if (resultado.salida && salidaTimeEl) salidaTimeEl.textContent = resultado.salida;
                      // Remove badge if present
                      const badge = row.querySelector('.badge-en-servicio'); if (badge) badge.remove();

                      console.log('OperacionesView: Salida registrada exitosamente para usuario ID:', usuarioId);
                    } else {
                      console.error('OperacionesView: Error registrando salida');
                      salidaChk.checked = false;
                      showOperationMiniModal('Error', 'No se pudo registrar la salida. Verifique la conexión a Firebase.', [
                        { id: 'ok', label: 'Aceptar', color: '#ef4444', callback: () => {} }
                      ]);
                    }
                  } catch (error) {
                    console.error('Error en registro de salida:', error);
                    salidaChk.checked = false;
                    showOperationMiniModal('Error', 'Error al registrar salida: ' + error.message, [
                      { id: 'ok', label: 'Aceptar', color: '#ef4444', callback: () => {} }
                    ]);
                  }
                }}
              ]);
            } catch (error) {
              console.error('Error verificando asistencia activa:', error);
              salidaChk.checked = false;
              showOperationMiniModal('Error', 'Error al verificar estado de asistencia: ' + error.message, [
                { id: 'ok', label: 'Aceptar', color: '#ef4444', callback: () => {} }
              ]);
            }
          }
        });
    }
  });
}

/**
 * Normaliza y devuelve una etiqueta legible para la mesa/modulo de un usuario o registro.
 * Si el valor no concuerda con los módulos configurados, devuelve 'No asignada'.
 */
export async function obtenerEtiquetaModulo(valor, grupoId) {
  const modulos = await gestionModel.getModulos() || [];

  // Si ya es un id de módulo (ej. 'M01' o 'M1') buscar por id
  if (valor) {
    const v = String(valor).trim();

    // Buscar por id exacto (Mxx)
    const byId = modulos.find(m => (m.id || '').toLowerCase() === v.toLowerCase());
    if (byId) return byId.nombre;

    // Si el valor contiene un número (ej. '3', 'mesa 3', 'modulo-03'), extraerlo e intentar mapear a M0N
    const numMatch = v.match(/(\d+)/);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      if (!isNaN(num)) {
        const padded = `M${String(num).padStart(2, '0')}`;
        const byNum = modulos.find(m => (m.id || '').toUpperCase() === padded.toUpperCase());
        if (byNum) return byNum.nombre;
      }
    }

    // Buscar por nombre que contenga la cadena
    const byName = modulos.find(m => (m.nombre || '').toLowerCase().includes(v.toLowerCase()));
    if (byName) return byName.nombre;
  }

  // Intentar detectar por grupo asignado
  if (grupoId) {
    const byGroup = modulos.find(m => (m.grupoAsignadoId || '').toString() === grupoId.toString());
    if (byGroup) return byGroup.nombre;
  }

  return 'No asignada';
}

// Estilos CSS para la vista de asistencias (se inyectan dinámicamente)
const estilosAsistencias = `
<style>
.filtros-panel {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.filtros-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.filtro-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.filtro-group label {
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;
}

.filtro-group input,
.filtro-group select {
  padding: 8px 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.filtro-group input:focus,
.filtro-group select:focus {
  border-color: #06b6d4;
  box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.1);
}

.filtros-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
}

.btn-primary {
  background: linear-gradient(135deg, #06b6d4, #0891b2);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(6, 182, 212, 0.3);
  background: linear-gradient(135deg, #0891b2, #0e7490);
}

.btn-secondary {
  background: linear-gradient(135deg, #6b7280, #4b5563);
  color: white;
}

.btn-secondary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(107, 114, 128, 0.3);
  background: linear-gradient(135deg, #4b5563, #374151);
}

.btn-export {
  background: linear-gradient(135deg, #10b981, #34d399);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 25px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-export:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.3);
}

.estadisticas-container {
  margin-bottom: 20px;
}

.estadisticas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.estadistica-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.estadistica-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.estadistica-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7dd3fc, #fef3c7);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2rem;
}

.estadistica-icon.activa {
  background: linear-gradient(135deg, #06b6d4, #0891b2);
}

.estadistica-icon.completada {
  background: linear-gradient(135deg, #10b981, #34d399);
}

.estadistica-content {
  flex: 1;
}

.estadistica-numero {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 5px;
}

.estadistica-label {
  font-size: 0.9rem;
  color: #6b7280;
  font-weight: 500;
}

.tabla-asistencias {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.tabla-asistencias th {
  background: linear-gradient(135deg, #7dd3fc, #fef3c7);
  color: #1f2937;
  text-align: left;
  padding: 15px;
  font-weight: 600;
}

.tabla-asistencias td {
  padding: 12px 15px;
  border-bottom: 1px solid rgba(125, 211, 252, 0.2);
}

.tabla-asistencias tr:last-child td {
  border-bottom: none;
}

.tabla-asistencias tr:hover {
  background-color: rgba(125, 211, 252, 0.1);
}

.estado-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
}

.estado-activa {
  background: rgba(6, 182, 212, 0.1);
  color: #0891b2;
}

.estado-completada {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}

.estado-cancelada {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.btn-edit-asistencia,
.btn-delete-asistencia,
.btn-view-details {
  background: none;
  border: none;
  padding: 6px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  margin-right: 5px;
  transition: all 0.2s ease;
}

.btn-edit-asistencia {
  color: #06b6d4;
}

.btn-edit-asistencia:hover {
  background: rgba(6, 182, 212, 0.1);
  transform: scale(1.1);
}

.btn-view-details {
  color: #8b5cf6;
}

.btn-view-details:hover {
  background: rgba(139, 92, 246, 0.1);
  transform: scale(1.1);
}

.btn-delete-asistencia {
  color: #ef4444;
}

.btn-delete-asistencia:hover {
  background: rgba(239, 68, 68, 0.1);
  transform: scale(1.1);
}

.btn-accion {
  background: none;
  border: none;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
  margin-right: 4px;
}

.btn-accion:hover {
  transform: scale(1.1);
}

.btn-accion:last-child {
  margin-right: 0;
}

.acciones-container {
  display: flex;
  gap: 4px;
  justify-content: center;
}

.usuario-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.usuario-nombre {
  flex: 1;
}

.usuario-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #06b6d4, #0891b2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.matricula-badge {
  background: rgba(139, 92, 246, 0.1);
  color: #7c3aed;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

.modulo-label {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

.fecha-display {
  font-weight: 500;
  color: #374151;
}

.hora-entrada,
.hora-salida {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  color: #1f2937;
}

.duracion-display {
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.85rem;
}

.duracion-activa {
  background: rgba(6, 182, 212, 0.1);
  color: #0891b2;
}

.duracion-excelente {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}

.duracion-buena {
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
}

.duracion-regular {
  background: rgba(251, 191, 36, 0.1);
  color: #f59e0b;
}

.duracion-corta {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.asistencia-row {
  transition: all 0.2s ease;
}

.asistencia-row:hover {
  background-color: rgba(125, 211, 252, 0.05);
  transform: scale(1.01);
}

.asistencia-activa {
  background-color: rgba(6, 182, 212, 0.05);
  border-left: 4px solid #06b6d4;
}

.asistencia-activa:hover {
  background-color: rgba(6, 182, 212, 0.1);
}

.no-data-container {
  text-align: center;
  padding: 60px 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 16px;
  margin: 20px 0;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

.no-data-icon {
  font-size: 4rem;
  color: #cbd5e1;
  margin-bottom: 20px;
  animation: pulse 2s infinite;
}

.no-data-title {
  color: #475569;
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 10px;
}

.no-data-message {
  color: #64748b;
  font-size: 1rem;
  margin-bottom: 30px;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

.no-data-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;
}

.loading-spinner {
  text-align: center;
  padding: 40px;
  color: #6b7280;
}

.loading-spinner i {
  font-size: 2rem;
  margin-bottom: 10px;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.loading-container {
  text-align: center;
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.loading-spinner-modern {
  display: flex;
  gap: 8px;
  align-items: center;
}

.loading-spinner-circle {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: linear-gradient(135deg, #06b6d4, #0891b2);
  animation: loading-bounce 1.4s ease-in-out infinite both;
}

.loading-spinner-circle:nth-child(1) { animation-delay: -0.32s; }
.loading-spinner-circle:nth-child(2) { animation-delay: -0.16s; }
.loading-spinner-circle:nth-child(3) { animation-delay: 0s; }

@keyframes loading-bounce {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.loading-text {
  color: #6b7280;
  font-size: 1rem;
  font-weight: 500;
}

.loading-progress {
  width: 200px;
  height: 4px;
  background: rgba(6, 182, 212, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.loading-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #06b6d4, #0891b2);
  border-radius: 2px;
  animation: loading-progress 2s ease-in-out infinite;
}

@keyframes loading-progress {
  0% { width: 0%; }
  50% { width: 70%; }
  100% { width: 100%; }
}

@media (max-width: 768px) {
  .filtros-grid {
    grid-template-columns: 1fr;
  }
  
  .filtros-actions {
    flex-direction: column;
  }
  
  .estadisticas-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .tabla-asistencias {
    font-size: 0.9rem;
  }
  
  .tabla-asistencias th,
  .tabla-asistencias td {
    padding: 8px 10px;
  }
  
  .usuario-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
  
  .acciones-container {
    flex-direction: column;
    gap: 2px;
  }
  
  .btn-accion {
    padding: 6px;
    font-size: 12px;
  }
  
  .usuario-avatar {
    width: 24px;
    height: 24px;
    font-size: 12px;
  }
  
  .matricula-badge,
  .modulo-label,
  .duracion-display {
    font-size: 0.75rem;
    padding: 2px 6px;
  }
  
  .estado-badge {
    font-size: 0.75rem;
    padding: 2px 6px;
  }
}

@media (max-width: 480px) {
  .content-title {
    font-size: 1.5rem;
  }
  
  .filtros-panel {
    padding: 15px;
  }
  
  .estadistica-card {
    padding: 15px;
  }
  
  .estadistica-numero {
    font-size: 1.5rem;
  }
  
  .tabla-asistencias {
    font-size: 0.8rem;
  }
  
  .tabla-asistencias th:nth-child(8),
  .tabla-asistencias td:nth-child(8),
  .tabla-asistencias th:nth-child(9),
  .tabla-asistencias td:nth-child(9) {
    display: none;
  }
}
</style>
`;

// Inyectar estilos cuando se carga el módulo
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    if (!document.querySelector('style[data-asistencias-styles]')) {
      const styleElement = document.createElement('style');
      styleElement.setAttribute('data-asistencias-styles', '');
      styleElement.textContent = estilosAsistencias;
      document.head.appendChild(styleElement);
    }
  });
}