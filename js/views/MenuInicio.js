// js/views/MenuInicio.js
// Navegación de categorías en el menú de inicio con validación de permisos y Event Bus

import { authModel } from '../models/storageModel.js';
import eventBus, { EVENT_NAMES } from '../utils/eventBus.js';

// Configuración de permisos por categoría
const CATEGORY_PERMISSIONS = {
  'pacientes': ['admin', 'practicante'],
  'usuarios-personal': ['admin'], // Solo administradores
  'operaciones-control': ['admin', 'practicante'],
  'reportes': ['admin', 'practicante'],
  'gestion': ['admin'] // Solo administradores pueden acceder a Gestión Administrativa
};

document.addEventListener('DOMContentLoaded', () => {
  console.log('MenuInicio: Configurando navegación con validación de permisos');
  
  const usuario = authModel.getCurrentUser();
  if (!usuario) {
    console.error('MenuInicio: No hay usuario autenticado');
    return;
  }
  
  console.log(`MenuInicio: Usuario actual - ${usuario.nombre} (${usuario.rol})`);
  
  // Mostrar el botón de Gestión Administrativa solo para administradores
  const btnGestion = document.getElementById('btnGestion');
  if (btnGestion && usuario.rol === 'admin') {
    btnGestion.style.display = 'flex';
    console.log('MenuInicio: Botón de Gestión Administrativa habilitado para administrador');
  }
  
  // Configurar botones de navegación
  document.querySelectorAll('.menu button[data-category]').forEach(btn => {
    const category = btn.getAttribute('data-category');
    const allowedRoles = CATEGORY_PERMISSIONS[category];
    
    // Verificar si el usuario tiene permisos para esta categoría
    if (allowedRoles && !allowedRoles.includes(usuario.rol)) {
      // Deshabilitar botón si no tiene permisos
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
      btn.title = 'No tienes permisos para acceder a esta sección';
      
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        eventBus.emit(EVENT_NAMES.PERMISSION_DENIED, {
          user: usuario,
          page: category,
          requiredRoles: allowedRoles
        });
        alert('No tienes permisos para acceder a esta sección.');
      });
      
      console.log(`MenuInicio: Sección '${category}' deshabilitada para rol '${usuario.rol}'`);
    } else {
      // Configurar navegación normal
      btn.addEventListener('click', () => {
        console.log(`MenuInicio: Navegando a categoría '${category}'`);
        
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
          case 'gestion':
            url = 'pages/categoria-gestion.html';
            break;
          default:
            url = 'index.html';
        }
        
        // Registrar navegación
        authModel.registrarActividad({
          accion: 'navigation',
          descripcion: `Navegación a categoría: ${category}`
        });
        
        // Emitir evento de navegación
        eventBus.emit(EVENT_NAMES.NAVIGATE_TO, {
          target: url,
          category: category,
          source: 'menu_button'
        });
        
        window.location.href = url;
      });
      
      console.log(`MenuInicio: Sección '${category}' habilitada para rol '${usuario.rol}'`);
    }
  });
  
  console.log('MenuInicio: Configuración de navegación completada');
});
