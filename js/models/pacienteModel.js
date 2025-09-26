// js/models/pacienteModel.js

const PACIENTES_KEY = 'pacientes';
const CITAS_KEY = 'citas';
const HISTORIAL_MEDICO_KEY = 'historial_medico';

// Inicializar datos si no existen
if (!localStorage.getItem(PACIENTES_KEY)) {
  // Datos de ejemplo
  const pacientesDemo = [
    {
      id: 'P001',
      nombre: 'Juan',
      apellidos: 'Pérez García',
      fechaNacimiento: '1990-05-15',
      genero: 'M',
      telefono: '8123456789',
      correo: 'juan.perez@ejemplo.com',
      direccion: 'Calle Principal #123, Centro',
      ultimaConsulta: '2023-08-15',
      status: 'activo'
    },
    {
      id: 'P002',
      nombre: 'María',
      apellidos: 'González López',
      fechaNacimiento: '1985-09-23',
      genero: 'F',
      telefono: '8198765432',
      correo: 'maria.gonzalez@ejemplo.com',
      direccion: 'Av. Reforma #456, Colonia Moderna',
      ultimaConsulta: '2023-09-05',
      status: 'activo'
    }
  ];
  localStorage.setItem(PACIENTES_KEY, JSON.stringify(pacientesDemo));
}

if (!localStorage.getItem(CITAS_KEY)) {
  // Datos de ejemplo para citas
  const citasDemo = [
    {
      id: 'C001',
      pacienteId: 'P001',
      fecha: '2023-10-15T10:00:00',
      motivo: 'Consulta general',
      estado: 'programada',
      medico: 'Dr. Rodríguez',
      mesa: 1
    },
    {
      id: 'C002',
      pacienteId: 'P002',
      fecha: '2023-10-16T11:30:00',
      motivo: 'Seguimiento tratamiento',
      estado: 'programada',
      medico: 'Dr. Rodríguez',
      mesa: 2
    }
  ];
  localStorage.setItem(CITAS_KEY, JSON.stringify(citasDemo));
}

if (!localStorage.getItem(HISTORIAL_MEDICO_KEY)) {
  // Datos de ejemplo para historial médico
  const historialDemo = [
    {
      id: 'H001',
      pacienteId: 'P001',
      fecha: '2023-08-15T09:45:00',
      diagnostico: 'Gripe común',
      tratamiento: 'Paracetamol cada 8 horas por 3 días',
      observaciones: 'Paciente presenta mejoría',
      medico: 'Dr. Rodríguez'
    },
    {
      id: 'H002',
      pacienteId: 'P002',
      fecha: '2023-09-05T10:30:00',
      diagnostico: 'Control de rutina',
      tratamiento: 'Continuar medicación actual',
      observaciones: 'Resultados normales',
      medico: 'Dr. Rodríguez'
    }
  ];
  localStorage.setItem(HISTORIAL_MEDICO_KEY, JSON.stringify(historialDemo));
}

// Generador de IDs únicos
const generarId = (prefijo) => {
  // Obtener el último ID utilizado
  const elementos = JSON.parse(localStorage.getItem(`${prefijo.toLowerCase()}s_key`)) || [];
  let ultimoId = 0;
  
  if (elementos.length > 0) {
    // Extraer el número del último ID
    const ultimoElemento = elementos[elementos.length - 1];
    const match = ultimoElemento.id.match(/\d+$/);
    if (match) {
      ultimoId = parseInt(match[0], 10);
    }
  }
  
  // Generar el nuevo ID con formato "P001", "C001", etc.
  const nuevoNumero = ultimoId + 1;
  return `${prefijo}${nuevoNumero.toString().padStart(3, '0')}`;
};

export const pacienteModel = {
  // Funciones para pacientes
  getPacientes: () => JSON.parse(localStorage.getItem(PACIENTES_KEY)) || [],
  
  getPaciente: (id) => {
    const pacientes = pacienteModel.getPacientes();
    return pacientes.find(p => p.id === id) || null;
  },
  
  addPaciente: (paciente) => {
    const pacientes = pacienteModel.getPacientes();
    
    // Generar ID si no existe
    if (!paciente.id) {
      paciente.id = generarId('P');
    }
    
    // Verificar si el ID ya existe
    if (pacientes.some(p => p.id === paciente.id)) {
      return { success: false, message: 'El ID de paciente ya existe.' };
    }
    
    // Establecer valores por defecto
    if (!paciente.status) {
      paciente.status = 'activo';
    }
    
    pacientes.push(paciente);
    localStorage.setItem(PACIENTES_KEY, JSON.stringify(pacientes));
    return { success: true, message: 'Paciente registrado correctamente.' };
  },
  
  updatePaciente: (id, pacienteActualizado) => {
    const pacientes = pacienteModel.getPacientes();
    const index = pacientes.findIndex(p => p.id === id);
    
    if (index === -1) {
      return { success: false, message: 'Paciente no encontrado.' };
    }
    
    // Actualizar solo los campos proporcionados
    pacientes[index] = {
      ...pacientes[index],
      ...pacienteActualizado
    };
    
    localStorage.setItem(PACIENTES_KEY, JSON.stringify(pacientes));
    return { success: true, message: 'Paciente actualizado correctamente.' };
  },
  
  deletePaciente: (id) => {
    const pacientes = pacienteModel.getPacientes();
    const index = pacientes.findIndex(p => p.id === id);
    
    if (index === -1) {
      return { success: false, message: 'Paciente no encontrado.' };
    }
    
    // Verificar si tiene citas o historial
    const citas = pacienteModel.getCitas().filter(c => c.pacienteId === id);
    const historial = pacienteModel.getHistorialPaciente(id);
    
    if (citas.length > 0 || historial.length > 0) {
      // En lugar de eliminar, marcamos como inactivo
      pacientes[index].status = 'inactivo';
      localStorage.setItem(PACIENTES_KEY, JSON.stringify(pacientes));
      return { 
        success: true, 
        message: 'El paciente tiene registros asociados. Se ha marcado como inactivo.' 
      };
    }
    
    // Si no tiene registros, eliminar completamente
    pacientes.splice(index, 1);
    localStorage.setItem(PACIENTES_KEY, JSON.stringify(pacientes));
    return { success: true, message: 'Paciente eliminado correctamente.' };
  },
  
  buscarPacientes: (termino) => {
    if (!termino) return pacienteModel.getPacientes();
    
    const pacientes = pacienteModel.getPacientes();
    const terminoLower = termino.toLowerCase();
    
    return pacientes.filter(p => 
      p.nombre.toLowerCase().includes(terminoLower) ||
      p.apellidos.toLowerCase().includes(terminoLower) ||
      p.id.toLowerCase().includes(terminoLower)
    );
  },
  
  // Funciones para citas
  getCitas: () => JSON.parse(localStorage.getItem(CITAS_KEY)) || [],
  
  getCitasPaciente: (pacienteId) => {
    const citas = pacienteModel.getCitas();
    return citas.filter(c => c.pacienteId === pacienteId);
  },
  
  getCitasFecha: (fecha) => {
    const citas = pacienteModel.getCitas();
    // Convertir fecha a formato YYYY-MM-DD
    const fechaFormato = new Date(fecha).toISOString().split('T')[0];
    
    return citas.filter(c => {
      const citaFecha = new Date(c.fecha).toISOString().split('T')[0];
      return citaFecha === fechaFormato;
    });
  },
  
  addCita: (cita) => {
    const citas = pacienteModel.getCitas();
    
    // Generar ID si no existe
    if (!cita.id) {
      cita.id = generarId('C');
    }
    
    // Verificar si el ID ya existe
    if (citas.some(c => c.id === cita.id)) {
      return { success: false, message: 'El ID de cita ya existe.' };
    }
    
    // Establecer estado por defecto
    if (!cita.estado) {
      cita.estado = 'programada';
    }
    
    citas.push(cita);
    localStorage.setItem(CITAS_KEY, JSON.stringify(citas));
    return { success: true, message: 'Cita registrada correctamente.' };
  },
  
  updateCita: (id, citaActualizada) => {
    const citas = pacienteModel.getCitas();
    const index = citas.findIndex(c => c.id === id);
    
    if (index === -1) {
      return { success: false, message: 'Cita no encontrada.' };
    }
    
    // Actualizar solo los campos proporcionados
    citas[index] = {
      ...citas[index],
      ...citaActualizada
    };
    
    localStorage.setItem(CITAS_KEY, JSON.stringify(citas));
    return { success: true, message: 'Cita actualizada correctamente.' };
  },
  
  deleteCita: (id) => {
    const citas = pacienteModel.getCitas();
    const index = citas.findIndex(c => c.id === id);
    
    if (index === -1) {
      return { success: false, message: 'Cita no encontrada.' };
    }
    
    citas.splice(index, 1);
    localStorage.setItem(CITAS_KEY, JSON.stringify(citas));
    return { success: true, message: 'Cita eliminada correctamente.' };
  },
  
  // Funciones para historial médico
  getHistorialMedico: () => JSON.parse(localStorage.getItem(HISTORIAL_MEDICO_KEY)) || [],
  
  getHistorialPaciente: (pacienteId) => {
    const historial = pacienteModel.getHistorialMedico();
    return historial.filter(h => h.pacienteId === pacienteId);
  },
  
  addHistorial: (registro) => {
    const historial = pacienteModel.getHistorialMedico();
    
    // Generar ID si no existe
    if (!registro.id) {
      registro.id = generarId('H');
    }
    
    // Verificar si el ID ya existe
    if (historial.some(h => h.id === registro.id)) {
      return { success: false, message: 'El ID de registro ya existe.' };
    }
    
    historial.push(registro);
    localStorage.setItem(HISTORIAL_MEDICO_KEY, JSON.stringify(historial));
    return { success: true, message: 'Registro de historial médico guardado correctamente.' };
  },
  
  updateHistorial: (id, registroActualizado) => {
    const historial = pacienteModel.getHistorialMedico();
    const index = historial.findIndex(h => h.id === id);
    
    if (index === -1) {
      return { success: false, message: 'Registro de historial no encontrado.' };
    }
    
    // Actualizar solo los campos proporcionados
    historial[index] = {
      ...historial[index],
      ...registroActualizado
    };
    
    localStorage.setItem(HISTORIAL_MEDICO_KEY, JSON.stringify(historial));
    return { success: true, message: 'Registro de historial actualizado correctamente.' };
  },
  
  deleteHistorial: (id) => {
    const historial = pacienteModel.getHistorialMedico();
    const index = historial.findIndex(h => h.id === id);
    
    if (index === -1) {
      return { success: false, message: 'Registro de historial no encontrado.' };
    }
    
    historial.splice(index, 1);
    localStorage.setItem(HISTORIAL_MEDICO_KEY, JSON.stringify(historial));
    return { success: true, message: 'Registro de historial eliminado correctamente.' };
  }
};