// js/views/pacienteView.js
import { pacienteModel } from '../models/pacienteModel.js';

// Función auxiliar para formatear fechas
function formatearFecha(fecha) {
  if (!fecha) return '';
  const date = new Date(fecha);
  return isNaN(date) ? fecha : date.toLocaleDateString('es-MX');
}

// Función para renderizar la tabla de pacientes registrados
export async function renderPacientesRegistrados() {
  const section = document.getElementById('pacientes-registrados-section');
  if (!section) return;
  
  try {
    const pacientes = await pacienteModel.getPacientes();
    
    let html = `
      <div class="section-header">
        <h2>Pacientes Registrados</h2>
        <div class="search-container">
          <input type="text" id="buscarPaciente" placeholder="Buscar paciente..." class="search-input">
        </div>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Matrícula</th>
              <th>Nombre</th>
              <th>Grado</th>
              <th>Grupo</th>
              <th>Facultad</th>
              <th>Teléfono</th>
              <th>Estado Médico</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="tablaPacientes">
    `;
    
    if (pacientes.length === 0) {
      html += `
        <tr>
          <td colspan="9" class="text-center" style="padding: 40px; color: #6b7280;">
            <i class="fas fa-user-friends" style="font-size: 48px; display: block; margin-bottom: 15px; color: #06b6d4;"></i>
            <h3 style="margin: 0 0 10px 0;">No hay pacientes registrados</h3>
            <p style="margin: 0;">Registra el primer paciente usando el formulario de ingreso</p>
          </td>
        </tr>
      `;
    } else {
      pacientes.forEach(paciente => {
        const imc = calcularIMC(paciente.peso, paciente.talla);
        const statusIMC = getStatusIMC(imc);
        
        html += `
          <tr>
            <td><span style="font-weight: 600; color: #06b6d4;">${paciente.id}</span></td>
            <td><strong>${paciente.matricula || 'N/A'}</strong></td>
            <td>
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #7dd3fc, #fef3c7); display: flex; align-items: center; justify-content: center; font-weight: bold; color: #1f2937;">
                  ${paciente.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span>${paciente.nombre}</span>
                  ${paciente.isOffline ? '<br><span style="color: #f59e0b; font-size: 0.75rem;"><i class="fas fa-wifi" style="margin-right: 4px;"></i>Sin sincronizar</span>' : ''}
                </div>
              </div>
            </td>
            <td>${paciente.grado || 'N/A'}</td>
            <td><span class="badge badge-info">${paciente.grupo || 'Sin grupo'}</span></td>
            <td style="font-size: 0.85rem;">${paciente.facultad || 'N/A'}</td>
            <td>
              <a href="tel:${paciente.telefono}" style="color: #06b6d4; text-decoration: none;">
                <i class="fas fa-phone"></i> ${paciente.telefono}
              </a>
            </td>
            <td>
              ${paciente.temperatura_corporal || paciente.presion_arterial || paciente.peso ? 
                '<span class="badge badge-success"><i class="fas fa-check"></i> Completo</span>' : 
                '<span class="badge badge-warning"><i class="fas fa-clock"></i> Pendiente</span>'
              }
            </td>
            <td>
              <div style="display: flex; gap: 5px;">
                <button class="btn-icon ver-detalle" data-id="${paciente.id}" title="Ver detalle completo" 
                        style="background: rgba(6, 182, 212, 0.1); color: #06b6d4;">
                  <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon editar-paciente" data-id="${paciente.id}" title="Editar paciente"
                        style="background: rgba(245, 158, 11, 0.1); color: #f59e0b;">
                  <i class="fas fa-edit"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      });
    }
    
    html += `
          </tbody>
        </table>
      </div>
      
      <!-- Modal para ver detalle completo del paciente -->
      <div id="modalDetallePaciente" class="modal">
        <div class="modal-content" style="max-width: 800px;">
          <span class="close-modal">&times;</span>
          <h3 id="modalDetalleTitulo">Detalle del Paciente</h3>
          <div id="modalDetalleContenido" class="modal-body">
            <!-- Se llena dinámicamente -->
          </div>
          <div class="modal-footer">
            <button id="btnCerrarDetalle" class="btn-secondary">Cerrar</button>
            <button id="btnEditarDesdeDetalle" class="btn-primary" style="display: none;">
              <i class="fas fa-edit"></i> Editar
            </button>
          </div>
        </div>
      </div>
      
      <!-- Modal para editar paciente -->
      <div id="modalEditarPaciente" class="modal">
        <div class="modal-content" style="max-width: 900px;">
          <span class="close-modal">&times;</span>
          <h3>Editar Paciente</h3>
          <form id="formEditarPaciente">
            <input type="hidden" id="editPacienteId" name="id">
            
            <!-- Información Personal -->
            <h4 style="color: #06b6d4; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">
              📋 Información Personal
            </h4>
            
            <div class="form-row">
              <div class="form-group col-md-6">
                <label for="editMatricula">Matrícula:</label>
                <input type="text" id="editMatricula" name="matricula" required>
              </div>
              <div class="form-group col-md-6">
                <label for="editNombre">Nombre:</label>
                <input type="text" id="editNombre" name="nombre" required>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group col-md-6">
                <label for="editGrado">Grado:</label>
                <select id="editGrado" name="grado" required>
                  <option value="">Seleccione el grado</option>
                  <option value="1er Semestre">1er Semestre</option>
                  <option value="2do Semestre">2do Semestre</option>
                  <option value="3er Semestre">3er Semestre</option>
                  <option value="4to Semestre">4to Semestre</option>
                  <option value="5to Semestre">5to Semestre</option>
                  <option value="6to Semestre">6to Semestre</option>
                  <option value="7mo Semestre">7mo Semestre</option>
                  <option value="8vo Semestre">8vo Semestre</option>
                  <option value="9no Semestre">9no Semestre</option>
                  <option value="10mo Semestre">10mo Semestre</option>
                </select>
              </div>
              <div class="form-group col-md-6">
                <label for="editGrupo">Grupo:</label>
                <input type="text" id="editGrupo" name="grupo" required>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group col-md-6">
                <label for="editTelefono">Teléfono:</label>
                <input type="tel" id="editTelefono" name="telefono" required>
              </div>
              <div class="form-group col-md-6">
                <label for="editFacultad">Facultad:</label>
                <input type="text" id="editFacultad" name="facultad" required>
              </div>
            </div>
            
            <!-- Datos Médicos -->
            <h4 style="color: #06b6d4; margin: 25px 0 15px 0; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb;">
              🏥 Datos Médicos
            </h4>
            
            <div class="form-row">
              <div class="form-group col-md-6">
                <label for="editTemperatura">Temperatura Corporal (°C):</label>
                <input type="number" id="editTemperatura" name="temperatura_corporal" step="0.1" min="35" max="42" required>
              </div>
              <div class="form-group col-md-6">
                <label for="editPresion">Presión Arterial:</label>
                <input type="text" id="editPresion" name="presion_arterial" required pattern="[0-9]+/[0-9]+">
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group col-md-6">
                <label for="editPeso">Peso (kg):</label>
                <input type="number" id="editPeso" name="peso" step="0.1" min="30" max="200" required>
              </div>
              <div class="form-group col-md-6">
                <label for="editTalla">Talla (cm):</label>
                <input type="number" id="editTalla" name="talla" min="100" max="250" required>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group col-md-6">
                <label for="editFrecuencia">Frecuencia Respiratoria:</label>
                <input type="number" id="editFrecuencia" name="frecuencia_respiratoria" min="10" max="50" required>
              </div>
              <div class="form-group col-md-6">
                <label for="editExamenVista">Examen de Vista:</label>
                <textarea id="editExamenVista" name="examen_vista" rows="2"></textarea>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group col-md-12">
                <label for="editExamenOido">Examen de Oído:</label>
                <textarea id="editExamenOido" name="examen_oido" rows="2"></textarea>
              </div>
            </div>
            
            <div class="modal-footer">
              <button type="button" id="btnCancelarEdicion" class="btn-secondary">Cancelar</button>
              <button type="submit" class="btn-primary">
                <i class="fas fa-save"></i> Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    section.innerHTML = html;
    
    // Configurar eventos para los botones de la tabla
    configurarEventosPacientes();
  } catch (error) {
    console.error('Error cargando pacientes:', error);
    section.innerHTML = `
      <div class="section-header">
        <h2>Pacientes Registrados</h2>
      </div>
      <div style="text-align: center; padding: 40px; color: #ef4444;">
        <i class="fas fa-exclamation-triangle" style="font-size: 48px; display: block; margin-bottom: 15px;"></i>
        <h3>Error al cargar pacientes</h3>
        <p>${error.message}</p>
        <button onclick="location.reload()" class="btn-primary" style="margin-top: 15px;">
          <i class="fas fa-refresh"></i> Reintentar
        </button>
      </div>
    `;
  }
}

// Función para renderizar el formulario de nuevo paciente
export async function renderPacienteForm() {
  const section = document.getElementById('nuevo-paciente-section');
  if (!section) return;
  
  const html = `
    <div class="section-header">
      <h2>Registro de Nuevo Paciente</h2>
    </div>
    <form id="formNuevoPaciente" class="form-container">
      <!-- Información Personal -->
      <h3 style="color: #06b6d4; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb;">
        📋 Información Personal
      </h3>
      
      <div class="form-row">
        <div class="form-group col-md-6">
          <label for="matricula">Matrícula:</label>
          <input type="text" id="matricula" name="matricula" required placeholder="Ej: EST001">
        </div>
        <div class="form-group col-md-6">
          <label for="nombre">Nombre(s):</label>
          <input type="text" id="nombre" name="nombre" required placeholder="Nombre completo">
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group col-md-6">
          <label for="grado">Grado:</label>
          <select id="grado" name="grado" required>
            <option value="">Seleccione el grado</option>
            <option value="1er Semestre">1er Semestre</option>
            <option value="2do Semestre">2do Semestre</option>
            <option value="3er Semestre">3er Semestre</option>
            <option value="4to Semestre">4to Semestre</option>
            <option value="5to Semestre">5to Semestre</option>
            <option value="6to Semestre">6to Semestre</option>
            <option value="7mo Semestre">7mo Semestre</option>
            <option value="8vo Semestre">8vo Semestre</option>
            <option value="9no Semestre">9no Semestre</option>
            <option value="10mo Semestre">10mo Semestre</option>
          </select>
        </div>
        <div class="form-group col-md-6">
          <label for="grupo">Grupo:</label>
          <input type="text" id="grupo" name="grupo" required placeholder="Ej: Grupo I">
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group col-md-6">
          <label for="telefono">Teléfono:</label>
          <input type="tel" id="telefono" name="telefono" required placeholder="Ej: 5551234567">
        </div>
        <div class="form-group col-md-6">
          <label for="facultad">Facultad:</label>
          <input type="text" id="facultad" name="facultad" required placeholder="Ej: Facultad de Medicina">
        </div>
      </div>
      
      <div class="form-actions">
        <button type="reset" class="btn-secondary">
          <i class="fas fa-undo"></i> Limpiar
        </button>
        <button type="submit" class="btn-primary">
          <i class="fas fa-user-plus"></i> Registrar Paciente
        </button>
      </div>
    </form>
  `;
  
  section.innerHTML = html;
  
  // Configurar el evento de envío del formulario
  const formNuevoPaciente = document.getElementById('formNuevoPaciente');
  if (formNuevoPaciente) {
    formNuevoPaciente.addEventListener('submit', async (event) => {
      event.preventDefault();
      console.log('Evento submit capturado en la vista');
      
      try {
        // Importar el controlador dinámicamente para evitar dependencias circulares
        const module = await import('../controllers/pacienteController.js');
        console.log('Módulo importado correctamente');
        await module.handlePacienteSubmit(event);
      } catch (error) {
        console.error('Error importando el controlador:', error);
        alert('Error al procesar el formulario: ' + error.message);
      }
    });
  } else {
    console.error('No se encontró el formulario formNuevoPaciente');
  }
}

// Función para renderizar la sección de datos médicos
export async function renderDatosMedicos() {
  const section = document.getElementById('datos-medicos-section');
  if (!section) return;
  
  try {
    // Obtener pacientes que no tienen datos médicos completos
    const pacientes = await pacienteModel.getPacientes();
    const pacientesSinDatos = pacientes.filter(p => !p.temperatura_corporal || !p.presion_arterial || !p.peso);
    
    const html = `
      <div class="section-header">
        <h2>Ingresar Datos Médicos</h2>
        <p style="color: #6b7280;">Selecciona un paciente para ingresar o actualizar sus datos médicos</p>
      </div>
      
      ${pacientesSinDatos.length > 0 ? `
      <div style="background: rgba(245, 158, 11, 0.1); padding: 15px; border-radius: 10px; margin-bottom: 20px; border: 1px solid rgba(245, 158, 11, 0.3);">
        <h4 style="color: #f59e0b; margin: 0 0 10px 0;">
          <i class="fas fa-exclamation-triangle"></i> Pacientes con datos médicos pendientes
        </h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px;">
          ${pacientesSinDatos.map(p => `
            <div style="background: white; padding: 10px; border-radius: 8px; border: 1px solid #e5e7eb;">
              <strong>${p.nombre}</strong><br>
              <small style="color: #6b7280;">Matrícula: ${p.matricula}</small><br>
              <button class="btn-primary btn-small" onclick="seleccionarPacienteParaDatos('${p.id}')" style="margin-top: 8px; font-size: 0.8rem; padding: 4px 8px;">
                <i class="fas fa-plus"></i> Agregar Datos
              </button>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
      
      <div class="form-container">
        <div class="form-group">
          <label for="selectPacienteDatos">Seleccionar Paciente:</label>
          <select id="selectPacienteDatos" class="form-control" style="margin-bottom: 20px;">
            <option value="">-- Selecciona un paciente --</option>
            ${pacientes.map(p => `
              <option value="${p.id}">${p.nombre} - ${p.matricula} ${!p.temperatura_corporal ? '(Sin datos médicos)' : '(Actualizar datos)'}</option>
            `).join('')}
          </select>
        </div>
        
        <form id="formDatosMedicos" style="display: none;">
          <input type="hidden" id="pacienteIdDatos" name="pacienteId">
          
          <div id="infoPacienteSeleccionado" style="background: rgba(6, 182, 212, 0.1); padding: 15px; border-radius: 10px; margin-bottom: 20px; border: 1px solid rgba(6, 182, 212, 0.3);">
            <!-- Se llena dinámicamente -->
          </div>
          
          <h3 style="color: #06b6d4; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb;">
            🏥 Datos Médicos
          </h3>
          
          <div class="form-row">
            <div class="form-group col-md-6">
              <label for="temperatura_corporalDatos">Temperatura Corporal (°C):</label>
              <input type="number" id="temperatura_corporalDatos" name="temperatura_corporal" 
                     step="0.1" min="35" max="42" required placeholder="Ej: 36.5">
            </div>
            <div class="form-group col-md-6">
              <label for="presion_arterialDatos">Presión Arterial (mmHg):</label>
              <input type="text" id="presion_arterialDatos" name="presion_arterial" 
                     required placeholder="Ej: 120/80" pattern="[0-9]+/[0-9]+">
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group col-md-6">
              <label for="pesoDatos">Peso (kg):</label>
              <input type="number" id="pesoDatos" name="peso" 
                     step="0.1" min="30" max="200" required placeholder="Ej: 70.5">
            </div>
            <div class="form-group col-md-6">
              <label for="tallaDatos">Talla (cm):</label>
              <input type="number" id="tallaDatos" name="talla" 
                     min="100" max="250" required placeholder="Ej: 170">
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group col-md-6">
              <label for="frecuencia_respiratoriaDatos">Frecuencia Respiratoria (rpm):</label>
              <input type="number" id="frecuencia_respiratoriaDatos" name="frecuencia_respiratoria" 
                     min="10" max="50" required placeholder="Ej: 18">
            </div>
            <div class="form-group col-md-6">
              <label for="examen_vistaDatos">Examen de Vista (opcional):</label>
              <textarea id="examen_vistaDatos" name="examen_vista" rows="2" 
                        placeholder="Observaciones del examen visual"></textarea>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group col-md-12">
              <label for="examen_oidoDatos">Examen de Oído (opcional):</label>
              <textarea id="examen_oidoDatos" name="examen_oido" rows="2" 
                        placeholder="Observaciones del examen auditivo"></textarea>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="button" id="btnCancelarDatos" class="btn-secondary">
              <i class="fas fa-times"></i> Cancelar
            </button>
            <button type="submit" class="btn-primary">
              <i class="fas fa-save"></i> Guardar Datos Médicos
            </button>
          </div>
        </form>
      </div>
    `;
    
    section.innerHTML = html;
    
    // Configurar eventos
    configurarEventosDatosMedicos();
    
  } catch (error) {
    console.error('Error cargando datos médicos:', error);
    section.innerHTML = `
      <div class="section-header">
        <h2>Ingresar Datos Médicos</h2>
      </div>
      <div style="text-align: center; padding: 40px; color: #ef4444;">
        <i class="fas fa-exclamation-triangle" style="font-size: 48px; display: block; margin-bottom: 15px;"></i>
        <h3>Error al cargar la sección</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// Función para renderizar el historial médico completo
export async function renderHistorialMedicoCompleto() {
  const section = document.getElementById('historial-medico-section');
  if (!section) return;

  try {
    console.log('Cargando historial médico completo...');
    const historialMedico = await pacienteModel.getHistorialMedico();
    console.log('Historial médico obtenido:', historialMedico);

    // Ordenar por fecha descendente (más reciente primero)
    historialMedico.sort((a, b) => {
      const fechaA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha);
      const fechaB = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha);
      return fechaB - fechaA;
    });

    let html = `
      <div class="section-header">
        <h2>Historial Médico Completo</h2>
        <div class="search-container">
          <input type="text" id="buscarHistorial" placeholder="Buscar en historial..." class="search-input">
        </div>
      </div>
      
      <div class="filters-section" style="margin-bottom: 20px; display: flex; gap: 15px; flex-wrap: wrap;">
        <div>
          <label for="filtroFecha" style="display: block; margin-bottom: 5px; font-weight: 600;">Filtrar por fecha:</label>
          <input type="date" id="filtroFecha" class="form-control" style="padding: 8px 12px; border: 2px solid #e5e7eb; border-radius: 8px;">
        </div>
        <div>
          <label for="filtroPaciente" style="display: block; margin-bottom: 5px; font-weight: 600;">Filtrar por paciente:</label>
          <select id="filtroPaciente" class="form-control" style="padding: 8px 12px; border: 2px solid #e5e7eb; border-radius: 8px; min-width: 200px;">
            <option value="">Todos los pacientes</option>
          </select>
        </div>
        <div style="display: flex; align-items: end;">
          <button id="limpiarFiltros" class="btn-secondary" style="padding: 8px 16px;">
            <i class="fas fa-undo"></i> Limpiar filtros
          </button>
        </div>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Fecha y Hora</th>
              <th>Paciente</th>
              <th>Tipo de Actividad</th>
              <th>Registrado por</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="tablaHistorialMedico">
    `;

    if (historialMedico.length === 0) {
      html += `
        <tr>
          <td colspan="5" class="text-center" style="padding: 40px; color: #6b7280;">
            <i class="fas fa-clipboard-list" style="font-size: 48px; display: block; margin-bottom: 15px; color: #06b6d4;"></i>
            <h3 style="margin: 0 0 10px 0;">No hay registros médicos</h3>
            <p style="margin: 0;">Los registros médicos aparecerán aquí cuando se ingresen datos médicos a los pacientes</p>
          </td>
        </tr>
      `;
    } else {
      // Obtener lista única de pacientes para el filtro
      const pacientesUnicos = [...new Set(historialMedico.map(h => h.pacienteNombre))];
      const selectFiltro = document.createElement('select');
      pacientesUnicos.forEach(nombre => {
        html = html.replace('<option value="">Todos los pacientes</option>', 
          `<option value="">Todos los pacientes</option><option value="${nombre}">${nombre}</option>`);
      });

      historialMedico.forEach(registro => {
        console.log('Estructura del registro:', registro);
        
        const fecha = registro.fecha?.toDate ? registro.fecha.toDate() : new Date(registro.fecha);
        const fechaFormateada = fecha.toLocaleDateString('es-MX');
        const horaFormateada = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

        // Usar el campo correcto según la estructura de registros_medicos
        const nombrePaciente = registro.paciente || registro.pacienteNombre || 'Sin nombre';
        const nombrePracticante = registro.practicante || registro.registradoPorNombre || 'No especificado';
        
        // Determinar tipo de actividad y indicadores
        const tipoRegistro = registro.tipoRegistro || 'desconocido';
        const camposModificados = registro.camposModificados || [];
        const totalCambios = registro.totalCamposModificados || 0;
        
        // Generar indicador visual para el tipo de actividad
        let indicadorActividad = '';
        let colorActividad = '';
        let iconoActividad = '';
        
        if (tipoRegistro === 'nuevo') {
          indicadorActividad = 'Registro Inicial';
          colorActividad = '#10b981'; // Verde
          iconoActividad = 'fas fa-plus-circle';
        } else if (tipoRegistro === 'actualizacion') {
          indicadorActividad = `Actualización (${totalCambios} cambio${totalCambios !== 1 ? 's' : ''})`;
          colorActividad = '#f59e0b'; // Amarillo
          iconoActividad = 'fas fa-edit';
        } else {
          indicadorActividad = 'Registro Médico';
          colorActividad = '#6b7280'; // Gris
          iconoActividad = 'fas fa-file-medical';
        }

        html += `
          <tr data-paciente="${nombrePaciente}" data-fecha="${fechaFormateada}">
            <td>
              <div style="font-weight: 600;">${fechaFormateada}</div>
              <div style="font-size: 0.85rem; color: #6b7280;">${horaFormateada}</div>
            </td>
            <td>
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #7dd3fc, #fef3c7); display: flex; align-items: center; justify-content: center; font-weight: bold; color: #1f2937;">
                  ${nombrePaciente.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style="font-weight: 600;">${nombrePaciente}</div>
                  <div style="font-size: 0.85rem; color: #6b7280;">Paciente</div>
                </div>
              </div>
            </td>
            <td>
              <div style="display: flex; align-items: center; gap: 8px;">
                <i class="${iconoActividad}" style="color: ${colorActividad}; font-size: 1.2rem;"></i>
                <div>
                  <div style="font-weight: 600; color: ${colorActividad};">${indicadorActividad}</div>
                  ${totalCambios > 0 ? `<div style="font-size: 0.8rem; color: #6b7280;">Campos modificados: ${totalCambios}</div>` : ''}
                </div>
              </div>
            </td>
            <td>
              <div style="font-size: 0.9rem;">
                <div style="font-weight: 600;">${nombrePracticante}</div>
                <div style="font-size: 0.8rem; color: #6b7280;">Practicante</div>
              </div>
            </td>
            <td>
              <button class="btn-icon ver-detalle-historial" data-registro='${JSON.stringify(registro)}' title="Ver detalle completo" 
                      style="background: rgba(6, 182, 212, 0.1); color: #06b6d4;">
                <i class="fas fa-eye"></i>
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

      <!-- Modal para ver detalle del registro médico -->
      <div id="modalDetalleHistorial" class="modal">
        <div class="modal-content" style="max-width: 700px;">
          <span class="close-modal">&times;</span>
          <h3 id="modalHistorialTitulo">Detalle del Registro Médico</h3>
          <div id="modalHistorialContenido" class="modal-body">
            <!-- Se llena dinámicamente -->
          </div>
          <div class="modal-footer">
            <button id="btnCerrarDetalleHistorial" class="btn-secondary">Cerrar</button>
          </div>
        </div>
      </div>
    `;

    section.innerHTML = html;

    // Configurar eventos
    configurarEventosHistorialMedico();

  } catch (error) {
    console.error('Error cargando historial médico:', error);
    section.innerHTML = `
      <div class="section-header">
        <h2>Historial Médico Completo</h2>
      </div>
      <div style="text-align: center; padding: 40px; color: #ef4444;">
        <i class="fas fa-exclamation-triangle" style="font-size: 48px; display: block; margin-bottom: 15px;"></i>
        <h3>Error al cargar el historial médico</h3>
        <p>${error.message}</p>
        <button onclick="location.reload()" class="btn-primary" style="margin-top: 15px;">
          <i class="fas fa-refresh"></i> Reintentar
        </button>
      </div>
    `;
  }
}

// Funciones auxiliares

function calcularIMC(peso, talla) {
  if (!peso || !talla) return null;
  const tallaMts = talla / 100;
  return (peso / (tallaMts * tallaMts)).toFixed(1);
}

function getStatusIMC(imc) {
  if (!imc) return 'badge-secondary';
  if (imc < 18.5) return 'badge-warning';
  if (imc >= 18.5 && imc < 25) return 'badge-success';
  if (imc >= 25 && imc < 30) return 'badge-warning';
  return 'badge-danger';
}

function getTemperatureStatus(temp) {
  if (!temp) return 'badge-secondary';
  if (temp < 36.1) return 'badge-info';
  if (temp >= 36.1 && temp <= 37.2) return 'badge-success';
  if (temp > 37.2 && temp <= 38) return 'badge-warning';
  return 'badge-danger';
}

function getPressureStatus(pressure) {
  if (!pressure) return 'badge-secondary';
  const [sistolica, diastolica] = pressure.split('/').map(Number);
  if (sistolica < 120 && diastolica < 80) return 'badge-success';
  if (sistolica <= 139 || diastolica <= 89) return 'badge-warning';
  return 'badge-danger';
}

function generarIdPaciente() {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substr(2, 3).toUpperCase();
  return `P${timestamp.slice(-3)}${random}`;
}

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
  
  // Eventos para ver detalle completo
  document.querySelectorAll('.ver-detalle').forEach(btn => {
    btn.addEventListener('click', () => {
      const pacienteId = btn.getAttribute('data-id');
      mostrarDetallePaciente(pacienteId);
    });
  });
  
  // Eventos para editar paciente
  document.querySelectorAll('.editar-paciente').forEach(btn => {
    btn.addEventListener('click', () => {
      const pacienteId = btn.getAttribute('data-id');
      mostrarFormularioEditarPaciente(pacienteId);
    });
  });
  
  // Configurar modal de detalle paciente
  const modalDetalle = document.getElementById('modalDetallePaciente');
  const btnCerrarDetalle = document.getElementById('btnCerrarDetalle');
  const btnEditarDesdeDetalle = document.getElementById('btnEditarDesdeDetalle');
  
  if (modalDetalle && btnCerrarDetalle) {
    // Cerrar modal
    document.querySelectorAll('#modalDetallePaciente .close-modal, #btnCerrarDetalle').forEach(elem => {
      elem.addEventListener('click', () => {
        modalDetalle.style.display = 'none';
      });
    });
    
    // Editar desde detalle
    if (btnEditarDesdeDetalle) {
      btnEditarDesdeDetalle.addEventListener('click', () => {
        const pacienteId = btnEditarDesdeDetalle.getAttribute('data-paciente-id');
        if (pacienteId) {
          modalDetalle.style.display = 'none';
          mostrarFormularioEditarPaciente(pacienteId);
        }
      });
    }
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
    formEditarPaciente.addEventListener('submit', async (event) => {
      event.preventDefault();
      
      try {
        const formData = new FormData(formEditarPaciente);
        const pacienteData = Object.fromEntries(formData.entries());
        const pacienteId = pacienteData.id;
        delete pacienteData.id; // Remover el ID de los datos a actualizar
        
        const resultado = await pacienteModel.updatePaciente(pacienteId, pacienteData);
        
        if (resultado.success) {
          // Mostrar mensaje de éxito
          mostrarConfirmacion('Éxito', 'Paciente actualizado correctamente.', async () => {
            modalEditarPaciente.style.display = 'none';
            // Recargar la vista
            await renderPacientesRegistrados();
          });
        }
      } catch (error) {
        mostrarConfirmacion('Error', 'No se pudo actualizar el paciente: ' + error.message);
      }
    });
  }
}

async function mostrarDetallePaciente(pacienteId) {
  try {
    const paciente = await pacienteModel.getPacienteById(pacienteId);
    if (!paciente) {
      mostrarConfirmacion('Error', 'No se pudo encontrar el paciente.');
      return;
    }
    
    const modalDetalle = document.getElementById('modalDetallePaciente');
    const modalTitulo = document.getElementById('modalDetalleTitulo');
    const modalContenido = document.getElementById('modalDetalleContenido');
    const btnEditarDesdeDetalle = document.getElementById('btnEditarDesdeDetalle');
    
    if (!modalDetalle || !modalTitulo || !modalContenido) return;
    
    // Configurar título
    modalTitulo.innerHTML = `
      <div style="display: flex; align-items: center; gap: 15px;">
        <div style="width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #7dd3fc, #fef3c7); display: flex; align-items: center; justify-content: center; font-weight: bold; color: #1f2937; font-size: 1.5rem;">
          ${paciente.nombre.charAt(0).toUpperCase()}
        </div>
        <div>
          <h3 style="margin: 0; color: #06b6d4;">${paciente.nombre}</h3>
          <p style="margin: 0; color: #6b7280; font-size: 0.9rem;">${paciente.matricula} • ${paciente.facultad}</p>
        </div>
      </div>
    `;
    
    // Calcular IMC
    const imc = calcularIMC(paciente.peso, paciente.talla);
    const statusIMC = imc ? getStatusIMC(imc) : 'badge-secondary';
    
    // Configurar contenido
    const html = `
      <div style="display: grid; gap: 20px;">
        <!-- Información Personal -->
        <div class="detail-card" style="background: rgba(6, 182, 212, 0.05); padding: 20px; border-radius: 12px; border: 1px solid rgba(6, 182, 212, 0.2);">
          <h4 style="color: #06b6d4; margin: 0 0 15px 0; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-user"></i> Información Personal
          </h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
            <div><strong>Matrícula:</strong> ${paciente.matricula || 'N/A'}</div>
            <div><strong>Grado:</strong> ${paciente.grado || 'N/A'}</div>
            <div><strong>Grupo:</strong> <span class="badge badge-info">${paciente.grupo || 'Sin grupo'}</span></div>
            <div><strong>Facultad:</strong> ${paciente.facultad || 'N/A'}</div>
            <div><strong>Teléfono:</strong> <a href="tel:${paciente.telefono}" style="color: #06b6d4;">${paciente.telefono}</a></div>
          </div>
        </div>
        
        <!-- Datos Médicos -->
        <div class="detail-card" style="background: rgba(245, 158, 11, 0.05); padding: 20px; border-radius: 12px; border: 1px solid rgba(245, 158, 11, 0.2);">
          <h4 style="color: #f59e0b; margin: 0 0 15px 0; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-heartbeat"></i> Datos Médicos
          </h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px;">
            <div>
              <strong>Temperatura:</strong><br>
              <span class="badge ${getTemperatureStatus(paciente.temperatura_corporal)}">${paciente.temperatura_corporal || 'N/A'}°C</span>
            </div>
            <div>
              <strong>Presión Arterial:</strong><br>
              <span class="badge ${getPressureStatus(paciente.presion_arterial)}">${paciente.presion_arterial || 'N/A'}</span>
            </div>
            <div>
              <strong>Peso:</strong><br>
              ${paciente.peso || 'N/A'} kg
            </div>
            <div>
              <strong>Talla:</strong><br>
              ${paciente.talla || 'N/A'} cm
            </div>
            <div>
              <strong>IMC:</strong><br>
              ${imc ? `<span class="badge ${statusIMC}">${imc}</span>` : 'N/A'}
            </div>
            <div>
              <strong>Frecuencia Resp.:</strong><br>
              ${paciente.frecuencia_respiratoria || 'N/A'} rpm
            </div>
          </div>
        </div>
        
        <!-- Exámenes -->
        ${(paciente.examen_vista || paciente.examen_oido) ? `
        <div class="detail-card" style="background: rgba(16, 185, 129, 0.05); padding: 20px; border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.2);">
          <h4 style="color: #10b981; margin: 0 0 15px 0; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-clipboard-check"></i> Exámenes Complementarios
          </h4>
          ${paciente.examen_vista ? `
          <div style="margin-bottom: 15px;">
            <strong>Examen de Vista:</strong><br>
            <p style="margin: 5px 0; padding: 10px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">${paciente.examen_vista}</p>
          </div>
          ` : ''}
          ${paciente.examen_oido ? `
          <div>
            <strong>Examen de Oído:</strong><br>
            <p style="margin: 5px 0; padding: 10px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">${paciente.examen_oido}</p>
          </div>
          ` : ''}
        </div>
        ` : ''}
        
        <!-- Información del Registro -->
        <div class="detail-card" style="background: rgba(107, 114, 128, 0.05); padding: 15px; border-radius: 12px; border: 1px solid rgba(107, 114, 128, 0.2);">
          <h4 style="color: #6b7280; margin: 0 0 10px 0; font-size: 1rem;">
            <i class="fas fa-info-circle"></i> Información del Registro
          </h4>
          <div style="font-size: 0.9rem; color: #6b7280;">
            <div><strong>ID:</strong> ${paciente.id}</div>
            <div><strong>Fecha de registro:</strong> ${formatearFecha(paciente.createdAt?.toDate?.() || paciente.fechaRegistro)}</div>
            ${paciente.updatedAt ? `<div><strong>Última actualización:</strong> ${formatearFecha(paciente.updatedAt.toDate())}</div>` : ''}
          </div>
        </div>
      </div>
    `;
    
    modalContenido.innerHTML = html;
    
    // Configurar botón de editar
    if (btnEditarDesdeDetalle) {
      btnEditarDesdeDetalle.setAttribute('data-paciente-id', pacienteId);
      btnEditarDesdeDetalle.style.display = 'inline-block';
    }
    
    // Mostrar modal
    modalDetalle.style.display = 'block';
  } catch (error) {
    console.error('Error mostrando detalle del paciente:', error);
    mostrarConfirmacion('Error', 'No se pudo cargar el detalle del paciente: ' + error.message);
  }
}

async function mostrarFormularioEditarPaciente(pacienteId) {
  try {
    const paciente = await pacienteModel.getPacienteById(pacienteId);
    if (!paciente) {
      mostrarConfirmacion('Error', 'No se pudo encontrar el paciente.');
      return;
    }
    
    const modalEditarPaciente = document.getElementById('modalEditarPaciente');
    const formEditarPaciente = document.getElementById('formEditarPaciente');
    
    if (!modalEditarPaciente || !formEditarPaciente) return;
    
    // Llenar formulario con datos actuales
    document.getElementById('editPacienteId').value = paciente.id;
    document.getElementById('editMatricula').value = paciente.matricula || '';
    document.getElementById('editNombre').value = paciente.nombre || '';
    document.getElementById('editGrado').value = paciente.grado || '';
    document.getElementById('editGrupo').value = paciente.grupo || '';
    document.getElementById('editTelefono').value = paciente.telefono || '';
    document.getElementById('editFacultad').value = paciente.facultad || '';
    document.getElementById('editTemperatura').value = paciente.temperatura_corporal || '';
    document.getElementById('editPresion').value = paciente.presion_arterial || '';
    document.getElementById('editPeso').value = paciente.peso || '';
    document.getElementById('editTalla').value = paciente.talla || '';
    document.getElementById('editFrecuencia').value = paciente.frecuencia_respiratoria || '';
    document.getElementById('editExamenVista').value = paciente.examen_vista || '';
    document.getElementById('editExamenOido').value = paciente.examen_oido || '';
    
    // Mostrar modal
    modalEditarPaciente.style.display = 'block';
  } catch (error) {
    console.error('Error cargando formulario de edición:', error);
    mostrarConfirmacion('Error', 'No se pudo cargar el formulario de edición: ' + error.message);
  }
}

// Función auxiliar para mostrar confirmaciones (si no existe)
function mostrarConfirmacion(titulo, mensaje, callback = null) {
  const modalConfirmacion = document.createElement('div');
  modalConfirmacion.style.cssText = `
    display: flex; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: linear-gradient(135deg, rgba(125, 211, 252, 0.9), rgba(254, 243, 199, 0.9));
    z-index: 9999; justify-content: center; align-items: center;
  `;
  modalConfirmacion.innerHTML = `
    <div style="background: rgba(255, 255, 255, 0.98); padding: 30px; border-radius: 20px; min-width: 350px; max-width: 500px; text-align: center; box-shadow: 0 25px 60px 
       rgba(0, 0, 0, 0.3); border: 2px solid rgba(125, 211, 252, 0.4); position: relative; margin: 20px;">
      <div style="margin-bottom: 20px; font-size: 3rem;">${titulo === 'Error' ? '❌' : '✅'}</div>
      <h3 style="margin: 0 0 15px 0; font-size: 1.5rem; font-weight: 700; color: transparent; background: linear-gradient(135deg, #06b6d4, ${titulo === 'Error' ? '#ef4444' : '#10b981'}); 
       -webkit-background-clip: text; background-clip: text;">${titulo}</h3>
      <p style="margin: 0 0 25px 0; font-size: 1.1rem; color: #374151; line-height: 1.5;">${mensaje}</p>
      <button id="btnAceptarConfirmacion" style="background: linear-gradient(135deg, #7dd3fc, #fef3c7); color: #1f2937; border: none; border-radius: 25px; padding: 12px 
       30px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 6px 20px rgba(125, 211, 252, 0.3);">Aceptar</button>
    </div>
  `;
  document.body.appendChild(modalConfirmacion);
  const btnAceptarConfirmacion = modalConfirmacion.querySelector('#btnAceptarConfirmacion');
  btnAceptarConfirmacion.onclick = () => {
    document.body.removeChild(modalConfirmacion);
    if (callback && typeof callback === 'function') {
      callback();
    }
  };
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

// Funciones auxiliares para datos médicos
function configurarEventosDatosMedicos() {
  const selectPaciente = document.getElementById('selectPacienteDatos');
  const formDatos = document.getElementById('formDatosMedicos');
  const btnCancelar = document.getElementById('btnCancelarDatos');
  
  if (selectPaciente) {
    selectPaciente.addEventListener('change', async (e) => {
      const pacienteId = e.target.value;
      if (pacienteId) {
        await cargarDatosPacienteParaEdicion(pacienteId);
        formDatos.style.display = 'block';
      } else {
        formDatos.style.display = 'none';
      }
    });
  }
  
  if (btnCancelar) {
    btnCancelar.addEventListener('click', () => {
      selectPaciente.value = '';
      formDatos.style.display = 'none';
    });
  }
  
  if (formDatos) {
    formDatos.addEventListener('submit', async (e) => {
      e.preventDefault();
      await guardarDatosMedicos(e);
    });
  }
}

async function cargarDatosPacienteParaEdicion(pacienteId) {
  try {
    const paciente = await pacienteModel.getPacienteById(pacienteId);
    if (!paciente) return;
    
    // Mostrar información del paciente
    const infoPaciente = document.getElementById('infoPacienteSeleccionado');
    infoPaciente.innerHTML = `
      <h4 style="color: #06b6d4; margin: 0 0 10px 0;">
        <i class="fas fa-user"></i> ${paciente.nombre}
      </h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; font-size: 0.9rem;">
        <div><strong>Matrícula:</strong> ${paciente.matricula}</div>
        <div><strong>Grado:</strong> ${paciente.grado}</div>
        <div><strong>Grupo:</strong> ${paciente.grupo}</div>
        <div><strong>Facultad:</strong> ${paciente.facultad}</div>
      </div>
    `;
    
    // Llenar formulario con datos existentes (si los hay)
    document.getElementById('pacienteIdDatos').value = paciente.id;
    document.getElementById('temperatura_corporalDatos').value = paciente.temperatura_corporal || '';
    document.getElementById('presion_arterialDatos').value = paciente.presion_arterial || '';
    document.getElementById('pesoDatos').value = paciente.peso || '';
    document.getElementById('tallaDatos').value = paciente.talla || '';
    document.getElementById('frecuencia_respiratoriaDatos').value = paciente.frecuencia_respiratoria || '';
    document.getElementById('examen_vistaDatos').value = paciente.examen_vista || '';
    document.getElementById('examen_oidoDatos').value = paciente.examen_oido || '';
    
  } catch (error) {
    console.error('Error cargando datos del paciente:', error);
    mostrarConfirmacion('Error', 'No se pudieron cargar los datos del paciente');
  }
}

async function guardarDatosMedicos(event) {
  try {
    const formData = new FormData(event.target);
    const datosMedicos = Object.fromEntries(formData.entries());
    const pacienteId = datosMedicos.pacienteId;
    delete datosMedicos.pacienteId;
    
    // Validar datos médicos
    const validacion = validarDatosMedicosCompletos(datosMedicos);
    if (!validacion.validos) {
      mostrarConfirmacion('Error de Validación', validacion.errores.join('\n'));
      return;
    }
    
    // Actualizar paciente con datos médicos
    const resultado = await pacienteModel.updatePaciente(pacienteId, datosMedicos);
    
    if (resultado.success) {
      mostrarConfirmacion('Éxito', 'Datos médicos guardados correctamente', async () => {
        // Limpiar formulario y recargar vista
        document.getElementById('selectPacienteDatos').value = '';
        document.getElementById('formDatosMedicos').style.display = 'none';
        await renderDatosMedicos();
      });
    } else {
      mostrarConfirmacion('Error', 'No se pudieron guardar los datos: ' + (resultado.error || 'Error desconocido'));
    }
    
  } catch (error) {
    console.error('Error guardando datos médicos:', error);
    mostrarConfirmacion('Error', 'No se pudieron guardar los datos médicos: ' + error.message);
  }
}

function validarDatosMedicosCompletos(datos) {
  const errores = [];
  
  // Validar temperatura
  const temp = parseFloat(datos.temperatura_corporal);
  if (!temp || temp < 35 || temp > 42) {
    errores.push('La temperatura debe estar entre 35 y 42 grados');
  }
  
  // Validar presión arterial
  if (!datos.presion_arterial || !/^\d{2,3}\/\d{2,3}$/.test(datos.presion_arterial)) {
    errores.push('La presión arterial debe tener formato 120/80');
  }
  
  // Validar peso
  const peso = parseFloat(datos.peso);
  if (!peso || peso < 30 || peso > 200) {
    errores.push('El peso debe estar entre 30 y 200 kg');
  }
  
  // Validar talla
  const talla = parseInt(datos.talla);
  if (!talla || talla < 100 || talla > 250) {
    errores.push('La talla debe estar entre 100 y 250 cm');
  }
  
  // Validar frecuencia respiratoria
  const freq = parseInt(datos.frecuencia_respiratoria);
  if (!freq || freq < 10 || freq > 50) {
    errores.push('La frecuencia respiratoria debe estar entre 10 y 50 rpm');
  }
  
  return {
    validos: errores.length === 0,
    errores
  };
}

// Función auxiliar global para usar desde botones inline
window.seleccionarPacienteParaDatos = async function(pacienteId) {
  const selectPaciente = document.getElementById('selectPacienteDatos');
  const formDatos = document.getElementById('formDatosMedicos');
  
  if (selectPaciente && formDatos) {
    selectPaciente.value = pacienteId;
    await cargarDatosPacienteParaEdicion(pacienteId);
    formDatos.style.display = 'block';
    
    // Scroll hacia el formulario
    formDatos.scrollIntoView({ behavior: 'smooth' });
  }
};

// Funciones auxiliares para el historial médico
function configurarEventosHistorialMedico() {
  // Configurar evento de búsqueda
  const inputBuscar = document.getElementById('buscarHistorial');
  if (inputBuscar) {
    inputBuscar.addEventListener('input', filtrarHistorialMedico);
  }
  
  // Configurar filtros
  const filtroFecha = document.getElementById('filtroFecha');
  const filtroPaciente = document.getElementById('filtroPaciente');
  const limpiarFiltros = document.getElementById('limpiarFiltros');
  
  if (filtroFecha) {
    filtroFecha.addEventListener('change', filtrarHistorialMedico);
  }
  
  if (filtroPaciente) {
    filtroPaciente.addEventListener('change', filtrarHistorialMedico);
  }
  
  if (limpiarFiltros) {
    limpiarFiltros.addEventListener('click', () => {
      inputBuscar.value = '';
      filtroFecha.value = '';
      filtroPaciente.value = '';
      filtrarHistorialMedico();
    });
  }
  
  // Eventos para ver detalle de registros
  document.querySelectorAll('.ver-detalle-historial').forEach(btn => {
    btn.addEventListener('click', () => {
      const registroData = JSON.parse(btn.getAttribute('data-registro'));
      mostrarDetalleRegistroMedico(registroData);
    });
  });
  
  // Configurar modal de detalle
  const modalDetalle = document.getElementById('modalDetalleHistorial');
  const btnCerrar = document.getElementById('btnCerrarDetalleHistorial');
  
  if (modalDetalle && btnCerrar) {
    // Cerrar modal
    document.querySelectorAll('#modalDetalleHistorial .close-modal, #btnCerrarDetalleHistorial').forEach(elem => {
      elem.addEventListener('click', () => {
        modalDetalle.style.display = 'none';
      });
    });
  }
}

function filtrarHistorialMedico() {
  const busqueda = document.getElementById('buscarHistorial')?.value.toLowerCase() || '';
  const fechaFiltro = document.getElementById('filtroFecha')?.value || '';
  const pacienteFiltro = document.getElementById('filtroPaciente')?.value || '';
  
  const filas = document.querySelectorAll('#tablaHistorialMedico tr');
  
  filas.forEach(fila => {
    const contenido = fila.textContent.toLowerCase();
    const paciente = fila.getAttribute('data-paciente') || '';
    const fecha = fila.getAttribute('data-fecha') || '';
    
    let mostrar = true;
    
    // Filtro de búsqueda
    if (busqueda && !contenido.includes(busqueda)) {
      mostrar = false;
    }
    
    // Filtro de fecha
    if (fechaFiltro && !fecha.includes(fechaFiltro)) {
      mostrar = false;
    }
    
    // Filtro de paciente
    if (pacienteFiltro && paciente !== pacienteFiltro) {
      mostrar = false;
    }
    
    fila.style.display = mostrar ? '' : 'none';
  });
}

function mostrarDetalleRegistroMedico(registro) {
  const modalDetalle = document.getElementById('modalDetalleHistorial');
  const modalTitulo = document.getElementById('modalHistorialTitulo');
  const modalContenido = document.getElementById('modalHistorialContenido');
  
  if (!modalDetalle || !modalTitulo || !modalContenido) return;
  
  const fecha = registro.fecha?.toDate ? registro.fecha.toDate() : new Date(registro.fecha);
  const fechaFormateada = fecha.toLocaleDateString('es-MX');
  const horaFormateada = fecha.toLocaleTimeString('es-MX');
  
  // Usar los campos correctos de registros_medicos
  const nombrePaciente = registro.paciente || registro.pacienteNombre || 'Sin nombre';
  const nombrePracticante = registro.practicante || registro.registradoPorNombre || 'No especificado';
  
  modalTitulo.innerHTML = `
    <div style="display: flex; align-items: center; gap: 15px;">
      <div style="width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #7dd3fc, #fef3c7); display: flex; align-items: center; justify-content: center; font-weight: bold; color: #1f2937; font-size: 1.5rem;">
        ${nombrePaciente.charAt(0).toUpperCase()}
      </div>
      <div>
        <h3 style="margin: 0; color: #06b6d4;">${nombrePaciente}</h3>
        <p style="margin: 0; color: #6b7280; font-size: 0.9rem;">${fechaFormateada} • ${horaFormateada}</p>
      </div>
    </div>
  `;
  
  const html = `
    <div style="display: grid; gap: 20px;">
      <!-- Información del Paciente -->
      <div class="detail-card" style="background: rgba(6, 182, 212, 0.05); padding: 20px; border-radius: 12px; border: 1px solid rgba(6, 182, 212, 0.2);">
        <h4 style="color: #06b6d4; margin: 0 0 15px 0; display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-user"></i> Información del Paciente
        </h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px;">
          <div><strong>Nombre:</strong> ${registro.pacienteNombre}</div>
          <div><strong>Matrícula:</strong> ${registro.pacienteMatricula}</div>
        </div>
      </div>
      
      <!-- Datos Médicos -->
      <div class="detail-card" style="background: rgba(245, 158, 11, 0.05); padding: 20px; border-radius: 12px; border: 1px solid rgba(245, 158, 11, 0.2);">
        <h4 style="color: #f59e0b; margin: 0 0 15px 0; display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-heartbeat"></i> Datos Médicos Registrados
        </h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px;">
          <div>
            <strong>Temperatura:</strong><br>
            <span class="badge ${getTemperatureStatus(registro.datosMedicos.temperatura_corporal)}">${registro.datosMedicos.temperatura_corporal || 'N/A'}${registro.datosMedicos.temperatura_corporal ? '°C' : ''}</span>
          </div>
          <div>
            <strong>Presión Arterial:</strong><br>
            <span class="badge ${getPressureStatus(registro.datosMedicos.presion_arterial)}">${registro.datosMedicos.presion_arterial || 'N/A'}</span>
          </div>
          <div>
            <strong>Peso:</strong><br>
            ${registro.datosMedicos.peso || 'N/A'} kg
          </div>
          <div>
            <strong>Talla:</strong><br>
            ${registro.datosMedicos.talla || 'N/A'} cm
          </div>
          <div></div>
          <div>
            <strong>Frecuencia Resp.:</strong><br>
            ${registro.datosMedicos?.frecuencia_respiratoria || 'N/A'} rpm
          </div>
        </div>
      </div>
      
      <!-- Exámenes Complementarios -->
      ${(registro.datosMedicos.examen_vista || registro.datosMedicos.examen_oido) ? `
      <div class="detail-card" style="background: rgba(16, 185, 129, 0.05); padding: 20px; border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.2);">
        <h4 style="color: #10b981; margin: 0 0 15px 0; display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-clipboard-check"></i> Exámenes Complementarios
        </h4>
        ${registro.datosMedicos.examen_vista ? `
        <div style="margin-bottom: 15px;">
          <strong>Examen de Vista:</strong><br>
          <p style="margin: 5px 0; padding: 10px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">${registro.datosMedicos.examen_vista}</p>
        </div>
        ` : ''}
        ${registro.datosMedicos.examen_oido ? `
        <div>
          <strong>Examen de Oído:</strong><br>
          <p style="margin: 5px 0; padding: 10px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">${registro.datosMedicos.examen_oido}</p>
        </div>
        ` : ''}
      </div>
      ` : ''}
      
      <!-- Información del Registro -->
      <div class="detail-card" style="background: rgba(107, 114, 128, 0.05); padding: 15px; border-radius: 12px; border: 1px solid rgba(107, 114, 128, 0.2);">
        <h4 style="color: #6b7280; margin: 0 0 10px 0; font-size: 1rem;">
          <i class="fas fa-info-circle"></i> Información del Registro
        </h4>
        <div style="font-size: 0.9rem; color: #6b7280;">
          <div><strong>Fecha y hora:</strong> ${fechaFormateada} a las ${horaFormateada}</div>
          <div><strong>Registrado por:</strong> ${registro.practicante || registro.registradoPorNombre || 'Sistema'}</div>
        </div>
      </div>
    </div>
  `;
  
  modalContenido.innerHTML = html;
  modalDetalle.style.display = 'block';
}

// Exportar funciones al namespace global
window.PacienteView = window.PacienteView || {};
window.PacienteView.renderDatosMedicos = renderDatosMedicos;
window.PacienteView.renderHistorialMedicoCompleto = renderHistorialMedicoCompleto;

console.log('PacienteView: Módulo cargado correctamente');

// Escuchar eventos de conexión
if (window.EventBus) {
  // Cuando se pierde la conexión
  window.EventBus.subscribe('connection:offline', () => {
    console.log('📵 PacienteView: Modo offline activado');
    mostrarMensajeConexion('📵 Sin conexión - Los cambios se guardarán localmente', 'warning');
  });

  // Cuando se restaura la conexión
  window.EventBus.subscribe('connection:online', () => {
    console.log('🌐 PacienteView: Conexión restaurada');
    mostrarMensajeConexion('🌐 Conexión restaurada - Sincronizando datos...', 'success');
    
    // Recargar datos después de un breve delay
    setTimeout(async () => {
      try {
        await renderPacientesRegistrados();
        mostrarMensajeConexion('✅ Datos sincronizados correctamente', 'success');
      } catch (error) {
        console.error('Error recargando datos:', error);
        mostrarMensajeConexion('⚠️ Error al sincronizar datos', 'error');
      }
    }, 2000);
  });
}

function mostrarMensajeConexion(mensaje, tipo = 'info') {
  // Crear o actualizar elemento de mensaje
  let messageElement = document.getElementById('paciente-connection-message');
  
  if (!messageElement) {
    messageElement = document.createElement('div');
    messageElement.id = 'paciente-connection-message';
    messageElement.style.cssText = `
      position: fixed;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      font-weight: 600;
      font-size: 14px;
      opacity: 0;
      transition: all 0.3s ease;
      pointer-events: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(messageElement);
  }

  const colors = {
    success: 'linear-gradient(135deg, #10b981, #059669)',
    warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
    error: 'linear-gradient(135deg, #ef4444, #dc2626)',
    info: 'linear-gradient(135deg, #3b82f6, #2563eb)'
  };

  messageElement.style.background = colors[tipo];
  messageElement.innerHTML = mensaje;
  messageElement.style.opacity = '1';
  messageElement.style.transform = 'translateX(-50%) translateY(0)';

  // Auto-ocultar después de 4 segundos (excepto warnings)
  if (tipo !== 'warning') {
    setTimeout(() => {
      messageElement.style.opacity = '0';
      messageElement.style.transform = 'translateX(-50%) translateY(-10px)';
    }, 4000);
  }
}