// js/views/reporteView.js
import { authModel } from '../models/storageModel.js';
import { reporteModel } from '../models/reporteModel.js';
import { pacienteModel } from '../models/pacienteModel.js';
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
  
  // Estadísticas de actividad con Chart.js
  html += `
    <div class="estadisticas-seccion">
      <h3>Actividad Reciente del Sistema</h3>
      <div class="stats-graph">
        <div class="graph-header">
          <span>Registros médicos creados por día (últimos 7 días)</span>
        </div>
        <div class="graph-body" style="height: 300px; position: relative;">
          <canvas id="activity-chart" style="max-height: 280px;"></canvas>
        </div>
      </div>
    </div>
  `;
  
  // Estadísticas de distribución por facultad con Chart.js
  html += `
    <div class="estadisticas-seccion">
      <h3>Distribución de Pacientes por Facultad</h3>
      <div class="stats-pie-charts" style="height: 350px; position: relative;">
        <canvas id="faculty-chart" style="max-height: 330px;"></canvas>
      </div>
    </div>
  `;
  
  // Estadísticas de citas por estado con Chart.js
  if (estadisticas.pacientes.citasPorEstado) {
    html += `
      <div class="estadisticas-seccion">
        <h3>Citas por Estado</h3>
        <div class="stats-pie-charts" style="height: 350px; position: relative;">
          <canvas id="appointments-chart" style="max-height: 330px;"></canvas>
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

  // Generar gráficas mejoradas con Chart.js
  await generarGraficasEstadisticasConChartJS(estadisticas);
  try {
    await generarGraficasEstadisticasConChartJS(estadisticas);
  } catch (e) {
    console.warn('No se pudieron generar las gráficas de estadísticas con Chart.js:', e);
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
  
  // Obtener estadísticas recientes de actividades
  let activityStats = {};
  try {
    const { default: ActivityLogger } = await import('../utils/activityLogger.js');
    activityStats = await ActivityLogger.getActivityStats({ limit: 10000 }); // Límite alto para obtener total real
  } catch (error) {
    console.warn('No se pudieron cargar estadísticas de actividades:', error);
  }
  
  let html = `
    <div class="section-header">
      <h2>📋 Registro de Actividades del Sistema</h2>
      <!-- Estadísticas visuales mejoradas -->
      <div class="activity-stats-grid">
        <div class="activity-stat-card total">
          <div class="activity-stat-icon">
            <i class="fas fa-clipboard-list"></i>
          </div>
          <div class="activity-stat-content">
            <div class="activity-stat-number">${activityStats.total || 0}</div>
            <div class="activity-stat-label">Total de Actividades</div>
          </div>
        </div>
        
        <div class="activity-stat-card users">
          <div class="activity-stat-icon">
            <i class="fas fa-user-check"></i>
          </div>
          <div class="activity-stat-content">
            <div class="activity-stat-number">${activityStats.usuariosActivos?.length || 0}</div>
            <div class="activity-stat-label">Usuarios Conectados</div>
          </div>
        </div>
        
        <div class="activity-stat-card login-users">
          <div class="activity-stat-icon">
            <i class="fas fa-key"></i>
          </div>
          <div class="activity-stat-content">
            <div class="activity-stat-number">${activityStats.usuariosConLogin?.length || 0}</div>
            <div class="activity-stat-label">Usuarios con Login</div>
          </div>
        </div>
        
        <div class="activity-stat-card unique-users">
          <div class="activity-stat-icon">
            <i class="fas fa-users"></i>
          </div>
          <div class="activity-stat-content">
            <div class="activity-stat-number">${activityStats.usuarios?.length || 0}</div>
            <div class="activity-stat-label">Usuarios Únicos</div>
          </div>
        </div>
        
        <div class="activity-stat-card modules">
          <div class="activity-stat-icon">
            <i class="fas fa-th-large"></i>
          </div>
          <div class="activity-stat-content">
            <div class="activity-stat-number">${Object.keys(activityStats.porModulo || {}).length}</div>
            <div class="activity-stat-label">Módulos Utilizados</div>
          </div>
        </div>
        
        <div class="activity-stat-card actions">
          <div class="activity-stat-icon">
            <i class="fas fa-bolt"></i>
          </div>
          <div class="activity-stat-content">
            <div class="activity-stat-number">${Object.keys(activityStats.porAccion || {}).length}</div>
            <div class="activity-stat-label">Tipos de Acciones</div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="filtros-container">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3>🔍 Filtros de Búsqueda</h3>
        <button type="button" class="btn-estadisticas-completas" onclick="mostrarEstadisticasCompletas()" 
                style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.3s ease;">
          <i class="fas fa-chart-bar"></i>
          Ver Estadísticas Completas
        </button>
      </div>
      <form id="formFiltroActividades" class="form-filtros">
        <div class="form-row">
          <div class="form-group col-md-6">
            <label for="fechaInicio">📅 Desde:</label>
            <input type="date" id="fechaInicio" name="fechaInicio">
          </div>
          <div class="form-group col-md-6">
            <label for="fechaFin">📅 Hasta:</label>
            <input type="date" id="fechaFin" name="fechaFin">
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group col-md-6">
            <label for="usuario">👤 Usuario:</label>
            <select id="usuario" name="usuario">
              <option value="">Todos los usuarios</option>
              ${usuarios.map(u => `<option value="${u.nombre}">${u.nombre} (${u.matricula || u.usuario})</option>`).join('')}
            </select>
          </div>
          <div class="form-group col-md-6">
            <label for="accion">⚡ Acción:</label>
            <select id="accion" name="accion">
              <option value="">Todas las acciones</option>
              <optgroup label="🔐 Autenticación">
                <option value="login">🔑 Inicio de sesión</option>
                <option value="logout">🚪 Cierre de sesión</option>
              </optgroup>
              <optgroup label="👥 Gestión de Pacientes">
                <option value="create_paciente">➕ Crear paciente</option>
                <option value="update_paciente_personal">✏️ Actualizar info personal</option>
                <option value="delete_paciente">🗑️ Eliminar paciente</option>
              </optgroup>
              <optgroup label="📋 Registros Médicos">
                <option value="create_registro_medico">➕ Crear registro médico</option>
                <option value="update_registro_medico">✏️ Actualizar registro médico</option>
                <option value="delete_registro_medico">🗑️ Eliminar registro médico</option>
              </optgroup>
              <optgroup label="👤 Gestión de Usuarios">
                <option value="create_user">➕ Crear usuario</option>
                <option value="update_user">✏️ Actualizar usuario</option>
                <option value="delete_user">🗑️ Eliminar usuario</option>
                <option value="password_reset_email">📧 Reset contraseña por email</option>
                <option value="password_reset_temporal">🔄 Reset contraseña temporal</option>
                <option value="password_changed">🔐 Cambio de contraseña</option>
                <option value="account_recreated">🔄 Cuenta recreada</option>
              </optgroup>
              <optgroup label="⚕️ Operaciones Médicas">
                <option value="checklist_instrumentos">✅ Checklist instrumentos</option>
                <option value="crear_observacion">📝 Crear observación</option>
              </optgroup>
              <optgroup label="📊 Acciones Generales">
                <option value="create">➕ Creación de registros</option>
                <option value="update">✏️ Actualización de registros</option>
                <option value="delete">🗑️ Eliminación de registros</option>
                <option value="consulta">👁️ Consulta/Visualización</option>
                <option value="exportar">📤 Exportación de datos</option>
              </optgroup>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group col-md-6">
            <label for="modulo">🏥 Módulo:</label>
            <select id="modulo" name="modulo">
              <option value="">Todos los módulos</option>
              <option value="autenticacion">🔐 Autenticación</option>
              <option value="pacientes">👥 Pacientes</option>
              <option value="usuarios">👤 Usuarios</option>
              <option value="operaciones">⚕️ Operaciones</option>
              <option value="reportes">📊 Reportes</option>
              <option value="gestion">⚙️ Gestión</option>
              <option value="instrumentos">🩺 Instrumentos</option>
            </select>
          </div>
          <div class="form-group col-md-6">
            <label for="limite">📊 Límite de resultados:</label>
            <select id="limite" name="limite">
              <option value="50">50 más recientes</option>
              <option value="100">100 más recientes</option>
              <option value="200">200 más recientes</option>
              <option value="500" selected>500 más recientes</option>
            </select>
          </div>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">
            🔍 Filtrar Actividades
          </button>
          <button type="reset" class="btn btn-secondary">
            🧹 Limpiar filtros
          </button>
          <button type="button" id="btnRefreshActivities" class="btn btn-info">
            🔄 Actualizar
          </button>
        </div>
      </form>
    </div>
    
    <div class="resultados-container" id="resultadosActividades">
      <div class="alert-info">
        <i class="fas fa-info-circle"></i>
        Selecciona los filtros y haz clic en "Filtrar Actividades" para ver el registro detallado.
        <br><br>
        <strong>💡 Tipos de actividades monitoreadas:</strong>
        <ul style="margin-top: 10px; text-align: left;">
          <li>🔑 Inicios y cierres de sesión</li>
          <li>👥 Gestión de pacientes (crear, editar, eliminar)</li>
          <li>⚕️ Registros médicos (crear, actualizar)</li>
          <li>👤 Gestión de usuarios del sistema</li>
          <li>📊 Generación y exportación de reportes</li>
        </ul>
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
      
      const filtros = {
        fechaInicio: document.getElementById('fechaInicio').value,
        fechaFin: document.getElementById('fechaFin').value,
        usuario: document.getElementById('usuario').value,
        accion: document.getElementById('accion').value,
        modulo: document.getElementById('modulo').value,
        limite: document.getElementById('limite').value
      };
      
      // Importar el controlador dinámicamente para evitar dependencias circulares
      import('../controllers/reporteController.js').then(module => {
        module.filtrarActividades(filtros);
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

  // Configurar botón de actualizar actividades
  const btnRefreshActivities = document.getElementById('btnRefreshActivities');
  if (btnRefreshActivities) {
    btnRefreshActivities.addEventListener('click', () => {
      location.reload();
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

    /* Estilos para botón temporal de limpieza */
    .btn-warning {
      background: linear-gradient(135deg, #f59e0b, #f97316);
      color: white;
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

    .btn-warning:hover {
      background: linear-gradient(135deg, #d97706, #ea580c);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(245, 158, 11, 0.3);
    }

    .btn-warning:disabled {
      background: #9ca3af;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    /* Estilos para tarjetas de estadísticas de actividades */
    .activity-stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
      padding: 20px 0;
    }

    .activity-stat-card {
      background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
      border: 1px solid rgba(14, 165, 233, 0.15);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }

    .activity-stat-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #0ea5e9, #06b6d4, #10b981);
    }

    .activity-stat-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 20px 48px rgba(14, 165, 233, 0.15);
      border-color: rgba(14, 165, 233, 0.3);
    }

    .activity-stat-icon {
      font-size: 2.5rem;
      width: 70px;
      height: 70px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
      background: linear-gradient(135deg, rgba(14, 165, 233, 0.1), rgba(6, 182, 212, 0.1));
      color: #0ea5e9;
      transition: all 0.3s ease;
    }

    .activity-stat-card:hover .activity-stat-icon {
      background: linear-gradient(135deg, rgba(14, 165, 233, 0.2), rgba(6, 182, 212, 0.2));
      transform: scale(1.1);
    }

    .activity-stat-content {
      flex-grow: 1;
    }

    .activity-stat-value {
      font-size: 2.5rem;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 8px;
      background: linear-gradient(135deg, #0ea5e9, #06b6d4);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .activity-stat-label {
      font-size: 1rem;
      color: #64748b;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .activity-stat-trend {
      margin-top: 8px;
      font-size: 0.875rem;
      color: #10b981;
      display: flex;
      align-items: center;
      gap: 4px;
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

      .activity-stats-grid {
        grid-template-columns: 1fr;
        gap: 16px;
        padding: 16px 0;
      }

      .activity-stat-card {
        padding: 20px;
      }

      .activity-stat-value {
        font-size: 2rem;
      }

      .activity-stat-icon {
        font-size: 2rem;
        width: 60px;
        height: 60px;
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

  // Intentar cargar Chart.js pero no detener la generación si falla
  try { 
    await loadChartJS(); 
  } catch (err) { 
    console.warn('Chart.js no disponible, se usará renderer local de fallback si es necesario.', err); 
  }

  // Obtener todos los pacientes con su evolución médica desde Firebase
  const pacientesConEvolucion = await reporteModel.getTodosPacientesConEvolucion();
  
  if (!pacientesConEvolucion || pacientesConEvolucion.length === 0) {
    contenedor.innerHTML = '<div class="alert-info">No hay pacientes con registros médicos para generar gráficas.</div>';
    return;
  }

  // Reusar o crear wrapper
  let wrapper = document.querySelector('.pacientes-charts-wrapper');
  if (wrapper && contenedor.contains(wrapper)) {
    wrapper.innerHTML = '';
  } else { 
    wrapper = document.createElement('div'); 
    wrapper.className = 'pacientes-charts-wrapper'; 
    contenedor.appendChild(wrapper); 
  }

  // Función helper para crear tarjetas de parámetro
  const createParamCard = (paciente, paramKey, title, data) => {
    const card = document.createElement('div');
    card.className = 'patient-param-card';
    card.innerHTML = `
      <div class="param-card-header"><strong>${title}</strong></div>
      <div class="param-card-body" id="param-body-${paciente.id}-${paramKey}"></div>
    `;

    const body = card.querySelector(`#param-body-${paciente.id}-${paramKey}`);
    
    if (!data || data.length < 2) {
      body.innerHTML = '<div class="alert-info">Información insuficiente para generar la gráfica (mínimo 2 puntos)</div>';
      return card;
    }

    const canvas = document.createElement('canvas');
    canvas.id = `chart-${paciente.id}-${paramKey}`;
    canvas.width = 600;
    canvas.height = 200;
    body.appendChild(canvas);

    try {
      const ctx = canvas.getContext('2d');
      const labels = data.map(d => d.fecha);
      const values = data.map(d => d.valor);
      
      // eslint-disable-next-line no-undef
      new Chart(ctx, {
        type: 'line',
        data: { 
          labels: labels, 
          datasets: [{ 
            label: title, 
            data: values, 
            borderColor: '#06b6d4', 
            backgroundColor: 'rgba(6, 182, 212, 0.1)', 
            spanGaps: true, 
            tension: 0.2,
            fill: true,
            pointBackgroundColor: '#06b6d4',
            pointBorderColor: '#0891b2',
            pointRadius: 3
          }] 
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false, 
          plugins: { 
            legend: { display: false },
            tooltip: {
              mode: 'index',
              intersect: false
            }
          }, 
          scales: { 
            x: { display: true }, 
            y: { display: true, beginAtZero: false } 
          } 
        }
      });
    } catch (e) {
      console.error('Error creando gráfico param', paramKey, e);
      body.innerHTML = '<div class="alert-info">Error generando la gráfica</div>';
    }

    return card;
  };

  pacientesConEvolucion.forEach(paciente => {
    const evolucion = paciente.evolucionMedica;
    
    // Calcular IMC si hay datos de peso y talla
    let imcData = [];
    if (evolucion.peso.length > 0 && evolucion.talla.length > 0) {
      const tallaMap = {};
      evolucion.talla.forEach(t => {
        tallaMap[t.fechaRaw] = t.valor;
      });

      let ultimaTalla = evolucion.talla[evolucion.talla.length - 1].valor;
      
      evolucion.peso.forEach(p => {
        const tallaParaFecha = tallaMap[p.fechaRaw] || ultimaTalla;
        if (tallaParaFecha > 0) {
          const imc = p.valor / Math.pow((tallaParaFecha / 100), 2);
          imcData.push({
            fecha: p.fecha,
            valor: parseFloat(imc.toFixed(1)),
            fechaRaw: p.fechaRaw
          });
          // Actualizar última talla conocida
          if (tallaMap[p.fechaRaw]) ultimaTalla = tallaMap[p.fechaRaw];
        }
      });
    }

    // Crear tarjeta principal por paciente
    const pacienteCard = document.createElement('div');
    pacienteCard.className = 'patient-chart-card';
    
    const totalRegistros = Object.values(evolucion).reduce((total, param) => total + param.length, 0);
    const ultimaFecha = Math.max(
      ...Object.values(evolucion)
        .flat()
        .map(r => r.fechaRaw ? new Date(r.fechaRaw).getTime() : 0)
        .filter(t => !isNaN(t))
    );
    
    pacienteCard.innerHTML = `
      <div class="patient-chart-header">
        <div class="patient-title"><strong>${paciente.nombre} ${paciente.apellidos || ''}</strong> • ${paciente.matricula}</div>
        <div class="patient-meta">Registros médicos: ${totalRegistros} entradas | Última actualización: ${ultimaFecha > 0 ? new Date(ultimaFecha).toLocaleString('es-ES') : 'Sin datos'}</div>
      </div>
      <div class="patient-params-grid" id="patient-params-${paciente.id}"></div>
    `;

    wrapper.appendChild(pacienteCard);

    const paramsGrid = pacienteCard.querySelector(`#patient-params-${paciente.id}`);
    paramsGrid.style.display = 'grid';
    paramsGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(280px, 1fr))';
    paramsGrid.style.gap = '12px';

    // Añadir gráficas por parámetro
    paramsGrid.appendChild(createParamCard(paciente, 'temperatura', 'Temperatura (°C)', evolucion.temperatura));
    paramsGrid.appendChild(createParamCard(paciente, 'peso', 'Peso (kg)', evolucion.peso));
    paramsGrid.appendChild(createParamCard(paciente, 'talla', 'Talla (cm)', evolucion.talla));
    paramsGrid.appendChild(createParamCard(paciente, 'imc', 'IMC (kg/m²)', imcData));
    paramsGrid.appendChild(createParamCard(paciente, 'presion', 'Presión Arterial Sistólica (mmHg)', evolucion.presion));
    paramsGrid.appendChild(createParamCard(paciente, 'glucosa', 'Glucosa (mg/dL)', evolucion.glucosa));
    paramsGrid.appendChild(createParamCard(paciente, 'frecuencia', 'Frecuencia Respiratoria (rpm)', evolucion.frecuenciaRespiratoria));
  });

  // Estilos ligeros para las sub-cards
  if (!document.getElementById('patient-charts-styles')) {
    const s = document.createElement('style'); 
    s.id = 'patient-charts-styles';
    s.innerHTML = `
      .pacientes-charts-wrapper { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 18px; margin-top: 20px; }
      .patient-chart-card { background: white; border-radius: 10px; padding: 16px; border: 1px solid #e6eef2; box-shadow: 0 6px 18px rgba(2,6,23,0.04); }
      .patient-chart-header { display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:12px; }
      .patient-title { font-size: 1rem; color: #0f172a; font-weight: 600; }
      .patient-meta { font-size: 0.8rem; color: #6b7280; }
      .patient-param-card { background: #fff; border-radius: 8px; padding:12px; border:1px solid #eef2f6; min-height: 160px; }
      .param-card-header { font-weight:700; margin-bottom:8px; color: #374151; }
      .param-card-body { height: 180px; }
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

  try { 
    await loadChartJS(); 
  } catch (e) { 
    console.error(e); 
    contenedor.innerHTML = '<div class="alert-info">No se pudo cargar Chart.js</div>'; 
    return; 
  }

  const paciente = await pacienteModel.getPaciente(pacienteId);
  if (!paciente) { 
    contenedor.innerHTML = '<div class="alert-info">Paciente no encontrado</div>'; 
    return; 
  }

  // Usar reporteModel para obtener evolución médica desde Firebase
  const evolucionMedica = await reporteModel.getEvolucionMedicaPaciente(pacienteId);
  
  contenedor.innerHTML = '';

  // Crear contenedor de paciente
  const card = document.createElement('div'); 
  card.className='patient-chart-card';
  card.innerHTML = `
    <div class="patient-chart-header">
      <div class="patient-title"><strong>${paciente.nombre} ${paciente.apellidos || ''}</strong> • ${paciente.matricula}</div>
      <div class="patient-meta">Registros médicos: ${Object.values(evolucionMedica).reduce((total, param) => total + param.length, 0)} entradas</div>
    </div>
    <div class="patient-params-grid" id="patient-params-single-${paciente.id}"></div>
  `;
  contenedor.appendChild(card);

  const grid = card.querySelector(`#patient-params-single-${paciente.id}`);
  grid.style.display='grid'; 
  grid.style.gridTemplateColumns='repeat(auto-fit,minmax(280px,1fr))'; 
  grid.style.gap='12px';

  const createParam = (key, title, data) => {
    const wrapper = document.createElement('div'); 
    wrapper.className='patient-param-card';
    wrapper.innerHTML = `<div class="param-card-header">${title}</div><div class="param-card-body"></div>`;
    const body = wrapper.querySelector('.param-card-body');
    
    if (!data || data.length < 2) { 
      body.innerHTML = '<div class="alert-info">Información insuficiente para generar la gráfica (mínimo 2 puntos)</div>'; 
      return wrapper; 
    }
    
    const canvas = document.createElement('canvas'); 
    canvas.id=`chart-single-${paciente.id}-${key}`; 
    canvas.width=700; 
    canvas.height=240; 
    body.appendChild(canvas);
    
    try { 
      const ctx = canvas.getContext('2d'); 
      const labels = data.map(d => d.fecha);
      const values = data.map(d => d.valor);
      
      new Chart(ctx, { 
        type: 'line', 
        data: { 
          labels, 
          datasets: [{ 
            label: title, 
            data: values, 
            borderColor: '#06b6d4', 
            backgroundColor: 'rgba(6, 182, 212, 0.1)', 
            spanGaps: true, 
            tension: 0.2,
            fill: true,
            pointBackgroundColor: '#06b6d4',
            pointBorderColor: '#0891b2',
            pointRadius: 4
          }]
        }, 
        options: { 
          responsive: true, 
          maintainAspectRatio: false, 
          plugins: {
            legend: { display: false },
            tooltip: {
              mode: 'index',
              intersect: false,
              callbacks: {
                label: function(context) {
                  return `${title}: ${context.parsed.y}`;
                }
              }
            }
          }, 
          scales: {
            x: { 
              display: true,
              title: {
                display: true,
                text: 'Fecha'
              }
            }, 
            y: { 
              display: true,
              title: {
                display: true,
                text: title
              },
              beginAtZero: false
            }
          },
          interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
          }
        } 
      }); 
    } catch(e) { 
      console.error('Error creando gráfico:', e); 
      body.innerHTML = '<div class="alert-info">Error generando la gráfica</div>'; 
    }
    return wrapper;
  };

  // Calcular IMC si hay datos de peso y talla
  let imcData = [];
  if (evolucionMedica.peso.length > 0 && evolucionMedica.talla.length > 0) {
    const tallaMap = {};
    evolucionMedica.talla.forEach(t => {
      tallaMap[t.fechaRaw] = t.valor;
    });

    let ultimaTalla = evolucionMedica.talla[evolucionMedica.talla.length - 1].valor;
    
    evolucionMedica.peso.forEach(p => {
      const tallaParaFecha = tallaMap[p.fechaRaw] || ultimaTalla;
      if (tallaParaFecha > 0) {
        const imc = p.valor / Math.pow((tallaParaFecha / 100), 2);
        imcData.push({
          fecha: p.fecha,
          valor: parseFloat(imc.toFixed(1)),
          fechaRaw: p.fechaRaw
        });
        // Actualizar última talla conocida
        if (tallaMap[p.fechaRaw]) ultimaTalla = tallaMap[p.fechaRaw];
      }
    });
  }

  grid.appendChild(createParam('temperatura', 'Temperatura (°C)', evolucionMedica.temperatura));
  grid.appendChild(createParam('peso', 'Peso (kg)', evolucionMedica.peso));
  grid.appendChild(createParam('talla', 'Talla (cm)', evolucionMedica.talla));
  grid.appendChild(createParam('imc', 'IMC (kg/m²)', imcData));
  grid.appendChild(createParam('presion', 'Presión Arterial Sistólica (mmHg)', evolucionMedica.presion));
  grid.appendChild(createParam('glucosa', 'Glucosa (mg/dL)', evolucionMedica.glucosa));
  grid.appendChild(createParam('frecuencia', 'Frecuencia Respiratoria (rpm)', evolucionMedica.frecuenciaRespiratoria));
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
  try { 
    await loadChartJS(); 
  } catch (err) { 
    contenedor.insertAdjacentHTML('beforeend', `<div class="alert-info">No se pudo cargar la librería de gráficas (Chart.js).</div>`); 
    console.error(err); 
    return; 
  }

  // Obtener todos los pacientes con evolución médica desde Firebase
  const pacientesConEvolucion = await reporteModel.getTodosPacientesConEvolucion();
  
  if (!pacientesConEvolucion || pacientesConEvolucion.length === 0) {
    // Si no hay pacientes, limpiar la sección si existe
    const existing = contenedor.querySelector('#global-charts-section');
    if (existing) existing.innerHTML = '<div class="alert-info">No hay pacientes con registros médicos para generar las gráficas globales.</div>';
    return;
  }

  // Helpers de fecha: obtener inicio de semana (lunes) en formato YYYY-MM-DD
  const getWeekStartISO = (dateLike) => {
    try {
      const d = new Date(dateLike);
      if (isNaN(d.getTime())) return null;
      
      const day = d.getDay(); // 0 (Dom) .. 6 (Sab)
      const diff = (day + 6) % 7; // 0->Lun, ...
      const monday = new Date(d);
      monday.setDate(d.getDate() - diff);
      monday.setHours(0, 0, 0, 0);
      
      const result = monday.toISOString().split('T')[0];
      console.log(`📅 Fecha ${dateLike} → Semana ${result}`);
      return result;
    } catch (e) {
      console.error(`❌ Error procesando fecha ${dateLike}:`, e);
      return null;
    }
  };

  const addWeeksISO = (isoDateStr, weeks) => {
    try {
      const d = new Date(isoDateStr + 'T00:00:00');
      d.setDate(d.getDate() + weeks * 7);
      d.setHours(0, 0, 0, 0);
      return d.toISOString().split('T')[0];
    } catch (e) {
      console.error(`❌ Error añadiendo semanas a ${isoDateStr}:`, e);
      return isoDateStr;
    }
  };

  // Parámetros y umbrales (ajustados para ser más realistas)
  const mapThreshold = typeof options.mapThreshold === 'number' ? options.mapThreshold : 90; // MAP >= 90 considerada alta (más realista)
  const imcThreshold = typeof options.imcThreshold === 'number' ? options.imcThreshold : 25; // IMC >= 25 sobrepeso (más inclusivo)

  console.log(`📊 Iniciando análisis global con umbrales: IMC ≥ ${imcThreshold}, MAP ≥ ${mapThreshold}`);
  console.log(`👥 Analizando ${pacientesConEvolucion.length} pacientes con evolución médica`);

  // Mapas semana -> Set(de pacientes)
  const semanaObesos = {}; // weekISO -> Set(ids)
  const semanaPresionAlta = {}; // weekISO -> Set(ids)

  // Estadísticas generales para debugging
  let totalPacientesConPeso = 0;
  let totalPacientesConTalla = 0;
  let totalPacientesConPresion = 0;
  let totalRegistrosIMC = 0;
  let totalRegistrosPresion = 0;

  // Recorrer pacientes y sus evoluciones médicas desde Firebase
  pacientesConEvolucion.forEach(paciente => {
    const evolucion = paciente.evolucionMedica;
    console.log(`🔍 Analizando paciente ${paciente.nombre} para gráficas globales:`, evolucion);

    // Contar pacientes con datos
    if (evolucion.peso.length > 0) totalPacientesConPeso++;
    if (evolucion.talla.length > 0) totalPacientesConTalla++;
    if (evolucion.presion.length > 0) totalPacientesConPresion++;

    // Procesar registros de peso y talla para calcular IMC por semana
    if (evolucion.peso.length > 0 && evolucion.talla.length > 0) {
      const tallaMap = {};
      evolucion.talla.forEach(t => {
        tallaMap[t.fechaRaw] = t.valor;
      });

      let ultimaTalla = evolucion.talla[evolucion.talla.length - 1].valor;
      
      evolucion.peso.forEach(p => {
        const fecha = new Date(p.fechaRaw);
        if (isNaN(fecha)) return;
        
        const tallaParaFecha = tallaMap[p.fechaRaw] || ultimaTalla;
        if (tallaParaFecha > 0) {
          const imc = p.valor / Math.pow((tallaParaFecha / 100), 2);
          totalRegistrosIMC++;
          
          console.log(`📏 Paciente ${paciente.nombre}: Peso ${p.valor}kg, Talla ${tallaParaFecha}cm, IMC ${imc.toFixed(1)}`);
          
          if (imc >= imcThreshold) {
            const week = getWeekStartISO(fecha);
            if (week) {
              semanaObesos[week] = semanaObesos[week] || new Set();
              semanaObesos[week].add(paciente.id);
              console.log(`� Paciente ${paciente.nombre} registrado con obesidad en semana ${week} (IMC: ${imc.toFixed(1)})`);
            }
          }
          
          // Actualizar última talla conocida
          if (tallaMap[p.fechaRaw]) ultimaTalla = tallaMap[p.fechaRaw];
        }
      });
    }

    // Procesar registros de presión arterial
    evolucion.presion.forEach(p => {
      const fecha = new Date(p.fechaRaw);
      if (isNaN(fecha)) return;

      let map = null;
      totalRegistrosPresion++;
      
      // Si hay presión completa en el formato "sistólica/diastólica"
      if (p.presionCompleta && typeof p.presionCompleta === 'string' && p.presionCompleta.includes('/')) {
        const partes = p.presionCompleta.split('/');
        if (partes.length >= 2) {
          const sistolica = parseFloat(partes[0].trim());
          const diastolica = parseFloat(partes[1].trim());
          if (!isNaN(sistolica) && !isNaN(diastolica)) {
            map = (sistolica + 2 * diastolica) / 3; // Calcular MAP
          }
        }
      } else if (!isNaN(p.valor)) {
        // Si solo tenemos la presión sistólica, usar como aproximación
        map = p.valor;
      }

      console.log(`🩺 Paciente ${paciente.nombre}: Presión ${p.presionCompleta || p.valor}, MAP calculado: ${map ? map.toFixed(1) : 'N/A'}`);

      if (map !== null && !isNaN(map) && map >= mapThreshold) {
        const week = getWeekStartISO(fecha);
        if (week) {
          semanaPresionAlta[week] = semanaPresionAlta[week] || new Set();
          semanaPresionAlta[week].add(paciente.id);
          console.log(`🚨 Paciente ${paciente.nombre} registrado con presión alta en semana ${week} (MAP: ${map.toFixed(1)})`);
        }
      }
    });
  });

  // Mostrar estadísticas de debugging
  console.log(`📈 Estadísticas de análisis global:`);
  console.log(`   • Pacientes con datos de peso: ${totalPacientesConPeso}`);
  console.log(`   • Pacientes con datos de talla: ${totalPacientesConTalla}`);
  console.log(`   • Pacientes con datos de presión: ${totalPacientesConPresion}`);
  console.log(`   • Total registros IMC analizados: ${totalRegistrosIMC}`);
  console.log(`   • Total registros presión analizados: ${totalRegistrosPresion}`);
  console.log(`   • Semanas con obesidad detectada: ${Object.keys(semanaObesos).length}`);
  console.log(`   • Semanas con presión alta detectada: ${Object.keys(semanaPresionAlta).length}`);
  
  // Mostrar detalle de semanas
  Object.keys(semanaObesos).forEach(semana => {
    console.log(`   🗓️ Semana ${semana}: ${semanaObesos[semana].size} pacientes con obesidad`);
  });
  Object.keys(semanaPresionAlta).forEach(semana => {
    console.log(`   🗓️ Semana ${semana}: ${semanaPresionAlta[semana].size} pacientes con presión alta`);
  });

  // Construir rango de semanas (min..max) para eje X
  const semanasSet = new Set([...Object.keys(semanaObesos), ...Object.keys(semanaPresionAlta)]);
  if (semanasSet.size === 0) {
    // No hay datos por semana
    let sec = contenedor.querySelector('#global-charts-section');
    if (!sec) {
      sec = document.createElement('div'); 
      sec.id = 'global-charts-section'; 
      sec.className = 'estadisticas-seccion'; 
      contenedor.appendChild(sec);
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
        <div class="chart-card-header"><strong>Pacientes con sobrepeso/obesidad (IMC ≥ ${imcThreshold}) — por semana</strong></div>
        <div style="height:280px;"><canvas id="global-obesidad-chart"></canvas></div>
      </div>
      <div class="global-chart-card">
        <div class="chart-card-header"><strong>Pacientes con presión arterial alta (MAP ≥ ${mapThreshold}) — por semana</strong></div>
        <div style="height:280px;"><canvas id="global-presion-chart"></canvas></div>
      </div>
    </div>
    <div style="margin-top:10px;font-size:0.9rem;color:#6b7280;">
      Nota: Umbrales usados — IMC ≥ ${imcThreshold} (sobrepeso/obesidad); MAP ≥ ${mapThreshold} (presión alta). 
      Datos obtenidos desde registros médicos de Firebase.
      Total de pacientes analizados: ${pacientesConEvolucion.length}
      <br>Pacientes con datos: peso (${totalPacientesConPeso}), talla (${totalPacientesConTalla}), presión (${totalPacientesConPresion})
    </div>
  `;

  // Crear gráficos: preferir Chart.js si está disponible, si no usar fallback canvas
  try {
    if (window.Chart) {
      const ctxOb = document.getElementById('global-obesidad-chart').getContext('2d');
      // eslint-disable-next-line no-undef
      new Chart(ctxOb, {
        type: 'line',
        data: { 
          labels, 
          datasets: [{ 
            label: 'Sobrepeso/Obesidad (pacientes)', 
            data: dataObesidad, 
            borderColor: '#ef4444', 
            backgroundColor: 'rgba(239,68,68,0.08)', 
            fill: true, 
            tension: 0.2,
            pointBackgroundColor: '#ef4444',
            pointBorderColor: '#dc2626',
            pointRadius: 4
          }] 
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false, 
          plugins: { 
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `${context.parsed.y} pacientes con IMC ≥ ${imcThreshold}`;
                }
              }
            }
          }, 
          scales: { 
            x: { 
              display: true,
              title: {
                display: true,
                text: 'Semana'
              }
            }, 
            y: { 
              beginAtZero: true, 
              ticks: { precision: 0 },
              title: {
                display: true,
                text: 'Número de pacientes'
              }
            } 
          } 
        }
      });

      const ctxPr = document.getElementById('global-presion-chart').getContext('2d');
      // eslint-disable-next-line no-undef
      new Chart(ctxPr, {
        type: 'line',
        data: { 
          labels, 
          datasets: [{ 
            label: 'Presión alta (pacientes)', 
            data: dataPresion, 
            borderColor: '#06b6d4', 
            backgroundColor: 'rgba(6,182,212,0.08)', 
            fill: true, 
            tension: 0.2,
            pointBackgroundColor: '#06b6d4',
            pointBorderColor: '#0891b2',
            pointRadius: 4
          }] 
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false, 
          plugins: { 
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `${context.parsed.y} pacientes con MAP ≥ ${mapThreshold}`;
                }
              }
            }
          }, 
          scales: { 
            x: { 
              display: true,
              title: {
                display: true,
                text: 'Semana'
              }
            }, 
            y: { 
              beginAtZero: true, 
              ticks: { precision: 0 },
              title: {
                display: true,
                text: 'Número de pacientes'
              }
            } 
          } 
        }
      });
    } else {
      // Fallback sin dependencias externas
      const canvasOb = document.getElementById('global-obesidad-chart');
      const canvasPr = document.getElementById('global-presion-chart');
      // Asegurar tamaños visibles
      canvasOb.style.width = '100%'; canvasOb.style.height = '240px';
      canvasPr.style.width = '100%'; canvasPr.style.height = '240px';

      drawSimpleLineChartOnCanvas(canvasOb, labels, dataObesidad, { 
        title: `Sobrepeso/Obesidad (IMC ≥ ${imcThreshold})`, 
        color: '#ef4444', 
        aria: `Pacientes con sobrepeso/obesidad por semana. Valores exactos de conteo.` 
      });
      drawSimpleLineChartOnCanvas(canvasPr, labels, dataPresion, { 
        title: `Presión alta (MAP ≥ ${mapThreshold})`, 
        color: '#06b6d4', 
        aria: `Pacientes con presión arterial alta por semana. Valores exactos de conteo.` 
      });
    }
  } catch (e) {
    console.error('Error generando gráficas globales', e);
    section.insertAdjacentHTML('beforeend', '<div class="alert-info">No se pudieron renderizar las gráficas globales.</div>');
  }
}

// Nueva función para generar gráficas de estadísticas con Chart.js
export async function generarGraficasEstadisticasConChartJS(estadisticas) {
  try {
    await loadChartJS();
  } catch (err) {
    console.warn('Chart.js no disponible para gráficas de estadísticas:', err);
    return;
  }

  // Destruir gráficas existentes para evitar conflictos
  Chart.getChart('activity-chart')?.destroy();
  Chart.getChart('faculty-chart')?.destroy();
  Chart.getChart('appointments-chart')?.destroy();

  // Gráfica de actividad reciente (registros médicos por día)
  await generarGraficaActividadReciente();

  // Gráfica de distribución por facultad
  await generarGraficaDistribucionFacultad();

  // Gráfica de citas por estado
  if (estadisticas.pacientes.citasPorEstado) {
    generarGraficaCitasPorEstado(estadisticas.pacientes.citasPorEstado);
  }
}

// Función para generar gráfica de actividad reciente basada en registros médicos
async function generarGraficaActividadReciente() {
  const canvas = document.getElementById('activity-chart');
  if (!canvas) return;

  try {
    // Destruir gráfica existente si existe
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
      existingChart.destroy();
    }

    // Obtener todos los registros médicos de los últimos 7 días
    const registrosMedicos = await pacienteModel.getHistorialMedico();
    
    // Calcular datos por día para los últimos 7 días
    const hoy = new Date();
    const actividadPorDia = {};
    const labels = [];

    // Inicializar los últimos 7 días
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() - i);
      const fechaStr = fecha.toISOString().split('T')[0];
      const fechaLabel = fecha.toLocaleDateString('es-ES', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'numeric' 
      });
      actividadPorDia[fechaStr] = 0;
      labels.push(fechaLabel);
    }

    // Contar registros médicos por día
    registrosMedicos.forEach(registro => {
      let fechaRegistro = null;
      
      // Manejar diferentes formatos de fecha
      if (registro.timestamp?.toDate) {
        fechaRegistro = registro.timestamp.toDate();
      } else if (registro.fecha?.toDate) {
        fechaRegistro = registro.fecha.toDate();
      } else if (registro.timestamp) {
        fechaRegistro = new Date(registro.timestamp);
      } else if (registro.fecha) {
        fechaRegistro = new Date(registro.fecha);
      }

      if (fechaRegistro && !isNaN(fechaRegistro.getTime())) {
        const fechaStr = fechaRegistro.toISOString().split('T')[0];
        if (actividadPorDia[fechaStr] !== undefined) {
          actividadPorDia[fechaStr]++;
        }
      }
    });

    const data = Object.values(actividadPorDia);
    
    console.log('📊 Datos de actividad reciente:', { labels, data, actividadPorDia });

    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Registros médicos',
          data: data,
          backgroundColor: 'rgba(6, 182, 212, 0.6)',
          borderColor: 'rgba(6, 182, 212, 1)',
          borderWidth: 2,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.parsed.y} registros médicos`;
              }
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Día'
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            },
            title: {
              display: true,
              text: 'Cantidad de registros'
            }
          }
        }
      }
    });

  } catch (error) {
    console.error('Error generando gráfica de actividad reciente:', error);
    canvas.parentElement.innerHTML = '<div class="alert-info">Error generando gráfica de actividad reciente</div>';
  }
}

// Función para generar gráfica de distribución por facultad
async function generarGraficaDistribucionFacultad() {
  const canvas = document.getElementById('faculty-chart');
  if (!canvas) return;

  try {
    // Destruir gráfica existente si existe
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
      existingChart.destroy();
    }

    // Obtener todos los pacientes y contar por facultad
    const pacientes = await pacienteModel.getPacientes();
    const facultadCounts = {};
    
    pacientes.forEach(paciente => {
      const facultad = paciente.facultad || 'Sin facultad especificada';
      facultadCounts[facultad] = (facultadCounts[facultad] || 0) + 1;
    });

    const labels = Object.keys(facultadCounts);
    const data = Object.values(facultadCounts);
    const total = data.reduce((sum, val) => sum + val, 0);

    if (total === 0) {
      canvas.parentElement.innerHTML = '<div class="alert-info">No hay datos de facultades disponibles</div>';
      return;
    }

    const colores = [
      'rgba(6, 182, 212, 0.8)',   // Azul
      'rgba(236, 72, 153, 0.8)',  // Rosa
      'rgba(16, 185, 129, 0.8)',  // Verde
      'rgba(245, 158, 11, 0.8)',  // Amarillo
      'rgba(139, 92, 246, 0.8)',  // Morado
      'rgba(239, 68, 68, 0.8)',   // Rojo
      'rgba(156, 163, 175, 0.8)'  // Gris
    ];

    console.log('📊 Datos de distribución por facultad:', { labels, data, facultadCounts });

    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colores.slice(0, labels.length),
          borderColor: colores.slice(0, labels.length).map(color => color.replace('0.8', '1')),
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              generateLabels: function(chart) {
                const data = chart.data;
                return data.labels.map((label, index) => {
                  const value = data.datasets[0].data[index];
                  const percentage = ((value / total) * 100).toFixed(1);
                  // Truncar etiquetas largas
                  const shortLabel = label.length > 25 ? label.substring(0, 22) + '...' : label;
                  return {
                    text: `${shortLabel}: ${value} (${percentage}%)`,
                    fillStyle: data.datasets[0].backgroundColor[index],
                    strokeStyle: data.datasets[0].borderColor[index],
                    lineWidth: 2,
                    index: index
                  };
                });
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label;
                const value = context.parsed;
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value} pacientes (${percentage}%)`;
              }
            }
          }
        }
      }
    });

  } catch (error) {
    console.error('Error generando gráfica de distribución por facultad:', error);
    canvas.parentElement.innerHTML = '<div class="alert-info">Error generando gráfica de distribución por facultad</div>';
  }
}

// Función para generar gráfica de citas por estado
function generarGraficaCitasPorEstado(datosCitas) {
  const canvas = document.getElementById('appointments-chart');
  if (!canvas) return;

  try {
    // Destruir gráfica existente si existe
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
      existingChart.destroy();
    }

    const labels = Object.keys(datosCitas);
    const data = Object.values(datosCitas);
    const total = data.reduce((sum, val) => sum + val, 0);

    const colores = [
      'rgba(16, 185, 129, 0.8)',  // Verde - Completadas
      'rgba(245, 158, 11, 0.8)',  // Amarillo - Programadas
      'rgba(239, 68, 68, 0.8)',   // Rojo - Canceladas
      'rgba(6, 182, 212, 0.8)',   // Azul - Pendientes
      'rgba(139, 92, 246, 0.8)'   // Morado - Otros
    ];

    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colores.slice(0, labels.length),
          borderColor: colores.slice(0, labels.length).map(color => color.replace('0.8', '1')),
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              generateLabels: function(chart) {
                const data = chart.data;
                return data.labels.map((label, index) => {
                  const value = data.datasets[0].data[index];
                  const percentage = ((value / total) * 100).toFixed(1);
                  return {
                    text: `${label}: ${value} (${percentage}%)`,
                    fillStyle: data.datasets[0].backgroundColor[index],
                    strokeStyle: data.datasets[0].borderColor[index],
                    lineWidth: 2,
                    index: index
                  };
                });
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label;
                const value = context.parsed;
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value} citas (${percentage}%)`;
              }
            }
          }
        }
      }
    });

  } catch (error) {
    console.error('Error generando gráfica de citas por estado:', error);
    canvas.parentElement.innerHTML = '<div class="alert-info">Error generando gráfica de citas por estado</div>';
  }
}

// Función temporal para limpiar registros de navegación del sistema
async function cleanNavigationRecords() {
  try {
    console.log('🗑️ Iniciando limpieza de registros de navegación...');
    
    // Importar Firebase dinámicamente
    const { getFirestore, collection, query, where, getDocs, deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js');
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js');
    
    // Obtener configuración de Firebase del modelo
    const firebaseConfigModule = await import('../models/firebaseConfig.js');
    
    // Usar la configuración exportada
    const firebaseConfig = {
      apiKey: "AIzaSyA-ZU02eVn2FiwkgpjveymB8VRUUeGSH3Y",
      authDomain: "medicalweboffline.firebaseapp.com",
      projectId: "medicalweboffline",
      storageBucket: "medicalweboffline.firebasestorage.app",
      messagingSenderId: "1038201454133",
      appId: "1:1038201454133:web:f6ee7c6215f6b4d4febb7c"
    };
    
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    const actividadesCollection = collection(db, 'registro_actividades');
    
    // Buscar registros antiguos de navegación que puedan quedar
    const navegacionQuery = query(
      actividadesCollection,
      where('accion', 'in', ['navegacion', 'page_access', 'acceso', 'navegacion-bloqueada', 'navegar', 'navigation', 'menu', 'consulta'])
    );
    
    console.log('🔍 Buscando registros de navegación antiguos...');
    const snapshot = await getDocs(navegacionQuery);
    
    console.log(`📊 Encontrados ${snapshot.size} registros de navegación antiguos para eliminar`);
    
    if (snapshot.size === 0) {
      console.log('⚪ No hay registros de navegación para limpiar');
      return 0;
    }
    
    // También buscar registros del módulo 'sistema'
    const sistemaQuery = query(
      actividadesCollection,
      where('modulo', '==', 'sistema')
    );
    
    const sistemaSnapshot = await getDocs(sistemaQuery);
    console.log(`📊 Encontrados ${sistemaSnapshot.size} registros del módulo 'sistema' para eliminar`);
    
    // Combinar ambos conjuntos de documentos
    const todosLosDocumentos = [...snapshot.docs, ...sistemaSnapshot.docs];
    const documentosUnicos = todosLosDocumentos.filter((doc, index, arr) => 
      arr.findIndex(d => d.id === doc.id) === index
    );
    
    console.log(`📊 Total de documentos únicos a eliminar: ${documentosUnicos.length}`);
    
    // Eliminar registros en lotes para evitar sobrecarga
    let deletedCount = 0;
    const deletePromises = [];
    
    documentosUnicos.forEach((docSnapshot) => {
      const docRef = doc(db, 'registro_actividades', docSnapshot.id);
      deletePromises.push(deleteDoc(docRef));
    });
    
    // Ejecutar eliminaciones en paralelo
    console.log('🗑️ Eliminando registros...');
    await Promise.all(deletePromises);
    deletedCount = documentosUnicos.length;
    
    console.log(`✅ Se eliminaron ${deletedCount} registros de navegación antiguos exitosamente`);
    
    return deletedCount;
    
  } catch (error) {
    console.error('❌ Error eliminando registros de navegación:', error);
    throw error;
  }
}

// ========================================
// MODAL DE ESTADÍSTICAS COMPLETAS
// ========================================

/**
 * Mostrar modal con estadísticas completas del sistema
 */
window.mostrarEstadisticasCompletas = async function() {
  try {
    console.log('📊 Cargando estadísticas completas...');
    
    // Importar ActivityLogger
    const { default: ActivityLogger } = await import('../utils/activityLogger.js');
    
    // Obtener estadísticas completas
    const stats = await ActivityLogger.getActivityStats({ limit: 100 });
    
    // Crear contenido del modal
    const modalContent = `
      <div class="modal-overlay" id="modalEstadisticasCompletas" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 9999; display: flex; align-items: center; justify-content: center;">
        <div class="modal-content" style="background: white; border-radius: 15px; padding: 30px; max-width: 800px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
          
          <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #f1f5f9;">
            <h2 style="margin: 0; color: #1f2937; font-size: 1.8rem;">
              <i class="fas fa-chart-bar" style="color: #6366f1; margin-right: 10px;"></i>
              Estadísticas Completas del Sistema
            </h2>
            <button onclick="cerrarModalEstadisticas()" style="background: none; border: none; font-size: 1.5rem; color: #64748b; cursor: pointer; padding: 5px; border-radius: 5px; transition: all 0.3s ease;">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="estadisticas-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
            
            <div class="stat-card-modal" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 20px; border-radius: 12px; text-align: center;">
              <div style="font-size: 2.5rem; font-weight: 700; margin-bottom: 8px;">${stats.total || 0}</div>
              <div style="font-size: 0.9rem; opacity: 0.9;">Total de Actividades</div>
            </div>
            
            <div class="stat-card-modal" style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; border-radius: 12px; text-align: center;">
              <div style="font-size: 2.5rem; font-weight: 700; margin-bottom: 8px;">${stats.usuariosActivos?.length || 0}</div>
              <div style="font-size: 0.9rem; opacity: 0.9;">Usuarios Conectados</div>
            </div>
            
            <div class="stat-card-modal" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 20px; border-radius: 12px; text-align: center;">
              <div style="font-size: 2.5rem; font-weight: 700; margin-bottom: 8px;">${stats.usuariosConLogin?.length || 0}</div>
              <div style="font-size: 0.9rem; opacity: 0.9;">Usuarios con Login</div>
            </div>
            
            <div class="stat-card-modal" style="background: linear-gradient(135deg, #06b6d4, #0891b2); color: white; padding: 20px; border-radius: 12px; text-align: center;">
              <div style="font-size: 2.5rem; font-weight: 700; margin-bottom: 8px;">${stats.usuarios?.length || 0}</div>
              <div style="font-size: 0.9rem; opacity: 0.9;">Usuarios Únicos</div>
            </div>
            
            <div class="stat-card-modal" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 20px; border-radius: 12px; text-align: center;">
              <div style="font-size: 2.5rem; font-weight: 700; margin-bottom: 8px;">${Object.keys(stats.porAccion || {}).length}</div>
              <div style="font-size: 0.9rem; opacity: 0.9;">Tipos de Acciones</div>
            </div>
            
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
            
            <!-- Estado de Usuarios del Sistema -->
            <div class="detalle-seccion">
              <h3 style="color: #1f2937; margin-bottom: 15px; font-size: 1.2rem;">
                <i class="fas fa-user-check" style="color: #10b981; margin-right: 8px;"></i>
                Usuarios Conectados Ahora - ${stats.usuariosActivos?.length || 0}
              </h3>
              <div style="background: #f0fdf4; border-radius: 8px; padding: 15px; max-height: 150px; overflow-y: auto; border: 2px solid #10b981;">
                ${stats.usuariosActivos && stats.usuariosActivos.length > 0 ? 
                  stats.usuariosActivos.map((usuario, index) => {
                    const actividades = stats.porUsuario[usuario] || 0;
                    return `
                      <div style="padding: 8px 0; border-bottom: 1px solid #bbf7d0; display: flex; justify-content: space-between;">
                        <span style="font-weight: 600; color: #065f46;">� ${index + 1}. ${usuario}</span>
                        <span style="color: #16a34a; font-size: 0.9rem; font-weight: 500;">${actividades} actividades</span>
                      </div>
                    `;
                  }).join('') : 
                  '<div style="text-align: center; color: #9ca3af; padding: 20px;">No hay usuarios conectados</div>'
                }
              </div>
              
              <h4 style="color: #1f2937; margin: 20px 0 10px 0; font-size: 1rem;">
                <i class="fas fa-key" style="color: #f59e0b; margin-right: 8px;"></i>
                Usuarios con Login - ${stats.usuariosConLogin?.length || 0}
              </h4>
              <div style="background: #fffbeb; border-radius: 8px; padding: 15px; max-height: 120px; overflow-y: auto; border: 1px solid #f59e0b;">
                ${stats.usuariosConLogin && stats.usuariosConLogin.length > 0 ? 
                  stats.usuariosConLogin.map((usuario, index) => {
                    const actividades = stats.porUsuario[usuario] || 0;
                    const estaConectado = stats.usuariosActivos?.includes(usuario);
                    return `
                      <div style="padding: 6px 0; border-bottom: 1px solid #fcd34d; display: flex; justify-content: space-between;">
                        <span style="font-weight: 500; color: #92400e;">${estaConectado ? '�' : '�'} ${index + 1}. ${usuario}</span>
                        <span style="color: #d97706; font-size: 0.9rem;">${actividades} actividades</span>
                      </div>
                    `;
                  }).join('') : 
                  '<div style="text-align: center; color: #9ca3af; padding: 15px;">No hay usuarios con login</div>'
                }
              </div>
            </div>
            
            <!-- Actividades por Tipo -->
            <div class="detalle-seccion">
              <h3 style="color: #1f2937; margin-bottom: 15px; font-size: 1.2rem;">
                <i class="fas fa-bolt" style="color: #8b5cf6; margin-right: 8px;"></i>
                Actividades por Tipo
              </h3>
              <div style="background: #f8fafc; border-radius: 8px; padding: 15px; max-height: 200px; overflow-y: auto;">
                ${stats.porAccion && Object.keys(stats.porAccion).length > 0 ? 
                  Object.entries(stats.porAccion).map(([accion, count]) => `
                    <div style="padding: 6px 0; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between;">
                      <span style="font-weight: 500;">${accion}</span>
                      <span style="color: #6b7280;">${count}</span>
                    </div>
                  `).join('') :
                  '<div style="text-align: center; color: #9ca3af; padding: 20px;">No hay actividades registradas</div>'
                }
              </div>
            </div>
            
          </div>
          
          <div style="margin-top: 30px;">
            <!-- Actividades por Módulo -->
            <div class="detalle-seccion">
              <h3 style="color: #1f2937; margin-bottom: 15px; font-size: 1.2rem;">
                <i class="fas fa-th-large" style="color: #f59e0b; margin-right: 8px;"></i>
                Actividades por Módulo
              </h3>
              <div style="background: #f8fafc; border-radius: 8px; padding: 15px; max-height: 200px; overflow-y: auto;">
                ${stats.porModulo && Object.keys(stats.porModulo).length > 0 ? 
                  Object.entries(stats.porModulo).map(([modulo, count]) => `
                    <div style="padding: 6px 0; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between;">
                      <span style="font-weight: 500;">${modulo}</span>
                      <span style="color: #6b7280;">${count}</span>
                    </div>
                  `).join('') :
                  '<div style="text-align: center; color: #9ca3af; padding: 20px;">No hay actividades por módulo</div>'
                }
              </div>
            </div>
          </div>
          
          <div style="margin-top: 30px; text-align: center;">
            <button onclick="cerrarModalEstadisticas()" style="background: linear-gradient(135deg, #6b7280, #4b5563); color: white; border: none; padding: 12px 30px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">
              <i class="fas fa-times" style="margin-right: 8px;"></i>
              Cerrar
            </button>
          </div>
          
        </div>
      </div>
    `;
    
    // Agregar modal al DOM
    document.body.insertAdjacentHTML('beforeend', modalContent);
    
    // Cerrar modal al hacer clic fuera
    document.getElementById('modalEstadisticasCompletas').addEventListener('click', function(e) {
      if (e.target === this) {
        cerrarModalEstadisticas();
      }
    });
    
    console.log('✅ Modal de estadísticas completas cargado');
    
  } catch (error) {
    console.error('❌ Error cargando estadísticas completas:', error);
    alert('Error al cargar las estadísticas completas. Revisa la consola para más detalles.');
  }
};

/**
 * Cerrar modal de estadísticas
 */
window.cerrarModalEstadisticas = function() {
  const modal = document.getElementById('modalEstadisticasCompletas');
  if (modal) {
    modal.remove();
  }
};

// ========================================


