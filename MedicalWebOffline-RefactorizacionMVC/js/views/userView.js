// js/views/userView.js - Vista para gestión de usuarios con Firebase
import { authModel } from '../models/storageModel.js';
import { gestionModel } from '../models/gestionModel.js';
import eventBus, { EVENT_NAMES } from '../utils/eventBus.js';
import { mostrarModalCambioContrasena } from '../utils/passwordModal.js';
import { mostrarCredencialesUsuario } from '../utils/credentialsModal.js';

let contenedorUsuarios = null;

// Agregar estilos CSS para los modales
const modalStyles = `
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        backdrop-filter: blur(5px);
        -webkit-backdrop-filter: blur(5px);
    }
    
    .modal-content-confirm {
        background: linear-gradient(135deg, #f8fafc, #e2e8f0);
        border-radius: 20px;
        padding: 30px;
        max-width: 450px;
        width: 90%;
        text-align: center;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
    }
    
    .modal-content-confirm h3 {
        margin: 0 0 20px 0;
        color: #1f2937;
        font-size: 1.5rem;
        font-weight: 600;
    }
    
    .modal-content-confirm p {
        margin: 0 0 30px 0;
        color: #4b5563;
        line-height: 1.6;
    }
    
    .confirm-actions {
        display: flex;
        justify-content: center;
        gap: 15px;
    }
    
    .btn-cancel, .btn-confirm-delete {
        padding: 12px 24px;
        border: none;
        border-radius: 25px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 14px;
    }
    
    .btn-cancel {
        background: linear-gradient(135deg, #e5e7eb, #f3f4f6);
        color: #1f2937;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }
    
    .btn-cancel:hover {
        background: linear-gradient(135deg, #d1d5db, #e5e7eb);
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
    }
    
    .btn-confirm-delete {
        background: linear-gradient(135deg, #ef4444, #dc2626);
        color: white;
        box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
    }
    
    .btn-confirm-delete:hover {
        background: linear-gradient(135deg, #dc2626, #b91c1c);
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
    }
`;

// Inyectar estilos una sola vez
if (!document.getElementById('modal-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'modal-styles';
    styleSheet.textContent = modalStyles;
    document.head.appendChild(styleSheet);
}

/**
 * Se ejecuta UNA SOLA VEZ al cargar la página.
 * Aquí es donde configuramos los "escuchadores" de eventos permanentes.
 */
export function init() {
    console.log('UserView: Inicializando vista de usuarios');
    
    contenedorUsuarios = document.getElementById('personalLista');
    if (!contenedorUsuarios) {
        console.error('Contenedor de usuarios no encontrado. La vista no puede funcionar.');
        return;
    }
    
    // Configurar event listeners
    configurarOyenteDeEventosPrincipal();

    // Escucha eventos del sistema para saber cuándo redibujar la lista
    eventBus.on('usuarios-updated', mostrarUsuarios);
    eventBus.on(EVENT_NAMES.USER_CREATED, mostrarUsuarios);
    eventBus.on(EVENT_NAMES.USER_UPDATED, mostrarUsuarios);
    eventBus.on(EVENT_NAMES.USER_DELETED, mostrarUsuarios);

    console.log('UserView: Vista inicializada correctamente');
}

/**
 * Dibuja o redibuja la lista completa de usuarios.
 */
export async function mostrarUsuarios() {
    if (!contenedorUsuarios) {
        console.error('Contenedor de usuarios no disponible');
        return;
    }

    try {
        // Mostrar loading
        contenedorUsuarios.innerHTML = `
            <div class="loading-message" style="text-align: center; padding: 20px;">
                <i class="fas fa-spinner fa-spin"></i> Cargando usuarios...
            </div>
        `;
        
        const usuarios = await authModel.getAllUsers();
        console.log('UserView: Usuarios obtenidos:', usuarios.length);
        
        if (!usuarios || usuarios.length === 0) {
            contenedorUsuarios.innerHTML = `
                <div class="welcome-message" style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-users" style="font-size: 48px; margin-bottom: 20px; display: block;"></i>
                    <h3>No hay usuarios registrados</h3>
                    <p>Utiliza el formulario "Nuevo Usuario" para agregar el primer usuario al sistema.</p>
                </div>
            `;
            return;
        }

        contenedorUsuarios.innerHTML = usuarios.map((usuario) => {
            const iconoRol = usuario.rol === 'admin' ? 
                '<i class="fas fa-user-shield" style="color: #10b981;"></i>' : 
                '<i class="fas fa-user-graduate" style="color: #3b82f6;"></i>';
                
            const badgeRol = usuario.rol === 'admin' ? 
                '<span class="badge-admin" style="background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">ADMIN</span>' : 
                '<span class="badge-practicante" style="background: #3b82f6; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">PRACTICANTE</span>';

            return `
                <div class="personal-item" data-user-id="${usuario.uid}" style="
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    padding: 16px;
                    margin-bottom: 12px;
                    background: white;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <div class="user-info-container" style="display: flex; align-items: center; gap: 12px;">
                        <div class="user-icon" style="font-size: 24px;">
                            ${iconoRol}
                        </div>
                        <div>
                            <h4 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600;">
                                ${usuario.nombre} ${usuario.apellidos || ''}
                            </h4>
                            <p style="margin: 0; font-size: 14px; color: #666;">
                                <strong>Email:</strong> ${usuario.correo || usuario.email} | 
                                <strong>Matrícula:</strong> ${usuario.matricula}
                            </p>
                            <div class="badge-container" style="margin-top: 4px;">
                                ${badgeRol}
                            </div>
                        </div>
                    </div>
                    <div class="user-actions-container" style="display: flex; gap: 8px;">
                        <button class="btn-change-password" data-user-id="${usuario.uid}" title="Cambiar contraseña (solo tú)" style="
                            background: #f59e0b;
                            color: white;
                            border: none;
                            padding: 8px;
                            border-radius: 4px;
                            cursor: pointer;
                        ">
                            <i class="fas fa-key"></i>
                        </button>
                        <button class="btn-reset-password" data-user-id="${usuario.uid}" title="Resetear contraseña (admin)" style="
                            background: #8b5cf6;
                            color: white;
                            border: none;
                            padding: 8px;
                            border-radius: 4px;
                            cursor: pointer;
                        ">
                            <i class="fas fa-undo"></i>
                        </button>
                        <button class="btn-edit-user" data-user-id="${usuario.uid}" title="Editar usuario" style="
                            background: #3b82f6;
                            color: white;
                            border: none;
                            padding: 8px;
                            border-radius: 4px;
                            cursor: pointer;
                        ">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-delete-user" data-user-id="${usuario.uid}" title="Eliminar usuario" style="
                            background: #ef4444;
                            color: white;
                            border: none;
                            padding: 8px;
                            border-radius: 4px;
                            cursor: pointer;
                        ">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        console.log('UserView: Lista de usuarios renderizada');
        
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
    if (!contenedorUsuarios) return;
    
    contenedorUsuarios.addEventListener('click', async (e) => {
        const changePasswordButton = e.target.closest('.btn-change-password');
        if (changePasswordButton) {
            // Solo permitir cambio de contraseña si es el usuario actual
            const currentUser = authModel.getCurrentUser();
            const targetUserId = changePasswordButton.dataset.userId;
            
            if (currentUser && currentUser.uid === targetUserId) {
                mostrarModalCambioContrasena();
            } else {
                alert('Solo puedes cambiar tu propia contraseña. Para resetear la contraseña de otro usuario, usa el botón de resetear (🔄).');
            }
            return;
        }

        const resetPasswordButton = e.target.closest('.btn-reset-password');
        if (resetPasswordButton) {
            const currentUser = authModel.getCurrentUser();
            const targetUserId = resetPasswordButton.dataset.userId;
            
            // Solo permitir reseteo si es admin y no es el mismo usuario
            if (currentUser && currentUser.rol === 'admin') {
                if (currentUser.uid === targetUserId) {
                    alert('Para cambiar tu propia contraseña, usa el botón amarillo (🔑).');
                    return;
                }
                
                const confirmReset = confirm('¿Estás seguro de que quieres resetear la contraseña de este usuario? Se generará una nueva contraseña temporal.');
                if (confirmReset) {
                    try {
                        const resetResult = await authModel.resetUserPassword(targetUserId);
                        mostrarCredencialesUsuario(resetResult, true);
                    } catch (error) {
                        console.error('Error reseteando contraseña:', error);
                        alert('Error al resetear la contraseña: ' + error.message);
                    }
                }
            } else {
                alert('Solo los administradores pueden resetear contraseñas de otros usuarios.');
            }
            return;
        }

        const editButton = e.target.closest('.btn-edit-user');
        if (editButton) {
            const userId = editButton.dataset.userId;
            await abrirModalEdicion(userId);
            return;
        }

        const deleteButton = e.target.closest('.btn-delete-user');
        if (deleteButton) {
            const userId = deleteButton.dataset.userId;
            await confirmarEliminacion(userId);
        }
    });
}

/**
 * Muestra un modal personalizado para confirmar la eliminación.
 */
async function confirmarEliminacion(userId) {
    try {
        const usuarios = await authModel.getAllUsers();
        const usuario = usuarios.find(u => u.uid === userId);
        
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
            ejecutarEliminacion(userId, usuario);
            cerrarModal();
        };
        modalOverlay.onclick = (e) => { if (e.target === modalOverlay) cerrarModal(); };

    } catch (error) {
        console.error('Error en confirmarEliminacion:', error);
        showMiniModal('Error al cargar datos del usuario', 'error');
    }
}

async function ejecutarEliminacion(userId, usuario) {
    try {
        const success = await authModel.deleteUser(userId);
        
        if (success) {
            showMiniModal('Usuario eliminado correctamente', 'success');
            eventBus.emit(EVENT_NAMES.USER_DELETED, { 
                user: usuario,
                userId: userId,
                timestamp: new Date().toISOString(),
                success: true
            });
            await mostrarUsuarios();
        } else {
            eventBus.emit(EVENT_NAMES.USER_DELETED, { 
                userId: userId,
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
async function abrirModalEdicion(userId) {
    try {
        const usuarios = await authModel.getAllUsers();
        const usuario = usuarios.find(u => u.uid === userId);
        
        if (!usuario) {
            showMiniModal('Error: No se pudo cargar la información del usuario.', 'error');
            return;
        }

        // Emitir evento de solicitud de edición
        eventBus.emit(EVENT_NAMES.USER_EDIT_REQUESTED, { 
            user: usuario,
            userId: userId,
            timestamp: new Date().toISOString()
        });

        // Cargar grupos para el select
        const grupos = await gestionModel.getGrupos();
        
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
                                ${grupos.map(g => `<option value="${g.id}" ${usuario.grupoId === g.id ? 'selected' : ''}>${g.nombre}</option>`).join('')}
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
            ejecutarEdicion(userId, usuario, datosActualizados);
            cerrarModal();
        });

    } catch (error) {
        console.error('Error en abrirModalEdicion:', error);
        showMiniModal('Error al cargar el formulario de edición', 'error');
    }
}

async function ejecutarEdicion(userId, usuarioOriginal, datosActualizados) {
    try {
        const success = await authModel.updateUser(userId, datosActualizados);
        
        if (success) {
            showMiniModal('Usuario actualizado correctamente', 'success');
            
            eventBus.emit(EVENT_NAMES.USER_UPDATED, { 
                userId, 
                original: usuarioOriginal,
                updated: datosActualizados,
                changes: datosActualizados,
                timestamp: new Date().toISOString(),
                success: true
            });
            
            await mostrarUsuarios();
        } else {
            eventBus.emit(EVENT_NAMES.USER_UPDATED, { 
                userId,
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
 * Muestra información del perfil del usuario actual
 */
export function mostrarPerfilUsuario() {
    console.log('UserView: mostrarPerfilUsuario called');
    console.trace('UserView: Call stack for mostrarPerfilUsuario');
    
    // Usar el contenedor específico para el perfil, no el de la lista de usuarios
    const profileContainer = document.getElementById('profileContainer');
    
    if (!profileContainer) {
        console.error('UserView: Contenedor de perfil no disponible');
        return;
    }

    console.log('UserView: profileContainer found:', profileContainer);

    const currentUser = authModel.getCurrentUser();
    console.log('UserView: currentUser:', currentUser);
    
    if (!currentUser) {
        console.log('UserView: No hay usuario autenticado');
        profileContainer.innerHTML = `
            <div class="error-message" style="text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 20px; display: block; color: #f59e0b;"></i>
                <h3>No hay usuario autenticado</h3>
                <p>Inicia sesión para ver tu perfil.</p>
            </div>
        `;
        return;
    }

    console.log('UserView: Renderizando perfil para usuario:', currentUser.nombre);

    profileContainer.innerHTML = `
        <div class="profile-container" style="max-width: 600px; margin: 0 auto;">
            <div class="profile-header" style="
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                border-radius: 12px 12px 0 0;
                text-align: center;
            ">
                <div class="profile-avatar" style="
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 32px;
                    margin: 0 auto 20px;
                ">
                    ${currentUser.rol === 'admin' ? '👨‍⚕️' : '👨‍🎓'}
                </div>
                <h2 style="margin: 0 0 10px 0;">${currentUser.nombre} ${currentUser.apellidos || ''}</h2>
                <div class="role-badge" style="
                    background: rgba(255, 255, 255, 0.2);
                    padding: 8px 16px;
                    border-radius: 20px;
                    display: inline-block;
                    font-size: 14px;
                    font-weight: 600;
                ">
                    ${currentUser.rol === 'admin' ? '🛡️ ADMINISTRADOR' : '📚 PRACTICANTE'}
                </div>
            </div>

            <div class="profile-content" style="
                background: white;
                border: 1px solid #e5e7eb;
                border-top: none;
                border-radius: 0 0 12px 12px;
                padding: 30px;
            ">
                <h3 style="margin: 0 0 20px 0; color: #374151; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">
                    📋 Información Personal
                </h3>
                
                <div class="profile-info-grid" style="display: grid; gap: 15px;">
                    <div class="info-item" style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 12px;
                        background: #f9fafb;
                        border-radius: 8px;
                    ">
                        <span style="font-weight: 600; color: #6b7280;">📧 Email:</span>
                        <span style="color: #374151;">${currentUser.correo || currentUser.email}</span>
                    </div>

                    ${currentUser.matricula ? `
                    <div class="info-item" style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 12px;
                        background: #f9fafb;
                        border-radius: 8px;
                    ">
                        <span style="font-weight: 600; color: #6b7280;">🆔 Matrícula:</span>
                        <span style="color: #374151;">${currentUser.matricula}</span>
                    </div>
                    ` : ''}

                    ${currentUser.edad ? `
                    <div class="info-item" style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 12px;
                        background: #f9fafb;
                        border-radius: 8px;
                    ">
                        <span style="font-weight: 600; color: #6b7280;">🎂 Edad:</span>
                        <span style="color: #374151;">${currentUser.edad} años</span>
                    </div>
                    ` : ''}

                    ${currentUser.sexo ? `
                    <div class="info-item" style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 12px;
                        background: #f9fafb;
                        border-radius: 8px;
                    ">
                        <span style="font-weight: 600; color: #6b7280;">👤 Sexo:</span>
                        <span style="color: #374151;">${currentUser.sexo}</span>
                    </div>
                    ` : ''}

                    ${currentUser.grupo_trabajo ? `
                    <div class="info-item" style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 12px;
                        background: #f9fafb;
                        border-radius: 8px;
                    ">
                        <span style="font-weight: 600; color: #6b7280;">👥 Grupo:</span>
                        <span style="color: #374151;">${currentUser.grupo_trabajo}</span>
                    </div>
                    ` : ''}
                </div>

                <h3 style="margin: 30px 0 20px 0; color: #374151; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px;">
                    🔐 Seguridad
                </h3>

                <div class="security-actions" style="display: flex; gap: 15px; flex-wrap: wrap;">
                    <button id="change-my-password" style="
                        background: linear-gradient(135deg, #f59e0b, #d97706);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        padding: 12px 20px;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    ">
                        <i class="fas fa-key"></i>
                        Cambiar Contraseña
                    </button>

                    <button id="view-activity-log" style="
                        background: linear-gradient(135deg, #3b82f6, #2563eb);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        padding: 12px 20px;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    ">
                        <i class="fas fa-history"></i>
                        Ver Actividad
                    </button>
                </div>

                <div class="profile-footer" style="
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e5e7eb;
                    text-align: center;
                    color: #6b7280;
                    font-size: 12px;
                ">
                    <p style="margin: 0;">
                        UID: ${currentUser.uid}<br>
                        Última actualización: ${new Date().toLocaleString()}
                    </p>
                </div>
            </div>
        </div>
    `;

    // Event listeners para los botones del perfil
    const changePasswordBtn = document.getElementById('change-my-password');
    const viewActivityBtn = document.getElementById('view-activity-log');

    console.log('UserView: Setting up profile event listeners');
    console.log('UserView: changePasswordBtn:', changePasswordBtn);
    console.log('UserView: viewActivityBtn:', viewActivityBtn);

    changePasswordBtn?.addEventListener('click', () => {
        console.log('UserView: Change password button clicked');
        mostrarModalCambioContrasena();
    });

    viewActivityBtn?.addEventListener('click', () => {
        console.log('UserView: View activity button clicked');
        alert('Función de log de actividad en desarrollo');
    });

    console.log('UserView: Profile rendered successfully');
}

console.log('UserView: Módulo cargado');