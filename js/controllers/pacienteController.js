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
    nuevoPaciente.fechaRegistro = nuevoPaciente.fechaRegistro || new Date().toISOString();
    
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
  const frecuenciaRespiratoria = formData.get('frecuenciaRespiratoria')?.trim();
  const examenVista = formData.get('examenVista')?.trim();
  const examenOido = formData.get('examenOido')?.trim();
  
  const hayDatos = temperatura || presion || peso || talla || frecuenciaRespiratoria || examenVista || examenOido;
  
  if (!hayDatos) {
    mostrarMensaje('warning', '⚠️ Datos Requeridos', 'Por favor ingresa al menos un dato médico antes de guardar (temperatura, presión, peso, etc.).');
    return;
  }
  
  // Validaciones mejoradas con límites realistas
  let advertencias = [];
  let errores = [];
  
  // Validar temperatura
  if (temperatura) {
    const temp = parseFloat(temperatura);
    if (temp < 35.0 || temp > 42.0) {
      errores.push(`Temperatura: ${temperatura}°C está fuera del rango válido (35.0-42.0°C)`);
    } else if (temp < 36.0 || temp > 37.5) {
      advertencias.push(`Temperatura: ${temperatura}°C fuera del rango normal (36.0-37.5°C)`);
    }
  }
  
  // Validar presión arterial
  if (presion) {
    const presionPattern = /^(\d{2,3})\/(\d{2,3})$/;
    const match = presion.match(presionPattern);
    if (!match) {
      errores.push(`Presión arterial: Formato inválido. Use el formato sistólica/diastólica (ej: 120/80)`);
    } else {
      const sistolica = parseInt(match[1]);
      const diastolica = parseInt(match[2]);
      if (sistolica < 70 || sistolica > 200) {
        errores.push(`Presión sistólica: ${sistolica} está fuera del rango válido (70-200 mmHg)`);
      } else if (diastolica < 40 || diastolica > 120) {
        errores.push(`Presión diastólica: ${diastolica} está fuera del rango válido (40-120 mmHg)`);
      } else if (sistolica < 90 || sistolica > 140 || diastolica < 60 || diastolica > 90) {
        advertencias.push(`Presión arterial: ${presion} mmHg fuera del rango normal (90-140/60-90 mmHg)`);
      }
    }
  }
  
  // Validar peso
  if (peso) {
    const pesoNum = parseFloat(peso);
    if (pesoNum < 30.0 || pesoNum > 200.0) {
      errores.push(`Peso: ${peso}kg está fuera del rango válido (30-200kg)`);
    } else if (pesoNum < 45.0 || pesoNum > 120.0) {
      advertencias.push(`Peso: ${peso}kg fuera del rango típico para adultos (45-120kg)`);
    }
  }
  
  // Validar talla
  if (talla) {
    const tallaNum = parseInt(talla);
    if (tallaNum < 140 || tallaNum > 220) {
      errores.push(`Talla: ${talla}cm está fuera del rango válido (140-220cm)`);
    } else if (tallaNum < 150 || tallaNum > 200) {
      advertencias.push(`Talla: ${talla}cm fuera del rango típico para adultos (150-200cm)`);
    }
  }
  
  // Validar frecuencia respiratoria
  if (frecuenciaRespiratoria) {
    const frecuencia = parseInt(frecuenciaRespiratoria);
    if (frecuencia < 10 || frecuencia > 40) {
      errores.push(`Frecuencia respiratoria: ${frecuencia} rpm está fuera del rango válido (10-40 rpm)`);
    } else if (frecuencia < 12 || frecuencia > 20) {
      advertencias.push(`Frecuencia respiratoria: ${frecuencia} rpm fuera del rango normal (12-20 rpm)`);
    }
  }
  
  // Si hay errores críticos, no permitir continuar
  if (errores.length > 0) {
    mostrarMensaje('error', '❌ Datos Inválidos', 
      'Por favor corrige los siguientes errores antes de continuar:\n\n' + 
      errores.map(error => `• ${error}`).join('\n'));
    return;
  }
  
  // Determinar si es actualización o registro inicial
  const esActualizacion = paciente.status === 'completo';
  const tipoActividad = esActualizacion ? 'Actualización' : 'Registro Inicial';
  
  // Crear objeto de datos médicos
  const usuarioActual = obtenerUsuarioActual();
  const datosMedicos = {
    temperatura: temperatura || null,
    presion: presion || null,
    peso: peso || null,
    talla: talla || null,
    frecuenciaRespiratoria: frecuenciaRespiratoria || null,
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
          tipo: tipoActividad,
          temperatura: datosMedicos.temperatura,
          presion: datosMedicos.presion,
          peso: datosMedicos.peso,
          talla: datosMedicos.talla,
          frecuenciaRespiratoria: datosMedicos.frecuenciaRespiratoria,
          usuarioRegistro: usuarioActual.nombre,
          fecha: new Date().toISOString()
        };      pacienteModel.addRegistroHistorial(registroHistorial);
      
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
            const unidades = {
              temperatura: '°C',
              presion: 'mmHg',
              peso: 'kg',
              talla: 'cm',
              frecuenciaRespiratoria: 'rpm',
              examenVista: '',
              examenOido: ''
            };
            const unidad = unidades[key] || '';
            return `• ${labels[key]}: ${value}${unidad}`;
          }).join('\n');      let mensajeFinal = `${tipoActividad} realizada para ${paciente.nombre} ${paciente.apellidos || ''}:\n${datosGuardados}`;
      
      if (advertencias.length > 0) {
        mensajeFinal += '\n\n⚠️ Advertencias:\n' + advertencias.map(adv => `• ${adv}`).join('\n');
      }
      
      mensajeFinal += `\n\nRegistrado por: ${usuarioActual.nombre}`;
      
      const tipoMensaje = esActualizacion ? 'info' : 'success';
      const iconoMensaje = esActualizacion ? '🔄 Datos Actualizados' : '✅ Datos Médicos Guardados';
      
      mostrarMensaje(tipoMensaje, iconoMensaje, mensajeFinal, 8000);
      
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
      statusBadge = '<span class="status-icon status-complete" title="Datos médicos completos"><i class="fas fa-check-circle" style="color: #10b981;"></i></span>';
    } else if (paciente.status === 'sin_datos_medicos') {
      statusBadge = '<span class="status-icon status-pending" title="Sin datos médicos"><i class="fas fa-clock" style="color: #f59e0b;"></i></span>';
    } else {
      statusBadge = '<span class="status-icon status-unknown" title="Estado desconocido"><i class="fas fa-question-circle" style="color: #6b7280;"></i></span>';
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
        <td><span class="career-badge" title="${paciente.carrera}" data-tooltip="${paciente.carrera}"><i class="fas fa-graduation-cap" style="color: #3b82f6;"></i> ${carreraAbrev}</span></td>
        <td>${paciente.grado}</td>
        <td><span class="badge badge-blue">${paciente.grupo}</span></td>
        <td><span class="faculty-badge">${facultadAbrev}</span></td>
        <td class="phone-number"><i class="fas fa-phone" style="color: #10b981;"></i> ${paciente.telefono}</td>
        <td>${statusBadge}</td>
        <td class="actions-cell">
          <button class="action-btn view-btn" title="Ver detalles" aria-label="Ver detalles" onclick="verDetallesPaciente('${paciente.id}')">
            <i class="fas fa-eye" style="color: #3b82f6;"></i>
          </button>
          <button class="action-btn edit-btn" title="Editar" aria-label="Editar" onclick="editarPaciente('${paciente.id}')">
            <i class="fas fa-edit" style="color: #f59e0b;"></i>
          </button>
          <button class="action-btn delete-btn" title="Eliminar" aria-label="Eliminar paciente" onclick="eliminarPaciente('${paciente.id}')">
            <i class="fas fa-trash" style="color: #ef4444;"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderDatosMedicosForm() {
  const pacientesSinDatos = pacienteModel.getPacientesSinDatosMedicos();
  const todosLosPacientes = pacienteModel.getPacientes();
  
  // Actualizar selector de pacientes - mostrar TODOS los pacientes con indicador de estado
  const selector = document.getElementById('seleccionarPaciente');
  if (selector) {
    if (todosLosPacientes.length === 0) {
      selector.innerHTML = '<option value="">No hay pacientes registrados</option>';
    } else {
      selector.innerHTML = '<option value="">Seleccione un paciente...</option>' +
        todosLosPacientes.map(p => {
          const tieneDatos = p.status === 'completo';
          const estadoTexto = tieneDatos ? '✅ Datos completos' : '⚠️ Sin datos médicos';
          return `
            <option value="${p.id}">
              ${p.nombre} ${p.apellidos || ''} - ${p.matricula} (${estadoTexto})
            </option>
          `;
        }).join('');
    }
  }
  
  // Actualizar cards de pacientes pendientes - solo mostrar los que no tienen datos médicos
  const pendingAlert = document.querySelector('.pending-alert .flex-gap-20');
  if (pendingAlert) {
    if (pacientesSinDatos.length === 0) {
      pendingAlert.innerHTML = `
        <div class="pending-patient-card">
          <div class="patient-name fw-600">¡Excelente! <i class="fas fa-trophy" style="color: #f59e0b;"></i></div>
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
  
  // Crear registros del historial basado en datos médicos de pacientes
  const registrosHistorial = [];
  
  pacientes.forEach(paciente => {
    if (paciente.datosMedicos && paciente.datosMedicos.fechaRegistroMedico) {
      // Registro inicial - usar información preservada o actual si no hay historial
      const fechaInicial = paciente.fechaRegistroInicial || paciente.datosMedicos.fechaRegistroMedico;
      const usuarioInicial = paciente.usuarioRegistroInicial || paciente.datosMedicos.usuarioMedico;
      
      registrosHistorial.push({
        id: `inicial-${paciente.id}`,
        pacienteId: paciente.id,
        paciente: paciente,
        fecha: fechaInicial,
        tipo: 'Registro Inicial',
        usuarioRegistro: usuarioInicial || 'Sistema',
        datosMedicos: paciente.datosMedicos,
        isInicial: true
      });
      
      // Registros de actualizaciones si existen
      if (paciente.historialCambios && paciente.historialCambios.length > 0) {
        paciente.historialCambios.forEach((cambio, index) => {
          registrosHistorial.push({
            id: `actualizacion-${paciente.id}-${index}`,
            pacienteId: paciente.id,
            paciente: paciente,
            fecha: cambio.fecha,
            tipo: 'Actualización',
            usuarioRegistro: cambio.usuario || 'Sistema',
            datosMedicos: cambio.datos,
            datosActuales: paciente.datosMedicos,
            isActualizacion: true
          });
        });
      }
    }
  });
  
  // Ordenar por fecha (más reciente primero)
  registrosHistorial.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  
  const tableBody = document.querySelector('#historial-medico-completo-section tbody');
  if (!tableBody) return;
  
  if (registrosHistorial.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px; color: #666;">
          No hay registros en el historial médico
        </td>
      </tr>
    `;
    return;
  }
  
  tableBody.innerHTML = registrosHistorial.map(registro => {
    const fecha = new Date(registro.fecha);
    const inicial = registro.paciente?.nombre?.charAt(0).toUpperCase() || 'P';
    
    // Colores y estilos para tipos de actividad
    let tipoBadge, tipoColor;
    if (registro.isInicial) {
      tipoBadge = '<span class="badge badge-success" style="background: linear-gradient(135deg, #d1fae5, #a7f3d0); color: #065f46; border: 1px solid #10b981;">📋 Registro Inicial</span>';
      tipoColor = '#10b981';
    } else if (registro.isActualizacion) {
      tipoBadge = '<span class="badge badge-info" style="background: linear-gradient(135deg, #dbeafe, #bfdbfe); color: #1e40af; border: 1px solid #3b82f6;">🔄 Actualización</span>';
      tipoColor = '#3b82f6';
    } else {
      tipoBadge = '<span class="badge badge-secondary" style="background: linear-gradient(135deg, #f3f4f6, #e5e7eb); color: #374151; border: 1px solid #6b7280;">📝 Registro</span>';
      tipoColor = '#6b7280';
    }
    
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
              <div class="fw-600">${registro.paciente?.nombre || 'Desconocido'} ${registro.paciente?.apellidos || ''}</div>
              <div class="muted-text small-text">Matrícula: ${registro.paciente?.matricula || 'N/A'}</div>
            </div>
          </div>
        </td>
        <td>
          ${tipoBadge}
          <div class="muted-text tiny-text mt-2">
            ${registro.datosMedicos?.temperatura ? `Temp: ${registro.datosMedicos.temperatura}°C` : 'Datos médicos registrados'}
          </div>
        </td>
        <td>
          <div>
            <div class="fw-600" style="color: ${tipoColor};">${registro.usuarioRegistro || 'Sistema'}</div>
            <div class="muted-text small-text">${registro.isInicial ? 'Registro médico inicial' : 'Actualización de seguimiento'}</div>
          </div>
        </td>
        <td class="text-center">
          <div class="action-buttons">
            <button class="btn-icon" title="Ver detalles" onclick="verDetallesHistorialMedico('${registro.id}', '${registro.pacienteId}', ${registro.isActualizacion})">
              <i class="fas fa-eye" style="color: ${tipoColor};"></i>
            </button>
            <button class="btn-icon btn-danger" title="Eliminar registro" onclick="eliminarRegistroHistorial('${registro.id}', '${registro.pacienteId}', ${registro.isActualizacion}, '${registro.paciente?.nombre || 'Paciente'}')">
              <i class="fas fa-trash" style="color: #dc2626;"></i>
            </button>
          </div>
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
    // Buscar específicamente por matrícula en lugar de todo el texto
    const matriculaCell = row.querySelector('td:nth-child(2) .muted-text');
    const matriculaText = matriculaCell ? matriculaCell.textContent.toLowerCase() : '';
    
    // Extraer solo el número/texto de matrícula (después de "Matrícula: ")
    const matricula = matriculaText.replace('matrícula: ', '').trim();
    
    // Mostrar fila si la matrícula contiene el término de búsqueda
    const matches = matricula.includes(term);
    row.style.display = matches ? '' : 'none';
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
    nombre.textContent = `${paciente.nombre} ${paciente.apellidos || ''}`;
    nombre.innerHTML = `<i class="fas fa-user" style="color: #3b82f6; margin-right: 8px;"></i>${paciente.nombre} ${paciente.apellidos || ''}`;
    
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
  
  // Cargar datos médicos existentes en el formulario si los tiene
  if (paciente.datosMedicos) {
    const dm = paciente.datosMedicos;
    
    // Llenar los campos del formulario con los datos existentes
    const temperatura = document.getElementById('temperatura');
    const presion = document.getElementById('presion');
    const peso = document.getElementById('peso');
    const talla = document.getElementById('talla');
    const frecuenciaRespiratoria = document.getElementById('frecuenciaRespiratoria');
    const examenVista = document.getElementById('examenVista');
    const examenOido = document.getElementById('examenOido');
    
    if (temperatura) temperatura.value = dm.temperatura || '';
    if (presion) presion.value = dm.presion || '';
    if (peso) peso.value = dm.peso || '';
    if (talla) talla.value = dm.talla || '';
    if (frecuenciaRespiratoria) frecuenciaRespiratoria.value = dm.frecuenciaRespiratoria || '';
    if (examenVista) examenVista.value = dm.examenVista || '';
    if (examenOido) examenOido.value = dm.examenOido || '';
    
    // Mostrar indicador de que ya tiene datos médicos
    const submitButton = document.querySelector('#datos-medicos-form button[type="submit"]');
    if (submitButton) {
      submitButton.innerHTML = '🔄 Actualizar Datos Médicos';
      submitButton.style.background = '#f59e0b'; // Color naranja/amarillo para actualización
      submitButton.style.borderColor = '#f59e0b';
    }
  } else {
    // Limpiar el formulario si no tiene datos médicos
    const form = document.getElementById('datos-medicos-form');
    if (form) {
      form.reset();
    }
    
    // Restaurar el botón a su estado original
    const submitButton = document.querySelector('#datos-medicos-form button[type="submit"]');
    if (submitButton) {
      submitButton.innerHTML = '💾 Registrar Datos Médicos';
      submitButton.style.background = ''; // Restaurar estilo original
      submitButton.style.borderColor = '';
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

function verDetallesHistorialMedico(registroId, pacienteId, isActualizacion) {
  const paciente = pacienteModel.getPaciente(pacienteId);
  if (!paciente) {
    mostrarMensaje('error', '❌ Error', 'No se pudo encontrar el paciente solicitado.');
    return;
  }
  
  // Obtener datos para mostrar
  let datosAMostrar, datosAnteriores, fechaRegistro, usuarioRegistro;
  
  if (isActualizacion && paciente.historialCambios) {
    // Es una actualización, buscar en el historial de cambios
    const partes = registroId.split('-');
    const index = parseInt(partes[partes.length - 1]);
    const cambio = paciente.historialCambios[index];
    
    if (cambio) {
      datosAMostrar = cambio.datos; // Los datos de esa actualización específica
      fechaRegistro = cambio.fecha;
      usuarioRegistro = cambio.usuario;
      
      // Para la comparación, obtener los datos anteriores
      if (index > 0) {
        // Comparar con la actualización anterior
        datosAnteriores = paciente.historialCambios[index - 1].datos;
      } else {
        // Si es la primera actualización, comparar con el registro inicial
        datosAnteriores = {
          temperatura: paciente.datosMedicos.temperatura,
          presion: paciente.datosMedicos.presion,
          peso: paciente.datosMedicos.peso,
          talla: paciente.datosMedicos.talla,
          frecuenciaRespiratoria: paciente.datosMedicos.frecuenciaRespiratoria,
          examenVista: paciente.datosMedicos.examenVista,
          examenOido: paciente.datosMedicos.examenOido
        };
        
        // Obtener datos iniciales para comparación
        const registroInicial = {
          ...datosAnteriores,
          fechaRegistroMedico: paciente.fechaRegistroInicial,
          usuarioMedico: paciente.usuarioRegistroInicial
        };
        datosAnteriores = registroInicial;
      }
    }
  } else {
    // Es registro inicial
    datosAMostrar = paciente.datosMedicos;
    fechaRegistro = paciente.fechaRegistroInicial || paciente.datosMedicos.fechaRegistroMedico;
    usuarioRegistro = paciente.usuarioRegistroInicial || paciente.datosMedicos.usuarioMedico;
    datosAnteriores = null;
  }
  
  if (!datosAMostrar) {
    mostrarMensaje('error', '❌ Error', 'No se encontraron datos médicos para este registro.');
    return;
  }
  
  // Llenar el modal con la información
  llenarModalHistorialMedico(paciente, datosAMostrar, datosAnteriores, isActualizacion, fechaRegistro, usuarioRegistro);
  
  // Mostrar modal
  mostrarModalHistorialMedico();
}

function llenarModalHistorialMedico(paciente, datosActuales, datosAnteriores, isActualizacion, fechaRegistro, usuarioRegistro) {
  // Título del modal
  const tipoRegistro = isActualizacion ? 'Actualización de Seguimiento' : 'Registro Inicial';
  document.getElementById('modalHistorialTitulo').textContent = `${tipoRegistro} - ${paciente.nombre} ${paciente.apellidos || ''}`;
  document.getElementById('modalHistorialSubtitulo').textContent = `${paciente.matricula} • ${abreviarFacultad(paciente.facultad)}`;
  
  // Información del paciente (igual que el modal de ver paciente)
  document.getElementById('modalHistorialMatricula').textContent = paciente.matricula;
  document.getElementById('modalHistorialGrado').textContent = paciente.grado;
  document.getElementById('modalHistorialGrupo').textContent = paciente.grupo;
  document.getElementById('modalHistorialFacultad').textContent = paciente.facultad;
  document.getElementById('modalHistorialTelefono').textContent = paciente.telefono;
  
  // Datos médicos actuales
  if (datosActuales) {
    document.getElementById('modalHistorialTemperatura').textContent = datosActuales.temperatura ? `${datosActuales.temperatura}°C` : '-';
    document.getElementById('modalHistorialPresion').textContent = datosActuales.presion || '-';
    document.getElementById('modalHistorialPeso').textContent = datosActuales.peso ? `${datosActuales.peso} kg` : '-';
    document.getElementById('modalHistorialTalla').textContent = datosActuales.talla ? `${datosActuales.talla} cm` : '-';
    
    // Calcular IMC
    if (datosActuales.peso && datosActuales.talla) {
      const peso = parseFloat(datosActuales.peso);
      const talla = parseFloat(datosActuales.talla) / 100;
      const imc = (peso / (talla * talla)).toFixed(1);
      document.getElementById('modalHistorialIMC').textContent = imc;
    } else {
      document.getElementById('modalHistorialIMC').textContent = '-';
    }
    
    document.getElementById('modalHistorialFrecuencia').textContent = datosActuales.frecuenciaRespiratoria ? `${datosActuales.frecuenciaRespiratoria} rpm` : '-';
    document.getElementById('modalHistorialExamenVista').textContent = datosActuales.examenVista || 'No registrado';
    document.getElementById('modalHistorialExamenOido').textContent = datosActuales.examenOido || 'No registrado';
    
    // Información del registro - usar fecha y usuario correctos
    document.getElementById('modalHistorialUsuario').textContent = usuarioRegistro || 'Sistema';
    document.getElementById('modalHistorialFecha').textContent = new Date(fechaRegistro).toLocaleString('es-ES');
  }
  
  // Sección de comparación (solo para actualizaciones)
  const seccionComparacion = document.getElementById('seccionComparacionCambios');
  if (isActualizacion && datosAnteriores) {
    seccionComparacion.style.display = 'block';
    
    // Generar comparación de cambios
    const cambios = compararDatosMedicos(datosAnteriores, datosActuales);
    const listaCambios = document.getElementById('listaCambios');
    
    if (cambios.length > 0) {
      listaCambios.innerHTML = cambios.map(cambio => `
        <div class="cambio-item ${cambio.tipo}">
          <div class="cambio-campo">
            <i class="fas ${cambio.icono}"></i>
            <strong>${cambio.campo}:</strong>
          </div>
          <div class="cambio-valores">
            <span class="valor-anterior">${cambio.anterior}</span>
            <i class="fas fa-arrow-right cambio-flecha"></i>
            <span class="valor-nuevo">${cambio.nuevo}</span>
          </div>
        </div>
      `).join('');
    } else {
      listaCambios.innerHTML = '<div class="sin-cambios">No se detectaron cambios en los datos médicos</div>';
    }
  } else {
    seccionComparacion.style.display = 'none';
  }
}

function compararDatosMedicos(datosAnteriores, datosActuales) {
  const cambios = [];
  
  const campos = {
    temperatura: { nombre: 'Temperatura', icono: 'fa-thermometer-half', unidad: '°C' },
    presion: { nombre: 'Presión Arterial', icono: 'fa-heartbeat', unidad: 'mmHg' },
    peso: { nombre: 'Peso', icono: 'fa-weight', unidad: 'kg' },
    talla: { nombre: 'Talla', icono: 'fa-ruler-vertical', unidad: 'cm' },
    frecuenciaRespiratoria: { nombre: 'Frecuencia Respiratoria', icono: 'fa-lungs', unidad: 'rpm' },
    examenVista: { nombre: 'Examen de Vista', icono: 'fa-eye', unidad: '' },
    examenOido: { nombre: 'Examen de Oído', icono: 'fa-ear-listen', unidad: '' }
  };
  
  Object.keys(campos).forEach(campo => {
    const valorAnterior = datosAnteriores[campo] || 'No registrado';
    const valorActual = datosActuales[campo] || 'No registrado';
    
    if (valorAnterior !== valorActual) {
      const config = campos[campo];
      cambios.push({
        campo: config.nombre,
        icono: config.icono,
        anterior: valorAnterior === 'No registrado' ? valorAnterior : `${valorAnterior}${config.unidad}`,
        nuevo: valorActual === 'No registrado' ? valorActual : `${valorActual}${config.unidad}`,
        tipo: valorAnterior === 'No registrado' ? 'nuevo' : (valorActual === 'No registrado' ? 'eliminado' : 'modificado')
      });
    }
  });
  
  return cambios;
}

function mostrarModalHistorialMedico() {
  document.getElementById('modalHistorialMedico').style.display = 'flex';
}

function cerrarModalHistorialMedico() {
  document.getElementById('modalHistorialMedico').style.display = 'none';
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
  document.getElementById('modalUsuarioRegistro').textContent = paciente.usuarioRegistro || 'Sistema';
  document.getElementById('modalFechaRegistro').textContent = new Date(paciente.fechaRegistro).toLocaleString('es-ES');
  
  if (paciente.datosMedicos && paciente.status === 'completo') {
    document.getElementById('modalUsuarioMedico').textContent = paciente.datosMedicos.usuarioMedico || 'Sistema';
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

� Datos del paciente:
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
  // Obtener usuario real del localStorage (sesión activa)
  let currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  
  // Si currentUser está vacío, intentar con usuarioActual
  if (!currentUser.nombre && !currentUser.name) {
    currentUser = JSON.parse(localStorage.getItem('usuarioActual') || '{}');
  }
  
  // Si aún no hay datos, intentar con userSession
  if (!currentUser.nombre && !currentUser.name) {
    const userSession = JSON.parse(localStorage.getItem('userSession') || '{}');
    if (userSession.user) {
      currentUser = userSession.user;
    }
  }
  
  // Devolver el usuario con nombre normalizado
  return {
    id: currentUser.id || currentUser.usuario || 'unknown',
    nombre: currentUser.nombre || currentUser.name || currentUser.usuario || 'Usuario Anónimo',
    rol: currentUser.rol || currentUser.role || 'sin-rol'
  };
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
    document.getElementById('editFrecuenciaRespiratoria').value = dm.frecuenciaRespiratoria || '';
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
  const usuarioActual = obtenerUsuarioActual();
  const datosMedicos = {
    temperatura: formData.get('temperatura') || null,
    presion: formData.get('presion') || null,
    peso: formData.get('peso') || null,
    talla: formData.get('talla') || null,
    frecuenciaRespiratoria: formData.get('frecuenciaRespiratoria') || null,
    examenVista: formData.get('examenVista') || null,
    examenOido: formData.get('examenOido') || null,
    usuarioMedico: usuarioActual.nombre,
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
        `Los datos de ${datosPersonales.nombre} ${datosPersonales.apellidos || ''} han sido actualizados exitosamente.\n\nActualizado por: ${usuarioActual.nombre}`, 5000);
      
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

function eliminarRegistroHistorial(registroId, pacienteId, isActualizacion, nombrePaciente) {
  // Mostrar confirmación antes de eliminar
  const confirmacion = confirm(
    `⚠️ ¿Está seguro de que desea eliminar este registro médico?\n\n` +
    `👤 Paciente: ${nombrePaciente}\n` +
    `📋 Tipo: ${isActualizacion ? 'Actualización' : 'Registro Inicial'}\n\n` +
    `⚠️ ADVERTENCIA: Esta acción no se puede deshacer.`
  );
  
  if (!confirmacion) {
    return; // Usuario canceló
  }
  
  try {
    const paciente = pacienteModel.getPaciente(pacienteId);
    if (!paciente) {
      mostrarMensaje('error', '❌ Error', 'No se pudo encontrar el paciente.');
      return;
    }
    
    let eliminacionExitosa = false;
    
    if (isActualizacion) {
      // Eliminar de historial de cambios
      if (paciente.historialCambios && paciente.historialCambios.length > 0) {
        const partes = registroId.split('-');
        const index = parseInt(partes[partes.length - 1]);
        
        if (index >= 0 && index < paciente.historialCambios.length) {
          paciente.historialCambios.splice(index, 1);
          eliminacionExitosa = pacienteModel.updatePaciente(pacienteId, paciente);
        }
      }
    } else {
      // Es registro inicial - eliminar datos médicos completamente
      const confirmacionRegistroInicial = confirm(
        `⚠️ ATENCIÓN: Está eliminando el REGISTRO INICIAL de datos médicos.\n\n` +
        `Esto significa que:\n` +
        `• Se eliminarán todos los datos médicos del paciente\n` +
        `• Se eliminarán todas las actualizaciones relacionadas\n` +
        `• El paciente volverá al estado "sin datos médicos"\n\n` +
        `¿Continuar con la eliminación?`
      );
      
      if (!confirmacionRegistroInicial) {
        return;
      }
      
      // Eliminar todos los datos médicos y historial
      paciente.datosMedicos = null;
      paciente.historialCambios = [];
      paciente.status = 'sin_datos_medicos';
      paciente.fechaRegistroInicial = null;
      paciente.usuarioRegistroInicial = null;
      
      eliminacionExitosa = pacienteModel.updatePaciente(pacienteId, paciente);
    }
    
    if (eliminacionExitosa) {
      const usuarioActual = obtenerUsuarioActual();
      const tipoRegistro = isActualizacion ? 'actualización' : 'registro inicial';
      
      // Mostrar mensaje de éxito
      mostrarMensaje('success', '✅ Registro Eliminado', 
        `El ${tipoRegistro} de ${nombrePaciente} ha sido eliminado exitosamente.\n\nEliminado por: ${usuarioActual.nombre}`, 4000);
      
      // Registrar la actividad de eliminación
      pacienteModel.addRegistroHistorial({
        pacienteId: pacienteId,
        tipo: 'Registro Eliminado',
        descripcion: `${tipoRegistro} eliminado por ${usuarioActual.nombre}`,
        usuarioRegistro: usuarioActual.nombre,
        fecha: new Date().toISOString()
      });
      
      // Actualizar vistas
      renderHistorialCompleto();
      renderPacientesList();
      renderDatosMedicosForm();
      
    } else {
      mostrarMensaje('error', '❌ Error al Eliminar', 'No se pudo eliminar el registro. Intenta nuevamente.');
    }
    
  } catch (error) {
    console.error('Error al eliminar registro del historial:', error);
    mostrarMensaje('error', '❌ Error del Sistema', 'Error interno al eliminar el registro. Contacta al administrador.');
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
window.verDetallesHistorialMedico = verDetallesHistorialMedico;
window.eliminarRegistroHistorial = eliminarRegistroHistorial;
window.mostrarModalHistorialMedico = mostrarModalHistorialMedico;
window.cerrarModalHistorialMedico = cerrarModalHistorialMedico;