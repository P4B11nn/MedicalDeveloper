// js/controllers/authController.js
// Controller for authentication handling

import { authModel } from '../models/storageModel.js';

/**
 * Initialize the authentication controller
 */
export function initAuthController() {
  console.log('Initializing auth controller...');
  
  // Usamos el botón en lugar del formulario para prevenir la redirección accidental
  const btnLogin = document.getElementById('btnLogin');
  if (!btnLogin) return;
  
  btnLogin.addEventListener('click', handleLogin);
  
  // También permitimos presionar Enter en los campos para iniciar sesión
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
 */
function handleLogin() {
  // Ya no necesitamos prevenir el envío del formulario porque usamos un botón
  
  const matriculaInput = document.getElementById('matriculaInput');
  const contrasenaInput = document.getElementById('contrasenaInput');
  
  if (!matriculaInput || !contrasenaInput) return;
  
  const matriculaOId = matriculaInput.value.trim();
  const contrasena = contrasenaInput.value.trim();
  
  console.log('Intento de inicio de sesión con:', matriculaOId);
  
  if (!matriculaOId || !contrasena) {
    alert('Por favor ingresa matrícula/ID y contraseña');
    return;
  }
  
  const usuarioValido = authModel.validateUser(matriculaOId, contrasena);
  console.log('Usuario validado:', usuarioValido ? 'Válido' : 'Inválido');
  
  if (usuarioValido) {
    const userData = {
      nombre: usuarioValido.nombre,
      rol: usuarioValido.rol,
      id: usuarioValido.id,
      matricula: usuarioValido.matricula,
      contrasena: usuarioValido.contrasena,  // Incluir contraseña para validación futura
      apellidos: usuarioValido.apellidos || '',
      estado: usuarioValido.estado || 'activo'
    };
    
    console.log('Datos de usuario a guardar:', userData);
    
    // Registrar la actividad de inicio de sesión
    authModel.registrarActividad({
      accion: 'login',
      descripcion: `Inicio de sesión como ${usuarioValido.rol}`
    });
    
    // Guardar información del usuario actual
    authModel.setCurrentUser(userData);
    
    // Verificar que se guardó correctamente
    const usuarioGuardado = authModel.getCurrentUser();
    console.log('Usuario guardado en localStorage:', usuarioGuardado);
    
    // Redireccionar al menú principal usando redirección directa
    console.log('Redirigiendo a menu.html');
    
    try {
      // Redirigir directamente usando window.location
      window.location.href = 'menu.html';
    } catch (error) {
      console.error('Error al redirigir:', error);
      alert('Error al redirigir al menú. Por favor intente de nuevo.');
    }
  } else {
    alert('ID/Matrícula o contraseña incorrecta.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('Página de login cargada.');
  initAuthController();
});

/**
 * Get the role of the current user
 * @returns {string} - The user's role or empty string if not authenticated
 */
export function getCurrentUserRole() {
  const currentUser = authModel.getCurrentUser();
  return currentUser ? currentUser.rol : '';
}

/**
 * Log out the current user
 */
export function logout() {
  authModel.logout();
  window.location.href = 'index.html';
}