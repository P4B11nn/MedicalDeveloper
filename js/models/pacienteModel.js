// js/models/pacienteModel.js

// Modelo sencillo para gestionar pacientes, citas e historial médico
// Persistencia: localStorage

const PACIENTES_KEY = 'pacientes';
const CITAS_KEY = 'citas';
const HISTORIAL_KEY = 'historialMedico';

// Datos iniciales de ejemplo (mantener consistencia con las vistas)
const pacienteEjemplo = {
  id: 'P123456EJM',
  matricula: '2023001234',
  nombre: 'pacienteEjemplo',
  apellidos: '',
  fechaNacimiento: '2002-03-15',
  grado: '7mo Semestre',
  grupo: 'A',
  carrera: 'Ingeniería en Sistemas Computacionales',
  facultad: 'FIT',
  telefono: '+52 83 3123-4567',
  status: 'activo',
  fechaRegistro: new Date().toISOString()
};

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

// Inicializar si no existen
if (!localStorage.getItem(PACIENTES_KEY)) {
  write(PACIENTES_KEY, [pacienteEjemplo]);
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
  // Pacientes
  getPacientes: () => read(PACIENTES_KEY),

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