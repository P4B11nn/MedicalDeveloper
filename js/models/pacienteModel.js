// js/models/pacienteModel.js - VERSIÓN CON FIREBASE

// --- IMPORTS ---
import { db } from './firebaseConfig.js';
import {
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
    updateDoc,
    getDoc,
    query,
    where,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// --- CONSTANTES ---
const PACIENTES_COLLECTION = "pacientes";
const CITAS_COLLECTION = "citas";
const HISTORIAL_COLLECTION = "historialMedico";
const REGISTROS_MEDICOS_COLLECTION = "registros_medicos";

// --- COLECCIONES DE FIRESTORE ---
const pacientesCollection = collection(db, PACIENTES_COLLECTION);
const citasCollection = collection(db, CITAS_COLLECTION);
const historialCollection = collection(db, HISTORIAL_COLLECTION);
const registrosMedicosCollection = collection(db, REGISTROS_MEDICOS_COLLECTION);

// --- FUNCIONES AUXILIARES ---
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

// --- MODELO DE PACIENTES CON FIREBASE ---
export const pacienteModel = {
  // Helper de ordenación: por nombre + apellidos (locale 'es', case-insensitive)
  _sortByName: (arr) => {
    return arr.slice().sort((a, b) => {
      const nameA = ((a.nombre || '') + ' ' + (a.apellidos || '')).trim().toLowerCase();
      const nameB = ((b.nombre || '') + ' ' + (b.apellidos || '')).trim().toLowerCase();
      return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
    });
  },

  // Pacientes - FIREBASE VERSION
  async getPacientes() {
    try {
      console.log('🔄 Obteniendo pacientes desde Firebase...');
      const snapshot = await getDocs(pacientesCollection);
      const pacientes = snapshot.docs.map(doc => {
        const data = doc.data();
        // Usar el ID de Firebase, no el ID guardado en el documento
        return {
          id: doc.id,
          ...data
        };
      });

      console.log(`✅ ${pacientes.length} pacientes obtenidos desde Firebase`);
      return this._sortByName(pacientes);
    } catch (error) {
      console.error('❌ Error obteniendo pacientes desde Firebase:', error);
      console.log('🔄 Intentando fallback a localStorage...');

      // Fallback a localStorage si Firebase falla
      try {
        const pacientesLocal = read('pacientes') || [];
        console.log(`📱 ${pacientesLocal.length} pacientes obtenidos desde localStorage`);
        return this._sortByName(pacientesLocal);
      } catch (localError) {
        console.error('❌ Error obteniendo pacientes desde localStorage:', localError);
        return [];
      }
    }
  },

  async getPaciente(id) {
    if (!id) return null;

    try {
      console.log(`🔄 Buscando paciente ${id} en Firebase...`);
      const pacienteDoc = await getDoc(doc(pacientesCollection, id));

      if (pacienteDoc.exists()) {
        console.log('✅ Paciente encontrado en Firebase');
        const data = pacienteDoc.data();
        return {
          id: pacienteDoc.id,
          ...data
        };
      }

      // Si no se encuentra por ID, buscar por matrícula
      const q = query(pacientesCollection, where('matricula', '==', id));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const paciente = snapshot.docs[0];
        const data = paciente.data();
        console.log('✅ Paciente encontrado por matrícula en Firebase');
        return {
          id: paciente.id,
          ...data
        };
      }

      console.log('⚠️ Paciente no encontrado en Firebase');
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo paciente desde Firebase:', error);
      console.log('🔄 Intentando fallback a localStorage...');

      // Fallback a localStorage
      const lista = read('pacientes') || [];
      return lista.find(p => p.id === id || p.matricula === id) || null;
    }
  },

  async addPaciente(paciente) {
    if (!paciente) return null;

    try {
      console.log('🔄 Agregando paciente a Firebase...');

      // No asignar ID manualmente, Firebase lo hace automáticamente
      // Remover cualquier ID existente para evitar conflictos
      const pacienteParaGuardar = { ...paciente };
      delete pacienteParaGuardar.id;

      pacienteParaGuardar.fechaRegistro = pacienteParaGuardar.fechaRegistro || new Date().toISOString();

      // Inicializar campos médicos como null
      pacienteParaGuardar.datosMedicos = {
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
      pacienteParaGuardar.status = 'sin_datos_medicos';

      // Agregar timestamps
      pacienteParaGuardar.createdAt = serverTimestamp();
      pacienteParaGuardar.updatedAt = serverTimestamp();

      // Agregar a Firebase
      const docRef = await addDoc(pacientesCollection, pacienteParaGuardar);

      console.log('✅ Paciente agregado a Firebase con ID:', docRef.id);

      return {
        id: docRef.id,
        ...pacienteParaGuardar
      };
    } catch (error) {
      console.error('❌ Error agregando paciente a Firebase:', error);
      console.log('🔄 Intentando fallback a localStorage...');

      // Fallback a localStorage
      try {
        const lista = read('pacientes') || [];

        // Asegurar id único para localStorage
        if (!paciente.id) paciente.id = 'P' + Date.now().toString().slice(-8);
        paciente.fechaRegistro = paciente.fechaRegistro || new Date().toISOString();

        // Inicializar campos médicos
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

        paciente.status = 'sin_datos_medicos';

        lista.push(paciente);
        write('pacientes', lista);

        console.log('📱 Paciente guardado en localStorage como fallback');
        return paciente;
      } catch (localError) {
        console.error('❌ Error guardando paciente en localStorage:', localError);
        throw new Error('No se pudo guardar el paciente: ' + error.message);
      }
    }
  },

  async updatePaciente(id, datos) {
    try {
      console.log(`🔄 Actualizando paciente ${id} en Firebase...`);

      const pacienteRef = doc(pacientesCollection, id);

      // Verificar que existe
      const pacienteDoc = await getDoc(pacienteRef);
      if (!pacienteDoc.exists()) {
        throw new Error('Paciente no encontrado');
      }

      // Preparar datos para actualización
      const updateData = { ...datos };
      updateData.updatedAt = serverTimestamp();

      // Actualizar en Firebase
      await updateDoc(pacienteRef, updateData);

      console.log('✅ Paciente actualizado en Firebase');

      return {
        id: id,
        ...pacienteDoc.data(),
        ...updateData
      };
    } catch (error) {
      console.error('❌ Error actualizando paciente en Firebase:', error);
      console.log('🔄 Intentando fallback a localStorage...');

      // Fallback a localStorage
      const lista = read('pacientes') || [];
      const idx = lista.findIndex(p => p.id === id || p.matricula === id);
      if (idx === -1) return null;

      lista[idx] = { ...lista[idx], ...datos };
      write('pacientes', lista);

      console.log('📱 Paciente actualizado en localStorage como fallback');
      return lista[idx];
    }
  },

  async deletePaciente(id) {
    try {
      console.log(`🔄 Eliminando paciente ${id} de Firebase...`);

      const pacienteRef = doc(pacientesCollection, id);

      // Verificar que existe
      const pacienteDoc = await getDoc(pacienteRef);
      if (!pacienteDoc.exists()) {
        throw new Error('Paciente no encontrado');
      }

      // Eliminar de Firebase
      await deleteDoc(pacienteRef);

      console.log('✅ Paciente eliminado de Firebase');
      return true;
    } catch (error) {
      console.error('❌ Error eliminando paciente de Firebase:', error);
      console.log('🔄 Intentando fallback a localStorage...');

      // Fallback a localStorage
      let lista = read('pacientes') || [];
      const inicial = lista.length;
      lista = lista.filter(p => p.id !== id && p.matricula !== id);
      const changed = lista.length !== inicial;
      if (changed) write('pacientes', lista);

      console.log('📱 Paciente eliminado de localStorage como fallback');
      return changed;
    }
  },

  // Citas - FIREBASE VERSION
  async getCitas() {
    try {
      console.log('🔄 Obteniendo citas desde Firebase...');
      const snapshot = await getDocs(citasCollection);
      const citas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`✅ ${citas.length} citas obtenidas desde Firebase`);
      return citas;
    } catch (error) {
      console.error('❌ Error obteniendo citas desde Firebase:', error);
      console.log('🔄 Intentando fallback a localStorage...');

      // Fallback a localStorage
      return read('citas') || [];
    }
  },

  async addCita(cita) {
    if (!cita) return null;

    try {
      console.log('🔄 Agregando cita a Firebase...');

      if (!cita.id) cita.id = 'C' + Date.now().toString().slice(-8);
      cita.createdAt = serverTimestamp();
      cita.updatedAt = serverTimestamp();

      const docRef = await addDoc(citasCollection, cita);

      console.log('✅ Cita agregada a Firebase con ID:', docRef.id);

      return {
        id: docRef.id,
        ...cita
      };
    } catch (error) {
      console.error('❌ Error agregando cita a Firebase:', error);
      console.log('🔄 Intentando fallback a localStorage...');

      // Fallback a localStorage
      const lista = read('citas') || [];
      if (!cita.id) cita.id = 'C' + Date.now().toString().slice(-8);
      lista.push(cita);
      write('citas', lista);

      console.log('📱 Cita guardada en localStorage como fallback');
      return cita;
    }
  },

  async updateCita(id, datos) {
    try {
      console.log(`🔄 Actualizando cita ${id} en Firebase...`);

      const citaRef = doc(citasCollection, id);
      const updateData = { ...datos, updatedAt: serverTimestamp() };

      await updateDoc(citaRef, updateData);

      console.log('✅ Cita actualizada en Firebase');
      return { id, ...datos };
    } catch (error) {
      console.error('❌ Error actualizando cita en Firebase:', error);
      console.log('🔄 Intentando fallback a localStorage...');

      // Fallback a localStorage
      const lista = read('citas') || [];
      const idx = lista.findIndex(c => c.id === id);
      if (idx === -1) return null;
      lista[idx] = { ...lista[idx], ...datos };
      write('citas', lista);

      console.log('📱 Cita actualizada en localStorage como fallback');
      return lista[idx];
    }
  },

  async deleteCita(id) {
    try {
      console.log(`🔄 Eliminando cita ${id} de Firebase...`);

      await deleteDoc(doc(citasCollection, id));

      console.log('✅ Cita eliminada de Firebase');
      return true;
    } catch (error) {
      console.error('❌ Error eliminando cita de Firebase:', error);
      console.log('🔄 Intentando fallback a localStorage...');

      // Fallback a localStorage
      let lista = read('citas') || [];
      const inicial = lista.length;
      lista = lista.filter(c => c.id !== id);
      const changed = lista.length !== inicial;
      if (changed) write('citas', lista);

      console.log('📱 Cita eliminada de localStorage como fallback');
      return changed;
    }
  },

  // Datos médicos - ACTUALIZADO PARA USAR COLECCIÓN registros_medicos
  async updateDatosMedicos(pacienteId, datosMedicos) {
    try {
      console.log(`🔄 Actualizando datos médicos del paciente ${pacienteId} en Firebase...`);

      const pacienteRef = doc(pacientesCollection, pacienteId);

      // Verificar que el paciente existe
      const pacienteDoc = await getDoc(pacienteRef);
      if (!pacienteDoc.exists()) {
        throw new Error('Paciente no encontrado');
      }

      const paciente = pacienteDoc.data();
      const esActualizacion = paciente.status === 'completo';

      let updateData = {};

      if (esActualizacion) {
        // Si es una actualización, necesitamos comparar con los datos anteriores
        const datosAnteriores = paciente.datosMedicos || {};

        // Calcular campos modificados
        const camposModificados = [];
        const camposComparar = {
          'temperatura_corporal': 'temperatura',
          'peso': 'peso',
          'frecuencia_respiratoria': 'frecuenciaRespiratoria',
          'presion_arterial': 'presion',
          'talla': 'talla',
          'examen_vista': 'examenVista',
          'examen_oido': 'examenOido'
        };

        Object.entries(camposComparar).forEach(([campoFirebase, campoActual]) => {
          const valorAnterior = datosAnteriores[campoActual] || '';
          const valorNuevo = datosMedicos[campoActual] || '';

          if (valorAnterior !== valorNuevo && valorNuevo !== '') {
            camposModificados.push({
              campo: campoFirebase,
              valorAnterior: valorAnterior,
              valorNuevo: valorNuevo
            });
          }
        });

        // Crear registro en colección registros_medicos
        const registroMedico = {
          camposModificados: camposModificados,
          datosMedicos: {
            examen_oido: datosMedicos.examenOido || '',
            examen_vista: datosMedicos.examenVista || '',
            frecuencia_respiratoria: datosMedicos.frecuenciaRespiratoria || '',
            peso: datosMedicos.peso || '',
            presion_arterial: datosMedicos.presion || '',
            talla: datosMedicos.talla || '',
            temperatura_corporal: datosMedicos.temperatura || ''
          },
          datosMedicosAnteriores: {
            examen_oido: datosAnteriores.examenOido || '',
            examen_vista: datosAnteriores.examenVista || '',
            frecuencia_respiratoria: datosAnteriores.frecuenciaRespiratoria || '',
            peso: datosAnteriores.peso || '',
            presion_arterial: datosAnteriores.presion || '',
            talla: datosAnteriores.talla || '',
            temperatura_corporal: datosAnteriores.temperatura || ''
          },
          fecha: new Date(datosMedicos.fechaRegistroMedico),
          paciente: `${paciente.nombre} ${paciente.apellidos || ''}`.trim(),
          pacienteId: pacienteId,
          pacienteMatricula: paciente.matricula,
          pacienteNombre: `${paciente.nombre} ${paciente.apellidos || ''}`.trim(),
          practicante: datosMedicos.usuarioNombre,
          registradoPor: datosMedicos.usuarioId,
          registradoPorNombre: datosMedicos.usuarioNombre,
          timestamp: new Date(datosMedicos.fechaRegistroMedico),
          tipoRegistro: 'actualizacion',
          totalCamposModificados: camposModificados.length
        };

        await addDoc(registrosMedicosCollection, registroMedico);

        // Actualizar datos médicos actuales - asegurar que siempre se actualice el usuario
        updateData.datosMedicos = {
          ...datosAnteriores, // Mantener datos anteriores
          ...datosMedicos,    // Sobrescribir con nuevos datos
          usuarioId: datosMedicos.usuarioId,
          usuarioNombre: datosMedicos.usuarioNombre,
          fechaRegistroMedico: datosMedicos.fechaRegistroMedico
        };

      } else {
        // Si es el primer registro, crear registro inicial
        const registroMedico = {
          camposModificados: [],
          datosMedicos: {
            examen_oido: datosMedicos.examenOido || '',
            examen_vista: datosMedicos.examenVista || '',
            frecuencia_respiratoria: datosMedicos.frecuenciaRespiratoria || '',
            peso: datosMedicos.peso || '',
            presion_arterial: datosMedicos.presion || '',
            talla: datosMedicos.talla || '',
            temperatura_corporal: datosMedicos.temperatura || ''
          },
          datosMedicosAnteriores: {
            examen_oido: '',
            examen_vista: '',
            frecuencia_respiratoria: '',
            peso: '',
            presion_arterial: '',
            talla: '',
            temperatura_corporal: ''
          },
          fecha: new Date(datosMedicos.fechaRegistroMedico),
          paciente: `${paciente.nombre} ${paciente.apellidos || ''}`.trim(),
          pacienteId: pacienteId,
          pacienteMatricula: paciente.matricula,
          pacienteNombre: `${paciente.nombre} ${paciente.apellidos || ''}`.trim(),
          practicante: datosMedicos.usuarioNombre,
          registradoPor: datosMedicos.usuarioId,
          registradoPorNombre: datosMedicos.usuarioNombre,
          timestamp: new Date(datosMedicos.fechaRegistroMedico),
          tipoRegistro: 'registro_inicial',
          totalCamposModificados: 0
        };

        await addDoc(registrosMedicosCollection, registroMedico);

        // Si es el primer registro, simplemente actualizar los datos médicos
        updateData.datosMedicos = {
          ...datosMedicos,
          usuarioId: datosMedicos.usuarioId,
          usuarioNombre: datosMedicos.usuarioNombre,
          fechaRegistroMedico: datosMedicos.fechaRegistroMedico
        };

        updateData.fechaRegistroInicial = datosMedicos.fechaRegistroMedico;
        updateData.usuarioRegistroInicial = datosMedicos.usuarioNombre;
      }

      // Cambiar status a 'completo' cuando se registren los datos médicos
      updateData.status = 'completo';
      updateData.updatedAt = serverTimestamp();

      // Actualizar paciente
      await updateDoc(pacienteRef, updateData);

      console.log('✅ Datos médicos actualizados en Firebase');
      return {
        id: pacienteId,
        ...paciente,
        ...updateData
      };
    } catch (error) {
      console.error('❌ Error actualizando datos médicos en Firebase:', error);
      throw error; // No hay fallback para registros médicos
    }
  },

  // Obtener pacientes sin datos médicos
  async getPacientesSinDatosMedicos() {
    try {
      console.log('🔄 Obteniendo pacientes sin datos médicos desde Firebase...');

      const q = query(pacientesCollection, where('status', '==', 'sin_datos_medicos'));
      const snapshot = await getDocs(q);
      const pacientes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`✅ ${pacientes.length} pacientes sin datos médicos obtenidos desde Firebase`);
      return this._sortByName(pacientes);
    } catch (error) {
      console.error('❌ Error obteniendo pacientes sin datos médicos desde Firebase:', error);
      console.log('🔄 Intentando fallback a localStorage...');

      // Fallback a localStorage
      const pacientes = read('pacientes') || [];
      const pacientesSinDatos = pacientes.filter(p => p.status === 'sin_datos_medicos');
      return this._sortByName(pacientesSinDatos);
    }
  },

  // Historial médico - NUEVA VERSIÓN CON COLECCIÓN registros_medicos
  async getHistorialMedico() {
    try {
      console.log('🔄 Obteniendo historial médico desde colección registros_medicos...');
      const snapshot = await getDocs(registrosMedicosCollection);
      const historial = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`✅ ${historial.length} registros médicos obtenidos desde Firebase`);
      return historial;
    } catch (error) {
      console.error('❌ Error obteniendo historial médico desde Firebase:', error);
      // No hay fallback a localStorage para registros médicos
      return [];
    }
  },

  // Función auxiliar para obtener registros médicos de un paciente específico
  async getRegistrosMedicosPaciente(pacienteId) {
    try {
      console.log(`🔄 Obteniendo registros médicos del paciente ${pacienteId}...`);
      const q = query(registrosMedicosCollection, where('pacienteId', '==', pacienteId));
      const snapshot = await getDocs(q);
      const registros = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`✅ ${registros.length} registros médicos obtenidos para el paciente ${pacienteId}`);
      return registros;
    } catch (error) {
      console.error('❌ Error obteniendo registros médicos del paciente:', error);
      return [];
    }
  },

  async deleteRegistroMedico(registroId) {
    try {
      console.log(`🔄 Eliminando registro médico ${registroId} de Firebase...`);

      await deleteDoc(doc(registrosMedicosCollection, registroId));

      console.log('✅ Registro médico eliminado de Firebase');
      return true;
    } catch (error) {
      console.error('❌ Error eliminando registro médico de Firebase:', error);
      return false;
    }
  },

  // Función auxiliar para ordenar pacientes por nombre
  _sortByName(pacientes) {
    return pacientes.sort((a, b) => {
      const nombreA = `${a.nombre} ${a.apellidos || ''}`.toLowerCase().trim();
      const nombreB = `${b.nombre} ${b.apellidos || ''}`.toLowerCase().trim();
      return nombreA.localeCompare(nombreB);
    });
  }
};