// js/controllers/adminInstrumentosController.js
// Controlador para que el administrador vea registros de instrumentos y observaciones

import { instrumentosModel, observacionesModel, authModel } from '../models/storageModel.js';
import { mostrarAlerta } from '../utils/modalUtil.js';

/**
 * Controlador para administrador - vista de instrumentos y observaciones
 */
export const adminInstrumentosController = {
    
    /**
     * Inicializar el controlador del administrador
     */
    async init() {
        console.log('🚀 Inicializando controlador de admin instrumentos...');
        
        // Agregar datos de prueba si no existen
        this.addSampleDataIfNeeded();
        
        await this.loadRegistrosInstrumentos();
        await this.loadObservacionesPendientes();
        this.initEventListeners();
    },

    /**
     * Agregar datos de prueba si no existen
     */
    addSampleDataIfNeeded() {
        try {
            const existingData = localStorage.getItem('offline_checklists');
            if (!existingData || JSON.parse(existingData).length === 0) {
                console.log('📝 Agregando datos de prueba...');
                
                const sampleData = [
                    {
                        id: 'sample-1',
                        usuarioId: '1234567890',
                        usuarioNombre: 'Daniel',
                        moduloId: 'modulo5',
                        moduloNombre: 'Módulo 5',
                        ubicacion: 'FMAT - UAT',
                        timestamp: new Date('2025-11-02T18:35:09'),
                        instrumentos: {
                            tensiómetro: { verificado: true, estado: 'bueno' },
                            otoscopio: { verificado: true, estado: 'bueno' },
                            estetoscopio: { verificado: false, estado: 'regular' }
                        },
                        insumos: {
                            gasas: { verificado: true, estado: 'suficiente' },
                            alcohol: { verificado: true, estado: 'suficiente' }
                        },
                        observaciones: 'Estetoscopio necesita revisión'
                    },
                    {
                        id: 'sample-2',
                        usuarioId: '1234567890',
                        usuarioNombre: 'Daniel',
                        moduloId: 'modulo5',
                        moduloNombre: 'Módulo 5',
                        ubicacion: 'FMAT - UAT',
                        timestamp: new Date('2025-11-02T18:14:00'),
                        instrumentos: {
                            tensiómetro: { verificado: true, estado: 'bueno' },
                            otoscopio: { verificado: true, estado: 'bueno' },
                            estetoscopio: { verificado: true, estado: 'bueno' }
                        },
                        insumos: {
                            gasas: { verificado: true, estado: 'suficiente' },
                            alcohol: { verificado: true, estado: 'bajo' }
                        },
                        observaciones: 'Alcohol en nivel bajo'
                    }
                ];
                
                localStorage.setItem('offline_checklists', JSON.stringify(sampleData));
                console.log('✅ Datos de prueba agregados');
            }
        } catch (error) {
            console.error('❌ Error agregando datos de prueba:', error);
        }
    },

    /**
     * Configurar event listeners
     */
    initEventListeners() {
        // Botones de filtrado
        const filtroFecha = document.getElementById('filtro-fecha-instrumentos');
        const filtroModulo = document.getElementById('filtro-modulo-instrumentos');
        const btnFiltrar = document.getElementById('btn-filtrar-instrumentos');
        
        if (btnFiltrar) {
            btnFiltrar.addEventListener('click', () => this.aplicarFiltros());
        }

        // Botones de estado en observaciones (manejo mejorado)
        this.setupObservacionesEventListeners();
    },

    /**
     * Configurar event listeners para observaciones con manejo mejorado
     */
    setupObservacionesEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-resolver-observacion') || e.target.closest('.btn-resolver-observacion')) {
                const button = e.target.classList.contains('btn-resolver-observacion') ? e.target : e.target.closest('.btn-resolver-observacion');
                const observacionId = button.getAttribute('data-id');
                this.resolverObservacion(observacionId);
            }
            
            if (e.target.classList.contains('btn-proceso-observacion') || e.target.closest('.btn-proceso-observacion')) {
                const button = e.target.classList.contains('btn-proceso-observacion') ? e.target : e.target.closest('.btn-proceso-observacion');
                const observacionId = button.getAttribute('data-id');
                this.cambiarEstadoObservacion(observacionId, 'en_proceso');
            }

            if (e.target.classList.contains('btn-volver-pendiente') || e.target.closest('.btn-volver-pendiente')) {
                const button = e.target.classList.contains('btn-volver-pendiente') ? e.target : e.target.closest('.btn-volver-pendiente');
                const observacionId = button.getAttribute('data-id');
                this.cambiarEstadoObservacion(observacionId, 'pendiente');
            }

            if (e.target.classList.contains('btn-reabrir-observacion') || e.target.closest('.btn-reabrir-observacion')) {
                const button = e.target.classList.contains('btn-reabrir-observacion') ? e.target : e.target.closest('.btn-reabrir-observacion');
                const observacionId = button.getAttribute('data-id');
                this.cambiarEstadoObservacion(observacionId, 'pendiente');
            }

            if (e.target.classList.contains('btn-ver-detalles') || e.target.closest('.btn-ver-detalles')) {
                const button = e.target.classList.contains('btn-ver-detalles') ? e.target : e.target.closest('.btn-ver-detalles');
                const observacionId = button.getAttribute('data-id');
                this.verDetallesObservacion(observacionId);
            }
        });
    },

    /**
     * Configurar event listeners específicos para el contenedor de observaciones
     */
    setupObservacionesActionListeners(container) {
        // Event listeners específicos para botones dentro del contenedor
        const actionButtons = container.querySelectorAll('.btn-action-compact');
        
        actionButtons.forEach(button => {
            // Asegurar que no haya duplicados de event listeners
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
        });
    },

    /**
     * Cargar registros de instrumentos
     */
    async loadRegistrosInstrumentos() {
        try {
            console.log('📋 Cargando registros de instrumentos...');
            
            // Mostrar estado de carga
            const tbody = document.getElementById('registros-body');
            if (tbody) {
                tbody.innerHTML = `
                    <tr class="loading-row">
                        <td colspan="7" style="text-align: center; padding: 20px;">
                            <i class="fas fa-spinner fa-spin"></i>
                            Cargando registros...
                        </td>
                    </tr>
                `;
            }
            
            // Timeout para evitar carga infinita
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout: La carga de registros tardó demasiado')), 10000)
            );
            
            const registrosPromise = instrumentosModel.getRegistros();
            
            const registros = await Promise.race([registrosPromise, timeoutPromise]);
            this.displayRegistrosInstrumentos(registros);
            
        } catch (error) {
            console.error('❌ Error cargando registros de instrumentos:', error);
            
            // Mostrar mensaje de error en la tabla
            const tbody = document.getElementById('registros-body');
            if (tbody) {
                tbody.innerHTML = `
                    <tr class="error-row">
                        <td colspan="7" style="text-align: center; padding: 20px; color: #ef4444;">
                            <i class="fas fa-exclamation-triangle"></i>
                            Error cargando registros: ${error.message}
                        </td>
                    </tr>
                `;
            }
        }
    },

    /**
     * Cargar observaciones pendientes con manejo mejorado de errores y timeout
     */
    async loadObservacionesPendientes() {
        try {
            console.log('📋 Cargando observaciones pendientes...');
            
            // Mostrar estado de carga en el contenedor de observaciones
            const container = document.getElementById('lista-observaciones-admin');
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #6b7280;">
                        <div style="display: inline-flex; align-items: center; gap: 10px; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                            <i class="fas fa-spinner fa-spin" style="color: #06b6d4; font-size: 1.2rem;"></i>
                            <span style="font-weight: 500;">Cargando observaciones...</span>
                        </div>
                    </div>
                `;
            }
            
            // Timeout para evitar carga infinita
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout: La carga de observaciones tardó demasiado')), 10000)
            );
            
            const observacionesPromise = observacionesModel.getObservaciones();
            
            const observaciones = await Promise.race([observacionesPromise, timeoutPromise]);
            
            console.log(`✅ ${observaciones.length} observaciones cargadas exitosamente`);
            this.displayObservaciones(observaciones);
            
        } catch (error) {
            console.error('❌ Error cargando observaciones:', error);
            
            // Mostrar mensaje de error en la interfaz
            const container = document.getElementById('lista-observaciones-admin');
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto;">
                            <i class="fas fa-exclamation-triangle" style="color: #ef4444; font-size: 2rem; margin-bottom: 15px;"></i>
                            <h3 style="color: #ef4444; margin-bottom: 10px;">Error al cargar observaciones</h3>
                            <p style="color: #6b7280; margin-bottom: 20px; line-height: 1.5;">${error.message}</p>
                            <button onclick="adminInstrumentosController.loadObservacionesPendientes()" 
                                    style="background: linear-gradient(135deg, #ef4444, #dc2626); color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-weight: 500; display: inline-flex; align-items: center; gap: 8px; transition: all 0.3s ease;"
                                    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(239,68,68,0.3)'"
                                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                                <i class="fas fa-redo"></i> Reintentar
                            </button>
                        </div>
                    </div>
                `;
            }
        }
    },

    /**
     * Mostrar registros de instrumentos en la UI
     * @param {Array} registros - Lista de registros
     */
    displayRegistrosInstrumentos(registros) {
        const tbody = document.getElementById('registros-body');
        if (!tbody) {
            console.error('❌ No se encontró el elemento tbody#registros-body');
            return;
        }

        console.log(`📊 Mostrando ${registros.length} registros en la tabla`);

        if (registros.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: #64748b;">
                        <i class="fas fa-clipboard-list" style="font-size: 2rem; margin-bottom: 10px; opacity: 0.5;"></i>
                        <br>No hay registros de instrumentos
                    </td>
                </tr>
            `;
            return;
        }

        // Ordenar por fecha más reciente
        registros.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        tbody.innerHTML = registros.map(registro => {
            const fecha = new Date(registro.timestamp);
            const fechaStr = fecha.toLocaleDateString('es-ES');
            const horaStr = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            
            // Contar instrumentos
            const totalInstrumentos = Object.keys(registro.instrumentos || {}).length;
            const instrumentosOK = Object.values(registro.instrumentos || {}).filter(i => i.verificado).length;
            
            return `
                <tr>
                    <td>${fechaStr}<br><small style="color: #64748b;">${horaStr}</small></td>
                    <td>${registro.usuarioNombre || 'Usuario'}<br><small style="color: #64748b;">${registro.usuarioId}</small></td>
                    <td>${registro.moduloNombre || registro.moduloId}</td>
                    <td>${registro.ubicacion || 'Sin ubicación'}</td>
                    <td>
                        <span style="color: ${instrumentosOK === totalInstrumentos ? '#16a34a' : '#dc2626'};">
                            ${instrumentosOK}/${totalInstrumentos}
                        </span>
                    </td>
                    <td>
                        <span class="status-badge ${instrumentosOK === totalInstrumentos ? 'success' : 'warning'}">
                            ${instrumentosOK === totalInstrumentos ? 'Completo' : 'Pendiente'}
                        </span>
                    </td>
                    <td>
                        <button class="action-btn view" onclick="verDetallesRegistro('${registro.id}')" title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" onclick="exportarRegistro('${registro.id}')" title="Exportar">
                            <i class="fas fa-download"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
        console.log('✅ Tabla de registros actualizada');
    },

    /**
     * Mostrar observaciones en la UI con tarjetas amplias y mejor diseño
     * @param {Array} observaciones - Lista de observaciones
     */
    displayObservaciones(observaciones) {
        const container = document.getElementById('lista-observaciones-admin');
        if (!container) {
            console.error('❌ No se encontró el contenedor lista-observaciones-admin');
            return;
        }

        console.log(`📊 Mostrando ${observaciones.length} observaciones en la interfaz`);

        if (observaciones.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #64748b;">
                    <i class="fas fa-clipboard-list" style="font-size: 2rem; margin-bottom: 10px; opacity: 0.5;"></i>
                    <br><div style="font-weight: 600; margin-bottom: 8px;">No hay observaciones registradas</div>
                    <div style="font-size: 0.9rem; color: #9ca3af;">Las observaciones aparecerán aquí cuando sean reportadas</div>
                </div>
            `;
            return;
        }

        // Ordenar por prioridad y fecha
        observaciones.sort((a, b) => {
            const prioridadOrder = { 'urgent': 0, 'high': 1, 'medium': 2, 'low': 3 };
            const estadoOrder = { 'pendiente': 0, 'en_proceso': 1, 'resuelto': 2 };
            
            if (a.estado !== b.estado) {
                return estadoOrder[a.estado] - estadoOrder[b.estado];
            }
            if (a.prioridad !== b.prioridad) {
                return prioridadOrder[a.prioridad] - prioridadOrder[b.prioridad];
            }
            return new Date(b.timestamp) - new Date(a.timestamp);
        });

        // Actualizar estadísticas
        this.updateObservacionesStats(observaciones);

        // Generar HTML para observaciones con diseño amplio tipo tarjeta
        container.innerHTML = observaciones.map(obs => {
            const fecha = new Date(obs.timestamp);
            const fechaFormateada = fecha.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
            const horaFormateada = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            
            const prioridadClass = this.getPrioridadClass(obs.prioridad);
            const estadoClass = this.getEstadoClass(obs.estado);
            
            return `
                <div class="observacion-item" data-observacion-id="${obs.id}" style="margin-bottom: 15px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: all 0.3s ease;">
                    
                    <div class="obs-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                        <div class="obs-user-info" style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #06b6d4, #0891b2); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 1.1rem;">
                                    ${(obs.usuarioNombre || 'U')[0].toUpperCase()}
                                </div>
                                <div>
                                    <div style="font-weight: 600; font-size: 1.1rem; color: #1f2937;">${obs.usuarioNombre}</div>
                                    <div style="font-size: 0.9rem; color: #64748b;">Mat: ${obs.usuarioMatricula}</div>
                                </div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 6px; color: #6b7280; font-size: 0.9rem;">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>${obs.moduloNombre || 'N/A'}</span>
                                <span style="margin-left: 10px;">•</span>
                                <i class="fas fa-clock"></i>
                                <span>${fechaFormateada} ${horaFormateada}</span>
                            </div>
                        </div>
                        
                        <div class="obs-badges" style="display: flex; gap: 8px; align-items: flex-start;">
                            <span class="priority-badge ${prioridadClass}" style="padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; text-transform: uppercase;">
                                ${this.getPrioridadLabel(obs.prioridad)}
                            </span>
                            <span class="status-badge ${estadoClass}" style="padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600;">
                                ${this.getEstadoLabel(obs.estado)}
                            </span>
                        </div>
                    </div>

                    <div class="obs-content" style="margin-bottom: 20px;">
                        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #06b6d4; margin-bottom: 12px;">
                            <div style="font-size: 1rem; line-height: 1.5; color: #374151;">${obs.descripcion}</div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="background: rgba(99, 102, 241, 0.1); color: #6366f1; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 500;">
                                <i class="fas fa-tag"></i> ${this.getCategoriaLabel(obs.categoria)}
                            </span>
                            ${obs.ubicacion ? `
                                <span style="background: rgba(16, 185, 129, 0.1); color: #059669; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 500;">
                                    <i class="fas fa-location-dot"></i> ${obs.ubicacion}
                                </span>
                            ` : ''}
                        </div>
                    </div>

                    <div class="obs-actions" style="display: flex; gap: 8px; flex-wrap: wrap; padding-top: 15px; border-top: 1px solid #f1f5f9;">
                        ${obs.estado === 'pendiente' ? `
                            <button class="btn-proceso-observacion obs-btn-action" data-id="${obs.id}" style="background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border: none; padding: 10px 16px; border-radius: 8px; font-size: 0.85rem; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.3s ease;">
                                <i class="fas fa-play"></i>
                                <span>Marcar en Proceso</span>
                            </button>
                            <button class="btn-resolver-observacion obs-btn-action" data-id="${obs.id}" style="background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 10px 16px; border-radius: 8px; font-size: 0.85rem; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.3s ease;">
                                <i class="fas fa-check"></i>
                                <span>Resolver</span>
                            </button>
                        ` : obs.estado === 'en_proceso' ? `
                            <button class="btn-resolver-observacion obs-btn-action" data-id="${obs.id}" style="background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 10px 16px; border-radius: 8px; font-size: 0.85rem; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.3s ease;">
                                <i class="fas fa-check"></i>
                                <span>Resolver</span>
                            </button>
                            <button class="btn-volver-pendiente obs-btn-action" data-id="${obs.id}" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; padding: 10px 16px; border-radius: 8px; font-size: 0.85rem; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.3s ease;">
                                <i class="fas fa-undo"></i>
                                <span>Volver a Pendiente</span>
                            </button>
                        ` : `
                            <button class="btn-reabrir-observacion obs-btn-action" data-id="${obs.id}" style="background: linear-gradient(135deg, #6b7280, #4b5563); color: white; border: none; padding: 10px 16px; border-radius: 8px; font-size: 0.85rem; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.3s ease;">
                                <i class="fas fa-undo"></i>
                                <span>Reabrir</span>
                            </button>
                        `}
                        
                        <button class="btn-ver-detalles obs-btn-action" data-id="${obs.id}" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; border: none; padding: 10px 16px; border-radius: 8px; font-size: 0.85rem; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.3s ease;">
                            <i class="fas fa-eye"></i>
                            <span>Ver Detalles</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Configurar hover effects para botones
        this.addButtonHoverEffects(container);
        
        console.log('✅ Observaciones mostradas exitosamente con diseño amplio');
    },

    /**
     * Actualizar estadísticas de observaciones en el dashboard
     */
    updateObservacionesStats(observaciones) {
        const stats = {
            urgente: observaciones.filter(o => o.prioridad === 'urgent').length,
            pendiente: observaciones.filter(o => o.estado === 'pendiente').length,
            proceso: observaciones.filter(o => o.estado === 'en_proceso').length,
            resuelto: observaciones.filter(o => o.estado === 'resuelto').length
        };

        // Actualizar contadores en el dashboard
        const countUrgente = document.getElementById('count-urgente');
        const countPendiente = document.getElementById('count-pendiente');
        const countProceso = document.getElementById('count-proceso');
        const countResuelto = document.getElementById('count-resuelto');

        if (countUrgente) countUrgente.textContent = stats.urgente;
        if (countPendiente) countPendiente.textContent = stats.pendiente;
        if (countProceso) countProceso.textContent = stats.proceso;
        if (countResuelto) countResuelto.textContent = stats.resuelto;
    },

    /**
     * Agregar efectos hover a los botones
     */
    addButtonHoverEffects(container) {
        const buttons = container.querySelectorAll('.obs-btn-action');
        
        buttons.forEach(button => {
            button.addEventListener('mouseenter', () => {
                button.style.transform = 'translateY(-2px)';
                button.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.transform = 'translateY(0)';
                button.style.boxShadow = 'none';
            });
        });
    },

    /**
     * Aplicar filtros a los registros
     */
    async aplicarFiltros() {
        const fecha = document.getElementById('filtro-fecha-instrumentos')?.value;
        const modulo = document.getElementById('filtro-modulo-instrumentos')?.value;
        
        const filtros = {};
        if (fecha) filtros.fecha = fecha;
        if (modulo) filtros.moduloId = modulo;
        
        console.log('🔍 Aplicando filtros:', filtros);
        
        const registros = await instrumentosModel.getRegistros(filtros);
        this.displayRegistrosInstrumentos(registros);
    },

    /**
     * Resolver observación
     * @param {string} observacionId - ID de la observación
     */
    async resolverObservacion(observacionId) {
        try {
            const comentarios = prompt('Comentarios de resolución (opcional):');
            
            const result = await observacionesModel.updateEstado(observacionId, 'resuelto', comentarios || '');
            
            if (result) {
                this.showMessage('success', '✅ Observación Resuelta', 'La observación ha sido marcada como resuelta.');
                await this.loadObservacionesPendientes(); // Recargar
            } else {
                this.showMessage('error', '❌ Error', 'No se pudo resolver la observación.');
            }
        } catch (error) {
            console.error('❌ Error resolviendo observación:', error);
            this.showMessage('error', '❌ Error del Sistema', 'Error interno al resolver la observación.');
        }
    },

    /**
     * Cambiar estado de observación
     * @param {string} observacionId - ID de la observación
     * @param {string} nuevoEstado - Nuevo estado
     */
    async cambiarEstadoObservacion(observacionId, nuevoEstado) {
        try {
            const result = await observacionesModel.updateEstado(observacionId, nuevoEstado);
            
            if (result) {
                this.showMessage('success', '✅ Estado Actualizado', `La observación ha sido marcada como ${this.getEstadoLabel(nuevoEstado)}.`);
                await this.loadObservacionesPendientes(); // Recargar
            } else {
                this.showMessage('error', '❌ Error', 'No se pudo actualizar el estado.');
            }
        } catch (error) {
            console.error('❌ Error actualizando estado:', error);
            this.showMessage('error', '❌ Error del Sistema', 'Error interno al actualizar el estado.');
        }
    },

    /**
     * Ver detalles completos de una observación
     * @param {string} observacionId - ID de la observación
     */
    async verDetallesObservacion(observacionId) {
        try {
            const observaciones = await observacionesModel.getObservaciones();
            const observacion = observaciones.find(o => o.id === observacionId);
            
            if (!observacion) {
                this.showMessage('error', '❌ Error', 'No se encontró la observación especificada.');
                return;
            }

            const fecha = new Date(observacion.timestamp);
            const fechaCompleta = fecha.toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
            });

            const detalles = `
                <div style="text-align: left; max-width: 500px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #f8fafc, #e2e8f0); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <h3 style="margin: 0 0 10px 0; color: #1f2937;">
                            <i class="fas fa-info-circle"></i> Detalles de la Observación
                        </h3>
                        <div style="font-size: 0.9rem; color: #64748b;">ID: ${observacion.id}</div>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <h4 style="color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">
                            <i class="fas fa-user"></i> Información del Usuario
                        </h4>
                        <p><strong>Nombre:</strong> ${observacion.usuarioNombre || 'N/A'}</p>
                        <p><strong>Matrícula:</strong> ${observacion.usuarioMatricula || 'N/A'}</p>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <h4 style="color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">
                            <i class="fas fa-map-marker-alt"></i> Ubicación
                        </h4>
                        <p><strong>Módulo:</strong> ${observacion.moduloNombre || 'N/A'}</p>
                        <p><strong>Ubicación:</strong> ${observacion.ubicacion || 'Sin ubicación específica'}</p>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <h4 style="color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">
                            <i class="fas fa-comment-alt"></i> Descripción
                        </h4>
                        <div style="background: #f8fafc; padding: 10px; border-radius: 6px; border-left: 4px solid #06b6d4;">
                            ${observacion.descripcion || 'Sin descripción disponible'}
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                        <div>
                            <h4 style="color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">
                                <i class="fas fa-exclamation-triangle"></i> Prioridad
                            </h4>
                            <span style="padding: 6px 12px; border-radius: 12px; font-weight: 600; font-size: 0.9rem; background: ${this.getPrioridadColor(observacion.prioridad)}; color: white;">
                                ${this.getPrioridadLabel(observacion.prioridad)}
                            </span>
                        </div>
                        <div>
                            <h4 style="color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">
                                <i class="fas fa-tasks"></i> Estado
                            </h4>
                            <span style="padding: 6px 12px; border-radius: 12px; font-weight: 600; font-size: 0.9rem; background: ${this.getEstadoColor(observacion.estado)}; color: white;">
                                ${this.getEstadoLabel(observacion.estado)}
                            </span>
                        </div>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <h4 style="color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">
                            <i class="fas fa-tag"></i> Categoría
                        </h4>
                        <p><span style="background: rgba(99, 102, 241, 0.1); color: #6366f1; padding: 4px 8px; border-radius: 4px; font-size: 0.9rem;">${this.getCategoriaLabel(observacion.categoria)}</span></p>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <h4 style="color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">
                            <i class="fas fa-clock"></i> Información Temporal
                        </h4>
                        <p><strong>Fecha de Creación:</strong> ${fechaCompleta}</p>
                        ${observacion.fechaResolucion ? `
                            <p><strong>Fecha de Resolución:</strong> ${new Date(observacion.fechaResolucion).toLocaleDateString('es-ES', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                            })}</p>
                        ` : ''}
                    </div>

                    ${observacion.comentariosResolucion ? `
                        <div style="margin-bottom: 15px;">
                            <h4 style="color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">
                                <i class="fas fa-comments"></i> Comentarios de Resolución
                            </h4>
                            <div style="background: #f0f9ff; padding: 10px; border-radius: 6px; border-left: 4px solid #10b981;">
                                ${observacion.comentariosResolucion}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;

            this.showMessage('info', 'Detalles de la Observación', detalles);

        } catch (error) {
            console.error('❌ Error obteniendo detalles de observación:', error);
            this.showMessage('error', '❌ Error del Sistema', 'Error interno al obtener los detalles de la observación.');
        }
    },

    /**
     * Obtener color de fondo para prioridad
     */
    getPrioridadColor(prioridad) {
        const colors = {
            'urgent': '#ef4444',
            'high': '#f59e0b', 
            'medium': '#06b6d4',
            'low': '#10b981'
        };
        return colors[prioridad] || '#06b6d4';
    },

    /**
     * Obtener color de fondo para estado
     */
    getEstadoColor(estado) {
        const colors = {
            'pendiente': '#ef4444',
            'en_proceso': '#f59e0b',
            'resuelto': '#10b981'
        };
        return colors[estado] || '#ef4444';
    },

    /**
     * Obtener clase CSS para prioridad
     */
    getPrioridadClass(prioridad) {
        const classes = {
            'urgent': 'urgent',
            'high': 'high',
            'medium': 'medium',
            'low': 'low'
        };
        return classes[prioridad] || 'medium';
    },

    /**
     * Obtener clase CSS para estado
     */
    getEstadoClass(estado) {
        const classes = {
            'pendiente': 'pending',
            'en_proceso': 'process',
            'resuelto': 'resolved'
        };
        return classes[estado] || 'pending';
    },

    /**
     * Obtener etiqueta legible de prioridad
     */
    getPrioridadLabel(prioridad) {
        const labels = {
            'urgent': 'Urgente',
            'high': 'Alta',
            'medium': 'Media',
            'low': 'Baja'
        };
        return labels[prioridad] || 'Media';
    },

    /**
     * Obtener etiqueta legible de estado
     */
    getEstadoLabel(estado) {
        const labels = {
            'pendiente': 'Pendiente',
            'en_proceso': 'En Proceso',
            'resuelto': 'Resuelto'
        };
        return labels[estado] || 'Pendiente';
    },

    /**
     * Obtener etiqueta legible de categoría
     */
    getCategoriaLabel(categoria) {
        const labels = {
            'instrumentos': 'Instrumentos',
            'insumos': 'Insumos',
            'limpieza': 'Limpieza',
            'infraestructura': 'Infraestructura',
            'general': 'General'
        };
        return labels[categoria] || 'General';
    },

    /**
     * Mostrar mensaje al usuario
     */
    showMessage(tipo, titulo, mensaje) {
        if (window.mostrarMensaje && typeof window.mostrarMensaje === 'function') {
            window.mostrarMensaje(tipo, titulo, mensaje);
        } else {
            mostrarAlerta({
                title: titulo,
                message: mensaje,
                type: tipo === 'success' ? 'success' : 'info'
            });
        }
    }
};

// Funciones globales para compatibilidad con HTML
window.verDetallesRegistro = async function(registroId) {
    try {
        const registros = await instrumentosModel.getRegistros();
        const registro = registros.find(r => r.id === registroId);
        
        if (registro) {
            // Crear modal o nueva ventana con detalles
            const detalles = `
                Fecha: ${new Date(registro.timestamp).toLocaleString('es-ES')}
                Usuario: ${registro.usuarioNombre} (${registro.usuarioMatricula})
                Módulo: ${registro.moduloNombre}
                Ubicación: ${registro.ubicacion}
                
                INSTRUMENTOS:
                ${Object.entries(registro.instrumentos || {}).map(([nombre, datos]) => 
                    `- ${nombre}: ${datos.verificado ? '✓' : '✗'} (${datos.estado})`
                ).join('\n')}
                
                INSUMOS:
                ${Object.entries(registro.insumos || {}).map(([nombre, datos]) => 
                    `- ${nombre}: ${datos.verificado ? '✓' : '✗'} (${datos.estado})`
                ).join('\n')}
                
                ${registro.observaciones ? `OBSERVACIONES:\n${registro.observaciones}` : ''}
            `;
            mostrarAlerta({
                title: 'Detalles del Registro',
                message: detalles.replace(/\n/g, '<br>'),
                type: 'info'
            });
        }
    } catch (error) {
        console.error('Error obteniendo detalles:', error);
        mostrarAlerta({
            title: 'Error',
            message: 'Error obteniendo detalles del registro',
            type: 'error'
        });
    }
};

window.exportarRegistro = function(registroId) {
    mostrarAlerta({
        title: 'Funcionalidad en Desarrollo',
        message: `La funcionalidad de exportación para el registro ${registroId} estará disponible próximamente.`,
        type: 'info'
    });
};

// Hacer disponible globalmente
window.adminInstrumentosController = adminInstrumentosController;

export default adminInstrumentosController;