// userView.js - Vista para gestion de usuarios
import { authModel } from '../models/storageModel.js';
import eventBus from '../utils/eventBus.js';

let contenedorUsuarios = null;

export function init() {
    console.log('Inicializando userView...');
    contenedorUsuarios = document.getElementById('personalLista');
    eventBus.on('usuarios-updated', mostrarUsuarios);
    mostrarUsuarios();
}

export function mostrarUsuarios() {
    if (!contenedorUsuarios) {
        console.error('Contenedor no disponible');
        return;
    }

    const usuarios = authModel.getAllUsers();
    if (usuarios.length === 0) {
        contenedorUsuarios.innerHTML = `
            <div style="text-align: center; color: #6b7280; font-size: 1.1rem; padding: 20px;">
                No hay usuarios registrados en el sistema.
            </div>
        `;
        return;
    }

    let html = '';
    usuarios.forEach((usuario, index) => {
        // Icono según el rol
        const iconoRol = usuario.rol === 'admin' ? 
            '<i class="fas fa-user-shield" style="color: #dc2626; font-size: 1.2rem;"></i>' : 
            '<i class="fas fa-user-graduate" style="color: #059669; font-size: 1.2rem;"></i>';
        
        const badgeRol = usuario.rol === 'admin' ? 
            '<span style="background: #dc2626; color: white; padding: 3px 8px; border-radius: 10px; font-size: 0.75rem; font-weight: 500;">ADMIN</span>' :
            '<span style="background: #059669; color: white; padding: 3px 8px; border-radius: 10px; font-size: 0.75rem; font-weight: 500;">PRACTICANTE</span>';

        html += `
            <div class="personal-item" data-user-index="${index}" style="
                background: rgba(255, 255, 255, 0.9);
                backdrop-filter: blur(10px);
                border: 2px solid rgba(125, 211, 252, 0.3);
                border-radius: 15px;
                padding: 20px;
                margin-bottom: 15px;
                box-shadow: 0 4px 15px rgba(125, 211, 252, 0.2);
                transition: all 0.3s ease;
                display: flex;
                justify-content: space-between;
                align-items: center;
            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(125, 211, 252, 0.3)';" 
               onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(125, 211, 252, 0.2)';">
                
                <div style="display: flex; align-items: center; gap: 15px; flex-grow: 1;">
                    <div style="
                        width: 50px; 
                        height: 50px; 
                        border-radius: 50%; 
                        background: linear-gradient(135deg, #7dd3fc, #fef3c7);
                        display: flex; 
                        align-items: center; 
                        justify-content: center;
                        border: 2px solid rgba(125, 211, 252, 0.5);
                    ">
                        ${iconoRol}
                    </div>
                    
                    <div>
                        <h4 style="
                            margin: 0 0 5px 0; 
                            color: #1f2937; 
                            font-size: 1.1rem; 
                            font-weight: 600;
                        ">${usuario.nombre} ${usuario.apellidos || ''}</h4>
                        
                        <div style="display: flex; flex-direction: column; gap: 2px;">
                            <p style="
                                margin: 0; 
                                color: #6b7280; 
                                font-size: 0.9rem;
                            "><strong>ID:</strong> ${usuario.id}</p>
                            
                            <p style="
                                margin: 0; 
                                color: #6b7280; 
                                font-size: 0.9rem;
                            "><strong>Matrícula:</strong> ${usuario.matricula}</p>
                            
                            <div style="margin-top: 5px;">
                                ${badgeRol}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px;">
                    <button class="btn-edit-user" data-user-index="${index}" title="Editar usuario" style="
                        background: linear-gradient(135deg, #7dd3fc, #fef3c7);
                        border: none;
                        border-radius: 10px;
                        width: 40px;
                        height: 40px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        color: #1f2937;
                        font-size: 1rem;
                    " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                        <i class="fas fa-edit"></i>
                    </button>
                    
                    <button class="btn-delete-user" data-user-index="${index}" title="Eliminar usuario" style="
                        background: linear-gradient(135deg, #f87171, #fca5a5);
                        border: none;
                        border-radius: 10px;
                        width: 40px;
                        height: 40px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        color: white;
                        font-size: 1rem;
                    " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;
    });

    contenedorUsuarios.innerHTML = html;
    configurarBotonesUsuarios();
}

function configurarBotonesUsuarios() {
    document.querySelectorAll('.btn-delete-user').forEach(boton => {
        boton.addEventListener('click', (e) => {
            const userIndex = parseInt(e.target.dataset.userIndex);
            confirmarEliminacion(userIndex);
        });
    });

    document.querySelectorAll('.btn-edit-user').forEach(boton => {
        boton.addEventListener('click', (e) => {
            const userIndex = parseInt(e.target.dataset.userIndex);
            abrirModalEdicion(userIndex);
        });
    });
}

function confirmarEliminacion(userIndex) {
    const usuario = authModel.getUserByIndex(userIndex);
    
    if (!usuario) {
        showMiniModal('Usuario no encontrado', 'error');
        return;
    }

    // Crear modal de confirmación elegante
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(5px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    modal.innerHTML = `
        <div style="
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border: 2px solid rgba(125, 211, 252, 0.3);
            border-radius: 20px;
            padding: 30px;
            text-align: center;
            box-shadow: 0 8px 25px rgba(125, 211, 252, 0.2);
            max-width: 400px;
            width: 90%;
        ">
            <h3 style="
                margin: 0 0 20px 0;
                color: #1f2937;
                font-size: 1.3rem;
                font-weight: 600;
            ">¿Eliminar Usuario?</h3>
            <p style="
                margin: 0 0 25px 0;
                color: #374151;
                font-size: 1rem;
            ">¿Está seguro de eliminar al usuario <strong>"${usuario.nombre}"</strong>?<br>
            Esta acción no se puede deshacer.</p>
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button id="cancelar-eliminar" style="
                    background: linear-gradient(135deg, #e5e7eb, #d1d5db);
                    border: none;
                    border-radius: 20px;
                    padding: 10px 25px;
                    color: #374151;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.3s ease;
                ">Cancelar</button>
                <button id="confirmar-eliminar" style="
                    background: linear-gradient(135deg, #f87171, #fca5a5);
                    border: none;
                    border-radius: 20px;
                    padding: 10px 25px;
                    color: white;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.3s ease;
                ">Eliminar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Eventos
    modal.querySelector('#cancelar-eliminar').addEventListener('click', () => {
        modal.remove();
    });

    modal.querySelector('#confirmar-eliminar').addEventListener('click', () => {
        modal.remove();
        ejecutarEliminacion(userIndex);
    });

    // Cerrar al hacer clic fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function ejecutarEliminacion(userIndex) {
    try {
        const exito = authModel.deleteUser(userIndex);
        if (exito) {
            showMiniModal('Usuario eliminado correctamente', 'success');
            mostrarUsuarios();
            eventBus.emit('usuarios-updated');
        } else {
            showMiniModal('Error al eliminar usuario', 'error');
        }
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        showMiniModal('Error al eliminar usuario', 'error');
    }
}

function abrirModalEdicion(userIndex) {
    const usuario = authModel.getUserByIndex(userIndex);
    
    if (!usuario) {
        showMiniModal('Usuario no encontrado', 'error');
        return;
    }

    // Crear modal de edición elegante
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(5px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    modal.innerHTML = `
        <div style="
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border: 2px solid rgba(125, 211, 252, 0.3);
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 8px 25px rgba(125, 211, 252, 0.2);
            max-width: 600px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
        ">
            <h3 style="
                margin: 0 0 25px 0;
                color: #1f2937;
                font-size: 1.4rem;
                font-weight: 600;
                text-align: center;
            ">Editar Usuario</h3>
            
            <form id="form-editar-usuario">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <label style="
                            display: block;
                            font-size: 1rem;
                            font-weight: 600;
                            margin-bottom: 8px;
                            background: linear-gradient(135deg, #06b6d4, #0891b2);
                            -webkit-background-clip: text;
                            -webkit-text-fill-color: transparent;
                            background-clip: text;
                        ">Nombre:</label>
                        <input type="text" id="edit-nombre" value="${usuario.nombre || ''}" required style="
                            width: 100%;
                            padding: 12px 16px;
                            border: 2px solid rgba(125, 211, 252, 0.3);
                            border-radius: 10px;
                            font-size: 1rem;
                            transition: all 0.3s ease;
                            background: rgba(255, 255, 255, 0.9);
                            box-sizing: border-box;
                        ">
                    </div>

                    <div>
                        <label style="
                            display: block;
                            font-size: 1rem;
                            font-weight: 600;
                            margin-bottom: 8px;
                            background: linear-gradient(135deg, #06b6d4, #0891b2);
                            -webkit-background-clip: text;
                            -webkit-text-fill-color: transparent;
                            background-clip: text;
                        ">Apellidos:</label>
                        <input type="text" id="edit-apellidos" value="${usuario.apellidos || ''}" style="
                            width: 100%;
                            padding: 12px 16px;
                            border: 2px solid rgba(125, 211, 252, 0.3);
                            border-radius: 10px;
                            font-size: 1rem;
                            transition: all 0.3s ease;
                            background: rgba(255, 255, 255, 0.9);
                            box-sizing: border-box;
                        ">
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <label style="
                            display: block;
                            font-size: 1rem;
                            font-weight: 600;
                            margin-bottom: 8px;
                            background: linear-gradient(135deg, #06b6d4, #0891b2);
                            -webkit-background-clip: text;
                            -webkit-text-fill-color: transparent;
                            background-clip: text;
                        ">Edad:</label>
                        <input type="number" id="edit-edad" value="${usuario.edad || ''}" min="1" max="100" style="
                            width: 100%;
                            padding: 12px 16px;
                            border: 2px solid rgba(125, 211, 252, 0.3);
                            border-radius: 10px;
                            font-size: 1rem;
                            transition: all 0.3s ease;
                            background: rgba(255, 255, 255, 0.9);
                            box-sizing: border-box;
                        ">
                    </div>

                    <div>
                        <label style="
                            display: block;
                            font-size: 1rem;
                            font-weight: 600;
                            margin-bottom: 8px;
                            background: linear-gradient(135deg, #06b6d4, #0891b2);
                            -webkit-background-clip: text;
                            -webkit-text-fill-color: transparent;
                            background-clip: text;
                        ">Sexo:</label>
                        <select id="edit-sexo" style="
                            width: 100%;
                            padding: 12px 16px;
                            border: 2px solid rgba(125, 211, 252, 0.3);
                            border-radius: 10px;
                            font-size: 1rem;
                            transition: all 0.3s ease;
                            background: rgba(255, 255, 255, 0.9);
                            box-sizing: border-box;
                        ">
                            <option value="">Seleccionar</option>
                            <option value="M" ${usuario.sexo === 'M' ? 'selected' : ''}>Masculino</option>
                            <option value="F" ${usuario.sexo === 'F' ? 'selected' : ''}>Femenino</option>
                        </select>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <label style="
                            display: block;
                            font-size: 1rem;
                            font-weight: 600;
                            margin-bottom: 8px;
                            background: linear-gradient(135deg, #06b6d4, #0891b2);
                            -webkit-background-clip: text;
                            -webkit-text-fill-color: transparent;
                            background-clip: text;
                        ">Matrícula:</label>
                        <input type="text" id="edit-matricula" value="${usuario.matricula || ''}" required style="
                            width: 100%;
                            padding: 12px 16px;
                            border: 2px solid rgba(125, 211, 252, 0.3);
                            border-radius: 10px;
                            font-size: 1rem;
                            transition: all 0.3s ease;
                            background: rgba(255, 255, 255, 0.9);
                            box-sizing: border-box;
                        ">
                    </div>

                    <div>
                        <label style="
                            display: block;
                            font-size: 1rem;
                            font-weight: 600;
                            margin-bottom: 8px;
                            background: linear-gradient(135deg, #06b6d4, #0891b2);
                            -webkit-background-clip: text;
                            -webkit-text-fill-color: transparent;
                            background-clip: text;
                        ">Mesa de Salud:</label>
                        <input type="number" id="edit-mesa" value="${usuario.mesa || ''}" min="1" style="
                            width: 100%;
                            padding: 12px 16px;
                            border: 2px solid rgba(125, 211, 252, 0.3);
                            border-radius: 10px;
                            font-size: 1rem;
                            transition: all 0.3s ease;
                            background: rgba(255, 255, 255, 0.9);
                            box-sizing: border-box;
                        ">
                    </div>
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="
                        display: block;
                        font-size: 1rem;
                        font-weight: 600;
                        margin-bottom: 8px;
                        background: linear-gradient(135deg, #06b6d4, #0891b2);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                    ">Rol:</label>
                    <select id="edit-rol" required style="
                        width: 100%;
                        padding: 12px 16px;
                        border: 2px solid rgba(125, 211, 252, 0.3);
                        border-radius: 10px;
                        font-size: 1rem;
                        transition: all 0.3s ease;
                        background: rgba(255, 255, 255, 0.9);
                        box-sizing: border-box;
                    ">
                        <option value="admin" ${usuario.rol === 'admin' ? 'selected' : ''}>Administrador</option>
                        <option value="practicante" ${usuario.rol === 'practicante' ? 'selected' : ''}>Practicante</option>
                    </select>
                </div>

                <div style="margin-bottom: 25px;">
                    <label style="
                        display: block;
                        font-size: 1rem;
                        font-weight: 600;
                        margin-bottom: 8px;
                        background: linear-gradient(135deg, #06b6d4, #0891b2);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                    ">Nueva Contraseña (opcional):</label>
                    <input type="password" id="edit-contrasena" placeholder="Dejar vacío para mantener la actual" style="
                        width: 100%;
                        padding: 12px 16px;
                        border: 2px solid rgba(125, 211, 252, 0.3);
                        border-radius: 10px;
                        font-size: 1rem;
                        transition: all 0.3s ease;
                        background: rgba(255, 255, 255, 0.9);
                        box-sizing: border-box;
                    ">
                </div>

                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button type="button" id="cancelar-edicion" style="
                        background: linear-gradient(135deg, #e5e7eb, #d1d5db);
                        border: none;
                        border-radius: 20px;
                        padding: 12px 25px;
                        color: #374151;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    ">Cancelar</button>
                    <button type="submit" style="
                        background: linear-gradient(135deg, #7dd3fc, #fef3c7);
                        border: none;
                        border-radius: 20px;
                        padding: 12px 25px;
                        color: #1f2937;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    ">Guardar Cambios</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // Eventos
    modal.querySelector('#cancelar-edicion').addEventListener('click', () => {
        modal.remove();
    });

    modal.querySelector('#form-editar-usuario').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const nombre = modal.querySelector('#edit-nombre').value.trim();
        const matricula = modal.querySelector('#edit-matricula').value.trim();
        const rol = modal.querySelector('#edit-rol').value;

        if (!nombre || !matricula || !rol) {
            showMiniModal('Todos los campos son obligatorios', 'error');
            return;
        }

        if (rol !== 'admin' && rol !== 'practicante') {
            showMiniModal('Rol debe ser admin o practicante', 'error');
            return;
        }

        modal.remove();
        ejecutarEdicion(userIndex, { nombre, matricula, rol });
    });

    // Cerrar al hacer clic fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Focus en el primer campo
    setTimeout(() => {
        modal.querySelector('#edit-nombre').focus();
    }, 100);
}

function ejecutarEdicion(userIndex, datosActualizados) {
    try {
        const exito = authModel.updateUser(userIndex, datosActualizados);
        
        if (exito) {
            showMiniModal('Usuario actualizado correctamente', 'success');
            mostrarUsuarios();
            eventBus.emit('usuarios-updated');
        } else {
            showMiniModal('Error al actualizar usuario', 'error');
        }
    } catch (error) {
        console.error('Error actualizando usuario:', error);
        showMiniModal('Error al actualizar usuario', 'error');
    }
}

export function showMiniModal(mensaje, tipo) {
    // Remover notificación existente si hay una
    const existente = document.getElementById('mini-notification');
    if (existente) {
        existente.remove();
    }

    // Crear notificación elegante
    const notificacion = document.createElement('div');
    notificacion.id = 'mini-notification';
    
    let backgroundColor, icon;
    switch (tipo) {
        case 'success':
            backgroundColor = 'linear-gradient(135deg, #10b981, #34d399)';
            icon = '✓';
            break;
        case 'error':
            backgroundColor = 'linear-gradient(135deg, #f87171, #fca5a5)';
            icon = '✕';
            break;
        default:
            backgroundColor = 'linear-gradient(135deg, #7dd3fc, #fef3c7)';
            icon = 'ℹ';
    }

    notificacion.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${backgroundColor};
        color: ${tipo === 'error' ? 'white' : '#1f2937'};
        padding: 15px 20px;
        border-radius: 15px;
        box-shadow: 0 8px 25px rgba(125, 211, 252, 0.3);
        z-index: 15000;
        font-weight: 500;
        font-size: 1rem;
        backdrop-filter: blur(10px);
        border: 2px solid rgba(255, 255, 255, 0.3);
        animation: slideInRight 0.3s ease;
        min-width: 250px;
        display: flex;
        align-items: center;
        gap: 10px;
    `;

    notificacion.innerHTML = `
        <span style="font-size: 1.2rem;">${icon}</span>
        <span>${mensaje}</span>
        <button onclick="this.parentElement.remove()" style="
            background: none;
            border: none;
            color: inherit;
            font-size: 1.1rem;
            cursor: pointer;
            margin-left: auto;
            padding: 0;
            opacity: 0.7;
            transition: opacity 0.3s ease;
        " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">✕</button>
    `;

    // Agregar estilos de animación si no existen
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideInRight {
                from { 
                    transform: translateX(100%); 
                    opacity: 0; 
                }
                to { 
                    transform: translateX(0); 
                    opacity: 1; 
                }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(notificacion);

    // Auto-remover después de 4 segundos
    setTimeout(() => {
        if (notificacion && notificacion.parentNode) {
            notificacion.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => notificacion.remove(), 300);
        }
    }, 4000);
}

export { confirmarEliminacion, abrirModalEdicion };
