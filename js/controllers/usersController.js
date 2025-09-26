// js/controllers/usersController.js
import { authModel } from '../models/storageModel.js';
import { renderUserList } from '../views/userView.js';

/**
 * Función principal para inicializar la página de Usuarios y Personal.
 */
export function initUsersController() {
  setupSidebarNavigation();
  setupNewUserForm();

  // Activa la primera sección por defecto.
  const firstButton = document.querySelector('.sidebar-menu button');
  if (firstButton) {
    firstButton.click();
  }
}

/**
 * Configura los eventos de clic para el menú lateral de navegación.
 */
function setupSidebarNavigation() {
  const sidebarButtons = document.querySelectorAll('.sidebar-menu button');
  const sections = document.querySelectorAll('.content-area .form-section');
  const defaultSection = document.getElementById('default-section');

  sidebarButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetSectionId = button.getAttribute('data-section');

      // Oculta todo.
      sidebarButtons.forEach(btn => btn.classList.remove('active'));
      sections.forEach(sec => sec.classList.remove('active'));
      if (defaultSection) defaultSection.style.display = 'none';

      // Muestra lo necesario.
      button.classList.add('active');
      const activeSection = document.getElementById(`${targetSectionId}-section`);
      if (activeSection) {
        activeSection.classList.add('active');

        // Si se selecciona "Personal", carga la lista de usuarios.
        if (targetSectionId === 'personal') {
          renderUserList();
        }
      }
    });
  });
}

/**
 * Configura el formulario para agregar un nuevo usuario.
 */
function setupNewUserForm() {
  const formUsuario = document.getElementById('formUsuario');
  if (formUsuario) {
    formUsuario.addEventListener('submit', function(e) {
      e.preventDefault();
      const formData = new FormData(formUsuario);
      const userData = Object.fromEntries(formData.entries());

      const success = authModel.addUser(userData);

      if (success) {
        alert('¡Usuario Registrado! El usuario ha sido registrado correctamente.');
        formUsuario.reset();
        // Vuelve a la sección de personal para ver al nuevo usuario
        const personalButton = document.querySelector('button[data-section="personal"]');
        if (personalButton) {
          personalButton.click();
        }
      }
    });
  }
}