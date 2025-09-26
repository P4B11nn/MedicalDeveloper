// js/views/operacionesView.js

/**
 * Renderiza la tabla con el historial de entradas y salidas.
 * @param {Array} historial - Los datos del historial a mostrar.
 * @param {HTMLElement} container - El elemento <div> donde se insertará la tabla.
 */
export function renderRegistroEntradasSalidas(historial, container) {
  if (!container) return;

  if (!historial || historial.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: #6b7280; font-size: 1.1rem; padding: 20px;">
        No hay registros que coincidan con los filtros.
      </div>
    `;
    return;
  }

  // Crea la tabla de registros.
  container.innerHTML = `
    <table class="tabla-registros">
      <thead>
        <tr>
          <th>Usuario</th>
          <th>Matrícula</th>
          <th>Mesa</th>
          <th>Rol</th>
          <th>Entrada</th>
          <th>Salida</th>
        </tr>
      </thead>
      <tbody>
        ${historial.map(s => `
          <tr>
            <td><strong>${s.nombre || 'N/A'}</strong></td>
            <td>${s.matricula || '-'}</td>
            <td>${s.mesa || '-'}</td>
            <td>${s.rol === 'admin' ? 'Administrador' : 'Practicante'}</td>
            <td>${s.entrada || 'No registrada'}</td>
            <td>${s.salida || 'No registrada'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

/**
 * Renderiza las tarjetas con el estado de las mesas de salud.
 * @param {Array} mesas - Los datos de las mesas a mostrar.
 * @param {HTMLElement} container - El elemento <div> donde se insertarán las tarjetas.
 */
export function renderMesasSalud(mesas, container) {
  if (!container) return;

  if (!mesas || mesas.length === 0) {
    container.innerHTML = `<p class="welcome-message">No hay mesas configuradas.</p>`;
    return;
  }

  container.innerHTML = mesas.map(mesa => {
    let statusClass = mesa.estado;
    let statusText = '';

    switch (mesa.estado) {
      case 'en-servicio': statusText = 'En Servicio'; break;
      case 'ocupada': statusText = 'Ocupada'; break;
      case 'fuera-servicio': statusText = 'Fuera de servicio'; break;
      default: statusText = 'Desconocido';
    }

    return `
      <div class="mesa-item">
        <div class="mesa-numero">Mesa ${mesa.numero}</div>
        <div class="mesa-status ${statusClass}">${statusText}</div>
        <div class="mesa-info">
          ${mesa.asignado ? `
            <p><strong>Asignado a:</strong> ${mesa.asignado.nombre} ${mesa.asignado.apellidos || ''}</p>
            <p><strong>Rol:</strong> ${mesa.asignado.rol === 'admin' ? 'Administrador' : 'Practicante'}</p>
          ` : '<p><strong>Sin asignar</strong></p>'}
          ${mesa.ultimaActividad ? `
            <p><strong>Última actividad:</strong> ${mesa.ultimaActividad}</p>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}