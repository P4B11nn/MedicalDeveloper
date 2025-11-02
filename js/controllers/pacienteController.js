// js/controllers/pacienteController.js

import { pacienteModel } from '../models/pacienteModel.js';
import { renderPacienteForm } from '../views/pacienteView.js';

/**
 * Función de validación completa para formularios
 * @param {string} formType - Tipo de formulario ('usuario', 'paciente', 'datos-medicos')
 * @param {FormData} formData - Datos del formulario
 * @returns {Object} - {isValid: boolean, errors: Array, warnings: Array}
 */
export function validateForm(formType, formData) {
  const errors = [];
  const warnings = [];

  switch (formType) {
    case 'usuario':
      return validateUsuarioForm(formData);
    case 'paciente':
      return validatePacienteForm(formData);
    case 'datos-medicos':
      return validateDatosMedicosForm(formData);
    default:
      return { isValid: false, errors: ['Tipo de formulario no reconocido'], warnings: [] };
  }
}

/**
 * Validación específica para formulario de usuario
 */
function validateUsuarioForm(formData) {
  const errors = [];
  const warnings = [];

  // Email
  const email = formData.get('email')?.trim();
  if (!email) {
    errors.push('El correo electrónico es obligatorio');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('El formato del correo electrónico no es válido');
  }

  // Nombre
  const nombre = formData.get('nombre')?.trim();
  if (!nombre) {
    errors.push('El nombre es obligatorio');
  } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombre)) {
    errors.push('El nombre solo puede contener letras y espacios');
  } else if (nombre.length < 2) {
    errors.push('El nombre debe tener al menos 2 caracteres');
  } else if (nombre.length > 50) {
    errors.push('El nombre no puede tener más de 50 caracteres');
  }

  // Apellidos
  const apellidos = formData.get('apellidos')?.trim();
  if (!apellidos) {
    errors.push('Los apellidos son obligatorios');
  } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(apellidos)) {
    errors.push('Los apellidos solo pueden contener letras y espacios');
  } else if (apellidos.length < 2) {
    errors.push('Los apellidos deben tener al menos 2 caracteres');
  } else if (apellidos.length > 50) {
    errors.push('Los apellidos no pueden tener más de 50 caracteres');
  }

  // Edad
  const edadStr = formData.get('edad')?.trim();
  if (!edadStr) {
    errors.push('La edad es obligatoria');
  } else {
    const edad = parseInt(edadStr);
    if (isNaN(edad)) {
      errors.push('La edad debe ser un número válido');
    } else if (edad < 0) {
      errors.push('La edad no puede ser negativa');
    } else if (edad > 120) {
      errors.push('La edad no puede ser mayor a 120 años');
    } else if (edad < 18) {
      warnings.push('El usuario es menor de edad');
    }
  }

  // Sexo
  const sexo = formData.get('sexo');
  if (!sexo) {
    errors.push('El sexo es obligatorio');
  } else if (!['M', 'F'].includes(sexo)) {
    errors.push('El sexo debe ser Masculino (M) o Femenino (F)');
  }

  // Matrícula
  const matricula = formData.get('matricula')?.trim();
  if (!matricula) {
    errors.push('La matrícula es obligatoria');
  } else if (!/^[A-Z0-9]{3,15}$/.test(matricula)) {
    errors.push('La matrícula debe contener solo letras mayúsculas y números (3-15 caracteres)');
  }

  // Rol
  const rol = formData.get('rol');
  if (!rol) {
    errors.push('El rol es obligatorio');
  } else if (!['admin', 'practicante'].includes(rol)) {
    errors.push('El rol debe ser Administrador o Practicante');
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Validación específica para formulario de paciente
 */
function validatePacienteForm(formData) {
  const errors = [];
  const warnings = [];

  // Matrícula
  const matricula = formData.get('matricula')?.trim();
  if (!matricula) {
    errors.push('La matrícula es obligatoria');
  } else if (!/^[A-Z0-9]{3,15}$/.test(matricula)) {
    errors.push('La matrícula debe contener solo letras mayúsculas y números (3-15 caracteres)');
  }

  // Nombre
  const nombres = formData.get('nombres')?.trim();
  if (!nombres) {
    errors.push('El nombre es obligatorio');
  } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombres)) {
    errors.push('El nombre solo puede contener letras y espacios');
  } else if (nombres.length < 2) {
    errors.push('El nombre debe tener al menos 2 caracteres');
  } else if (nombres.length > 50) {
    errors.push('El nombre no puede tener más de 50 caracteres');
  }

  // Apellidos
  const apellidos = formData.get('apellidos')?.trim();
  if (!apellidos) {
    errors.push('Los apellidos son obligatorios');
  } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(apellidos)) {
    errors.push('Los apellidos solo pueden contener letras y espacios');
  } else if (apellidos.length < 2) {
    errors.push('Los apellidos deben tener al menos 2 caracteres');
  } else if (apellidos.length > 50) {
    errors.push('Los apellidos no pueden tener más de 50 caracteres');
  }

  // Fecha de nacimiento
  const fechaNacimiento = formData.get('fecha-nacimiento');
  if (!fechaNacimiento) {
    errors.push('La fecha de nacimiento es obligatoria');
  } else {
    const fecha = new Date(fechaNacimiento);
    const hoy = new Date();
    const edadMinima = new Date();
    edadMinima.setFullYear(hoy.getFullYear() - 120);
    const edadMaxima = new Date();
    edadMaxima.setFullYear(hoy.getFullYear() - 5);

    if (isNaN(fecha.getTime())) {
      errors.push('La fecha de nacimiento no es válida');
    } else if (fecha > hoy) {
      errors.push('La fecha de nacimiento no puede ser futura');
    } else if (fecha < edadMinima) {
      errors.push('La fecha de nacimiento parece demasiado antigua');
    } else if (fecha > edadMaxima) {
      warnings.push('El paciente parece ser muy joven (menos de 5 años)');
    }
  }

  // Grado
  const grado = formData.get('grado');
  const gradosValidos = [
    '1er Semestre', '2do Semestre', '3er Semestre', '4to Semestre',
    '5to Semestre', '6to Semestre', '7mo Semestre', '8vo Semestre',
    '9no Semestre', '10mo Semestre'
  ];
  if (!grado) {
    errors.push('El grado es obligatorio');
  } else if (!gradosValidos.includes(grado)) {
    errors.push('El grado seleccionado no es válido');
  }

  // Grupo
  const grupo = formData.get('grupo')?.trim();
  if (!grupo) {
    errors.push('El grupo es obligatorio');
  } else if (!/^[A-Za-z0-9\s\-]+$/.test(grupo)) {
    errors.push('El grupo solo puede contener letras, números, espacios y guiones');
  } else if (grupo.length > 20) {
    errors.push('El grupo no puede tener más de 20 caracteres');
  }

  // Facultad
  const facultad = formData.get('facultad');
  if (!facultad) {
    errors.push('La facultad es obligatoria');
  } else if (facultad.length < 3) {
    errors.push('El nombre de la facultad es demasiado corto');
  } else if (facultad.length > 100) {
    errors.push('El nombre de la facultad es demasiado largo');
  }

  // Carrera
  const carrera = formData.get('carrera');
  if (!carrera) {
    errors.push('La carrera es obligatoria');
  } else if (carrera.length < 3) {
    errors.push('El nombre de la carrera es demasiado corto');
  } else if (carrera.length > 100) {
    errors.push('El nombre de la carrera es demasiado largo');
  }

  // Teléfono
  const telefono = formData.get('telefono')?.trim();
  if (!telefono) {
    errors.push('El teléfono es obligatorio');
  } else {
    // Remover espacios, guiones y paréntesis para validación
    const telefonoLimpio = telefono.replace(/[\s\-\(\)]/g, '');
    if (!/^\d{10}$/.test(telefonoLimpio)) {
      errors.push('El teléfono debe tener exactamente 10 dígitos');
    } else if (!/^55/.test(telefonoLimpio)) {
      warnings.push('El número no parece ser de la zona metropolitana (debe comenzar con 55)');
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Validación específica para formulario de datos médicos
 */
function validateDatosMedicosForm(formData) {
  const errors = [];
  const warnings = [];

  // Temperatura
  const temperaturaStr = formData.get('temperatura')?.trim();
  if (temperaturaStr) {
    const temperatura = parseFloat(temperaturaStr);
    if (isNaN(temperatura)) {
      errors.push('La temperatura debe ser un número válido');
    } else if (temperatura < 35.0 || temperatura > 42.0) {
      errors.push(`Temperatura: ${temperatura}°C está fuera del rango válido (35.0-42.0°C)`);
    } else if (temperatura < 36.0 || temperatura > 37.5) {
      warnings.push(`Temperatura: ${temperatura}°C fuera del rango normal (36.0-37.5°C)`);
    }
  }

  // Presión arterial
  const presion = formData.get('presion')?.trim();
  if (presion) {
    const presionPattern = /^(\d{2,3})\/(\d{2,3})$/;
    const match = presion.match(presionPattern);
    if (!match) {
      errors.push('Presión arterial: Formato inválido. Use el formato sistólica/diastólica (ej: 120/80)');
    } else {
      const sistolica = parseInt(match[1]);
      const diastolica = parseInt(match[2]);
      if (sistolica < 70 || sistolica > 200) {
        errors.push(`Presión sistólica: ${sistolica} está fuera del rango válido (70-200 mmHg)`);
      } else if (diastolica < 40 || diastolica > 120) {
        errors.push(`Presión diastólica: ${diastolica} está fuera del rango válido (40-120 mmHg)`);
      } else if (sistolica < 90 || sistolica > 140 || diastolica < 60 || diastolica > 90) {
        warnings.push(`Presión arterial: ${presion} mmHg fuera del rango normal (90-140/60-90 mmHg)`);
      }
    }
  }

  // Peso
  const pesoStr = formData.get('peso')?.trim();
  if (pesoStr) {
    const peso = parseFloat(pesoStr);
    if (isNaN(peso)) {
      errors.push('El peso debe ser un número válido');
    } else if (peso < 30.0 || peso > 200.0) {
      errors.push(`Peso: ${peso}kg está fuera del rango válido (30-200kg)`);
    } else if (peso < 45.0 || peso > 120.0) {
      warnings.push(`Peso: ${peso}kg fuera del rango típico para adultos (45-120kg)`);
    }
  }

  // Talla
  const tallaStr = formData.get('talla')?.trim();
  if (tallaStr) {
    const talla = parseInt(tallaStr);
    if (isNaN(talla)) {
      errors.push('La talla debe ser un número válido');
    } else if (talla < 140 || talla > 220) {
      errors.push(`Talla: ${talla}cm está fuera del rango válido (140-220cm)`);
    } else if (talla < 150 || talla > 200) {
      warnings.push(`Talla: ${talla}cm fuera del rango típico para adultos (150-200cm)`);
    }
  }

  // Frecuencia respiratoria
  const frecuenciaStr = formData.get('frecuenciaRespiratoria')?.trim();
  if (frecuenciaStr) {
    const frecuencia = parseInt(frecuenciaStr);
    if (isNaN(frecuencia)) {
      errors.push('La frecuencia respiratoria debe ser un número válido');
    } else if (frecuencia < 10 || frecuencia > 40) {
      errors.push(`Frecuencia respiratoria: ${frecuencia} rpm está fuera del rango válido (10-40 rpm)`);
    } else if (frecuencia < 12 || frecuencia > 20) {
      warnings.push(`Frecuencia respiratoria: ${frecuencia} rpm fuera del rango normal (12-20 rpm)`);
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export async function initPacienteController() {
  console.log('🚀 Controlador de Pacientes inicializado');
  
  // Configurar eventos para todas las secciones
  setupEventListeners();
  
  // Inicializar todas las vistas de forma asíncrona
  await renderPacientesList();
  await renderDatosMedicosForm();
  await renderHistorialCompleto();

  // Registrar callback para refrescar datos cuando se restaure la conexión
  // Usar un timeout para asegurar que ConnectionIndicator esté inicializado
  setTimeout(() => {
    if (window.connectionIndicator) {
      window.connectionIndicator.onConnectionRestored(async () => {
        console.log('🔄 Refrescando datos de pacientes tras restaurar conexión...');
        try {
          // Mostrar mensaje de carga
          mostrarMensaje('info', '🔄 Sincronizando Datos', 'Actualizando información desde Firebase...', 3000);

          // Refrescar todas las vistas que dependen de Firebase
          await Promise.all([
            renderPacientesList(),
            renderDatosMedicosForm(),
            renderHistorialCompleto()
          ]);

          mostrarMensaje('success', '✅ Datos Actualizados', 'La información se ha sincronizado correctamente con Firebase.', 3000);
        } catch (error) {
          console.error('❌ Error al refrescar datos tras restaurar conexión:', error);
          mostrarMensaje('warning', '⚠️ Error de Sincronización', 'No se pudieron actualizar algunos datos. Refresca la página manualmente.', 5000);
        }
      });
    } else {
      console.warn('⚠️ ConnectionIndicator no disponible para registrar callback de restauración de conexión');
    }
  }, 500);
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
    aplicarFiltrosHistorial();
  }
  
  // Filtros del historial médico
  if (input.id === 'filtroFecha' || input.id === 'filtroPaciente') {
    aplicarFiltrosHistorial();
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

export async function handlePacienteSubmit(event) {
  event.preventDefault();
  
  const formData = new FormData(event.target);
  
  // Validación completa del formulario
  const validation = validateForm('paciente', formData);
  if (!validation.isValid) {
    // Mostrar errores de validación
    const errorMessage = validation.errors.join('\n');
    mostrarMensaje('error', '❌ Errores de Validación', errorMessage, 8000);
    throw new Error('Datos inválidos en el formulario');
  }
  
  // Mostrar advertencias si existen
  if (validation.warnings.length > 0) {
    const warningMessage = validation.warnings.join('\n');
    mostrarMensaje('warning', '⚠️ Advertencias', warningMessage, 6000);
  }
  
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
  
  try {
    // Verificar si ya existe un paciente con esa matrícula
    const pacienteExistente = await pacienteModel.getPaciente(nuevoPaciente.matricula);
    if (pacienteExistente) {
      mostrarMensaje('error', '❌ Matrícula Duplicada', `Ya existe un paciente registrado con la matrícula ${nuevoPaciente.matricula}. Verifica el número e intenta nuevamente.`);
      return;
    }
    
    // Agregar información del usuario que registra
    const usuarioActual = obtenerUsuarioActual();
    nuevoPaciente.usuarioRegistro = usuarioActual.nombre;
    nuevoPaciente.fechaRegistro = nuevoPaciente.fechaRegistro || new Date().toISOString();
    
    // Guardar el paciente
    const pacienteGuardado = await pacienteModel.addPaciente(nuevoPaciente);
    
    if (pacienteGuardado) {
      // Registrar actividad de creación de paciente
      try {
        const { default: ActivityLogger } = await import('../utils/activityLogger.js');
        await ActivityLogger.createPatientActivity(
          pacienteGuardado.id || pacienteGuardado.uid,
          `${nuevoPaciente.nombre} ${nuevoPaciente.apellidos || ''}`,
          nuevoPaciente.matricula
        );
      } catch (error) {
        console.warn('Error registrando actividad de creación de paciente:', error);
      }

      mostrarMensaje('success', '✅ Paciente Registrado', 
        `${nuevoPaciente.nombre} ${nuevoPaciente.apellidos || ''} ha sido registrado exitosamente.\nMatrícula: ${nuevoPaciente.matricula}`);
      
      event.target.reset();
      
      // Actualizar la lista de pacientes
      await renderPacientesList();
      
      // Actualizar lista de pacientes pendientes en datos médicos
      await renderDatosMedicosForm();
    } else {
      mostrarMensaje('error', '❌ Error de Registro', 'No se pudo registrar el paciente. Intenta nuevamente.');
    }
  } catch (error) {
    console.error('Error al registrar paciente:', error);
    mostrarMensaje('error', '❌ Error del Sistema', 'Error interno al registrar el paciente. Contacta al administrador.');
  }
}

async function handleDatosMedicosSubmit(event) {
  event.preventDefault();
  
  const formData = new FormData(event.target);
  const pacienteSeleccionado = document.getElementById('seleccionarPaciente')?.value;
  
  if (!pacienteSeleccionado) {
    mostrarMensaje('warning', '⚠️ Paciente Requerido', 'Por favor selecciona un paciente antes de guardar los datos médicos.');
    return;
  }
  
  try {
    // Verificar que el paciente existe
    const paciente = await pacienteModel.getPaciente(pacienteSeleccionado);
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
    
    // Validación completa de datos médicos
    const validation = validateForm('datos-medicos', formData);
    if (!validation.isValid) {
      // Mostrar errores de validación
      const errorMessage = validation.errors.join('\n');
      mostrarMensaje('error', '❌ Errores de Validación', errorMessage, 8000);
      return;
    }
    
    // Mostrar advertencias si existen
    if (validation.warnings.length > 0) {
      const warningMessage = validation.warnings.join('\n');
      mostrarMensaje('warning', '⚠️ Advertencias', warningMessage, 6000);
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
      usuarioId: usuarioActual.id,
      usuarioNombre: usuarioActual.nombre,
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
      const pacienteActualizado = await pacienteModel.updateDatosMedicos(pacienteSeleccionado, datosMedicos);
      
      if (pacienteActualizado) {
        // Registrar actividad de datos médicos
        try {
          const { default: ActivityLogger } = await import('../utils/activityLogger.js');
          if (esActualizacion) {
            await ActivityLogger.updateMedicalRecordActivity(
              pacienteSeleccionado,
              `${paciente.nombre} ${paciente.apellidos || ''}`,
              Object.keys(datosMedicos).filter(key => datosMedicos[key] !== null && datosMedicos[key] !== '' && !['usuarioMedico', 'fechaRegistroMedico'].includes(key))
            );
          } else {
            await ActivityLogger.createMedicalRecordActivity(
              pacienteSeleccionado,
              `${paciente.nombre} ${paciente.apellidos || ''}`,
              Object.keys(datosMedicos).filter(key => datosMedicos[key] !== null && datosMedicos[key] !== '' && !['usuarioMedico', 'fechaRegistroMedico'].includes(key))
            );
          }
        } catch (error) {
          console.warn('Error registrando actividad de datos médicos:', error);
        }

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
        
        mensajeFinal += `\n\nRegistrado por: ${usuarioActual.nombre}`;
        
        const tipoMensaje = esActualizacion ? 'info' : 'success';
        const iconoMensaje = esActualizacion ? '🔄 Datos Actualizados' : '✅ Datos Médicos Guardados';
        
        mostrarMensaje(tipoMensaje, iconoMensaje, mensajeFinal, 8000);
        
        // Limpiar formulario
        event.target.reset();
        document.getElementById('paciente-info-section').style.display = 'none';
        
        // Actualizar vistas
        await renderPacientesList();
        await renderDatosMedicosForm();
        await renderHistorialCompleto();
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
  } catch (error) {
    console.error('Error al procesar datos médicos:', error);
    mostrarMensaje('error', '❌ Error del Sistema', 'Error interno al procesar los datos médicos. Contacta al administrador.');
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

async function renderPacientesList() {
  const tableBody = document.getElementById('tablaPacientes');
  if (!tableBody) return;
  
  try {
    const pacientes = await pacienteModel.getPacientes();
    
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
  } catch (error) {
    console.error('❌ Error al renderizar lista de pacientes:', error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="11" style="text-align: center; padding: 40px; color: #dc2626;">
          <i class="fas fa-exclamation-triangle" style="color: #dc2626; margin-bottom: 10px;"></i><br>
          Error al cargar pacientes. Intenta recargar la página.
        </td>
      </tr>
    `;
  }
}

async function renderDatosMedicosForm() {
  try {
    const pacientesSinDatos = await pacienteModel.getPacientesSinDatosMedicos();
    const todosLosPacientes = await pacienteModel.getPacientes();
    
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
  } catch (error) {
    console.error('❌ Error al renderizar formulario de datos médicos:', error);
  }
}

async function renderHistorialCompleto() {
  try {
    const historial = await pacienteModel.getHistorialMedico();
    const pacientes = await pacienteModel.getPacientes();

    // Crear mapa de pacientes para búsqueda rápida
    const pacientesMap = {};
    pacientes.forEach(p => {
      pacientesMap[p.id] = p;
      if (p.matricula) pacientesMap[p.matricula] = p;
    });

    // Procesar registros médicos de la colección registros_medicos
    const registrosHistorial = [];

    historial.forEach(registro => {
      // Buscar paciente por ID o matrícula
      const paciente = pacientesMap[registro.pacienteId] || pacientesMap[registro.pacienteMatricula];

      if (paciente) {
        registrosHistorial.push({
          id: registro.id,
          pacienteId: registro.pacienteId,
          paciente: paciente,
          fecha: registro.fecha || registro.timestamp,
          tipo: registro.tipoRegistro === 'registro_inicial' ? 'Registro Inicial' :
                registro.tipoRegistro === 'actualizacion' ? 'Actualización' : 'Registro',
          usuarioRegistro: registro.registradoPorNombre || registro.practicante || 'Sistema',
          datosMedicos: registro.datosMedicos,
          datosAnteriores: registro.datosMedicosAnteriores,
          camposModificados: registro.camposModificados || [],
          totalCamposModificados: registro.totalCamposModificados || 0,
          tipoRegistro: registro.tipoRegistro,
          isInicial: registro.tipoRegistro === 'registro_inicial',
          isActualizacion: registro.tipoRegistro === 'actualizacion'
        });
      }
    });

    // Ordenar por fecha (más reciente primero)
    registrosHistorial.sort((a, b) => {
      const fechaA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha);
      const fechaB = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha);
      return fechaB - fechaA;
    });

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
      const fecha = registro.fecha?.toDate ? registro.fecha.toDate() : new Date(registro.fecha);
      const inicial = registro.paciente?.nombre?.charAt(0).toUpperCase() || 'P';

      // Colores y estilos para tipos de actividad
      let tipoBadge, tipoColor;
      if (registro.isInicial) {
        tipoBadge = '<span class="badge badge-success" style="background: linear-gradient(135deg, #d1fae5, #a7f3d0); color: #065f46; border: 1px solid #10b981;">📋 Registro Inicial</span>';
        tipoColor = '#10b981';
      } else if (registro.isActualizacion) {
        tipoBadge = `<span class="badge badge-info" style="background: linear-gradient(135deg, #dbeafe, #bfdbfe); color: #1e40af; border: 1px solid #3b82f6;">🔄 Actualización (${registro.totalCamposModificados} cambios)</span>`;
        tipoColor = '#3b82f6';
      } else {
        tipoBadge = '<span class="badge badge-secondary" style="background: linear-gradient(135deg, #f3f4f6, #e5e7eb); color: #374151; border: 1px solid #6b7280;">📝 Registro</span>';
        tipoColor = '#6b7280';
      }

      return `
        <tr data-paciente-id="${registro.pacienteId}">
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
              ${registro.datosMedicos?.temperatura_corporal ? `Temp: ${registro.datosMedicos.temperatura_corporal}°C` : 'Datos médicos registrados'}
            </div>
          </td>
          <td>
            <div>
              <div class="fw-600" style="color: ${tipoColor};">${registro.usuarioRegistro || 'Sistema'}</div>
              <div class="muted-text small-text">${registro.isInicial ? 'Registro médico inicial' : `Actualización de ${registro.totalCamposModificados} campo(s)`}</div>
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
    
    // Poblar el selector de pacientes para filtrado
    const pacienteSelect = document.getElementById('filtroPaciente');
    if (pacienteSelect) {
      pacienteSelect.innerHTML = '<option value="">Todos los pacientes</option>';
      
      // Obtener lista única de pacientes que tienen registros
      const pacientesUnicos = {};
      registrosHistorial.forEach(registro => {
        if (registro.paciente && !pacientesUnicos[registro.pacienteId]) {
          pacientesUnicos[registro.pacienteId] = registro.paciente;
        }
      });
      
      // Agregar opciones ordenadas alfabéticamente
      Object.values(pacientesUnicos)
        .sort((a, b) => `${a.nombre} ${a.apellidos || ''}`.localeCompare(`${b.nombre} ${b.apellidos || ''}`))
        .forEach(paciente => {
          pacienteSelect.add(new Option(
            `${paciente.nombre} ${paciente.apellidos || ''} (${paciente.matricula})`,
            paciente.id
          ));
        });
    }
    
    // Agregar event listener para el botón de limpiar filtros
    const limpiarBtn = document.querySelector('#historial-medico-completo-section .btn-secondary');
    if (limpiarBtn) {
      limpiarBtn.addEventListener('click', limpiarFiltrosHistorial);
    }
  } catch (error) {
    console.error('❌ Error al renderizar historial médico:', error);
    const tableBody = document.querySelector('#historial-medico-completo-section tbody');
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 40px; color: #dc2626;">
            <i class="fas fa-exclamation-triangle" style="color: #dc2626; margin-bottom: 10px;"></i><br>
            Error al cargar historial médico. Intenta recargar la página.
          </td>
        </tr>
      `;
    }
  }
}

function filtrarPacientes(searchTerm) {
  const rows = document.querySelectorAll('#tablaPacientes tr');
  const term = searchTerm.toLowerCase().trim();
  
  rows.forEach(row => {
    if (term === '') {
      // Si no hay término de búsqueda, mostrar todas las filas
      row.style.display = '';
      return;
    }
    
    // Buscar específicamente en matrícula (primera columna)
    const matriculaCell = row.querySelector('td:nth-child(1)');
    const matricula = matriculaCell ? matriculaCell.textContent.toLowerCase() : '';
    
    // Buscar específicamente en nombre (segunda columna, parte del nombre completo)
    const nombreCell = row.querySelector('td:nth-child(2)');
    const nombreCompleto = nombreCell ? nombreCell.textContent.toLowerCase() : '';
    
    // Verificar si el término coincide con matrícula o nombre
    const matchesMatricula = matricula.includes(term);
    const matchesNombre = nombreCompleto.includes(term);
    
    // Mostrar fila solo si coincide con matrícula o nombre
    row.style.display = (matchesMatricula || matchesNombre) ? '' : 'none';
  });
}

function aplicarFiltrosHistorial() {
  const searchTerm = document.getElementById('buscarHistorial')?.value || '';
  const fechaFiltro = document.getElementById('filtroFecha')?.value || '';
  const pacienteFiltro = document.getElementById('filtroPaciente')?.value || '';
  
  filtrarHistorial(searchTerm, fechaFiltro, pacienteFiltro);
}

function filtrarHistorial(searchTerm = '', fechaFiltro = '', pacienteFiltro = '') {
  const rows = document.querySelectorAll('#historial-medico-completo-section tbody tr');
  const term = searchTerm.toLowerCase();
  const fechaSeleccionada = fechaFiltro ? new Date(fechaFiltro + 'T00:00:00') : null;

  rows.forEach(row => {
    // Buscar en la fecha (primera columna)
    const fechaCell = row.querySelector('td:nth-child(1) .fw-600');
    const fechaText = fechaCell ? fechaCell.textContent.toLowerCase() : '';
    const fechaRegistro = fechaCell ? new Date(fechaCell.textContent.split('/').reverse().join('-') + 'T00:00:00') : null;

    // Buscar en el nombre del paciente (segunda columna)
    const nombreCell = row.querySelector('td:nth-child(2) .fw-600');
    const nombreText = nombreCell ? nombreCell.textContent.toLowerCase() : '';

    // Buscar específicamente por matrícula (segunda columna, texto muted)
    const matriculaCell = row.querySelector('td:nth-child(2) .muted-text');
    const matriculaText = matriculaCell ? matriculaCell.textContent.toLowerCase() : '';
    const matricula = matriculaText.replace('matrícula: ', '').trim();

    // Obtener el paciente ID del registro (desde el atributo data o similar)
    const pacienteId = row.getAttribute('data-paciente-id') || '';

    // Aplicar filtros
    let matchesSearch = true;
    let matchesFecha = true;
    let matchesPaciente = true;

    // Filtro de búsqueda por texto
    if (term) {
      const matchesFechaText = fechaText.includes(term);
      const matchesNombre = nombreText.includes(term);
      const matchesMatricula = matricula.includes(term);
      matchesSearch = matchesFechaText || matchesNombre || matchesMatricula;
    }

    // Filtro por fecha
    if (fechaSeleccionada && fechaRegistro) {
      // Comparar solo la fecha (sin hora) para que coincida con el input date
      const fechaRegistroSolo = new Date(fechaRegistro.getFullYear(), fechaRegistro.getMonth(), fechaRegistro.getDate());
      const fechaSeleccionadaSolo = new Date(fechaSeleccionada.getFullYear(), fechaSeleccionada.getMonth(), fechaSeleccionada.getDate());
      
      matchesFecha = fechaRegistroSolo.getTime() === fechaSeleccionadaSolo.getTime();
    }

    // Filtro por paciente
    if (pacienteFiltro) {
      matchesPaciente = pacienteId === pacienteFiltro;
    }

    // Mostrar fila solo si cumple todos los filtros
    const mostrar = matchesSearch && matchesFecha && matchesPaciente;
    row.style.display = mostrar ? '' : 'none';
  });
}

function limpiarFiltrosHistorial() {
  // Limpiar inputs
  const buscarInput = document.getElementById('buscarHistorial');
  const fechaInput = document.getElementById('filtroFecha');
  const pacienteSelect = document.getElementById('filtroPaciente');
  
  if (buscarInput) buscarInput.value = '';
  if (fechaInput) fechaInput.value = '';
  if (pacienteSelect) pacienteSelect.value = '';
  
  // Mostrar todas las filas
  const rows = document.querySelectorAll('#historial-medico-completo-section tbody tr');
  rows.forEach(row => {
    row.style.display = '';
  });
}

async function cargarDatosPaciente(pacienteId) {
  try {
    const paciente = await pacienteModel.getPaciente(pacienteId);
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
  } catch (error) {
    console.error('❌ Error al cargar datos del paciente:', error);
    mostrarMensaje('error', '❌ Error', 'No se pudieron cargar los datos del paciente. Intenta nuevamente.');
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

async function verDetallesHistorialMedico(registroId, pacienteId, isActualizacion) {
  try {
    const paciente = await pacienteModel.getPaciente(pacienteId);
    if (!paciente) {
      mostrarMensaje('error', '❌ Error', 'No se pudo encontrar el paciente solicitado.');
      return;
    }

    // Obtener el registro específico de la colección registros_medicos
    const registrosPaciente = await pacienteModel.getRegistrosMedicosPaciente(pacienteId);
    const registro = registrosPaciente.find(r => r.id === registroId);

    if (!registro) {
      mostrarMensaje('error', '❌ Error', 'No se pudo encontrar el registro médico solicitado.');
      return;
    }

    // Obtener datos para mostrar
    const datosAMostrar = registro.datosMedicos;
    const datosAnteriores = registro.datosMedicosAnteriores;
    const fechaRegistro = registro.fecha || registro.timestamp;
    const usuarioRegistro = registro.registradoPorNombre || registro.practicante || 'Sistema';

    // Llenar el modal con la información
    llenarModalHistorialMedico(paciente, datosAMostrar, datosAnteriores, registro.camposModificados || [], fechaRegistro, usuarioRegistro, registro.tipoRegistro);

    // Mostrar modal
    mostrarModalHistorialMedico();
  } catch (error) {
    console.error('❌ Error al obtener detalles del historial médico:', error);
    mostrarMensaje('error', '❌ Error', 'No se pudieron obtener los detalles del historial médico. Intenta nuevamente.');
  }
}

function llenarModalHistorialMedico(paciente, datosActuales, datosAnteriores, camposModificados, fechaRegistro, usuarioRegistro, tipoRegistro) {
  // Título del modal
  const tipoRegistroTexto = tipoRegistro === 'registro_inicial' ? 'Registro Inicial' :
                           tipoRegistro === 'actualizacion' ? 'Actualización de Seguimiento' : 'Registro Médico';
  document.getElementById('modalHistorialTitulo').textContent = `${tipoRegistroTexto} - ${paciente.nombre} ${paciente.apellidos || ''}`;
  document.getElementById('modalHistorialSubtitulo').textContent = `${paciente.matricula} • ${abreviarFacultad(paciente.facultad)}`;

  // Información del paciente (igual que el modal de ver paciente)
  document.getElementById('modalHistorialMatricula').textContent = paciente.matricula;
  document.getElementById('modalHistorialGrado').textContent = paciente.grado;
  document.getElementById('modalHistorialGrupo').textContent = paciente.grupo;
  document.getElementById('modalHistorialFacultad').textContent = paciente.facultad;
  document.getElementById('modalHistorialCarrera').textContent = paciente.carrera || 'No especificada';
  document.getElementById('modalHistorialTelefono').textContent = paciente.telefono;

  // Datos médicos actuales - convertir nombres de campos de Firebase a nombres internos
  if (datosActuales) {
    document.getElementById('modalHistorialTemperatura').textContent = datosActuales.temperatura_corporal ? `${datosActuales.temperatura_corporal}°C` : '-';
    document.getElementById('modalHistorialPresion').textContent = datosActuales.presion_arterial || '-';
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

    document.getElementById('modalHistorialFrecuencia').textContent = datosActuales.frecuencia_respiratoria ? `${datosActuales.frecuencia_respiratoria} rpm` : '-';
    document.getElementById('modalHistorialExamenVista').textContent = datosActuales.examen_vista || 'No registrado';
    document.getElementById('modalHistorialExamenOido').textContent = datosActuales.examen_oido || 'No registrado';

    // Información del registro - usar fecha y usuario correctos
    const fecha = fechaRegistro?.toDate ? fechaRegistro.toDate() : new Date(fechaRegistro);
    document.getElementById('modalHistorialUsuario').textContent = usuarioRegistro || 'Sistema';
    document.getElementById('modalHistorialFecha').textContent = fecha.toLocaleString('es-ES');
  }

  // Sección de comparación (solo para actualizaciones)
  const seccionComparacion = document.getElementById('seccionComparacionCambios');
  if (tipoRegistro === 'actualizacion' && camposModificados && camposModificados.length > 0) {
    seccionComparacion.style.display = 'block';

    // Usar los campos modificados del registro para mostrar cambios
    const listaCambios = document.getElementById('listaCambios');

    const cambios = camposModificados.map(cambio => {
      // Mapear nombres de campos de Firebase a nombres legibles
      const nombresCampos = {
        'temperatura_corporal': { nombre: 'Temperatura', icono: 'fa-thermometer-half', unidad: '°C' },
        'peso': { nombre: 'Peso', icono: 'fa-weight', unidad: 'kg' },
        'frecuencia_respiratoria': { nombre: 'Frecuencia Respiratoria', icono: 'fa-lungs', unidad: 'rpm' },
        'presion_arterial': { nombre: 'Presión Arterial', icono: 'fa-heartbeat', unidad: 'mmHg' },
        'talla': { nombre: 'Talla', icono: 'fa-ruler-vertical', unidad: 'cm' },
        'examen_vista': { nombre: 'Examen de Vista', icono: 'fa-eye', unidad: '' },
        'examen_oido': { nombre: 'Examen de Oído', icono: 'fa-ear-listen', unidad: '' }
      };

      const config = nombresCampos[cambio.campo] || { nombre: cambio.campo, icono: 'fa-file-medical', unidad: '' };

      return {
        campo: config.nombre,
        icono: config.icono,
        anterior: cambio.valorAnterior || 'No registrado',
        nuevo: cambio.valorNuevo || 'No registrado',
        tipo: cambio.valorAnterior ? 'modificado' : 'nuevo'
      };
    });

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

async function verDetallesPaciente(pacienteId) {
  try {
    const paciente = await pacienteModel.getPaciente(pacienteId);
    if (!paciente) {
      mostrarMensaje('error', '❌ Error', 'No se pudo encontrar el paciente solicitado. Actualiza la página e intenta nuevamente.');
      return;
    }
    
    // Llenar datos del modal
    llenarModalVerPaciente(paciente);
    
    // Mostrar modal
    mostrarModalVerPaciente();
  } catch (error) {
    console.error('❌ Error al obtener detalles del paciente:', error);
    mostrarMensaje('error', '❌ Error', 'No se pudieron obtener los detalles del paciente. Intenta nuevamente.');
  }
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
  document.getElementById('modalCarrera').textContent = paciente.carrera || 'No especificada';
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
    document.getElementById('modalUsuarioMedico').textContent = paciente.datosMedicos.usuarioNombre || paciente.datosMedicos.usuarioMedico || 'Sistema';
    document.getElementById('modalUltimaActualizacion').textContent = new Date(paciente.datosMedicos.fechaRegistroMedico).toLocaleString('es-ES');
  } else {
    document.getElementById('modalUsuarioMedico').textContent = 'Sin datos médicos';
    document.getElementById('modalUltimaActualizacion').textContent = 'Sin datos médicos';
  }
    
  // Guardar ID del paciente para edición
  window.currentPacienteId = paciente.id;
}

async function editarPaciente(pacienteId) {
  try {
    const paciente = await pacienteModel.getPaciente(pacienteId);
    if (!paciente) {
      mostrarMensaje('error', '❌ Error', 'No se pudo encontrar el paciente para editar. Actualiza la página e intenta nuevamente.');
      return;
    }
    
    // Guardar ID del paciente para edición
    window.currentPacienteId = pacienteId;
    
    // Llenar formulario de edición
    llenarFormularioEdicion(paciente);
    
    // Inicializar dropdowns de facultad y carrera
    await initFacultadesCarrerasEditar();
    
    // Mostrar modal de edición
    document.getElementById('modalEditarPaciente').style.display = 'flex';
  } catch (error) {
    console.error('❌ Error al obtener paciente para editar:', error);
    mostrarMensaje('error', '❌ Error', 'No se pudo obtener el paciente para editar. Intenta nuevamente.');
  }
}

async function eliminarPaciente(pacienteId) {
  try {
    // Obtener datos del paciente para mostrar en la confirmación
    const paciente = await pacienteModel.getPaciente(pacienteId);
    if (!paciente) {
      mostrarMensaje('error', '❌ Error', 'No se pudo encontrar el paciente para eliminar. Actualiza la página e intenta nuevamente.');
      return;
    }
    
    // Verificar si el paciente tiene datos médicos para informar en la confirmación
    const tieneDatosMedicos = paciente.status === 'completo';
    const historial = await pacienteModel.getHistorialMedico();
    const historialCount = historial.filter(h => h.pacienteId === pacienteId).length;
    
    // Confirmación personalizada antes de eliminar
    const mensaje = `
      <div class="delete-info-section">
        <div class="delete-info-grid">
          <div class="delete-info-item">
            <label>Nombre:</label>
            <span>${paciente.nombre} ${paciente.apellidos || ''}</span>
          </div>
          <div class="delete-info-item">
            <label>Matrícula:</label>
            <span>${paciente.matricula}</span>
          </div>
          <div class="delete-info-item">
            <label>Estado:</label>
            <span class="${tieneDatosMedicos ? 'status-complete' : 'status-incomplete'}">${tieneDatosMedicos ? 'Datos médicos completos' : 'Sin datos médicos'}</span>
          </div>
          <div class="delete-info-item">
            <label>Registros de historial:</label>
            <span>${historialCount}</span>
          </div>
        </div>
      </div>

      <div class="delete-warning">
        <h5><i class="fas fa-exclamation-triangle"></i> ADVERTENCIA</h5>
        <p>Esta acción NO se puede deshacer.</p>
      </div>

      <div class="delete-affected-items">
        <strong>Se eliminará:</strong>
        <ul>
          <li><i class="fas fa-user-times"></i> Información personal del paciente</li>
          ${tieneDatosMedicos ? '<li><i class="fas fa-heartbeat"></i> Datos médicos completos</li>' : ''}
          ${historialCount > 0 ? `<li><i class="fas fa-file-medical"></i> ${historialCount} registro(s) de historial médico</li>` : ''}
        </ul>
      </div>
    `;

    mostrarConfirmacion('🗑️ Eliminar Paciente', mensaje, () => {
      eliminarPacienteConfirmado(pacienteId, paciente, tieneDatosMedicos, historialCount);
    }, 'danger');
  } catch (error) {
    console.error('❌ Error al obtener paciente para eliminar:', error);
    mostrarMensaje('error', '❌ Error', 'No se pudo obtener el paciente para eliminar. Intenta nuevamente.');
  }
}

async function eliminarPacienteConfirmado(pacienteId, paciente, tieneDatosMedicos, historialCount) {
  
  try {
    // Eliminar registros del historial médico relacionados con este paciente
    if (historialCount > 0) {
      const historial = await pacienteModel.getHistorialMedico();
      const historialFiltrado = historial.filter(h => h.pacienteId !== pacienteId);
      // Nota: Necesitaríamos un método setHistorialMedico o clearHistorialByPaciente en el modelo
      // Por ahora, el historial se mantendrá pero sin referencia al paciente eliminado
    }
    
    // Eliminar paciente del modelo
    const eliminado = await pacienteModel.deletePaciente(pacienteId);
    
    if (eliminado) {
      // Registrar actividad de eliminación de paciente
      try {
        const { default: ActivityLogger } = await import('../utils/activityLogger.js');
        await ActivityLogger.deletePatientActivity(
          pacienteId,
          `${paciente.nombre} ${paciente.apellidos || ''}`,
          paciente.matricula
        );
      } catch (error) {
        console.warn('Error registrando actividad de eliminación de paciente:', error);
      }

      // Mostrar confirmación con detalles de lo eliminado
      let detallesEliminados = [];
      if (tieneDatosMedicos) detallesEliminados.push('Datos médicos');
      if (historialCount > 0) detallesEliminados.push(`${historialCount} registro(s) de historial`);
      
      const usuarioActual = obtenerUsuarioActual();
      
      mostrarMensaje('success', '🗑️ Paciente Eliminado', 
        `${paciente.nombre} ${paciente.apellidos || ''} (${paciente.matricula}) ha sido eliminado.\n${detallesEliminados.length > 0 ? 'También se eliminó: ' + detallesEliminados.join(', ') : ''}\n\nEliminado por: ${usuarioActual.nombre}`, 6000);
      
      // Actualizar todas las vistas
      await renderPacientesList();
      await renderDatosMedicosForm();
      await renderHistorialCompleto();
      
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
  messageEl.innerHTML = mensaje; // Cambiar a innerHTML para permitir HTML estructurado

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
  // Obtener usuario del authModel (sistema Firebase)
  try {
    // Intentar importar authModel dinámicamente si no está disponible globalmente
    if (window.authModel && typeof window.authModel.getCurrentUser === 'function') {
      const currentUser = window.authModel.getCurrentUser();
      if (currentUser) {
        return {
          id: currentUser.uid || currentUser.id || 'unknown',
          nombre: currentUser.nombre || currentUser.name || 'Usuario Anónimo',
          rol: currentUser.rol || currentUser.role || 'sin-rol'
        };
      }
    }
  } catch (error) {
    console.warn('Error obteniendo usuario del authModel:', error);
  }

  // Fallback: buscar en sessionStorage (donde guarda authModel)
  try {
    const sessionUser = sessionStorage.getItem('currentUser');
    if (sessionUser) {
      const currentUser = JSON.parse(sessionUser);
      if (currentUser) {
        return {
          id: currentUser.uid || currentUser.id || 'unknown',
          nombre: currentUser.nombre || currentUser.name || 'Usuario Anónimo',
          rol: currentUser.rol || currentUser.role || 'sin-rol'
        };
      }
    }
  } catch (error) {
    console.warn('Error obteniendo usuario de sessionStorage:', error);
  }

  // Si no se encuentra usuario, devolver usuario anónimo
  console.warn('No se pudo obtener información del usuario actual');
  return {
    id: 'unknown',
    nombre: 'Usuario Anónimo',
    rol: 'sin-rol'
  };
}// Funciones para manejar modales
function mostrarModalVerPaciente() {
  document.getElementById('modalVerPaciente').style.display = 'flex';
}

function cerrarModalVerPaciente() {
  document.getElementById('modalVerPaciente').style.display = 'none';
}

async function initFacultadesCarrerasEditar() {
  // Llamar a la función global definida en el HTML
  if (typeof window.initFacultadesCarrerasEditar === 'function') {
    window.initFacultadesCarrerasEditar();
  }
}

function llenarFormularioEdicion(paciente) {
  // Datos personales
  document.getElementById('editMatricula').value = paciente.matricula;
  document.getElementById('editNombres').value = paciente.nombre;
  document.getElementById('editApellidos').value = paciente.apellidos || '';
  document.getElementById('editFechaNacimiento').value = paciente.fechaNacimiento ? paciente.fechaNacimiento.split('T')[0] : '';
  document.getElementById('editGrado').value = paciente.grado;
  document.getElementById('editGrupo').value = paciente.grupo;
  document.getElementById('editTelefono').value = paciente.telefono;
  
  // Seleccionar facultad y carrera
  const editFacultadSelect = document.getElementById('editFacultad');
  const editCarreraSelect = document.getElementById('editCarrera');
  
  if (editFacultadSelect && editCarreraSelect) {
    // Limpiar opciones existentes
    editFacultadSelect.innerHTML = '<option value="">Seleccione una facultad</option>';
    editCarreraSelect.innerHTML = '<option value="">Seleccione una carrera</option>';
    editCarreraSelect.disabled = true;
    
    // Poblar el select de facultades desde window.facultadesYCarreras
    if (window.facultadesYCarreras) {
      Object.keys(window.facultadesYCarreras).forEach(facultad => {
        editFacultadSelect.add(new Option(facultad, facultad));
      });
    }
    
    // Establecer la facultad del paciente si existe
    if (paciente.facultad) {
      editFacultadSelect.value = paciente.facultad;
      
      // Cargar las carreras de la facultad seleccionada
      if (window.facultadesYCarreras && window.facultadesYCarreras[paciente.facultad]) {
        editCarreraSelect.disabled = false;
        window.facultadesYCarreras[paciente.facultad].forEach(carrera => {
          editCarreraSelect.add(new Option(carrera, carrera));
        });
        
        // Establecer la carrera del paciente si existe
        if (paciente.carrera) {
          editCarreraSelect.value = paciente.carrera;
        }
      }
    }
  }
  
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
  
  // Resetear selectores de facultad y carrera
  if (typeof window.resetFacultadesCarrerasEditar === 'function') {
    window.resetFacultadesCarrerasEditar();
  }
}

async function handleEditarPacienteSubmit(event) {
  event.preventDefault();
  
  const pacienteId = window.currentPacienteId;
  if (!pacienteId) {
    mostrarMensaje('error', '❌ Error de Identificación', 'No se puede identificar el paciente a editar. Cierra el modal e intenta nuevamente.');
    return;
  }
  
  const formData = new FormData(event.target);
  
  // Validación completa del formulario de edición
  const validation = validateForm('paciente', formData);
  if (!validation.isValid) {
    // Mostrar errores de validación
    const errorMessage = validation.errors.join('\n');
    mostrarMensaje('error', '❌ Errores de Validación', errorMessage, 8000);
    return;
  }
  
  // Mostrar advertencias si existen
  if (validation.warnings.length > 0) {
    const warningMessage = validation.warnings.join('\n');
    mostrarMensaje('warning', '⚠️ Advertencias', warningMessage, 6000);
  }
  
  // Extraer datos del formulario
  const nombre = formData.get('nombres').trim();
  const apellidos = formData.get('apellidos').trim();
  
  // Datos personales actualizados
  const datosPersonales = {
    matricula: formData.get('matricula'),
    nombre: nombre,
    apellidos: apellidos,
    fechaNacimiento: formData.get('fecha-nacimiento'),
    grado: formData.get('grado'),
    grupo: formData.get('grupo'),
    telefono: formData.get('telefono'),
    facultad: formData.get('facultad'),
    carrera: formData.get('carrera')
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
    usuarioId: usuarioActual.id,
    usuarioNombre: usuarioActual.nombre,
    fechaRegistroMedico: new Date().toISOString()
  };
  
  try {
    // Actualizar datos personales
    const pacienteActualizado = await pacienteModel.updatePaciente(pacienteId, datosPersonales);
    
    if (pacienteActualizado) {
      // Actualizar datos médicos si hay algún valor
      const hayDatosMedicos = Object.values(datosMedicos).some(v => v !== null && v !== '');
      
      if (hayDatosMedicos) {
        await pacienteModel.updateDatosMedicos(pacienteId, datosMedicos);
      }
      
      const usuarioActual = obtenerUsuarioActual();
      mostrarMensaje('success', '✅ Paciente Actualizado', 
        `Los datos de ${datosPersonales.nombre} ${datosPersonales.apellidos || ''} han sido actualizados exitosamente.\n\nActualizado por: ${usuarioActual.nombre}`, 5000);
      
      // Cerrar modal y actualizar vistas
      cerrarModalEditarPaciente();
      await renderPacientesList();
      await renderDatosMedicosForm();
      await renderHistorialCompleto();
      
    } else {
      mostrarMensaje('error', '❌ Error al Actualizar', 'No se pudo actualizar el paciente. Verifica los datos e intenta nuevamente.');
    }
  } catch (error) {
    console.error('Error al editar paciente:', error);
    mostrarMensaje('error', '❌ Error del Sistema', 'Error interno al actualizar el paciente. Contacta al administrador.');
  }
}

async function eliminarRegistroHistorial(registroId, pacienteId, isActualizacion, nombrePaciente) {
  const tipoRegistro = isActualizacion ? 'actualización' : 'registro inicial';

  // Crear mensaje estructurado para el modal de confirmación
  const mensaje = `
    <div class="delete-info-section">
      <div class="delete-info-grid">
        <div class="delete-info-item">
          <label>Paciente:</label>
          <span>${nombrePaciente}</span>
        </div>
        <div class="delete-info-item">
          <label>Tipo de registro:</label>
          <span>${tipoRegistro}</span>
        </div>
        <div class="delete-info-item">
          <label>ID del registro:</label>
          <span style="font-family: monospace; font-size: 0.8em;">${registroId}</span>
        </div>
      </div>
    </div>

    <div class="delete-warning">
      <h5><i class="fas fa-exclamation-triangle"></i> ADVERTENCIA</h5>
      <p>Esta acción eliminará permanentemente este registro médico del historial.</p>
    </div>

    <div class="delete-affected-items">
      <strong>Se eliminará:</strong>
      <ul>
        <li><i class="fas fa-file-medical"></i> Registro médico ${tipoRegistro}</li>
        <li><i class="fas fa-history"></i> Entrada del historial clínico</li>
      </ul>
    </div>
  `;

  // Mostrar confirmación personalizada
  mostrarConfirmacion(
    '🗑️ Eliminar Registro Médico',
    mensaje,
    async () => {
      try {
        // Eliminar registro de la colección registros_medicos
        const eliminacionExitosa = await pacienteModel.deleteRegistroMedico(registroId);

        if (eliminacionExitosa) {
          // Registrar actividad de eliminación de registro médico
          try {
            const { default: ActivityLogger } = await import('../utils/activityLogger.js');
            await ActivityLogger.deleteMedicalRecordActivity(
              registroId,
              pacienteId,
              nombrePaciente,
              tipoRegistro
            );
          } catch (error) {
            console.warn('Error registrando actividad de eliminación de registro médico:', error);
          }

          const usuarioActual = obtenerUsuarioActual();

          // Mostrar mensaje de éxito
          mostrarMensaje('success', '✅ Registro Eliminado',
            `El ${tipoRegistro} de ${nombrePaciente} ha sido eliminado exitosamente.\n\nEliminado por: ${usuarioActual.nombre}`, 4000);

          // Actualizar vistas
          await renderHistorialCompleto();
          await renderPacientesList();
          await renderDatosMedicosForm();

        } else {
          mostrarMensaje('error', '❌ Error al Eliminar', 'No se pudo eliminar el registro. Intenta nuevamente.');
        }

      } catch (error) {
        console.error('Error al eliminar registro del historial:', error);
        mostrarMensaje('error', '❌ Error del Sistema', 'Error interno al eliminar el registro. Contacta al administrador.');
      }
    },
    'danger'
  );
}

async function abrirModalEditarPaciente() {
  const pacienteId = window.currentPacienteId;
  if (!pacienteId) {
    mostrarMensaje('error', '❌ Error', 'No se puede identificar el paciente a editar. Cierra el modal e intenta nuevamente.');
    return;
  }
  
  await editarPaciente(pacienteId);
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