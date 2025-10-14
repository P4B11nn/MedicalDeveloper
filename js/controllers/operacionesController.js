// js/controllers/operacionesController.js
import { getRegistroEntradasSalidas, exportarDatosCSV, limpiarRegistros } from '../models/operacionesModel.js';
import { renderRegistroEntradasSalidas, renderModulos } from '../views/operacionesView.js';
import { gestionModel } from '../models/gestionModel.js';
import eventBus, { EVENT_NAMES } from '../utils/eventBus.js';

export function initOperationsController() {
  console.log('OperationsController: Inicializando controlador de operaciones');
  
  // Limpiar registros por defecto al cargar
  console.log('OperationsController: Limpiando registros por defecto...');
  
  // Suscribirse a eventos del Event Bus
  setupEventListeners();
  
  setupSidebarNavigation();
  setupSimpleExport();

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
              const mesasEl = document.getElementById('mesasGrid'); if (mesasEl) mesasEl.innerHTML = '';

              if (targetBtn) targetBtn.classList.add('active');
              targetSectionEl.classList.add('active');
              targetSectionEl.classList.remove('hidden');

              if (hash === 'registro-entradas-salidas') mostrarTodosLosRegistros();
              else if (hash === 'mesas-salud') cargarMesasSalud();

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
}

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
  
  // Escuchar eventos de datos cargados (aceptamos tanto 'mesas' como 'modulos' por compatibilidad)
  eventBus.on(EVENT_NAMES.DATA_LOADED, (data) => {
    console.log('OperationsController: Datos cargados', data);
    if (!data || !data.type) return;
    if (data.type === 'registro') {
      refreshRegistroView();
    } else if (data.type === 'mesas' || data.type === 'modulos') {
      refreshMesasView();
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
          // ocultar contenedor de mesas
          const mg = document.getElementById('mesasGrid'); if (mg) mg.classList.add('hidden');
          mostrarTodosLosRegistros();
        } else if (targetSectionId === 'mesas-salud') {
          // ocultar contenedor de registro
          const re = document.getElementById('registroESLista'); if (re) re.classList.add('hidden');
          cargarMesasSalud();
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

    // Asegurar que sólo el contenedor de registro esté visible y la vista de mesas quede completamente limpia
    if (container) {
      container.classList.remove('hidden');
    }
    const mg = document.getElementById('mesasGrid');
    if (mg) {
      mg.classList.add('hidden');
      // Limpiar contenido para evitar que fragmentos previos se muestren
      mg.innerHTML = '';
    }

    // Renderizar todos los registros sin filtros
    renderRegistroEntradasSalidas(historial, container);
    
    console.log('Todos los registros mostrados exitosamente');
}

function cargarMesasSalud() {
  const container = document.getElementById('mesasGrid');
  if (container) {
    // Asegurar que solo este contenedor está visible
    container.classList.remove('hidden');
    const re = document.getElementById('registroESLista');
    if (re) {
      re.classList.add('hidden');
      // Limpiar también el HTML del registro para evitar solapamientos visuales al volver
      re.innerHTML = '';
    }

    const modulos = gestionModel.getModulos();
    // Emitir evento indicando que las mesas fueron cargadas. Usamos 'mesas' por consistencia,
    // pero el listener acepta 'modulos' también para compatibilidad con versiones previas.
    eventBus.emit(EVENT_NAMES.DATA_LOADED, { type: 'mesas', count: modulos.length });
    renderModulos(modulos, container);
  }
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
function refreshMesasView() {
  const container = document.getElementById('mesasGrid');
  if (container) {
    const modulos = gestionModel.getModulos();
    renderModulos(modulos, container);
    console.log('OperationsController: Vista de módulos refrescada');
  }
}