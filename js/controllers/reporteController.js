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

export async function initReporteController() {
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
    btnEstadisticas.addEventListener('click', async () => {
      cambiarSeccion(seccionEstadisticas);
      await renderEstadisticas();
    });
  }
  
  if (btnActividades) {
    btnActividades.addEventListener('click', async () => {
      cambiarSeccion(seccionActividades);
      await renderActividades();
    });
  }
  
  if (btnExportacion) {
    btnExportacion.addEventListener('click', async () => {
      cambiarSeccion(seccionExportacion);
      await renderExportacion();
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
      await renderEstadisticas();
    }
  }

  // Registrar actividad de acceso a reportes (no await para no bloquear la UI)
  authModel.registrarActividad({
    accion: 'acceso',
    descripcion: 'Acceso al módulo de reportes'
  }).catch(() => {});
}

// Funciones para manejar la exportación de datos
export async function exportarDatosCSV(tipoExportacion) {
  try {
    // Manejo especial para "historial": pedimos al usuario elegir un paciente para exportar individualmente
    if (tipoExportacion === 'historial') {
      // Crear modal simple para seleccionar paciente
      const pacientes = await pacienteModel.getPacientes();
      if (!pacientes || pacientes.length === 0) {
        mostrarConfirmacion('Error', 'No hay pacientes registrados para exportar historial.');
        return;
      }

      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);z-index:9999';
      modal.innerHTML = `
        <div style="background:#fff;padding:20px;border-radius:8px;min-width:320px;max-width:520px">
          <h3 style="margin-top:0">Exportar historial por paciente</h3>
          <p>Seleccione el paciente cuyo historial desea exportar:</p>
          <select id="_selectPacienteExport" style="width:100%;padding:8px;margin:8px 0">
            ${pacientes.map(p => `<option value="${p.id}">${p.nombre} ${p.apellidos || ''} — ${p.matricula || ''}</option>`).join('')}
          </select>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
            <button id="_cancelExportHist" style="padding:8px 12px">Cancelar</button>
            <button id="_okExportHist" style="padding:8px 12px;background:#06b6d4;border:none;color:#fff;border-radius:4px">Exportar</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const cancelBtn = modal.querySelector('#_cancelExportHist');
      const okBtn = modal.querySelector('#_okExportHist');
      const select = modal.querySelector('#_selectPacienteExport');

      cancelBtn.addEventListener('click', () => { document.body.removeChild(modal); });

      okBtn.addEventListener('click', async () => {
        const pacienteId = select.value;
        const paciente = await pacienteModel.getPaciente(pacienteId);

        // Obtener registros del historial centralizado
        const historialRegistros = await reporteModel.getReporteHistorialMedico({ pacienteId });

        // Construir series de parámetros a partir de historialCambios y datosMedicos actuales
        const parametrosSeries = {
          temperatura: [],
          peso: [],
          talla: [],
          frecuenciaRespiratoria: [],
          presion_combined: []
        };

        // Incluir registro inicial (datos actuales del paciente si existen)
        if (paciente) {
          // Si el paciente tiene historialCambios (array de actualizaciones), recorrerlo
          const cambios = paciente.historialCambios || [];

          cambios.forEach(cambio => {
            const fecha = cambio.fecha || cambio.datos?.fechaRegistroMedico || null;
            const datos = cambio.datos || {};
            if (datos.temperatura) parametrosSeries.temperatura.push({ fecha, valor: parseFloat(datos.temperatura) });
            if (datos.peso) parametrosSeries.peso.push({ fecha, valor: parseFloat(datos.peso) });
            if (datos.talla) parametrosSeries.talla.push({ fecha, valor: parseFloat(datos.talla) });
            if (datos.frecuenciaRespiratoria) parametrosSeries.frecuenciaRespiratoria.push({ fecha, valor: parseFloat(datos.frecuenciaRespiratoria) });
            if (datos.presion) {
              // intentar parsear "120/80" y guardar combinado
              const m = String(datos.presion).match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
              if (m) {
                parametrosSeries.presion_combined.push({ fecha, systolic: parseInt(m[1]), diastolic: parseInt(m[2]) });
              } else if (!isNaN(Number(datos.presion))) {
                parametrosSeries.presion_combined.push({ fecha, systolic: Number(datos.presion), diastolic: null });
              }
            }
          });

          // Agregar el estado actual de datosMedicos si existe
          const dm = paciente.datosMedicos || null;
          if (dm && dm.fechaRegistroMedico) {
            const fecha = dm.fechaRegistroMedico;
            if (dm.temperatura) parametrosSeries.temperatura.push({ fecha, valor: parseFloat(dm.temperatura) });
            if (dm.peso) parametrosSeries.peso.push({ fecha, valor: parseFloat(dm.peso) });
            if (dm.talla) parametrosSeries.talla.push({ fecha, valor: parseFloat(dm.talla) });
            if (dm.frecuenciaRespiratoria) parametrosSeries.frecuenciaRespiratoria.push({ fecha, valor: parseFloat(dm.frecuenciaRespiratoria) });
            if (dm.presion) {
              const m = String(dm.presion).match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
              if (m) {
                parametrosSeries.presion_combined.push({ fecha, systolic: parseInt(m[1]), diastolic: parseInt(m[2]) });
              } else if (!isNaN(Number(dm.presion))) {
                parametrosSeries.presion_combined.push({ fecha, systolic: Number(dm.presion), diastolic: null });
              }
            }
          }
        }

        // Ordenar series por fecha
        Object.keys(parametrosSeries).forEach(k => {
          if (Array.isArray(parametrosSeries[k])) parametrosSeries[k].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        });

        // Construir observaciones agrupadas y sin duplicados: examenVista, examenOido, general
        const grouped = { examenVista: [], examenOido: [], general: [] };
        const seen = { examenVista: new Set(), examenOido: new Set(), general: new Set() };

        // General: tomar notas del historial central (notas/descripcion/tipo)
        (historialRegistros || []).forEach(r => {
          const texto = String(r.notas || r.descripcion || r.tipo || '').trim();
          if (texto && !seen.general.has(texto)) {
            grouped.general.push({ fecha: r.fecha, texto });
            seen.general.add(texto);
          }
        });

        // Incluir observaciones específicas de los exámenes desde historialCambios y datosMedicos
        try {
          const cambios = (paciente && paciente.historialCambios) ? paciente.historialCambios : [];
          cambios.forEach(cambio => {
            const fecha = cambio.fecha || cambio.datos?.fechaRegistroMedico || null;
            const datos = cambio.datos || {};
            if (datos.examenVista && String(datos.examenVista).trim() !== '') {
              const t = String(datos.examenVista).trim();
              if (!seen.examenVista.has(t)) { grouped.examenVista.push({ fecha, texto: t }); seen.examenVista.add(t); }
            }
            if (datos.examenOido && String(datos.examenOido).trim() !== '') {
              const t = String(datos.examenOido).trim();
              if (!seen.examenOido.has(t)) { grouped.examenOido.push({ fecha, texto: t }); seen.examenOido.add(t); }
            }
          });

          if (paciente && paciente.datosMedicos) {
            const dm = paciente.datosMedicos;
            const fechaDM = dm.fechaRegistroMedico || null;
            if (dm.examenVista && String(dm.examenVista).trim() !== '') {
              const t = String(dm.examenVista).trim();
              if (!seen.examenVista.has(t)) { grouped.examenVista.push({ fecha: fechaDM, texto: t }); seen.examenVista.add(t); }
            }
            if (dm.examenOido && String(dm.examenOido).trim() !== '') {
              const t = String(dm.examenOido).trim();
              if (!seen.examenOido.has(t)) { grouped.examenOido.push({ fecha: fechaDM, texto: t }); seen.examenOido.add(t); }
            }
          }
        } catch (e) {
          // noop
        }

        // Evitar duplicados: si un texto aparece como examen, quitarlo de general
        grouped.general = grouped.general.filter(item => {
          const t = item.texto.trim();
          if (seen.examenVista.has(t) || seen.examenOido.has(t)) return false;
          return true;
        });

        const datosParaExport = {
          paciente: paciente || { id: pacienteId },
          parametrosSeries,
          // Observaciones agrupadas: { examenVista:[], examenOido:[], general:[] }
          observaciones: grouped,
          historial: historialRegistros
        };

        const nombreArchivo = `historial_${paciente ? (paciente.matricula || pacienteId) : pacienteId}`;

  const resultado = await reporteModel.exportarPDF(datosParaExport, nombreArchivo);
        if (resultado && resultado.success) {
          mostrarConfirmacion('Éxito', `Historial del paciente preparado para exportación.`);
          authModel.registrarActividad({ accion: 'exportar', descripcion: `Exportación historial paciente: ${pacienteId}` }).catch(()=>{});
        } else {
          mostrarConfirmacion('Error', resultado ? resultado.message : 'Error al preparar exportación.');
        }

        document.body.removeChild(modal);
      });

      return;
    }

    // Para los demás tipos exportamos todo a PDF (sin fallback a CSV)
    let datos = [];
    let nombreArchivo = '';

    switch (tipoExportacion) {
      case 'pacientes':
        datos = await reporteModel.getReportePacientes();
        nombreArchivo = 'pacientes';
        break;
      case 'citas':
        datos = await reporteModel.getReporteCitas();
        nombreArchivo = 'citas';
        break;
      case 'historial':
        datos = await reporteModel.getReporteHistorialMedico();
        nombreArchivo = 'historial_medico';
        break;
      case 'actividades':
        datos = await reporteModel.getReporteActividades();
        nombreArchivo = 'actividades';
        break;
      default:
        throw new Error('Tipo de exportación no válido');
    }

    if (tipoExportacion === 'actividades') {
      // Para actividades mantenemos un formato simple (sin encabezado/pie especial solicitado)
      // Construimos una tabla imprimible aquí
      let html = `<!doctype html><html><head><meta charset="utf-8"><title>${nombreArchivo}</title>`;
      html += `<style>body{font-family:Arial,Helvetica,sans-serif;padding:18px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f3f4f6}</style>`;
      html += `</head><body><h2>Actividades</h2><table><thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Descripción</th></tr></thead><tbody>`;
      datos.forEach(act => {
        const fecha = new Date(act.fecha).toLocaleString('es-MX');
        html += `<tr><td>${fecha}</td><td>${act.usuario}</td><td>${act.accion}</td><td>${act.descripcion}</td></tr>`;
      });
      html += `</tbody></table></body></html>`;

      const newWin = window.open('', '_blank');
      if (!newWin) {
        mostrarConfirmacion('Error', 'No se pudo abrir la ventana de impresión. Desactive el bloqueador de ventanas emergentes.');
        return;
      }
      newWin.document.open(); newWin.document.write(html); newWin.document.close();
      setTimeout(() => { try { newWin.focus(); newWin.print(); } catch (e) {} }, 500);

      authModel.registrarActividad({ accion: 'exportar', descripcion: `Exportación de actividades` }).catch(()=>{});
      mostrarConfirmacion('Éxito', 'Registro de actividades preparado para impresión/PDF.');
      return;
    }

    // Pacientes y citas
  const resultado = await reporteModel.exportarPDF(datos, nombreArchivo);
  if (resultado && resultado.success) {
      mostrarConfirmacion('Éxito', `Los datos de ${tipoExportacion} han sido preparados para exportación.`);
      authModel.registrarActividad({ accion: 'exportar', descripcion: `Exportación de datos: ${tipoExportacion}` }).catch(()=>{});
    } else {
      mostrarConfirmacion('Error', resultado ? resultado.message : 'Error al preparar exportación.');
    }

  } catch (error) {
    mostrarConfirmacion('Error', `Error al exportar los datos: ${error.message}`);
  }
}

// Funciones para filtrar actividades
export async function filtrarActividades(filtros) {
  try {
    // Aplicar filtros y renderizar resultados
    const actividades = await reporteModel.getReporteActividades(filtros);
    
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
    
    // Configurar botón de exportación de resultados (exportar solo los resultados filtrados)
    const btnExportarResultados = document.getElementById('btnExportarResultados');
    if (btnExportarResultados) {
      btnExportarResultados.addEventListener('click', () => {
        // Generar una vista imprimible con los resultados actualmente filtrados
        let html = `<!doctype html><html><head><meta charset="utf-8"><title>actividades_filtradas</title>`;
        html += `<style>body{font-family:Arial,Helvetica,sans-serif;padding:18px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f3f4f6}</style>`;
        html += `</head><body><h2>Actividades - Resultados Filtrados</h2><table><thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Descripción</th></tr></thead><tbody>`;
        actividades.forEach(act => {
          const fecha = new Date(act.fecha).toLocaleString('es-MX');
          html += `<tr><td>${fecha}</td><td>${act.usuario}</td><td>${act.accion}</td><td>${act.descripcion}</td></tr>`;
        });
        html += `</tbody></table></body></html>`;

        const newWin = window.open('', '_blank');
        if (!newWin) {
          mostrarConfirmacion('Error', 'No se pudo abrir la ventana de impresión. Desactive el bloqueador de ventanas emergentes.');
          return;
        }
        newWin.document.open(); newWin.document.write(html); newWin.document.close();
        setTimeout(() => { try { newWin.focus(); newWin.print(); } catch (e) {} }, 500);

        mostrarConfirmacion('Éxito', 'Los resultados filtrados han sido preparados para impresión/PDF.');
      });
    }
    
    // Registrar actividad de filtro (no bloquear)
    authModel.registrarActividad({
      accion: 'consulta',
      descripcion: 'Filtro de actividades del sistema'
    }).catch(()=>{});
    
  } catch (error) {
    mostrarConfirmacion('Error', `Error al filtrar las actividades: ${error.message}`);
  }
}

// Funciones para generar estadísticas
export async function generarEstadisticasPersonalizadas(params) {
  try {
    const estadisticas = await reporteModel.getEstadisticasPersonalizadas(params);

    // Renderizar las estadísticas en la vista
    await renderEstadisticas(estadisticas);

    // Registrar actividad de generación de estadísticas
    authModel.registrarActividad({
      accion: 'consulta',
      descripcion: `Generación de estadísticas personalizadas (${params.periodo}, ${params.tipo})`
    }).catch(()=>{});

  } catch (error) {
    mostrarConfirmacion('Error', `Error al generar las estadísticas: ${error.message}`);
  }
}