// js/models/pacienteModel.js

// Modelo sencillo para gestionar pacientes, citas e historial médico
// Persistencia: localStorage

const PACIENTES_KEY = 'pacientes';
const CITAS_KEY = 'citas';
const HISTORIAL_KEY = 'historialMedico';

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch (e) {
    console.error('Error leyendo localStorage', key, e);
    return [];
  }
}

function write(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Error escribiendo localStorage', key, e);
    return false;
  }
}

// Inicializar si no existen (sin pacientes de prueba)
if (!localStorage.getItem(PACIENTES_KEY)) {
  write(PACIENTES_KEY, []);
}

if (!localStorage.getItem(CITAS_KEY)) {
  // estructura de cita: { id, pacienteId, fecha, motivo, estado }
  write(CITAS_KEY, []);
}

if (!localStorage.getItem(HISTORIAL_KEY)) {
  // estructura historial: { id, pacienteId, fecha, tipo, notas }
  write(HISTORIAL_KEY, []);
}

export const pacienteModel = {
  // Helper de ordenación: por nombre + apellidos (locale 'es', case-insensitive)
  _sortByName: (arr) => {
    return arr.slice().sort((a, b) => {
      const nameA = ((a.nombre || '') + ' ' + (a.apellidos || '')).trim().toLowerCase();
      const nameB = ((b.nombre || '') + ' ' + (b.apellidos || '')).trim().toLowerCase();
      return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
    });
  },
  // Pacientes
  getPacientes: () => pacienteModel._sortByName(read(PACIENTES_KEY)),

  getPaciente: (id) => {
    if (!id) return null;
    const lista = read(PACIENTES_KEY);
    return lista.find(p => p.id === id || p.matricula === id) || null;
  },

  addPaciente: (paciente) => {
    if (!paciente) return null;
    const lista = read(PACIENTES_KEY);
    
    // Asegurar id único
    if (!paciente.id) paciente.id = 'P' + Date.now().toString().slice(-8);
    paciente.fechaRegistro = paciente.fechaRegistro || new Date().toISOString();
    
    // Inicializar campos médicos como null
    paciente.datosMedicos = {
      temperatura: null,
      presion: null,
      peso: null,
      talla: null,
      frecuenciaRespiratoria: null,
      examenVista: null,
      examenOido: null,
      fechaRegistroMedico: null
    };
    
    // El status será 'sin_datos_medicos' hasta que se complete la información médica
    paciente.status = 'sin_datos_medicos';
    
    lista.push(paciente);
    write(PACIENTES_KEY, lista);
    return paciente;
  },

  updatePaciente: (id, datos) => {
    const lista = read(PACIENTES_KEY);
    const idx = lista.findIndex(p => p.id === id || p.matricula === id);
    if (idx === -1) return null;
    lista[idx] = { ...lista[idx], ...datos };
    write(PACIENTES_KEY, lista);
    return lista[idx];
  },

  deletePaciente: (id) => {
    let lista = read(PACIENTES_KEY);
    const inicial = lista.length;
    lista = lista.filter(p => p.id !== id && p.matricula !== id);
    const changed = lista.length !== inicial;
    if (changed) write(PACIENTES_KEY, lista);
    return changed;
  },

  // Citas
  getCitas: () => read(CITAS_KEY),

  addCita: (cita) => {
    if (!cita) return null;
    const lista = read(CITAS_KEY);
    if (!cita.id) cita.id = 'C' + Date.now().toString().slice(-8);
    lista.push(cita);
    write(CITAS_KEY, lista);
    return cita;
  },

  updateCita: (id, datos) => {
    const lista = read(CITAS_KEY);
    const idx = lista.findIndex(c => c.id === id);
    if (idx === -1) return null;
    lista[idx] = { ...lista[idx], ...datos };
    write(CITAS_KEY, lista);
    return lista[idx];
  },

  deleteCita: (id) => {
    let lista = read(CITAS_KEY);
    const inicial = lista.length;
    lista = lista.filter(c => c.id !== id);
    const changed = lista.length !== inicial;
    if (changed) write(CITAS_KEY, lista);
    return changed;
  },

  // Datos médicos
  updateDatosMedicos: (pacienteId, datosMedicos) => {
    const lista = read(PACIENTES_KEY);
    const idx = lista.findIndex(p => p.id === pacienteId || p.matricula === pacienteId);
    if (idx === -1) return null;
    
    const paciente = lista[idx];
    const esActualizacion = paciente.status === 'completo';
    
    if (esActualizacion) {
      // Si es una actualización, guardar la información de la actualización en el historial
      lista[idx].historialCambios = lista[idx].historialCambios || [];
      
      // Guardar información de esta actualización en el historial
      lista[idx].historialCambios.push({
        fecha: datosMedicos.fechaRegistroMedico,
        usuario: datosMedicos.usuarioMedico,
        datos: {...datosMedicos} // Los nuevos datos de esta actualización
      });
      
      // Actualizar datos médicos actuales con los nuevos datos
      lista[idx].datosMedicos = {
        ...datosMedicos
      };
      
    } else {
      // Si es el primer registro, simplemente actualizar los datos médicos
      lista[idx].datosMedicos = {
        ...datosMedicos
      };
      
      // Guardar información del registro inicial
      lista[idx].fechaRegistroInicial = datosMedicos.fechaRegistroMedico;
      lista[idx].usuarioRegistroInicial = datosMedicos.usuarioMedico;
    }
    
    // Cambiar status a 'completo' cuando se registren los datos médicos
    lista[idx].status = 'completo';
    
    write(PACIENTES_KEY, lista);
    return lista[idx];
  },

  // Obtener pacientes sin datos médicos
  getPacientesSinDatosMedicos: () => {
    const pacientes = read(PACIENTES_KEY);
    return pacientes.filter(p => p.status === 'sin_datos_medicos');
  },

  // Historial médico
  getHistorialMedico: () => read(HISTORIAL_KEY),

  addRegistroHistorial: (registro) => {
    if (!registro) return null;
    const lista = read(HISTORIAL_KEY);
    if (!registro.id) registro.id = 'H' + Date.now().toString().slice(-8);
    registro.fecha = registro.fecha || new Date().toISOString();
    lista.push(registro);
    write(HISTORIAL_KEY, lista);
    return registro;
  }
};