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
  setTimeout(() => {
    const firstButton = document.querySelector('.sidebar-menu button[data-section]');
    if (firstButton) {
      console.log('Activando primera sección:', firstButton.getAttribute('data-section'));
      firstButton.click();
    } else {
      console.error('No se encontró el primer botón del menú lateral');
    }
    
    // Mostrar todos los registros sin filtros
    mostrarTodosLosRegistros();
  }, 100);

  // Hacer disponibles funciones de debug
  window.OperationsDebug = {
    limpiarRegistros: () => {
      const confirmacion = confirm('¿Estás seguro de que deseas limpiar TODOS los registros?\n\nEsta acción no se puede deshacer.');
      if (confirmacion) {
        limpiarRegistros();
        mostrarTodosLosRegistros();
        console.log('OperationsDebug: Registros limpiados');
        alert('Registros limpiados exitosamente');
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
  
  // Escuchar eventos de datos cargados
  eventBus.on(EVENT_NAMES.DATA_LOADED, (data) => {
    console.log('OperationsController: Datos cargados', data);
    if (data.type === 'registro') {
      refreshRegistroView();
    } else if (data.type === 'mesas') {
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
      console.log(`Clic en sección: ${targetSectionId}`);
      
      // Limpiar estados activos
      sidebarButtons.forEach(btn => btn.classList.remove('active'));
      sections.forEach(sec => sec.classList.remove('active'));
      
      // Activar botón y sección
      button.classList.add('active');
      const activeSection = document.getElementById(`${targetSectionId}-section`);
      
      if (activeSection) {
        activeSection.classList.add('active');
        console.log(`Sección activada: ${targetSectionId}`);
        
        // Renderizar contenido según la sección
        if (targetSectionId === 'registro-entradas-salidas') {
          mostrarTodosLosRegistros();
        } else if (targetSectionId === 'mesas-salud') {
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
        buscarInput.style.display = 'none';
        console.log('Input de búsqueda ocultado');
    }
    
    if (rolSelect) {
        rolSelect.style.display = 'none';
        console.log('Select de filtro ocultado');
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
                alert('No hay datos para exportar.');
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
    
    // Renderizar todos los registros sin filtros
    renderRegistroEntradasSalidas(historial, container);
    
    console.log('Todos los registros mostrados exitosamente');
}

function cargarMesasSalud() {
  const container = document.getElementById('mesasGrid');
  if (container) {
    const modulos = gestionModel.getModulos();
    eventBus.emit(EVENT_NAMES.DATA_LOADED, { 
      type: 'modulos', 
      count: modulos.length 
    });
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