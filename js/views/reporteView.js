// js/views/reporteView.js
import { reporteModel } from '../models/reporteModel.js';
import { pacienteModel } from '../models/pacienteModel.js';
import { authModel } from '../models/storageModel.js';
import eventBus, { EVENT_NAMES } from '../utils/eventBus.js';

// Función para formatear fechas
function formatearFecha(fecha) {
  if (!fecha) return '';
  const date = new Date(fecha);
  return isNaN(date) ? fecha : date.toLocaleDateString('es-MX');
}

// Renderiza la sección de estadísticas
export async function renderEstadisticas(estadisticasPrevia = null, options = {}) {
  const section = document.getElementById('estadisticas-section');
  if (!section) return;

  // Limpiar otras secciones para evitar contenido mezclado
  try { document.getElementById('actividades-section').innerHTML = ''; } catch(e) {}
  try { document.getElementById('exportacion-section').innerHTML = ''; } catch(e) {}

  // Mostrar versión compacta solo si se solicita explícitamente via options.compact
  const compactMode = options && options.compact === true;
  if (compactMode) {
    const estadisticas = estadisticasPrevia || await reporteModel.getEstadisticas();
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
  const estadisticas = estadisticasPrevia || await reporteModel.getEstadisticas();
  
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
        // llamar y no bloquear
        module.generarEstadisticasPersonalizadas({ periodo, tipo });
      });
    });
  }

  // Renderizar listado de pacientes y panel de selección
  try {
    await renderPatientListAndSelector('contenedorEstadisticas');
  } catch (err) {
    console.error('Error iniciando listado de pacientes para estadísticas:', err);
    // Caída segura: intentar generar todas las gráficas
    generarGraficasPorPaciente().catch(e => console.error('Error generando gráficas por paciente:', e));
  }

  // Generar sección de gráficas globales (obesidad por IMC y presión alta por semana)
  try {
    await generarGraficasGlobales('contenedorEstadisticas');
  } catch (e) {
    console.warn('No se pudieron generar las gráficas globales:', e);
  }
}

// Renderiza la sección de actividades
export async function renderActividades() {
  const section = document.getElementById('actividades-section');
  if (!section) return;

  // Limpiar otras secciones para evitar contenido mezclado
  try { document.getElementById('estadisticas-section').innerHTML = ''; } catch(e) {}
  try { document.getElementById('exportacion-section').innerHTML = ''; } catch(e) {}
  
  // Obtener usuarios para el filtro
  const usuarios = await authModel.getAllUsers();
  
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
          <i class="fas fa-file-pdf"></i> Exportar PDF
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
          <i class="fas fa-file-pdf"></i> Exportar PDF
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
          <i class="fas fa-file-pdf"></i> Exportar PDF
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
          <i class="fas fa-file-pdf"></i> Exportar PDF
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

// Cargar Chart.js dinámicamente (UMD build) y devolver una promesa que resuelve cuando Chart está disponible
function loadChartJS() {
  return new Promise((resolve, reject) => {
    if (window.Chart) return resolve(window.Chart);

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    script.async = true;
    script.onload = () => {
      if (window.Chart) resolve(window.Chart);
      else reject(new Error('Chart.js cargado pero no disponible'));
    };
    script.onerror = (e) => reject(new Error('No se pudo cargar Chart.js'));
    document.head.appendChild(script);
  });
}

// Fallback: dibujador ligero de líneas usando Canvas para funcionar sin internet
function drawSimpleLineChartOnCanvas(canvas, labels, data, opts = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.clientWidth || 600;
  const h = canvas.height = canvas.clientHeight || 240;
  // Clear
  ctx.clearRect(0, 0, w, h);

  const padding = { top: 24, right: 20, bottom: 36, left: 40 };
  const innerW = w - padding.left - padding.right;
  const innerH = h - padding.top - padding.bottom;

  // Ensure integer ticks and safe values
  const numeric = data.map(v => (typeof v === 'number' && !isNaN(v)) ? v : 0);
  const max = Math.max(...numeric, 1);
  const min = 0;

  // X positions
  const stepX = innerW / Math.max(1, labels.length - 1);

  // Draw axes
  ctx.strokeStyle = '#e6eef2'; ctx.lineWidth = 1;
  // Y axis
  ctx.beginPath(); ctx.moveTo(padding.left, padding.top); ctx.lineTo(padding.left, padding.top + innerH); ctx.stroke();
  // X axis
  ctx.beginPath(); ctx.moveTo(padding.left, padding.top + innerH); ctx.lineTo(padding.left + innerW, padding.top + innerH); ctx.stroke();

  // Y ticks
  const ticks = 5;
  ctx.fillStyle = '#374151'; ctx.font = '12px sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let i = 0; i <= ticks; i++) {
    const y = padding.top + innerH - (i / ticks) * innerH;
    const value = Math.round(min + (i / ticks) * (max - min));
    ctx.fillText(String(value), padding.left - 8, y);
    ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(padding.left + innerW, y); ctx.strokeStyle = 'rgba(230,238,242,0.6)'; ctx.stroke();
  }

  // Draw line
  ctx.beginPath();
  numeric.forEach((v, idx) => {
    const x = padding.left + (stepX * idx || 0);
    const y = padding.top + innerH - ((v - min) / (max - min || 1)) * innerH;
    if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = opts.color || '#06b6d4'; ctx.lineWidth = 2; ctx.stroke();

  // Draw points and labels
  ctx.fillStyle = opts.color || '#06b6d4';
  numeric.forEach((v, idx) => {
    const x = padding.left + (stepX * idx || 0);
    const y = padding.top + innerH - ((v - min) / (max - min || 1)) * innerH;
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
    // value label
    ctx.fillStyle = '#0f172a'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(v), x, y - 10);
    ctx.fillStyle = opts.color || '#06b6d4';
  });

  // X labels (rotate if necessary)
  ctx.fillStyle = '#374151'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  labels.forEach((lab, idx) => {
    const x = padding.left + (stepX * idx || 0);
    let text = String(lab);
    // Shorten long labels
    if (text.length > 12) text = text.slice(0, 12) + '...';
    ctx.fillText(text, x, padding.top + innerH + 6);
  });

  // Title
  if (opts.title) {
    ctx.fillStyle = '#0f172a'; ctx.font = '14px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(opts.title, padding.left, 12);
  }

  // ARIA: set description
  try {
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', opts.aria || opts.title || 'Gráfica');
  } catch (e) {}
}

  // Genera gráficas de línea para cada paciente con los campos: peso, IMC, glucosa, presión arterial y frecuencia respiratoria.
export async function generarGraficasPorPaciente(containerId = 'contenedorEstadisticas') {
  insertarEstilosGraficos();

  const contenedor = document.getElementById(containerId);
  if (!contenedor) return;

  // Intentar cargar Chart.js pero no detener la generación si falla (usaremos un renderer local de fallback)
  try { await loadChartJS(); } catch (err) { console.warn('Chart.js no disponible, se usará renderer local de fallback si es necesario.', err); }

  const pacientes = await pacienteModel.getPacientes();
  if (!pacientes || pacientes.length === 0) {
    contenedor.innerHTML = '<div class="alert-info">No hay pacientes para generar gráficas.</div>';
    return;
  }

  // Reusar o crear wrapper
  let wrapper = document.querySelector('.pacientes-charts-wrapper');
  if (wrapper && contenedor.contains(wrapper)) wrapper.innerHTML = '';
  else { wrapper = document.createElement('div'); wrapper.className = 'pacientes-charts-wrapper'; contenedor.appendChild(wrapper); }

  // Función helper para crear tarjetas de parámetro
  const createParamCard = (paciente, paramKey, title, labels, values) => {
    const validCount = values.filter(v => typeof v === 'number' && !isNaN(v)).length;
    const card = document.createElement('div');
    card.className = 'patient-param-card';
    card.innerHTML = `
      <div class="param-card-header"><strong>${title}</strong></div>
      <div class="param-card-body" id="param-body-${paciente.id}-${paramKey}"></div>
    `;

    const body = card.querySelector(`#param-body-${paciente.id}-${paramKey}`);
    if (validCount < 2) {
      body.innerHTML = '<div class="alert-info">Información insuficiente para la generación de la gráfica</div>';
      return card;
    }

    const canvas = document.createElement('canvas');
    canvas.id = `chart-${paciente.id}-${paramKey}`;
    canvas.width = 600;
    canvas.height = 220;
    body.appendChild(canvas);

    try {
      const ctx = canvas.getContext('2d');
      // eslint-disable-next-line no-undef
      new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: [{ label: title, data: values, borderColor: '#06b6d4', backgroundColor: 'transparent', spanGaps: true, tension: 0.2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: true }, y: { display: true, beginAtZero: false } } }
      });
    } catch (e) {
      console.error('Error creando gráfico param', paramKey, e);
      body.innerHTML = '<div class="alert-info">Error generando la gráfica</div>';
    }

    return card;
  };

  pacientes.forEach(paciente => {
    // Recolectar puntos cronológicos
    const puntos = [];
    if (Array.isArray(paciente.historialCambios)) paciente.historialCambios.forEach(h => puntos.push({ fecha: h.fecha || (h.datos && h.datos.fechaRegistroMedico) || null, datos: h.datos || h }));
    if (paciente.fechaRegistroInicial && paciente.datosMedicos) puntos.push({ fecha: paciente.fechaRegistroInicial || paciente.datosMedicos.fechaRegistroMedico, datos: paciente.datosMedicos });
    if (paciente.datosMedicos && paciente.datosMedicos.fechaRegistroMedico) {
      const existe = puntos.some(p => p.fecha === paciente.datosMedicos.fechaRegistroMedico);
      if (!existe) puntos.push({ fecha: paciente.datosMedicos.fechaRegistroMedico, datos: paciente.datosMedicos });
    }

    puntos.sort((a, b) => new Date(a.fecha || 0) - new Date(b.fecha || 0));

    const labels = puntos.map(pt => pt.fecha ? new Date(pt.fecha).toLocaleDateString('es-ES') : 'Sin fecha');

    // Construir series por parámetro
    const seriesPeso = puntos.map(pt => { const d = pt.datos||{}; const val = d.peso ? parseFloat(d.peso) : null; return isFinite(val) ? val : null; });
    const seriesIMC = puntos.map(pt => { const d = pt.datos||{}; const peso = d.peso ? parseFloat(d.peso) : null; const talla = d.talla ? parseFloat(d.talla) : null; const imc = (peso && talla) ? parseFloat((peso / Math.pow((talla/100),2)).toFixed(1)) : null; return imc !== null ? imc : null; });
  const seriesPresion = puntos.map(pt => { const d = pt.datos||{}; if (d.presion && typeof d.presion === 'string' && d.presion.includes('/')) { const parts = d.presion.split('/').map(s=>parseInt(s.trim(),10)); return Number.isFinite(parts[0]) ? parts[0] : null; } if (d.presion && !isNaN(parseFloat(d.presion))) return parseFloat(d.presion); return null; });
  const seriesGlucosa = puntos.map(pt => { const d = pt.datos||{}; const g = d.glucosa ? parseFloat(d.glucosa) : null; return isFinite(g) ? g : null; });
  const seriesFrecuencia = puntos.map(pt => { const d = pt.datos||{}; const f = d.frecuenciaRespiratoria ? parseFloat(d.frecuenciaRespiratoria) : null; return isFinite(f) ? f : null; });

    // Crear tarjeta principal por paciente y añadir sub-cards por parámetro
    const pacienteCard = document.createElement('div');
    pacienteCard.className = 'patient-chart-card';
    pacienteCard.innerHTML = `
      <div class="patient-chart-header">
        <div class="patient-title"><strong>${paciente.nombre} ${paciente.apellidos || ''}</strong> • ${paciente.matricula}</div>
        <div class="patient-meta">Última actualización: ${paciente.datosMedicos && paciente.datosMedicos.fechaRegistroMedico ? new Date(paciente.datosMedicos.fechaRegistroMedico).toLocaleString('es-ES') : 'Sin datos'}</div>
      </div>
      <div class="patient-params-grid" id="patient-params-${paciente.id}"></div>
    `;

    wrapper.appendChild(pacienteCard);

    const paramsGrid = pacienteCard.querySelector(`#patient-params-${paciente.id}`);
    paramsGrid.style.display = 'grid';
    paramsGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(260px, 1fr))';
    paramsGrid.style.gap = '12px';

  paramsGrid.appendChild(createParamCard(paciente, 'peso', 'Peso (kg)', labels, seriesPeso));
  paramsGrid.appendChild(createParamCard(paciente, 'imc', 'IMC', labels, seriesIMC));
  paramsGrid.appendChild(createParamCard(paciente, 'presion', 'Presión Arterial', labels, seriesPresion));
  paramsGrid.appendChild(createParamCard(paciente, 'glucosa', 'Glucosa (mg/dL)', labels, seriesGlucosa));
  paramsGrid.appendChild(createParamCard(paciente, 'frecuencia', 'Frecuencia Respiratoria (rpm)', labels, seriesFrecuencia));
  });

  // Estilos ligeros para las sub-cards
  if (!document.getElementById('patient-charts-styles')) {
    const s = document.createElement('style'); s.id = 'patient-charts-styles';
    s.innerHTML = `
      .pacientes-charts-wrapper { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 18px; margin-top: 20px; }
      .patient-chart-card { background: white; border-radius: 10px; padding: 12px; border: 1px solid #e6eef2; box-shadow: 0 6px 18px rgba(2,6,23,0.04); }
      .patient-chart-header { display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:8px; }
      .patient-title { font-size: 1rem; color: #0f172a; }
      .patient-meta { font-size: 0.8rem; color: #6b7280; }
      .patient-param-card { background: #fff; border-radius: 8px; padding:10px; border:1px solid #eef2f6; min-height: 140px; }
      .param-card-header { font-weight:700; margin-bottom:8px; }
      .param-card-body { height: 160px; }
    `;
    document.head.appendChild(s);
  }
}

// Renderiza una lista lateral (o horizontal) de pacientes para seleccionar cuál visualizar
export async function renderPatientListAndSelector(containerId = 'contenedorEstadisticas') {
  const contenedor = document.getElementById(containerId);
  if (!contenedor) return;

  // Preparar panel: contenedor principal dividido en lista + area de gráficos
  // Si ya existe un layout previo, limpiarlo. Asegurarse además de envolverlo
  // dentro de un contenedor `.estadisticas-seccion` para mantener la consistencia
  // con las demás secciones de estadísticas.
  let layout = document.querySelector('.estadisticas-patient-layout');
  let sectionWrapper = null;

  if (layout && contenedor.contains(layout)) {
    // Si el layout ya existe en DOM, comprobar si está envuelto por una sección
    if (!layout.parentElement || !layout.parentElement.classList.contains('estadisticas-seccion')) {
      // Crear wrapper y mover el layout dentro
      sectionWrapper = document.createElement('div');
      sectionWrapper.className = 'estadisticas-seccion';
      sectionWrapper.innerHTML = '<h3>Gráficas de pacientes</h3>';
      // Reemplazar el layout existente por el wrapper y anidar el layout dentro
      contenedor.replaceChild(sectionWrapper, layout);
      sectionWrapper.appendChild(layout);
    } else {
      sectionWrapper = layout.parentElement;
    }

    // mantener el layout pero limpiar la lista y las gráficas
    const listPanel = layout.querySelector('.patient-list-panel');
    const chartsPanel = layout.querySelector('.patient-charts-panel');
    if (listPanel) listPanel.innerHTML = '';
    if (chartsPanel) chartsPanel.innerHTML = '';
  } else {
    // Crear nuevo layout y wrapper (sección)
    layout = document.createElement('div');
    layout.className = 'estadisticas-patient-layout';
    layout.innerHTML = `
      <div class="patient-list-panel"></div>
      <div class="patient-charts-panel" id="patient-charts-panel">
        <h3 class="patient-charts-title">Gráficas individuales</h3>
      </div>
    `;

    sectionWrapper = document.createElement('div');
    sectionWrapper.className = 'estadisticas-seccion';
    sectionWrapper.innerHTML = '<h3>Gráficas Individuales</h3>';
    sectionWrapper.appendChild(layout);

    // Insertar wrapper al final del contenedor para que aparezca después de las secciones previas
    contenedor.appendChild(sectionWrapper);
  }

  const listPanel = layout.querySelector('.patient-list-panel');
  const chartsPanel = layout.querySelector('.patient-charts-panel');

  // Crear un selector desplegable que no cargue todas las opciones hasta interacción
  const select = document.createElement('select');
  select.id = 'patient-select';
  select.className = 'patient-select';

  // Opción placeholder (por defecto)
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '— Selecciona un paciente —';
  placeholder.selected = true;
  placeholder.disabled = true;
  select.appendChild(placeholder);

  // Opción para mostrar todos (se mantiene pero no carga listado individual hasta que se pida)
  const optionAll = document.createElement('option');
  optionAll.value = 'ALL';
  optionAll.textContent = 'Mostrar todos';
  select.appendChild(optionAll);

  // Flag para cargar pacientes solo una vez cuando el usuario interactúe
  let pacientesCargados = false;

  // Función para poblar opciones de pacientes
  const poblarOpcionesPacientes = async () => {
    if (pacientesCargados) return;
    pacientesCargados = true;
    const pacientes = await pacienteModel.getPacientes();
    if (!pacientes || pacientes.length === 0) {
      listPanel.innerHTML = '<div class="alert-info">No hay pacientes registrados</div>';
      return;
    }

    pacientes.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.nombre} ${p.apellidos || ''} — ${p.matricula || ''}`;
      select.appendChild(opt);
    });
  };

  // Cargar opciones cuando el usuario abra/active el select (focus or mousedown)
  select.addEventListener('focus', poblarOpcionesPacientes, { once: true });
  select.addEventListener('mousedown', poblarOpcionesPacientes, { once: true });

  listPanel.appendChild(select);

  // Estilos para el panel (inserción ligera si no existen)
  if (!document.getElementById('patient-list-styles')) {
    const s = document.createElement('style');
    s.id = 'patient-list-styles';
    s.innerHTML = `
      .estadisticas-patient-layout { display: flex; gap: 18px; margin-bottom: 18px; }
      .patient-list-panel { width: 260px; background: #fff; border-radius: 8px; padding: 10px; border: 1px solid #e6eef2; height: 380px; overflow: auto; }
  .patient-charts-panel { flex: 1; }
  .patient-charts-title { 
    margin: 0 0 12px 6px; 
    font-size: 1.1rem; 
    color: #0f172a; 
    font-weight: 700;
    padding-bottom: 8px; /* Añadido: Espacio debajo del título */
    border-bottom: 2px solid #06b6d4; /* Añadido: Separador azul */
    display: block;
  }
      .patient-search-input { width: 100%; padding: 8px 10px; margin-bottom: 8px; border-radius: 6px; border: 1px solid #e5e7eb; }
        .patient-select { width: 100%; padding: 8px 10px; margin-bottom: 8px; border-radius: 6px; border: 1px solid #e5e7eb; background: #fff; font-size: 0.95rem; }
        .patient-list-ul { list-style: none; padding: 0; margin:0; }
        .patient-list-item { padding: 10px 8px; border-radius: 6px; cursor: pointer; color: #0f172a; margin-bottom: 6px; }
        .patient-list-item:hover { background: #f1f5f9; }
        .patient-list-item.active { background: linear-gradient(90deg,#e6f7fb,#f0f9ff); border-left: 3px solid #06b6d4; }
        .patient-list-item.all-item { font-weight: 700; }
    `;
    document.head.appendChild(s);
  }

  // Cambio en el select: generar gráfica del paciente seleccionado o todos
  select.addEventListener('change', (e) => {
    const id = e.target.value;
    // Si el usuario dejó la opción placeholder, no hacemos nada
    if (!id) return;
    chartsPanel.innerHTML = '';
    if (id === 'ALL') {
      generarGraficasPorPaciente('patient-charts-panel');
    } else {
      renderSinglePacienteChart(id, 'patient-charts-panel');
    }
  });
}

// Renderiza únicamente la gráfica de un paciente dado en el containerId
export async function renderSinglePacienteChart(pacienteId, containerId = 'contenedorEstadisticas') {
  insertarEstilosGraficos();
  const contenedor = document.getElementById(containerId);
  if (!contenedor) return;

  try { await loadChartJS(); } catch (e) { console.error(e); contenedor.innerHTML = '<div class="alert-info">No se pudo cargar Chart.js</div>'; return; }

  const paciente = await pacienteModel.getPaciente(pacienteId);
  if (!paciente) { contenedor.innerHTML = '<div class="alert-info">Paciente no encontrado</div>'; return; }

  contenedor.innerHTML = '';

  // Recolectar puntos cronológicos
  const puntos = [];
  if (Array.isArray(paciente.historialCambios)) paciente.historialCambios.forEach(h => puntos.push({ fecha: h.fecha || (h.datos && h.datos.fechaRegistroMedico) || null, datos: h.datos || h }));
  if (paciente.fechaRegistroInicial && paciente.datosMedicos) puntos.push({ fecha: paciente.fechaRegistroInicial || paciente.datosMedicos.fechaRegistroMedico, datos: paciente.datosMedicos });
  if (paciente.datosMedicos && paciente.datosMedicos.fechaRegistroMedico) {
    const existe = puntos.some(p => p.fecha === paciente.datosMedicos.fechaRegistroMedico);
    if (!existe) puntos.push({ fecha: paciente.datosMedicos.fechaRegistroMedico, datos: paciente.datosMedicos });
  }
  puntos.sort((a,b)=>new Date(a.fecha||0)-new Date(b.fecha||0));

  const labels = puntos.map(pt => pt.fecha ? new Date(pt.fecha).toLocaleDateString('es-ES') : 'Sin fecha');
  const seriesPeso = puntos.map(pt => { const d=pt.datos||{}; const v = d.peso ? parseFloat(d.peso) : null; return isFinite(v)?v:null; });
  const seriesIMC  = puntos.map(pt => { const d=pt.datos||{}; const p = d.peso?parseFloat(d.peso):null; const t = d.talla?parseFloat(d.talla):null; const imc = (p && t) ? parseFloat((p/Math.pow((t/100),2)).toFixed(1)) : null; return imc!==null?imc:null; });
  const seriesPresion = puntos.map(pt => { const d=pt.datos||{}; if (d.presion && typeof d.presion==='string' && d.presion.includes('/')){ const parts=d.presion.split('/').map(s=>parseInt(s.trim(),10)); return Number.isFinite(parts[0])?parts[0]:null; } if (d.presion && !isNaN(parseFloat(d.presion))) return parseFloat(d.presion); return null; });
  const seriesGlucosa = puntos.map(pt => { const d=pt.datos||{}; const g = d.glucosa?parseFloat(d.glucosa):null; return isFinite(g)?g:null; });
  const seriesFrecuencia = puntos.map(pt => { const d = pt.datos||{}; const f = d.frecuenciaRespiratoria ? parseFloat(d.frecuenciaRespiratoria) : null; return isFinite(f) ? f : null; });

  // Crear contenedor de paciente
  const card = document.createElement('div'); card.className='patient-chart-card';
  card.innerHTML = `
    <div class="patient-chart-header">
      <div class="patient-title"><strong>${paciente.nombre} ${paciente.apellidos || ''}</strong> • ${paciente.matricula}</div>
      <div class="patient-meta">Última actualización: ${paciente.datosMedicos && paciente.datosMedicos.fechaRegistroMedico ? new Date(paciente.datosMedicos.fechaRegistroMedico).toLocaleString('es-ES') : 'Sin datos'}</div>
    </div>
    <div class="patient-params-grid" id="patient-params-single-${paciente.id}"></div>
  `;
  contenedor.appendChild(card);

  const grid = card.querySelector(`#patient-params-single-${paciente.id}`);
  grid.style.display='grid'; grid.style.gridTemplateColumns='repeat(auto-fit,minmax(260px,1fr))'; grid.style.gap='12px';

  const createParam = (key,title,values)=>{
    const valid = values.filter(v=>typeof v==='number' && !isNaN(v)).length;
    const wrapper = document.createElement('div'); wrapper.className='patient-param-card';
    wrapper.innerHTML = `<div class="param-card-header">${title}</div><div class="param-card-body"></div>`;
    const body = wrapper.querySelector('.param-card-body');
    if (valid < 2) { body.innerHTML = '<div class="alert-info">Información insuficiente para la generación de la gráfica</div>'; return wrapper; }
    const canvas = document.createElement('canvas'); canvas.id=`chart-single-${paciente.id}-${key}`; canvas.width=700; canvas.height=220; body.appendChild(canvas);
    try { const ctx = canvas.getContext('2d'); new Chart(ctx,{ type:'line', data:{ labels, datasets:[{ label:title, data:values, borderColor:'#06b6d4', backgroundColor:'transparent', spanGaps:true, tension:0.2 }]}, options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{display:true}, y:{display:true}} } }); } catch(e){ console.error(e); body.innerHTML = '<div class="alert-info">Error generando la gráfica</div>'; }
    return wrapper;
  };

  grid.appendChild(createParam('peso','Peso (kg)', seriesPeso));
  grid.appendChild(createParam('imc','IMC', seriesIMC));
  grid.appendChild(createParam('presion','Presión Arterial', seriesPresion));
  grid.appendChild(createParam('glucosa','Glucosa (mg/dL)', seriesGlucosa));
  grid.appendChild(createParam('frecuencia','Frecuencia Respiratoria (rpm)', seriesFrecuencia));
}

// Suscribirse a eventos de paciente para actualizar gráficas automáticamente
try {
  eventBus.on(EVENT_NAMES.PACIENTE_UPDATED, (payload) => {
    const panel = document.getElementById('patient-charts-panel');
    if (!panel) return;
    // Determinar paciente seleccionado actualmente desde el select
    const select = document.getElementById('patient-select');
    const selectedId = select ? select.value : null;
    if (!selectedId || selectedId === '') {
      // nada seleccionado: no refrescar automáticamente
      return;
    }
    if (selectedId === 'ALL') {
      generarGraficasPorPaciente('patient-charts-panel');
    } else {
      renderSinglePacienteChart(selectedId, 'patient-charts-panel');
    }
  });

  eventBus.on(EVENT_NAMES.PACIENTE_CREATED, () => {
    const panel = document.getElementById('patient-charts-panel');
    if (!panel) return;
    const select = document.getElementById('patient-select');
    const selectedId = select ? select.value : null;
    if (selectedId === 'ALL') {
      generarGraficasPorPaciente('patient-charts-panel');
    } else if (selectedId && selectedId !== '') {
      // si el paciente creado es el seleccionado, refrescar (payload may include id but not passed here)
      renderSinglePacienteChart(selectedId, 'patient-charts-panel');
    }
  });

  eventBus.on(EVENT_NAMES.PACIENTE_DELETED, () => {
    const panel = document.getElementById('patient-charts-panel');
    if (!panel) return;
    const select = document.getElementById('patient-select');
    const selectedId = select ? select.value : null;
    if (selectedId === 'ALL') {
      generarGraficasPorPaciente('patient-charts-panel');
    } else if (selectedId && selectedId !== '') {
      renderSinglePacienteChart(selectedId, 'patient-charts-panel');
    }
  });

  // Refrescar siempre las gráficas globales al cambiar datos de pacientes
  eventBus.on(EVENT_NAMES.PACIENTE_UPDATED, () => {
    try { generarGraficasGlobales('contenedorEstadisticas'); } catch (e) { /* noop */ }
  });
  eventBus.on(EVENT_NAMES.PACIENTE_CREATED, () => {
    try { generarGraficasGlobales('contenedorEstadisticas'); } catch (e) { /* noop */ }
  });
  eventBus.on(EVENT_NAMES.PACIENTE_DELETED, () => {
    try { generarGraficasGlobales('contenedorEstadisticas'); } catch (e) { /* noop */ }
  });
} catch (e) {
  console.warn('No se pudo suscribir al EventBus para actualizaciones de pacientes', e);
}

// Generar gráficas globales: series semanales de conteos
export async function generarGraficasGlobales(containerId = 'contenedorEstadisticas', options = {}) {
  insertarEstilosGraficos();
  const contenedor = document.getElementById(containerId);
  if (!contenedor) return;

  // Cargar Chart.js
  try { await loadChartJS(); } catch (err) { contenedor.insertAdjacentHTML('beforeend', `<div class="alert-info">No se pudo cargar la librería de gráficas (Chart.js).</div>`); console.error(err); return; }

  const pacientes = await pacienteModel.getPacientes();
  if (!pacientes || pacientes.length === 0) {
    // Si no hay pacientes, limpiar la sección si existe
    const existing = contenedor.querySelector('#global-charts-section');
    if (existing) existing.innerHTML = '<div class="alert-info">No hay pacientes para generar las gráficas globales.</div>';
    return;
  }

  // Helpers de fecha: obtener inicio de semana (lunes) en formato YYYY-MM-DD
  const getWeekStartISO = (dateLike) => {
    const d = new Date(dateLike);
    if (isNaN(d)) return null;
    const day = d.getDay(); // 0 (Dom) .. 6 (Sab)
    const diff = (day + 6) % 7; // 0->Lun, ...
    const monday = new Date(d);
    monday.setDate(d.getDate() - diff);
    monday.setHours(0,0,0,0);
    return monday.toISOString().split('T')[0];
  };

  const addWeeksISO = (isoDateStr, weeks) => {
    const d = new Date(isoDateStr + 'T00:00:00');
    d.setDate(d.getDate() + weeks * 7);
    d.setHours(0,0,0,0);
    return d.toISOString().split('T')[0];
  };

  // Parámetros y umbrales (por defecto)
  const mapThreshold = typeof options.mapThreshold === 'number' ? options.mapThreshold : 95; // MAP >= 95 considerada alta (ajustable)
  const imcThreshold = typeof options.imcThreshold === 'number' ? options.imcThreshold : 30; // IMC >= 30 obesidad

  // Mapas semana -> Set(de pacientes)
  const semanaObesos = {}; // weekISO -> Set(ids)
  const semanaPresionAlta = {}; // weekISO -> Set(ids)

  // Recorrer pacientes y sus puntos médicos
  pacientes.forEach(paciente => {
    const puntos = [];
    if (Array.isArray(paciente.historialCambios)) paciente.historialCambios.forEach(h => puntos.push({ fecha: h.fecha || (h.datos && h.datos.fechaRegistroMedico) || null, datos: h.datos || h }));
    if (paciente.fechaRegistroInicial && paciente.datosMedicos) puntos.push({ fecha: paciente.fechaRegistroInicial || paciente.datosMedicos.fechaRegistroMedico, datos: paciente.datosMedicos });
    if (paciente.datosMedicos && paciente.datosMedicos.fechaRegistroMedico) {
      const existe = puntos.some(p => p.fecha === paciente.datosMedicos.fechaRegistroMedico);
      if (!existe) puntos.push({ fecha: paciente.datosMedicos.fechaRegistroMedico, datos: paciente.datosMedicos });
    }

    puntos.forEach(pt => {
      const fecha = pt.fecha ? new Date(pt.fecha) : null;
      if (!fecha || isNaN(fecha)) return;
      const week = getWeekStartISO(fecha);
      if (!week) return;

      const d = pt.datos || {};
      // IMC
      const peso = d.peso ? parseFloat(d.peso) : null;
      const talla = d.talla ? parseFloat(d.talla) : null;
      const imc = (peso && talla) ? (peso / Math.pow((talla/100),2)) : null;
      if (imc !== null && !isNaN(imc) && imc >= imcThreshold) {
        semanaObesos[week] = semanaObesos[week] || new Set();
        semanaObesos[week].add(paciente.id);
      }

      // Presión: intentar parsear "systolic/diastolic" y calcular MAP
      let map = null;
      if (d.presion && typeof d.presion === 'string' && d.presion.includes('/')) {
        const parts = d.presion.split('/').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
        if (parts.length >= 2) {
          const sys = parts[0]; const dia = parts[1];
          map = (sys + 2*dia) / 3;
        } else if (parts.length === 1) {
          // si solo hay un valor, usarlo como aproximación (menos ideal)
          map = parts[0];
        }
      } else if (d.presion && !isNaN(parseFloat(d.presion))) {
        map = parseFloat(d.presion);
      }

      if (map !== null && !isNaN(map) && map >= mapThreshold) {
        semanaPresionAlta[week] = semanaPresionAlta[week] || new Set();
        semanaPresionAlta[week].add(paciente.id);
      }
    });
  });

  // Construir rango de semanas (min..max) para eje X
  const semanasSet = new Set([...Object.keys(semanaObesos), ...Object.keys(semanaPresionAlta)]);
  if (semanasSet.size === 0) {
    // No hay datos por semana
    let sec = contenedor.querySelector('#global-charts-section');
    if (!sec) {
      sec = document.createElement('div'); sec.id = 'global-charts-section'; sec.className = 'estadisticas-seccion'; contenedor.appendChild(sec);
    }
    sec.innerHTML = '<h3>Gráficas Globales</h3><div class="alert-info">No hay suficientes datos semanales para generar las gráficas globales.</div>';
    return;
  }

  const semanas = Array.from(semanasSet).sort();
  const minWeek = semanas[0];
  const maxWeek = semanas[semanas.length - 1];

  // Rellenar semanas intermedias
  const allWeeks = [];
  let cursor = minWeek;
  while (cursor <= maxWeek) {
    allWeeks.push(cursor);
    cursor = addWeeksISO(cursor, 1);
  }

  const labelsISO = allWeeks.map(w => w);
  // Formato legible para eje X: 'Lun 20/10'
  const labels = allWeeks.map(w => {
    try {
      const d = new Date(w + 'T00:00:00');
      return d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: '2-digit' });
    } catch (e) { return w; }
  });
  const dataObesidad = allWeeks.map(w => (semanaObesos[w] ? semanaObesos[w].size : 0));
  const dataPresion = allWeeks.map(w => (semanaPresionAlta[w] ? semanaPresionAlta[w].size : 0));

  // Crear o actualizar sección en el DOM
  let section = contenedor.querySelector('#global-charts-section');
  if (!section) {
    section = document.createElement('div');
    section.id = 'global-charts-section';
    section.className = 'estadisticas-seccion';
    section.innerHTML = '<h3>Gráficas Globales</h3>';
    // Append the global charts section at the end so it appears below the individual patient charts
    contenedor.appendChild(section);
  } else {
    // Ensure the section is after individual charts by moving it to the end
    contenedor.appendChild(section);
  }
  // Contenido de la sección
  section.innerHTML = `
    <h3>Gráficas Globales</h3>
    <div class="global-charts-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div class="global-chart-card">
        <div class="chart-card-header"><strong>Pacientes con obesidad (IMC ≥ ${imcThreshold}) — por semana</strong></div>
        <div style="height:280px;"><canvas id="global-obesidad-chart"></canvas></div>
      </div>
      <div class="global-chart-card">
        <div class="chart-card-header"><strong>Pacientes con presión arterial alta (MAP ≥ ${mapThreshold}) — por semana</strong></div>
        <div style="height:280px;"><canvas id="global-presion-chart"></canvas></div>
      </div>
    </div>
    <div style="margin-top:10px;font-size:0.9rem;color:#6b7280;">Nota: Umbrales usados — IMC ≥ ${imcThreshold}; MAP ≥ ${mapThreshold}. Puedes ajustar estos parámetros en la configuración si es necesario.</div>
  `;

  // Crear gráficos: preferir Chart.js si está disponible, si no usar fallback canvas
  try {
    if (window.Chart) {
      const ctxOb = document.getElementById('global-obesidad-chart').getContext('2d');
      // eslint-disable-next-line no-undef
      new Chart(ctxOb, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Obesidad (pacientes)', data: dataObesidad, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)', fill: true, tension: 0.2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: true }, y: { beginAtZero: true, ticks: { precision:0 } } } }
      });

      const ctxPr = document.getElementById('global-presion-chart').getContext('2d');
      // eslint-disable-next-line no-undef
      new Chart(ctxPr, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Presión alta (pacientes)', data: dataPresion, borderColor: '#06b6d4', backgroundColor: 'rgba(6,182,212,0.08)', fill: true, tension: 0.2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: true }, y: { beginAtZero: true, ticks: { precision:0 } } } }
      });
    } else {
      // Fallback sin dependencias externas
      const canvasOb = document.getElementById('global-obesidad-chart');
      const canvasPr = document.getElementById('global-presion-chart');
      // Asegurar tamaños visibles
      canvasOb.style.width = '100%'; canvasOb.style.height = '240px';
      canvasPr.style.width = '100%'; canvasPr.style.height = '240px';

      drawSimpleLineChartOnCanvas(canvasOb, labels, dataObesidad, { title: `Obesidad (IMC ≥ ${imcThreshold})`, color: '#ef4444', aria: `Pacientes con obesidad por semana. Valores exactos de conteo.` });
      drawSimpleLineChartOnCanvas(canvasPr, labels, dataPresion, { title: `Presión alta (MAP ≥ ${mapThreshold})`, color: '#06b6d4', aria: `Pacientes con presión arterial alta por semana. Valores exactos de conteo.` });
    }
  } catch (e) {
    console.error('Error generando gráficas globales', e);
    section.insertAdjacentHTML('beforeend', '<div class="alert-info">No se pudieron renderizar las gráficas globales.</div>');
  }
}