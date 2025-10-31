// js/controllers/operacionesController.js
import { renderAsistencia, obtenerEtiquetaModulo, renderAsistenciasGenerales } from '../views/operacionesView.js';
import { gestionModel } from '../models/gestionModel.js';
import eventBus, { EVENT_NAMES } from '../utils/eventBus.js';
import { authModel } from '../models/storageModel.js';

// Indicar que el módulo se ha cargado (ayuda a depurar si el script se ejecuta)
console.log('OperationsController module loaded');

export function initOperationsController() {
  console.log('OperationsController: Inicializando controlador de operaciones');
  
  // Limpiar registros por defecto al cargar
  console.log('OperationsController: Limpiando registros por defecto...');
  
  // Suscribirse a eventos del Event Bus
  setupEventListeners();
  
  setupSidebarNavigation();
  // CSV export initialization intentionally disabled (removed - old E/S system)
  // Date: 2025-10-28
  // Reason: Old E/S system removed, now using asistencias_usuarios collection only.
  // setupSimpleExport();

  // Activar la primera sección por defecto
  // Activar la sección correspondiente según el hash de la URL si existe;
  // si no existe, activar la primera sección por defecto.
  (function activateInitialSection(){
    const maxWait = 2000; // ms
    const interval = 50; // ms
    let waited = 0;

    const tryActivate = () => {
      const buttons = document.querySelectorAll('.sidebar-menu button[data-section]');
      const sections = document.querySelectorAll('.content-area .form-section');

      if (buttons.length > 0 && sections.length > 0) {
        try {
          console.log('OperationsController: botones y secciones disponibles, procediendo a activar sección inicial');
          let hash = window.location.hash ? window.location.hash.replace(/^#/, '') : null;
          if (hash && hash.endsWith('-section')) hash = hash.replace(/-section$/, '');

          let activated = false;

          if (hash) {
            const targetBtn = document.querySelector(`.sidebar-menu button[data-section="${hash}"]`);
            const targetSectionEl = document.getElementById(`${hash}-section`);
            if (targetSectionEl) {
              console.log('Activando sección directamente desde hash (element):', hash);
              // Limpiar estados
              buttons.forEach(b => b.classList.remove('active'));
              sections.forEach(s => {
                s.classList.remove('active');
                s.classList.add('hidden');
              });

              // Limpiar contenidos opuestos para evitar solapamientos visuales
              const registroEl = document.getElementById('registroESLista'); if (registroEl) registroEl.innerHTML = '';
              // Nota: referencias a 'mesasGrid' eliminadas intencionalmente para evitar conflictos

              if (targetBtn) targetBtn.classList.add('active');
              targetSectionEl.classList.add('active');
              targetSectionEl.classList.remove('hidden');

              if (hash === 'registro-entradas-salidas') {
                // Mostrar vista general de asistencias con filtros
                mostrarVistaAsistenciasGenerales();
              }

              activated = true;
            } else if (targetBtn) {
              console.log('Activando sección desde hash via botón (fallback):', hash);
              targetBtn.click();
              activated = true;
            }
          }

          if (!activated) {
            const firstButton = document.querySelector('.sidebar-menu button[data-section]');
            if (firstButton) {
              console.log('Activando primera sección por defecto:', firstButton.getAttribute('data-section'));
              firstButton.click();
            } else {
              console.error('No se encontró el primer botón del menú lateral');
            }
          }
        } catch (err) {
          console.error('Error al activar sección inicial', err);
        }
      } else {
        waited += interval;
        if (waited < maxWait) {
          setTimeout(tryActivate, interval);
        } else {
          console.warn('OperationsController: timeout esperando botones/secciones, activando fallback');
          // fallback: intentar activar la primera que exista
          const firstButton = document.querySelector('.sidebar-menu button[data-section]');
          if (firstButton) firstButton.click();
        }
      }
    };

    tryActivate();
  })();

  // Hacer disponibles funciones de debug
  window.OperationsDebug = {
    // Debug functions removed - old E/S system no longer used
  };
  
  console.log('OperationsDebug: Comandos disponibles - Old E/S system removed, now using asistencias_usuarios collection only');

  // Intentar pre-renderizar Asistencia si el contenedor ya existe (evita que parezca vacío)

  setTimeout(async () => {
    const asistenciaEl = document.getElementById('asistenciaContainer');
    if (asistenciaEl) {
      try {
        const todos = await authModel.getAllUsers() || [];
        console.log('OperationsController: Pre-render Asistencia con usuarios:', todos.length);
        asistenciaEl.innerHTML = '';
        // import renderAsistencia dinámicamente por seguridad (ya exportado arriba)
        await renderAsistencia(todos, asistenciaEl);
        // pre-render Asistencia
      } catch (e) {
        console.error('OperationsController: Error pre-render Asistencia', e);
      }
    }
  }, 120);
}

/**
 * Helper: Pobla el select #asistenciaModuloSelect con los módulos disponibles.
 * Usa `gestionModel.getModulos()` para obtener módulos desde Firebase.
 */
// NOTE: All module-select and migration helper functions removed per request.

/**
 * Configurar listeners de eventos del Event Bus
 */
function setupEventListeners() {
  console.log('OperationsController: Configurando Event Bus listeners');
  
  // REMOVIDO: El listener que causaba el bucle infinito
  // eventBus.on(EVENT_NAMES.FILTER_CHANGED, (data) => {
  //   console.log('OperationsController: Filtro cambiado', data);
  //   aplicarFiltros();  // <-- ESTO CAUSABA EL BUCLE INFINITO
  // });
  
  // Escuchar eventos de exportación
  eventBus.on(EVENT_NAMES.EXPORT_REQUESTED, (data) => {
    console.log('OperationsController: Exportación solicitada', data);
    handleExportRequest(data);
  });
  
  // Escuchar eventos de datos cargados (se usan 'modulos'; se mantiene compatibilidad con 'mesas')
  eventBus.on(EVENT_NAMES.DATA_LOADED, (data) => {
    console.log('OperationsController: Datos cargados', data);
    if (!data || !data.type) return;
    if (data.type === 'registro') {
      console.log('OperationsController: Registro event ignored - old E/S system removed');
    } else if (data.type === 'modulos' || data.type === 'mesas') {
      console.log('OperationsController: Modulos event ignored - modules removed from operations');
    }
  });
}

function setupSidebarNavigation() {
  const sidebarButtons = document.querySelectorAll('.sidebar-menu button[data-section]');
  const sections = document.querySelectorAll('.content-area .form-section');

  console.log(`Configurando navegación lateral: ${sidebarButtons.length} botones, ${sections.length} secciones`);

  sidebarButtons.forEach((button, index) => {
    button.addEventListener('click', async () => {
      const targetSectionId = button.getAttribute('data-section');
      // Seguridad: si por alguna razón el botón no tiene data-section, ignoramos el click
      if (!targetSectionId) {
        console.warn('Botón lateral sin data-section ignorado');
        return;
      }
      console.log(`Clic en sección: ${targetSectionId}`);
      
      // Limpiar estados activos
      sidebarButtons.forEach(btn => btn.classList.remove('active'));
      sections.forEach(sec => sec.classList.remove('active'));
      
      // Activar botón y sección
      button.classList.add('active');
      const activeSection = document.getElementById(`${targetSectionId}-section`);

      // Asegurarnos de que sólo la sección activa se muestre (evitar solapamientos)
      const allSections = document.querySelectorAll('.content-area .form-section');
      allSections.forEach(sec => {
        if (sec.id === `${targetSectionId}-section`) {
          sec.classList.add('active');
          sec.classList.remove('hidden');
        } else {
          sec.classList.remove('active');
          sec.classList.add('hidden');
        }
      });

      if (activeSection) {
        console.log(`Sección activada: ${targetSectionId}`);
        // Renderizar contenido según la sección y ocultar lo demás
        if (targetSectionId === 'registro-entradas-salidas') {
              // Mostrar vista general de asistencias con filtros
              mostrarVistaAsistenciasGenerales();
            } else if (targetSectionId === 'asistencia') {
          // Mostrar asistencia
          const asistenciaEl = document.getElementById('asistenciaContainer');
                if (asistenciaEl) {
                // El select de módulos y la funcionalidad de filtrado por módulo fueron eliminados.
                // Pre-renderizamos la lista completa de usuarios sin intentar poblar ningún combo.
                // Obtener lista completa de usuarios y usarla como base para Asistencia
                // Ahora la ventana de Asistencia debe mostrar TODO el personal; la marca de
                // "en servicio" sólo se activará cuando se pulse Entrada en esta pantalla.
                const todos = await authModel.getAllUsers() || [];
                const baseLista = todos;

                console.log('OperationsController: Activando Asistencia - usuarios totales en authModel:', baseLista.length);
                if (baseLista.length > 0) console.log('OperationsController: Lista de usuarios cargada (información sensible oculta por seguridad)');

                // Limpiar contenedor antes de renderizar para evitar solapamientos
                asistenciaEl.innerHTML = '';

                await renderAsistencia(baseLista, asistenciaEl);
          } else {
            console.error('No se encontró el contenedor de Asistencia');
          }
        }
      } else {
        console.error(`No se encontró la sección: ${targetSectionId}-section`);
      }
    });
  });

  if (sidebarButtons.length === 0) {
    console.error('No se encontraron botones del menú lateral con data-section');
  }
}

/**
 * Muestra la vista general de asistencias con filtros
 */
async function mostrarVistaAsistenciasGenerales() {
  console.log('Mostrando vista general de asistencias...');
  const container = document.getElementById('registroESLista');
  
  if (!container) {
    console.error('No se encontró el contenedor registroESLista');
    return;
  }
  
  // Asegurar que el contenedor esté visible
  container.classList.remove('hidden');
  
  // Limpiar contenedor
  container.innerHTML = '';
  
  try {
    // Renderizar la vista de asistencias generales
    await renderAsistenciasGenerales(container);
    console.log('Vista general de asistencias mostrada exitosamente');
  } catch (error) {
    console.error('Error mostrando vista de asistencias:', error);
    container.innerHTML = `
      <div style="text-align: center; color: #ef4444; padding: 20px;">
        <i class="fas fa-exclamation-triangle"></i>
        Error al cargar la vista de asistencias. Verifique la conexión a Firebase.
      </div>
    `;
  }
}

/**
 * Manejar solicitudes de exportación desde el Event Bus
 */
function handleExportRequest(data) {
  console.log('OperationsController: Manejo de exportación removido - old E/S system no longer used');
}

/**
 * Refrescar vista de módulos
 */
function refreshModulosView() {
  // Modules functionality completely removed from operations control
  console.log('OperationsController: refreshModulosView - modules removed from operations');
}
