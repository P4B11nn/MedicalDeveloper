// js/views/pacienteView.js


//Vista para la gestión de pacientes

// Imports necesarios (descomentar cuando se implementen)
// import { pacienteModel } from '../models/pacienteModel.js';
// import { authModel } from '../models/storageModel.js';

// "Mini-Modelo" para facultades y carreras.
// Se puede editar manualmente para agregar más.
const facultadesYCarreras = {
  "Facultad de Medicina de Tampico": [
    "Médico Cirujano"
  ],
  "Facultad de Enfermería de Tampico": [
    "Licenciatura en Enfermería"
  ],
  "Facultad de Odontología de Tampico": [
    "Médico Cirujano Dentista"
  ],
  "Facultad de Comercio y Administración de Tampico": [
    "Lic. en Administración",
    "Lic. en Contaduría Pública",
    "Lic. en Negocios Internacionales"
  ]
};

// TODO: Implementar funciones de la vista
export function renderHistorialMedico() {
  const section = document.getElementById('historial-section');
  if (!section) return;
  
  const html = `
    <div class="content-title">
      <i class="fas fa-file-medical-alt"></i>
      Historial Médico
    </div>
    
    <div class="historial-container">
      <div class="historial-filters">
        <div class="form-row">
          <div class="form-group col-md-4">
            <label for="filtroFechaPaciente">Filtrar por fecha:</label>
            <input type="date" id="filtroFechaPaciente" name="filtroFechaPaciente">
          </div>
          <div class="form-group col-md-4">
            <label for="filtroPacienteHistorial">Filtrar por paciente:</label>
            <select id="filtroPacienteHistorial" name="filtroPacienteHistorial">
              <option value="">Todos los pacientes</option>
            </select>
          </div>
          <div class="form-group col-md-4">
            <button class="btn-secondary" onclick="limpiarFiltrosHistorial()">
              🧹 Limpiar filtros
            </button>
          </div>
        </div>
      </div>
      
      <div class="historial-list" id="historialList">
        <!-- Contenido dinámico -->
      </div>
    </div>
  `;
  
  section.innerHTML = html;
}

export function renderPacienteForm() {
  const section = document.getElementById('nuevo-paciente-section');
  if (!section) return;
  
  const html = `
    <div class="content-title">
      <i class="fas fa-user-plus"></i>
      Registro de Nuevo Paciente
    </div>
    
    <form id="formNuevoPaciente" class="form-container">
      <div class="form-row">
        <div class="form-group col-md-6">
          <label for="matricula">Matrícula:</label>
          <input type="text" id="matricula" name="matricula" placeholder="Ej: EST001" required>
        </div>
        <div class="form-group col-md-6">
          <label for="nombres">Nombre(s):</label>
          <input type="text" id="nombres" name="nombres" placeholder="Nombre completo" required>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group col-md-6">
          <label for="apellidos">Apellidos:</label>
          <input type="text" id="apellidos" name="apellidos" placeholder="Apellidos completos" required>
        </div>
        <div class="form-group col-md-6">
          <label for="fechaNacimiento">Fecha de Nacimiento:</label>
          <input type="date" id="fechaNacimiento" name="fechaNacimiento" required>
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
          <input type="text" id="grupo" name="grupo" placeholder="Ej: Grupo I" required>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group col-md-6">
          <label for="telefono">Teléfono:</label>
          <input type="tel" id="telefono" name="telefono" placeholder="Ej: 5551234567" required>
        </div>
        <div class="form-group col-md-6">
          <label for="antecedentes">Antecedentes Médicos (opcional):</label>
          <textarea id="antecedentes" name="antecedentes" rows="3"></textarea>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group col-md-6">
          <label for="facultad">Facultad:</label>
          <select id="facultad" name="facultad" required>
            <option value="">Seleccione una facultad</option>
          </select>
        </div>
        <div class="form-group col-md-6">
          <label for="carrera">Carrera:</label>
          <select id="carrera" name="carrera" required disabled>
            <option value="">Seleccione una carrera</option>
          </select>
        </div>
      </div>
      
      <div class="form-actions">
        <button type="reset" class="btn-secondary">Limpiar</button>
        <button type="submit" class="btn-primary">Registrar Paciente</button>
      </div>
    </form>
  `;
  
  section.innerHTML = html;

  // --- LÓGICA DE JAVASCRIPT PARA FACULTADES Y CARRERAS ---
  const facultadSelect = document.getElementById('facultad');
  const carreraSelect = document.getElementById('carrera');

  // Poblar el select de facultades
  Object.keys(facultadesYCarreras).forEach(facultad => {
    facultadSelect.add(new Option(facultad, facultad));
  });

  // Event listener para cambio de facultad
  facultadSelect.addEventListener('change', () => {
    const facultadSeleccionada = facultadSelect.value;
    carreraSelect.innerHTML = '<option value="">Seleccione una carrera</option>';

    if (facultadSeleccionada && facultadesYCarreras[facultadSeleccionada]) {
      carreraSelect.disabled = false;
      facultadesYCarreras[facultadSeleccionada].forEach(carrera => {
        carreraSelect.add(new Option(carrera, carrera));
      });
    } else {
      carreraSelect.disabled = true;
    }
  });
  // --- FIN DE LA LÓGICA ---

  // Configurar el evento de envío del formulario
  const formNuevoPaciente = document.getElementById('formNuevoPaciente');
  if (formNuevoPaciente) {
    formNuevoPaciente.addEventListener('submit', event => {
      import('../controllers/pacienteController.js').then(module => {
        module.handlePacienteSubmit(event);
      });
    });
  }
}

export function renderCitas() {
  const section = document.getElementById('citas-section');
  if (!section) return;
  
  const html = `
    <div class="content-title">
      <i class="fas fa-calendar-plus"></i>
      Gestión de Citas
    </div>
    
    <div class="citas-container">
      <div class="form-container">
        <form id="formNuevaCita">
          <div class="form-row">
            <div class="form-group col-md-6">
              <label for="pacienteCita">Paciente:</label>
              <select id="pacienteCita" name="pacienteCita" required>
                <option value="">Seleccione un paciente</option>
              </select>
            </div>
            <div class="form-group col-md-6">
              <label for="fechaCita">Fecha y Hora:</label>
              <input type="datetime-local" id="fechaCita" name="fechaCita" required>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group col-md-12">
              <label for="motivoCita">Motivo de la cita:</label>
              <textarea id="motivoCita" name="motivoCita" rows="3" required></textarea>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="reset" class="btn-secondary">Limpiar</button>
            <button type="submit" class="btn-primary">Programar Cita</button>
          </div>
        </form>
      </div>
      
      <div class="citas-list" id="citasList">
        <!-- Lista de citas programadas -->
      </div>
    </div>
  `;
  
  section.innerHTML = html;
}
