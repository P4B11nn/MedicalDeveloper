// js/views/observacionesView.js
// Vista para gestión de observaciones

import { observacionesModel } from '../models/storageModel.js';
import { mostrarAlerta } from '../utils/modalUtil.js';

/**
 * Renderiza la tarjeta de gestión de observaciones con diseño amplio
 * @param {HTMLElement} container - Contenedor donde se renderizará la vista
 */
export async function renderObservaciones(container) {
    if (!container) {
        console.error('❌ Container no encontrado para observaciones');
        return;
    }

    // Mostrar estado de carga
    container.innerHTML = `
        <div class="observaciones-admin-content">
            <div class="observaciones-header">
                <h3><i class="fas fa-exclamation-triangle"></i> Gestión de Observaciones</h3>
                <div class="header-actions">
                    <select id="filtroEstadoObs" class="filter-select">
                        <option value="">Todos los estados</option>
                        <option value="pendiente">Pendientes</option>
                        <option value="en_proceso">En proceso</option>
                        <option value="resuelto">Resueltos</option>
                    </select>
                    <select id="filtroPrioridadObs" class="filter-select">
                        <option value="">Todas las prioridades</option>
                        <option value="urgent">Urgente</option>
                        <option value="high">Alta</option>
                        <option value="medium">Media</option>
                        <option value="low">Baja</option>
                    </select>
                    <button id="btnRefreshObs" class="btn-refresh">
                        <i class="fas fa-sync-alt"></i> Actualizar
                    </button>
                </div>
            </div>

            <div class="stats-row" id="observacionesStats">
                <div class="stat-card urgent">
                    <div class="stat-number" id="statUrgent">0</div>
                    <div class="stat-label">Urgentes</div>
                </div>
                <div class="stat-card pending">
                    <div class="stat-number" id="statPending">0</div>
                    <div class="stat-label">Pendientes</div>
                </div>
                <div class="stat-card progress">
                    <div class="stat-number" id="statProgress">0</div>
                    <div class="stat-label">En Proceso</div>
                </div>
                <div class="stat-card resolved">
                    <div class="stat-number" id="statResolved">0</div>
                    <div class="stat-label">Resueltos</div>
                </div>
            </div>

            <div class="observaciones-list" id="observacionesList">
                <div class="loading-message">
                    <i class="fas fa-spinner fa-spin"></i>
                    Cargando observaciones...
                </div>
            </div>

            <div class="pagination-controls" id="paginationControls" style="display: none;">
                <button class="page-btn" id="btnPrevPage" disabled>
                    <i class="fas fa-chevron-left"></i> Anterior
                </button>
                <div class="page-info">
                    Página <span id="currentPage">1</span> de <span id="totalPages">1</span>
                </div>
                <button class="page-btn" id="btnNextPage" disabled>
                    Siguiente <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        </div>
    `;

    // Configurar event listeners
    setupObservacionesEventListeners(container);

    // Cargar datos iniciales
    await cargarObservaciones(container);
}

/**
 * Configura los event listeners para la gestión de observaciones
 */
function setupObservacionesEventListeners(container) {
    const filtroEstado = container.querySelector('#filtroEstadoObs');
    const filtroPrioridad = container.querySelector('#filtroPrioridadObs');
    const btnRefresh = container.querySelector('#btnRefreshObs');

    // Aplicar filtros automáticamente
    if (filtroEstado) {
        filtroEstado.addEventListener('change', () => cargarObservaciones(container));
    }

    if (filtroPrioridad) {
        filtroPrioridad.addEventListener('change', () => cargarObservaciones(container));
    }

    // Botón de actualizar
    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
            btnRefresh.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';
            cargarObservaciones(container).then(() => {
                btnRefresh.innerHTML = '<i class="fas fa-sync-alt"></i> Actualizar';
            });
        });
    }
}

/**
 * Carga las observaciones desde la base de datos y las muestra
 */
async function cargarObservaciones(container, pagina = 1) {
    const listContainer = container.querySelector('#observacionesList');
    if (!listContainer) return;

    try {
        // Obtener filtros
        const filtroEstado = container.querySelector('#filtroEstadoObs')?.value || '';
        const filtroPrioridad = container.querySelector('#filtroPrioridadObs')?.value || '';

        const filtros = {};
        if (filtroEstado) filtros.estado = filtroEstado;
        if (filtroPrioridad) filtros.prioridad = filtroPrioridad;

        console.log('🔍 Cargando observaciones con filtros:', filtros);

        // Cargar observaciones
        const observaciones = await observacionesModel.getObservaciones(filtros);
        
        console.log(`✅ ${observaciones.length} observaciones cargadas`);

        // Actualizar estadísticas
        actualizarEstadisticas(container, observaciones);

        // Renderizar observaciones
        renderizarListaObservaciones(listContainer, observaciones);

    } catch (error) {
        console.error('❌ Error cargando observaciones:', error);
        listContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Error al cargar observaciones</h4>
                <p>No se pudieron cargar las observaciones. Verifique la conexión a Firebase.</p>
                <button class="btn-retry" onclick="cargarObservaciones(document.querySelector('.observaciones-admin-content').closest('.content-area'))">
                    <i class="fas fa-redo"></i> Reintentar
                </button>
            </div>
        `;
    }
}

/**
 * Actualiza las estadísticas de observaciones
 */
function actualizarEstadisticas(container, observaciones) {
    const estadisticas = {
        urgent: observaciones.filter(o => o.prioridad === 'urgent').length,
        pending: observaciones.filter(o => o.estado === 'pendiente').length,
        progress: observaciones.filter(o => o.estado === 'en_proceso').length,
        resolved: observaciones.filter(o => o.estado === 'resuelto').length
    };

    // Actualizar elementos estadísticos
    const statUrgent = container.querySelector('#statUrgent');
    const statPending = container.querySelector('#statPending');
    const statProgress = container.querySelector('#statProgress');
    const statResolved = container.querySelector('#statResolved');

    if (statUrgent) statUrgent.textContent = estadisticas.urgent;
    if (statPending) statPending.textContent = estadisticas.pending;
    if (statProgress) statProgress.textContent = estadisticas.progress;
    if (statResolved) statResolved.textContent = estadisticas.resolved;
}

/**
 * Renderiza la lista de observaciones con tarjetas amplias
 */
function renderizarListaObservaciones(container, observaciones) {
    if (!observaciones || observaciones.length === 0) {
        container.innerHTML = `
            <div class="no-observaciones">
                <div class="no-data-icon">
                    <i class="fas fa-clipboard-check"></i>
                </div>
                <h3>No hay observaciones</h3>
                <p>No se encontraron observaciones que coincidan con los filtros aplicados.</p>
            </div>
        `;
        return;
    }

    // Ordenar por prioridad y fecha
    const observacionesOrdenadas = observaciones.sort((a, b) => {
        const prioridadOrder = { 'urgent': 0, 'high': 1, 'medium': 2, 'low': 3 };
        const estadoOrder = { 'pendiente': 0, 'en_proceso': 1, 'resuelto': 2 };
        
        // Primero por estado
        if (a.estado !== b.estado) {
            return estadoOrder[a.estado] - estadoOrder[b.estado];
        }
        
        // Luego por prioridad
        if (a.prioridad !== b.prioridad) {
            return prioridadOrder[a.prioridad] - prioridadOrder[b.prioridad];
        }
        
        // Finalmente por fecha (más reciente primero)
        return new Date(b.timestamp || b.fecha) - new Date(a.timestamp || a.fecha);
    });

    container.innerHTML = observacionesOrdenadas.map(obs => {
        const fecha = obs.timestamp || obs.fecha;
        const fechaFormateada = fecha ? new Date(fecha).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) : 'Sin fecha';

        return `
            <div class="observacion-item-amplia" data-id="${obs.id}">
                <div class="obs-header-amplia">
                    <div class="obs-info-principal">
                        <div class="obs-usuario">
                            <i class="fas fa-user"></i>
                            <strong>${obs.usuarioNombre || 'Usuario desconocido'}</strong>
                            <span class="matricula">(${obs.usuarioMatricula || 'Sin matrícula'})</span>
                        </div>
                        <div class="obs-modulo">
                            <i class="fas fa-map-marker-alt"></i>
                            ${obs.moduloNombre || obs.ubicacion || 'Sin ubicación'}
                        </div>
                    </div>
                    <div class="obs-badges">
                        <span class="obs-priority ${obs.prioridad || 'medium'}">${getPrioridadLabel(obs.prioridad)}</span>
                        <span class="obs-status ${obs.estado || 'pendiente'}">${getEstadoLabel(obs.estado)}</span>
                    </div>
                </div>

                <div class="obs-content-amplia">
                    <div class="obs-descripcion">
                        <h4><i class="fas fa-comment-alt"></i> Descripción</h4>
                        <p>${obs.descripcion || 'Sin descripción'}</p>
                    </div>
                    
                    ${obs.categoria ? `
                        <div class="obs-categoria">
                            <i class="fas fa-tag"></i>
                            <span>Categoría: ${getCategoriaLabel(obs.categoria)}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="obs-footer-amplia">
                    <div class="obs-meta-info">
                        <span class="obs-fecha">
                            <i class="fas fa-clock"></i>
                            ${fechaFormateada}
                        </span>
                        ${obs.comentariosResolucion ? `
                            <span class="obs-comentarios">
                                <i class="fas fa-comment"></i>
                                Comentarios: ${obs.comentariosResolucion}
                            </span>
                        ` : ''}
                    </div>

                    <div class="obs-actions-amplia">
                        ${obs.estado === 'pendiente' ? `
                            <button class="obs-action-btn cambiar-estado" data-id="${obs.id}" data-action="proceso">
                                <i class="fas fa-play"></i>
                                Marcar en Proceso
                            </button>
                            <button class="obs-action-btn resolver" data-id="${obs.id}" data-action="resolver">
                                <i class="fas fa-check"></i>
                                Resolver
                            </button>
                        ` : obs.estado === 'en_proceso' ? `
                            <button class="obs-action-btn resolver" data-id="${obs.id}" data-action="resolver">
                                <i class="fas fa-check"></i>
                                Resolver
                            </button>
                            <button class="obs-action-btn cambiar-estado" data-id="${obs.id}" data-action="pendiente">
                                <i class="fas fa-undo"></i>
                                Volver a Pendiente
                            </button>
                        ` : `
                            <button class="obs-action-btn cambiar-estado" data-id="${obs.id}" data-action="pendiente">
                                <i class="fas fa-undo"></i>
                                Reabrir
                            </button>
                        `}
                        
                        <button class="obs-action-btn ver-detalles" data-id="${obs.id}" data-action="detalles">
                            <i class="fas fa-eye"></i>
                            Ver Detalles
                        </button>
                        
                        <button class="obs-action-btn editar" data-id="${obs.id}" data-action="editar">
                            <i class="fas fa-edit"></i>
                            Editar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Configurar event listeners para los botones de acción
    setupObservacionesActionListeners(container);
}

/**
 * Configura event listeners para botones de acción de observaciones
 */
function setupObservacionesActionListeners(container) {
    const actionButtons = container.querySelectorAll('.obs-action-btn');
    
    actionButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const observacionId = button.getAttribute('data-id');
            const action = button.getAttribute('data-action');
            
            await handleObservacionAction(observacionId, action, container);
        });
    });
}

/**
 * Maneja las acciones sobre observaciones
 */
async function handleObservacionAction(observacionId, action, container) {
    try {
        switch (action) {
            case 'proceso':
                await cambiarEstadoObservacion(observacionId, 'en_proceso', container);
                break;
            case 'resolver':
                await resolverObservacion(observacionId, container);
                break;
            case 'pendiente':
                await cambiarEstadoObservacion(observacionId, 'pendiente', container);
                break;
            case 'detalles':
                await mostrarDetallesObservacion(observacionId);
                break;
            case 'editar':
                await editarObservacion(observacionId);
                break;
            default:
                console.warn('Acción no reconocida:', action);
        }
    } catch (error) {
        console.error('Error ejecutando acción:', error);
        mostrarAlerta({
            title: 'Error',
            message: 'Error al ejecutar la acción: ' + error.message,
            type: 'error'
        });
    }
}

/**
 * Cambia el estado de una observación
 */
async function cambiarEstadoObservacion(observacionId, nuevoEstado, container) {
    try {
        const exito = await observacionesModel.updateEstado(observacionId, nuevoEstado);
        
        if (exito) {
            mostrarAlerta({
                title: 'Estado Actualizado',
                message: `La observación ha sido marcada como ${getEstadoLabel(nuevoEstado)}.`,
                type: 'success'
            });
            
            // Recargar observaciones
            await cargarObservaciones(container);
        } else {
            throw new Error('No se pudo actualizar el estado');
        }
    } catch (error) {
        console.error('Error cambiando estado:', error);
        mostrarAlerta({
            title: 'Error',
            message: 'No se pudo cambiar el estado de la observación',
            type: 'error'
        });
    }
}

/**
 * Resuelve una observación con comentarios opcionales
 */
async function resolverObservacion(observacionId, container) {
    const comentarios = prompt('Comentarios de resolución (opcional):');
    
    try {
        const exito = await observacionesModel.updateEstado(observacionId, 'resuelto', comentarios || '');
        
        if (exito) {
            mostrarAlerta({
                title: 'Observación Resuelta',
                message: 'La observación ha sido marcada como resuelta exitosamente.',
                type: 'success'
            });
            
            // Recargar observaciones
            await cargarObservaciones(container);
        } else {
            throw new Error('No se pudo resolver la observación');
        }
    } catch (error) {
        console.error('Error resolviendo observación:', error);
        mostrarAlerta({
            title: 'Error',
            message: 'No se pudo resolver la observación',
            type: 'error'
        });
    }
}

/**
 * Muestra detalles completos de una observación
 */
async function mostrarDetallesObservacion(observacionId) {
    try {
        const observaciones = await observacionesModel.getObservaciones({ id: observacionId });
        const observacion = observaciones.find(o => o.id === observacionId);
        
        if (!observacion) {
            throw new Error('Observación no encontrada');
        }
        
        const fecha = observacion.timestamp || observacion.fecha;
        const fechaFormateada = fecha ? new Date(fecha).toLocaleString('es-ES') : 'Sin fecha';
        
        const detalles = `
            <div class="observacion-detalles">
                <h3><i class="fas fa-info-circle"></i> Detalles de la Observación</h3>
                
                <div class="detalle-seccion">
                    <h4>Información del Usuario</h4>
                    <p><strong>Nombre:</strong> ${observacion.usuarioNombre || 'N/A'}</p>
                    <p><strong>Matrícula:</strong> ${observacion.usuarioMatricula || 'N/A'}</p>
                </div>
                
                <div class="detalle-seccion">
                    <h4>Ubicación</h4>
                    <p><strong>Módulo:</strong> ${observacion.moduloNombre || 'N/A'}</p>
                    <p><strong>Ubicación:</strong> ${observacion.ubicacion || 'N/A'}</p>
                </div>
                
                <div class="detalle-seccion">
                    <h4>Descripción</h4>
                    <p>${observacion.descripcion || 'Sin descripción'}</p>
                </div>
                
                <div class="detalle-seccion">
                    <h4>Clasificación</h4>
                    <p><strong>Prioridad:</strong> ${getPrioridadLabel(observacion.prioridad)}</p>
                    <p><strong>Categoría:</strong> ${getCategoriaLabel(observacion.categoria)}</p>
                    <p><strong>Estado:</strong> ${getEstadoLabel(observacion.estado)}</p>
                </div>
                
                <div class="detalle-seccion">
                    <h4>Información Temporal</h4>
                    <p><strong>Fecha de Creación:</strong> ${fechaFormateada}</p>
                    ${observacion.fechaResolucion ? `
                        <p><strong>Fecha de Resolución:</strong> ${new Date(observacion.fechaResolucion).toLocaleString('es-ES')}</p>
                    ` : ''}
                </div>
                
                ${observacion.comentariosResolucion ? `
                    <div class="detalle-seccion">
                        <h4>Comentarios de Resolución</h4>
                        <p>${observacion.comentariosResolucion}</p>
                    </div>
                ` : ''}
                
                <div class="detalle-seccion">
                    <h4>Información Técnica</h4>
                    <p><strong>ID:</strong> ${observacion.id}</p>
                    <p><strong>Tipo:</strong> ${observacion.tipo || 'observacion_reporte'}</p>
                </div>
            </div>
        `;
        
        mostrarAlerta({
            title: 'Detalles de la Observación',
            message: detalles,
            type: 'info'
        });
        
    } catch (error) {
        console.error('Error mostrando detalles:', error);
        mostrarAlerta({
            title: 'Error',
            message: 'No se pudieron cargar los detalles de la observación',
            type: 'error'
        });
    }
}

/**
 * Función para editar observación (placeholder)
 */
async function editarObservacion(observacionId) {
    mostrarAlerta({
        title: 'Funcionalidad en Desarrollo',
        message: 'La funcionalidad de edición de observaciones estará disponible próximamente.',
        type: 'info'
    });
}

/**
 * Obtiene etiqueta legible para prioridad
 */
function getPrioridadLabel(prioridad) {
    const labels = {
        'urgent': 'Urgente',
        'high': 'Alta',
        'medium': 'Media',
        'low': 'Baja'
    };
    return labels[prioridad] || 'Media';
}

/**
 * Obtiene etiqueta legible para estado
 */
function getEstadoLabel(estado) {
    const labels = {
        'pendiente': 'Pendiente',
        'en_proceso': 'En Proceso',
        'resuelto': 'Resuelto'
    };
    return labels[estado] || 'Pendiente';
}

/**
 * Obtiene etiqueta legible para categoría
 */
function getCategoriaLabel(categoria) {
    const labels = {
        'instrumentos': 'Instrumentos',
        'insumos': 'Insumos',
        'limpieza': 'Limpieza',
        'infraestructura': 'Infraestructura',
        'general': 'General'
    };
    return labels[categoria] || 'General';
}

// Hacer disponible globalmente para depuración
window.cargarObservaciones = cargarObservaciones;

export { cargarObservaciones };
