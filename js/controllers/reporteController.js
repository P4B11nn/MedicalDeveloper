// js/controllers/reporteController.js
import { authModel } from '../models/storageModel.js';
import { reporteModel } from '../models/reporteModel.js';
import { renderEstadisticas, renderActividades, renderExportacion, insertarEstilosGraficos } from '../views/reporteView.js';
import { pacienteModel } from '../models/pacienteModel.js';

// Función para mostrar confirmaciones
function mostrarConfirmacion(titulo, mensaje, callback = null) {
  const modalConfirmacion = document.createElement('div');
  modalConfirmacion.style.cssText = `
    display: flex;
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: linear-gradient(135deg, rgba(125, 211, 252, 0.9), rgba(254, 243, 199, 0.9)), url('img/medical-background.png?v=1') center center / cover no-repeat;
    z-index: 9999;
    justify-content: center;
    align-items: center;
  `;
  
  modalConfirmacion.innerHTML = `
    <div style="background: rgba(255, 255, 255, 0.98); padding: 30px; border-radius: 20px; min-width: 350px; max-width: 500px; text-align: center; box-shadow: 0 25px 60px rgba(0, 0, 0, 0.3); border: 2px solid rgba(125, 211, 252, 0.4); position: relative; margin: 20px;">
      <div style="margin-bottom: 20px; font-size: 3rem;">✅</div>
      <h3 id="tituloConfirmacion" style="margin: 0 0 15px 0; font-size: 1.5rem; font-weight: 700; color: transparent; background: linear-gradient(135deg, #06b6d4, #10b981); -webkit-background-clip: text; background-clip: text;">${titulo}</h3>
      <p id="mensajeConfirmacion" style="margin: 0 0 25px 0; font-size: 1.1rem; color: #374151; line-height: 1.5;">${mensaje}</p>
      <button id="btnAceptarConfirmacion" style="background: linear-gradient(135deg, #7dd3fc, #fef3c7); color: #1f2937; border: none; border-radius: 25px; padding: 12px 30px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 6px 20px rgba(125, 211, 252, 0.3);">Aceptar</button>
    </div>
  `;
  
  document.body.appendChild(modalConfirmacion);
  
  // Configurar el botón de aceptar
  const btnAceptarConfirmacion = modalConfirmacion.querySelector('#btnAceptarConfirmacion');
  btnAceptarConfirmacion.onclick = () => {
    document.body.removeChild(modalConfirmacion);
    if (callback && typeof callback === 'function') {
      callback();
    }
  };
}

export function initReporteController() {
  // Insertar estilos CSS para los gráficos
  insertarEstilosGraficos();
  
  // Obtener información del usuario actual
  const usuarioActual = authModel.getCurrentUser();
  if (!usuarioActual) {
    window.location.href = 'index.html';
    return;
  }

  // Configurar elementos de usuario
  const userNameSpan = document.getElementById('userName');
  if (userNameSpan) {
    const rolIcon = usuarioActual.rol === 'admin' ? '👑 ' : '👤 ';
    userNameSpan.innerHTML = `${rolIcon}${usuarioActual.nombre}`;
  }

  // Configurar dropdown del usuario
  const userIcon = document.getElementById('userIcon');
  const userDropdown = document.getElementById('userDropdown');
  
  if (userIcon && userDropdown) {
    userIcon.addEventListener('click', (e) => {
      userDropdown.style.display = userDropdown.style.display === 'block' ? 'none' : 'block';
      e.stopPropagation();
    });
    
    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (!userIcon.contains(e.target) && !userDropdown.contains(e.target)) {
        userDropdown.style.display = 'none';
      }
    });
  }
  
  // Configurar botón de cierre de sesión
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      authModel.registrarActividad({
        accion: 'logout',
        descripcion: 'Cierre de sesión'
      });
      window.location.href = 'index.html';
    };
  }
  
  // Configurar botones de navegación
  const btnEstadisticas = document.getElementById('btnEstadisticas');
  const btnActividades = document.getElementById('btnActividades');
  const btnExportacion = document.getElementById('btnExportacion');
  
  const seccionEstadisticas = document.getElementById('estadisticas-section');
  const seccionActividades = document.getElementById('actividades-section');
  const seccionExportacion = document.getElementById('exportacion-section');
  
  // Función para cambiar de sección
  function cambiarSeccion(seccionActiva) {
    if (!seccionActiva) return;

    // Lista completa de secciones y botones
    const secciones = [
      { el: seccionEstadisticas, btn: btnEstadisticas },
      { el: seccionActividades, btn: btnActividades },
      { el: seccionExportacion, btn: btnExportacion }
    ];

    // Primero ocultar y limpiar todas las secciones y quitar active de botones
    secciones.forEach(item => {
      if (!item.el) return;
      try {
        item.el.classList.remove('active');
        item.el.style.display = 'none';
        // limpiar contenido para evitar mezcla
        item.el.innerHTML = '';
      } catch (err) { /* noop */ }
      if (item.btn) item.btn.classList.remove('active');
    });

    // Mostrar solo la sección activa
    try {
      seccionActiva.style.display = 'block';
      seccionActiva.classList.add('active');
    } catch (e) { /* noop */ }

    // Activar el botón asociado (si existe)
    const botonAsociado = secciones.find(s => s.el === seccionActiva);
    if (botonAsociado && botonAsociado.btn) {
      botonAsociado.btn.classList.add('active');
    }

    // Mostrar/ocultar la barra lateral dependiendo de la sección
    try {
      const sidebar = document.querySelector('.sidebar');
      if (seccionActiva === seccionEstadisticas) {
        // Ocultar todo el sidebar para ganar espacio
        if (sidebar) sidebar.style.display = 'none';
        // añadir clase al body para que el layout se adapte via CSS
        try { document.body.classList.add('sidebar-hidden'); } catch(e) {}
      } else {
        // Restaurar sidebar y botones
        if (sidebar) sidebar.style.display = '';
        try { document.body.classList.remove('sidebar-hidden'); } catch(e) {}
        if (btnActividades) btnActividades.style.display = '';
        if (btnExportacion) btnExportacion.style.display = '';
        if (btnEstadisticas) btnEstadisticas.style.display = '';
      }
    } catch (err) {
      // noop
    }
  }
  
  // Configurar eventos de los botones
  if (btnEstadisticas) {
    btnEstadisticas.addEventListener('click', () => {
      cambiarSeccion(seccionEstadisticas);
      renderEstadisticas();
    });
  }
  
  if (btnActividades) {
    btnActividades.addEventListener('click', () => {
      cambiarSeccion(seccionActividades);
      renderActividades();
    });
  }
  
  if (btnExportacion) {
    btnExportacion.addEventListener('click', () => {
      cambiarSeccion(seccionExportacion);
      renderExportacion();
    });
  }
  
  // No renderizar una sección por defecto aún. Primero intentaremos abrir la
  // sección indicada por la URL (query param 'section' o hash). Si no hay
  // ninguna, entonces abrimos Estadísticas por defecto.
  const openedByUrl = (function handleInitialSectionFromUrl(){
    try {
      const params = new URLSearchParams(window.location.search);
      const sectionParam = params.get('section');
      const hash = window.location.hash || '';

      // Helper que dispara la acción de manera segura
      const openSection = (name) => {
        switch (name) {
          case 'estadisticas':
          case 'estadisticas-section':
            if (btnEstadisticas) { btnEstadisticas.click(); }
            return true;
          case 'actividades':
          case 'actividades-section':
            if (btnActividades) { btnActividades.click(); }
            return true;
          case 'exportacion':
          case 'exportacion-section':
            if (btnExportacion) { btnExportacion.click(); }
            return true;
          default:
            return false;
        }
      };

      // Si existe section en query string, abrirla y salir
      if (sectionParam) {
        return openSection(sectionParam) === true;
      }

      // Si existe hash y no hay query param, usar hash
      if (hash) {
        const target = hash.replace('#', '');
        return openSection(target) === true;
      }
    } catch (err) {
      console.warn('Error parsing initial section from URL', err);
      return false;
    }
  })();

  // Si la URL no abrió ninguna sección específica, abrir Estadísticas por defecto
  if (!openedByUrl) {
    if (btnEstadisticas) {
      cambiarSeccion(seccionEstadisticas);
      renderEstadisticas();
    }
  }

  // Registrar actividad de acceso a reportes
  authModel.registrarActividad({
    accion: 'acceso',
    descripcion: 'Acceso al módulo de reportes'
  });
}

// Funciones para manejar la exportación de datos
export function exportarDatosCSV(tipoExportacion) {
  try {
    let datos = [];
    let nombreArchivo = '';
    
    // Obtener los datos según el tipo de exportación
    switch (tipoExportacion) {
      case 'pacientes':
        datos = reporteModel.getReportePacientes();
        nombreArchivo = 'pacientes';
        break;
      case 'citas':
        datos = reporteModel.getReporteCitas();
        nombreArchivo = 'citas';
        break;
      case 'historial':
        datos = reporteModel.getReporteHistorialMedico();
        nombreArchivo = 'historial_medico';
        break;
      case 'actividades':
        datos = reporteModel.getReporteActividades();
        nombreArchivo = 'actividades';
        break;
      default:
        throw new Error('Tipo de exportación no válido');
    }
    
    const resultado = reporteModel.exportarCSV(datos, nombreArchivo);
    
    if (resultado.success) {
      mostrarConfirmacion('Éxito', `Los datos de ${tipoExportacion} han sido exportados correctamente.`);
      
      // Registrar la actividad de exportación
      authModel.registrarActividad({
        accion: 'exportar',
        descripcion: `Exportación de datos: ${tipoExportacion}`
      });
    } else {
      mostrarConfirmacion('Error', resultado.message);
    }
  } catch (error) {
    mostrarConfirmacion('Error', `Error al exportar los datos: ${error.message}`);
  }
}

// Funciones para filtrar actividades
export function filtrarActividades(filtros) {
  try {
    // Aplicar filtros y renderizar resultados
    const actividades = reporteModel.getReporteActividades(filtros);
    
    // Actualizar la vista con los resultados filtrados
    const contenedorResultados = document.getElementById('resultadosActividades');
    if (!contenedorResultados) return;
    
    if (actividades.length === 0) {
      contenedorResultados.innerHTML = `
        <div class="alert-info">
          No se encontraron actividades que coincidan con los filtros seleccionados.
        </div>
      `;
      return;
    }
    
    let html = `
      <div class="table-responsive">
        <table class="report-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Usuario</th>
              <th>Acción</th>
              <th>Descripción</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    actividades.forEach(actividad => {
      const fecha = new Date(actividad.fecha).toLocaleString('es-MX');
      html += `
        <tr>
          <td>${fecha}</td>
          <td>${actividad.usuario}</td>
          <td>${actividad.accion}</td>
          <td>${actividad.descripcion}</td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
        </table>
      </div>
      <div class="action-buttons">
        <button class="btn btn-secondary" id="btnExportarResultados">
          <i class="fas fa-file-export"></i> Exportar estos resultados
        </button>
      </div>
    `;
    
    contenedorResultados.innerHTML = html;
    
    // Configurar botón de exportación de resultados
    const btnExportarResultados = document.getElementById('btnExportarResultados');
    if (btnExportarResultados) {
      btnExportarResultados.addEventListener('click', () => {
        const resultado = reporteModel.exportarCSV(actividades, 'actividades_filtradas');
        if (resultado.success) {
          mostrarConfirmacion('Éxito', 'Los resultados filtrados han sido exportados correctamente.');
        }
      });
    }
    
    // Registrar actividad de filtro
    authModel.registrarActividad({
      accion: 'consulta',
      descripcion: 'Filtro de actividades del sistema'
    });
    
  } catch (error) {
    mostrarConfirmacion('Error', `Error al filtrar las actividades: ${error.message}`);
  }
}

// Funciones para generar estadísticas
export function generarEstadisticasPersonalizadas(params) {
  try {
    const estadisticas = reporteModel.getEstadisticasPersonalizadas(params);
    
    // Renderizar las estadísticas en la vista
    renderEstadisticas(estadisticas);
    
    // Registrar actividad de generación de estadísticas
    authModel.registrarActividad({
      accion: 'consulta',
      descripcion: `Generación de estadísticas personalizadas (${params.periodo}, ${params.tipo})`
    });
    
  } catch (error) {
    mostrarConfirmacion('Error', `Error al generar las estadísticas: ${error.message}`);
  }
}