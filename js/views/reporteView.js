// js/views/reporteView.js
import { reporteModel } from '../models/reporteModel.js';
import { pacienteModel } from '../models/pacienteModel.js';
import { authModel } from '../models/storageModel.js';

// Función para formatear fechas
function formatearFecha(fecha) {
  if (!fecha) return '';
  const date = new Date(fecha);
  return isNaN(date) ? fecha : date.toLocaleDateString('es-MX');
}

// Renderiza la sección de estadísticas
export function renderEstadisticas(estadisticasPrevia = null, options = {}) {
  const section = document.getElementById('estadisticas-section');
  if (!section) return;

  // Limpiar otras secciones para evitar contenido mezclado
  try { document.getElementById('actividades-section').innerHTML = ''; } catch(e) {}
  try { document.getElementById('exportacion-section').innerHTML = ''; } catch(e) {}

  // Mostrar versión compacta solo si se solicita explícitamente via options.compact
  const compactMode = options && options.compact === true;
  if (compactMode) {
    const estadisticas = estadisticasPrevia || reporteModel.getEstadisticas();
    const compactHtml = `
      <div class="estadisticas-compact">
        <div class="stats-cards">
          <div class="stats-card">
            <div class="stats-icon"><i class="fas fa-user"></i></div>
            <div class="stats-info">
              <span class="stats-value">${estadisticas.general.totalUsuarios}</span>
              <span class="stats-label">Usuarios registrados</span>
            </div>
          </div>
          <div class="stats-card">
            <div class="stats-icon"><i class="fas fa-users"></i></div>
            <div class="stats-info">
              <span class="stats-value">${estadisticas.pacientes.totalPacientes}</span>
              <span class="stats-label">Pacientes</span>
            </div>
          </div>
          <div class="stats-card">
            <div class="stats-icon"><i class="fas fa-calendar-check"></i></div>
            <div class="stats-info">
              <span class="stats-value">${estadisticas.pacientes.totalCitas}</span>
              <span class="stats-label">Citas registradas</span>
            </div>
          </div>
          <div class="stats-card">
            <div class="stats-icon"><i class="fas fa-clipboard-list"></i></div>
            <div class="stats-info">
              <span class="stats-value">${estadisticas.pacientes.totalConsultas}</span>
              <span class="stats-label">Consultas registradas</span>
            </div>
          </div>
        </div>
      </div>
    `;
    section.innerHTML = compactHtml;
    return;
  }

  // Obtener estadísticas actualizadas si no se proporcionan
  const estadisticas = estadisticasPrevia || reporteModel.getEstadisticas();
  
    let html = `
    <div class="estadisticas-container">
      <div class="filtros-estadisticas">
        <h3>Personalizar estadísticas</h3>
        <form id="formFiltroEstadisticas">
          <div class="form-group">
            <label for="periodoEstadisticas">Período:</label>
            <select id="periodoEstadisticas" name="periodo">
              <option value="semana">Última semana</option>
              <option value="mes" selected>Último mes</option>
              <option value="trimestre">Último trimestre</option>
              <option value="anio">Último año</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="tipoEstadisticas">Tipo de estadísticas:</label>
            <select id="tipoEstadisticas" name="tipo">
              <option value="general" selected>General</option>
              <option value="pacientes">Pacientes</option>
              <option value="actividades">Actividades</option>
            </select>
          </div>
          
          <div class="form-actions">
            <button type="submit" class="btn-primary">Generar</button>
          </div>
        </form>
      </div>
      
      <div class="estadisticas-display" id="contenedorEstadisticas">
  `;
  
  // Estadísticas generales
  html += `
    <div class="estadisticas-seccion">
      <h3>Estadísticas Generales</h3>
      <div class="stats-cards">
        <div class="stats-card">
          <div class="stats-icon"><i class="fas fa-user"></i></div>
          <div class="stats-info">
            <span class="stats-value">${estadisticas.general.totalUsuarios}</span>
            <span class="stats-label">Usuarios registrados</span>
          </div>
        </div>
        
        <div class="stats-card">
          <div class="stats-icon"><i class="fas fa-users"></i></div>
          <div class="stats-info">
            <span class="stats-value">${estadisticas.pacientes.totalPacientes}</span>
            <span class="stats-label">Pacientes</span>
          </div>
        </div>
        
        <div class="stats-card">
          <div class="stats-icon"><i class="fas fa-calendar-check"></i></div>
          <div class="stats-info">
            <span class="stats-value">${estadisticas.pacientes.totalCitas}</span>
            <span class="stats-label">Citas registradas</span>
          </div>
        </div>
        
        <div class="stats-card">
          <div class="stats-icon"><i class="fas fa-clipboard-list"></i></div>
          <div class="stats-info">
            <span class="stats-value">${estadisticas.pacientes.totalConsultas}</span>
            <span class="stats-label">Consultas registradas</span>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Estadísticas de actividad
  html += `
    <div class="estadisticas-seccion">
      <h3>Actividad Reciente</h3>
      <div class="stats-graph">
        <div class="graph-header">
          <span>Acciones por día (últimos 7 días)</span>
        </div>
        <div class="graph-body">
          ${generarGraficoActividad(estadisticas.actividades.porDia)}
        </div>
      </div>
    </div>
  `;
  
  // Estadísticas de tipo de pacientes
  if (estadisticas.pacientes.porGenero) {
    html += `
      <div class="estadisticas-seccion">
        <h3>Distribución de Pacientes por Género</h3>
        <div class="stats-pie-charts">
          ${generarGraficoPie(estadisticas.pacientes.porGenero)}
        </div>
      </div>
    `;
  }
  
  // Estadísticas de citas por estado
  if (estadisticas.pacientes.citasPorEstado) {
    html += `
      <div class="estadisticas-seccion">
        <h3>Citas por Estado</h3>
        <div class="stats-pie-charts">
          ${generarGraficoPie(estadisticas.pacientes.citasPorEstado)}
        </div>
      </div>
    `;
  }
  
  html += `
      </div>
    </div>
  `;
  
  section.innerHTML = html;
  
  // Configurar evento para el formulario de filtros
  const formFiltroEstadisticas = document.getElementById('formFiltroEstadisticas');
  if (formFiltroEstadisticas) {
    formFiltroEstadisticas.addEventListener('submit', (event) => {
      event.preventDefault();
      
      const periodo = document.getElementById('periodoEstadisticas').value;
      const tipo = document.getElementById('tipoEstadisticas').value;
      
      // Importar el controlador dinámicamente para evitar dependencias circulares
      import('../controllers/reporteController.js').then(module => {
        module.generarEstadisticasPersonalizadas({ periodo, tipo });
      });
    });
  }
}

// Renderiza la sección de actividades
export function renderActividades() {
  const section = document.getElementById('actividades-section');
  if (!section) return;

  // Limpiar otras secciones para evitar contenido mezclado
  try { document.getElementById('estadisticas-section').innerHTML = ''; } catch(e) {}
  try { document.getElementById('exportacion-section').innerHTML = ''; } catch(e) {}
  
  // Obtener usuarios para el filtro
  const usuarios = authModel.getAllUsers();
  
  let html = `
    <div class="section-header">
      <h2>Registro de Actividades</h2>
    </div>
    
    <div class="filtros-container">
      <h3>Filtros</h3>
      <form id="formFiltroActividades" class="form-filtros">
        <div class="form-row">
          <div class="form-group col-md-6">
            <label for="fechaInicio">Desde:</label>
            <input type="date" id="fechaInicio" name="fechaInicio">
          </div>
          <div class="form-group col-md-6">
            <label for="fechaFin">Hasta:</label>
            <input type="date" id="fechaFin" name="fechaFin">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group col-md-6">
            <label for="usuario">Usuario:</label>
            <select id="usuario" name="usuario">
              <option value="">Todos los usuarios</option>
              ${usuarios.map(u => `<option value="${u.usuario}">${u.nombre} (${u.usuario})</option>`).join('')}
            </select>
          </div>
          <div class="form-group col-md-6">
            <label for="accion">Acción:</label>
            <select id="accion" name="accion">
              <option value="">Todas las acciones</option>
              <option value="login">Inicio de sesión</option>
              <option value="logout">Cierre de sesión</option>
              <option value="create">Creación de registros</option>
              <option value="update">Actualización de registros</option>
              <option value="delete">Eliminación de registros</option>
            </select>
          </div>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn-primary">Filtrar</button>
          <button type="reset" class="btn-secondary">Limpiar filtros</button>
        </div>
      </form>
    </div>
    
    <div class="resultados-container" id="resultadosActividades">
      <!-- Aquí se mostrarán los resultados de la búsqueda -->
      <div class="alert-info">
        Selecciona los filtros y haz clic en "Filtrar" para ver el registro de actividades.
      </div>
    </div>
  `;
  
  section.innerHTML = html;
  
  // Establecer fechas predeterminadas (último mes)
  const hoy = new Date();
  const inicioMes = new Date(hoy);
  inicioMes.setMonth(hoy.getMonth() - 1);
  
  document.getElementById('fechaInicio').value = inicioMes.toISOString().split('T')[0];
  document.getElementById('fechaFin').value = hoy.toISOString().split('T')[0];
  
  // Configurar evento para el formulario de filtros
  const formFiltroActividades = document.getElementById('formFiltroActividades');
  if (formFiltroActividades) {
    formFiltroActividades.addEventListener('submit', (event) => {
      event.preventDefault();
      
      const fechaInicio = document.getElementById('fechaInicio').value;
      const fechaFin = document.getElementById('fechaFin').value;
      const usuario = document.getElementById('usuario').value;
      const accion = document.getElementById('accion').value;
      
      // Importar el controlador dinámicamente para evitar dependencias circulares
      import('../controllers/reporteController.js').then(module => {
        module.filtrarActividades({ fechaInicio, fechaFin, usuario, accion });
      });
    });
    
    // Evento para resetear el formulario
    formFiltroActividades.addEventListener('reset', () => {
      // Después de reset, restablecer las fechas predeterminadas
      setTimeout(() => {
        document.getElementById('fechaInicio').value = inicioMes.toISOString().split('T')[0];
        document.getElementById('fechaFin').value = hoy.toISOString().split('T')[0];
      }, 10);
    });
  }
}

// Renderiza la sección de exportación
export function renderExportacion() {
  const section = document.getElementById('exportacion-section');
  if (!section) return;

  // Limpiar otras secciones para evitar contenido mezclado
  try { document.getElementById('estadisticas-section').innerHTML = ''; } catch(e) {}
  try { document.getElementById('actividades-section').innerHTML = ''; } catch(e) {}
  
  let html = `
    <div class="section-header">
      <h2>Exportación de Datos</h2>
    </div>
    
    <div class="exportacion-container">
      <div class="exportacion-card">
        <div class="exportacion-icon">
          <i class="fas fa-users"></i>
        </div>
        <div class="exportacion-info">
          <h3>Pacientes</h3>
          <p>Exporta la lista completa de pacientes registrados en el sistema.</p>
        </div>
        <button class="btn-exportar" data-tipo="pacientes">
          <i class="fas fa-file-csv"></i> Exportar CSV
        </button>
      </div>
      
      <div class="exportacion-card">
        <div class="exportacion-icon">
          <i class="fas fa-calendar-check"></i>
        </div>
        <div class="exportacion-info">
          <h3>Citas</h3>
          <p>Exporta todas las citas registradas con sus respectivos estados.</p>
        </div>
        <button class="btn-exportar" data-tipo="citas">
          <i class="fas fa-file-csv"></i> Exportar CSV
        </button>
      </div>
      
      <div class="exportacion-card">
        <div class="exportacion-icon">
          <i class="fas fa-clipboard-list"></i>
        </div>
        <div class="exportacion-info">
          <h3>Historial médico</h3>
          <p>Exporta todos los registros del historial médico de los pacientes.</p>
        </div>
        <button class="btn-exportar" data-tipo="historial">
          <i class="fas fa-file-csv"></i> Exportar CSV
        </button>
      </div>
      
      <div class="exportacion-card">
        <div class="exportacion-icon">
          <i class="fas fa-chart-line"></i>
        </div>
        <div class="exportacion-info">
          <h3>Actividades</h3>
          <p>Exporta el registro completo de actividades del sistema.</p>
        </div>
        <button class="btn-exportar" data-tipo="actividades">
          <i class="fas fa-file-csv"></i> Exportar CSV
        </button>
      </div>
    </div>
  `;
  
  section.innerHTML = html;
  
  // Configurar eventos para los botones de exportación
  const botonesExportar = document.querySelectorAll('.btn-exportar');
  if (botonesExportar.length > 0) {
    botonesExportar.forEach(boton => {
      boton.addEventListener('click', () => {
        const tipoExportacion = boton.getAttribute('data-tipo');
        
        // Importar el controlador dinámicamente para evitar dependencias circulares
        import('../controllers/reporteController.js').then(module => {
          module.exportarDatosCSV(tipoExportacion);
        });
      });
    });
  }
}

// Funciones auxiliares para gráficos

function generarGraficoActividad(datosActividad) {
  // Si no hay datos, mostrar mensaje
  if (!datosActividad || Object.keys(datosActividad).length === 0) {
    return '<div class="alert-info">No hay datos suficientes para generar el gráfico.</div>';
  }
  
  const labels = [];
  const values = [];
  const maxValue = Math.max(...Object.values(datosActividad), 1);
  
  // Ordenar fechas
  const sortedDates = Object.keys(datosActividad).sort();
  
  for (const fecha of sortedDates) {
    const value = datosActividad[fecha];
    const fechaFormateada = formatearFecha(fecha);
    labels.push(fechaFormateada);
    values.push(value);
  }
  
  let html = '<div class="chart-container">';
  
  // Crear etiquetas de ejes
  html += '<div class="chart-y-axis">';
  for (let i = maxValue; i >= 0; i -= Math.ceil(maxValue / 5)) {
    html += `<div class="chart-y-label">${i}</div>`;
  }
  html += '</div>';
  
  // Crear gráfico de barras
  html += '<div class="chart-bars">';
  for (let i = 0; i < values.length; i++) {
    const heightPercentage = (values[i] / maxValue) * 100;
    html += `
      <div class="chart-bar-column">
        <div class="chart-bar-tooltip">${values[i]} acciones</div>
        <div class="chart-bar" style="height: ${heightPercentage}%"></div>
        <div class="chart-x-label">${labels[i]}</div>
      </div>
    `;
  }
  html += '</div>';
  
  html += '</div>';
  
  return html;
}

function generarGraficoPie(datos) {
  // Si no hay datos, mostrar mensaje
  if (!datos || Object.keys(datos).length === 0) {
    return '<div class="alert-info">No hay datos suficientes para generar el gráfico.</div>';
  }
  
  const labels = Object.keys(datos);
  const values = Object.values(datos);
  const total = values.reduce((sum, val) => sum + val, 0);
  
  let html = '<div class="pie-chart-container">';
  
  // Gráfico de dona
  html += '<div class="pie-chart">';
  
  let startAngle = 0;
  const colors = ['#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];
  
  for (let i = 0; i < values.length; i++) {
    const percentage = (values[i] / total) * 100;
    const angle = (percentage / 100) * 360;
    const endAngle = startAngle + angle;
    
    if (percentage > 0) {
      html += `
        <div class="pie-segment" style="
          --start-angle: ${startAngle}deg;
          --end-angle: ${endAngle}deg;
          --color: ${colors[i % colors.length]};
        " data-label="${labels[i]}" data-value="${values[i]}" data-percentage="${percentage.toFixed(1)}%">
        </div>
      `;
    }
    
    startAngle = endAngle;
  }
  
  html += '</div>';
  
  // Leyenda
  html += '<div class="pie-legend">';
  for (let i = 0; i < labels.length; i++) {
    const percentage = (values[i] / total) * 100;
    html += `
      <div class="legend-item">
        <span class="legend-color" style="background-color: ${colors[i % colors.length]}"></span>
        <span class="legend-label">${labels[i]}: ${values[i]} (${percentage.toFixed(1)}%)</span>
      </div>
    `;
  }
  html += '</div>';
  
  html += '</div>';
  
  return html;
}

// Estilos CSS para los gráficos (se insertarán en la página dinámicamente)
export function insertarEstilosGraficos() {
  // Si ya existe el estilo, no añadir de nuevo
  if (document.getElementById('reportes-graficos-styles')) {
    return;
  }
  
  const style = document.createElement('style');
  style.id = 'reportes-graficos-styles';
  style.innerHTML = `
    /* Estilos para gráficos de barras */
    .chart-container {
      display: flex;
      align-items: flex-end;
      height: 200px;
      margin-top: 20px;
      padding-bottom: 30px;
      border-bottom: 2px solid #e5e7eb;
      position: relative;
    }

    .chart-y-axis {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
      padding-right: 10px;
      border-right: 1px solid #e5e7eb;
    }

    .chart-y-label {
      font-size: 0.8rem;
      color: #6b7280;
      margin-right: 5px;
      text-align: right;
    }

    .chart-bars {
      display: flex;
      align-items: flex-end;
      flex: 1;
      height: 100%;
      padding-left: 10px;
    }

    .chart-bar-column {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
    }

    .chart-bar {
      width: 20px;
      background: linear-gradient(to top, #7dd3fc, #06b6d4);
      border-radius: 4px 4px 0 0;
      position: relative;
      transition: height 0.5s ease;
    }

    .chart-bar-tooltip {
      position: absolute;
      top: -30px;
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      padding: 3px 6px;
      font-size: 0.7rem;
      opacity: 0;
      transition: opacity 0.2s;
      pointer-events: none;
      white-space: nowrap;
      z-index: 10;
    }

    .chart-bar-column:hover .chart-bar-tooltip {
      opacity: 1;
    }

    .chart-x-label {
      position: absolute;
      bottom: -25px;
      font-size: 0.8rem;
      color: #6b7280;
      text-align: center;
      transform: rotate(-45deg);
      white-space: nowrap;
      transform-origin: top left;
    }

    /* Estilos para gráficos de pie */
    .pie-chart-container {
      display: flex;
      align-items: center;
      margin: 20px 0;
      flex-wrap: wrap;
      gap: 30px;
    }

    .pie-chart {
      position: relative;
      width: 200px;
      height: 200px;
      border-radius: 50%;
      background-color: #f3f4f6;
      overflow: hidden;
    }

    .pie-segment {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      transform-origin: center;
      background: conic-gradient(
        var(--color) var(--start-angle),
        var(--color) var(--end-angle),
        transparent var(--end-angle)
      );
    }

    .pie-segment:hover::after {
      content: attr(data-label) ": " attr(data-value) " (" attr(data-percentage) ")";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(255, 255, 255, 0.9);
      padding: 5px 10px;
      border-radius: 4px;
      white-space: nowrap;
      font-size: 0.8rem;
      z-index: 100;
      pointer-events: none;
    }

    .pie-legend {
      flex: 1;
      min-width: 200px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
    }

    .legend-color {
      width: 15px;
      height: 15px;
      border-radius: 3px;
      margin-right: 8px;
    }

    .legend-label {
      font-size: 0.9rem;
      color: #4b5563;
    }

    /* Estilos para las cards de estadísticas */
    .stats-cards {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      margin-bottom: 30px;
    }

    .stats-card {
      flex: 1;
      min-width: 200px;
      background: white;
      border-radius: 12px;
      border: 1px solid rgba(125, 211, 252, 0.3);
      padding: 20px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: 15px;
      transition: all 0.3s ease;
    }

    .stats-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 15px 40px rgba(125, 211, 252, 0.2);
    }

    .stats-icon {
      font-size: 2rem;
      color: #06b6d4;
      background: rgba(125, 211, 252, 0.1);
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .stats-info {
      display: flex;
      flex-direction: column;
    }

    .stats-value {
      font-size: 1.8rem;
      font-weight: 700;
      background: linear-gradient(135deg, #06b6d4, #0891b2);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .stats-label {
      font-size: 0.9rem;
      color: #6b7280;
    }

    /* Estilos para las secciones de estadísticas */
    .estadisticas-seccion {
      margin-bottom: 40px;
    }

    .estadisticas-seccion h3 {
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid rgba(125, 211, 252, 0.3);
      color: #1f2937;
    }

    /* Estilos para formulario de filtros */
    .filtros-container {
      background: rgba(255, 255, 255, 0.8);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 30px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(125, 211, 252, 0.2);
    }

    .filtros-container h3 {
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 15px;
      color: #1f2937;
      background: linear-gradient(135deg, #06b6d4, #0891b2);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .filtros-estadisticas {
      background: rgba(255, 255, 255, 0.8);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 30px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(125, 211, 252, 0.2);
      max-width: 400px;
    }

    .filtros-estadisticas h3 {
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 15px;
      color: #1f2937;
      background: linear-gradient(135deg, #06b6d4, #0891b2);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .estadisticas-container {
      display: flex;
      flex-wrap: wrap;
      gap: 30px;
    }

    .estadisticas-display {
      flex: 1;
      min-width: 300px;
    }

    /* Estilos para alertas informativas */
    .alert-info {
      background: rgba(125, 211, 252, 0.2);
      border: 1px solid rgba(125, 211, 252, 0.5);
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      text-align: center;
      color: #0891b2;
    }

    /* Estilos para tarjetas de exportación */
    .exportacion-container {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      margin-top: 30px;
    }

    .exportacion-card {
      background: white;
      border-radius: 12px;
      padding: 25px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(125, 211, 252, 0.3);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 15px;
      transition: all 0.3s ease;
    }

    .exportacion-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 15px 40px rgba(125, 211, 252, 0.2);
    }

    .exportacion-icon {
      font-size: 2rem;
      color: #06b6d4;
      background: rgba(125, 211, 252, 0.1);
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .exportacion-info {
      text-align: center;
      margin-bottom: 10px;
    }

    .exportacion-info h3 {
      font-size: 1.2rem;
      font-weight: 600;
      margin-bottom: 10px;
      color: #1f2937;
    }

    .exportacion-info p {
      color: #6b7280;
      font-size: 0.9rem;
      line-height: 1.5;
    }

    .btn-exportar {
      background: linear-gradient(135deg, #7dd3fc, #fef3c7);
      color: #1f2937;
      border: none;
      border-radius: 25px;
      padding: 10px 20px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-exportar:hover {
      background: linear-gradient(135deg, #38bdf8, #fbbf24);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(125, 211, 252, 0.3);
    }

    /* Estilos responsivos */
    @media (max-width: 768px) {
      .stats-cards {
        flex-direction: column;
      }
      
      .stats-card {
        min-width: 100%;
      }
      
      .pie-chart-container {
        justify-content: center;
      }
      
      .filtros-estadisticas {
        max-width: none;
      }
      
      .exportacion-container {
        grid-template-columns: 1fr;
      }
    }
  `;
  
  document.head.appendChild(style);
}