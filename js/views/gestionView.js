// js/views/gestionView.js
import { gestionModel } from '../models/gestionModel.js';
import eventBus, { EVENT_NAMES } from '../utils/eventBus.js';
import * as modalUtil from '../utils/modalUtil.js'; // Importamos modalUtil estáticamente

// Variables globales para mantener referencias a los contenedores
let modulosContainer = null;
let gruposContainer = null;

// Datos de ejemplo para inicializar el sistema si no existen datos
const datosIniciales = {
    modulos: [
        { nombre: "Módulo Principal", ubicacion: "Planta baja - Entrada", estado: "Activo" },
        { nombre: "Módulo Pediatría", ubicacion: "Planta baja - Ala este", estado: "Activo" },
        { nombre: "Módulo Urgencias", ubicacion: "Planta baja - Ala oeste", estado: "Activo" },
        { nombre: "Módulo Especialidades", ubicacion: "Planta alta - Ala norte", estado: "Inactivo" }
    ],
    grupos: [
        { nombre: "Grupo A", turno: "Matutino", horario: "8:00 - 14:00", miembros: [] },
        { nombre: "Grupo B", turno: "Vespertino", horario: "14:00 - 20:00", miembros: [] },
        { nombre: "Grupo C", turno: "Nocturno", horario: "20:00 - 8:00", miembros: [] }
    ]
};

/**
 * Inicializa la vista de gestión, similar a como se hace en userView.js
 * Esta función se ejecuta UNA SOLA VEZ al cargar la página
 */
export function init() {
    console.log('GestionView: Inicializando vista de gestión');
    
    // Obtener referencias a los contenedores
    modulosContainer = document.getElementById('modulos-section');
    gruposContainer = document.getElementById('grupos-section');
    
    if (!modulosContainer || !gruposContainer) {
        console.error('GestionView: Contenedores no encontrados. La vista no puede funcionar correctamente.');
        return;
    }
    
    // Escuchar eventos para actualizar la vista
    eventBus.on(EVENT_NAMES.MODULE_CREATED, () => {
        if (modulosContainer.classList.contains('active')) {
            renderGestionModulos(modulosContainer);
        }
    });
    
    eventBus.on(EVENT_NAMES.MODULE_UPDATED, () => {
        if (modulosContainer.classList.contains('active')) {
            renderGestionModulos(modulosContainer);
        }
    });
    
    eventBus.on(EVENT_NAMES.MODULE_DELETED, () => {
        if (modulosContainer.classList.contains('active')) {
            renderGestionModulos(modulosContainer);
        }
    });
    
    eventBus.on(EVENT_NAMES.GROUP_CREATED, () => {
        if (gruposContainer.classList.contains('active')) {
            renderGestionGrupos(gruposContainer);
        }
    });
    
    eventBus.on(EVENT_NAMES.GROUP_UPDATED, () => {
        if (gruposContainer.classList.contains('active')) {
            renderGestionGrupos(gruposContainer);
        }
    });
    
    eventBus.on(EVENT_NAMES.GROUP_DELETED, () => {
        if (gruposContainer.classList.contains('active')) {
            renderGestionGrupos(gruposContainer);
        }
    });
    
    // También mantener compatibilidad con eventos antiguos
    eventBus.on('gestion-modulo-updated', () => {
        if (modulosContainer.classList.contains('active')) {
            renderGestionModulos(modulosContainer);
        }
    });
    
    eventBus.on('gestion-grupo-updated', () => {
        if (gruposContainer.classList.contains('active')) {
            renderGestionGrupos(gruposContainer);
        }
    });
    
    console.log('GestionView: Vista de gestión inicializada correctamente');
}

// Función para inicializar datos de ejemplo si no existen
export function inicializarDatosGestion() {
    // Verificar si ya existen datos
    const modulos = gestionModel.getModulos();
    const grupos = gestionModel.getGrupos();
    
    // Si no hay módulos, crear módulos de ejemplo
    if (modulos.length === 0) {
        console.log("GestionView: Inicializando módulos de ejemplo");
        datosIniciales.modulos.forEach(modulo => {
            gestionModel.createModulo(modulo);
        });
    }
    
    // Si no hay grupos, crear grupos de ejemplo
    if (grupos.length === 0) {
        console.log("GestionView: Inicializando grupos de ejemplo");
        datosIniciales.grupos.forEach(grupo => {
            gestionModel.createGrupo(grupo);
        });
    }
    
    // Emitir evento de inicialización completada
    eventBus.emit('gestion-data-initialized', {
        modulos: gestionModel.getModulos().length,
        grupos: gestionModel.getGrupos().length,
        timestamp: new Date().toISOString()
    });
}

/**
 * Renderiza la sección de módulos
 */
export function renderGestionModulos(container) {
    const modulos = gestionModel.getModulos();
    const grupos = gestionModel.getGrupos();
    
    container.innerHTML = `
        <h2 class="content-title">Módulos de Salud</h2>
        <button class="btn-primary" id="btnNuevoModulo">
            <i class="fas fa-plus"></i> Nuevo Módulo
        </button>
        
        <div id="lista-modulos" style="margin-top: 20px;">
            ${modulos.length === 0 ? 
                '<div class="empty-message">No hay módulos registrados. Crea uno nuevo para comenzar.</div>' : 
                renderTablaModulos(modulos, grupos)
            }
        </div>
    `;
    
    // Configurar evento para nuevo módulo - solo configurarlo una vez después de renderizar
    const btnNuevoModulo = container.querySelector('#btnNuevoModulo');
    if (btnNuevoModulo) {
        // Eliminar eventos anteriores
        const nuevoBtn = btnNuevoModulo.cloneNode(true);
        btnNuevoModulo.parentNode.replaceChild(nuevoBtn, btnNuevoModulo);
        
        // Añadir nuevo evento
        nuevoBtn.addEventListener('click', () => {
            console.log('GestionView: Solicitando formulario para nuevo módulo');
            // Renderizar directamente sin modificar el controlador
            renderFormModulo();
        });
    }
    
    // Configurar delegación de eventos para la tabla
    const tablaModulos = container.querySelector('.data-table');
    if (tablaModulos) {
        // Eliminar eventos anteriores
        const nuevaTabla = tablaModulos.cloneNode(true);
        tablaModulos.parentNode.replaceChild(nuevaTabla, tablaModulos);
        
        // Añadir nuevo evento con delegación
        nuevaTabla.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target) return;
            
            if (target.classList.contains('edit-modulo')) {
                const moduloId = target.dataset.id;
                console.log('GestionView: Solicitando edición de módulo', moduloId);
                const modulo = gestionModel.getModuloById(moduloId);
                renderFormModulo(modulo);
            }
            else if (target.classList.contains('delete-modulo')) {
                const moduloId = target.dataset.id;
                const modulo = gestionModel.getModuloById(moduloId);
                console.log('GestionView: Solicitando eliminación de módulo', moduloId);
                
                modalUtil.confirmarAccion({
                    title: 'Eliminar Módulo',
                    message: `¿Estás seguro de eliminar el módulo "${modulo.nombre}"? Esta acción no se puede deshacer.`,
                    onConfirm: () => {
                        const moduloEliminado = gestionModel.getModuloById(moduloId);
                        gestionModel.deleteModulo(moduloId);
                        
                        // Emitir eventos
                        eventBus.emit(EVENT_NAMES.MODULE_DELETED, { module: moduloEliminado });
                        eventBus.emit('gestion-modulo-updated', { action: 'delete', id: moduloId });
                    }
                });
            }
            else if (target.classList.contains('assign-grupo')) {
                const moduloId = target.dataset.moduloid;
                console.log('GestionView: Solicitando asignación de grupo para módulo', moduloId);
                // Implementar la asignación directamente en la vista
                mostrarModalAsignarGrupo(moduloId);
            }
        });
    }
}

/**
 * Renderiza la tabla de módulos
 */
function renderTablaModulos(modulos, grupos) {
    return `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Ubicación</th>
                    <th>Estado</th>
                    <th>Grupo Asignado</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${modulos.map(modulo => {
                    // Encontrar el grupo asignado, si existe
                    const grupoAsignado = modulo.grupoAsignadoId ? 
                        grupos.find(g => g.id === modulo.grupoAsignadoId) : null;
                    
                    return `
                        <tr>
                            <td>${modulo.id}</td>
                            <td>${modulo.nombre}</td>
                            <td>${modulo.ubicacion}</td>
                            <td>
                                <span class="badge ${getEstadoClass(modulo.estado)}">
                                    ${modulo.estado}
                                </span>
                            </td>
                            <td>
                                ${grupoAsignado ? 
                                    `${grupoAsignado.nombre} <br><small>(${grupoAsignado.turno})</small>` : 
                                    '<span class="badge badge-gray">No asignado</span>'
                                }
                            </td>
                            <td class="actions">
                                <button class="btn-icon assign-grupo" title="Asignar grupo" data-moduloid="${modulo.id}">
                                    <i class="fas fa-users"></i>
                                </button>
                                <button class="btn-icon edit-modulo" title="Editar" data-id="${modulo.id}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-icon delete-modulo" title="Eliminar" data-id="${modulo.id}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

/**
 * Renderiza la sección de grupos
 */
export function renderGestionGrupos(container) {
    const grupos = gestionModel.getGrupos();
    
    container.innerHTML = `
        <h2 class="content-title">Grupos de Trabajo</h2>
        <button class="btn-primary" id="btnNuevoGrupo">
            <i class="fas fa-plus"></i> Nuevo Grupo
        </button>
        
        <div id="lista-grupos" style="margin-top: 20px;">
            ${grupos.length === 0 ? 
                '<div class="empty-message">No hay grupos registrados. Crea uno nuevo para comenzar.</div>' : 
                renderTablaGrupos(grupos)
            }
        </div>
    `;
    
    // Configurar evento para nuevo grupo
    const btnNuevoGrupo = container.querySelector('#btnNuevoGrupo');
    if (btnNuevoGrupo) {
        // Eliminar eventos anteriores
        const nuevoBtn = btnNuevoGrupo.cloneNode(true);
        btnNuevoGrupo.parentNode.replaceChild(nuevoBtn, btnNuevoGrupo);
        
        // Añadir nuevo evento
        nuevoBtn.addEventListener('click', () => {
            console.log('GestionView: Solicitando formulario para nuevo grupo');
            // Renderizar directamente sin modificar el controlador
            renderFormGrupo();
        });
    }
    
    // Configurar delegación de eventos para la tabla
    const tablaGrupos = container.querySelector('.data-table');
    if (tablaGrupos) {
        // Eliminar eventos anteriores
        const nuevaTabla = tablaGrupos.cloneNode(true);
        tablaGrupos.parentNode.replaceChild(nuevaTabla, tablaGrupos);
        
        // Añadir nuevo evento con delegación
        nuevaTabla.addEventListener('click', (e) => {
            const target = e.target.closest('button');
            if (!target) return;
            
            if (target.classList.contains('edit-grupo')) {
                const grupoId = target.dataset.id;
                console.log('GestionView: Solicitando edición de grupo', grupoId);
                const grupo = gestionModel.getGrupoById(grupoId);
                renderFormGrupo(grupo);
            }
            else if (target.classList.contains('delete-grupo')) {
                const grupoId = target.dataset.id;
                const grupo = gestionModel.getGrupoById(grupoId);
                console.log('GestionView: Solicitando eliminación de grupo', grupoId);
                
                modalUtil.confirmarAccion({
                    title: 'Eliminar Grupo',
                    message: `¿Estás seguro de eliminar el grupo "${grupo.nombre}"? Esta acción no se puede deshacer.`,
                    onConfirm: () => {
                        const grupoEliminado = gestionModel.getGrupoById(grupoId);
                        gestionModel.deleteGrupo(grupoId);
                        
                        // Emitir eventos
                        eventBus.emit(EVENT_NAMES.GROUP_DELETED, { group: grupoEliminado });
                        eventBus.emit('gestion-grupo-updated', { action: 'delete', id: grupoId });
                    }
                });
            }
        });
    }
}

/**
 * Renderiza la tabla de grupos
 */
function renderTablaGrupos(grupos) {
    return `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Turno</th>
                    <th>Horario</th>
                    <th>Miembros</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${grupos.map(grupo => `
                    <tr>
                        <td>${grupo.id}</td>
                        <td>${grupo.nombre}</td>
                        <td>${grupo.turno}</td>
                        <td>${grupo.horario}</td>
                        <td>${grupo.miembros.length} miembro(s)</td>
                        <td class="actions">
                            <button class="btn-icon edit-grupo" title="Editar" data-id="${grupo.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon delete-grupo" title="Eliminar" data-id="${grupo.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

/**
 * Renderiza el formulario de módulo y configura sus eventos
 */
export function renderFormModulo(modulo = null) {
    // Eliminar formulario anterior si existe
    document.getElementById('modulo-form-container')?.remove();
    
    const formContainer = document.createElement('div');
    formContainer.id = 'modulo-form-container';
    formContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, rgba(125, 211, 252, 0.8), rgba(254, 243, 199, 0.8)), url('img/medical-background.png?v=1') center center / cover no-repeat;
        z-index: 1000;
        display: flex;
        justify-content: center;
        align-items: center;
        overflow-y: auto;
    `;
    
    formContainer.innerHTML = `
        <div class="modal-dialog" style="
            background: white;
            max-width: 500px;
            width: 90%;
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
                background: linear-gradient(135deg, #0ea5e9, #0284c7);
                color: white;
                border-radius: 12px 12px 0 0;
            ">
                <h3 style="margin: 0; font-weight: 600;">${modulo ? 'Editar Módulo' : 'Nuevo Módulo'}</h3>
                <button id="btnCerrarModuloX" style="
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: white;
                ">×</button>
            </div>
            
            <div class="modal-body" style="padding: 20px;">
                <form id="form-modulo">
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label for="modulo-nombre" style="display: block; margin-bottom: 8px; font-weight: 500;">Nombre:</label>
                        <input type="text" id="modulo-nombre" required value="${modulo?.nombre || ''}" style="
                            width: 100%;
                            padding: 10px 12px;
                            border: 1px solid #d1d5db;
                            border-radius: 8px;
                            background-color: #f9fafb;
                            font-size: 16px;
                            box-sizing: border-box;
                        ">
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label for="modulo-ubicacion" style="display: block; margin-bottom: 8px; font-weight: 500;">Ubicación:</label>
                        <input type="text" id="modulo-ubicacion" required value="${modulo?.ubicacion || ''}" style="
                            width: 100%;
                            padding: 10px 12px;
                            border: 1px solid #d1d5db;
                            border-radius: 8px;
                            background-color: #f9fafb;
                            font-size: 16px;
                            box-sizing: border-box;
                        ">
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label for="modulo-estado" style="display: block; margin-bottom: 8px; font-weight: 500;">Estado:</label>
                        <select id="modulo-estado" style="
                            width: 100%;
                            padding: 10px 12px;
                            border: 1px solid #d1d5db;
                            border-radius: 8px;
                            background-color: #f9fafb;
                            font-size: 16px;
                            box-sizing: border-box;
                        ">
                            <option value="Activo" ${modulo?.estado === 'Activo' ? 'selected' : ''}>Activo</option>
                            <option value="Inactivo" ${modulo?.estado === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
                            <option value="En mantenimiento" ${modulo?.estado === 'En mantenimiento' ? 'selected' : ''}>En mantenimiento</option>
                        </select>
                    </div>
                    
                    <div class="form-buttons" style="
                        display: flex;
                        justify-content: flex-end;
                        gap: 12px;
                        margin-top: 25px;
                    ">
                        <button type="button" id="btnCancelarModulo" style="
                            background: linear-gradient(135deg, #7dd3fc, #fef3c7);
                            color: #1f2937;
                            border: none;
                            border-radius: 25px;
                            padding: 12px 24px;
                            font-size: 16px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.3s ease;
                        ">Cancelar</button>
                        <button type="button" id="btnGuardarModulo" style="
                            background: linear-gradient(135deg, #0ea5e9, #0284c7);
                            color: white;
                            border: none;
                            border-radius: 25px;
                            padding: 12px 24px;
                            font-size: 16px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.3s ease;
                        ">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(formContainer);
    
    // Configurar eventos del formulario
    const cerrarBtn = document.getElementById('btnCerrarModuloX');
    const cancelarBtn = document.getElementById('btnCancelarModulo');
    const guardarBtn = document.getElementById('btnGuardarModulo');
    
    // Eventos para cerrar/cancelar
    cerrarBtn.addEventListener('click', () => {
        formContainer.remove();
    });
    
    cancelarBtn.addEventListener('click', () => {
        formContainer.remove();
    });
    
    // Cerrar al hacer clic fuera del modal
    formContainer.addEventListener('click', (e) => {
        if (e.target === formContainer) {
            formContainer.remove();
        }
    });
    
    // Evento para guardar
    guardarBtn.addEventListener('click', () => {
        const formModulo = document.getElementById('form-modulo');
        if (!formModulo) return;
        
        const nombre = formModulo.querySelector('#modulo-nombre').value.trim();
        const ubicacion = formModulo.querySelector('#modulo-ubicacion').value.trim();
        const estado = formModulo.querySelector('#modulo-estado').value;
        
        // Validar datos
        if (!nombre || !ubicacion) {
            modalUtil.mostrarAlerta({
                title: 'Campos incompletos',
                message: 'Nombre y ubicación son campos obligatorios',
                type: 'warning'
            });
            return;
        }
        
        // Datos a guardar
        const moduloData = {
            nombre,
            ubicacion,
            estado
        };
        
        let resultado;
        
        if (modulo) {
            // Actualizar módulo existente
            resultado = gestionModel.updateModulo(modulo.id, moduloData);
            if (resultado) {
                eventBus.emit(EVENT_NAMES.MODULE_UPDATED, { module: resultado });
                eventBus.emit('gestion-modulo-updated', { action: 'update', id: modulo.id });
            }
        } else {
            // Crear nuevo módulo
            resultado = gestionModel.createModulo(moduloData);
            if (resultado) {
                eventBus.emit(EVENT_NAMES.MODULE_CREATED, { module: resultado });
                eventBus.emit('gestion-modulo-updated', { action: 'create', id: resultado.id });
            }
        }
        
        if (resultado) {
            formContainer.remove();
            
            // Mostrar notificación de éxito
            modalUtil.mostrarAlerta({
                title: 'Módulo Guardado',
                message: modulo ? 
                    'El módulo se ha actualizado correctamente.' : 
                    'El módulo se ha creado correctamente.',
                type: 'success'
            });
        } else {
            modalUtil.mostrarAlerta({
                title: 'Error',
                message: 'Hubo un problema al guardar el módulo. Por favor intenta de nuevo.',
                type: 'error'
            });
        }
    });
    
    // Enfocar el primer campo
    setTimeout(() => {
        document.getElementById('modulo-nombre')?.focus();
    }, 100);
}

/**
 * Renderiza el formulario de grupo y configura sus eventos
 */
export function renderFormGrupo(grupo = null) {
    // Eliminar formulario anterior si existe
    document.getElementById('grupo-form-container')?.remove();
    
    const formContainer = document.createElement('div');
    formContainer.id = 'grupo-form-container';
    formContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, rgba(125, 211, 252, 0.8), rgba(254, 243, 199, 0.8)), url('img/medical-background.png?v=1') center center / cover no-repeat;
        z-index: 1000;
        display: flex;
        justify-content: center;
        align-items: center;
        overflow-y: auto;
    `;
    
    formContainer.innerHTML = `
        <div class="modal-dialog" style="
            background: white;
            max-width: 500px;
            width: 90%;
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
                background: linear-gradient(135deg, #0ea5e9, #0284c7);
                color: white;
                border-radius: 12px 12px 0 0;
            ">
                <h3 style="margin: 0; font-weight: 600;">${grupo ? 'Editar Grupo' : 'Nuevo Grupo'}</h3>
                <button id="btnCerrarGrupoX" style="
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: white;
                ">×</button>
            </div>
            
            <div class="modal-body" style="padding: 20px;">
                <form id="form-grupo">
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label for="grupo-nombre" style="display: block; margin-bottom: 8px; font-weight: 500;">Nombre:</label>
                        <input type="text" id="grupo-nombre" required value="${grupo?.nombre || ''}" style="
                            width: 100%;
                            padding: 10px 12px;
                            border: 1px solid #d1d5db;
                            border-radius: 8px;
                            background-color: #f9fafb;
                            font-size: 16px;
                            box-sizing: border-box;
                        ">
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label for="grupo-turno" style="display: block; margin-bottom: 8px; font-weight: 500;">Turno:</label>
                        <select id="grupo-turno" style="
                            width: 100%;
                            padding: 10px 12px;
                            border: 1px solid #d1d5db;
                            border-radius: 8px;
                            background-color: #f9fafb;
                            font-size: 16px;
                            box-sizing: border-box;
                        ">
                            <option value="Matutino" ${grupo?.turno === 'Matutino' ? 'selected' : ''}>Matutino</option>
                            <option value="Vespertino" ${grupo?.turno === 'Vespertino' ? 'selected' : ''}>Vespertino</option>
                            <option value="Nocturno" ${grupo?.turno === 'Nocturno' ? 'selected' : ''}>Nocturno</option>
                            <option value="Mixto" ${grupo?.turno === 'Mixto' ? 'selected' : ''}>Mixto</option>
                        </select>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label for="grupo-horario" style="display: block; margin-bottom: 8px; font-weight: 500;">Horario:</label>
                        <input type="text" id="grupo-horario" required placeholder="ej. 8:00 - 14:00" value="${grupo?.horario || ''}" style="
                            width: 100%;
                            padding: 10px 12px;
                            border: 1px solid #d1d5db;
                            border-radius: 8px;
                            background-color: #f9fafb;
                            font-size: 16px;
                            box-sizing: border-box;
                        ">
                    </div>
                    
                    <div class="form-buttons" style="
                        display: flex;
                        justify-content: flex-end;
                        gap: 12px;
                        margin-top: 25px;
                    ">
                        <button type="button" id="btnCancelarGrupo" style="
                            background: linear-gradient(135deg, #7dd3fc, #fef3c7);
                            color: #1f2937;
                            border: none;
                            border-radius: 25px;
                            padding: 12px 24px;
                            font-size: 16px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.3s ease;
                        ">Cancelar</button>
                        <button type="button" id="btnGuardarGrupo" style="
                            background: linear-gradient(135deg, #0ea5e9, #0284c7);
                            color: white;
                            border: none;
                            border-radius: 25px;
                            padding: 12px 24px;
                            font-size: 16px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.3s ease;
                        ">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(formContainer);
    
    // Configurar eventos del formulario
    const cerrarBtn = document.getElementById('btnCerrarGrupoX');
    const cancelarBtn = document.getElementById('btnCancelarGrupo');
    const guardarBtn = document.getElementById('btnGuardarGrupo');
    
    // Eventos para cerrar/cancelar
    cerrarBtn.addEventListener('click', () => {
        formContainer.remove();
    });
    
    cancelarBtn.addEventListener('click', () => {
        formContainer.remove();
    });
    
    // Cerrar al hacer clic fuera del modal
    formContainer.addEventListener('click', (e) => {
        if (e.target === formContainer) {
            formContainer.remove();
        }
    });
    
    // Evento para guardar
    guardarBtn.addEventListener('click', () => {
        const formGrupo = document.getElementById('form-grupo');
        if (!formGrupo) return;
        
        const nombre = formGrupo.querySelector('#grupo-nombre').value.trim();
        const turno = formGrupo.querySelector('#grupo-turno').value.trim();
        const horario = formGrupo.querySelector('#grupo-horario').value.trim();
        
        // Validar datos
        if (!nombre || !turno || !horario) {
            modalUtil.mostrarAlerta({
                title: 'Campos incompletos',
                message: 'Todos los campos son obligatorios',
                type: 'warning'
            });
            return;
        }
        
        // Datos a guardar
        const grupoData = {
            nombre,
            turno,
            horario
        };
        
        let resultado;
        
        if (grupo) {
            // Actualizar grupo existente
            resultado = gestionModel.updateGrupo(grupo.id, grupoData);
            if (resultado) {
                eventBus.emit(EVENT_NAMES.GROUP_UPDATED, { group: resultado });
                eventBus.emit('gestion-grupo-updated', { action: 'update', id: grupo.id });
            }
        } else {
            // Crear nuevo grupo
            resultado = gestionModel.createGrupo(grupoData);
            if (resultado) {
                eventBus.emit(EVENT_NAMES.GROUP_CREATED, { group: resultado });
                eventBus.emit('gestion-grupo-updated', { action: 'create', id: resultado.id });
            }
        }
        
        if (resultado) {
            formContainer.remove();
            
            // Mostrar notificación de éxito
            modalUtil.mostrarAlerta({
                title: 'Grupo Guardado',
                message: grupo ? 
                    'El grupo se ha actualizado correctamente.' : 
                    'El grupo se ha creado correctamente.',
                type: 'success'
            });
        } else {
            modalUtil.mostrarAlerta({
                title: 'Error',
                message: 'Hubo un problema al guardar el grupo. Por favor intenta de nuevo.',
                type: 'error'
            });
        }
    });
    
    // Enfocar el primer campo
    setTimeout(() => {
        document.getElementById('grupo-nombre')?.focus();
    }, 100);
}

/**
 * Devuelve la clase CSS para el estado del módulo
 */
function getEstadoClass(estado) {
    switch (estado) {
        case 'Activo':
            return 'badge-success';
        case 'Inactivo':
            return 'badge-warning';
        case 'En mantenimiento':
            return 'badge-info';
        default:
            return 'badge-gray';
    }
}

/**
 * Muestra un modal para asignar un grupo a un módulo
 */
function mostrarModalAsignarGrupo(moduloId) {
    const modulo = gestionModel.getModuloById(moduloId);
    const grupos = gestionModel.getGrupos();
    
    if (!modulo) {
        console.error('GestionView: No se encontró el módulo', moduloId);
        return;
    }
    
    // Eliminar modal anterior si existe
    document.getElementById('asignar-grupo-modal')?.remove();
    
    const modalContainer = document.createElement('div');
    modalContainer.id = 'asignar-grupo-modal';
    modalContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, rgba(125, 211, 252, 0.8), rgba(254, 243, 199, 0.8)), url('img/medical-background.png?v=1') center center / cover no-repeat;
        z-index: 1000;
        display: flex;
        justify-content: center;
        align-items: center;
        overflow-y: auto;
    `;
    
    // Encontrar el grupo actualmente asignado
    const grupoAsignado = modulo.grupoAsignadoId ? 
        grupos.find(g => g.id === modulo.grupoAsignadoId) : null;
    
    modalContainer.innerHTML = `
        <div class="modal-dialog" style="
            background: white;
            max-width: 500px;
            width: 90%;
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
                background: linear-gradient(135deg, #0ea5e9, #0284c7);
                color: white;
                border-radius: 12px 12px 0 0;
            ">
                <h3 style="margin: 0; font-weight: 600;">Asignar Grupo al Módulo "${modulo.nombre}"</h3>
                <button id="btnCerrarAsignacion" style="
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: white;
                ">×</button>
            </div>
            
            <div class="modal-body" style="padding: 20px;">
                <p style="margin-bottom: 20px; font-size: 1rem;">Selecciona el grupo que se encargará de este módulo:</p>
                
                <div class="form-group" style="margin-bottom: 20px;">
                    <label for="select-grupo-asignar" style="display: block; margin-bottom: 8px; font-weight: 500;">Grupo:</label>
                    <select id="select-grupo-asignar" style="
                        width: 100%;
                        padding: 10px 12px;
                        border: 1px solid #d1d5db;
                        border-radius: 8px;
                        background-color: #f9fafb;
                        font-size: 16px;
                    ">
                        <option value="">-- Seleccionar Grupo --</option>
                        ${grupos.map(grupo => `
                            <option value="${grupo.id}" ${modulo.grupoAsignadoId === grupo.id ? 'selected' : ''}>
                                ${grupo.nombre} (${grupo.turno}) - ${grupo.horario}
                            </option>
                        `).join('')}
                        <option value="null" ${!modulo.grupoAsignadoId ? 'selected' : ''}>
                            Quitar asignación actual
                        </option>
                    </select>
                </div>
                
                <div class="form-group" style="
                    margin-bottom: 20px; 
                    padding: 15px; 
                    background-color: #f0f9ff; 
                    border-radius: 8px; 
                    border-left: 4px solid #0ea5e9;
                ">
                    <p style="margin: 0;">
                        <strong>Grupo actual:</strong> 
                        ${grupoAsignado ? 
                            `${grupoAsignado.nombre} (${grupoAsignado.turno}) - ${grupoAsignado.horario}` : 
                            '<span style="color: #6b7280;">Sin asignación</span>'
                        }
                    </p>
                </div>
                
                <div class="form-buttons" style="
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    margin-top: 25px;
                ">
                    <button type="button" id="btnCancelarAsignacion" style="
                        background: linear-gradient(135deg, #7dd3fc, #fef3c7);
                        color: #1f2937;
                        border: none;
                        border-radius: 25px;
                        padding: 12px 24px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    ">Cancelar</button>
                    <button type="button" id="btnGuardarAsignacion" style="
                        background: linear-gradient(135deg, #0ea5e9, #0284c7);
                        color: white;
                        border: none;
                        border-radius: 25px;
                        padding: 12px 24px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    ">Guardar</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modalContainer);
    
    // Configurar eventos
    const cerrarBtn = document.getElementById('btnCerrarAsignacion');
    const cancelarBtn = document.getElementById('btnCancelarAsignacion');
    const guardarBtn = document.getElementById('btnGuardarAsignacion');
    
    // Eventos para cerrar/cancelar
    cerrarBtn.addEventListener('click', () => {
        modalContainer.remove();
    });
    
    cancelarBtn.addEventListener('click', () => {
        modalContainer.remove();
    });
    
    // Cerrar al hacer clic fuera del modal
    modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) {
            modalContainer.remove();
        }
    });
    
    // Evento para guardar
    guardarBtn.addEventListener('click', () => {
        const selectGrupo = document.getElementById('select-grupo-asignar');
        if (!selectGrupo) return;
        
        const grupoId = selectGrupo.value === 'null' ? null : selectGrupo.value;
        const grupoAnteriorId = modulo.grupoAsignadoId;
        
        // Actualizar el módulo con el nuevo grupo
        const resultado = gestionModel.asignarGrupoAModulo(moduloId, grupoId);
        
        if (resultado) {
            eventBus.emit(EVENT_NAMES.GROUP_ASSIGNED, { 
                module: resultado, 
                groupId: grupoId, 
                previousGroupId: grupoAnteriorId 
            });
            eventBus.emit('gestion-modulo-updated', { 
                action: 'assign-group', 
                id: moduloId 
            });
            
            modalContainer.remove();
            
            // Mostrar notificación de éxito
            modalUtil.mostrarAlerta({
                title: 'Grupo Asignado',
                message: grupoId ? 
                    'El grupo ha sido asignado correctamente al módulo.' : 
                    'Se ha quitado la asignación de grupo del módulo.',
                type: 'success'
            });
            
            // Actualizar la vista
            renderGestionModulos(modulosContainer);
        } else {
            modalUtil.mostrarAlerta({
                title: 'Error',
                message: 'Hubo un problema al asignar el grupo. Por favor intenta de nuevo.',
                type: 'error'
            });
        }
    });
}