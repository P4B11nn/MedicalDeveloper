// js/views/activityView.js
// View for activity logging

import { authModel } from '../models/storageModel.js';
import { insertActivityStyles } from '../utils/domCheck.js';

/**
 * Render the activity log in the specified container
 * @param {string} containerId - The ID of the container element
 */
export function renderActivityLog(containerId) {
  console.log('Rendering activity log in:', containerId);
  
  // Get activities from storage
  const activities = authModel.getActividades();
  console.log('Activities loaded:', activities.length);
  
  // Get container element
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('Container not found:', containerId);
    return;
  }
  
  // Insert CSS styles for activity log
  insertActivityStylesInternal();
  
  // Handle empty activities list
  if (!activities || activities.length === 0) {
    container.innerHTML = `
      <div class="info-message" style="background-color:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:20px; text-align:center; color:#6b7280;">
        No hay actividades para mostrar.
      </div>
    `;
    return;
  }
  
  // Create HTML for activities table
  let html = `
    <div class="table-container" style="width:100%; overflow-x:auto; margin-bottom:20px;">
      <table class="activities-table" style="width:100%; border-collapse:collapse; margin-bottom:20px; background-color:white; box-shadow:0 4px 8px rgba(0,0,0,0.1); border-radius:8px; overflow:hidden;">
        <thead>
          <tr>
            <th style="padding:12px 15px; text-align:left; border-bottom:1px solid #e5e7eb; background-color:#f9fafb; color:#374151; font-weight:600;">Usuario</th>
            <th style="padding:12px 15px; text-align:left; border-bottom:1px solid #e5e7eb; background-color:#f9fafb; color:#374151; font-weight:600;">Acción</th>
            <th style="padding:12px 15px; text-align:left; border-bottom:1px solid #e5e7eb; background-color:#f9fafb; color:#374151; font-weight:600;">Fecha y Hora</th>
            <th style="padding:12px 15px; text-align:left; border-bottom:1px solid #e5e7eb; background-color:#f9fafb; color:#374151; font-weight:600;">Detalles</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  // Add activities in reverse order (newest first)
  activities.slice().reverse().forEach(act => {
    // Format date properly
    let formattedDate = 'Fecha no disponible';
    try {
      if (act.fecha) {
        const date = new Date(act.fecha);
        if (!isNaN(date.getTime())) {
          formattedDate = date.toLocaleString('es-MX');
        }
      }
    } catch (e) {
      console.error('Error formatting date:', e);
    }
    
    // Determine CSS class for action
    let actionClass = '';
    switch (act.accion ? act.accion.toLowerCase() : '') {
      case 'login':
        actionClass = 'action-login';
        break;
      case 'logout':
        actionClass = 'action-logout';
        break;
      case 'create':
      case 'crear':
        actionClass = 'action-create';
        break;
      case 'update':
      case 'actualizar':
        actionClass = 'action-update';
        break;
      case 'delete':
      case 'eliminar':
        actionClass = 'action-delete';
        break;
      case 'view':
      case 'ver':
        actionClass = 'action-view';
        break;
      case 'menu':
        actionClass = 'action-menu';
        break;
      case 'navigate':
      case 'navegar':
        actionClass = 'action-navigate';
        break;
      default:
        actionClass = 'action-default';
    }
    
    // Create row with activity information
    html += `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:12px 15px; text-align:left; border-bottom:1px solid #e5e7eb;">${act.usuario || 'Sistema'}</td>
        <td style="padding:12px 15px; text-align:left; border-bottom:1px solid #e5e7eb;">
          <span style="display:inline-block; padding:5px 10px; border-radius:15px; font-size:0.8rem; font-weight:600;" 
                class="${actionClass}">${act.accion || 'acción'}</span>
        </td>
        <td style="padding:12px 15px; text-align:left; border-bottom:1px solid #e5e7eb;">${formattedDate}</td>
        <td style="padding:12px 15px; text-align:left; border-bottom:1px solid #e5e7eb;">${act.descripcion || '-'}</td>
      </tr>
    `;
  });
  
  // Close HTML table
  html += `
        </tbody>
      </table>
    </div>
  `;
  
  // Insert HTML into container
  container.innerHTML = html;
}

/**
 * Insert dynamic CSS styles for activity log
 */
function insertActivityStylesInternal() {
  // If styles already exist, don't add again
  if (document.getElementById('activity-styles')) {
    return;
  }
  
  const style = document.createElement('style');
  style.id = 'activity-styles';
  style.innerHTML = `
    /* Activity log styles */
    .action-login {
      background-color: #c7d2fe;
      color: #4338ca;
    }

    .action-logout {
      background-color: #e5e7eb;
      color: #4b5563;
    }

    .action-create {
      background-color: #a7f3d0;
      color: #047857;
    }

    .action-update {
      background-color: #bae6fd;
      color: #0369a1;
    }

    .action-delete {
      background-color: #fecaca;
      color: #b91c1c;
    }
    
    .action-view {
      background-color: #ddd6fe;
      color: #5b21b6;
    }

    .action-navigate {
      background-color: #fde68a;
      color: #92400e;
    }
    
    .action-menu {
      background-color: #c4b5fd;
      color: #6d28d9;
    }

    .action-default {
      background-color: #e5e7eb;
      color: #4b5563;
    }
  `;
  
  document.head.appendChild(style);
}