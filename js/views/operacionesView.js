// js/views/operacionesView.js
// Vista para la sección de operaciones y control

// Importamos el modelo para poder usar los métodos de exportación
import { authModel } from '../models/storageModel.js';

// Renderizar registro de entradas y salidas
export function renderRegistroEntradasSalidas(historial, container) {
  if (!container) return;
  
  if (historial.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: #6b7280; font-size: 1.1rem; padding: 20px;">
        No hay registros de entradas/salidas.
      </div>
    `;
  } else {
    // Crear tabla de registros con diseño mejorado
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
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${historial.map(s => `
            <tr>
              <td><strong>${s.nombre || 'Sin nombre'}</strong></td>
              <td>${s.matricula || '-'}</td>
              <td>${s.mesa || '-'}</td>
              <td>${s.rol === 'admin' ? 'Administrador' : 'Practicante'}</td>
              <td>${formatearFecha(s.entrada) || 'No registrada'}</td>
              <td>${formatearFecha(s.salida) || 'No registrada'}</td>
              <td>
                <button class="btn-export" onclick="exportarRegistro('${s.id || ''}', '${s.nombre || 'registro'}')">
                  📥 Exportar
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    
    // Añadir función de exportación al window para que esté disponible para los botones
    window.exportarRegistro = function(id, nombre) {
      const registro = historial.find(r => r.id === id);
      if (!registro) return;
      
      // Crear un objeto para exportar a CSV
      const csvData = [
        ['ID', 'Nombre', 'Matrícula', 'Mesa', 'Rol', 'Entrada', 'Salida'],
        [registro.id || '', registro.nombre || '', registro.matricula || '', registro.mesa || '', 
         registro.rol || '', formatearFecha(registro.entrada) || '', formatearFecha(registro.salida) || '']
      ];
      
      // Convertir a CSV
      const csv = csvData.map(row => row.map(item => `"${item}"`).join(',')).join('\n');
      
      // Crear un enlace de descarga
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `registro_${nombre.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
    
    // Añadir función de exportación total
    if (historial.length > 0) {
      container.insertAdjacentHTML('beforebegin', `
        <div style="text-align: right; margin-bottom: 15px;">
          <button id="btnExportarTodo" class="btn-export">
            📥 Exportar todo
          </button>
        </div>
      `);
      
      // Asignar evento al botón de exportación total
      setTimeout(() => {
        const btnExportarTodo = document.getElementById('btnExportarTodo');
        if (btnExportarTodo) {
          btnExportarTodo.addEventListener('click', function() {
            exportarTodo(historial);
          });
        }
      }, 0);
    }
  }
}

// Función para formatear fechas correctamente
function formatearFecha(fechaStr) {
  if (!fechaStr) return '';
  
  try {
    // Si la fecha ya tiene formato correcto, devolverla
    if (fechaStr.includes('/') && !fechaStr.includes('Invalid')) {
      return fechaStr;
    }
    
    // Intentar parsear la fecha
    const fecha = new Date(fechaStr);
    if (isNaN(fecha.getTime())) return fechaStr;
    
    // Formato: DD/MM/YYYY HH:MM:SS
    return fecha.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (e) {
    console.error('Error al formatear fecha:', e);
    return fechaStr || '';
  }
}

// Función para exportar todos los registros
function exportarTodo(historial) {
  if (!historial || historial.length === 0) return;
  
  // Crear cabecera
  const csvData = [['ID', 'Nombre', 'Matrícula', 'Mesa', 'Rol', 'Entrada', 'Salida']];
  
  // Agregar datos
  historial.forEach(registro => {
    csvData.push([
      registro.id || '',
      registro.nombre || '',
      registro.matricula || '',
      registro.mesa || '',
      registro.rol || '',
      formatearFecha(registro.entrada) || '',
      formatearFecha(registro.salida) || ''
    ]);
  });
  
  // Convertir a CSV
  const csv = csvData.map(row => row.map(item => `"${item}"`).join(',')).join('\n');
  
  // Crear enlace de descarga
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `registros_entradas_salidas_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Renderizar mesas de salud
export function renderMesasSalud(mesas, container) {
  if (!container) return;
  
  container.innerHTML = mesas.map(mesa => {
    let statusClass = mesa.estado;
    let statusText = '';
    
    switch (mesa.estado) {
      case 'en-servicio':
        statusText = 'En Servicio';
        break;
      case 'ocupada':
        statusText = 'Ocupada';
        break;
      case 'fuera-servicio':
        statusText = 'Fuera de servicio';
        break;
      default:
        statusText = 'En Servicio';
        statusClass = 'en-servicio';
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
          <button class="btn-accion" onclick="cambiarEstadoMesa(${mesa.numero}, '${mesa.estado}')">
            🔄 Cambiar estado
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  // Añadir función de cambio de estado al window
  window.cambiarEstadoMesa = function(numeroMesa, estadoActual) {
    let nuevoEstado = '';
    switch (estadoActual) {
      case 'en-servicio':
        nuevoEstado = 'ocupada';
        break;
      case 'ocupada':
        nuevoEstado = 'fuera-servicio';
        break;
      case 'fuera-servicio':
      default:
        nuevoEstado = 'en-servicio';
        break;
    }
    
    // Esto es solo para la UI - en una implementación real, se actualizaría en el modelo
    const mesaItem = document.querySelector(`.mesa-item:nth-child(${numeroMesa}) .mesa-status`);
    if (mesaItem) {
      mesaItem.className = `mesa-status ${nuevoEstado}`;
      mesaItem.textContent = nuevoEstado === 'en-servicio' ? 'En Servicio' : 
                            nuevoEstado === 'ocupada' ? 'Ocupada' : 'Fuera de servicio';
    }
  };
}