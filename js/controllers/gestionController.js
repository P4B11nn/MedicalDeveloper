// js/controllers/gestionController.js
import { renderGestionModulos, renderGestionGrupos, inicializarDatosGestion } from '../views/gestionView.js';
import { gestionModel } from '../models/gestionModel.js';
import eventBus, { EVENT_NAMES } from '../utils/eventBus.js'; // Importa EVENT_NAMES
import * as modalUtil from '../utils/modalUtil.js'; // SOLUCIÓN LAG: Importación estática

export function initGestionController() {
    console.log("Controlador de Gestión inicializado.");
    
    // Inicializar datos de ejemplo si no existen
    inicializarDatosGestion();
    
    setupSidebarNavigation();
    
    // Cargar la primera sección por defecto
    document.querySelector('.sidebar-menu button[data-section="modulos"]').click();
    
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

// Se ha eliminado la función setupEventHandlers ya que ahora la gestión de eventos
// se realiza directamente en la vista mediante delegación de eventos

// Estas funciones ya no son necesarias en el controlador
// ya que la lógica se ha movido a la vista (gestionView.js)
// para seguir el patrón MVC correctamente

// La función asignarGrupo se mantiene para compatibilidad
export function asignarGrupo(moduloId) {
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
            // SOLUCIÓN EVENT BUS: Emite el evento específico
            eventBus.emit(EVENT_NAMES.GROUP_ASSIGNED, { 
                moduloId,
                grupoId
            });
            eventBus.emit('gestion-modulo-updated', { 
                action: 'assign-grupo', 
                moduloId,
                grupoId
            }); // Mantener compatibilidad
            modalContainer.remove();
            renderGestionModulos(document.getElementById('modulos-section'));
            
            // Mostrar mensaje de éxito - Sin importación dinámica
            modalUtil.mostrarAlerta({
                title: 'Asignación Exitosa',
                message: grupoId ? 
                    'El grupo ha sido asignado correctamente al módulo.' : 
                    'Se ha removido la asignación de grupo del módulo.',
                type: 'success'
            });
        } else {
            // Mostrar mensaje de error - Sin importación dinámica
            modalUtil.mostrarAlerta({
                title: 'Error en la Asignación',
                message: 'No se pudo completar la asignación del grupo al módulo.',
                type: 'error'
            });
        }
    });
}