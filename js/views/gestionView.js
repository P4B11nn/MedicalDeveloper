// js/views/gestionView.js
import { gestionModel } from '../models/gestionModel.js';
import eventBus from '../utils/eventBus.js';

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
 * Renderiza el formulario de módulo
 */
export function renderFormModulo(modulo = null) {
    // Eliminar formulario anterior si existe
    document.getElementById('modulo-form-container')?.remove();
    
    const formContainer = document.createElement('div');
    formContainer.id = 'modulo-form-container';
    formContainer.style.position = 'fixed';
    formContainer.style.top = '0';
    formContainer.style.left = '0';
    formContainer.style.width = '100%';
    formContainer.style.height = '100%';
    formContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    formContainer.style.display = 'flex';
    formContainer.style.justifyContent = 'center';
    formContainer.style.alignItems = 'center';
    formContainer.style.zIndex = '1000';
    
    const formContent = document.createElement('div');
    formContent.style.backgroundColor = '#fff';
    formContent.style.padding = '20px';
    formContent.style.borderRadius = '8px';
    formContent.style.width = '500px';
    formContent.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
    
    formContent.innerHTML = `
        <h3>${modulo ? 'Editar Módulo' : 'Nuevo Módulo'}</h3>
        <form id="form-modulo">
            <div class="form-group">
                <label for="modulo-nombre">Nombre:</label>
                <input type="text" id="modulo-nombre" required value="${modulo?.nombre || ''}">
            </div>
            <div class="form-group">
                <label for="modulo-ubicacion">Ubicación:</label>
                <input type="text" id="modulo-ubicacion" required value="${modulo?.ubicacion || ''}">
            </div>
            <div class="form-group">
                <label for="modulo-estado">Estado:</label>
                <select id="modulo-estado">
                    <option value="Activo" ${modulo?.estado === 'Activo' ? 'selected' : ''}>Activo</option>
                    <option value="Inactivo" ${modulo?.estado === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
                    <option value="En mantenimiento" ${modulo?.estado === 'En mantenimiento' ? 'selected' : ''}>En mantenimiento</option>
                </select>
            </div>
            <div class="form-buttons">
                <button type="button" id="btnCancelarModulo" class="btn-secondary">Cancelar</button>
                <button type="button" id="btnGuardarModulo" class="btn-primary">Guardar</button>
            </div>
        </form>
    `;
    
    formContainer.appendChild(formContent);
    document.body.appendChild(formContainer);
    
    // Añadir estilos para el formulario
    const style = document.createElement('style');
    if (!document.head.querySelector('#form-styles')) {
        style.id = 'form-styles';
        style.innerHTML = `
            .form-group {
                margin-bottom: 15px;
            }
            .form-group label {
                display: block;
                margin-bottom: 5px;
                font-weight: 500;
            }
            .form-group input, .form-group select {
                width: 100%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                box-sizing: border-box;
            }
            .form-buttons {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 20px;
            }
            .btn-secondary {
                background-color: #e2e8f0;
                border: none;
                border-radius: 8px;
                padding: 10px 20px;
                color: #1f2937;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            .btn-secondary:hover {
                background-color: #cbd5e1;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Enfocar el primer campo
    setTimeout(() => {
        document.getElementById('modulo-nombre')?.focus();
    }, 100);
}

/**
 * Renderiza el formulario de grupo
 */
export function renderFormGrupo(grupo = null) {
    // Eliminar formulario anterior si existe
    document.getElementById('grupo-form-container')?.remove();
    
    const formContainer = document.createElement('div');
    formContainer.id = 'grupo-form-container';
    formContainer.style.position = 'fixed';
    formContainer.style.top = '0';
    formContainer.style.left = '0';
    formContainer.style.width = '100%';
    formContainer.style.height = '100%';
    formContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    formContainer.style.display = 'flex';
    formContainer.style.justifyContent = 'center';
    formContainer.style.alignItems = 'center';
    formContainer.style.zIndex = '1000';
    
    const formContent = document.createElement('div');
    formContent.style.backgroundColor = '#fff';
    formContent.style.padding = '20px';
    formContent.style.borderRadius = '8px';
    formContent.style.width = '500px';
    formContent.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
    
    formContent.innerHTML = `
        <h3>${grupo ? 'Editar Grupo' : 'Nuevo Grupo'}</h3>
        <form id="form-grupo">
            <div class="form-group">
                <label for="grupo-nombre">Nombre:</label>
                <input type="text" id="grupo-nombre" required value="${grupo?.nombre || ''}">
            </div>
            <div class="form-group">
                <label for="grupo-turno">Turno:</label>
                <select id="grupo-turno">
                    <option value="Matutino" ${grupo?.turno === 'Matutino' ? 'selected' : ''}>Matutino</option>
                    <option value="Vespertino" ${grupo?.turno === 'Vespertino' ? 'selected' : ''}>Vespertino</option>
                    <option value="Nocturno" ${grupo?.turno === 'Nocturno' ? 'selected' : ''}>Nocturno</option>
                    <option value="Mixto" ${grupo?.turno === 'Mixto' ? 'selected' : ''}>Mixto</option>
                </select>
            </div>
            <div class="form-group">
                <label for="grupo-horario">Horario:</label>
                <input type="text" id="grupo-horario" required placeholder="ej. 8:00 - 14:00" value="${grupo?.horario || ''}">
            </div>
            <div class="form-buttons">
                <button type="button" id="btnCancelarGrupo" class="btn-secondary">Cancelar</button>
                <button type="button" id="btnGuardarGrupo" class="btn-primary">Guardar</button>
            </div>
        </form>
    `;
    
    formContainer.appendChild(formContent);
    document.body.appendChild(formContainer);
    
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