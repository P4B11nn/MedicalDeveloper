// js/views/actividadView.js
// Vista para el registro de actividades

// Renderizar la lista de actividades
export function renderActividades(actividades, container) {
  if (!container) return;
  
  if (!actividades || actividades.length === 0) {
    container.innerHTML = `
      <div class="mensaje-info">
        No hay actividades que mostrar.
      </div>
    `;
    return;
  }
  
  // Crear tabla con las actividades
  let html = `
    <div class="tabla-container">
      <h3>Registro de Actividad</h3>
      <table class="tabla-actividades">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Acción</th>
            <th>Fecha y Hora</th>
            <th>Detalles</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  // Agregar filas con las actividades
  actividades.forEach(act => {
    // Formatear fecha adecuadamente
    let fechaFormateada = 'Fecha no disponible';
    try {
      if (act.fecha) {
        const fecha = new Date(act.fecha);
        if (!isNaN(fecha.getTime())) {
          fechaFormateada = fecha.toLocaleString();
        }
      }
    } catch (e) {
      console.error('Error al formatear fecha:', e);
    }
    
    // Determinar clase CSS para la acción
    let accionClass = '';
    switch (act.accion ? act.accion.toLowerCase() : '') {
      case 'login':
        accionClass = 'accion-login';
        break;
      case 'logout':
        accionClass = 'accion-logout';
        break;
      case 'create':
        accionClass = 'accion-create';
        break;
      case 'update':
        accionClass = 'accion-update';
        break;
      case 'delete':
        accionClass = 'accion-delete';
        break;
      default:
        accionClass = 'accion-default';
    }
    
    html += `
      <tr>
        <td>${act.usuario || 'Sistema'}</td>
        <td><span class="badge ${accionClass}">${act.accion || 'acción'}</span></td>
        <td>${fechaFormateada}</td>
        <td>${act.descripcion || '-'}</td>
      </tr>
    `;
  });
  
  html += `
        </tbody>
      </table>
      <div class="acciones">
        <button id="btnExportarActividades" class="btn-export">
          📥 Exportar a CSV
        </button>
      </div>
    </div>
  `;
  
  // Insertar HTML en el contenedor
  container.innerHTML = html;
  
  // Configurar botón de exportación
  const btnExportar = container.querySelector('#btnExportarActividades');
  if (btnExportar) {
    btnExportar.addEventListener('click', () => {
      // Importar el controlador dinámicamente para evitar dependencias circulares
      import('../controllers/actividadController.js').then(module => {
        module.exportarActividadesCSV(actividades);
      });
    });
  }
}

// Función para renderizar el modal de actividades
export function renderModalActividades(actividades) {
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';
  
  if (!actividades || actividades.length === 0) {
    modalContent.innerHTML = `
      <h2>Registro de Actividad</h2>
      <div class="mensaje-info">No hay actividades que mostrar.</div>
      <div class="modal-footer">
        <button class="btn-cerrar">Cerrar</button>
      </div>
    `;
    return modalContent;
  }
  
  let html = `
    <h2>Registro de Actividad</h2>
    <div class="tabla-container">
      <table class="tabla-actividades">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Acción</th>
            <th>Fecha y Hora</th>
            <th>Detalles</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  actividades.forEach(act => {
    // Formatear fecha adecuadamente
    let fechaFormateada = 'Fecha no disponible';
    try {
      if (act.fecha) {
        const fecha = new Date(act.fecha);
        if (!isNaN(fecha.getTime())) {
          fechaFormateada = fecha.toLocaleString();
        }
      }
    } catch (e) {
      console.error('Error al formatear fecha:', e);
    }
    
    // Determinar clase CSS para la acción
    let accionClass = '';
    switch (act.accion ? act.accion.toLowerCase() : '') {
      case 'login':
        accionClass = 'accion-login';
        break;
      case 'logout':
        accionClass = 'accion-logout';
        break;
      case 'create':
        accionClass = 'accion-create';
        break;
      case 'update':
        accionClass = 'accion-update';
        break;
      case 'delete':
        accionClass = 'accion-delete';
        break;
      default:
        accionClass = 'accion-default';
    }
    
    html += `
      <tr>
        <td>${act.usuario || 'Sistema'}</td>
        <td><span class="badge ${accionClass}">${act.accion || 'acción'}</span></td>
        <td>${fechaFormateada}</td>
        <td>${act.descripcion || '-'}</td>
      </tr>
    `;
  });
  
  html += `
        </tbody>
      </table>
    </div>
    <div class="modal-footer">
      <button id="btnExportarActividadesModal" class="btn-export">
        📥 Exportar a CSV
      </button>
      <button class="btn-cerrar">Cerrar</button>
    </div>
  `;
  
  modalContent.innerHTML = html;
  
  // Configurar botón de exportación
  const btnExportar = modalContent.querySelector('#btnExportarActividadesModal');
  if (btnExportar) {
    btnExportar.addEventListener('click', () => {
      // Importar el controlador dinámicamente para evitar dependencias circulares
      import('../controllers/actividadController.js').then(module => {
        module.exportarActividadesCSV(actividades);
      });
    });
  }
  
  return modalContent;
}