import { authModel } from '../models/storageModel.js';

/**
 * Inicializa la lógica global común para todas las páginas (excepto login)
 */
export function initGlobalController() {
  // Guardia de autenticación
  const usuarioActual = authModel.getCurrentUser();
  if (!usuarioActual) {
    window.location.href = '/index.html';
    return;
  }

  // Mostrar nombre de usuario y rol
  const userNameSpan = document.getElementById('userName');
  if (userNameSpan) {
    let rolIcon = '';
    switch (usuarioActual.rol) {
      case 'admin':
        rolIcon = '🛡️';
        break;
      case 'practicante':
        rolIcon = '👨‍⚕️';
        break;
      default:
        rolIcon = '👤';
    }
    userNameSpan.textContent = `${rolIcon} ${usuarioActual.nombre}`;
  }

  // Lógica del menú de usuario (dropdown)
  const userIcon = document.getElementById('userIcon');
  const userDropdown = document.getElementById('userDropdown');
  if (userIcon && userDropdown) {
    userIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.style.display = userDropdown.style.display === 'block' ? 'none' : 'block';
    });

    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (!userIcon.contains(e.target) && !userDropdown.contains(e.target)) {
        userDropdown.style.display = 'none';
      }
    });
  }

  // Botón de cerrar sesión
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
        authModel.logout();
        window.location.href = '/index.html';
      }
    });
  }
}