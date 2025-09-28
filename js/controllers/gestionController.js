// js/controllers/gestionController.js
import { renderGestionModulos, renderGestionGrupos, renderFormModulo, renderFormGrupo, inicializarDatosGestion } from '../views/gestionView.js';
import { gestionModel } from '../models/gestionModel.js';
import eventBus from '../utils/eventBus.js';

let moduloSeleccionado = null;
let grupoSeleccionado = null;

export function initGestionController() {
    console.log("Controlador de Gestión inicializado.");
    
    // Inicializar datos de ejemplo si no existen
    inicializarDatosGestion();
    
    setupSidebarNavigation();
    setupEventHandlers();
    
    // Cargar la primera sección por defecto
    document.querySelector('.sidebar-menu button[data-section="modulos"]').click();
    
    // Suscribirse a eventos del bus
    eventBus.on('gestion-modulo-updated', () => {
        renderGestionModulos(document.getElementById('modulos-section'));
    });
    
    eventBus.on('gestion-grupo-updated', () => {
        renderGestionGrupos(document.getElementById('grupos-section'));
    });
    
    // Suscribirse a evento de inicialización de datos
    eventBus.on('gestion-data-initialized', (data) => {
        console.log('Datos de gestión inicializados:', data);
        // Se podría mostrar un mensaje o realizar otras acciones aquí
    });
}

function setupSidebarNavigation() {
    document.querySelectorAll('.sidebar-menu button').forEach(button => {
        button.addEventListener('click', () => {
            const sectionId = button.dataset.section;
            
            // Activar la sección correspondiente
            document.querySelectorAll('.sidebar-menu button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
            document.getElementById(`${sectionId}-section`).classList.add('active');

            if (sectionId === 'modulos') {
                renderGestionModulos(document.getElementById('modulos-section'));
            } else if (sectionId === 'grupos') {
                renderGestionGrupos(document.getElementById('grupos-section'));
            }
        });
    });
}

function setupEventHandlers() {
    // Event delegation para todo el documento
    document.addEventListener('click', (event) => {
        // Handlers para Módulos
        if (event.target.id === 'btnNuevoModulo') {
            moduloSeleccionado = null;
            renderFormModulo();
        }
        else if (event.target.id === 'btnGuardarModulo') {
            guardarModulo();
        }
        else if (event.target.id === 'btnCancelarModulo') {
            document.getElementById('modulo-form-container')?.remove();
        }
        else if (event.target.classList.contains('edit-modulo')) {
            const moduloId = event.target.dataset.id;
            moduloSeleccionado = gestionModel.getModuloById(moduloId);
            renderFormModulo(moduloSeleccionado);
        }
        else if (event.target.classList.contains('delete-modulo')) {
            const moduloId = event.target.dataset.id;
            const modulo = gestionModel.getModuloById(moduloId);
            
            // Importar dinámicamente la utilidad de modal
            import('../utils/modalUtil.js').then(modalUtil => {
                modalUtil.confirmarAccion({
                    title: 'Eliminar Módulo',
                    message: `¿Estás seguro de eliminar el módulo "${modulo.nombre}"? Esta acción no se puede deshacer.`,
                    onConfirm: () => {
                        gestionModel.deleteModulo(moduloId);
                        renderGestionModulos(document.getElementById('modulos-section'));
                        eventBus.emit('gestion-modulo-updated', { action: 'delete', id: moduloId });
                    }
                });
            });
        }
        
        // Handlers para Grupos
        if (event.target.id === 'btnNuevoGrupo') {
            grupoSeleccionado = null;
            renderFormGrupo();
        }
        else if (event.target.id === 'btnGuardarGrupo') {
            guardarGrupo();
        }
        else if (event.target.id === 'btnCancelarGrupo') {
            document.getElementById('grupo-form-container')?.remove();
        }
        else if (event.target.classList.contains('edit-grupo')) {
            const grupoId = event.target.dataset.id;
            grupoSeleccionado = gestionModel.getGrupoById(grupoId);
            renderFormGrupo(grupoSeleccionado);
        }
        else if (event.target.classList.contains('delete-grupo')) {
            const grupoId = event.target.dataset.id;
            const grupo = gestionModel.getGrupoById(grupoId);
            
            // Importar dinámicamente la utilidad de modal
            import('../utils/modalUtil.js').then(modalUtil => {
                modalUtil.confirmarAccion({
                    title: 'Eliminar Grupo',
                    message: `¿Estás seguro de eliminar el grupo "${grupo.nombre}"? Esta acción no se puede deshacer.`,
                    onConfirm: () => {
                        gestionModel.deleteGrupo(grupoId);
                        renderGestionGrupos(document.getElementById('grupos-section'));
                        eventBus.emit('gestion-grupo-updated', { action: 'delete', id: grupoId });
                    }
                });
            });
        }
        else if (event.target.classList.contains('assign-grupo')) {
            const moduloId = event.target.dataset.moduloid;
            asignarGrupo(moduloId);
        }
    });
}

function guardarModulo() {
    const formModulo = document.getElementById('form-modulo');
    if (!formModulo) return;
    
    const nombre = formModulo.querySelector('#modulo-nombre').value.trim();
    const ubicacion = formModulo.querySelector('#modulo-ubicacion').value.trim();
    const estado = formModulo.querySelector('#modulo-estado').value;
    
    // Validar datos
    if (!nombre || !ubicacion) {
        alert('Nombre y ubicación son campos obligatorios');
        return;
    }
    
    // Datos a guardar
    const moduloData = {
        nombre,
        ubicacion,
        estado
    };
    
    let resultado;
    
    if (moduloSeleccionado) {
        // Actualizar módulo existente
        resultado = gestionModel.updateModulo(moduloSeleccionado.id, moduloData);
        if (resultado) {
            eventBus.emit('gestion-modulo-updated', { action: 'update', id: moduloSeleccionado.id });
        }
    } else {
        // Crear nuevo módulo
        resultado = gestionModel.createModulo(moduloData);
        if (resultado) {
            eventBus.emit('gestion-modulo-updated', { action: 'create', id: resultado.id });
        }
    }
    
    if (resultado) {
        document.getElementById('modulo-form-container').remove();
        renderGestionModulos(document.getElementById('modulos-section'));
        
        // Mostrar notificación de éxito
        import('../utils/modalUtil.js').then(modalUtil => {
            modalUtil.mostrarAlerta({
                title: 'Módulo Guardado',
                message: moduloSeleccionado ? 
                    'El módulo se ha actualizado correctamente.' : 
                    'El módulo se ha creado correctamente.',
                type: 'success'
            });
        });
    } else {
        import('../utils/modalUtil.js').then(modalUtil => {
            modalUtil.mostrarAlerta({
                title: 'Error',
                message: 'Hubo un problema al guardar el módulo. Por favor intenta de nuevo.',
                type: 'error'
            });
        });
    }
}

function guardarGrupo() {
    const formGrupo = document.getElementById('form-grupo');
    if (!formGrupo) return;
    
    const nombre = formGrupo.querySelector('#grupo-nombre').value.trim();
    const turno = formGrupo.querySelector('#grupo-turno').value.trim();
    const horario = formGrupo.querySelector('#grupo-horario').value.trim();
    
    // Validar datos
    if (!nombre || !turno || !horario) {
        alert('Todos los campos son obligatorios');
        return;
    }
    
    // Datos a guardar
    const grupoData = {
        nombre,
        turno,
        horario
    };
    
    let resultado;
    
    if (grupoSeleccionado) {
        // Actualizar grupo existente
        resultado = gestionModel.updateGrupo(grupoSeleccionado.id, grupoData);
        if (resultado) {
            eventBus.emit('gestion-grupo-updated', { action: 'update', id: grupoSeleccionado.id });
        }
    } else {
        // Crear nuevo grupo
        resultado = gestionModel.createGrupo(grupoData);
        if (resultado) {
            eventBus.emit('gestion-grupo-updated', { action: 'create', id: resultado.id });
        }
    }
    
    if (resultado) {
        document.getElementById('grupo-form-container').remove();
        renderGestionGrupos(document.getElementById('grupos-section'));
        
        // Mostrar notificación de éxito
        import('../utils/modalUtil.js').then(modalUtil => {
            modalUtil.mostrarAlerta({
                title: 'Grupo Guardado',
                message: grupoSeleccionado ? 
                    'El grupo se ha actualizado correctamente.' : 
                    'El grupo se ha creado correctamente.',
                type: 'success'
            });
        });
    } else {
        import('../utils/modalUtil.js').then(modalUtil => {
            modalUtil.mostrarAlerta({
                title: 'Error',
                message: 'Hubo un problema al guardar el grupo. Por favor intenta de nuevo.',
                type: 'error'
            });
        });
    }
}

function asignarGrupo(moduloId) {
    // Obtener todos los grupos disponibles
    const grupos = gestionModel.getGrupos();
    const modulo = gestionModel.getModuloById(moduloId);
    
    if (!modulo) {
        alert('Módulo no encontrado');
        return;
    }
    
    // Crear elemento para selección de grupo
    const modalContainer = document.createElement('div');
    modalContainer.id = 'modal-asignar-grupo';
    modalContainer.style.position = 'fixed';
    modalContainer.style.top = '0';
    modalContainer.style.left = '0';
    modalContainer.style.width = '100%';
    modalContainer.style.height = '100%';
    modalContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    modalContainer.style.display = 'flex';
    modalContainer.style.justifyContent = 'center';
    modalContainer.style.alignItems = 'center';
    modalContainer.style.zIndex = '1000';
    
    const modalContent = document.createElement('div');
    modalContent.style.backgroundColor = '#fff';
    modalContent.style.padding = '20px';
    modalContent.style.borderRadius = '8px';
    modalContent.style.width = '400px';
    modalContent.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
    
    modalContent.innerHTML = `
        <h3>Asignar Grupo a Módulo: ${modulo.nombre}</h3>
        <p><strong>Ubicación:</strong> ${modulo.ubicacion}</p>
        <p><strong>Estado:</strong> ${modulo.estado}</p>
        <div style="margin: 20px 0;">
            <label for="select-grupo">Selecciona un grupo:</label>
            <select id="select-grupo" style="width: 100%; padding: 8px; margin-top: 8px;">
                <option value="">-- Ninguno --</option>
                ${grupos.map(g => `<option value="${g.id}" ${g.id === modulo.grupoAsignadoId ? 'selected' : ''}>${g.nombre} - ${g.turno}</option>`).join('')}
            </select>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
            <button id="btnCancelarAsignacion" class="btn-secondary">Cancelar</button>
            <button id="btnConfirmarAsignacion" class="btn-primary">Guardar</button>
        </div>
    `;
    
    modalContainer.appendChild(modalContent);
    document.body.appendChild(modalContainer);
    
    // Event listeners para el modal
    document.getElementById('btnCancelarAsignacion').addEventListener('click', () => {
        modalContainer.remove();
    });
    
    document.getElementById('btnConfirmarAsignacion').addEventListener('click', () => {
        const selectGrupo = document.getElementById('select-grupo');
        const grupoId = selectGrupo.value || null; // Si es vacío, asignar null
        
        const resultado = gestionModel.asignarGrupoAModulo(moduloId, grupoId);
        
        if (resultado) {
            eventBus.emit('gestion-modulo-updated', { 
                action: 'assign-grupo', 
                moduloId,
                grupoId
            });
            modalContainer.remove();
            renderGestionModulos(document.getElementById('modulos-section'));
            
            // Mostrar mensaje de éxito
            import('../utils/modalUtil.js').then(modalUtil => {
                modalUtil.mostrarAlerta({
                    title: 'Asignación Exitosa',
                    message: grupoId ? 
                        'El grupo ha sido asignado correctamente al módulo.' : 
                        'Se ha removido la asignación de grupo del módulo.',
                    type: 'success'
                });
            });
        } else {
            // Mostrar mensaje de error
            import('../utils/modalUtil.js').then(modalUtil => {
                modalUtil.mostrarAlerta({
                    title: 'Error en la Asignación',
                    message: 'No se pudo completar la asignación del grupo al módulo.',
                    type: 'error'
                });
            });
        }
    });
}