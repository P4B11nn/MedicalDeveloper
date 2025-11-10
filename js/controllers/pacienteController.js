// js/controllers/pacienteController.js

import { pacienteModel } from '../models/pacienteModel.js';
import { renderPacienteForm } from '../views/pacienteView.js';
import { ImageUploadComponent } from '../utils/imageUploadComponent.js';
import imageStorageModelDefault, { imageStorageModel } from '../models/imageStorageModelNew.js';

/**
 * Service layer - Maneja la lógica de negocio sin exponer modelos
 */
const PacienteImageService = {
  /**
   * Obtener URL de imagen de perfil de un paciente
   * @param {Object} paciente - Objeto paciente
   * @returns {Promise<string|null>} URL de la imagen o null
   */
  async obtenerImagenPerfil(paciente) {
    try {
      // Usar el modelo importado directamente
      const modelToUse = imageStorageModel || imageStorageModelDefault;
      
      if (!modelToUse) {
        console.error('❌ imageStorageModel no disponible');
        return null;
      }
      
      // Prioridad 1: Nuevo sistema con fotoPerfilId
      if (paciente.fotoPerfilId) {
        const imagen = await modelToUse.obtenerImagenPorId(paciente.fotoPerfilId);
        
        if (imagen && imagen.url) {
          return imagen.url;
        }
      }
      
      // Prioridad 2: Sistema anterior con imagenPerfil (fallback)
      if (paciente.imagenPerfil && paciente.imagenPerfil.url) {
        return paciente.imagenPerfil.url;
      }
      
      return null;
    } catch (error) {
      console.error('Error obteniendo imagen de perfil:', error);
      return null;
    }
  },

  /**
   * Verificar si un paciente tiene imagen de perfil
   * @param {Object} paciente - Objeto paciente
   * @returns {boolean} True si tiene imagen
   */
  tieneImagenPerfil(paciente) {
    return !!(paciente.fotoPerfilId || (paciente.imagenPerfil && paciente.imagenPerfil.url));
  }
};

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

  // Glucosa
  const glucosaStr = formData.get('glucosa')?.trim();
  if (glucosaStr) {
    const glucosa = parseInt(glucosaStr);
    if (isNaN(glucosa)) {
      errors.push('El nivel de glucosa debe ser un número válido');
    } else if (glucosa < 50 || glucosa > 400) {
      errors.push(`Glucosa: ${glucosa} mg/dL está fuera del rango válido (50-400 mg/dL)`);
    } else if (glucosa < 70 || glucosa > 100) {
      warnings.push(`Glucosa: ${glucosa} mg/dL fuera del rango normal en ayunas (70-100 mg/dL)`);
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export async function initPacienteController() {
  // Verificar disponibilidad de modelos críticos
  const modelToUse = imageStorageModel || imageStorageModelDefault;
  
  if (!modelToUse) {
    console.error('CRÍTICO: imageStorageModel no disponible');
  }
  
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
      } else if (action.includes('imágenes') || action.includes('fotos')) {
        mostrarImagenesPaciente(pacienteId);
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
  
  // Manejar botones de agregar imágenes
  if (target.matches('.btn-add-images') || target.closest('.btn-add-images')) {
    const pacienteId = target.dataset.pacienteId || target.closest('.btn-add-images').dataset.pacienteId;
    if (pacienteId) {
      mostrarModalAgregarImagenes(pacienteId);
    }
  }
  
  // Manejar ver galería de imágenes
  if (target.matches('.btn-view-gallery') || target.closest('.btn-view-gallery')) {
    const pacienteId = target.dataset.pacienteId || target.closest('.btn-view-gallery').dataset.pacienteId;
    if (pacienteId) {
      mostrarGaleriaImagenes(pacienteId);
    }
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

  // Obtener archivo de imagen si fue seleccionado
  const imagenFile = formData.get('fotoPerfil');
  const tieneImagen = imagenFile && imagenFile.size > 0;
  
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
      // Si hay imagen, subirla después de crear el paciente
      if (tieneImagen) {
        try {
          console.log('📸 Procesando imagen de perfil...', {
            fileName: imagenFile.name,
            size: imagenFile.size,
            type: imagenFile.type,
            usuarioActual: usuarioActual
          });
          
          const metadataImagen = {
            usuarioId: usuarioActual.id,
            usuarioNombre: usuarioActual.nombre
          };
          
          const resultado = await pacienteModel.actualizarFotoPerfil(
            pacienteGuardado.id, 
            imagenFile, 
            metadataImagen
          );
          
          console.log('✅ Foto de perfil agregada al paciente:', resultado);
        } catch (error) {
          console.error('❌ Error subiendo foto de perfil:', error);
          mostrarMensaje('warning', '⚠️ Advertencia', 
            'El paciente fue registrado exitosamente, pero no se pudo subir la foto de perfil. Puedes agregarla después desde Editar.');
        }
      } else {
        console.log('📷 No se seleccionó imagen de perfil para el paciente');
      }

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

      const mensajeExito = tieneImagen ? 
        `${nuevoPaciente.nombre} ${nuevoPaciente.apellidos || ''} ha sido registrado exitosamente con foto de perfil.\nMatrícula: ${nuevoPaciente.matricula}` :
        `${nuevoPaciente.nombre} ${nuevoPaciente.apellidos || ''} ha sido registrado exitosamente.\nMatrícula: ${nuevoPaciente.matricula}`;

      mostrarMensaje('success', '✅ Paciente Registrado', mensajeExito);
      
      event.target.reset();
      
      // Limpiar preview de imagen si existe
      limpiarPreviewImagen('registro');
      
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
    const glucosa = formData.get('glucosa')?.trim();
    const examenVista = formData.get('examenVista')?.trim();
    const examenOido = formData.get('examenOido')?.trim();
    const observacionesGenerales = formData.get('observacionesGenerales')?.trim();
    
    const hayDatos = temperatura || presion || peso || talla || frecuenciaRespiratoria || glucosa || examenVista || examenOido || observacionesGenerales;
    
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
      glucosa: glucosa || null,
      examenVista: examenVista || null,
      examenOido: examenOido || null,
      observacionesGenerales: observacionesGenerales || null,
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
    document.getElementById('modalHistorialGlucosa').textContent = datosActuales.glucosa ? `${datosActuales.glucosa} mg/dL` : '-';
    document.getElementById('modalHistorialExamenVista').textContent = datosActuales.examen_vista || 'No registrado';
    document.getElementById('modalHistorialExamenOido').textContent = datosActuales.examen_oido || 'No registrado';
    document.getElementById('modalHistorialObservacionesGenerales').textContent = datosActuales.observaciones_generales || 'No registrado';

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
    await llenarModalVerPaciente(paciente);
    
    // Mostrar modal
    mostrarModalVerPaciente();
  } catch (error) {
    console.error('❌ Error al obtener detalles del paciente:', error);
    mostrarMensaje('error', '❌ Error', 'No se pudieron obtener los detalles del paciente. Intenta nuevamente.');
  }
}

async function llenarModalVerPaciente(paciente) {
  // Información básica
  document.getElementById('modalTituloPaciente').textContent = `${paciente.nombre} ${paciente.apellidos || ''}`;
  document.getElementById('modalSubtituloPaciente').textContent = `${paciente.matricula} • ${abreviarFacultad(paciente.facultad)}`;
  
  // Mostrar imagen de perfil usando la nueva función optimizada
  const modalImagenPerfil = document.getElementById('modalImagenPerfil');
  if (modalImagenPerfil) {
    await cargarImagenPacienteConProgreso(paciente, modalImagenPerfil, true);
  }
  
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
    document.getElementById('modalGlucosa').textContent = datosMedicos.glucosa ? `${datosMedicos.glucosa} mg/dL` : '-';
    
    // Exámenes
    document.getElementById('modalExamenVista').textContent = datosMedicos.examenVista || 'No registrado';
    document.getElementById('modalExamenOido').textContent = datosMedicos.examenOido || 'No registrado';
    document.getElementById('modalObservacionesGenerales').textContent = datosMedicos.observacionesGenerales || 'No registrado';
    
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

  // Nota: Se eliminó cargarResumenImagenes ya que ahora solo manejamos fotos de perfil
    
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
    await llenarFormularioEdicion(paciente);
    
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
}

// === FUNCIONES PARA MANEJO DE IMÁGENES MÉDICAS ===

/**
 * Muestra el modal para agregar imágenes a un paciente
 * @param {string} pacienteId - ID del paciente
 */
async function mostrarModalAgregarImagenes(pacienteId) {
  try {
    // Obtener datos del paciente
    const paciente = await pacienteModel.getPaciente(pacienteId);
    if (!paciente) {
      mostrarMensaje('error', '❌ Error', 'No se pudo encontrar el paciente.');
      return;
    }

    // Crear modal dinámicamente
    const modalHtml = `
      <div id="modalAgregarImagenes" class="modal" style="display: flex;">
        <div class="modal-content" style="width: 90%; max-width: 800px; max-height: 90vh; overflow-y: auto;">
          <div class="modal-header">
            <h3>
              <i class="fas fa-camera"></i>
              Agregar Imágenes Médicas
            </h3>
            <span class="close" onclick="cerrarModalAgregarImagenes()">&times;</span>
          </div>
          
          <div class="modal-body">
            <div class="patient-info-header">
              <div class="patient-avatar">${paciente.nombre.charAt(0).toUpperCase()}</div>
              <div class="patient-details">
                <h4>${paciente.nombre} ${paciente.apellidos || ''}</h4>
                <p><strong>Matrícula:</strong> ${paciente.matricula}</p>
                <p><strong>Carrera:</strong> ${paciente.carrera || 'No especificada'}</p>
              </div>
            </div>
            
            <div id="imageUploadContainer" class="mt-20"></div>
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="cerrarModalAgregarImagenes()">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    `;

    // Insertar modal en el DOM
    const existingModal = document.getElementById('modalAgregarImagenes');
    if (existingModal) {
      existingModal.remove();
    }
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Inicializar componente de carga de imágenes
    const uploadComponent = new ImageUploadComponent('imageUploadContainer', {
      allowMultiple: true,
      maxFiles: 20,
      tipoImagen: 'historial',
      showPreview: true,
      onUploadStart: (files, metadata) => {
        console.log('Iniciando subida de imágenes...', files.length);
      },
      onUploadComplete: async (resultado) => {
        if (resultado.exitosas && resultado.exitosas.length > 0) {
          mostrarMensaje('success', '✅ Imágenes Subidas', 
            `Se subieron ${resultado.exitosas.length} imagen(es) exitosamente.`);
          
          // Cerrar modal y actualizar vista si es necesario
          cerrarModalAgregarImagenes();
          
          // Actualizar cualquier vista de imágenes abierta
          if (window.currentGalleryPacienteId === pacienteId) {
            mostrarGaleriaImagenes(pacienteId);
          }
        }
        
        if (resultado.errores && resultado.errores.length > 0) {
          mostrarMensaje('warning', '⚠️ Algunas imágenes fallaron', 
            `${resultado.errores.length} imagen(es) no se pudieron subir.`);
        }
      }
    });

    // Manejar evento de subida del componente
    const uploadButton = document.querySelector('#imageUploadContainer .btn-upload-images');
    if (uploadButton) {
      uploadButton.addEventListener('click', async () => {
        try {
          const uploadData = await uploadComponent.uploadImages();
          
          if (uploadData && uploadData.files.length > 0) {
            // Subir imágenes usando el modelo de pacientes
            const resultado = await pacienteModel.guardarImagenesMedicas(
              pacienteId, 
              uploadData.files, 
              uploadData.metadata
            );
            
            // Completar progreso en el componente
            uploadComponent.completeProgress();
            
            // Notificar resultado
            if (uploadComponent.callbacks.onUploadComplete) {
              uploadComponent.callbacks.onUploadComplete(resultado);
            }
          }
        } catch (error) {
          console.error('Error subiendo imágenes:', error);
          uploadComponent.showProgress(false);
          mostrarMensaje('error', '❌ Error', 'No se pudieron subir las imágenes: ' + error.message);
        }
      });
    }

  } catch (error) {
    console.error('Error mostrando modal de imágenes:', error);
    mostrarMensaje('error', '❌ Error', 'No se pudo abrir el modal de imágenes.');
  }
}

/**
 * Cierra el modal de agregar imágenes
 */
function cerrarModalAgregarImagenes() {
  const modal = document.getElementById('modalAgregarImagenes');
  if (modal) {
    modal.remove();
  }
}

/**
 * Muestra la galería de imágenes de un paciente
 * @param {string} pacienteId - ID del paciente
 */
async function mostrarGaleriaImagenes(pacienteId) {
  try {
    // Guardar referencia global para actualizaciones
    window.currentGalleryPacienteId = pacienteId;
    
    const [paciente, imagenes] = await Promise.all([
      pacienteModel.getPaciente(pacienteId),
      pacienteModel.getImagenesMedicasPaciente(pacienteId)
    ]);

    if (!paciente) {
      mostrarMensaje('error', '❌ Error', 'No se pudo encontrar el paciente.');
      return;
    }

    // Crear modal de galería
    const modalHtml = `
      <div id="modalGaleriaImagenes" class="modal" style="display: flex;">
        <div class="modal-content" style="width: 95%; max-width: 1200px; max-height: 90vh;">
          <div class="modal-header">
            <h3>
              <i class="fas fa-images"></i>
              Galería de Imágenes Médicas
            </h3>
            <span class="close" onclick="cerrarModalGaleriaImagenes()">&times;</span>
          </div>
          
          <div class="modal-body" style="max-height: calc(90vh - 120px); overflow-y: auto;">
            <div class="patient-info-header">
              <div class="patient-avatar">${paciente.nombre.charAt(0).toUpperCase()}</div>
              <div class="patient-details">
                <h4>${paciente.nombre} ${paciente.apellidos || ''}</h4>
                <p><strong>Matrícula:</strong> ${paciente.matricula}</p>
                <p><strong>Total de imágenes:</strong> ${imagenes.length}</p>
              </div>
              <div class="gallery-actions">
                <button type="button" class="btn btn-primary btn-sm" onclick="mostrarModalAgregarImagenes('${pacienteId}')">
                  <i class="fas fa-plus"></i>
                  Agregar Más Imágenes
                </button>
              </div>
            </div>
            
            ${imagenes.length === 0 ? 
              `<div class="no-images-message">
                <i class="fas fa-images" style="font-size: 3rem; color: #ccc; margin-bottom: 20px;"></i>
                <h4>No hay imágenes registradas</h4>
                <p>Este paciente aún no tiene imágenes médicas en su historial.</p>
                <button type="button" class="btn btn-primary" onclick="mostrarModalAgregarImagenes('${pacienteId}')">
                  <i class="fas fa-camera"></i>
                  Agregar Primera Imagen
                </button>
              </div>` :
              `<div class="gallery-filters">
                <div class="filter-group">
                  <label for="filtroTipoImagen">Filtrar por tipo:</label>
                  <select id="filtroTipoImagen" class="form-control" onchange="filtrarImagenesGaleria()">
                    <option value="">Todos los tipos</option>
                    <option value="historial">Historial General</option>
                    <option value="rayos_x">Rayos X</option>
                    <option value="laboratorio">Laboratorio</option>
                    <option value="general">General</option>
                  </select>
                </div>
                
                <div class="filter-group">
                  <label for="filtroCategoriaImagen">Filtrar por categoría:</label>
                  <select id="filtroCategoriaImagen" class="form-control" onchange="filtrarImagenesGaleria()">
                    <option value="">Todas las categorías</option>
                    <option value="general">General</option>
                    <option value="sintomas">Síntomas</option>
                    <option value="lesiones">Lesiones</option>
                    <option value="medicamentos">Medicamentos</option>
                    <option value="rayos_x">Rayos X</option>
                    <option value="laboratorio">Laboratorio</option>
                    <option value="tratamiento">Tratamiento</option>
                    <option value="seguimiento">Seguimiento</option>
                  </select>
                </div>
              </div>
              
              <div id="galeriaImagenesGrid" class="gallery-grid">
                ${renderizarImagenesGaleria(imagenes)}
              </div>`
            }
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="cerrarModalGaleriaImagenes()">
              Cerrar Galería
            </button>
          </div>
        </div>
      </div>
    `;

    // Insertar modal en el DOM
    const existingModal = document.getElementById('modalGaleriaImagenes');
    if (existingModal) {
      existingModal.remove();
    }
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Guardar imágenes para filtrado
    window.currentGalleryImages = imagenes;

  } catch (error) {
    console.error('Error mostrando galería de imágenes:', error);
    mostrarMensaje('error', '❌ Error', 'No se pudo cargar la galería de imágenes.');
  }
}

/**
 * Renderiza las imágenes en la galería
 * @param {Array} imagenes - Array de imágenes
 * @returns {string} HTML de las imágenes
 */
function renderizarImagenesGaleria(imagenes) {
  return imagenes.map(imagen => {
    const fechaFormat = new Date(imagen.fechaSubida).toLocaleString('es-ES');
    
    return `
      <div class="gallery-item" data-tipo="${imagen.tipoImagen}" data-categoria="${imagen.categoria}">
        <div class="gallery-image-container">
          <img src="${imagen.downloadURL}" 
               alt="${imagen.originalName}"
               class="gallery-image"
               onclick="mostrarImagenCompleta('${imagen.downloadURL}', '${imagen.originalName}', '${imagen.descripcion}')">
          
          <div class="gallery-overlay">
            <div class="gallery-actions">
              <button class="btn btn-sm btn-primary" title="Ver imagen completa" 
                      onclick="mostrarImagenCompleta('${imagen.downloadURL}', '${imagen.originalName}', '${imagen.descripcion}')">
                <i class="fas fa-expand"></i>
              </button>
              <button class="btn btn-sm btn-info" title="Editar información"
                      onclick="editarInfoImagen('${imagen.id}', '${imagen.pacienteId}')">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-sm btn-danger" title="Eliminar imagen"
                      onclick="confirmarEliminarImagen('${imagen.id}', '${imagen.pacienteId}', '${imagen.filePath}', '${imagen.originalName}')">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
        
        <div class="gallery-info">
          <div class="gallery-title" title="${imagen.originalName}">
            ${imagen.originalName.length > 25 ? imagen.originalName.substring(0, 22) + '...' : imagen.originalName}
          </div>
          <div class="gallery-meta">
            <div class="gallery-date">${fechaFormat}</div>
            <div class="gallery-size">${formatFileSize(imagen.size)}</div>
          </div>
          <div class="gallery-tags">
            <span class="badge badge-primary">${imagen.tipoImagen}</span>
            <span class="badge badge-secondary">${imagen.categoria}</span>
          </div>
          ${imagen.descripcion ? 
            `<div class="gallery-description" title="${imagen.descripcion}">
              ${imagen.descripcion.length > 50 ? imagen.descripcion.substring(0, 47) + '...' : imagen.descripcion}
            </div>` : 
            ''
          }
          <div class="gallery-user">Por: ${imagen.usuarioRegistro}</div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Filtra las imágenes en la galería
 */
function filtrarImagenesGaleria() {
  const tipoFiltro = document.getElementById('filtroTipoImagen')?.value || '';
  const categoriaFiltro = document.getElementById('filtroCategoriaImagen')?.value || '';
  
  const imagenesFiltradas = window.currentGalleryImages.filter(imagen => {
    const matchTipo = !tipoFiltro || imagen.tipoImagen === tipoFiltro;
    const matchCategoria = !categoriaFiltro || imagen.categoria === categoriaFiltro;
    return matchTipo && matchCategoria;
  });
  
  const galeriaGrid = document.getElementById('galeriaImagenesGrid');
  if (galeriaGrid) {
    galeriaGrid.innerHTML = renderizarImagenesGaleria(imagenesFiltradas);
  }
}

/**
 * Muestra una imagen en tamaño completo
 * @param {string} imageUrl - URL de la imagen
 * @param {string} imageName - Nombre de la imagen
 * @param {string} description - Descripción de la imagen
 */
function mostrarImagenCompleta(imageUrl, imageName, description) {
  const modalHtml = `
    <div id="modalImagenCompleta" class="modal" style="display: flex; background: rgba(0,0,0,0.9);">
      <div class="modal-content" style="width: 95%; max-width: none; background: transparent; border: none; box-shadow: none;">
        <div class="modal-header" style="background: rgba(0,0,0,0.8); color: white; border: none;">
          <h4 style="color: white;">${imageName}</h4>
          <span class="close" onclick="cerrarImagenCompleta()" style="color: white; font-size: 2rem;">&times;</span>
        </div>
        
        <div class="modal-body" style="padding: 0; text-align: center; background: transparent;">
          <img src="${imageUrl}" 
               alt="${imageName}"
               style="max-width: 100%; max-height: 80vh; object-fit: contain;">
          
          ${description ? 
            `<div style="background: rgba(0,0,0,0.8); color: white; padding: 15px; margin-top: 10px; border-radius: 5px;">
              <strong>Descripción:</strong> ${description}
            </div>` : 
            ''
          }
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

/**
 * Cierra el modal de imagen completa
 */
function cerrarImagenCompleta() {
  const modal = document.getElementById('modalImagenCompleta');
  if (modal) {
    modal.remove();
  }
}

/**
 * Cierra el modal de galería de imágenes
 */
function cerrarModalGaleriaImagenes() {
  const modal = document.getElementById('modalGaleriaImagenes');
  if (modal) {
    modal.remove();
  }
  
  // Limpiar referencias globales
  window.currentGalleryPacienteId = null;
  window.currentGalleryImages = null;
}

/**
 * Confirma la eliminación de una imagen
 * @param {string} imagenId - ID de la imagen
 * @param {string} pacienteId - ID del paciente
 * @param {string} filePath - Ruta del archivo
 * @param {string} imageName - Nombre de la imagen
 */
async function confirmarEliminarImagen(imagenId, pacienteId, filePath, imageName) {
  const mensaje = `
    <div class="delete-warning">
      <p>¿Estás seguro de que deseas eliminar esta imagen?</p>
      <p><strong>Imagen:</strong> ${imageName}</p>
      <p class="text-danger"><strong>Esta acción no se puede deshacer.</strong></p>
    </div>
  `;
  
  mostrarConfirmacion('🗑️ Eliminar Imagen', mensaje, async () => {
    try {
      await pacienteModel.eliminarImagenMedica(pacienteId, imagenId, filePath);
      
      mostrarMensaje('success', '✅ Imagen Eliminada', 
        `La imagen "${imageName}" ha sido eliminada exitosamente.`);
      
      // Actualizar galería si está abierta
      if (window.currentGalleryPacienteId === pacienteId) {
        mostrarGaleriaImagenes(pacienteId);
      }
    } catch (error) {
      console.error('Error eliminando imagen:', error);
      mostrarMensaje('error', '❌ Error', 'No se pudo eliminar la imagen: ' + error.message);
    }
  }, 'danger');
}

/**
 * Edita la información de una imagen
 * @param {string} imagenId - ID de la imagen
 * @param {string} pacienteId - ID del paciente
 */
async function editarInfoImagen(imagenId, pacienteId) {
  // Por implementar - modal para editar descripción y categoría
  mostrarMensaje('info', 'ℹ️ Función en Desarrollo', 
    'La edición de información de imágenes estará disponible próximamente.');
}

/**
 * Formatea el tamaño de archivo
 * @param {number} bytes - Tamaño en bytes
 * @returns {string} Tamaño formateado
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Muestra las imágenes de un paciente (función de conveniencia)
 * @param {string} pacienteId - ID del paciente
 */
async function mostrarImagenesPaciente(pacienteId) {
  mostrarGaleriaImagenes(pacienteId);
}

// === FUNCIONES AUXILIARES PARA MANEJO DE IMÁGENES EN FORMULARIOS ===

/**
 * Configura el input de imagen en un formulario
 * @param {string} formType - Tipo de formulario ('registro' o 'edicion')
 */
function configurarInputImagen(formType) {
  const inputId = formType === 'registro' ? 'imagenPerfil' : 'imagenPerfilEdit';
  const previewId = formType === 'registro' ? 'previewImagenRegistro' : 'previewImagenEdicion';
  
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  
  if (input && preview) {
    input.addEventListener('change', (event) => {
      manejarCambioImagen(event, previewId, formType);
    });
  }
}

/**
 * Maneja el cambio de imagen en el input file
 * @param {Event} event - Evento de cambio
 * @param {string} previewId - ID del elemento de previsualización
 * @param {string} formType - Tipo de formulario
 */
function manejarCambioImagen(event, previewId, formType) {
  const file = event.target.files[0];
  const previewContainer = document.getElementById(previewId);
  
  if (!file) {
    limpiarPreviewImagen(formType);
    return;
  }
  
  // Validar archivo
  try {
    validarArchivoImagen(file);
  } catch (error) {
    mostrarMensaje('error', '❌ Archivo no válido', error.message);
    event.target.value = '';
    limpiarPreviewImagen(formType);
    return;
  }
  
  // Crear previsualización
  const reader = new FileReader();
  reader.onload = (e) => {
    mostrarPreviewImagen(e.target.result, file.name, formatFileSize(file.size), previewId, formType);
  };
  reader.readAsDataURL(file);
}

/**
 * Muestra la previsualización de la imagen
 * @param {string} imageSrc - Src de la imagen
 * @param {string} fileName - Nombre del archivo
 * @param {string} fileSize - Tamaño del archivo formateado
 * @param {string} previewId - ID del contenedor de preview
 * @param {string} formType - Tipo de formulario
 */
function mostrarPreviewImagen(imageSrc, fileName, fileSize, previewId, formType) {
  const previewContainer = document.getElementById(previewId);
  
  if (previewContainer) {
    previewContainer.innerHTML = `
      <div class="image-preview-container">
        <div class="image-preview-header">
          <h5><i class="fas fa-camera"></i> Foto de Perfil</h5>
          <button type="button" class="btn btn-sm btn-danger" onclick="limpiarPreviewImagen('${formType}')">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="image-preview-content">
          <img src="${imageSrc}" alt="Preview" class="preview-image">
          <div class="image-info">
            <div class="image-name" title="${fileName}">${fileName.length > 30 ? fileName.substring(0, 27) + '...' : fileName}</div>
            <div class="image-size">${fileSize}</div>
          </div>
        </div>
      </div>
    `;
    previewContainer.style.display = 'block';
  }
}

/**
 * Limpia la previsualización de imagen
 * @param {string} formType - Tipo de formulario
 */
function limpiarPreviewImagen(formType) {
  const inputId = formType === 'registro' ? 'imagenPerfil' : 'imagenPerfilEdit';
  const previewId = formType === 'registro' ? 'previewImagenRegistro' : 'previewImagenEdicion';
  
  const input = document.getElementById(inputId);
  const previewContainer = document.getElementById(previewId);
  
  if (input) {
    input.value = '';
  }
  
  if (previewContainer) {
    previewContainer.innerHTML = '';
    previewContainer.style.display = 'none';
  }
  
  // Limpiar checkbox de eliminar si existe
  const eliminarCheckbox = document.getElementById('eliminarImagenActual');
  if (eliminarCheckbox) {
    eliminarCheckbox.checked = false;
  }
}

/**
 * Valida un archivo de imagen
 * @param {File} file - Archivo a validar
 * @throws {Error} Si el archivo no es válido
 */
function validarArchivoImagen(file) {
  // Validar tipo MIME
  const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  
  if (!tiposPermitidos.includes(file.type)) {
    throw new Error(`Tipo de archivo no permitido: ${file.type}. Solo se permiten: JPG, PNG, WebP, GIF`);
  }
  
  // Validar tamaño (máximo 5MB para foto de perfil)
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_SIZE) {
    throw new Error(`El archivo es demasiado grande: ${formatFileSize(file.size)}. Máximo permitido: 5MB`);
  }
  
  // Validar nombre del archivo
  if (file.name.length > 255) {
    throw new Error('El nombre del archivo es demasiado largo');
  }
}

/**
 * Muestra la imagen actual del paciente en el modal de edición
 * @param {Object} paciente - Datos del paciente
 */
async function mostrarImagenActualPaciente(paciente) {
  const currentContainer = document.getElementById('editCurrentImageContainer');
  const uploadArea = document.getElementById('editImageUploadArea');
  const currentImage = document.getElementById('editCurrentImage');
  
  if (!currentContainer || !uploadArea || !currentImage) {
    console.warn('Elementos de imagen en modal de edición no encontrados');
    return;
  }
  
  try {
    // Intentar obtener imagen del paciente
    const imageUrl = await PacienteImageService.obtenerImagenPerfil(paciente);
    
    if (imageUrl) {
      // Mostrar imagen actual
      currentImage.src = imageUrl;
      currentImage.alt = `Foto de ${paciente.nombre}`;
      currentContainer.style.display = 'block';
      uploadArea.style.display = 'none';
      
      // Resetear flag de eliminación
      window.removeCurrentPhoto = false;
    } else {
      // No tiene imagen, mostrar área de upload
      currentContainer.style.display = 'none';
      uploadArea.style.display = 'block';
    }
  } catch (error) {
    console.error('Error cargando imagen actual del paciente:', error);
    // En caso de error, mostrar área de upload
    currentContainer.style.display = 'none';
    uploadArea.style.display = 'block';
  }
}

// Función eliminada: cargarResumenImagenes - Ya no se usa con el nuevo sistema de fotos de perfil// Funciones para manejar modales
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

async function llenarFormularioEdicion(paciente) {
  // Datos personales
  document.getElementById('editMatricula').value = paciente.matricula;
  document.getElementById('editNombres').value = paciente.nombre;
  document.getElementById('editApellidos').value = paciente.apellidos || '';
  document.getElementById('editFechaNacimiento').value = paciente.fechaNacimiento ? paciente.fechaNacimiento.split('T')[0] : '';
  document.getElementById('editGrado').value = paciente.grado;
  document.getElementById('editGrupo').value = paciente.grupo;
  document.getElementById('editTelefono').value = paciente.telefono;
  
  // Mostrar imagen actual del paciente
  await mostrarImagenActualPaciente(paciente);
  
  // Configurar input de imagen para edición
  configurarInputImagen('edicion');
  
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
    document.getElementById('editGlucosa').value = dm.glucosa || '';
    document.getElementById('editExamenVista').value = dm.examenVista || '';
    document.getElementById('editExamenOido').value = dm.examenOido || '';
    document.getElementById('editObservacionesGenerales').value = dm.observacionesGenerales || '';
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
  
  // Limpiar estado de imagen
  window.removeCurrentPhoto = false;
  
  // Limpiar vista previa de imagen
  const previewContainer = document.getElementById('editImagePreviewContainer');
  const uploadArea = document.getElementById('editUploadArea');
  const currentContainer = document.getElementById('editCurrentImageContainer');
  
  if (previewContainer) previewContainer.style.display = 'none';
  if (uploadArea) uploadArea.style.display = 'block';
  if (currentContainer) currentContainer.style.display = 'none';
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
  
  // Verificar si hay nueva imagen
  const nuevaImagen = formData.get('fotoPerfil') || document.getElementById('editFotoPerfil').files[0];
  const tieneNuevaImagen = nuevaImagen && nuevaImagen.size > 0;
  const eliminarImagenActual = window.removeCurrentPhoto === true;
  
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
    glucosa: formData.get('glucosa') || null,
    examenVista: formData.get('examenVista') || null,
    examenOido: formData.get('examenOido') || null,
    observacionesGenerales: formData.get('observacionesGenerales') || null,
    usuarioId: usuarioActual.id,
    usuarioNombre: usuarioActual.nombre,
    fechaRegistroMedico: new Date().toISOString()
  };
  
  try {
    // Obtener datos actuales del paciente para comparar
    const pacienteActual = await pacienteModel.getPaciente(pacienteId);
    if (!pacienteActual) {
      mostrarMensaje('error', '❌ Error', 'No se pudo encontrar el paciente para actualizar.');
      return;
    }
    
    // Manejar cambios de imagen de perfil
    if (eliminarImagenActual && pacienteActual.fotoPerfilId) {
      try {
        // Usar el nuevo sistema de imágenes para eliminar
        const modelToUse = imageStorageModel || imageStorageModelDefault;
        await modelToUse.eliminarImagen(pacienteActual.fotoPerfilId);
        
        // Actualizar paciente para remover referencia
        await pacienteModel.updatePaciente(pacienteId, { fotoPerfilId: null });
        console.log('✅ Foto de perfil eliminada');
        
        mostrarMensaje('success', '✅ Éxito', 'Foto de perfil eliminada correctamente.');
      } catch (error) {
        console.warn('⚠️ Error eliminando foto de perfil:', error);
        mostrarMensaje('warning', '⚠️ Advertencia', 'Los datos se actualizaron, pero hubo un problema eliminando la foto.');
      }
    } else if (tieneNuevaImagen) {
      try {
        const metadataImagen = {
          descripcion: `Foto de perfil de ${nombre} ${apellidos}`,
          usuarioId: usuarioActual.id,
          usuarioNombre: usuarioActual.nombre,
          fechaSubida: new Date().toISOString()
        };
        
        // Usar el nuevo sistema de imágenes para subir
        const modelToUse = imageStorageModel || imageStorageModelDefault;
        const resultado = await modelToUse.subirFotoPerfil(nuevaImagen, pacienteId, metadataImagen);
        
        if (resultado && resultado.success) {
          // Actualizar referencia en el paciente
          await pacienteModel.updatePaciente(pacienteId, { fotoPerfilId: resultado.imageId });
          mostrarMensaje('success', '✅ Éxito', 'Foto de perfil actualizada correctamente.');
        } else {
          throw new Error('Error en el resultado de subida');
        }
      } catch (error) {
        console.error('Error actualizando foto de perfil:', error);
        mostrarMensaje('warning', '⚠️ Advertencia', 'Los datos del paciente se actualizaron, pero hubo un problema con la foto de perfil: ' + error.message);
      }
    }
    
    // Actualizar datos personales
    const pacienteActualizado = await pacienteModel.updatePaciente(pacienteId, datosPersonales);
    
    if (pacienteActualizado) {
      // Verificar si realmente han cambiado los datos médicos comparando con los existentes
      const datosAnteriores = pacienteActual.datosMedicos || {};
      let hayDatosMedicosCambiados = false;
      
      // Comparar cada campo médico para detectar cambios reales
      const camposMedicos = ['temperatura', 'presion', 'peso', 'talla', 'frecuenciaRespiratoria', 'glucosa', 'examenVista', 'examenOido', 'observacionesGenerales'];
      
      for (const campo of camposMedicos) {
        const valorAnterior = datosAnteriores[campo] || '';
        const valorNuevo = datosMedicos[campo] || '';
        
        if (valorAnterior !== valorNuevo) {
          hayDatosMedicosCambiados = true;
          break;
        }
      }
      
      // Solo actualizar datos médicos y registrar en historial si realmente cambiaron
      if (hayDatosMedicosCambiados) {
        await pacienteModel.updateDatosMedicos(pacienteId, datosMedicos);
        console.log('✅ Datos médicos actualizados y registrados en historial');
        
        // Registrar actividad de actualización de datos médicos
        try {
          const { default: ActivityLogger } = await import('../utils/activityLogger.js');
          await ActivityLogger.updateMedicalRecordActivity(
            pacienteId,
            `${datosPersonales.nombre} ${datosPersonales.apellidos || ''}`,
            camposMedicos.filter(campo => {
              const valorAnterior = datosAnteriores[campo] || '';
              const valorNuevo = datosMedicos[campo] || '';
              return valorAnterior !== valorNuevo;
            })
          );
        } catch (error) {
          console.warn('Error registrando actividad de actualización de datos médicos:', error);
        }
      } else {
        console.log('ℹ️ No se detectaron cambios en datos médicos - no se registra en historial');
        
        // Registrar actividad de actualización de datos personales solamente
        try {
          const { default: ActivityLogger } = await import('../utils/activityLogger.js');
          await ActivityLogger.log({
            accion: 'update_paciente_personal',
            descripcion: `Datos personales actualizados: ${datosPersonales.nombre} ${datosPersonales.apellidos || ''} (${datosPersonales.matricula})`,
            modulo: 'pacientes',
            recursoId: pacienteId,
            recursoTipo: 'paciente',
            detalles: { 
              nombre: datosPersonales.nombre,
              apellidos: datosPersonales.apellidos,
              matricula: datosPersonales.matricula,
              tipoActualizacion: 'datos_personales'
            }
          });
        } catch (error) {
          console.warn('Error registrando actividad de actualización de datos personales:', error);
        }
      }
      
      const usuarioActual = obtenerUsuarioActual();
      const mensajeActualizacion = hayDatosMedicosCambiados ? 
        'Los datos personales y médicos han sido actualizados exitosamente.' :
        'Los datos personales han sido actualizados exitosamente.';
      
      mostrarMensaje('success', '✅ Paciente Actualizado', 
        `${mensajeActualizacion}\nPaciente: ${datosPersonales.nombre} ${datosPersonales.apellidos || ''}\n\nActualizado por: ${usuarioActual.nombre}`, 5000);
      
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

// ======================================
// FUNCIONES HELPER PARA NUEVO SISTEMA DE IMÁGENES
// ======================================

/**
 * Obtener imagen del sistema local de almacenamiento
 */
// Función eliminada - reemplazada por PacienteImageService.obtenerImagenPerfil()

/**
 * Mostrar imagen por defecto cuando no hay foto de perfil
 */
function mostrarImagenPorDefecto(contenedor) {
  contenedor.innerHTML = `
    <div class="modal-no-image">
      <i class="fas fa-user-circle"></i>
    </div>
  `;
}

/**
 * Mostrar indicador de carga mientras se obtiene la imagen
 */
function mostrarCargandoImagen(contenedor) {
  contenedor.innerHTML = `
    <div class="modal-loading-image">
      <i class="fas fa-spinner fa-spin"></i>
      <span>Cargando imagen...</span>
    </div>
  `;
}

/**
 * Cargar imagen de paciente con indicador de progreso
 */
async function cargarImagenPacienteConProgreso(paciente, contenedor, esParaModal = true) {
  if (!contenedor) {
    console.warn('⚠️ No se proporcionó contenedor para cargar imagen');
    return;
  }
  
  // Mostrar indicador de carga
  mostrarCargandoImagen(contenedor);
  
  try {
    // Usar el service para obtener la imagen
    const imageUrl = await PacienteImageService.obtenerImagenPerfil(paciente);
    
    if (imageUrl) {
      if (esParaModal) {
        contenedor.innerHTML = `
          <img src="${imageUrl}" 
               alt="Foto de ${paciente.nombre}" 
               class="modal-profile-image"
               onclick="mostrarImagenCompleta('${imageUrl}', 'Foto de ${paciente.nombre} ${paciente.apellidos || ''}', 'Foto de perfil del paciente')">
        `;
      } else {
        // Para otros contextos (como el modal de edición)
        if (typeof setupCurrentImageDisplay === 'function') {
          setupCurrentImageDisplay(imageUrl);
        }
      }
      return;
    }
    
    // No hay imagen
    console.log('⚠️ No se encontró imagen para mostrar, usando imagen por defecto');
    mostrarImagenPorDefecto(contenedor);
    
  } catch (error) {
    console.error('💥 Error cargando imagen del paciente:', error);
    mostrarImagenPorDefecto(contenedor);
  }
}

// Exponer service layer para testing (solo en desarrollo)
if (window.location && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
  window.PacienteImageService = PacienteImageService;
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
// cargarImagenPacienteConProgreso - solo para uso interno del controlador
window.mostrarModalHistorialMedico = mostrarModalHistorialMedico;
window.cerrarModalHistorialMedico = cerrarModalHistorialMedico;