// js/controllers/operacionesController.js
import { getRegistroEntradasSalidas, getMesasSalud } from '../models/operacionesModel.js';
import { renderRegistroEntradasSalidas, renderMesasSalud } from '../views/operacionesView.js';

/**
 * Función principal para inicializar la página de Operaciones y Control.
 */
export function initOperationsController() {
  setupSidebarNavigation();
  setupFiltersAndExports(); // Nueva función para manejar los controles

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

      sidebarButtons.forEach(btn => btn.classList.remove('active'));
      sections.forEach(sec => sec.classList.remove('active'));
      if (defaultSection) defaultSection.style.display = 'none';

      button.classList.add('active');
      const activeSection = document.getElementById(`${targetSectionId}-section`);
      if (activeSection) {
        activeSection.classList.add('active');
        // Limpia el contenido antes de renderizar
        if (targetSectionId === 'registro-entradas-salidas') {
          // Si no existen los filtros, muestra mensaje
          const container = document.getElementById('registroESLista');
          if (!container) {
            activeSection.innerHTML = '<div style="text-align:center;color:#ef4444;padding:20px;">No se encontró el contenedor de registros.</div>';
            return;
          }
          aplicarFiltros();
        } else if (targetSectionId === 'mesas-salud') {
          cargarMesasSalud();
        }
      }
    });
  });
}

/**
 * Configura los eventos para los filtros y botones de exportación.
 */
function setupFiltersAndExports() {
  const buscarRegistroInput = document.getElementById('buscarRegistro');
  const filtroRolSelect = document.getElementById('filtroRol');
  const btnExportarTodo = document.getElementById('btnExportarTodo');

  if (buscarRegistroInput) {
    buscarRegistroInput.addEventListener('input', aplicarFiltros);
  }
  if (filtroRolSelect) {
    filtroRolSelect.addEventListener('change', aplicarFiltros);
  }
  if (btnExportarTodo) {
    btnExportarTodo.addEventListener('click', () => {
      const historialCompleto = getRegistroEntradasSalidas();
      exportarRegistros(historialCompleto, 'registro_completo');
    });
  }
}

/**
 * Aplica los filtros actuales y vuelve a renderizar la lista de registros.
 */
function aplicarFiltros() {
  const container = document.getElementById('registroESLista');
  if (!container) return;
  const buscarInput = document.getElementById('buscarRegistro');
  const filtroRolSelect = document.getElementById('filtroRol');
  const buscarValor = buscarInput ? buscarInput.value.toLowerCase() : '';
  const rolValor = filtroRolSelect ? filtroRolSelect.value : '';

  let historial = getRegistroEntradasSalidas();
  if (!Array.isArray(historial)) historial = [];

  if (buscarValor) {
    historial = historial.filter(item =>
      (item.nombre && item.nombre.toLowerCase().includes(buscarValor)) ||
      (item.matricula && item.matricula.toLowerCase().includes(buscarValor))
    );
  }

  if (rolValor) {
    historial = historial.filter(item => item.rol === rolValor);
  }

  renderRegistroEntradasSalidas(historial, container);
}


/**
 * Carga y renderiza el estado de las mesas de salud.
 */
function cargarMesasSalud() {
  const container = document.getElementById('mesasGrid');
  if (container) {
    const mesas = getMesasSalud();
    renderMesasSalud(mesas, container);
  }
}

/**
 * Exporta un conjunto de datos a un archivo CSV.
 * @param {Array} datos - Los datos a exportar.
 * @param {string} nombreArchivo - El nombre base para el archivo.
 */
function exportarRegistros(datos, nombreArchivo) {
  if (!datos || datos.length === 0) {
    alert('No hay datos para exportar.');
    return;
  }

  const headers = ['Usuario', 'Matrícula', 'Mesa', 'Rol', 'Entrada', 'Salida'];
  let csvContent = headers.join(',') + '\n';

  datos.forEach(reg => {
    const row = [
      `"${reg.nombre || ''}"`,
      `"${reg.matricula || ''}"`,
      `"${reg.mesa || ''}"`,
      `"${reg.rol || ''}"`,
      `"${reg.entrada || ''}"`,
      `"${reg.salida || ''}"`
    ];
    csvContent += row.join(',') + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${nombreArchivo}_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}