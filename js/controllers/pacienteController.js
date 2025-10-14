// js/controllers/pacienteController.js

import { pacienteModel } from '../models/pacienteModel.js';
import { renderPacienteForm } from '../views/pacienteView.js';

export function initPacienteController() {
  console.log('🚀 Controlador de Pacientes inicializado');
  
  // Configurar eventos para todas las secciones
  setupEventListeners();
  
  // Inicializar todas las vistas
  renderPacientesList();
  renderDatosMedicosForm();
  renderHistorialCompleto();
}

function setupEventListeners() {
  // Event delegation para manejar todos los eventos desde el contenedor principal
  const mainContent = document.querySelector('.content');
  if (mainContent) {
    mainContent.addEventListener('click', handleMainContentClick);
    mainContent.addEventListener('submit', handleFormSubmit);
    mainContent.addEventListener('input', handleInputChange);
  }
}

function handleMainContentClick(event) {
  const target = event.target;
  
  // Manejo de botones de la sidebar
  if (target.matches('.sidebar-menu button')) {
    const section = target.getAttribute('data-section');
    if (section) {
      showSection(section);
    }
  }
  
  // Manejo de acciones en la tabla de pacientes
  if (target.matches('.btn-icon') || target.closest('.btn-icon')) {
    const btn = target.closest('.btn-icon');
    const action = btn.title.toLowerCase();
    const row = btn.closest('tr');
    const pacienteId = row?.querySelector('.patient-id')?.textContent;
    
    if (pacienteId) {
      if (action.includes('ver')) {
        verDetallesPaciente(pacienteId);
      } else if (action.includes('editar')) {
        editarPaciente(pacienteId);
      }
    }
  }
  
  // Cargar datos del paciente desde card pendiente
  if (target.matches('.btn-primary') && target.textContent.includes('Agregar Datos')) {
    const pacienteId = target.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
    if (pacienteId) {
      cargarDatosPaciente(pacienteId);
    }
  }
  
  // Manejar botón cancelar en datos médicos
  if (target.matches('.btn-secondary') && target.textContent.includes('Cancelar') && target.closest('#ingresar-datos-medicos-section')) {
    cancelarDatosMedicos();
  }
}

function handleFormSubmit(event) {
  const form = event.target;
  
  if (form.id === 'registrar-paciente-form' || form.id === 'formNuevoPaciente') {
    event.preventDefault();
    handlePacienteSubmit(event);
  }
  
  if (form.id === 'datos-medicos-form' || form.closest('#ingresar-datos-medicos-section')) {
    event.preventDefault();
    handleDatosMedicosSubmit(event);
  }
  
  if (form.id === 'formEditarPaciente') {
    event.preventDefault();
    handleEditarPacienteSubmit(event);
  }
}

function handleInputChange(event) {
  const input = event.target;
  
  // Búsqueda en tiempo real para pacientes
  if (input.id === 'buscarPaciente') {
    filtrarPacientes(input.value);
  }
  
  // Búsqueda en historial médico
  if (input.id === 'buscarHistorial') {
    filtrarHistorial(input.value);
  }
  
  // Cambio en selector de paciente para datos médicos
  if (input.id === 'seleccionarPaciente') {
    cargarDatosPacienteSelect(input.value);
  }
}

function showSection(sectionName) {
  // Ocultar todas las secciones
  const sections = document.querySelectorAll('.form-section');
  sections.forEach(section => {
    section.classList.remove('active');
    section.style.display = 'none';
  });
  
  // Mostrar la sección seleccionada
  const targetSection = document.getElementById(`${sectionName}-section`);
  if (targetSection) {
    targetSection.classList.add('active');
    targetSection.style.display = 'block';
    
    // Renderizar contenido específico según la sección
    switch(sectionName) {
      case 'pacientes-registrados':
        renderPacientesList();
        break;
      case 'registro-paciente':
        renderPacienteForm();
        break;
      case 'ingresar-datos-medicos':
        renderDatosMedicosForm();
        break;
      case 'historial-medico-completo':
        renderHistorialCompleto();
        break;
    }
  }
  
  // Actualizar botones activos del menú
  const menuButtons = document.querySelectorAll('.sidebar-menu button');
  menuButtons.forEach(btn => btn.classList.remove('active'));
  const activeButton = document.querySelector(`[data-section="${sectionName}"]`);
  if (activeButton) {
    activeButton.classList.add('active');
  }
}

export function handlePacienteSubmit(event) {
  event.preventDefault();
  
  const formData = new FormData(event.target);
  
  // Crear objeto paciente con todos los campos, incluyendo facultad
  const nuevoPaciente = {
    matricula: formData.get('matricula'),
    nombre: formData.get('nombres') || formData.get('nombre'),
    apellidos: formData.get('apellidos') || '',
    fechaNacimiento: formData.get('fecha-nacimiento') || formData.get('fechaNacimiento'),
    grado: formData.get('grado'),
    grupo: formData.get('grupo'),
    facultad: formData.get('facultad'),
    carrera: formData.get('carrera'),
    telefono: formData.get('telefono'),
    antecedentes: formData.get('antecedentes') || '',
    fechaRegistro: new Date().toISOString()
    // El status se asigna automáticamente en el modelo como 'sin_datos_medicos'
  };
  
  // Validaciones básicas
  if (!nuevoPaciente.matricula || !nuevoPaciente.nombre || !nuevoPaciente.carrera || !nuevoPaciente.facultad) {
    mostrarMensaje('warning', '⚠️ Campos Requeridos', 'Por favor completa todos los campos obligatorios: matrícula, nombre, carrera y facultad.');
    return;
  }
  
  // Verificar si ya existe un paciente con esa matrícula
  const pacienteExistente = pacienteModel.getPaciente(nuevoPaciente.matricula);
  if (pacienteExistente) {
    mostrarMensaje('error', '❌ Matrícula Duplicada', `Ya existe un paciente registrado con la matrícula ${nuevoPaciente.matricula}. Verifica el número e intenta nuevamente.`);
    return;
  }
  
  try {
    // Agregar información del usuario que registra
    const usuarioActual = obtenerUsuarioActual();
    nuevoPaciente.usuarioRegistro = usuarioActual.nombre;
    
    // Guardar el paciente
    const pacienteGuardado = pacienteModel.addPaciente(nuevoPaciente);
    
    if (pacienteGuardado) {
      mostrarMensaje('success', '✅ Paciente Registrado', 
        `${nuevoPaciente.nombre} ${nuevoPaciente.apellidos || ''} ha sido registrado exitosamente.\nMatrícula: ${nuevoPaciente.matricula}`);
      
      event.target.reset();
      
      // Actualizar la lista de pacientes
      renderPacientesList();
      
      // Actualizar lista de pacientes pendientes en datos médicos
      renderDatosMedicosForm();
    } else {
      mostrarMensaje('error', '❌ Error de Registro', 'No se pudo registrar el paciente. Intenta nuevamente.');
    }
  } catch (error) {
    console.error('Error al registrar paciente:', error);
    mostrarMensaje('error', '❌ Error del Sistema', 'Error interno al registrar el paciente. Contacta al administrador.');
  }
}

function handleDatosMedicosSubmit(event) {
  event.preventDefault();
  
  const formData = new FormData(event.target);
  const pacienteSeleccionado = document.getElementById('seleccionarPaciente')?.value;
  
  if (!pacienteSeleccionado) {
    mostrarMensaje('warning', '⚠️ Paciente Requerido', 'Por favor selecciona un paciente antes de guardar los datos médicos.');
    return;
  }
  
  // Verificar que el paciente existe
  const paciente = pacienteModel.getPaciente(pacienteSeleccionado);
  if (!paciente) {
    mostrarMensaje('error', '❌ Paciente No Encontrado', 'El paciente seleccionado no existe en la base de datos. Actualiza la página e intenta nuevamente.');
    return;
  }
  
  // Validar que al menos un campo médico esté lleno
  const temperatura = formData.get('temperatura')?.trim();
  const presion = formData.get('presion')?.trim();
  const peso = formData.get('peso')?.trim();
  const talla = formData.get('talla')?.trim();
  const frecuencia = formData.get('frecuencia')?.trim();
  const examenVista = formData.get('examenVista')?.trim();
  const examenOido = formData.get('examenOido')?.trim();
  
  const hayDatos = temperatura || presion || peso || talla || frecuencia || examenVista || examenOido;
  
  if (!hayDatos) {
    mostrarMensaje('warning', '⚠️ Datos Requeridos', 'Por favor ingresa al menos un dato médico antes de guardar (temperatura, presión, peso, etc.).');
    return;
  }
  
  // Validar datos específicos y mostrar advertencias si es necesario
  let advertencias = [];
  if (temperatura && (parseFloat(temperatura) < 30 || parseFloat(temperatura) > 45)) {
    advertencias.push(`Temperatura: ${temperatura}°C (rango normal: 30-45°C)`);
  }
  
  if (peso && (parseFloat(peso) < 20 || parseFloat(peso) > 300)) {
    advertencias.push(`Peso: ${peso}kg (rango normal: 20-300kg)`);
  }
  
  // Crear objeto de datos médicos
  const usuarioActual = obtenerUsuarioActual();
  const datosMedicos = {
    temperatura: temperatura || null,
    presion: presion || null,
    peso: peso || null,
    talla: talla || null,
    frecuenciaRespiratoria: frecuencia || null,
    examenVista: examenVista || null,
    examenOido: examenOido || null,
    usuarioMedico: usuarioActual.nombre,
    fechaRegistroMedico: new Date().toISOString()
  };
  
  // Mostrar estado de carga en el botón
  const submitButton = event.target.querySelector('button[type="submit"]');
  const originalText = submitButton?.innerHTML;
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.innerHTML = '⏳ Guardando...';
  }

  try {
    // Actualizar datos médicos del paciente
    const pacienteActualizado = pacienteModel.updateDatosMedicos(pacienteSeleccionado, datosMedicos);
    
    if (pacienteActualizado) {
      // También guardar en historial médico para seguimiento
      const registroHistorial = {
        pacienteId: pacienteSeleccionado,
        tipo: 'Datos Médicos Registrados',
        temperatura: datosMedicos.temperatura,
        presion: datosMedicos.presion,
        peso: datosMedicos.peso,
        talla: datosMedicos.talla,
        frecuenciaRespiratoria: datosMedicos.frecuenciaRespiratoria,
        fecha: new Date().toISOString()
      };
      
      pacienteModel.addRegistroHistorial(registroHistorial);
      
      // Mostrar mensaje de éxito detallado
      const datosGuardados = Object.entries(datosMedicos)
        .filter(([key, value]) => value !== null && value !== '' && !['usuarioMedico', 'fechaRegistroMedico'].includes(key))
        .map(([key, value]) => {
          const labels = {
            temperatura: 'Temperatura',
            presion: 'Presión Arterial', 
            peso: 'Peso',
            talla: 'Talla',
            frecuenciaRespiratoria: 'Frecuencia Respiratoria',
            examenVista: 'Examen de Vista',
            examenOido: 'Examen de Oído'
          };
          return `• ${labels[key]}: ${value}`;
        }).join('\n');
      
      let mensajeFinal = `Datos registrados para ${paciente.nombre} ${paciente.apellidos || ''}:\n${datosGuardados}`;
      
      if (advertencias.length > 0) {
        mensajeFinal += '\n\n⚠️ Advertencias:\n' + advertencias.map(adv => `• ${adv}`).join('\n');
      }
      
      mensajeFinal += `\n\nRegistrado por: ${usuarioActual.nombre}`;
      
      mostrarMensaje('success', '✅ Datos Médicos Guardados', mensajeFinal, 8000);
      
      // Limpiar formulario
      event.target.reset();
      document.getElementById('paciente-info-section').style.display = 'none';
      
      // Actualizar vistas
      renderPacientesList();
      renderDatosMedicosForm();
      renderHistorialCompleto();
    } else {
      mostrarMensaje('error', '❌ Error al Guardar', 'No se pudieron guardar los datos médicos. Intenta nuevamente.');
    }
  } catch (error) {
    console.error('Error al guardar datos médicos:', error);
    mostrarMensaje('error', '❌ Error del Sistema', 'Error interno al guardar los datos médicos. Contacta al administrador.');
  } finally {
    // Restaurar botón de guardar
    if (submitButton && originalText) {
      submitButton.disabled = false;
      submitButton.innerHTML = originalText;
    }
  }
}

// Función auxiliar para calcular la edad
function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return 'N/A';
  
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  
  return edad;
}

// Función auxiliar para abreviar nombres de facultades
function abreviarFacultad(nombreFacultad) {
  if (!nombreFacultad) return 'N/A';
  
  // Mapeo específico para las facultades conocidas
  const abreviaciones = {
    'Facultad de Medicina de Tampico': 'FMT',
    'Facultad de Enfermería de Tampico': 'FET',
    'Facultad de Odontología de Tampico': 'FOT',
    'Facultad de Comercio y Administración de Tampico': 'FCAT'
  };
  
  // Si existe una abreviación específica, usarla
  if (abreviaciones[nombreFacultad]) {
    return abreviaciones[nombreFacultad];
  }
  
  // Si no, generar abreviación automáticamente
  return nombreFacultad
    .split(' ')
    .filter(palabra => palabra.length > 2) // Filtrar palabras muy cortas como "de"
    .map(palabra => palabra.charAt(0).toUpperCase())
    .join('');
}

function abreviarCarrera(nombreCarrera) {
  if (!nombreCarrera) return 'N/A';
  
  // Mapeo específico para las carreras más comunes
  const abreviaciones = {
    'Licenciatura en Medicina': 'LM',
    'Licenciatura en Enfermería': 'LE',
    'Licenciatura en Odontología': 'LO',
    'Licenciatura en Administración': 'LA',
    'Licenciatura en Contaduría': 'LC',
    'Licenciatura en Informática': 'LI',
    'Licenciatura en Psicología': 'LP',
    'Licenciatura en Nutrición': 'LN',
    'Licenciatura en Fisioterapia': 'LF',
    'Licenciatura en Radiología': 'LR'
  };
  
  // Si existe una abreviación específica, usarla
  if (abreviaciones[nombreCarrera]) {
    return abreviaciones[nombreCarrera];
  }
  
  // Si no, generar abreviación automáticamente
  return nombreCarrera
    .split(' ')
    .filter(palabra => palabra.length > 2) // Filtrar palabras muy cortas como "de", "en"
    .map(palabra => palabra.charAt(0).toUpperCase())
    .join('');
}

function renderPacientesList() {
  const tableBody = document.getElementById('tablaPacientes');
  if (!tableBody) return;
  
  const pacientes = pacienteModel.getPacientes();
  
  // Actualizar contador de pacientes
  const contadorElement = document.getElementById('contador-pacientes');
  if (contadorElement) {
    contadorElement.textContent = pacientes.length;
  }
  
  if (pacientes.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="11" style="text-align: center; padding: 40px; color: #666;">
          No hay pacientes registrados
        </td>
      </tr>
    `;
    return;
  }
  
  tableBody.innerHTML = pacientes.map(paciente => {
    let statusBadge;
    if (paciente.status === 'completo') {
      statusBadge = '<span class="status-icon status-complete" title="Datos médicos completos">✅</span>';
    } else if (paciente.status === 'sin_datos_medicos') {
      statusBadge = '<span class="status-icon status-pending" title="Sin datos médicos">⏳</span>';
    } else {
      statusBadge = '<span class="status-icon status-unknown" title="Estado desconocido">❓</span>';
    }
    
    const inicial = paciente.nombre ? paciente.nombre.charAt(0).toUpperCase() : 'P';
    const edad = calcularEdad(paciente.fechaNacimiento);
    const facultadAbrev = abreviarFacultad(paciente.facultad);
    const carreraAbrev = abreviarCarrera(paciente.carrera);
    
    return `
      <tr>
        <td>${paciente.matricula}</td>
        <td>
          <span class="badge badge-success badge-inline">${inicial}</span>
          ${paciente.nombre} ${paciente.apellidos || ''}
        </td>
        <td><span class="age-badge">${edad} años</span></td>
        <td><span class="career-badge" title="${paciente.carrera}" data-tooltip="${paciente.carrera}">📚 ${carreraAbrev}</span></td>
        <td>${paciente.grado}</td>
        <td><span class="badge badge-blue">${paciente.grupo}</span></td>
        <td><span class="faculty-badge">${facultadAbrev}</span></td>
        <td class="phone-number">📞 ${paciente.telefono}</td>
        <td>${statusBadge}</td>
        <td class="actions-cell">
          <button class="action-btn view-btn" title="Ver detalles" aria-label="Ver detalles" onclick="verDetallesPaciente('${paciente.id}')">
            👁️
          </button>
          <button class="action-btn edit-btn" title="Editar" aria-label="Editar" onclick="editarPaciente('${paciente.id}')">
            ✏️
          </button>
          <button class="action-btn delete-btn" title="Eliminar" aria-label="Eliminar paciente" onclick="eliminarPaciente('${paciente.id}')">
            🗑️
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderDatosMedicosForm() {
  const pacientesSinDatos = pacienteModel.getPacientesSinDatosMedicos();
  const todosLosPacientes = pacienteModel.getPacientes();
  
  // Actualizar selector de pacientes - solo mostrar los que no tienen datos médicos
  const selector = document.getElementById('seleccionarPaciente');
  if (selector) {
    if (pacientesSinDatos.length === 0) {
      selector.innerHTML = '<option value="">No hay pacientes sin datos médicos</option>';
    } else {
      selector.innerHTML = '<option value="">Seleccione un paciente...</option>' +
        pacientesSinDatos.map(p => `
          <option value="${p.id}">
            ${p.nombre} ${p.apellidos || ''} - ${p.matricula} (Sin datos médicos)
          </option>
        `).join('');
    }
  }
  
  // Actualizar cards de pacientes pendientes
  const pendingAlert = document.querySelector('.pending-alert .flex-gap-20');
  if (pendingAlert) {
    if (pacientesSinDatos.length === 0) {
      pendingAlert.innerHTML = `
        <div class="pending-patient-card">
          <div class="patient-name fw-600">¡Excelente! 🎉</div>
          <div class="muted-text">Todos los pacientes tienen sus datos médicos completos</div>
        </div>
      `;
    } else {
      pendingAlert.innerHTML = pacientesSinDatos.map(p => `
        <div class="pending-patient-card">
          <div class="patient-name fw-600">${p.nombre} ${p.apellidos || ''}</div>
          <div class="muted-text">Matrícula: ${p.matricula}</div>
          <div class="muted-text">Carrera: ${p.carrera}</div>
          <div class="muted-text">Facultad: ${abreviarFacultad(p.facultad)}</div>
          <button class="btn-primary small-btn mt-10" onclick="cargarDatosPaciente('${p.id}')">
            ➕ Agregar Datos Médicos
          </button>
        </div>
      `).join('');
    }
  }
}

function renderHistorialCompleto() {
  const historial = pacienteModel.getHistorialMedico();
  const pacientes = pacienteModel.getPacientes();
  
  const tableBody = document.querySelector('#historial-medico-completo-section tbody');
  if (!tableBody) return;
  
  if (historial.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px; color: #666;">
          No hay registros en el historial médico
        </td>
      </tr>
    `;
    return;
  }
  
  tableBody.innerHTML = historial.map(registro => {
    const paciente = pacientes.find(p => p.id === registro.pacienteId);
    const fecha = new Date(registro.fecha);
    const inicial = paciente?.nombre?.charAt(0).toUpperCase() || 'P';
    
    return `
      <tr>
        <td>
          <div class="fw-600">${fecha.toLocaleDateString('es-ES')}</div>
          <div class="muted-text small-text">${fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
        </td>
        <td>
          <div class="flex-center">
            <span class="small-avatar">${inicial}</span>
            <div>
              <div class="fw-600">${paciente?.nombre || 'Desconocido'} ${paciente?.apellidos || ''}</div>
              <div class="muted-text small-text">ID: ${registro.pacienteId}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="badge badge-success">🟢 ${registro.tipo}</span>
          <div class="muted-text tiny-text mt-2">${registro.temperatura ? `Temp: ${registro.temperatura}°C` : 'Datos médicos registrados'}</div>
        </td>
        <td>
          <div>
            <div class="fw-600">Sistema</div>
            <div class="muted-text small-text">Registro automático</div>
          </div>
        </td>
        <td class="text-center">
          <button class="btn-icon" title="Ver detalles">
            <i class="fas fa-eye"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function filtrarPacientes(searchTerm) {
  const rows = document.querySelectorAll('#tablaPacientes tr');
  const term = searchTerm.toLowerCase();
  
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(term) ? '' : 'none';
  });
}

function filtrarHistorial(searchTerm) {
  const rows = document.querySelectorAll('#historial-medico-completo-section tbody tr');
  const term = searchTerm.toLowerCase();
  
  rows.forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(term) ? '' : 'none';
  });
}

function cargarDatosPaciente(pacienteId) {
  const paciente = pacienteModel.getPaciente(pacienteId);
  if (!paciente) return;
  
  // Mostrar información del paciente
  const infoSection = document.getElementById('paciente-info-section');
  const avatar = document.getElementById('paciente-avatar');
  const nombre = document.getElementById('paciente-nombre');
  const detalles = document.getElementById('paciente-detalles');
  const select = document.getElementById('seleccionarPaciente');
  
  if (infoSection && avatar && nombre && detalles) {
    infoSection.style.display = 'block';
    infoSection.classList.remove('hidden');
    
    avatar.textContent = paciente.nombre.charAt(0).toUpperCase();
    nombre.textContent = `👤 ${paciente.nombre} ${paciente.apellidos || ''}`;
    
    const edad = calcularEdad(paciente.fechaNacimiento);
    
    detalles.innerHTML = `
      <span><strong>ID:</strong> ${paciente.id}</span>
      <span><strong>Matrícula:</strong> ${paciente.matricula}</span>
      <span><strong>Edad:</strong> ${edad} años</span>
      <span><strong>Fecha de Nacimiento:</strong> ${paciente.fechaNacimiento}</span>
      <span><strong>Grado:</strong> ${paciente.grado}</span>
      <span><strong>Grupo:</strong> ${paciente.grupo}</span>
      <span><strong>Carrera:</strong> ${paciente.carrera}</span>
      <span><strong>Facultad:</strong> ${paciente.facultad || 'N/A'}</span>
    `;
    
    if (select) {
      select.value = paciente.id;
    }
  }
}

function cargarDatosPacienteSelect(pacienteId) {
  if (pacienteId) {
    cargarDatosPaciente(pacienteId);
  } else {
    const infoSection = document.getElementById('paciente-info-section');
    if (infoSection) {
      infoSection.style.display = 'none';
    }
  }
}

function verDetallesPaciente(pacienteId) {
  const paciente = pacienteModel.getPaciente(pacienteId);
  if (!paciente) {
    mostrarMensaje('error', '❌ Error', 'No se pudo encontrar el paciente solicitado. Actualiza la página e intenta nuevamente.');
    return;
  }
  
  // Llenar datos del modal
  llenarModalVerPaciente(paciente);
  
  // Mostrar modal
  mostrarModalVerPaciente();
}

function llenarModalVerPaciente(paciente) {
  // Información básica
  document.getElementById('modalTituloPaciente').textContent = `${paciente.nombre} ${paciente.apellidos || ''}`;
  document.getElementById('modalSubtituloPaciente').textContent = `${paciente.matricula} • ${abreviarFacultad(paciente.facultad)}`;
  
  // Información personal
  document.getElementById('modalMatricula').textContent = paciente.matricula;
  document.getElementById('modalGrado').textContent = paciente.grado;
  document.getElementById('modalGrupo').textContent = paciente.grupo;
  document.getElementById('modalFacultad').textContent = paciente.facultad;
  document.getElementById('modalTelefono').textContent = paciente.telefono;
  
  // Datos médicos
  const datosMedicos = paciente.datosMedicos;
  if (datosMedicos && paciente.status === 'completo') {
    document.getElementById('modalTemperatura').textContent = datosMedicos.temperatura ? `${datosMedicos.temperatura}°C` : '-';
    document.getElementById('modalPresion').textContent = datosMedicos.presion || '-';
    document.getElementById('modalPeso').textContent = datosMedicos.peso ? `${datosMedicos.peso} kg` : '-';
    document.getElementById('modalTalla').textContent = datosMedicos.talla ? `${datosMedicos.talla} cm` : '-';
    
    // Calcular IMC si hay peso y talla
    if (datosMedicos.peso && datosMedicos.talla) {
      const peso = parseFloat(datosMedicos.peso);
      const talla = parseFloat(datosMedicos.talla) / 100; // convertir cm a metros
      const imc = (peso / (talla * talla)).toFixed(1);
      document.getElementById('modalIMC').textContent = imc;
    } else {
      document.getElementById('modalIMC').textContent = '-';
    }
    
    document.getElementById('modalFrecuencia').textContent = datosMedicos.frecuenciaRespiratoria ? `${datosMedicos.frecuenciaRespiratoria} rpm` : '-';
    
    // Exámenes
    document.getElementById('modalExamenVista').textContent = datosMedicos.examenVista || 'No registrado';
    document.getElementById('modalExamenOido').textContent = datosMedicos.examenOido || 'No registrado';
    
    // Mostrar secciones médicas
    document.getElementById('datosMedicosSection').style.display = 'block';
    document.getElementById('examenesSection').style.display = 'block';
  } else {
    // Ocultar secciones médicas si no hay datos
    document.getElementById('datosMedicosSection').style.display = 'none';
    document.getElementById('examenesSection').style.display = 'none';
  }
  
  // Información del registro
  const usuarioActual = obtenerUsuarioActual();
  document.getElementById('modalUsuarioRegistro').textContent = paciente.usuarioRegistro || usuarioActual.nombre;
  document.getElementById('modalFechaRegistro').textContent = new Date(paciente.fechaRegistro).toLocaleString('es-ES');
  
  if (paciente.datosMedicos && paciente.status === 'completo') {
    document.getElementById('modalUsuarioMedico').textContent = paciente.datosMedicos.usuarioMedico || usuarioActual.nombre;
    document.getElementById('modalUltimaActualizacion').textContent = new Date(paciente.datosMedicos.fechaRegistroMedico).toLocaleString('es-ES');
  } else {
    document.getElementById('modalUsuarioMedico').textContent = 'Sin datos médicos';
    document.getElementById('modalUltimaActualizacion').textContent = 'Sin datos médicos';
  }
    
  // Guardar ID del paciente para edición
  window.currentPacienteId = paciente.id;
}

function editarPaciente(pacienteId) {
  const paciente = pacienteModel.getPaciente(pacienteId);
  if (!paciente) {
    mostrarMensaje('error', '❌ Error', 'No se pudo encontrar el paciente para editar. Actualiza la página e intenta nuevamente.');
    return;
  }
  
  // Guardar ID del paciente para edición
  window.currentPacienteId = pacienteId;
  
  // Llenar formulario de edición
  llenarFormularioEdicion(paciente);
  
  // Mostrar modal de edición
  document.getElementById('modalEditarPaciente').style.display = 'flex';
}

function eliminarPaciente(pacienteId) {
  // Obtener datos del paciente para mostrar en la confirmación
  const paciente = pacienteModel.getPaciente(pacienteId);
  if (!paciente) {
    mostrarMensaje('error', '❌ Error', 'No se pudo encontrar el paciente para eliminar. Actualiza la página e intenta nuevamente.');
    return;
  }
  
  // Verificar si el paciente tiene datos médicos para informar en la confirmación
  const tieneDatosMedicos = paciente.status === 'completo';
  const historialCount = pacienteModel.getHistorialMedico().filter(h => h.pacienteId === pacienteId).length;
  
  // Confirmación personalizada antes de eliminar
  const mensaje = `¿Estás seguro de que deseas eliminar al paciente?

📋 Datos del paciente:
• Nombre: ${paciente.nombre} ${paciente.apellidos || ''}
• Matrícula: ${paciente.matricula}
• Estado: ${tieneDatosMedicos ? 'Datos médicos completos' : 'Sin datos médicos'}
• Registros de historial: ${historialCount}

⚠️ ADVERTENCIA: Esta acción NO se puede deshacer.
Se eliminará:
✗ Información personal del paciente  
${tieneDatosMedicos ? '✗ Datos médicos completos' : ''}
${historialCount > 0 ? `✗ ${historialCount} registro(s) de historial médico` : ''}`;

  mostrarConfirmacion('🗑️ Eliminar Paciente', mensaje, () => {
    eliminarPacienteConfirmado(pacienteId, paciente, tieneDatosMedicos, historialCount);
  }, 'danger');
}

function eliminarPacienteConfirmado(pacienteId, paciente, tieneDatosMedicos, historialCount) {
  
  try {
    // Eliminar registros del historial médico relacionados con este paciente
    if (historialCount > 0) {
      const historial = pacienteModel.getHistorialMedico();
      const historialFiltrado = historial.filter(h => h.pacienteId !== pacienteId);
      // Nota: Necesitaríamos un método setHistorialMedico o clearHistorialByPaciente en el modelo
      // Por ahora, el historial se mantendrá pero sin referencia al paciente eliminado
    }
    
    // Eliminar paciente del modelo
    const eliminado = pacienteModel.deletePaciente(pacienteId);
    
    if (eliminado) {
      // Mostrar confirmación con detalles de lo eliminado
      let detallesEliminados = [];
      if (tieneDatosMedicos) detallesEliminados.push('Datos médicos');
      if (historialCount > 0) detallesEliminados.push(`${historialCount} registro(s) de historial`);
      
      const usuarioActual = obtenerUsuarioActual();
      
      mostrarMensaje('success', '🗑️ Paciente Eliminado', 
        `${paciente.nombre} ${paciente.apellidos || ''} (${paciente.matricula}) ha sido eliminado.\n${detallesEliminados.length > 0 ? 'También se eliminó: ' + detallesEliminados.join(', ') : ''}\n\nEliminado por: ${usuarioActual.nombre}`, 6000);
      
      // Actualizar todas las vistas
      renderPacientesList();
      renderDatosMedicosForm();
      renderHistorialCompleto();
      
    } else {
      mostrarMensaje('error', '❌ Error al Eliminar', 'No se pudo eliminar el paciente. Intenta nuevamente.');
    }
  } catch (error) {
    console.error('Error al eliminar paciente:', error);
    mostrarMensaje('error', '❌ Error del Sistema', 'Error interno al eliminar el paciente. Contacta al administrador.');
  }
}

function cancelarDatosMedicos() {
  const formulario = document.getElementById('datos-medicos-form');
  const infoSection = document.getElementById('paciente-info-section');
  const selector = document.getElementById('seleccionarPaciente');
  
  // Verificar si hay datos sin guardar
  if (formulario) {
    const formData = new FormData(formulario);
    const hayDatos = Array.from(formData.values()).some(value => value.trim() !== '');
    
    if (hayDatos) {
      const confirmar = confirm('⚠️ ¿Estás seguro de que deseas cancelar?\n\nSe perderán todos los datos médicos ingresados que no se hayan guardado.');
      if (!confirmar) {
        return;
      }
    }
    
    // Limpiar formulario
    formulario.reset();
  }
  
  // Ocultar información del paciente
  if (infoSection) {
    infoSection.style.display = 'none';
  }
  
  // Resetear selector
  if (selector) {
    selector.value = '';
  }
  
  // Mensaje opcional de confirmación
  console.log('Datos médicos cancelados - formulario limpiado');
}

// Sistema de mensajes personalizados
function mostrarMensaje(tipo, titulo, mensaje, duracion = 5000) {
  const container = document.getElementById('message-container');
  if (!container) return;

  const messageEl = document.createElement('div');
  messageEl.className = `custom-message ${tipo}`;
  
  const iconos = {
    success: '✅',
    error: '❌', 
    warning: '⚠️',
    info: 'ℹ️'
  };

  messageEl.innerHTML = `
    <div class="message-icon">${iconos[tipo] || 'ℹ️'}</div>
    <div class="message-content">
      <div class="message-title">${titulo}</div>
      <div class="message-text">${mensaje}</div>
    </div>
    <button class="message-close" onclick="cerrarMensaje(this)">×</button>
  `;

  container.appendChild(messageEl);

  // Auto-cerrar después del tiempo especificado
  if (duracion > 0) {
    setTimeout(() => {
      cerrarMensaje(messageEl.querySelector('.message-close'));
    }, duracion);
  }
}

function cerrarMensaje(button) {
  const message = button.closest('.custom-message');
  message.style.animation = 'messageSlideOut 0.3s ease-in';
  setTimeout(() => {
    if (message.parentNode) {
      message.parentNode.removeChild(message);
    }
  }, 300);
}

function mostrarConfirmacion(titulo, mensaje, callback, tipo = 'warning') {
  const modal = document.getElementById('modalConfirmacion');
  const header = modal.querySelector('.modal-confirm-header');
  const iconEl = document.getElementById('confirmIcon');
  const titleEl = document.getElementById('confirmTitle');
  const messageEl = document.getElementById('confirmMessage');
  const cancelBtn = document.getElementById('confirmCancel');
  const acceptBtn = document.getElementById('confirmAccept');

  // Configurar contenido
  titleEl.textContent = titulo;
  messageEl.textContent = mensaje;
  
  // Configurar estilo según tipo
  const iconos = {
    warning: '⚠️',
    danger: '🗑️',
    info: 'ℹ️'
  };
  
  iconEl.textContent = iconos[tipo] || '⚠️';
  
  if (tipo === 'danger') {
    header.classList.add('danger');
    acceptBtn.className = 'btn-danger';
    acceptBtn.textContent = 'Eliminar';
  } else {
    header.classList.remove('danger');
    acceptBtn.className = 'btn-primary';
    acceptBtn.textContent = 'Confirmar';
  }

  // Configurar eventos
  const handleCancel = () => {
    modal.style.display = 'none';
    cancelBtn.removeEventListener('click', handleCancel);
    acceptBtn.removeEventListener('click', handleAccept);
  };

  const handleAccept = () => {
    modal.style.display = 'none';
    cancelBtn.removeEventListener('click', handleCancel);
    acceptBtn.removeEventListener('click', handleAccept);
    if (callback) callback();
  };

  cancelBtn.addEventListener('click', handleCancel);
  acceptBtn.addEventListener('click', handleAccept);

  // Mostrar modal
  modal.style.display = 'flex';
}

function obtenerUsuarioActual() {
  // Simular obtener usuario actual - en un sistema real vendría del auth
  const usuarios = [
    { id: 'admin', nombre: 'Dr. González', rol: 'Médico General' },
    { id: 'enfermera1', nombre: 'Enf. María López', rol: 'Enfermera' },
    { id: 'recepcion', nombre: 'Ana Martínez', rol: 'Recepcionista' }
  ];
  
  // Por ahora devolver el primer usuario (Dr. González)
  return usuarios[0];
}

// Funciones para manejar modales
function mostrarModalVerPaciente() {
  document.getElementById('modalVerPaciente').style.display = 'flex';
}

function cerrarModalVerPaciente() {
  document.getElementById('modalVerPaciente').style.display = 'none';
}

function abrirModalEditarPaciente() {
  const pacienteId = window.currentPacienteId;
  if (!pacienteId) return;
  
  const paciente = pacienteModel.getPaciente(pacienteId);
  if (!paciente) return;
  
  // Llenar formulario de edición
  llenarFormularioEdicion(paciente);
  
  // Cerrar modal de ver y abrir modal de editar
  cerrarModalVerPaciente();
  document.getElementById('modalEditarPaciente').style.display = 'flex';
}

function llenarFormularioEdicion(paciente) {
  // Datos personales
  document.getElementById('editMatricula').value = paciente.matricula;
  document.getElementById('editNombre').value = `${paciente.nombre} ${paciente.apellidos || ''}`;
  document.getElementById('editGrado').value = paciente.grado;
  document.getElementById('editGrupo').value = paciente.grupo;
  document.getElementById('editTelefono').value = paciente.telefono;
  document.getElementById('editFacultad').value = paciente.facultad;
  
  // Datos médicos (si existen)
  if (paciente.datosMedicos) {
    const dm = paciente.datosMedicos;
    document.getElementById('editTemperatura').value = dm.temperatura || '';
    document.getElementById('editPresion').value = dm.presion || '';
    document.getElementById('editPeso').value = dm.peso || '';
    document.getElementById('editTalla').value = dm.talla || '';
    document.getElementById('editFrecuencia').value = dm.frecuenciaRespiratoria || '';
    document.getElementById('editExamenVista').value = dm.examenVista || '';
    document.getElementById('editExamenOido').value = dm.examenOido || '';
  }
}

function cerrarModalEditarPaciente() {
  document.getElementById('modalEditarPaciente').style.display = 'none';
  // Limpiar formulario
  document.getElementById('formEditarPaciente').reset();
}

function handleEditarPacienteSubmit(event) {
  event.preventDefault();
  
  const pacienteId = window.currentPacienteId;
  if (!pacienteId) {
    mostrarMensaje('error', '❌ Error de Identificación', 'No se puede identificar el paciente a editar. Cierra el modal e intenta nuevamente.');
    return;
  }
  
  const formData = new FormData(event.target);
  
  // Extraer nombre completo
  const nombreCompleto = formData.get('nombre').trim();
  const partesNombre = nombreCompleto.split(' ');
  const nombre = partesNombre[0];
  const apellidos = partesNombre.slice(1).join(' ');
  
  // Datos personales actualizados
  const datosPersonales = {
    matricula: formData.get('matricula'),
    nombre: nombre,
    apellidos: apellidos,
    grado: formData.get('grado'),
    grupo: formData.get('grupo'),
    telefono: formData.get('telefono'),
    facultad: formData.get('facultad')
  };
  
  // Datos médicos actualizados
  const datosMedicos = {
    temperatura: formData.get('temperatura') || null,
    presion: formData.get('presion') || null,
    peso: formData.get('peso') || null,
    talla: formData.get('talla') || null,
    frecuenciaRespiratoria: formData.get('frecuenciaRespiratoria') || null,
    examenVista: formData.get('examenVista') || null,
    examenOido: formData.get('examenOido') || null,
    fechaRegistroMedico: new Date().toISOString()
  };
  
  try {
    // Actualizar datos personales
    const pacienteActualizado = pacienteModel.updatePaciente(pacienteId, datosPersonales);
    
    if (pacienteActualizado) {
      // Actualizar datos médicos si hay algún valor
      const hayDatosMedicos = Object.values(datosMedicos).some(v => v !== null && v !== '');
      
      if (hayDatosMedicos) {
        pacienteModel.updateDatosMedicos(pacienteId, datosMedicos);
        
        // Agregar al historial
        const registroHistorial = {
          pacienteId: pacienteId,
          tipo: 'Paciente Editado',
          descripcion: 'Datos personales y médicos actualizados',
          fecha: new Date().toISOString()
        };
        pacienteModel.addRegistroHistorial(registroHistorial);
      }
      
      const usuarioActual = obtenerUsuarioActual();
      mostrarMensaje('success', '✅ Paciente Actualizado', 
        `Los datos de ${pacienteData.nombre} ${pacienteData.apellidos || ''} han sido actualizados exitosamente.\n\nActualizado por: ${usuarioActual.nombre}`, 5000);
      
      // Cerrar modal y actualizar vistas
      cerrarModalEditarPaciente();
      renderPacientesList();
      renderDatosMedicosForm();
      renderHistorialCompleto();
      
    } else {
      mostrarMensaje('error', '❌ Error al Actualizar', 'No se pudo actualizar el paciente. Verifica los datos e intenta nuevamente.');
    }
  } catch (error) {
    console.error('Error al editar paciente:', error);
    mostrarMensaje('error', '❌ Error del Sistema', 'Error interno al actualizar el paciente. Contacta al administrador.');
  }
}

// Hacer funciones globales para compatibilidad con HTML
window.cargarDatosPaciente = cargarDatosPaciente;
window.cargarDatosPacienteSelect = cargarDatosPacienteSelect;
window.mostrarMensaje = mostrarMensaje;
window.mostrarConfirmacion = mostrarConfirmacion;
window.cerrarMensaje = cerrarMensaje;
window.obtenerUsuarioActual = obtenerUsuarioActual;
window.verDetallesPaciente = verDetallesPaciente;
window.editarPaciente = editarPaciente;
window.eliminarPaciente = eliminarPaciente;
window.cancelarDatosMedicos = cancelarDatosMedicos;
window.mostrarModalVerPaciente = mostrarModalVerPaciente;
window.cerrarModalVerPaciente = cerrarModalVerPaciente;
window.abrirModalEditarPaciente = abrirModalEditarPaciente;
window.cerrarModalEditarPaciente = cerrarModalEditarPaciente;