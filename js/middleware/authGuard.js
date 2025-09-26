// js/middleware/authGuard.js
// Este script ha sido desactivado para centralizar la lógica en los controladores.
// La verificación de autenticación ahora se realiza en menuController.js.
/*
import { authModel } from '../models/storageModel.js';

document.addEventListener('DOMContentLoaded', () => {
  const usuarioActual = authModel.getCurrentUser();
  const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';

  console.log('AuthGuard: Verificando autenticación...');
  console.log('AuthGuard: Usuario actual:', usuarioActual);
  console.log('AuthGuard: Es página de login:', isLoginPage);

  if (!usuarioActual && !isLoginPage) {
    console.log('AuthGuard: Usuario no autenticado y no está en la página de login. Redirigiendo a index.html');
    window.location.href = 'index.html';
  }
});
*/