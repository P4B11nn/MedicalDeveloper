// js/controllers/authController.js
// Controller for authentication handling

import { authModel } from '../models/storageModel.js';

/**
 * Initialize the authentication controller
 */
export function initAuthController() {
  console.log('Initializing auth controller...');

  // Inicializar listener de estado de autenticación
  // authModel.initAuthStateListener(); // TODO: Implementar cuando sea necesario

  const btnLogin = document.getElementById('btnLogin');
  if (!btnLogin) return;

  btnLogin.addEventListener('click', handleLogin);

  const inputMatricula = document.getElementById('matriculaInput');
  const inputContrasena = document.getElementById('contrasenaInput');

  if (inputMatricula) {
    inputMatricula.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleLogin();
      }
    });
  }

  if (inputContrasena) {
    inputContrasena.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleLogin();
      }
    });
  }
}

/**
 * Handle login form submission
 * LA FUNCIÓN AHORA ES ASÍNCRONA PARA PODER USAR 'await'
 */
async function handleLogin() {
    const matriculaInput = document.getElementById('matriculaInput');
    const contrasenaInput = document.getElementById('contrasenaInput');
    const btnLogin = document.getElementById('btnLogin');

    if (!matriculaInput || !contrasenaInput) {
        console.error('Elementos del formulario no encontrados');
        return;
    }

    try {
        // Deshabilitar el botón durante el proceso
        btnLogin.disabled = true;
        btnLogin.textContent = 'Iniciando sesión...';

        const emailOrMatricula = matriculaInput.value.trim();
        const contrasena = contrasenaInput.value.trim();

        if (!emailOrMatricula || !contrasena) {
            throw new Error('Por favor ingresa email/matrícula y contraseña');
        }

        const usuarioValido = await authModel.login(emailOrMatricula, contrasena);

        if (!usuarioValido) {
            throw new Error('Credenciales inválidas');
        }

        // Limpiar campos sensibles
        contrasenaInput.value = '';

        // Redireccionar al menú principal
        window.location.href = '/menuInicio.html';

    } catch (error) {
        console.error('Error en inicio de sesión:', error);
        alert(error.message || 'Error al iniciar sesión');
    } finally {
        // Restaurar el botón
        btnLogin.disabled = false;
        btnLogin.textContent = 'Iniciar Sesión';
    }
}

// Mejorar la función getCurrentUserRole
export function getCurrentUserRole() {
    try {
        const currentUser = authModel.getCurrentUser();
        return currentUser?.rol || '';
    } catch (error) {
        console.error('Error al obtener rol de usuario:', error);
        return '';
    }
}

// Agregar función para verificar autenticación
export function checkAuth() {
    const currentUser = authModel.getCurrentUser();
    if (!currentUser) {
        console.warn('Usuario no autenticado, redirigiendo a login');
        window.location.href = '/index.html';
        return false;
    }
    return true;
}

// Agregar función para logout seguro
export async function handleLogout() {
    try {
        await authModel.logout();
        window.location.href = '/index.html';
    } catch (error) {
        console.error('Error durante el logout:', error);
        alert('Error al cerrar sesión');
    }
}



/**
 * Log out the current user
 */
export async function logout() { // Convertido a async para el futuro
  console.log('AuthController: Iniciando proceso de logout');

  // authModel.logout() ya es asíncrono y maneja el registro de actividad
  await authModel.logout();

  // Limpiar cualquier redirección pendiente
  sessionStorage.removeItem('redirectAfterLogin');

  // Redirigir a la página de login
  window.location.href = 'index.html';
}