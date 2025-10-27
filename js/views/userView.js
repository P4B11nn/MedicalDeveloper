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
export async function mostrarUsuarios() {
    if (!contenedorUsuarios) return;

    try {
        const [usuarios, grupos] = await Promise.all([
            authModel.getAllUsers(),
            gestionModel.getGrupos()
        ]);
        
        // Obtener usuario actual para verificar permisos
        const currentUser = authModel.getCurrentUser();
        const isAdmin = currentUser && currentUser.rol === 'admin';
        
        if (usuarios.length === 0) {
            contenedorUsuarios.innerHTML = `<div class="welcome-message">No hay usuarios registrados.</div>`;
            return;
        }

        contenedorUsuarios.innerHTML = usuarios.map((usuario, index) => {
            const iconoRol = usuario.rol === 'admin' ? '<i class="fas fa-user-shield"></i>' : '<i class="fas fa-user-graduate"></i>';
            const badgeRol = usuario.rol === 'admin' ? '<span class="badge-admin">ADMIN</span>' : '<span class="badge-practicante">PRACTICANTE</span>';
            
            // Obtener información del grupo
            const grupoUsuario = grupos.find(g => g.id === usuario.grupoId);
            const nombreGrupo = grupoUsuario ? `${grupoUsuario.nombre} (${grupoUsuario.turno})` : 'Sin Grupo Asignado';

            // Solo mostrar botón de reset password si el usuario actual es admin y no es el mismo usuario
            const resetPasswordBtn = (isAdmin && usuario.uid !== currentUser.uid) 
                ? `<button class="btn-reset-password" data-user-index="${index}" title="Resetear contraseña"><i class="fas fa-key"></i></button>`
                : '';

            return `
                <div class="personal-item" data-user-index="${index}">
                    <div class="user-info-container">
                        <div class="user-icon">${iconoRol}</div>
                        <div>
                            <h4>${usuario.nombre} ${usuario.apellidos || ''}</h4>
                            <p><strong>Matrícula:</strong> ${usuario.matricula} | <strong>Grupo:</strong> ${nombreGrupo}</p>
                            <div class="badge-container">${badgeRol}</div>
                        </div>
                    </div>
                    <div class="user-actions-container">
                        <button class="btn-edit-user" data-user-index="${index}" title="Editar usuario"><i class="fas fa-edit"></i></button>
                        <button class="btn-delete-user" data-user-index="${index}" title="Eliminar usuario"><i class="fas fa-trash-alt"></i></button>
                        ${resetPasswordBtn}
                    </div>
                </div>`;
        }).join('');
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        contenedorUsuarios.innerHTML = `
            <div class="error-message" style="
                text-align: center; 
                padding: 20px; 
                background: #fef2f2; 
                border: 1px solid #fecaca; 
                border-radius: 8px;
                color: #dc2626;
            ">
                <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 12px; display: block;"></i>
                <strong>Error al cargar usuarios</strong>
                <p>${error.message}</p>
                <button onclick="location.reload()" style="
                    background: #dc2626;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-top: 8px;
                ">
                    Reintentar
                </button>
            </div>
        `;
    }
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
            return;
        }

        const resetPasswordButton = e.target.closest('.btn-reset-password');
        if (resetPasswordButton) {
            confirmarResetPassword(parseInt(resetPasswordButton.dataset.userIndex));
        }
    });
}

/**
 * Muestra un modal personalizado para confirmar la eliminación.
 */
async function confirmarEliminacion(userIndex) {
    try {
        const usuarios = await authModel.getAllUsers();
        const usuario = usuarios[userIndex];
        
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
            ejecutarEliminacion(userIndex, usuario);
            cerrarModal();
        };
        modalOverlay.onclick = (e) => { if (e.target === modalOverlay) cerrarModal(); };

    } catch (error) {
        console.error('Error en confirmarEliminacion:', error);
        showMiniModal('Error al cargar datos del usuario', 'error');
    }
}


async function ejecutarEliminacion(userIndex, usuario) {
    try {
        const success = await authModel.deleteUser(usuario.uid);
        
        if (success) {
            showMiniModal('Usuario eliminado correctamente', 'success');
            eventBus.emit(EVENT_NAMES.USER_DELETED, { 
                user: usuario,
                userId: usuario.uid,
                timestamp: new Date().toISOString(),
                success: true
            });
            await mostrarUsuarios();
        } else {
            eventBus.emit(EVENT_NAMES.USER_DELETED, { 
                userId: usuario.uid,
                timestamp: new Date().toISOString(),
                success: false,
                error: 'No se pudo eliminar el usuario'
            });
            showMiniModal('Error al eliminar usuario', 'error');
        }
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        showMiniModal('Error al eliminar usuario: ' + error.message, 'error');
    }
}


/**
 * Abre modal de edición para un usuario
 */
async function abrirModalEdicion(userIndex) {
    try {
        const [usuarios, grupos, modulos] = await Promise.all([
            authModel.getAllUsers(),
            gestionModel.getGrupos(),
            gestionModel.getModulos()
        ]);
        
        const usuario = usuarios[userIndex];
        
        if (!usuario) {
            showMiniModal('Error: No se pudo cargar la información del usuario.', 'error');
            return;
        }

        // Emitir evento de solicitud de edición
        eventBus.emit(EVENT_NAMES.USER_EDIT_REQUESTED, { 
            user: usuario,
            userId: usuario.uid,
            timestamp: new Date().toISOString()
        });

        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.innerHTML = `
            <div class="modal-content-edit" style="
                background: linear-gradient(135deg, #7dd3fc, #fef3c7);
                -webkit-backdrop-filter: blur(10px);
                backdrop-filter: blur(10px);
                border-radius: 20px;
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
                border: 1px solid rgba(255, 255, 255, 0.2);
                padding: 30px;
                max-width: 600px;
                width: 90%;
                position: relative;
            ">
                <h3 style="
                    margin-top: 0;
                    margin-bottom: 25px;
                    font-size: 1.8rem;
                    font-weight: 600;
                    color: #1f2937;
                    text-align: center;
                    padding-bottom: 15px;
                    border-bottom: 2px solid rgba(125, 211, 252, 0.3);
                ">Editar Usuario</h3>
                <form id="form-editar-usuario">
                    <div class="form-grid" style="
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 20px;
                        margin-bottom: 20px;
                    ">
                        <div style="margin-bottom: 15px;">
                            <label style="
                                display: block; 
                                margin-bottom: 8px; 
                                font-weight: 600;
                                font-size: 1rem;
                                color: #1f2937;
                            ">Nombre:</label>
                            <input type="text" id="edit-nombre" value="${usuario.nombre || ''}" required style="
                                width: 100%;
                                padding: 12px 16px;
                                border-radius: 15px;
                                border: 2px solid rgba(125, 211, 252, 0.3);
                                background: rgba(255, 255, 255, 0.8);
                                -webkit-backdrop-filter: blur(5px);
                                backdrop-filter: blur(5px);
                                transition: all 0.3s ease;
                                outline: none;
                                font-size: 1rem;
                                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                            " onFocus="this.style.borderColor='rgba(125, 211, 252, 0.5)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(125, 211, 252, 0.3)'" onBlur="this.style.borderColor='rgba(125, 211, 252, 0.3)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0, 0, 0, 0.1)'">
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label style="
                                display: block; 
                                margin-bottom: 8px; 
                                font-weight: 600;
                                font-size: 1rem;
                                color: #1f2937;
                            ">Apellidos:</label>
                            <input type="text" id="edit-apellidos" value="${usuario.apellidos || ''}" required style="
                                width: 100%;
                                padding: 12px 16px;
                                border-radius: 15px;
                                border: 2px solid rgba(125, 211, 252, 0.3);
                                background: rgba(255, 255, 255, 0.8);
                                -webkit-backdrop-filter: blur(5px);
                                backdrop-filter: blur(5px);
                                transition: all 0.3s ease;
                                outline: none;
                                font-size: 1rem;
                                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                            " onFocus="this.style.borderColor='rgba(125, 211, 252, 0.5)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(125, 211, 252, 0.3)'" onBlur="this.style.borderColor='rgba(125, 211, 252, 0.3)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0, 0, 0, 0.1)'">
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label style="
                                display: block; 
                                margin-bottom: 8px; 
                                font-weight: 600;
                                font-size: 1rem;
                                color: #1f2937;
                            ">Edad:</label>
                            <input type="number" id="edit-edad" value="${usuario.edad || ''}" style="
                                width: 100%;
                                padding: 12px 16px;
                                border-radius: 15px;
                                border: 2px solid rgba(125, 211, 252, 0.3);
                                background: rgba(255, 255, 255, 0.8);
                                -webkit-backdrop-filter: blur(5px);
                                backdrop-filter: blur(5px);
                                transition: all 0.3s ease;
                                outline: none;
                                font-size: 1rem;
                                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                            " onFocus="this.style.borderColor='rgba(125, 211, 252, 0.5)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(125, 211, 252, 0.3)'" onBlur="this.style.borderColor='rgba(125, 211, 252, 0.3)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0, 0, 0, 0.1)'">
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label style="
                                display: block; 
                                margin-bottom: 8px; 
                                font-weight: 600;
                                font-size: 1rem;
                                color: #1f2937;
                            ">Sexo:</label>
                            <select id="edit-sexo" style="
                                width: 100%;
                                padding: 12px 16px;
                                border-radius: 15px;
                                border: 2px solid rgba(125, 211, 252, 0.3);
                                background: rgba(255, 255, 255, 0.8);
                                -webkit-backdrop-filter: blur(5px);
                                backdrop-filter: blur(5px);
                                transition: all 0.3s ease;
                                outline: none;
                                font-size: 1rem;
                                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                                cursor: pointer;
                            " onFocus="this.style.borderColor='rgba(125, 211, 252, 0.5)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(125, 211, 252, 0.3)'" onBlur="this.style.borderColor='rgba(125, 211, 252, 0.3)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0, 0, 0, 0.1)'">
                                <option value="M" ${usuario.sexo === 'M' ? 'selected' : ''}>Masculino</option>
                                <option value="F" ${usuario.sexo === 'F' ? 'selected' : ''}>Femenino</option>
                            </select>
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label style="
                                display: block; 
                                margin-bottom: 8px; 
                                font-weight: 600;
                                font-size: 1rem;
                                color: #1f2937;
                            ">Matrícula:</label>
                            <input type="text" id="edit-matricula" value="${usuario.matricula || ''}" required style="
                                width: 100%;
                                padding: 12px 16px;
                                border-radius: 15px;
                                border: 2px solid rgba(125, 211, 252, 0.3);
                                background: rgba(255, 255, 255, 0.8);
                                -webkit-backdrop-filter: blur(5px);
                                backdrop-filter: blur(5px);
                                transition: all 0.3s ease;
                                outline: none;
                                font-size: 1rem;
                                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                            " onFocus="this.style.borderColor='rgba(125, 211, 252, 0.5)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(125, 211, 252, 0.3)'" onBlur="this.style.borderColor='rgba(125, 211, 252, 0.3)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0, 0, 0, 0.1)'">
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label style="
                                display: block; 
                                margin-bottom: 8px; 
                                font-weight: 600;
                                font-size: 1rem;
                                color: #1f2937;
                            ">Grupo:</label>
                            <select id="edit-grupoId" style="
                                width: 100%;
                                padding: 12px 16px;
                                border-radius: 15px;
                                border: 2px solid rgba(125, 211, 252, 0.3);
                                background: rgba(255, 255, 255, 0.8);
                                -webkit-backdrop-filter: blur(5px);
                                backdrop-filter: blur(5px);
                                transition: all 0.3s ease;
                                outline: none;
                                font-size: 1rem;
                                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                                cursor: pointer;
                            " onFocus="this.style.borderColor='rgba(125, 211, 252, 0.5)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(125, 211, 252, 0.3)'" onBlur="this.style.borderColor='rgba(125, 211, 252, 0.3)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0, 0, 0, 0.1)'">
                                <option value="">Sin Grupo</option>
                                ${grupos.map(g => {
                                    const modulosAsignados = modulos.filter(m => m.grupoAsignadoId === g.id);
                                    const infoModulos = modulosAsignados.length > 0 
                                        ? ` → ${modulosAsignados.map(m => m.nombre).join(', ')}`
                                        : ' → Sin módulo asignado';
                                    return `<option value="${g.id}" ${usuario.grupoId === g.id ? 'selected' : ''}>${g.nombre} (${g.turno})${infoModulos}</option>`;
                                }).join('')}
                            </select>
                        </div>
                    </div>
                    <div style="margin-bottom: 20px;">
                        <label style="
                            display: block; 
                            margin-bottom: 8px; 
                            font-weight: 600;
                            font-size: 1rem;
                            color: #1f2937;
                        ">Rol:</label>
                        <select id="edit-rol" required style="
                            width: 100%;
                            padding: 12px 16px;
                            border-radius: 15px;
                            border: 2px solid rgba(125, 211, 252, 0.3);
                            background: rgba(255, 255, 255, 0.8);
                            -webkit-backdrop-filter: blur(5px);
                            backdrop-filter: blur(5px);
                            transition: all 0.3s ease;
                            outline: none;
                            font-size: 1rem;
                            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                            cursor: pointer;
                        " onFocus="this.style.borderColor='rgba(125, 211, 252, 0.5)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(125, 211, 252, 0.3)'" onBlur="this.style.borderColor='rgba(125, 211, 252, 0.3)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0, 0, 0, 0.1)'">
                            <option value="admin" ${usuario.rol === 'admin' ? 'selected' : ''}>Administrador</option>
                            <option value="practicante" ${usuario.rol === 'practicante' ? 'selected' : ''}>Practicante</option>
                        </select>
                    </div>
                    <div style="
                        display: flex;
                        justify-content: center;
                        gap: 20px;
                    ">
                        <button type="button" class="btn-cancel" style="
                            padding: 12px 24px;
                            border-radius: 25px;
                            border: none;
                            background: linear-gradient(135deg, #e5e7eb, #f3f4f6);
                            color: #1f2937;
                            cursor: pointer;
                            font-weight: 600;
                            font-size: 14px;
                            transition: all 0.3s ease;
                            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                        " onMouseOver="this.style.background='linear-gradient(135deg, #d1d5db, #e5e7eb)'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 20px rgba(0, 0, 0, 0.15)'" onMouseOut="this.style.background='linear-gradient(135deg, #e5e7eb, #f3f4f6)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0, 0, 0, 0.1)'">Cancelar</button>
                        <button type="submit" class="btn-save" style="
                            padding: 12px 24px;
                            border-radius: 25px;
                            border: none;
                            background: linear-gradient(135deg, #7dd3fc, #fef3c7);
                            color: #1f2937;
                            cursor: pointer;
                            font-weight: 600;
                            font-size: 14px;
                            transition: all 0.3s ease;
                            box-shadow: 0 4px 15px rgba(125, 211, 252, 0.2);
                        " onMouseOver="this.style.background='linear-gradient(135deg, #38bdf8, #fbbf24)'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 20px rgba(125, 211, 252, 0.3)'" onMouseOut="this.style.background='linear-gradient(135deg, #7dd3fc, #fef3c7)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(125, 211, 252, 0.2)'">Guardar Cambios</button>
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
                rol: document.getElementById('edit-rol').value
            };
            ejecutarEdicion(userIndex, usuario, datosActualizados);
            cerrarModal();
        });

    } catch (error) {
        console.error('Error en abrirModalEdicion:', error);
        showMiniModal('Error al cargar el formulario de edición', 'error');
    }
}

/**
 * Ejecuta la edición de un usuario
 */
async function ejecutarEdicion(userIndex, usuario, datosActualizados) {
    try {
        const success = await authModel.updateUser(usuario.uid, datosActualizados);
        
        if (success) {
            showMiniModal('Usuario actualizado correctamente', 'success');
            
            eventBus.emit(EVENT_NAMES.USER_UPDATED, { 
                userId: usuario.uid, 
                original: usuario,
                updated: datosActualizados,
                changes: datosActualizados,
                timestamp: new Date().toISOString(),
                success: true
            });
            
            await mostrarUsuarios();
        } else {
            eventBus.emit(EVENT_NAMES.USER_UPDATED, { 
                userId: usuario.uid,
                changes: datosActualizados,
                timestamp: new Date().toISOString(),
                success: false,
                error: 'No se pudo actualizar el usuario'
            });
            showMiniModal('Error al actualizar usuario', 'error');
        }
    } catch (error) {
        console.error('Error actualizando usuario:', error);
        showMiniModal('Error al actualizar usuario: ' + error.message, 'error');
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

/**
 * Muestra un modal personalizado para confirmar el reset de contraseña.
 */
async function confirmarResetPassword(userIndex) {
    try {
        const usuarios = await authModel.getAllUsers();
        const usuario = usuarios[userIndex];
        
        if (!usuario) {
            showMiniModal('Usuario no encontrado', 'error');
            return;
        }

        // Verificar que el usuario actual sea admin
        const currentUser = authModel.getCurrentUser();
        if (!currentUser || currentUser.rol !== 'admin') {
            showMiniModal('No tienes permisos para realizar esta acción', 'error');
            return;
        }

        // No permitir reset de contraseña del propio usuario
        if (usuario.uid === currentUser.uid) {
            showMiniModal('No puedes resetear tu propia contraseña', 'error');
            return;
        }

        // Crea el overlay del modal
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.innerHTML = `
            <div class="modal-content-confirm">
                <h3>¿Resetear Contraseña?</h3>
                <p>Estás a punto de resetear la contraseña de <strong>${usuario.nombre} ${usuario.apellidos || ''}</strong>. Se generará una nueva contraseña temporal que deberás compartir con el usuario.</p>
                <div class="confirm-actions">
                    <button class="btn-cancel">Cancelar</button>
                    <button class="btn-confirm-reset">Resetear Contraseña</button>
                </div>
            </div>`;

        document.body.appendChild(modalOverlay);

        const cerrarModal = () => document.body.removeChild(modalOverlay);
        modalOverlay.querySelector('.btn-cancel').onclick = cerrarModal;
        modalOverlay.querySelector('.btn-confirm-reset').onclick = () => {
            ejecutarResetPassword(userIndex, usuario);
            cerrarModal();
        };
        modalOverlay.onclick = (e) => { if (e.target === modalOverlay) cerrarModal(); };

    } catch (error) {
        console.error('Error en confirmarResetPassword:', error);
        showMiniModal('Error al procesar la solicitud', 'error');
    }
}

/**
 * Ejecuta el reset de contraseña de un usuario
 */
async function ejecutarResetPassword(userIndex, usuario) {
    try {
        // Llamar a la función del modelo que almacena la contraseña temporal en Firestore
        const result = await authModel.resetUserPassword(usuario.uid);
        const nuevaContrasena = result.temporaryPassword;
        
        if (result) {
            // Mostrar modal con la nueva contraseña
            mostrarNuevaContrasenaUsuario(usuario, nuevaContrasena);
            
            eventBus.emit('user-password-reset', { 
                user: usuario,
                userId: usuario.uid,
                timestamp: new Date().toISOString(),
                success: true
            });
        } else {
            showMiniModal('Error al resetear contraseña', 'error');
        }
    } catch (error) {
        console.error('Error reseteando contraseña:', error);
        showMiniModal('Error al resetear contraseña: ' + error.message, 'error');
    }
}

/**
 * Muestra un modal con la nueva contraseña temporal del usuario
 */
function mostrarNuevaContrasenaUsuario(usuario, nuevaContrasena) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;

    modal.innerHTML = `
        <div class="modal-content" style="
            background: white;
            border-radius: 12px;
            padding: 24px;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            text-align: center;
        ">
            <div class="modal-header" style="
                margin-bottom: 20px;
            ">
                <h2 style="margin: 0; color: #1f2937; font-size: 20px;">Nueva Contraseña Generada</h2>
            </div>
            
            <div class="password-info" style="margin-bottom: 24px;">
                <p style="margin-bottom: 16px; color: #374151;">
                    Se ha generado una nueva contraseña temporal para <strong>${usuario.nombre} ${usuario.apellidos || ''}</strong>
                </p>
                
                <div class="password-display" style="
                    background: #f3f4f6;
                    border: 2px dashed #d1d5db;
                    border-radius: 8px;
                    padding: 16px;
                    margin-bottom: 16px;
                    font-family: monospace;
                    font-size: 18px;
                    font-weight: bold;
                    color: #1f2937;
                    word-break: break-all;
                ">
                    ${nuevaContrasena}
                </div>
                
                <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
                    ⚠️ <strong>Importante:</strong> Esta contraseña temporal se aplicará automáticamente cuando el usuario inicie sesión. 
                    El usuario deberá cambiar su contraseña inmediatamente después de iniciar sesión por primera vez con esta contraseña temporal.
                </p>
            </div>
            
            <div class="modal-actions" style="display: flex; gap: 12px; justify-content: center;">
                <button id="copyPasswordBtn" class="btn btn-primary" style="
                    background: #3b82f6;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                ">
                    <i class="fas fa-copy"></i>
                    Copiar
                </button>
                <button id="printPasswordBtn" class="btn btn-secondary" style="
                    background: #6b7280;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                ">
                    <i class="fas fa-print"></i>
                    Imprimir
                </button>
                <button id="closePasswordModal" class="btn btn-secondary" style="
                    background: #ef4444;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                ">Cerrar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    const copyBtn = modal.querySelector('#copyPasswordBtn');
    const printBtn = modal.querySelector('#printPasswordBtn');
    const closeBtn = modal.querySelector('#closePasswordModal');

    copyBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(nuevaContrasena);
            copyBtn.innerHTML = '<i class="fas fa-check"></i> ¡Copiado!';
            copyBtn.style.background = '#10b981';
            setTimeout(() => {
                copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copiar';
                copyBtn.style.background = '#3b82f6';
            }, 2000);
        } catch (error) {
            console.error('Error copiando contraseña:', error);
            alert('Error al copiar la contraseña');
        }
    });

    printBtn.addEventListener('click', () => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Credenciales de Usuario - ${usuario.nombre}</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 40px; }
                        .credentials { 
                            border: 2px solid #333; 
                            padding: 20px; 
                            border-radius: 10px; 
                            display: inline-block; 
                            margin: 20px 0;
                        }
                        .password { 
                            font-size: 24px; 
                            font-weight: bold; 
                            font-family: monospace; 
                            background: #f0f0f0; 
                            padding: 10px; 
                            border-radius: 5px; 
                            margin: 10px 0;
                        }
                        .warning { color: #d32f2f; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <h1>Credenciales de Usuario</h1>
                    <div class="credentials">
                        <h2>${usuario.nombre} ${usuario.apellidos || ''}</h2>
                        <p><strong>Email:</strong> ${usuario.email}</p>
                        <p><strong>Contraseña Temporal:</strong></p>
                        <div class="password">${nuevaContrasena}</div>
                        <p class="warning">⚠️ Importante: Cambia esta contraseña en tu primer inicio de sesión</p>
                    </div>
                    <p>Fecha de generación: ${new Date().toLocaleString()}</p>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    });

    closeBtn.addEventListener('click', () => {
        modal.remove();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}