// js/controllers/instrumentosController.js
// Controlador para manejo de instrumentos y observaciones del practicante

import { instrumentosModel, observacionesModel, authModel } from '../models/storageModel.js';
import { mostrarAlerta } from '../utils/modalUtil.js';

/**
 * Controlador para instrumentos y observaciones
 */
export const instrumentosController = {
    currentModuloData: null,
    
    /**
     * Inicializar el controlador
     * @param {Object} moduloData - Datos del módulo asignado
     */
    async init(moduloData = null) {
        console.log('🚀 Inicializando controlador de instrumentos...');
        this.currentModuloData = moduloData;
        
        this.initChecklistEvents();
        this.initObservacionesEvents();
        await this.loadRecentObservaciones();
        await this.loadPreviousChecklistStates();
    },

    /**
     * Configurar eventos del checklist de instrumentos
     */
    initChecklistEvents() {
        console.log('📋 Configurando eventos del checklist...');
        
        // Botón actualizar checklist
        const updateBtn = document.querySelector('.checklist-btn');
        if (updateBtn) {
            updateBtn.addEventListener('click', () => this.handleUpdateChecklist());
        }

        // Checkboxes de instrumentos - nueva estructura
        const checkboxes = document.querySelectorAll('.item-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => this.handleCheckboxChange(e));
        });

        // Botones de estado
        const statusButtons = document.querySelectorAll('.status-btn');
        statusButtons.forEach(button => {
            button.addEventListener('click', (e) => this.handleStatusButtonClick(e));
        });
    },

    /**
     * Configurar eventos de observaciones
     */
    initObservacionesEvents() {
        console.log('📝 Configurando eventos de observaciones...');
        
        // Botón enviar observación
        const submitBtn = document.querySelector('.submit-observation');
        const textarea = document.getElementById('new-observation');
        const prioritySelect = document.getElementById('priority-level');
        
        if (submitBtn && textarea && prioritySelect) {
            submitBtn.addEventListener('click', () => this.handleSubmitObservacion());
        }

        // Auto-guardar borrador
        if (textarea) {
            textarea.addEventListener('input', (e) => {
                localStorage.setItem('observationDraft', e.target.value);
            });
            
            // Cargar borrador al iniciar
            const draft = localStorage.getItem('observationDraft');
            if (draft) {
                textarea.value = draft;
            }
        }
    },

    /**
     * Manejar cambio en checkbox de instrumento
     * @param {Event} event - Evento del checkbox
     */
    handleCheckboxChange(event) {
        const checkbox = event.target;
        const itemElement = checkbox.closest('.checklist-item');
        const itemName = itemElement.querySelector('.item-name').textContent;
        const isChecked = checkbox.checked;
        const statusContainer = itemElement.querySelector('.status-buttons-container');
        const statusButtons = itemElement.querySelectorAll('.status-btn');
        
        console.log(`📋 Instrumento ${itemName}: ${isChecked ? 'Seleccionado' : 'No seleccionado'}`);
        
        // Habilitar/deshabilitar botones de estado
        if (isChecked) {
            statusContainer.classList.add('enabled');
            statusButtons.forEach(btn => {
                btn.disabled = false;
            });
            itemElement.classList.add('checked');
        } else {
            statusContainer.classList.remove('enabled');
            statusButtons.forEach(btn => {
                btn.disabled = true;
                btn.classList.remove('active');
            });
            itemElement.classList.remove('checked');
        }
        
        // Guardar estado localmente
        this.saveChecklistState(itemName, isChecked, null);
        
        // Actualizar progreso
        this.updateChecklistProgress();
    },

    /**
     * Manejar click en botón de estado
     * @param {Event} event - Evento del botón
     */
    handleStatusButtonClick(event) {
        const button = event.target.closest('.status-btn');
        const itemElement = button.closest('.checklist-item');
        const itemName = itemElement.querySelector('.item-name').textContent;
        const status = button.dataset.status;
        const statusButtons = itemElement.querySelectorAll('.status-btn');
        
        if (button.disabled) return;
        
        // Remover active de todos los botones del item
        statusButtons.forEach(btn => btn.classList.remove('active'));
        
        // Activar el botón seleccionado
        button.classList.add('active');
        
        console.log(`📋 Estado de ${itemName}: ${status}`);
        
        // Guardar estado
        this.saveChecklistState(itemName, true, status);
        
        // Feedback visual
        this.showStatusFeedback(itemElement, status);
    },

    /**
     * Mostrar feedback visual del estado seleccionado
     * @param {Element} itemElement - Elemento del item
     * @param {string} status - Estado seleccionado
     */
    showStatusFeedback(itemElement, status) {
        // Remover clases de estado previas
        itemElement.classList.remove('status-good', 'status-damaged', 'status-missing', 'status-low');
        
        // Agregar clase del nuevo estado
        itemElement.classList.add(`status-${status}`);
        
        // Efecto de pulso para confirmar selección
        itemElement.style.transform = 'scale(1.02)';
        setTimeout(() => {
            itemElement.style.transform = 'scale(1)';
        }, 150);
    },

    /**
     * Manejar actualización del checklist
     */
    async handleUpdateChecklist() {
        try {
            console.log('🔄 Actualizando checklist de instrumentos...');
            
            if (!this.currentModuloData) {
                this.showMessage('warning', '⚠️ Sin Módulo', 'No hay módulo asignado para registrar el checklist.');
                return;
            }

            // Recopilar datos del checklist
            const checklistData = this.collectChecklistData();
            
            // Agregar información del módulo
            checklistData.moduloId = this.currentModuloData.id;
            checklistData.moduloNombre = this.currentModuloData.nombre;
            checklistData.ubicacion = this.currentModuloData.nombreLugar || this.currentModuloData.lugar || this.currentModuloData.ubicacion;

            // Guardar en Firebase
            const resultado = await instrumentosModel.saveChecklist(checklistData);
            
            if (resultado) {
                this.showMessage('success', '✅ Checklist Actualizado', 
                    `Checklist registrado exitosamente para ${checklistData.moduloNombre}.\n\nRegistrado por: ${resultado.usuarioNombre}`);
                
                // Registrar actividad
                await this.logChecklistActivity(resultado);
            } else {
                this.showMessage('error', '❌ Error', 'No se pudo guardar el checklist. Intenta nuevamente.');
            }

        } catch (error) {
            console.error('❌ Error actualizando checklist:', error);
            this.showMessage('error', '❌ Error del Sistema', 'Error interno al guardar el checklist. Contacta al administrador.');
        }
    },

    /**
     * Recopilar datos del checklist actual
     * @returns {Object} Datos del checklist
     */
    collectChecklistData() {
        const instrumentos = {};
        const insumos = {};
        
        // Recopilar estado de todos los elementos del checklist
        const checklistItems = document.querySelectorAll('.checklist-item');
        
        checklistItems.forEach(item => {
            const checkbox = item.querySelector('.item-checkbox');
            const nameElement = item.querySelector('.item-name');
            const activeStatusBtn = item.querySelector('.status-btn.active');
            
            if (checkbox && nameElement) {
                const itemName = nameElement.textContent.trim();
                const isChecked = checkbox.checked;
                const itemId = item.dataset.item;
                
                let status = 'sin_verificar';
                let categoria = 'desconocido';
                
                if (isChecked && activeStatusBtn) {
                    status = activeStatusBtn.textContent.trim();
                    categoria = activeStatusBtn.dataset.status;
                }
                
                const itemData = {
                    verificado: isChecked,
                    estado: status,
                    categoria: categoria,
                    itemId: itemId,
                    timestamp: new Date().toISOString()
                };

                // Clasificar como instrumento o insumo basado en el ID del item
                if (itemId && (itemId.includes('guantes') || 
                              itemId.includes('mascarillas') || 
                              itemId.includes('gasas') ||
                              itemId.includes('insumo'))) {
                    insumos[itemName] = itemData;
                } else {
                    instrumentos[itemName] = itemData;
                }
            }
        });

        return {
            instrumentos,
            insumos,
            observaciones: this.getChecklistObservaciones()
        };
    },

    /**
     * Obtener observaciones adicionales del checklist
     * @returns {string} Observaciones
     */
    getChecklistObservaciones() {
        // Buscar cualquier observación adicional del checklist
        const observacionesTextarea = document.querySelector('.checklist-content textarea');
        return observacionesTextarea ? observacionesTextarea.value.trim() : '';
    },

    /**
     * Guardar estado del checklist localmente
     * @param {string} itemName - Nombre del elemento
     * @param {boolean} isChecked - Estado verificado
     * @param {string} status - Estado del elemento
     */
    saveChecklistState(itemName, isChecked, status) {
        let checklistData = JSON.parse(localStorage.getItem('checklistData') || '{}');
        checklistData[itemName] = {
            checked: isChecked,
            status: status,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem('checklistData', JSON.stringify(checklistData));
    },

    /**
     * Cargar estados previos del checklist
     */
    async loadPreviousChecklistStates() {
        try {
            console.log('📋 Cargando estados previos del checklist...');
            
            // Cargar desde localStorage (estados locales)
            const localData = JSON.parse(localStorage.getItem('checklistData') || '{}');
            
            // También intentar cargar el último registro de Firebase para este módulo/usuario
            if (this.currentModuloData) {
                const currentUser = authModel.getCurrentUser();
                if (currentUser) {
                    const lastRecord = await instrumentosModel.getLastChecklistRecord(
                        currentUser.uid, 
                        this.currentModuloData.id
                    );
                    
                    if (lastRecord && lastRecord.instrumentos) {
                        this.applyPreviousStates(lastRecord.instrumentos, 'instrumentos');
                    }
                    
                    if (lastRecord && lastRecord.insumos) {
                        this.applyPreviousStates(lastRecord.insumos, 'insumos');
                    }
                }
            }
            
            // Aplicar estados locales (tienen prioridad)
            this.applyLocalStates(localData);
            
        } catch (error) {
            console.warn('⚠️ Error cargando estados previos:', error);
        }
    },

    /**
     * Aplicar estados previos desde Firebase
     * @param {Object} items - Items del registro previo
     * @param {string} type - Tipo (instrumentos/insumos)
     */
    applyPreviousStates(items, type) {
        Object.entries(items).forEach(([itemName, data]) => {
            const itemElement = this.findItemElementByName(itemName);
            if (itemElement && data.verificado) {
                const checkbox = itemElement.querySelector('.item-checkbox');
                const statusBtn = itemElement.querySelector(`[data-status="${data.categoria}"]`);
                
                if (checkbox) {
                    checkbox.checked = true;
                    this.handleCheckboxChange({ target: checkbox });
                }
                
                if (statusBtn) {
                    statusBtn.click();
                }
            }
        });
    },

    /**
     * Aplicar estados locales
     * @param {Object} localData - Datos locales guardados
     */
    applyLocalStates(localData) {
        Object.entries(localData).forEach(([itemName, data]) => {
            const itemElement = this.findItemElementByName(itemName);
            if (itemElement) {
                const checkbox = itemElement.querySelector('.item-checkbox');
                
                if (checkbox && data.checked) {
                    checkbox.checked = true;
                    this.handleCheckboxChange({ target: checkbox });
                    
                    if (data.status) {
                        const statusBtn = itemElement.querySelector(`[data-status="${data.status}"]`);
                        if (statusBtn) {
                            statusBtn.click();
                        }
                    }
                }
            }
        });
    },

    /**
     * Encontrar elemento del item por nombre
     * @param {string} itemName - Nombre del item
     * @returns {Element|null} Elemento encontrado
     */
    findItemElementByName(itemName) {
        const items = document.querySelectorAll('.checklist-item');
        for (let item of items) {
            const nameElement = item.querySelector('.item-name');
            if (nameElement && nameElement.textContent.trim() === itemName) {
                return item;
            }
        }
        return null;
    },

    /**
     * Actualizar progreso del checklist
     */
    updateChecklistProgress() {
        const totalItems = document.querySelectorAll('.checklist-item').length;
        const checkedItems = document.querySelectorAll('.item-checkbox:checked').length;
        const completedItems = document.querySelectorAll('.status-btn.active').length;
        
        const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
        
        console.log(`📊 Progreso del checklist: ${completedItems}/${totalItems} (${progress}%)`);
        
        // Actualizar indicador visual del progreso si existe
        const progressIndicator = document.querySelector('.checklist-progress');
        if (progressIndicator) {
            progressIndicator.textContent = `${progress}% (${completedItems}/${totalItems})`;
        }
        
        // Actualizar header del card si existe
        const checklistHeader = document.querySelector('.checklist-content').closest('.dashboard-card').querySelector('.card-header h3');
        if (checklistHeader) {
            checklistHeader.innerHTML = `<i class="fas fa-tasks"></i> Checklist de Instrumentos <span style="color: #64748b; font-size: 0.9rem; font-weight: normal;">(${progress}%)</span>`;
        }
    },

    /**
     * Manejar envío de observación
     */
    async handleSubmitObservacion() {
        try {
            const textarea = document.getElementById('new-observation');
            const prioritySelect = document.getElementById('priority-level');
            
            const descripcion = textarea ? textarea.value.trim() : '';
            const prioridad = prioritySelect ? prioritySelect.value : 'medium';
            
            if (!descripcion) {
                this.showMessage('warning', '⚠️ Descripción Requerida', 'Por favor describe la observación antes de enviar.');
                return;
            }

            if (!this.currentModuloData) {
                this.showMessage('warning', '⚠️ Sin Módulo', 'No hay módulo asignado para registrar la observación.');
                return;
            }

            // Preparar datos de la observación
            const observacionData = {
                descripcion,
                prioridad,
                moduloId: this.currentModuloData.id,
                moduloNombre: this.currentModuloData.nombre,
                ubicacion: this.currentModuloData.nombreLugar || this.currentModuloData.lugar || this.currentModuloData.ubicacion,
                categoria: this.determineCategoria(descripcion)
            };

            // Guardar en Firebase
            const resultado = await observacionesModel.saveObservacion(observacionData);
            
            if (resultado) {
                this.showMessage('success', '✅ Reporte Enviado', 
                    `Observación registrada exitosamente.\nPrioridad: ${this.getPrioridadLabel(prioridad)}\n\nEl personal administrativo será notificado.`);
                
                // Limpiar formulario
                if (textarea) textarea.value = '';
                if (prioritySelect) prioritySelect.value = 'medium';
                localStorage.removeItem('observationDraft');
                
                // Actualizar lista de observaciones recientes
                await this.loadRecentObservaciones();
                
                // Registrar actividad
                await this.logObservacionActivity(resultado);
            } else {
                this.showMessage('error', '❌ Error', 'No se pudo enviar la observación. Intenta nuevamente.');
            }

        } catch (error) {
            console.error('❌ Error enviando observación:', error);
            this.showMessage('error', '❌ Error del Sistema', 'Error interno al enviar la observación. Contacta al administrador.');
        }
    },

    /**
     * Determinar categoría de la observación basada en el contenido
     * @param {string} descripcion - Descripción de la observación
     * @returns {string} Categoría
     */
    determineCategoria(descripcion) {
        const desc = descripcion.toLowerCase();
        
        if (desc.includes('instrumento') || desc.includes('estetoscopio') || desc.includes('tensiómetro') || desc.includes('otoscopio') || desc.includes('termómetro')) {
            return 'instrumentos';
        } else if (desc.includes('insumo') || desc.includes('guantes') || desc.includes('mascarilla') || desc.includes('gasa') || desc.includes('stock')) {
            return 'insumos';
        } else if (desc.includes('limpieza') || desc.includes('higiene') || desc.includes('desinfección')) {
            return 'limpieza';
        } else if (desc.includes('infraestructura') || desc.includes('mobiliario') || desc.includes('instalaciones')) {
            return 'infraestructura';
        } else {
            return 'general';
        }
    },

    /**
     * Obtener etiqueta legible de prioridad
     * @param {string} prioridad - Nivel de prioridad
     * @returns {string} Etiqueta legible
     */
    getPrioridadLabel(prioridad) {
        const labels = {
            'low': 'Baja',
            'medium': 'Media',
            'high': 'Alta',
            'urgent': 'Urgente'
        };
        return labels[prioridad] || 'Media';
    },

    /**
     * Cargar observaciones recientes del usuario
     */
    async loadRecentObservaciones() {
        try {
            console.log('📋 Cargando observaciones recientes...');
            
            const currentUser = authModel.getCurrentUser();
            if (!currentUser) return;

            // Obtener observaciones del usuario actual
            const observaciones = await observacionesModel.getObservaciones({
                usuarioId: currentUser.uid
            });

            // Ordenar por fecha más reciente
            observaciones.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            // Mostrar las 3 más recientes
            this.displayRecentObservaciones(observaciones.slice(0, 3));

        } catch (error) {
            console.error('❌ Error cargando observaciones recientes:', error);
        }
    },

    /**
     * Mostrar observaciones recientes en la UI
     * @param {Array} observaciones - Lista de observaciones
     */
    displayRecentObservaciones(observaciones) {
        const container = document.querySelector('.recent-observations');
        if (!container) return;

        const observacionesContainer = container.querySelector('.observation-item')?.parentElement;
        if (!observacionesContainer) return;

        if (observaciones.length === 0) {
            observacionesContainer.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #64748b;">
                    <i class="fas fa-clipboard-list" style="font-size: 1.5rem; margin-bottom: 8px; opacity: 0.5;"></i>
                    <p style="margin: 0;">No hay observaciones recientes</p>
                </div>
            `;
            return;
        }

        observacionesContainer.innerHTML = observaciones.map(obs => {
            const fecha = new Date(obs.timestamp);
            const fechaFormateada = fecha.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
            const horaFormateada = fecha.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <div class="observation-item">
                    <div class="obs-content">
                        <span class="obs-text">${obs.descripcion}</span>
                        <span class="obs-priority ${obs.prioridad}">${this.getPrioridadLabel(obs.prioridad)} prioridad</span>
                    </div>
                    <div class="obs-meta">
                        <span class="obs-date">${fechaFormateada} - ${horaFormateada}</span>
                        <span class="obs-status ${obs.estado}">${this.getEstadoLabel(obs.estado)}</span>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Obtener etiqueta legible de estado
     * @param {string} estado - Estado
     * @returns {string} Etiqueta legible
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
     * Registrar actividad de checklist
     * @param {Object} checklistData - Datos del checklist guardado
     */
    async logChecklistActivity(checklistData) {
        try {
            const { default: ActivityLogger } = await import('../utils/activityLogger.js');
            await ActivityLogger.log({
                accion: 'checklist_instrumentos',
                descripcion: `Checklist de instrumentos actualizado para ${checklistData.moduloNombre}`,
                modulo: 'operaciones',
                recursoId: checklistData.id,
                recursoTipo: 'checklist',
                detalles: {
                    moduloId: checklistData.moduloId,
                    moduloNombre: checklistData.moduloNombre,
                    ubicacion: checklistData.ubicacion,
                    totalInstrumentos: Object.keys(checklistData.instrumentos || {}).length,
                    totalInsumos: Object.keys(checklistData.insumos || {}).length
                }
            });
        } catch (error) {
            console.warn('Error registrando actividad de checklist:', error);
        }
    },

    /**
     * Registrar actividad de observación
     * @param {Object} observacionData - Datos de la observación guardada
     */
    async logObservacionActivity(observacionData) {
        try {
            const { default: ActivityLogger } = await import('../utils/activityLogger.js');
            await ActivityLogger.log({
                accion: 'crear_observacion',
                descripcion: `Observación registrada: ${observacionData.descripcion.substring(0, 50)}${observacionData.descripcion.length > 50 ? '...' : ''}`,
                modulo: 'operaciones',
                recursoId: observacionData.id,
                recursoTipo: 'observacion',
                detalles: {
                    prioridad: observacionData.prioridad,
                    categoria: observacionData.categoria,
                    moduloId: observacionData.moduloId,
                    moduloNombre: observacionData.moduloNombre,
                    ubicacion: observacionData.ubicacion
                }
            });
        } catch (error) {
            console.warn('Error registrando actividad de observación:', error);
        }
    },

    /**
     * Mostrar mensaje al usuario
     * @param {string} tipo - Tipo de mensaje (success, error, warning, info)
     * @param {string} titulo - Título del mensaje
     * @param {string} mensaje - Contenido del mensaje
     */
    showMessage(tipo, titulo, mensaje) {
        // Usar el sistema de mensajes global si está disponible
        if (window.mostrarMensaje && typeof window.mostrarMensaje === 'function') {
            window.mostrarMensaje(tipo, titulo, mensaje);
        } else {
            // Usar modal elegante en lugar de alert
            mostrarAlerta({
                title: titulo,
                message: mensaje,
                type: tipo === 'success' ? 'success' : 'info'
            });
        }
    },

    /**
     * Actualizar datos del módulo
     * @param {Object} moduloData - Nuevos datos del módulo
     */
    updateModuloData(moduloData) {
        this.currentModuloData = moduloData;
        console.log('📍 Datos del módulo actualizados:', moduloData);
    }
};

// Hacer disponible globalmente
window.instrumentosController = instrumentosController;

export default instrumentosController;
