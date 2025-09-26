// js/controllers/actividadController.js
// Controlador para el registro de actividades

import { authModel } from '../models/storageModel.js';
import { renderActividades } from '../views/actividadView.js';

// Función para mostrar actividades del sistema
export function mostrarActividades(container, filtro = {}) {
  if (!container) return;
  
  // Obtener actividades con los filtros aplicados
  const actividades = authModel.getActividades(filtro);
  
  // Pasar las actividades a la vista para su renderizado
  renderActividades(actividades, container);
}

// Función para exportar actividades a CSV
export function exportarActividadesCSV(actividades) {
  if (!actividades || actividades.length === 0) {
    alert('No hay actividades para exportar.');
    return;
  }
  
  // Crear cabeceras
  const headers = ['Usuario', 'Acción', 'Fecha y Hora', 'Detalles'];
  
  // Preparar datos
  const data = [headers];
  
  actividades.forEach(act => {
    // Formatear fecha adecuadamente
    let fechaFormateada = 'Fecha no disponible';
    try {
      // Intentar crear un objeto Date válido
      if (act.fecha) {
        const fecha = new Date(act.fecha);
        if (!isNaN(fecha.getTime())) {
          fechaFormateada = fecha.toLocaleString();
        }
      }
    } catch (e) {
      console.error('Error al formatear fecha:', e);
    }
    
    data.push([
      act.usuario || 'Sistema',
      act.accion || '-',
      fechaFormateada,
      act.descripcion || '-'
    ]);
  });
  
  // Convertir a CSV
  const csv = data.map(row => 
    row.map(cell => typeof cell === 'string' ? `"${cell.replace(/"/g, '""')}"` : `"${cell}"`)
    .join(',')
  ).join('\n');
  
  // Crear un enlace de descarga
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `actividades_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}