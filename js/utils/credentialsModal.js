// js/utils/credentialsModal.js
// Modal para mostrar credenciales de usuario recién creado

export function mostrarCredencialesUsuario(userData, isPasswordReset = false) {
    // Crear modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-overlay credentials-modal';
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
        max-width: 500px;
        width: 90%;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        text-align: center;
        position: relative;
    `;

    modalContent.innerHTML = `
        <div class="credentials-header">
            <div class="success-icon" style="
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: #28a745;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                margin: 0 auto 20px;
            ">✓</div>
            <h2 style="color: #333; margin-bottom: 10px;">
                ${isPasswordReset ? 'Contraseña Reseteada' : 'Usuario Creado Exitosamente'}
            </h2>
            <p style="color: #666; margin-bottom: 30px;">
                ${isPasswordReset ?
                    `Se ha reseteado la contraseña de <strong>${userData.nombre}</strong>. Nueva contraseña temporal:` :
                    `Se ha creado el usuario <strong>${userData.nombre}</strong>. Por favor, guarda estas credenciales de acceso:`
                }
            </p>
        </div>

        <div class="credentials-info" style="
            background: #f8f9fa;
            border: 2px solid #dee2e6;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: left;
        ">
            <div class="credential-item" style="margin-bottom: 15px;">
                <label style="font-weight: bold; color: #495057; display: block; margin-bottom: 5px;">
                    📧 Email / Usuario:
                </label>
                <div class="credential-value" style="
                    background: white;
                    padding: 10px;
                    border-radius: 4px;
                    border: 1px solid #ced4da;
                    font-family: monospace;
                    font-size: 14px;
                    word-break: break-all;
                ">${userData.email}</div>
            </div>

            <div class="credential-item" style="margin-bottom: 15px;">
                <label style="font-weight: bold; color: #495057; display: block; margin-bottom: 5px;">
                    🔑 Contraseña Temporal:
                </label>
                <div class="credential-value" style="
                    background: white;
                    padding: 10px;
                    border-radius: 4px;
                    border: 1px solid #ced4da;
                    font-family: monospace;
                    font-size: 14px;
                    position: relative;
                ">
                    <span id="password-display">${userData.temporaryPassword}</span>
                    <button id="copy-password" style="
                        position: absolute;
                        right: 5px;
                        top: 50%;
                        transform: translateY(-50%);
                        background: #007bff;
                        color: white;
                        border: none;
                        border-radius: 3px;
                        padding: 4px 8px;
                        font-size: 12px;
                        cursor: pointer;
                    ">Copiar</button>
                </div>
            </div>

            ${userData.matricula ? `
            <div class="credential-item">
                <label style="font-weight: bold; color: #495057; display: block; margin-bottom: 5px;">
                    🆔 Matrícula:
                </label>
                <div class="credential-value" style="
                    background: white;
                    padding: 10px;
                    border-radius: 4px;
                    border: 1px solid #ced4da;
                    font-family: monospace;
                    font-size: 14px;
                ">${userData.matricula}</div>
            </div>
            ` : ''}
        </div>

        <div class="credentials-warning" style="
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            text-align: left;
        ">
            <div style="color: #856404; font-weight: bold; margin-bottom: 10px;">
                ⚠️ IMPORTANTE:
            </div>
            <ul style="color: #856404; margin: 0; padding-left: 20px;">
                <li>Esta contraseña es temporal y debe ser cambiada en el primer inicio de sesión</li>
                <li>Comparte estas credenciales de forma segura con el usuario</li>
                <li>Esta información NO se mostrará nuevamente</li>
            </ul>
        </div>

        <div class="modal-actions" style="
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-top: 25px;
        ">
            <button id="copy-all-credentials" style="
                background: #17a2b8;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 12px 20px;
                font-size: 14px;
                cursor: pointer;
                transition: background-color 0.2s;
            ">📋 Copiar Todo</button>

            <button id="print-credentials" style="
                background: #6c757d;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 12px 20px;
                font-size: 14px;
                cursor: pointer;
                transition: background-color 0.2s;
            ">🖨️ Imprimir</button>

            <button id="close-credentials-modal" style="
                background: #28a745;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 12px 20px;
                font-size: 14px;
                cursor: pointer;
                transition: background-color 0.2s;
            ">✅ Entendido</button>
        </div>
    `;

    modalContainer.appendChild(modalContent);
    document.body.appendChild(modalContainer);

    // Event listeners
    const copyPasswordBtn = modalContent.querySelector('#copy-password');
    const copyAllBtn = modalContent.querySelector('#copy-all-credentials');
    const printBtn = modalContent.querySelector('#print-credentials');
    const closeBtn = modalContent.querySelector('#close-credentials-modal');

    // Copiar contraseña
    copyPasswordBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(userData.temporaryPassword).then(() => {
            copyPasswordBtn.textContent = '✓ Copiado';
            copyPasswordBtn.style.background = '#28a745';
            setTimeout(() => {
                copyPasswordBtn.textContent = 'Copiar';
                copyPasswordBtn.style.background = '#007bff';
            }, 2000);
        });
    });

    // Copiar todas las credenciales
    copyAllBtn.addEventListener('click', () => {
        const credentialsText = `
CREDENCIALES DE ACCESO - ${userData.nombre}
==========================================

Email/Usuario: ${userData.email}
Contraseña Temporal: ${userData.temporaryPassword}
${userData.matricula ? `Matrícula: ${userData.matricula}` : ''}

IMPORTANTE:
- Esta contraseña es temporal y debe ser cambiada en el primer inicio de sesión
- Comparte estas credenciales de forma segura
- Esta información NO se mostrará nuevamente

Generado el: ${new Date().toLocaleString()}
        `.trim();

        navigator.clipboard.writeText(credentialsText).then(() => {
            copyAllBtn.textContent = '✓ Copiado';
            copyAllBtn.style.background = '#28a745';
            setTimeout(() => {
                copyAllBtn.textContent = '📋 Copiar Todo';
                copyAllBtn.style.background = '#17a2b8';
            }, 2000);
        });
    });

    // Imprimir credenciales
    printBtn.addEventListener('click', () => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Credenciales de Usuario - ${userData.nombre}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 40px; }
                        .header { text-align: center; margin-bottom: 30px; }
                        .credentials { border: 2px solid #333; padding: 20px; margin: 20px 0; }
                        .credential-item { margin: 15px 0; }
                        .label { font-weight: bold; }
                        .value { font-family: monospace; background: #f5f5f5; padding: 5px; }
                        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>CREDENCIALES DE ACCESO</h1>
                        <h2>${userData.nombre}</h2>
                        <p>Generado el: ${new Date().toLocaleString()}</p>
                    </div>

                    <div class="credentials">
                        <div class="credential-item">
                            <div class="label">Email/Usuario:</div>
                            <div class="value">${userData.email}</div>
                        </div>

                        <div class="credential-item">
                            <div class="label">Contraseña Temporal:</div>
                            <div class="value">${userData.temporaryPassword}</div>
                        </div>

                        ${userData.matricula ? `
                        <div class="credential-item">
                            <div class="label">Matrícula:</div>
                            <div class="value">${userData.matricula}</div>
                        </div>
                        ` : ''}
                    </div>

                    <div class="warning">
                        <strong>IMPORTANTE:</strong>
                        <ul>
                            <li>Esta contraseña es temporal y debe ser cambiada en el primer inicio de sesión</li>
                            <li>Comparte estas credenciales de forma segura con el usuario</li>
                            <li>Esta información NO se mostrará nuevamente</li>
                        </ul>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    });

    // Cerrar modal
    closeBtn.addEventListener('click', () => {
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

    // Cerrar al hacer clic fuera del modal (opcional, comentado por seguridad)
    // modalContainer.addEventListener('click', () => {
    //     modalContainer.remove();
    // });
}
