// js/views/MenuInicio.js
// Navegación de categorías en el menú de inicio

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.menu button[data-category]').forEach(btn => {
    btn.addEventListener('click', () => {
      const category = btn.getAttribute('data-category');
      let url = '';
      switch (category) {
        case 'pacientes':
          url = 'pages/categoria-pacientes.html';
          break;
        case 'usuarios-personal':
          url = 'pages/categoria-usuarios-personal.html';
          break;
        case 'operaciones-control':
          url = 'pages/categoria-operaciones-control.html';
          break;
        case 'reportes':
          url = 'pages/categoria-reportes.html';
          break;
        default:
          url = 'index.html';
      }
      window.location.href = url;
    });
  });
});
