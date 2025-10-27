// js/controllers/operacionesController.js
import { getRegistroEntradasSalidas, exportarDatosCSV, limpiarRegistros } from '../models/operacionesModel.js';
import { renderRegistroEntradasSalidas, renderModulos, renderAsistencia, obtenerEtiquetaModulo } from '../views/operacionesView.js';
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
  // CSV export initialization intentionally disabled (commented out)
  // Date: 2025-10-18
  // Reason: The app currently does not use the CSV export UI and some pages trigger
  // a console warning when the export button (`btnExportarTodo`) is missing.
  // To avoid console noise and test timeouts, the initialization is kept but not executed.
  // If you need the feature in the future, uncomment the line below to re-enable it:
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

              if (hash === 'registro-entradas-salidas') mostrarTodosLosRegistros();

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
    limpiarRegistros: () => {
      if (typeof mostrarConfirmacion === 'function') {
        mostrarConfirmacion('🗑️ Limpiar Registros', 
          '¿Estás seguro de que deseas limpiar TODOS los registros de entradas y salidas?\n\nEsta acción no se puede deshacer.',
          () => {
            limpiarRegistros();
            mostrarTodosLosRegistros();
            console.log('OperationsDebug: Registros limpiados');
            if (typeof mostrarMensaje === 'function') {
              mostrarMensaje('success', '✅ Registros Limpiados', 'Todos los registros de entradas y salidas han sido eliminados exitosamente.');
            } else {
              alert('Registros limpiados exitosamente');
            }
          }
        );
      } else {
        const confirmacion = confirm('¿Estás seguro de que deseas limpiar TODOS los registros?\n\nEsta acción no se puede deshacer.');
        if (confirmacion) {
          limpiarRegistros();
          mostrarTodosLosRegistros();
          console.log('OperationsDebug: Registros limpiados');
          alert('Registros limpiados exitosamente');
        }
      }
    },
    mostrarRegistros: () => {
      console.table(getRegistroEntradasSalidas());
    }
  };
  
  console.log('OperationsDebug: Comandos disponibles - OperationsDebug.limpiarRegistros(), OperationsDebug.mostrarRegistros()');

  // Intentar pre-renderizar Asistencia si el contenedor ya existe (evita que parezca vacío)

  setTimeout(() => {
    const asistenciaEl = document.getElementById('asistenciaContainer');
    if (asistenciaEl) {
      try {
        const todos = authModel.getAllUsers() || [];
        console.log('OperationsController: Pre-render Asistencia con usuarios:', todos.length);
        asistenciaEl.innerHTML = '';
        // import renderAsistencia dinámicamente por seguridad (ya exportado arriba)
        renderAsistencia(todos, asistenciaEl);
        // pre-render Asistencia
      } catch (e) {
        console.error('OperationsController: Error pre-render Asistencia', e);
      }
    }
  }, 120);
}

/**
 * Helper: Pobla el select #asistenciaModuloSelect con los módulos disponibles.
 * Usa `gestionModel.getModulos()` y hace fallback a localStorage si es necesario.
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
      refreshRegistroView();
  } else if (data.type === 'modulos' || data.type === 'mesas') {
      refreshModulosView();
    }
  });
}

function setupSidebarNavigation() {
  const sidebarButtons = document.querySelectorAll('.sidebar-menu button[data-section]');
  const sections = document.querySelectorAll('.content-area .form-section');

  console.log(`Configurando navegación lateral: ${sidebarButtons.length} botones, ${sections.length} secciones`);

  sidebarButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
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
              // Mostrar registros; cualquier UI de módulos eliminada.
              mostrarTodosLosRegistros();
            } else if (targetSectionId === 'asistencia') {
          // Mostrar asistencia
          const asistenciaEl = document.getElementById('asistenciaContainer');
                if (asistenciaEl) {
                // El select de módulos y la funcionalidad de filtrado por módulo fueron eliminados.
                // Pre-renderizamos la lista completa de usuarios sin intentar poblar ningún combo.
                // Obtener lista completa de usuarios y usarla como base para Asistencia
                // Ahora la ventana de Asistencia debe mostrar TODO el personal; la marca de
                // "en servicio" sólo se activará cuando se pulse Entrada en esta pantalla.
                const todos = authModel.getAllUsers() || [];
                const baseLista = todos;

                console.log('OperationsController: Activando Asistencia - usuarios totales en authModel:', baseLista.length);
                if (baseLista.length > 0) console.log('OperationsController: Primeros usuarios:', baseLista.slice(0,5));

                // Limpiar contenedor antes de renderizar para evitar solapamientos
                asistenciaEl.innerHTML = '';

                renderAsistencia(baseLista, asistenciaEl);

                // Render asistencia sin agregar lógica de filtrado por módulos (combobox removed)
                // Simplemente renderizar la lista completa usando baseLista
                renderAsistencia(baseLista, asistenciaEl);
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

function setupSimpleExport() {
    console.log('Configurando exportación simplificada (sin filtros)...');
    
    // Ocultar controles de filtro si existen
    const buscarInput = document.getElementById('buscarRegistro');
    const rolSelect = document.getElementById('filtroRol');
    
  if (buscarInput) {
    buscarInput.classList.add('hidden');
    console.log('Input de búsqueda ocultado (clase .hidden)');
  }
    
  if (rolSelect) {
    rolSelect.classList.add('hidden');
    console.log('Select de filtro ocultado (clase .hidden)');
  }
    
    // Configurar solo exportación
    const exportarBtn = document.getElementById('btnExportarTodo');
    if (exportarBtn) {
        exportarBtn.addEventListener('click', () => {
            console.log('Iniciando exportación CSV...');
            const historial = getRegistroEntradasSalidas();
            if (historial.length > 0) {
                eventBus.emit(EVENT_NAMES.EXPORT_REQUESTED, {
                    type: 'csv',
                    data: historial,
                    filename: 'registro_completo'
                });
                exportarDatosCSV(historial, 'registro_completo');
                console.log(`Exportando ${historial.length} registros`);
            } else {
                console.warn('No hay datos para exportar');
                if (typeof mostrarMensaje === 'function') {
                  mostrarMensaje('info', 'ℹ️ Sin Datos', 'No hay registros de entradas y salidas para exportar.');
                } else {
                  alert('No hay datos para exportar.');
                }
            }
        });
        console.log('Botón de exportar CSV configurado');
    } else {
        console.error('No se encontró el botón btnExportarTodo');
    }
    
    console.log('Configuración de exportación simplificada completada');
}

function mostrarTodosLosRegistros() {
    console.log('Mostrando todos los registros de entradas/salidas...');
    const container = document.getElementById('registroESLista');
    
    if (!container) {
        console.error('No se encontró el contenedor registroESLista');
        return;
    }
    
    // Obtener todos los registros reales de actividad
    const historial = getRegistroEntradasSalidas();
    console.log(`Registros obtenidos: ${historial.length}`);

    // Asegurar que sólo el contenedor de registro esté visible.
    if (container) container.classList.remove('hidden');

    // Renderizar todos los registros sin filtros
    // Hide top-level registro filters (search / role select) for clarity — registros should only
    // reflect asistencia tomada por el administrador in Asistencia.
    const buscarInput = document.getElementById('buscarRegistro'); if (buscarInput) buscarInput.classList.add('hidden');
    const rolSelect = document.getElementById('filtroRol'); if (rolSelect) rolSelect.classList.add('hidden');

    // Renderizar la tabla en el contenedor específico
    const tablaContainer = document.createElement('div');
    tablaContainer.id = 'tabla-registros-container';
    container.innerHTML = '';
    container.appendChild(tablaContainer);
    
    renderRegistroEntradasSalidas(historial, tablaContainer);
    
    console.log('Todos los registros mostrados exitosamente');
}

/**
 * Manejar solicitudes de exportación desde el Event Bus
 */
function handleExportRequest(data) {
  console.log('OperationsController: Manejando solicitud de exportación', data);
  
  if (data.type === 'csv' && data.data && data.filename) {
    try {
      exportarDatosCSV(data.data, data.filename);
      eventBus.emit(EVENT_NAMES.REPORTE_EXPORTED, {
        type: 'csv',
        filename: data.filename,
        recordCount: data.data.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error en exportación:', error);
      eventBus.emit(EVENT_NAMES.DATA_ERROR, {
        operation: 'export',
        error: error.message
      });
    }
  }
}

/**
 * Refrescar vista de registro
 */
function refreshRegistroView() {
  const container = document.getElementById('registroESLista');
  if (container) {
    const historial = getRegistroEntradasSalidas();
    renderRegistroEntradasSalidas(historial, container);
    console.log('OperationsController: Vista de registro refrescada');
  }
}

/**
 * Refrescar vista de módulos
 */
function refreshModulosView() {
  // El contenedor de módulos fue eliminado del DOM para evitar conflictos (se eliminó 'mesasGrid').
  // Si en el futuro se necesita renderizar módulos en una ubicación concreta, llamar a
  // renderModulos(modulos, container) pasando el contenedor deseado.
  const modulos = gestionModel.getModulos() || [];
  console.log('OperationsController: refreshModulosView invoked — module container removed. Modulos disponibles:', modulos.length);
}
