// js/utils/passwordModal.js
// Modal para cambio de contraseña de usuario

import { authModel } from '../models/storageModel.js';

export function mostrarModalCambioContrasena() {
    // Crear modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-overlay password-modal';
    modalContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;

    // Crear modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 450px;
        width: 90%;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        position: relative;
    `;

    modalContent.innerHTML = `
        <div class="password-header">
            <div class="password-icon" style="
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: #007bff;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                margin: 0 auto 20px;
            ">🔒</div>
            <h2 style="text-align: center; color: #333; margin-bottom: 10px;">Cambiar Contraseña</h2>
            <p style="text-align: center; color: #666; margin-bottom: 25px;">
                Ingresa tu contraseña actual y la nueva contraseña
            </p>
        </div>

        <form id="password-change-form">
            <div class="form-group" style="margin-bottom: 20px;">
                <label for="current-password" style="
                    display: block;
                    font-weight: bold;
                    color: #495057;
                    margin-bottom: 8px;
                ">Contraseña Actual:</label>
                <div style="position: relative;">
                    <input type="password" id="current-password" required style="
                        width: 100%;
                        padding: 12px 40px 12px 12px;
                        border: 2px solid #dee2e6;
                        border-radius: 6px;
                        font-size: 14px;
                        box-sizing: border-box;
                        transition: border-color 0.2s;
                    ">
                    <button type="button" class="toggle-password" data-target="current-password" style="
                        position: absolute;
                        right: 10px;
                        top: 50%;
                        transform: translateY(-50%);
                        background: none;
                        border: none;
                        cursor: pointer;
                        font-size: 16px;
                    ">👁️</button>
                </div>
            </div>

            <div class="form-group" style="margin-bottom: 20px;">
                <label for="new-password" style="
                    display: block;
                    font-weight: bold;
                    color: #495057;
                    margin-bottom: 8px;
                ">Nueva Contraseña:</label>
                <div style="position: relative;">
                    <input type="password" id="new-password" required minlength="6" style="
                        width: 100%;
                        padding: 12px 40px 12px 12px;
                        border: 2px solid #dee2e6;
                        border-radius: 6px;
                        font-size: 14px;
                        box-sizing: border-box;
                        transition: border-color 0.2s;
                    ">
                    <button type="button" class="toggle-password" data-target="new-password" style="
                        position: absolute;
                        right: 10px;
                        top: 50%;
                        transform: translateY(-50%);
                        background: none;
                        border: none;
                        cursor: pointer;
                        font-size: 16px;
                    ">👁️</button>
                </div>
                <small style="color: #6c757d; font-size: 12px;">Mínimo 6 caracteres</small>
            </div>

            <div class="form-group" style="margin-bottom: 25px;">
                <label for="confirm-password" style="
                    display: block;
                    font-weight: bold;
                    color: #495057;
                    margin-bottom: 8px;
                ">Confirmar Nueva Contraseña:</label>
                <div style="position: relative;">
                    <input type="password" id="confirm-password" required minlength="6" style="
                        width: 100%;
                        padding: 12px 40px 12px 12px;
                        border: 2px solid #dee2e6;
                        border-radius: 6px;
                        font-size: 14px;
                        box-sizing: border-box;
                        transition: border-color 0.2s;
                    ">
                    <button type="button" class="toggle-password" data-target="confirm-password" style="
                        position: absolute;
                        right: 10px;
                        top: 50%;
                        transform: translateY(-50%);
                        background: none;
                        border: none;
                        cursor: pointer;
                        font-size: 16px;
                    ">👁️</button>
                </div>
            </div>

            <div id="password-error" style="
                display: none;
                background: #f8d7da;
                border: 1px solid #f5c6cb;
                color: #721c24;
                padding: 10px;
                border-radius: 6px;
                margin-bottom: 15px;
                font-size: 14px;
            "></div>

            <div id="password-success" style="
                display: none;
                background: #d4edda;
                border: 1px solid #c3e6cb;
                color: #155724;
                padding: 10px;
                border-radius: 6px;
                margin-bottom: 15px;
                font-size: 14px;
            "></div>

            <div class="password-strength" style="margin-bottom: 20px;">
                <div style="font-size: 12px; color: #6c757d; margin-bottom: 5px;">Fortaleza de la contraseña:</div>
                <div class="strength-bar" style="
                    height: 4px;
                    background: #e9ecef;
                    border-radius: 2px;
                    overflow: hidden;
                ">
                    <div id="strength-fill" style="
                        height: 100%;
                        width: 0%;
                        background: #dc3545;
                        transition: all 0.3s ease;
                    "></div>
                </div>
                <div id="strength-text" style="font-size: 11px; color: #6c757d; margin-top: 3px;"></div>
            </div>

            <div class="modal-actions" style="
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            ">
                <button type="button" id="cancel-password-change" style="
                    background: #6c757d;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 12px 20px;
                    font-size: 14px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                ">Cancelar</button>
                
                <button type="submit" id="confirm-password-change" style="
                    background: #28a745;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 12px 20px;
                    font-size: 14px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                ">Cambiar Contraseña</button>
            </div>
        </form>
    `;

    modalContainer.appendChild(modalContent);
    document.body.appendChild(modalContainer);

    // Referencias a elementos
    const form = modalContent.querySelector('#password-change-form');
    const currentPasswordInput = modalContent.querySelector('#current-password');
    const newPasswordInput = modalContent.querySelector('#new-password');
    const confirmPasswordInput = modalContent.querySelector('#confirm-password');
    const errorDiv = modalContent.querySelector('#password-error');
    const successDiv = modalContent.querySelector('#password-success');
    const strengthFill = modalContent.querySelector('#strength-fill');
    const strengthText = modalContent.querySelector('#strength-text');
    const cancelBtn = modalContent.querySelector('#cancel-password-change');

    // Función para mostrar/ocultar contraseñas
    modalContent.addEventListener('click', (e) => {
        if (e.target.classList.contains('toggle-password')) {
            const targetId = e.target.dataset.target;
            const input = modalContent.querySelector(`#${targetId}`);
            
            if (input.type === 'password') {
                input.type = 'text';
                e.target.textContent = '🙈';
            } else {
                input.type = 'password';
                e.target.textContent = '👁️';
            }
        }
    });

    // Función para evaluar fortaleza de contraseña
    function evaluatePasswordStrength(password) {
        let score = 0;
        let feedback = '';

        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        const colors = ['#dc3545', '#fd7e14', '#ffc107', '#28a745'];
        const texts = ['Muy débil', 'Débil', 'Moderada', 'Fuerte'];
        const widths = ['25%', '50%', '75%', '100%'];

        const level = Math.min(Math.floor(score / 1.5), 3);
        
        strengthFill.style.width = widths[level];
        strengthFill.style.background = colors[level];
        strengthText.textContent = texts[level];
        strengthText.style.color = colors[level];

        return score >= 4;
    }

    // Event listener para fortaleza de contraseña
    newPasswordInput.addEventListener('input', () => {
        evaluatePasswordStrength(newPasswordInput.value);
    });

    // Función para mostrar error
    function showError(message) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        successDiv.style.display = 'none';
    }

    // Función para mostrar éxito
    function showSuccess(message) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        errorDiv.style.display = 'none';
    }

    // Función para limpiar mensajes
    function clearMessages() {
        errorDiv.style.display = 'none';
        successDiv.style.display = 'none';
    }

    // Event listener para el formulario
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMessages();

        const currentPassword = currentPasswordInput.value;
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // Validaciones
        if (newPassword !== confirmPassword) {
            showError('Las contraseñas no coinciden');
            return;
        }

        if (newPassword.length < 6) {
            showError('La nueva contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (currentPassword === newPassword) {
            showError('La nueva contraseña debe ser diferente a la actual');
            return;
        }

        try {
            // Deshabilitar botón durante el proceso
            const submitBtn = form.querySelector('#confirm-password-change');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Cambiando...';

            // Llamar a la función de cambio de contraseña
            await authModel.changePassword(currentPassword, newPassword);

            showSuccess('¡Contraseña cambiada exitosamente!');
            
            // Cerrar modal después de 2 segundos
            setTimeout(() => {
                modalContainer.remove();
            }, 2000);

        } catch (error) {
            console.error('Error cambiando contraseña:', error);
            
            let errorMessage = 'Error al cambiar la contraseña';
            if (error.code === 'auth/wrong-password') {
                errorMessage = 'La contraseña actual es incorrecta';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'La nueva contraseña es muy débil';
            } else if (error.code === 'auth/requires-recent-login') {
                errorMessage = 'Por seguridad, necesitas iniciar sesión nuevamente';
            }
            
            showError(errorMessage);
        } finally {
            // Rehabilitar botón
            const submitBtn = form.querySelector('#confirm-password-change');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Cambiar Contraseña';
        }
    });

    // Event listener para cancelar
    cancelBtn.addEventListener('click', () => {
        modalContainer.remove();
    });

    // Cerrar con ESC
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            modalContainer.remove();
            document.removeEventListener('keydown', escHandler);
        }
    });

    // Evitar cerrar al hacer clic en el contenido
    modalContent.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Cerrar al hacer clic fuera del modal
    modalContainer.addEventListener('click', () => {
        modalContainer.remove();
    });

    // Enfocar el primer input
    setTimeout(() => {
        currentPasswordInput.focus();
    }, 100);
}