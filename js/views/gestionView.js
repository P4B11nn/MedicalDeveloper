// js/views/gestionView.js
import { gestionModel } from '../models/gestionModel.js';
import { authModel } from '../models/storageModel.js'; // Para obtener usuarios
import eventBus, { EVENT_NAMES } from '../utils/eventBus.js';
import * as modalUtil from '../utils/modalUtil.js'; // Importamos modalUtil estáticamente

// Variables globales para mantener referencias a los contenedores
let modulosContainer = null;
let gruposContainer = null;

// Datos de ejemplo para inicializar el sistema si no existen datos
const datosIniciales = {
    modulos: [
        { 
            nombre: "Módulo Principal", 
            ubicacion: "latitud: 21.1619, longitud: -86.8515, Facultad de Medicina - Entrada Principal", 
            latitud: "21.1619",
            longitud: "-86.8515",
            lugar: "Facultad de Medicina - Entrada Principal",
            estado: "Activo",
            horaInicio: "08:00",
            horaFin: "17:00",
            diasAtencion: ["lunes", "martes", "miercoles", "jueves", "viernes"]
        },
        { 
            nombre: "Módulo Pediatría", 
            ubicacion: "latitud: 21.1620, longitud: -86.8516, Hospital Infantil", 
            latitud: "21.1620",
            longitud: "-86.8516",
            lugar: "Hospital Infantil",
            estado: "Activo",
            horaInicio: "09:00",
            horaFin: "15:00",
            diasAtencion: ["lunes", "miercoles", "viernes"]
        },
        { 
            nombre: "Módulo Urgencias", 
            ubicacion: "latitud: 21.1621, longitud: -86.8517, Centro de Emergencias", 
            latitud: "21.1621",
            longitud: "-86.8517",
            lugar: "Centro de Emergencias",
            estado: "Activo",
            horaInicio: "00:00",
            horaFin: "23:59",
            diasAtencion: ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado"]
        },
        { 
            nombre: "Módulo Especialidades", 
            ubicacion: "latitud: 21.1622, longitud: -86.8518, Clínica de Especialidades", 
            latitud: "21.1622",
            longitud: "-86.8518",
            lugar: "Clínica de Especialidades",
            estado: "Inactivo",
            horaInicio: "10:00",
            horaFin: "16:00",
            diasAtencion: ["martes", "jueves"]
        }
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
                    <th>Horario de Atención</th>
                    <th>Días de Atención</th>
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
                            <td>${formatearUbicacion(modulo)}</td>
                            <td>${formatearHorarioAtencion(modulo.horaInicio, modulo.horaFin)}</td>
                            <td>${formatearDiasAtencion(modulo.diasAtencion)}</td>
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
            
            if (target.classList.contains('assign-practicantes')) {
                const grupoId = target.dataset.grupoId;
                console.log('GestionView: Solicitando asignación de practicantes al grupo', grupoId);
                mostrarModalAsignarPracticantes(grupoId);
            }
            else if (target.classList.contains('edit-grupo')) {
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
    // Verificar si el usuario actual es admin
    const currentUser = authModel.getCurrentUser();
    const isAdmin = currentUser && currentUser.rol === 'admin';

    // Obtener todos los usuarios para contar miembros reales
    const todosLosUsuarios = authModel.getAllUsers();

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
                ${grupos.map(grupo => {
                    // Contar miembros reales del grupo
                    const miembrosReales = todosLosUsuarios.filter(u => 
                        u.rol === 'practicante' && 
                        u.activo !== false && 
                        u.grupoId === grupo.id
                    ).length;

                    return `
                        <tr>
                            <td>${grupo.id}</td>
                            <td>${grupo.nombre}</td>
                            <td>${grupo.turno}</td>
                            <td>${grupo.horario}</td>
                            <td>${miembrosReales} miembro(s)</td>
                            <td class="actions">
                                ${isAdmin ? `
                                    <button class="btn-icon assign-practicantes" title="Asignar practicantes" data-grupo-id="${grupo.id}">
                                        <i class="fas fa-user-plus"></i>
                                    </button>
                                ` : ''}
                                <button class="btn-icon edit-grupo" title="Editar" data-id="${grupo.id}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-icon delete-grupo" title="Eliminar" data-id="${grupo.id}">
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
                        <label style="display: block; margin-bottom: 8px; font-weight: 500;">Ubicación:</label>
                        
                        <!-- Campo para coordenadas -->
                        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                            <div style="flex: 1;">
                                <label for="modulo-latitud" style="display: block; margin-bottom: 4px; font-size: 0.9rem; color: #6b7280;">Latitud:</label>
                                <input type="number" id="modulo-latitud" step="any" placeholder="23.93292" value="${modulo?.latitud || ''}" style="
                                    width: 100%;
                                    padding: 8px 10px;
                                    border: 1px solid #d1d5db;
                                    border-radius: 6px;
                                    background-color: #f9fafb;
                                    font-size: 14px;
                                    box-sizing: border-box;
                                ">
                            </div>
                            <div style="flex: 1;">
                                <label for="modulo-longitud" style="display: block; margin-bottom: 4px; font-size: 0.9rem; color: #6b7280;">Longitud:</label>
                                <input type="number" id="modulo-longitud" step="any" placeholder="-90.9392" value="${modulo?.longitud || ''}" style="
                                    width: 100%;
                                    padding: 8px 10px;
                                    border: 1px solid #d1d5db;
                                    border-radius: 6px;
                                    background-color: #f9fafb;
                                    font-size: 14px;
                                    box-sizing: border-box;
                                ">
                            </div>
                        </div>
                        
                        <!-- Campo para nombre del lugar -->
                        <div>
                            <label for="modulo-lugar" style="display: block; margin-bottom: 4px; font-size: 0.9rem; color: #6b7280;">Nombre del lugar:</label>
                            <input type="text" id="modulo-lugar" required placeholder="Facultad de Medicina" value="${modulo?.lugar || modulo?.ubicacion || ''}" style="
                                width: 100%;
                                padding: 10px 12px;
                                border: 1px solid #d1d5db;
                                border-radius: 8px;
                                background-color: #f9fafb;
                                font-size: 16px;
                                box-sizing: border-box;
                            ">
                        </div>
                        
                        <!-- Información de ayuda -->
                        <div style="margin-top: 8px; padding: 8px; background: #f0f9ff; border-radius: 6px; border-left: 3px solid #3b82f6;">
                            <small style="color: #1e40af; font-size: 0.85rem;">
                                <i class="fas fa-info-circle" style="margin-right: 4px;"></i>
                                Las coordenadas son opcionales. Ejemplo: Lat: 23.93292, Lng: -90.9392
                            </small>
                        </div>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 500;">Horario de Atención:</label>
                        <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 12px; align-items: center;">
                            <div>
                                <label for="modulo-hora-inicio" style="display: block; margin-bottom: 4px; font-size: 0.9rem; color: #6b7280;">Hora de inicio:</label>
                                <input type="time" id="modulo-hora-inicio" value="${modulo?.horaInicio || '08:00'}" style="
                                    width: 100%;
                                    padding: 10px 12px;
                                    border: 1px solid #d1d5db;
                                    border-radius: 8px;
                                    background-color: #f9fafb;
                                    font-size: 16px;
                                    box-sizing: border-box;
                                ">
                            </div>
                            <span style="color: #6b7280; font-weight: 500; padding: 0 8px;">a</span>
                            <div>
                                <label for="modulo-hora-fin" style="display: block; margin-bottom: 4px; font-size: 0.9rem; color: #6b7280;">Hora de fin:</label>
                                <input type="time" id="modulo-hora-fin" value="${modulo?.horaFin || '17:00'}" style="
                                    width: 100%;
                                    padding: 10px 12px;
                                    border: 1px solid #d1d5db;
                                    border-radius: 8px;
                                    background-color: #f9fafb;
                                    font-size: 16px;
                                    box-sizing: border-box;
                                ">
                            </div>
                        </div>
                        <div style="margin-top: 4px;">
                            <small style="color: #6b7280; font-size: 0.85rem;">
                                <i class="fas fa-clock" style="margin-right: 4px;"></i>
                                Define el horario de atención del módulo (hora de inicio y fin)
                            </small>
                        </div>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 12px; font-weight: 500;">Días de Atención:</label>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                            <label style="display: flex; align-items: center; padding: 8px; background: #f9fafb; border-radius: 6px; cursor: pointer;">
                                <input type="checkbox" name="dias-atencion" value="lunes" id="dia-lunes" ${modulo?.diasAtencion?.includes('lunes') ? 'checked' : ''} style="margin-right: 8px;">
                                <span>Lunes</span>
                            </label>
                            <label style="display: flex; align-items: center; padding: 8px; background: #f9fafb; border-radius: 6px; cursor: pointer;">
                                <input type="checkbox" name="dias-atencion" value="martes" id="dia-martes" ${modulo?.diasAtencion?.includes('martes') ? 'checked' : ''} style="margin-right: 8px;">
                                <span>Martes</span>
                            </label>
                            <label style="display: flex; align-items: center; padding: 8px; background: #f9fafb; border-radius: 6px; cursor: pointer;">
                                <input type="checkbox" name="dias-atencion" value="miercoles" id="dia-miercoles" ${modulo?.diasAtencion?.includes('miercoles') ? 'checked' : ''} style="margin-right: 8px;">
                                <span>Miércoles</span>
                            </label>
                            <label style="display: flex; align-items: center; padding: 8px; background: #f9fafb; border-radius: 6px; cursor: pointer;">
                                <input type="checkbox" name="dias-atencion" value="jueves" id="dia-jueves" ${modulo?.diasAtencion?.includes('jueves') ? 'checked' : ''} style="margin-right: 8px;">
                                <span>Jueves</span>
                            </label>
                            <label style="display: flex; align-items: center; padding: 8px; background: #f9fafb; border-radius: 6px; cursor: pointer;">
                                <input type="checkbox" name="dias-atencion" value="viernes" id="dia-viernes" ${modulo?.diasAtencion?.includes('viernes') ? 'checked' : ''} style="margin-right: 8px;">
                                <span>Viernes</span>
                            </label>
                            <label style="display: flex; align-items: center; padding: 8px; background: #f9fafb; border-radius: 6px; cursor: pointer;">
                                <input type="checkbox" name="dias-atencion" value="sabado" id="dia-sabado" ${modulo?.diasAtencion?.includes('sabado') ? 'checked' : ''} style="margin-right: 8px;">
                                <span>Sábado</span>
                            </label>
                        </div>
                        <div style="margin-top: 4px;">
                            <small style="color: #6b7280; font-size: 0.85rem;">
                                <i class="fas fa-calendar-alt" style="margin-right: 4px;"></i>
                                Selecciona los días de la semana en que el módulo dará atención
                            </small>
                        </div>
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
        const latitud = formModulo.querySelector('#modulo-latitud').value.trim();
        const longitud = formModulo.querySelector('#modulo-longitud').value.trim();
        const lugar = formModulo.querySelector('#modulo-lugar').value.trim();
        const estado = formModulo.querySelector('#modulo-estado').value;
        const horaInicio = formModulo.querySelector('#modulo-hora-inicio').value;
        const horaFin = formModulo.querySelector('#modulo-hora-fin').value;
        
        // Capturar días de atención seleccionados
        const diasCheckboxes = formModulo.querySelectorAll('input[name="dias-atencion"]:checked');
        const diasAtencion = Array.from(diasCheckboxes).map(checkbox => checkbox.value);
        
        // Validar datos
        if (!nombre || !lugar) {
            modalUtil.mostrarAlerta({
                title: 'Campos incompletos',
                message: 'Nombre y lugar son campos obligatorios',
                type: 'warning'
            });
            return;
        }
        
        // Validar coordenadas si se proporcionan
        if ((latitud && !longitud) || (!latitud && longitud)) {
            modalUtil.mostrarAlerta({
                title: 'Coordenadas incompletas',
                message: 'Si proporciona coordenadas, debe incluir tanto latitud como longitud',
                type: 'warning'
            });
            return;
        }
        
        // Construir la ubicación completa
        let ubicacionCompleta = lugar;
        if (latitud && longitud) {
            ubicacionCompleta = `latitud: ${latitud}, longitud: ${longitud}, ${lugar}`;
        }
        
        // Datos a guardar
        const moduloData = {
            nombre,
            ubicacion: ubicacionCompleta,
            latitud: latitud || null,
            longitud: longitud || null,
            lugar: lugar,
            estado,
            horaInicio: horaInicio || null,
            horaFin: horaFin || null,
            diasAtencion: diasAtencion
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
 * Formatea la ubicación de un módulo para mostrar coordenadas y lugar de forma elegante
 * @param {Object} modulo - El objeto módulo con datos de ubicación
 * @returns {string} Ubicación formateada para mostrar
 */
function formatearUbicacion(modulo) {
    if (modulo.latitud && modulo.longitud && modulo.lugar) {
        return `${modulo.lugar} (${modulo.latitud}, ${modulo.longitud})`;
    } else if (modulo.lugar) {
        return modulo.lugar;
    } else {
        return modulo.ubicacion || 'Sin ubicación';
    }
}

/**
 * Formatea el horario de atención para mostrar en la tabla
 * @param {string} horaInicio - Hora de inicio en formato HH:MM
 * @param {string} horaFin - Hora de fin en formato HH:MM
 * @returns {string} Horario formateado para mostrar
 */
function formatearHorarioAtencion(horaInicio, horaFin) {
    if (!horaInicio || !horaFin) {
        return '<span style="color: #9ca3af;">No definido</span>';
    }
    
    try {
        return `<span style="color: #059669; font-weight: 500;">${horaInicio} - ${horaFin}</span>`;
    } catch (error) {
        return '<span style="color: #dc2626;">Formato inválido</span>';
    }
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
        background: rgba(0, 0, 0, 0.5);
        z-index: 1000;
        display: flex;
        justify-content: center;
        align-items: center;
        overflow-y: auto;
        backdrop-filter: blur(5px);
    `;
    
    // Encontrar el grupo actualmente asignado
    const grupoAsignado = modulo.grupoAsignadoId ? 
        grupos.find(g => g.id === modulo.grupoAsignadoId) : null;
    
    modalContainer.innerHTML = `
        <div class="modal-dialog" style="
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            max-width: 550px;
            width: 90%;
            margin: 40px auto;
            border-radius: 16px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            position: relative;
            border: 1px solid rgba(255, 255, 255, 0.18);
            overflow: hidden;
            animation: modalFadeIn 0.3s ease-out;
        ">
            <style>
                @keyframes modalFadeIn {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                #select-grupo-asignar:focus {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
                    outline: none;
                }
                
                .btn-asignacion-cancel:hover {
                    background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
                    transform: translateY(-2px);
                }
                
                .btn-asignacion-save:hover {
                    background: linear-gradient(135deg, #2563eb, #1d4ed8);
                    transform: translateY(-2px);
                }
            </style>
            
            <div class="modal-header" style="
                padding: 20px 25px;
                border-bottom: 2px solid rgba(203, 213, 225, 0.5);
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: linear-gradient(135deg, #1e40af, #3b82f6);
                color: white;
            ">
                <h3 style="
                    margin: 0; 
                    font-weight: 600;
                    font-size: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                ">
                    <i class="fas fa-link" style="color: #93c5fd;"></i>
                    Asignar Grupo al Módulo
                </h3>
                <button id="btnCerrarAsignacion" style="
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    border-radius: 50%;
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    cursor: pointer;
                    color: white;
                    transition: all 0.2s ease;
                " onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'">×</button>
            </div>
            
            <div class="modal-body" style="padding: 25px 30px;">
                <div style="
                    margin-bottom: 25px;
                    background: linear-gradient(135deg, #dbeafe, #eff6ff);
                    border-radius: 12px;
                    padding: 15px;
                    border-left: 4px solid #3b82f6;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                ">
                    <div style="
                        background: rgba(59, 130, 246, 0.1);
                        width: 50px;
                        height: 50px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">
                        <i class="fas fa-hospital" style="font-size: 20px; color: #3b82f6;"></i>
                    </div>
                    <div>
                        <h4 style="
                            margin: 0 0 5px 0;
                            color: #1e40af;
                            font-size: 1.2rem;
                        ">${modulo.nombre}</h4>
                        <p style="
                            margin: 0;
                            color: #334155;
                            font-size: 0.95rem;
                        ">${formatearUbicacion(modulo)}</p>
                    </div>
                </div>
                
                <p style="
                    margin-bottom: 15px;
                    font-size: 1.05rem;
                    color: #334155;
                    font-weight: 500;
                ">Selecciona el grupo que se encargará de este módulo:</p>
                
                <div class="form-group" style="margin-bottom: 25px;">
                    <label for="select-grupo-asignar" style="
                        display: block; 
                        margin-bottom: 10px; 
                        font-weight: 500;
                        color: #334155;
                    ">Grupo:</label>
                    <select id="select-grupo-asignar" style="
                        width: 100%;
                        padding: 12px 15px;
                        border: 1px solid #cbd5e1;
                        border-radius: 10px;
                        background-color: white;
                        font-size: 16px;
                        transition: all 0.2s ease;
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
                    margin-bottom: 25px; 
                    padding: 16px 20px; 
                    background-color: ${grupoAsignado ? '#f0f9ff' : '#f1f5f9'}; 
                    border-radius: 10px; 
                    border-left: 4px solid ${grupoAsignado ? '#60a5fa' : '#94a3b8'};
                ">
                    <h5 style="
                        margin: 0 0 10px 0;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        color: ${grupoAsignado ? '#1e40af' : '#475569'};
                    ">
                        <i class="fas ${grupoAsignado ? 'fa-users' : 'fa-user-slash'}"></i>
                        Asignación actual
                    </h5>
                    <p style="margin: 0; font-size: 0.95rem; color: #334155;">
                        ${grupoAsignado ? `
                            <span style="font-weight: 500;">${grupoAsignado.nombre}</span><br>
                            <span style="color: #475569; font-size: 0.9rem;">
                                <i class="fas fa-clock" style="margin-right: 5px;"></i> ${grupoAsignado.turno} - ${grupoAsignado.horario}
                            </span>
                        ` : 
                        '<span style="color: #64748b;">Este módulo no tiene grupo asignado actualmente</span>'
                        }
                    </p>
                </div>
                
                <div class="form-buttons" style="
                    display: flex;
                    justify-content: flex-end;
                    gap: 15px;
                    margin-top: 30px;
                ">
                    <button type="button" id="btnCancelarAsignacion" class="btn-asignacion-cancel" style="
                        background: linear-gradient(135deg, #f8fafc, #f1f5f9);
                        color: #475569;
                        border: 1px solid #cbd5e1;
                        border-radius: 10px;
                        padding: 12px 24px;
                        font-size: 16px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    ">Cancelar</button>
                    <button type="button" id="btnGuardarAsignacion" class="btn-asignacion-save" style="
                        background: linear-gradient(135deg, #3b82f6, #2563eb);
                        color: white;
                        border: none;
                        border-radius: 10px;
                        padding: 12px 24px;
                        font-size: 16px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);
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

/**
 * Muestra un modal para asignar practicantes a un grupo
 */
function mostrarModalAsignarPracticantes(grupoId) {
    // Verificar que el usuario actual sea admin
    const currentUser = authModel.getCurrentUser();
    if (!currentUser || currentUser.rol !== 'admin') {
        modalUtil.mostrarAlerta({
            title: 'Acceso Denegado',
            message: 'Solo los administradores pueden asignar practicantes a grupos.',
            type: 'warning'
        });
        return;
    }

    const grupo = gestionModel.getGrupoById(grupoId);
    if (!grupo) {
        console.error('GestionView: No se encontró el grupo', grupoId);
        return;
    }

    // Obtener todos los usuarios
    const todosLosUsuarios = authModel.getAllUsers();
    
    // Filtrar solo practicantes sin grupo asignado (excluyendo los ya asignados a este grupo)
    const practicantesSinGrupo = todosLosUsuarios.filter(usuario => 
        usuario.rol === 'practicante' && 
        usuario.activo !== false &&
        (!usuario.grupoId || usuario.grupoId === '')
    );

    // Obtener practicantes actualmente asignados a este grupo
    const practicantesAsignados = todosLosUsuarios.filter(usuario =>
        usuario.rol === 'practicante' &&
        usuario.activo !== false &&
        usuario.grupoId === grupoId
    );

    // Eliminar modal anterior si existe
    document.getElementById('asignar-practicantes-modal')?.remove();

    const modalContainer = document.createElement('div');
    modalContainer.id = 'asignar-practicantes-modal';
    modalContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 1000;
        display: flex;
        justify-content: center;
        align-items: center;
        overflow-y: auto;
        backdrop-filter: blur(5px);
    `;

    modalContainer.innerHTML = `
        <div class="modal-dialog" style="
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            max-width: 700px;
            width: 90%;
            margin: 40px auto;
            border-radius: 16px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            position: relative;
            border: 1px solid rgba(255, 255, 255, 0.18);
            overflow: hidden;
            animation: modalFadeIn 0.3s ease-out;
            max-height: 90vh;
        ">
            <style>
                @keyframes modalFadeIn {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                .practicante-checkbox {
                    margin-right: 10px;
                    transform: scale(1.2);
                }
                
                .practicante-item {
                    padding: 12px;
                    border-radius: 8px;
                    margin-bottom: 8px;
                    background: rgba(255, 255, 255, 0.7);
                    border: 1px solid rgba(203, 213, 225, 0.5);
                    transition: all 0.2s ease;
                    cursor: pointer;
                }
                
                .practicante-item:hover {
                    background: rgba(255, 255, 255, 0.9);
                    border-color: #3b82f6;
                }
                
                .practicante-asignado {
                    background: rgba(34, 197, 94, 0.1);
                    border-color: rgba(34, 197, 94, 0.3);
                }
            </style>
            
            <div class="modal-header" style="
                padding: 20px 25px;
                border-bottom: 2px solid rgba(203, 213, 225, 0.5);
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: linear-gradient(135deg, #1e40af, #3b82f6);
                color: white;
            ">
                <h3 style="
                    margin: 0; 
                    font-weight: 600;
                    font-size: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                ">
                    <i class="fas fa-user-plus" style="color: #93c5fd;"></i>
                    Asignar Practicantes
                </h3>
                <button id="btnCerrarAsignacionPracticantes" style="
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    border-radius: 50%;
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    cursor: pointer;
                    color: white;
                    transition: all 0.2s ease;
                " onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'">×</button>
            </div>
            
            <div class="modal-body" style="padding: 25px 30px; max-height: 60vh; overflow-y: auto;">
                <div style="
                    margin-bottom: 25px;
                    background: linear-gradient(135deg, #dbeafe, #eff6ff);
                    border-radius: 12px;
                    padding: 15px;
                    border-left: 4px solid #3b82f6;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                ">
                    <div style="
                        background: rgba(59, 130, 246, 0.1);
                        width: 50px;
                        height: 50px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">
                        <i class="fas fa-users" style="font-size: 20px; color: #3b82f6;"></i>
                    </div>
                    <div>
                        <h4 style="
                            margin: 0 0 5px 0;
                            color: #1e40af;
                            font-size: 1.2rem;
                        ">${grupo.nombre}</h4>
                        <p style="
                            margin: 0;
                            color: #334155;
                            font-size: 0.95rem;
                        ">${grupo.turno} - ${grupo.horario}</p>
                    </div>
                </div>

                ${practicantesAsignados.length > 0 ? `
                    <div style="margin-bottom: 25px;">
                        <h5 style="
                            margin: 0 0 15px 0;
                            color: #059669;
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        ">
                            <i class="fas fa-check-circle"></i>
                            Practicantes actualmente asignados (${practicantesAsignados.length})
                        </h5>
                        <div style="max-height: 150px; overflow-y: auto;">
                            ${practicantesAsignados.map(practicante => `
                                <div class="practicante-item practicante-asignado" style="
                                    display: flex;
                                    align-items: center;
                                    justify-content: space-between;
                                ">
                                    <div>
                                        <strong>${practicante.nombre} ${practicante.apellidos || ''}</strong><br>
                                        <small style="color: #6b7280;">Matrícula: ${practicante.matricula}</small>
                                    </div>
                                    <button class="btn-remove-practicante" data-usuario-id="${practicante.id}" style="
                                        background: #ef4444;
                                        color: white;
                                        border: none;
                                        border-radius: 6px;
                                        padding: 6px 12px;
                                        font-size: 0.8rem;
                                        cursor: pointer;
                                    ">
                                        <i class="fas fa-times"></i> Quitar
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div>
                    <h5 style="
                        margin: 0 0 15px 0;
                        color: #334155;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    ">
                        <i class="fas fa-user-plus"></i>
                        Practicantes disponibles para asignar (${practicantesSinGrupo.length})
                    </h5>
                    
                    ${practicantesSinGrupo.length === 0 ? `
                        <div style="
                            text-align: center;
                            padding: 30px;
                            background: rgba(249, 250, 251, 0.8);
                            border-radius: 8px;
                            color: #6b7280;
                        ">
                            <i class="fas fa-user-slash" style="font-size: 2rem; margin-bottom: 10px; opacity: 0.5;"></i>
                            <p style="margin: 0;">No hay practicantes disponibles para asignar.</p>
                            <small>Todos los practicantes ya están asignados a otros grupos.</small>
                        </div>
                    ` : `
                        <div id="practicantes-disponibles" style="max-height: 200px; overflow-y: auto;">
                            ${practicantesSinGrupo.map(practicante => `
                                <div class="practicante-item" data-practicante-id="${practicante.id}">
                                    <label style="
                                        display: flex;
                                        align-items: center;
                                        cursor: pointer;
                                        width: 100%;
                                    ">
                                        <input type="checkbox" 
                                               class="practicante-checkbox" 
                                               id="practicante-${practicante.id}" 
                                               value="${practicante.id}">
                                        <div style="flex: 1;">
                                            <strong>${practicante.nombre} ${practicante.apellidos || ''}</strong><br>
                                            <small style="color: #6b7280;">
                                                Matrícula: ${practicante.matricula}
                                                ${practicante.edad ? ` • Edad: ${practicante.edad}` : ''}
                                                ${practicante.sexo ? ` • ${practicante.sexo === 'M' ? 'Masculino' : 'Femenino'}` : ''}
                                            </small>
                                        </div>
                                    </label>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
                
                <div class="form-buttons" style="
                    display: flex;
                    justify-content: flex-end;
                    gap: 15px;
                    margin-top: 30px;
                    border-top: 1px solid rgba(203, 213, 225, 0.5);
                    padding-top: 20px;
                ">
                    <button type="button" id="btnCancelarAsignacionPracticantes" style="
                        background: linear-gradient(135deg, #f8fafc, #f1f5f9);
                        color: #475569;
                        border: 1px solid #cbd5e1;
                        border-radius: 10px;
                        padding: 12px 24px;
                        font-size: 16px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    ">Cancelar</button>
                    <button type="button" id="btnGuardarAsignacionPracticantes" style="
                        background: linear-gradient(135deg, #3b82f6, #2563eb);
                        color: white;
                        border: none;
                        border-radius: 10px;
                        padding: 12px 24px;
                        font-size: 16px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2);
                    ">Asignar Seleccionados</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modalContainer);

    // Configurar eventos
    const cerrarBtn = document.getElementById('btnCerrarAsignacionPracticantes');
    const cancelarBtn = document.getElementById('btnCancelarAsignacionPracticantes');
    const guardarBtn = document.getElementById('btnGuardarAsignacionPracticantes');

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

    // Evento para toggle de practicantes (click en el item)
    modalContainer.addEventListener('click', (e) => {
        const practicanteItem = e.target.closest('.practicante-item[data-practicante-id]');
        if (practicanteItem && !e.target.closest('.btn-remove-practicante')) {
            const practicanteId = practicanteItem.dataset.practicanteId;
            const checkbox = practicanteItem.querySelector('.practicante-checkbox');
            if (checkbox && !e.target.matches('input[type="checkbox"]')) {
                checkbox.checked = !checkbox.checked;
            }
        }
    });

    // Eventos para quitar practicantes asignados
    modalContainer.addEventListener('click', (e) => {
        if (e.target.closest('.btn-remove-practicante')) {
            const usuarioId = e.target.closest('.btn-remove-practicante').dataset.usuarioId;
            const usuario = todosLosUsuarios.find(u => u.id === usuarioId);
            
            modalUtil.confirmarAccion({
                title: 'Quitar Practicante',
                message: `¿Estás seguro de quitar a ${usuario.nombre} ${usuario.apellidos || ''} del grupo "${grupo.nombre}"?`,
                onConfirm: () => {
                    // Quitar del grupo en el modelo de gestión
                    gestionModel.quitarUsuarioDeGrupo(grupoId, usuarioId);
                    
                    // Actualizar el usuario quitando su grupoId
                    const usuarios = authModel.getAllUsers();
                    const userIndex = usuarios.findIndex(u => u.id === usuarioId);
                    if (userIndex !== -1) {
                        const updatedUser = { ...usuarios[userIndex], grupoId: null };
                        authModel.updateUser(userIndex, updatedUser);
                        
                        // Emitir evento de usuario actualizado
                        eventBus.emit(EVENT_NAMES.USER_UPDATED, {
                            user: updatedUser,
                            previousGroup: grupoId,
                            action: 'removed_from_group'
                        });
                    }
                    
                    modalContainer.remove();
                    
                    // Mostrar notificación de éxito
                    modalUtil.mostrarAlerta({
                        title: 'Practicante Removido',
                        message: `${usuario.nombre} ha sido removido del grupo correctamente.`,
                        type: 'success'
                    });
                    
                    // Actualizar vista
                    renderGestionGrupos(gruposContainer);
                }
            });
        }
    });

    // Evento para guardar asignaciones
    guardarBtn.addEventListener('click', () => {
        const checkboxes = modalContainer.querySelectorAll('.practicante-checkbox:checked');
        const practicantesSeleccionados = Array.from(checkboxes).map(cb => cb.value);

        if (practicantesSeleccionados.length === 0) {
            modalUtil.mostrarAlerta({
                title: 'Ningún practicante seleccionado',
                message: 'Por favor selecciona al menos un practicante para asignar al grupo.',
                type: 'warning'
            });
            return;
        }

        // Asignar cada practicante seleccionado al grupo
        const asignacionesExitosas = [];
        const asignacionesFallidas = [];

        practicantesSeleccionados.forEach(usuarioId => {
            // Asignar en el modelo de gestión
            const resultadoGestion = gestionModel.asignarUsuarioAGrupo(grupoId, usuarioId);
            
            if (resultadoGestion) {
                // Actualizar el usuario con el nuevo grupoId
                const usuarios = authModel.getAllUsers();
                const userIndex = usuarios.findIndex(u => u.id === usuarioId);
                
                if (userIndex !== -1) {
                    const updatedUser = { ...usuarios[userIndex], grupoId: grupoId };
                    const updateResult = authModel.updateUser(userIndex, updatedUser);
                    
                    if (updateResult) {
                        asignacionesExitosas.push(usuarios[userIndex]);
                        
                        // Emitir evento de usuario actualizado
                        eventBus.emit(EVENT_NAMES.USER_UPDATED, {
                            user: updatedUser,
                            newGroup: grupoId,
                            action: 'assigned_to_group'
                        });
                    } else {
                        asignacionesFallidas.push(usuarios[userIndex]);
                    }
                }
            } else {
                asignacionesFallidas.push({ id: usuarioId });
            }
        });

        // Mostrar resultado
        if (asignacionesExitosas.length > 0) {
            const nombresAsignados = asignacionesExitosas.map(u => u.nombre).join(', ');
            modalUtil.mostrarAlerta({
                title: 'Asignación Exitosa',
                message: `Se han asignado ${asignacionesExitosas.length} practicante(s) al grupo "${grupo.nombre}": ${nombresAsignados}`,
                type: 'success'
            });
        }

        if (asignacionesFallidas.length > 0) {
            modalUtil.mostrarAlerta({
                title: 'Error en Asignación',
                message: `No se pudieron asignar ${asignacionesFallidas.length} practicante(s) al grupo.`,
                type: 'error'
            });
        }

        modalContainer.remove();
        
        // Actualizar vista
        renderGestionGrupos(gruposContainer);
    });
}

/**
 * Formatea los días de atención para mostrar en la tabla
 * @param {Array} diasAtencion - Array de días de atención
 * @return {string} Texto formateado de los días
 */
function formatearDiasAtencion(diasAtencion) {
    if (!diasAtencion || diasAtencion.length === 0) {
        return '<span style="color: #9ca3af;">No definido</span>';
    }
    
    // Mapear nombres completos a abreviaturas
    const abreviaturas = {
        'lunes': 'L',
        'martes': 'M',
        'miercoles': 'X',
        'jueves': 'J',
        'viernes': 'V',
        'sabado': 'S'
    };
    
    const diasAbrev = diasAtencion
        .map(dia => abreviaturas[dia] || dia)
        .join(', ');
    
    return `<span style="color: #059669; font-weight: 500;">${diasAbrev}</span>`;
}