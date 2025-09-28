// js/views/userView.js - Vista para gestion de usuarios (CON DELEGACIÓN DE EVENTOS)
import { authModel } from '../models/storageModel.js';
import { gestionModel } from '../models/gestionModel.js';
import eventBus, { EVENT_NAMES } from '../utils/eventBus.js';

let contenedorUsuarios = null;

/**
 * Se ejecuta UNA SOLA VEZ al cargar la página.
 * Aquí es donde configuramos los "escuchadores" de eventos permanentes.
 */
export function init() {
    contenedorUsuarios = document.getElementById('personalLista');
    if (!contenedorUsuarios) {
        console.error('Contenedor de usuarios no encontrado. La vista no puede funcionar.');
        return;
    }
    
    // SOLUCIÓN: El "escuchador" de eventos se añade UNA SOLA VEZ al contenedor principal.
    // Usará la delegación de eventos para saber en qué botón se hizo clic.
    configurarOyenteDeEventosPrincipal();

    // Escucha eventos del sistema para saber cuándo redibujar la lista.
    eventBus.on('usuarios-updated', mostrarUsuarios);

    // Dibuja la lista inicial.
    mostrarUsuarios();
}

/**
 * Dibuja o redibuja la lista completa de usuarios.
 * Ya NO se encarga de los eventos, solo de la parte visual.
 */
export function mostrarUsuarios() {
    if (!contenedorUsuarios) return;

    const usuarios = authModel.getAllUsers();
    if (usuarios.length === 0) {
        contenedorUsuarios.innerHTML = `<div class="welcome-message">No hay usuarios registrados.</div>`;
        return;
    }

    contenedorUsuarios.innerHTML = usuarios.map((usuario, index) => {
        const iconoRol = usuario.rol === 'admin' ? '<i class="fas fa-user-shield"></i>' : '<i class="fas fa-user-graduate"></i>';
        const badgeRol = usuario.rol === 'admin' ? '<span class="badge-admin">ADMIN</span>' : '<span class="badge-practicante">PRACTICANTE</span>';

        return `
            <div class="personal-item" data-user-index="${index}">
                <div class="user-info-container">
                    <div class="user-icon">${iconoRol}</div>
                    <div>
                        <h4>${usuario.nombre} ${usuario.apellidos || ''}</h4>
                        <p><strong>ID:</strong> ${usuario.id} | <strong>Matrícula:</strong> ${usuario.matricula}</p>
                        <div class="badge-container">${badgeRol}</div>
                    </div>
                </div>
                <div class="user-actions-container">
                    <button class="btn-edit-user" data-user-index="${index}" title="Editar usuario"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete-user" data-user-index="${index}" title="Eliminar usuario"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>`;
    }).join('');
}

/**
 * Configura un único manejador de eventos en el contenedor de la lista.
 */
function configurarOyenteDeEventosPrincipal() {
    contenedorUsuarios.addEventListener('click', (e) => {
        const editButton = e.target.closest('.btn-edit-user');
        if (editButton) {
            abrirModalEdicion(parseInt(editButton.dataset.userIndex));
            return; // Detenemos la ejecución para no procesar otros clics
        }

        const deleteButton = e.target.closest('.btn-delete-user');
        if (deleteButton) {
            confirmarEliminacion(parseInt(deleteButton.dataset.userIndex));
        }
    });
}

/**
 * Muestra un modal personalizado para confirmar la eliminación.
 */
function confirmarEliminacion(userIndex) {
    const usuario = authModel.getUserByIndex(userIndex);
    if (!usuario) {
        showMiniModal('Usuario no encontrado', 'error');
        return;
    }

    // Emitir evento de solicitud de eliminación
    eventBus.emit(EVENT_NAMES.USER_DELETE_REQUESTED, { 
        user: usuario,
        timestamp: new Date().toISOString()
    });
    
    // Crea el overlay del modal
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.innerHTML = `
        <div class="modal-content-confirm">
            <h3>¿Eliminar Usuario?</h3>
            <p>Estás a punto de eliminar a <strong>${usuario.nombre} ${usuario.apellidos || ''}</strong>. Esta acción no se puede deshacer.</p>
            <div class="confirm-actions">
                <button class="btn-cancel">Cancelar</button>
                <button class="btn-confirm-delete">Eliminar</button>
            </div>
        </div>`;

    document.body.appendChild(modalOverlay);

    const cerrarModal = () => document.body.removeChild(modalOverlay);
    modalOverlay.querySelector('.btn-cancel').onclick = cerrarModal;
    modalOverlay.querySelector('.btn-confirm-delete').onclick = () => {
        ejecutarEliminacion(userIndex);
        cerrarModal();
    };
    modalOverlay.onclick = (e) => { if (e.target === modalOverlay) cerrarModal(); };
}


function ejecutarEliminacion(userIndex) {
    const usuarioEliminado = authModel.getUserByIndex(userIndex);
    const exito = authModel.deleteUser(userIndex);
    if (exito) {
        showMiniModal('Usuario eliminado correctamente', 'success');
        eventBus.emit(EVENT_NAMES.USER_DELETED, { 
            user: usuarioEliminado,
            timestamp: new Date().toISOString(),
            success: true
        });
        mostrarUsuarios();
    } else {
        eventBus.emit(EVENT_NAMES.USER_DELETED, { 
            userIndex: userIndex,
            timestamp: new Date().toISOString(),
            success: false,
            error: 'No se pudo eliminar el usuario'
        });
    }
}


function abrirModalEdicion(userIndex) {
    const usuario = authModel.getUserByIndex(userIndex);
    if (!usuario) {
        showMiniModal('Error: No se pudo cargar la información del usuario.', 'error');
        return;
    }

    // Emitir evento de solicitud de edición
    eventBus.emit(EVENT_NAMES.USER_EDIT_REQUESTED, { 
        user: usuario,
        userIndex: userIndex,
        timestamp: new Date().toISOString()
    });

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.innerHTML = `
        <div class="modal-content-edit">
            <h3>Editar Usuario</h3>
            <form id="form-editar-usuario">
                <div class="form-grid">
                    <div><label>Nombre:</label><input type="text" id="edit-nombre" value="${usuario.nombre || ''}" required></div>
                    <div><label>Apellidos:</label><input type="text" id="edit-apellidos" value="${usuario.apellidos || ''}" required></div>
                    <div><label>Edad:</label><input type="number" id="edit-edad" value="${usuario.edad || ''}"></div>
                    <div><label>Sexo:</label><select id="edit-sexo"><option value="M" ${usuario.sexo === 'M' ? 'selected' : ''}>Masculino</option><option value="F" ${usuario.sexo === 'F' ? 'selected' : ''}>Femenino</option></select></div>
                    <div><label>Matrícula:</label><input type="text" id="edit-matricula" value="${usuario.matricula || ''}" required></div>
                    <div><label>Grupo:</label>
                        <select id="edit-grupoId">
                            <option value="">Sin Grupo</option>
                            ${gestionModel.getGrupos().map(g => `<option value="${g.id}" ${usuario.grupoId === g.id ? 'selected' : ''}>${g.nombre}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-full-width"><label>Rol:</label><select id="edit-rol" required><option value="admin" ${usuario.rol === 'admin' ? 'selected' : ''}>Administrador</option><option value="practicante" ${usuario.rol === 'practicante' ? 'selected' : ''}>Practicante</option></select></div>
                <div class="form-full-width"><label>Nueva Contraseña (opcional):</label><input type="password" id="edit-contrasena" placeholder="Dejar en blanco para no cambiar"></div>
                <div class="form-actions">
                    <button type="button" class="btn-cancel">Cancelar</button>
                    <button type="submit" class="btn-save">Guardar Cambios</button>
                </div>
            </form>
        </div>`;

    document.body.appendChild(modalOverlay);

    const cerrarModal = () => document.body.removeChild(modalOverlay);
    modalOverlay.querySelector('.btn-cancel').addEventListener('click', cerrarModal);
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) cerrarModal(); });

    modalOverlay.querySelector('#form-editar-usuario').addEventListener('submit', (e) => {
        e.preventDefault();
        const datosActualizados = {
            nombre: document.getElementById('edit-nombre').value,
            apellidos: document.getElementById('edit-apellidos').value,
            edad: document.getElementById('edit-edad').value,
            sexo: document.getElementById('edit-sexo').value,
            matricula: document.getElementById('edit-matricula').value,
            grupoId: document.getElementById('edit-grupoId').value,
            mesa: document.getElementById('edit-mesa').value,
            rol: document.getElementById('edit-rol').value
        };
        const nuevaContrasena = document.getElementById('edit-contrasena').value;
        if (nuevaContrasena) {
            datosActualizados.contrasena = nuevaContrasena;
        }
        ejecutarEdicion(userIndex, datosActualizados);
        cerrarModal();
    });
}


function ejecutarEdicion(userIndex, datosActualizados) {
    const usuarioOriginal = authModel.getUserByIndex(userIndex);
    const exito = authModel.updateUser(userIndex, datosActualizados);
    if (exito) {
        showMiniModal('Usuario actualizado correctamente', 'success');
        const usuarioActualizado = authModel.getUserByIndex(userIndex);
        eventBus.emit(EVENT_NAMES.USER_UPDATED, { 
            userIndex, 
            original: usuarioOriginal,
            updated: usuarioActualizado,
            changes: datosActualizados,
            timestamp: new Date().toISOString(),
            success: true
        });
        mostrarUsuarios();
    } else {
        eventBus.emit(EVENT_NAMES.USER_UPDATED, { 
            userIndex,
            changes: datosActualizados,
            timestamp: new Date().toISOString(),
            success: false,
            error: 'No se pudo actualizar el usuario'
        });
    }
}


function showMiniModal(mensaje, tipo) {
    const existente = document.getElementById('mini-notification');
    if (existente) existente.remove();
    const notificacion = document.createElement('div');
    notificacion.id = 'mini-notification';
    let backgroundColor = tipo === 'success' ? '#10b981' : '#ef4444';
    let icon = tipo === 'success' ? '✓' : '✕';
    notificacion.style.cssText = `position: fixed; top: 20px; right: 20px; background: ${backgroundColor}; color: white; padding: 15px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); z-index: 10001; font-size: 1rem;`;
    notificacion.innerHTML = `<span>${icon}</span> ${mensaje}`;
    document.body.appendChild(notificacion);
    setTimeout(() => notificacion.remove(), 4000);
}