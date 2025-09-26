// js/views/pacienteView.js
import { pacienteModel } from '../models/pacienteModel.js';
import { authModel } from '../models/storageModel.js';

// Función auxiliar para formatear fechas
function formatearFecha(fecha) {
  if (!fecha) return '';
  const date = new Date(fecha);
  return isNaN(date) ? fecha : date.toLocaleDateString('es-MX');
}

// Función para renderizar la tabla de pacientes
export function renderHistorialMedico() {
  const section = document.getElementById('historial-section');
  if (!section) return;
  
  const pacientes = pacienteModel.getAllPacientes();
  
  let html = `
    <div class="section-header">
      <h2>Historial de Pacientes</h2>
      <div class="search-container">
        <input type="text" id="buscarPaciente" placeholder="Buscar paciente..." class="search-input">
      </div>
    </div>
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Edad</th>
            <th>Género</th>
            <th>Teléfono</th>
            <th>Última consulta</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="tablaPacientes">
  `;
  
  if (pacientes.length === 0) {
    html += `
      <tr>
        <td colspan="7" class="text-center">No hay pacientes registrados</td>
      </tr>
    `;
  } else {
    pacientes.forEach(paciente => {
      // Calcular edad
      const edad = calcularEdad(paciente.fechaNacimiento);
      
      // Obtener última consulta
      const historiales = pacienteModel.getHistorialByPacienteId(paciente.id) || [];
      const ultimaConsulta = historiales.length > 0 
        ? formatearFecha(historiales[historiales.length - 1].fecha)
        : 'Sin consultas';
      
      html += `
        <tr>
          <td>${paciente.id}</td>
          <td>${paciente.nombre} ${paciente.apellidos}</td>
          <td>${edad} años</td>
          <td>${paciente.genero}</td>
          <td>${paciente.telefono}</td>
          <td>${ultimaConsulta}</td>
          <td>
            <button class="btn-icon ver-historial" data-id="${paciente.id}" title="Ver historial médico">
              <i class="fas fa-file-medical"></i>
            </button>
            <button class="btn-icon editar-paciente" data-id="${paciente.id}" title="Editar paciente">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn-icon agendar-cita" data-id="${paciente.id}" title="Agendar cita">
              <i class="fas fa-calendar-plus"></i>
            </button>
          </td>
        </tr>
      `;
    });
  }
  
  html += `
        </tbody>
      </table>
    </div>
    
    <!-- Modal para ver historial médico -->
    <div id="modalHistorialMedico" class="modal">
      <div class="modal-content">
        <span class="close-modal">&times;</span>
        <h3 id="modalHistorialTitulo">Historial Médico</h3>
        <div id="modalHistorialContenido" class="modal-body">
          <!-- Se llena dinámicamente -->
        </div>
        <div class="modal-footer">
          <button id="btnCerrarHistorial" class="btn-secondary">Cerrar</button>
          <button id="btnNuevoRegistro" class="btn-primary">Nuevo registro</button>
        </div>
      </div>
    </div>
    
    <!-- Modal para nuevo registro en historial -->
    <div id="modalNuevoRegistro" class="modal">
      <div class="modal-content">
        <span class="close-modal">&times;</span>
        <h3>Nuevo Registro Médico</h3>
        <form id="formNuevoRegistro">
          <input type="hidden" id="pacienteIdHistorial" name="pacienteId">
          <div class="form-group">
            <label for="fechaHistorial">Fecha:</label>
            <input type="date" id="fechaHistorial" name="fecha" required>
          </div>
          <div class="form-group">
            <label for="diagnosticoHistorial">Diagnóstico:</label>
            <textarea id="diagnosticoHistorial" name="diagnostico" rows="3" required></textarea>
          </div>
          <div class="form-group">
            <label for="tratamientoHistorial">Tratamiento:</label>
            <textarea id="tratamientoHistorial" name="tratamiento" rows="3" required></textarea>
          </div>
          <div class="form-group">
            <label for="observacionesHistorial">Observaciones:</label>
            <textarea id="observacionesHistorial" name="observaciones" rows="3"></textarea>
          </div>
          <div class="modal-footer">
            <button type="button" id="btnCancelarRegistro" class="btn-secondary">Cancelar</button>
            <button type="submit" class="btn-primary">Guardar</button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Modal para editar paciente -->
    <div id="modalEditarPaciente" class="modal">
      <div class="modal-content">
        <span class="close-modal">&times;</span>
        <h3>Editar Paciente</h3>
        <form id="formEditarPaciente">
          <input type="hidden" id="editPacienteId" name="id">
          <div class="form-group">
            <label for="editNombre">Nombre:</label>
            <input type="text" id="editNombre" name="nombre" required>
          </div>
          <div class="form-group">
            <label for="editApellidos">Apellidos:</label>
            <input type="text" id="editApellidos" name="apellidos" required>
          </div>
          <div class="form-group">
            <label for="editFechaNacimiento">Fecha de Nacimiento:</label>
            <input type="date" id="editFechaNacimiento" name="fechaNacimiento" required>
          </div>
          <div class="form-group">
            <label>Género:</label>
            <div class="radio-group">
              <label>
                <input type="radio" name="genero" value="Masculino"> Masculino
              </label>
              <label>
                <input type="radio" name="genero" value="Femenino"> Femenino
              </label>
            </div>
          </div>
          <div class="form-group">
            <label for="editTelefono">Teléfono:</label>
            <input type="tel" id="editTelefono" name="telefono" required>
          </div>
          <div class="form-group">
            <label for="editCorreo">Correo (opcional):</label>
            <input type="email" id="editCorreo" name="correo">
          </div>
          <div class="form-group">
            <label for="editDomicilio">Domicilio (opcional):</label>
            <textarea id="editDomicilio" name="domicilio" rows="2"></textarea>
          </div>
          <div class="modal-footer">
            <button type="button" id="btnCancelarEdicion" class="btn-secondary">Cancelar</button>
            <button type="submit" class="btn-primary">Guardar Cambios</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  section.innerHTML = html;
  
  // Configurar eventos para los botones de la tabla
  configurarEventosPacientes();
}

// Función para renderizar el formulario de nuevo paciente
export function renderPacienteForm() {
  const section = document.getElementById('nuevo-paciente-section');
  if (!section) return;
  
  const html = `
    <div class="section-header">
      <h2>Registro de Nuevo Paciente</h2>
    </div>
    <form id="formNuevoPaciente" class="form-container">
      <div class="form-row">
        <div class="form-group col-md-6">
          <label for="nombre">Nombre(s):</label>
          <input type="text" id="nombre" name="nombre" required>
        </div>
        <div class="form-group col-md-6">
          <label for="apellidos">Apellidos:</label>
          <input type="text" id="apellidos" name="apellidos" required>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group col-md-6">
          <label for="fechaNacimiento">Fecha de Nacimiento:</label>
          <input type="date" id="fechaNacimiento" name="fechaNacimiento" required>
        </div>
        <div class="form-group col-md-6">
          <label>Género:</label>
          <div class="radio-group">
            <label>
              <input type="radio" name="genero" value="Masculino" required> Masculino
            </label>
            <label>
              <input type="radio" name="genero" value="Femenino" required> Femenino
            </label>
          </div>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group col-md-6">
          <label for="telefono">Teléfono:</label>
          <input type="tel" id="telefono" name="telefono" required>
        </div>
        <div class="form-group col-md-6">
          <label for="correo">Correo (opcional):</label>
          <input type="email" id="correo" name="correo">
        </div>
      </div>
      
      <div class="form-group">
        <label for="domicilio">Domicilio (opcional):</label>
        <textarea id="domicilio" name="domicilio" rows="2"></textarea>
      </div>
      
      <div class="form-row">
        <div class="form-group col-md-12">
          <label for="alergias">Alergias (opcional):</label>
          <textarea id="alergias" name="alergias" rows="2"></textarea>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group col-md-12">
          <label for="antecedentes">Antecedentes Médicos (opcional):</label>
          <textarea id="antecedentes" name="antecedentes" rows="3"></textarea>
        </div>
      </div>
      
      <div class="form-actions">
        <button type="reset" class="btn-secondary">Limpiar</button>
        <button type="submit" class="btn-primary">Registrar Paciente</button>
      </div>
    </form>
  `;
  
  section.innerHTML = html;
  
  // Configurar el evento de envío del formulario
  const formNuevoPaciente = document.getElementById('formNuevoPaciente');
  if (formNuevoPaciente) {
    formNuevoPaciente.addEventListener('submit', event => {
      // Importar el controlador dinámicamente para evitar dependencias circulares
      import('../controllers/pacienteController.js').then(module => {
        module.handlePacienteSubmit(event);
      });
    });
  }
}

// Función para renderizar la sección de citas
export function renderCitas() {
  const section = document.getElementById('citas-section');
  if (!section) return;
  
  const pacientes = pacienteModel.getAllPacientes();
  const citas = pacienteModel.getAllCitas();
  
  let html = `
    <div class="section-header">
      <h2>Gestión de Citas</h2>
      <button id="btnNuevaCita" class="btn-primary"><i class="fas fa-plus"></i> Nueva Cita</button>
    </div>
    
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Hora</th>
            <th>Paciente</th>
            <th>Motivo</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="tablaCitas">
  `;
  
  if (citas.length === 0) {
    html += `
      <tr>
        <td colspan="6" class="text-center">No hay citas agendadas</td>
      </tr>
    `;
  } else {
    citas.sort((a, b) => new Date(a.fecha) - new Date(b.fecha)).forEach(cita => {
      const paciente = pacienteModel.getPacienteById(cita.pacienteId);
      const fechaFormateada = formatearFecha(cita.fecha);
      const hora = cita.hora || '00:00';
      const nombreCompleto = paciente ? `${paciente.nombre} ${paciente.apellidos}` : 'Paciente no encontrado';
      
      html += `
        <tr class="${cita.estado === 'Completada' ? 'completed-row' : cita.estado === 'Cancelada' ? 'cancelled-row' : ''}">
          <td>${fechaFormateada}</td>
          <td>${hora}</td>
          <td>${nombreCompleto}</td>
          <td>${cita.motivo}</td>
          <td><span class="badge ${cita.estado === 'Pendiente' ? 'badge-warning' : cita.estado === 'Completada' ? 'badge-success' : 'badge-danger'}">${cita.estado}</span></td>
          <td>
            <button class="btn-icon ver-cita" data-id="${cita.id}" title="Ver detalles">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn-icon cambiar-estado" data-id="${cita.id}" title="Cambiar estado">
              <i class="fas fa-exchange-alt"></i>
            </button>
          </td>
        </tr>
      `;
    });
  }
  
  html += `
        </tbody>
      </table>
    </div>
    
    <!-- Modal para nueva cita -->
    <div id="modalNuevaCita" class="modal">
      <div class="modal-content">
        <span class="close-modal">&times;</span>
        <h3>Agendar Nueva Cita</h3>
        <form id="formNuevaCita">
          <div class="form-group">
            <label for="pacienteId">Paciente:</label>
            <select id="pacienteId" name="pacienteId" required>
              <option value="">Seleccione un paciente</option>
              ${pacientes.map(p => `<option value="${p.id}">${p.nombre} ${p.apellidos}</option>`).join('')}
            </select>
          </div>
          <div class="form-row">
            <div class="form-group col-md-6">
              <label for="fechaCita">Fecha:</label>
              <input type="date" id="fechaCita" name="fecha" required>
            </div>
            <div class="form-group col-md-6">
              <label for="horaCita">Hora:</label>
              <input type="time" id="horaCita" name="hora" required>
            </div>
          </div>
          <div class="form-group">
            <label for="motivoCita">Motivo:</label>
            <textarea id="motivoCita" name="motivo" rows="3" required></textarea>
          </div>
          <div class="form-group">
            <label for="observacionesCita">Observaciones:</label>
            <textarea id="observacionesCita" name="observaciones" rows="3"></textarea>
          </div>
          <div class="modal-footer">
            <button type="button" id="btnCancelarCita" class="btn-secondary">Cancelar</button>
            <button type="submit" class="btn-primary">Agendar</button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Modal para ver detalles de cita -->
    <div id="modalDetalleCita" class="modal">
      <div class="modal-content">
        <span class="close-modal">&times;</span>
        <h3>Detalles de la Cita</h3>
        <div id="contenidoDetalleCita" class="modal-body">
          <!-- Se llena dinámicamente -->
        </div>
        <div class="modal-footer">
          <button id="btnCerrarDetalleCita" class="btn-secondary">Cerrar</button>
        </div>
      </div>
    </div>
    
    <!-- Modal para cambiar estado de cita -->
    <div id="modalEstadoCita" class="modal">
      <div class="modal-content">
        <span class="close-modal">&times;</span>
        <h3>Cambiar Estado de la Cita</h3>
        <form id="formEstadoCita">
          <input type="hidden" id="citaId" name="citaId">
          <div class="form-group">
            <label for="estadoCita">Nuevo estado:</label>
            <select id="estadoCita" name="estado" required>
              <option value="Pendiente">Pendiente</option>
              <option value="Completada">Completada</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>
          <div class="form-group">
            <label for="notaEstado">Nota (opcional):</label>
            <textarea id="notaEstado" name="nota" rows="3"></textarea>
          </div>
          <div class="modal-footer">
            <button type="button" id="btnCancelarEstado" class="btn-secondary">Cancelar</button>
            <button type="submit" class="btn-primary">Guardar Cambios</button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  section.innerHTML = html;
  
  // Configurar eventos para los botones
  configurarEventosCitas();
}

// Funciones auxiliares

function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return 'N/A';
  
  const hoy = new Date();
  const fechaNac = new Date(fechaNacimiento);
  
  if (isNaN(fechaNac)) return 'N/A';
  
  let edad = hoy.getFullYear() - fechaNac.getFullYear();
  const m = hoy.getMonth() - fechaNac.getMonth();
  
  if (m < 0 || (m === 0 && hoy.getDate() < fechaNac.getDate())) {
    edad--;
  }
  
  return edad;
}

function configurarEventosPacientes() {
  // Configurar evento de búsqueda
  const inputBuscar = document.getElementById('buscarPaciente');
  if (inputBuscar) {
    inputBuscar.addEventListener('input', event => {
      const valor = event.target.value.toLowerCase();
      const filas = document.querySelectorAll('#tablaPacientes tr');
      
      filas.forEach(fila => {
        const contenido = fila.textContent.toLowerCase();
        fila.style.display = contenido.includes(valor) ? '' : 'none';
      });
    });
  }
  
  // Eventos para ver historial médico
  document.querySelectorAll('.ver-historial').forEach(btn => {
    btn.addEventListener('click', () => {
      const pacienteId = btn.getAttribute('data-id');
      mostrarHistorialMedico(pacienteId);
    });
  });
  
  // Eventos para editar paciente
  document.querySelectorAll('.editar-paciente').forEach(btn => {
    btn.addEventListener('click', () => {
      const pacienteId = btn.getAttribute('data-id');
      mostrarFormularioEditarPaciente(pacienteId);
    });
  });
  
  // Eventos para agendar cita
  document.querySelectorAll('.agendar-cita').forEach(btn => {
    btn.addEventListener('click', () => {
      const pacienteId = btn.getAttribute('data-id');
      mostrarFormularioNuevaCita(pacienteId);
    });
  });
  
  // Configurar modal de historial
  const modalHistorial = document.getElementById('modalHistorialMedico');
  const btnCerrarHistorial = document.getElementById('btnCerrarHistorial');
  const btnNuevoRegistro = document.getElementById('btnNuevoRegistro');
  
  if (modalHistorial && btnCerrarHistorial && btnNuevoRegistro) {
    // Cerrar modal
    document.querySelectorAll('#modalHistorialMedico .close-modal, #btnCerrarHistorial').forEach(elem => {
      elem.addEventListener('click', () => {
        modalHistorial.style.display = 'none';
      });
    });
    
    // Abrir modal de nuevo registro
    btnNuevoRegistro.addEventListener('click', () => {
      const pacienteId = btnNuevoRegistro.getAttribute('data-paciente-id');
      if (pacienteId) {
        modalHistorial.style.display = 'none';
        mostrarFormularioNuevoRegistro(pacienteId);
      }
    });
  }
  
  // Configurar modal de nuevo registro
  const modalNuevoRegistro = document.getElementById('modalNuevoRegistro');
  const btnCancelarRegistro = document.getElementById('btnCancelarRegistro');
  const formNuevoRegistro = document.getElementById('formNuevoRegistro');
  
  if (modalNuevoRegistro && btnCancelarRegistro && formNuevoRegistro) {
    // Cerrar modal
    document.querySelectorAll('#modalNuevoRegistro .close-modal, #btnCancelarRegistro').forEach(elem => {
      elem.addEventListener('click', () => {
        modalNuevoRegistro.style.display = 'none';
      });
    });
    
    // Configurar envío del formulario
    formNuevoRegistro.addEventListener('submit', event => {
      // Importar el controlador dinámicamente para evitar dependencias circulares
      import('../controllers/pacienteController.js').then(module => {
        module.handleHistorialSubmit(event);
      });
    });
  }
  
  // Configurar modal de editar paciente
  const modalEditarPaciente = document.getElementById('modalEditarPaciente');
  const btnCancelarEdicion = document.getElementById('btnCancelarEdicion');
  const formEditarPaciente = document.getElementById('formEditarPaciente');
  
  if (modalEditarPaciente && btnCancelarEdicion && formEditarPaciente) {
    // Cerrar modal
    document.querySelectorAll('#modalEditarPaciente .close-modal, #btnCancelarEdicion').forEach(elem => {
      elem.addEventListener('click', () => {
        modalEditarPaciente.style.display = 'none';
      });
    });
    
    // Configurar envío del formulario
    formEditarPaciente.addEventListener('submit', event => {
      event.preventDefault();
      
      const formData = new FormData(formEditarPaciente);
      const pacienteData = Object.fromEntries(formData.entries());
      
      const resultado = pacienteModel.updatePaciente(pacienteData);
      
      if (resultado.success) {
        // Mostrar mensaje de éxito
        modalEditarPaciente.style.display = 'none';
        
        // Recargar la vista
        renderHistorialMedico();
      } else {
        // Mostrar error
        alert(resultado.message);
      }
    });
  }
}

function configurarEventosCitas() {
  // Configurar botón de nueva cita
  const btnNuevaCita = document.getElementById('btnNuevaCita');
  if (btnNuevaCita) {
    btnNuevaCita.addEventListener('click', () => {
      mostrarFormularioNuevaCita();
    });
  }
  
  // Configurar modal de nueva cita
  const modalNuevaCita = document.getElementById('modalNuevaCita');
  const btnCancelarCita = document.getElementById('btnCancelarCita');
  const formNuevaCita = document.getElementById('formNuevaCita');
  
  if (modalNuevaCita && btnCancelarCita && formNuevaCita) {
    // Cerrar modal
    document.querySelectorAll('#modalNuevaCita .close-modal, #btnCancelarCita').forEach(elem => {
      elem.addEventListener('click', () => {
        modalNuevaCita.style.display = 'none';
      });
    });
    
    // Configurar envío del formulario
    formNuevaCita.addEventListener('submit', event => {
      // Importar el controlador dinámicamente para evitar dependencias circulares
      import('../controllers/pacienteController.js').then(module => {
        module.handleCitaSubmit(event);
      });
    });
  }
  
  // Eventos para ver detalles de cita
  document.querySelectorAll('.ver-cita').forEach(btn => {
    btn.addEventListener('click', () => {
      const citaId = btn.getAttribute('data-id');
      mostrarDetalleCita(citaId);
    });
  });
  
  // Eventos para cambiar estado de cita
  document.querySelectorAll('.cambiar-estado').forEach(btn => {
    btn.addEventListener('click', () => {
      const citaId = btn.getAttribute('data-id');
      mostrarFormularioCambiarEstado(citaId);
    });
  });
  
  // Configurar modal de detalle de cita
  const modalDetalleCita = document.getElementById('modalDetalleCita');
  const btnCerrarDetalleCita = document.getElementById('btnCerrarDetalleCita');
  
  if (modalDetalleCita && btnCerrarDetalleCita) {
    // Cerrar modal
    document.querySelectorAll('#modalDetalleCita .close-modal, #btnCerrarDetalleCita').forEach(elem => {
      elem.addEventListener('click', () => {
        modalDetalleCita.style.display = 'none';
      });
    });
  }
  
  // Configurar modal de cambiar estado
  const modalEstadoCita = document.getElementById('modalEstadoCita');
  const btnCancelarEstado = document.getElementById('btnCancelarEstado');
  const formEstadoCita = document.getElementById('formEstadoCita');
  
  if (modalEstadoCita && btnCancelarEstado && formEstadoCita) {
    // Cerrar modal
    document.querySelectorAll('#modalEstadoCita .close-modal, #btnCancelarEstado').forEach(elem => {
      elem.addEventListener('click', () => {
        modalEstadoCita.style.display = 'none';
      });
    });
    
    // Configurar envío del formulario
    formEstadoCita.addEventListener('submit', event => {
      event.preventDefault();
      
      const citaId = document.getElementById('citaId').value;
      const estado = document.getElementById('estadoCita').value;
      const nota = document.getElementById('notaEstado').value;
      
      const resultado = pacienteModel.updateCita(citaId, { estado, nota });
      
      if (resultado.success) {
        // Cerrar modal
        modalEstadoCita.style.display = 'none';
        
        // Recargar vista
        renderCitas();
      } else {
        // Mostrar error
        alert(resultado.message);
      }
    });
  }
}

function mostrarHistorialMedico(pacienteId) {
  const paciente = pacienteModel.getPacienteById(pacienteId);
  if (!paciente) return;
  
  const historiales = pacienteModel.getHistorialByPacienteId(pacienteId) || [];
  
  const modalHistorial = document.getElementById('modalHistorialMedico');
  const modalTitulo = document.getElementById('modalHistorialTitulo');
  const modalContenido = document.getElementById('modalHistorialContenido');
  const btnNuevoRegistro = document.getElementById('btnNuevoRegistro');
  
  if (!modalHistorial || !modalTitulo || !modalContenido || !btnNuevoRegistro) return;
  
  // Configurar título
  modalTitulo.textContent = `Historial Médico - ${paciente.nombre} ${paciente.apellidos}`;
  
  // Configurar contenido
  let html = `
    <div class="patient-info">
      <p><strong>Edad:</strong> ${calcularEdad(paciente.fechaNacimiento)} años</p>
      <p><strong>Género:</strong> ${paciente.genero}</p>
      <p><strong>Teléfono:</strong> ${paciente.telefono}</p>
      ${paciente.correo ? `<p><strong>Correo:</strong> ${paciente.correo}</p>` : ''}
      ${paciente.alergias ? `<p><strong>Alergias:</strong> ${paciente.alergias}</p>` : ''}
      ${paciente.antecedentes ? `<p><strong>Antecedentes:</strong> ${paciente.antecedentes}</p>` : ''}
    </div>
    <h4>Registros Médicos</h4>
  `;
  
  if (historiales.length === 0) {
    html += `<p class="text-center">No hay registros médicos para este paciente</p>`;
  } else {
    html += `<ul class="timeline">`;
    historiales.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).forEach(historial => {
      html += `
        <li class="timeline-item">
          <div class="timeline-date">${formatearFecha(historial.fecha)}</div>
          <div class="timeline-content">
            <h5>Diagnóstico</h5>
            <p>${historial.diagnostico}</p>
            <h5>Tratamiento</h5>
            <p>${historial.tratamiento}</p>
            ${historial.observaciones ? `<h5>Observaciones</h5><p>${historial.observaciones}</p>` : ''}
          </div>
        </li>
      `;
    });
    html += `</ul>`;
  }
  
  modalContenido.innerHTML = html;
  
  // Guardar referencia al paciente para nuevo registro
  btnNuevoRegistro.setAttribute('data-paciente-id', pacienteId);
  
  // Mostrar modal
  modalHistorial.style.display = 'block';
}

function mostrarFormularioNuevoRegistro(pacienteId) {
  const paciente = pacienteModel.getPacienteById(pacienteId);
  if (!paciente) return;
  
  const modalNuevoRegistro = document.getElementById('modalNuevoRegistro');
  const inputPacienteId = document.getElementById('pacienteIdHistorial');
  const inputFecha = document.getElementById('fechaHistorial');
  
  if (!modalNuevoRegistro || !inputPacienteId || !inputFecha) return;
  
  // Configurar formulario
  inputPacienteId.value = pacienteId;
  
  // Establecer fecha actual
  const fechaActual = new Date().toISOString().split('T')[0];
  inputFecha.value = fechaActual;
  
  // Mostrar modal
  modalNuevoRegistro.style.display = 'block';
}

function mostrarFormularioEditarPaciente(pacienteId) {
  const paciente = pacienteModel.getPacienteById(pacienteId);
  if (!paciente) return;
  
  const modalEditarPaciente = document.getElementById('modalEditarPaciente');
  const formEditarPaciente = document.getElementById('formEditarPaciente');
  
  if (!modalEditarPaciente || !formEditarPaciente) return;
  
  // Configurar formulario
  document.getElementById('editPacienteId').value = paciente.id;
  document.getElementById('editNombre').value = paciente.nombre || '';
  document.getElementById('editApellidos').value = paciente.apellidos || '';
  document.getElementById('editFechaNacimiento').value = paciente.fechaNacimiento || '';
  document.getElementById('editTelefono').value = paciente.telefono || '';
  document.getElementById('editCorreo').value = paciente.correo || '';
  document.getElementById('editDomicilio').value = paciente.domicilio || '';
  
  // Configurar radio buttons
  const radios = formEditarPaciente.querySelectorAll('input[name="genero"]');
  for (const radio of radios) {
    radio.checked = radio.value === paciente.genero;
  }
  
  // Mostrar modal
  modalEditarPaciente.style.display = 'block';
}

function mostrarFormularioNuevaCita(pacienteId = null) {
  const modalNuevaCita = document.getElementById('modalNuevaCita');
  const selectPaciente = document.getElementById('pacienteId');
  const inputFecha = document.getElementById('fechaCita');
  
  if (!modalNuevaCita || !selectPaciente || !inputFecha) return;
  
  // Si se proporciona un ID de paciente, seleccionarlo
  if (pacienteId) {
    selectPaciente.value = pacienteId;
  }
  
  // Establecer fecha actual
  const fechaActual = new Date().toISOString().split('T')[0];
  inputFecha.value = fechaActual;
  
  // Establecer hora por defecto (9:00 AM)
  document.getElementById('horaCita').value = '09:00';
  
  // Mostrar modal
  modalNuevaCita.style.display = 'block';
}

function mostrarDetalleCita(citaId) {
  const cita = pacienteModel.getCitaById(citaId);
  if (!cita) return;
  
  const paciente = pacienteModel.getPacienteById(cita.pacienteId);
  if (!paciente) return;
  
  const modalDetalleCita = document.getElementById('modalDetalleCita');
  const contenidoDetalle = document.getElementById('contenidoDetalleCita');
  
  if (!modalDetalleCita || !contenidoDetalle) return;
  
  // Configurar contenido
  const html = `
    <div class="detail-card">
      <h4>Datos del Paciente</h4>
      <p><strong>Nombre:</strong> ${paciente.nombre} ${paciente.apellidos}</p>
      <p><strong>Teléfono:</strong> ${paciente.telefono}</p>
      ${paciente.correo ? `<p><strong>Correo:</strong> ${paciente.correo}</p>` : ''}
      
      <h4>Datos de la Cita</h4>
      <p><strong>Fecha:</strong> ${formatearFecha(cita.fecha)}</p>
      <p><strong>Hora:</strong> ${cita.hora || 'No especificada'}</p>
      <p><strong>Motivo:</strong> ${cita.motivo}</p>
      ${cita.observaciones ? `<p><strong>Observaciones:</strong> ${cita.observaciones}</p>` : ''}
      <p><strong>Estado:</strong> <span class="badge ${cita.estado === 'Pendiente' ? 'badge-warning' : cita.estado === 'Completada' ? 'badge-success' : 'badge-danger'}">${cita.estado}</span></p>
      ${cita.nota ? `<p><strong>Nota de estado:</strong> ${cita.nota}</p>` : ''}
    </div>
  `;
  
  contenidoDetalle.innerHTML = html;
  
  // Mostrar modal
  modalDetalleCita.style.display = 'block';
}

function mostrarFormularioCambiarEstado(citaId) {
  const cita = pacienteModel.getCitaById(citaId);
  if (!cita) return;
  
  const modalEstadoCita = document.getElementById('modalEstadoCita');
  const inputCitaId = document.getElementById('citaId');
  const selectEstado = document.getElementById('estadoCita');
  
  if (!modalEstadoCita || !inputCitaId || !selectEstado) return;
  
  // Configurar formulario
  inputCitaId.value = citaId;
  selectEstado.value = cita.estado;
  
  // Limpiar nota
  document.getElementById('notaEstado').value = cita.nota || '';
  
  // Mostrar modal
  modalEstadoCita.style.display = 'block';
}