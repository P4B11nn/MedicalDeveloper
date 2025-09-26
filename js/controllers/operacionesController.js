// js/controllers/operacionesController.js
// Controller for operations and control section

import { getRegistroEntradasSalidas, getMesasSalud, getUsuarioActual } from '../models/operacionesModel.js';
import { renderRegistroEntradasSalidas, renderMesasSalud } from '../views/operationsView.js';
// Import auth model for activity logging
import { authModel } from '../models/storageModel.js';
import { renderActivities } from '../views/activityView.js';
import { crearModal, mostrarModal } from '../utils/modalUtil.js';

// Función de inicialización
export function initOperacionesController() {
  // Verificar restricciones de acceso
  const usuarioActual = getUsuarioActual();
  if (!usuarioActual || usuarioActual.rol !== 'admin') {
    // Los practicantes no tienen acceso a esta sección
    const nuevoParams = new URLSearchParams(window.location.search);
    if (nuevoParams.get('nombre')) nuevoParams.set('nombre', nuevoParams.get('nombre'));
    window.location.href = `categoria-pacientes.html?${nuevoParams.toString()}`;
    return;
  }

  // Mostrar nombre del usuario
  const userNameSpan = document.getElementById('userName');
  if (userNameSpan && usuarioActual.nombre) {
    userNameSpan.textContent = usuarioActual.nombre;
  }

  // Lógica del menú de usuario
  setupUserMenu();

  // Manejo de navegación lateral
  setupSidebarNavigation();
  
  // Activar automáticamente la sección de registro de entradas/salidas
  const registroESBtn = document.querySelector('[data-section="registro-entradas-salidas"]');
  if (registroESBtn) {
    registroESBtn.click();
  }
}

// Configuración del menú de usuario

// Obtener clase CSS para cada tipo de acción
function getAccionClass(accion) {
  if (!accion) return 'accion-default';
  
  const accionLower = accion.toLowerCase();
  
  if (accionLower.includes('login') || accionLower.includes('iniciar')) {
    return 'accion-login';
  } else if (accionLower.includes('logout') || accionLower.includes('cerrar')) {
    return 'accion-logout';
  } else if (accionLower.includes('crear') || accionLower.includes('nuevo') || accionLower.includes('agregar')) {
    return 'accion-create';
  } else if (accionLower.includes('actualizar') || accionLower.includes('modificar') || accionLower.includes('editar')) {
    return 'accion-update';
  } else if (accionLower.includes('eliminar') || accionLower.includes('borrar')) {
    return 'accion-delete';
  } else {
    return 'accion-default';
  }
}

// Obtener clase CSS para cada tipo de acción
function getAccionClass(accion) {
  if (!accion) return 'accion-default';
  
  const accionLower = accion.toLowerCase();
  
  if (accionLower.includes('login') || accionLower.includes('iniciar')) {
    return 'accion-login';
  } else if (accionLower.includes('logout') || accionLower.includes('cerrar')) {
    return 'accion-logout';
  } else if (accionLower.includes('crear') || accionLower.includes('nuevo') || accionLower.includes('agregar')) {
    return 'accion-create';
  } else if (accionLower.includes('actualizar') || accionLower.includes('modificar') || accionLower.includes('editar')) {
    return 'accion-update';
  } else if (accionLower.includes('eliminar') || accionLower.includes('borrar')) {
    return 'accion-delete';
  } else {
    return 'accion-default';
  }
}

// Exportar actividades a CSV
function exportarActividades(actividades) {
  if (!actividades || actividades.length === 0) return;
  
  // Crear cabecera
  const csvData = [['Usuario', 'Acción', 'Fecha y Hora', 'Detalles']];
  
  // Agregar datos
  actividades.forEach(a => {
    csvData.push([
      a.usuario || 'sistema',
      a.accion || '',
      formatearFecha(a.fecha) || '',
      a.detalles || ''
    ]);
  });
  
  // Convertir a CSV
  const csv = csvData.map(row => row.map(item => `"${item}"`).join(',')).join('\n');
  
  // Crear enlace de descarga
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `actividades_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function setupUserMenu() {
  const userIcon = document.getElementById('userIcon');
  const userDropdown = document.getElementById('userDropdown');
  const logoutBtn = document.getElementById('logoutBtn');
  const startServiceBtn = document.getElementById('startServiceBtn');
  const verActividadBtn = document.getElementById('verActividadBtn');
  
  if (userIcon && userDropdown) {
    userIcon.onclick = function(e) {
      userDropdown.style.display = userDropdown.style.display === 'none' ? 'block' : 'none';
      e.stopPropagation();
    };
    
    document.body.addEventListener('click', function() {
      userDropdown.style.display = 'none';
    });
  }
  
  if (logoutBtn) {
    logoutBtn.onclick = function() {
      // Cerrar servicio si está activo
      cerrarServicio();
      window.location.href = 'index.html';
    };
  }
  
  if (startServiceBtn) {
    actualizarBotonServicio();
    startServiceBtn.onclick = function() {
      toggleServicio();
    };
  }
  
  if (verActividadBtn) {
    verActividadBtn.onclick = function() {
      mostrarRegistroActividad();
    };
  }
}

// Función para mostrar el registro de actividad
function mostrarRegistroActividad() {
  const actividades = authModel.getActividades();
  
  // Crear modal si no existe
  if (!document.getElementById('modalActividad')) {
    const modal = document.createElement('div');
    modal.id = 'modalActividad';
    modal.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background: linear-gradient(135deg, rgba(125, 211, 252, 0.8), rgba(254, 243, 199, 0.8)), url(\'img/medical-background.png?v=1\') center center / cover no-repeat; z-index:3000; justify-content:center; align-items:center; overflow-y: auto;';
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = 'background: rgba(255, 255, 255, 0.98); padding: 30px; border-radius: 20px; min-width: 300px; max-width: 800px; max-height: 80vh; overflow-y: auto; box-shadow: 0 25px 60px rgba(0, 0, 0, 0.3); border: 2px solid rgba(125, 211, 252, 0.4); position: relative; margin: 40px auto;';
    
    const title = document.createElement('h3');
    title.style.cssText = 'margin: 0 0 25px 0; font-size: 1.8rem; font-weight: 700; text-align: center; color: transparent; background: linear-gradient(135deg, #06b6d4, #f59e0b); -webkit-background-clip: text; background-clip: text;';
    title.textContent = 'Registro de Actividad';
    
    const closeButton = document.createElement('button');
    closeButton.style.cssText = 'background: linear-gradient(135deg, #7dd3fc, #fef3c7); color: #1f2937; border: none; border-radius: 25px; padding: 12px 30px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(125, 211, 252, 0.2); margin: 20px auto 0; display: block;';
    closeButton.textContent = 'Cerrar';
    closeButton.onclick = () => { modal.style.display = 'none'; };
    
    const contentDiv = document.createElement('div');
    contentDiv.id = 'actividadesLista';
    
    modalContent.appendChild(title);
    modalContent.appendChild(contentDiv);
    modalContent.appendChild(closeButton);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
  }
  
  // Renderizar actividades manualmente en vez de usar la función importada
  const actividadesLista = document.getElementById('actividadesLista');
  if (!actividadesLista) return;
  
  if (actividades.length === 0) {
    actividadesLista.innerHTML = `
      <div style="text-align: center; color: #6b7280; font-size: 1.1rem; padding: 20px;">
        No hay registros de actividad.
      </div>
    `;
  } else {
    // Crear tabla de actividades
    let html = `
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
    
    // Agregar filas
    actividades.forEach(a => {
      const fechaFormateada = formatearFecha(a.fecha);
      const accionClass = getAccionClass(a.accion);
      
      html += `
        <tr>
          <td>${a.usuario || 'sistema'}</td>
          <td><span class="badge ${accionClass}">${a.accion || '-'}</span></td>
          <td>${fechaFormateada || '-'}</td>
          <td>${a.descripcion || '-'}</td>
        </tr>
      `;
    });
    
    html += `
        </tbody>
      </table>
      <div style="text-align: right; margin-top: 20px;">
        <button id="btnExportarActividades" class="btn-export">
          📥 Exportar actividades
        </button>
      </div>
    `;
    
    actividadesLista.innerHTML = html;
    
    // Agregar evento de exportación
    setTimeout(() => {
      const btnExportar = document.getElementById('btnExportarActividades');
      if (btnExportar) {
        btnExportar.addEventListener('click', () => {
          exportarActividades(actividades);
        });
      }
    }, 0);
  }
  
  // Mostrar modal
  const modalActividad = document.getElementById('modalActividad');
  modalActividad.style.display = 'flex';
}

// Configuración de la navegación lateral
function setupSidebarNavigation() {
  const sidebarButtons = document.querySelectorAll('.sidebar-menu button');
  const sections = document.querySelectorAll('.form-section');
  const defaultSection = document.getElementById('default-section');

  sidebarButtons.forEach(button => {
    button.addEventListener('click', function() {
      const targetSection = this.getAttribute('data-section');
      console.log(`Sección seleccionada: ${targetSection}`);
      
      // Remover clase active de todos los botones
      sidebarButtons.forEach(btn => btn.classList.remove('active'));
      // Agregar clase active al botón clickeado
      this.classList.add('active');
      
      // Ocultar sección por defecto
      if (defaultSection) {
        defaultSection.style.display = 'none';
      }
      
      // Ocultar todas las secciones
      sections.forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
      });
      
      // Mostrar sección seleccionada
      const activeSection = document.getElementById(`${targetSection}-section`);
      if (activeSection) {
        activeSection.classList.add('active');
        activeSection.style.display = 'block';
        
        // Cargar contenido específico según la sección
        if (targetSection === 'registro-entradas-salidas') {
          cargarRegistroEntradasSalidas();
        } else if (targetSection === 'mesas-salud') {
          cargarMesasSalud();
        }
      }
    });
  });
}

// Función para cargar registro de entradas y salidas
function cargarRegistroEntradasSalidas() {
  const registroESLista = document.getElementById('registroESLista');
  if (!registroESLista) return;
  
  // Configurar filtro de búsqueda
  const buscarRegistro = document.getElementById('buscarRegistro');
  const filtroRol = document.getElementById('filtroRol');
  
  if (buscarRegistro) {
    buscarRegistro.addEventListener('input', () => {
      aplicarFiltros();
    });
  }
  
  if (filtroRol) {
    filtroRol.addEventListener('change', () => {
      aplicarFiltros();
    });
  }
  
  // Configurar botón de exportar todo
  const btnExportarTodo = document.getElementById('btnExportarTodo');
  if (btnExportarTodo) {
    btnExportarTodo.addEventListener('click', () => {
      const historial = getRegistroEntradasSalidas();
      exportarRegistrosTodos(historial);
    });
  }
  
  // Cargar datos iniciales
  aplicarFiltros();
}

// Función para aplicar filtros de búsqueda y rol
function aplicarFiltros() {
  const registroESLista = document.getElementById('registroESLista');
  const buscarRegistro = document.getElementById('buscarRegistro');
  const filtroRol = document.getElementById('filtroRol');
  
  if (!registroESLista) return;
  
  let historial = getRegistroEntradasSalidas();
  
  // Aplicar filtro de búsqueda
  if (buscarRegistro && buscarRegistro.value) {
    const busqueda = buscarRegistro.value.toLowerCase();
    historial = historial.filter(item => 
      (item.nombre && item.nombre.toLowerCase().includes(busqueda)) ||
      (item.matricula && item.matricula.toLowerCase().includes(busqueda))
    );
  }
  
  // Aplicar filtro de rol
  if (filtroRol && filtroRol.value) {
    historial = historial.filter(item => item.rol === filtroRol.value);
  }
  
  renderRegistroEntradasSalidas(historial, registroESLista);
}

// Exportar todos los registros de entradas y salidas
function exportarRegistrosTodos(historial) {
  if (!historial || historial.length === 0) {
    alert('No hay registros para exportar');
    return;
  }
  
  // Crear cabecera del CSV
  const headers = ['Usuario', 'Matrícula', 'Mesa', 'Rol', 'Entrada', 'Salida'];
  
  // Preparar datos
  const data = [headers];
  
  historial.forEach(reg => {
    data.push([
      reg.nombre || '',
      reg.matricula || '',
      reg.mesa || '',
      reg.rol === 'admin' ? 'Administrador' : 'Practicante',
      formatearFecha(reg.entrada) || '',
      formatearFecha(reg.salida) || ''
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
  link.setAttribute('download', `registro_entradas_salidas_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Función para cargar mesas de salud
function cargarMesasSalud() {
  const mesasGrid = document.getElementById('mesasGrid');
  if (!mesasGrid) return;
  
  const mesas = getMesasSalud();
  renderMesasSalud(mesas, mesasGrid);
}

// Gestión de servicio
function toggleServicio() {
  let servicioActivo = false;
  try {
    const servicioData = JSON.parse(localStorage.getItem('servicioActual'));
    if (servicioData && servicioData.salida === '') {
      servicioActivo = true;
    }
  } catch (e) {}
  
  if (!servicioActivo) {
    iniciarServicio();
  } else {
    cerrarServicio();
  }
}

function iniciarServicio() {
  const usuarioActual = getUsuarioActual();
  if (!usuarioActual) return;
  
  const nuevoServicio = {
    id: usuarioActual.id || '',
    nombre: usuarioActual.nombre || '',
    matricula: usuarioActual.matricula || '',
    mesa: usuarioActual.mesa || '',
    entrada: getFechaHora(),
    salida: '',
    rol: usuarioActual.rol || ''
  };
  localStorage.setItem('servicioActual', JSON.stringify(nuevoServicio));
  actualizarBotonServicio();
}

function cerrarServicio() {
  let servicio = null;
  try {
    servicio = JSON.parse(localStorage.getItem('servicioActual'));
  } catch (e) {}
  
  if (servicio) {
    servicio.salida = getFechaHora();
    localStorage.setItem('servicioActual', JSON.stringify(servicio));
    // Guardar en historial
    let historial = [];
    try {
      historial = JSON.parse(localStorage.getItem('servicioHistorial')) || [];
    } catch (e) {}
    historial.push(servicio);
    localStorage.setItem('servicioHistorial', JSON.stringify(historial));
    localStorage.removeItem('servicioActual');
  }
  actualizarBotonServicio();
}

function actualizarBotonServicio() {
  const startServiceBtn = document.getElementById('startServiceBtn');
  if (!startServiceBtn) return;
  
  let servicioActivo = false;
  try {
    const servicioData = JSON.parse(localStorage.getItem('servicioActual'));
    if (servicioData && servicioData.salida === '') {
      servicioActivo = true;
    }
  } catch (e) {}
  
  startServiceBtn.textContent = servicioActivo ? 'Cerrar servicio' : 'Iniciar servicio';
}

function getFechaHora() {
  const now = new Date();
  return now.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
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

// Iniciar manualmente al cargar (esta línea se debe quitar si se utiliza importación en el HTML)
// document.addEventListener('DOMContentLoaded', initOperacionesController);