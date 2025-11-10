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
import { imageStorageModel } from './imageStorageModelNew.js';

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

      // Inicializar campo para el nuevo sistema de imágenes
      pacienteParaGuardar.fotoPerfilId = null;

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
          'glucosa': 'glucosa',
          'examen_vista': 'examenVista',
          'examen_oido': 'examenOido',
          'observaciones_generales': 'observacionesGenerales'
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
            temperatura_corporal: datosMedicos.temperatura || '',
            glucosa: datosMedicos.glucosa || '',
            observaciones_generales: datosMedicos.observacionesGenerales || ''
          },
          datosMedicosAnteriores: {
            examen_oido: datosAnteriores.examenOido || '',
            examen_vista: datosAnteriores.examenVista || '',
            frecuencia_respiratoria: datosAnteriores.frecuenciaRespiratoria || '',
            peso: datosAnteriores.peso || '',
            presion_arterial: datosAnteriores.presion || '',
            talla: datosAnteriores.talla || '',
            temperatura_corporal: datosAnteriores.temperatura || '',
            glucosa: datosAnteriores.glucosa || '',
            observaciones_generales: datosAnteriores.observacionesGenerales || ''
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
            temperatura_corporal: datosMedicos.temperatura || '',
            glucosa: datosMedicos.glucosa || '',
            observaciones_generales: datosMedicos.observacionesGenerales || ''
          },
          datosMedicosAnteriores: {
            examen_oido: '',
            examen_vista: '',
            frecuencia_respiratoria: '',
            peso: '',
            presion_arterial: '',
            talla: '',
            temperatura_corporal: '',
            glucosa: '',
            observaciones_generales: ''
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
  },

  // === FUNCIONES PARA MANEJO DE IMÁGENES MÉDICAS ===

  /**
   * Guarda una o múltiples imágenes médicas para un paciente
   * @param {string} pacienteId - ID del paciente
   * @param {FileList|Array|File} files - Archivos de imagen
   * @param {Object} metadata - Metadata adicional
   * @returns {Promise<Object>} Resultado de la subida
   */
  async guardarImagenesMedicas(pacienteId, files, metadata = {}) {
    try {
      console.log(`📸 Guardando imágenes médicas para paciente ${pacienteId}...`);
      
      // Verificar que el paciente existe
      const paciente = await this.getPaciente(pacienteId);
      if (!paciente) {
        throw new Error('Paciente no encontrado');
      }

      // Convertir File único a array si es necesario
      const filesArray = files instanceof FileList ? Array.from(files) : 
                        files instanceof File ? [files] : 
                        Array.isArray(files) ? files : [files];

      if (filesArray.length === 0) {
        throw new Error('No se proporcionaron archivos para subir');
      }

      // Metadata completo para las imágenes
      const imageMetadata = {
        pacienteNombre: `${paciente.nombre} ${paciente.apellidos || ''}`.trim(),
        pacienteMatricula: paciente.matricula,
        tipoImagen: metadata.tipoImagen || 'historial',
        categoria: metadata.categoria || 'general',
        descripcion: metadata.descripcion || '',
        usuarioId: metadata.usuarioId,
        usuarioNombre: metadata.usuarioNombre,
        fechaRegistro: new Date().toISOString()
      };

      let resultado;
      
      if (filesArray.length === 1) {
        // Subir imagen única
        resultado = await imageStorageModel.subirImagenMedica(
          filesArray[0], 
          pacienteId, 
          imageMetadata.tipoImagen, 
          imageMetadata
        );
        
        // Crear registro en colección de imágenes médicas
        await this.registrarImagenEnHistorial(pacienteId, resultado, imageMetadata);
        
      } else {
        // Subir múltiples imágenes
        resultado = await imageStorageModel.subirMultiplesImagenes(
          filesArray, 
          pacienteId, 
          imageMetadata.tipoImagen, 
          imageMetadata
        );
        
        // Registrar cada imagen exitosa en el historial
        for (const imagen of resultado.exitosas) {
          await this.registrarImagenEnHistorial(pacienteId, imagen, imageMetadata);
        }
      }

      console.log('✅ Imágenes médicas guardadas exitosamente');
      return resultado;

    } catch (error) {
      console.error('❌ Error guardando imágenes médicas:', error);
      throw error;
    }
  },

  /**
   * Registra una imagen en el historial médico del paciente
   * @param {string} pacienteId - ID del paciente
   * @param {Object} imagenData - Datos de la imagen
   * @param {Object} metadata - Metadata adicional
   * @returns {Promise<Object>} Registro creado
   */
  async registrarImagenEnHistorial(pacienteId, imagenData, metadata) {
    try {
      const registroImagen = {
        // Información del paciente
        pacienteId: pacienteId,
        pacienteNombre: metadata.pacienteNombre,
        pacienteMatricula: metadata.pacienteMatricula,
        
        // Información de la imagen
        imagenId: imagenData.id,
        imagenURL: imagenData.downloadURL,
        imagenPath: imagenData.filePath,
        nombreArchivo: imagenData.fileName,
        nombreOriginal: imagenData.originalName,
        tipoImagen: imagenData.tipoImagen,
        categoria: metadata.categoria,
        descripcion: metadata.descripcion,
        tamañoArchivo: imagenData.size,
        tipoContenido: imagenData.contentType,
        
        // Información del registro
        fechaSubida: imagenData.fechaSubida,
        fechaRegistro: metadata.fechaRegistro,
        usuarioId: metadata.usuarioId,
        usuarioNombre: metadata.usuarioNombre,
        
        // Metadatos del sistema
        timestamp: serverTimestamp(),
        tipoRegistro: 'imagen_medica',
        activo: true
      };

      // Guardar en colección específica de imágenes médicas
      const imagenesCollection = collection(db, 'imagenes_medicas');
      const docRef = await addDoc(imagenesCollection, registroImagen);

      console.log(`✅ Imagen registrada en historial con ID: ${docRef.id}`);
      
      return {
        id: docRef.id,
        ...registroImagen
      };

    } catch (error) {
      console.error('❌ Error registrando imagen en historial:', error);
      throw error;
    }
  },

  /**
   * Obtiene todas las imágenes médicas de un paciente
   * @param {string} pacienteId - ID del paciente
   * @param {string} tipoImagen - Filtro por tipo (opcional)
   * @returns {Promise<Array>} Array de imágenes
   */
  async getImagenesMedicasPaciente(pacienteId, tipoImagen = null) {
    try {
      console.log(`🖼️ Obteniendo imágenes médicas del paciente ${pacienteId}...`);

      // Obtener desde Firebase Storage
      const imagenesStorage = await imageStorageModel.obtenerImagenesPaciente(pacienteId, tipoImagen);
      
      // Obtener registros del historial médico (para metadata adicional)
      const imagenesCollection = collection(db, 'imagenes_medicas');
      let q = query(imagenesCollection, where('pacienteId', '==', pacienteId), where('activo', '==', true));
      
      if (tipoImagen) {
        q = query(q, where('tipoImagen', '==', tipoImagen));
      }

      const snapshot = await getDocs(q);
      const registrosImagenes = {};
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        registrosImagenes[data.imagenId] = {
          registroId: doc.id,
          ...data
        };
      });

      // Combinar datos de Storage con registros del historial
      const imagenesCombinadas = imagenesStorage.map(imagen => {
        const registro = registrosImagenes[imagen.id] || {};
        return {
          ...imagen,
          registroId: registro.registroId,
          categoria: registro.categoria || 'general',
          descripcion: registro.descripcion || '',
          fechaRegistro: registro.fechaRegistro || imagen.fechaSubida,
          usuarioRegistro: registro.usuarioNombre || 'Sistema'
        };
      });

      console.log(`✅ ${imagenesCombinadas.length} imágenes médicas obtenidas para paciente ${pacienteId}`);
      return imagenesCombinadas;

    } catch (error) {
      console.error('❌ Error obteniendo imágenes médicas del paciente:', error);
      return [];
    }
  },

  /**
   * Elimina una imagen médica
   * @param {string} pacienteId - ID del paciente
   * @param {string} imagenId - ID de la imagen
   * @param {string} filePath - Ruta del archivo en Storage
   * @returns {Promise<boolean>} True si se eliminó correctamente
   */
  async eliminarImagenMedica(pacienteId, imagenId, filePath) {
    try {
      console.log(`🗑️ Eliminando imagen médica ${imagenId} del paciente ${pacienteId}...`);

      // Marcar como inactivo en el registro del historial (soft delete)
      const imagenesCollection = collection(db, 'imagenes_medicas');
      const q = query(imagenesCollection, where('pacienteId', '==', pacienteId), where('imagenId', '==', imagenId));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const registroDoc = snapshot.docs[0];
        await updateDoc(registroDoc.ref, {
          activo: false,
          fechaEliminacion: new Date().toISOString(),
          eliminadoPor: this.getCurrentUserName(),
          updatedAt: serverTimestamp()
        });
      }

      // Eliminar archivo de Storage
      await imageStorageModel.eliminarImagen(filePath);

      console.log(`✅ Imagen médica ${imagenId} eliminada exitosamente`);
      return true;

    } catch (error) {
      console.error('❌ Error eliminando imagen médica:', error);
      throw error;
    }
  },

  /**
   * Actualiza la metadata de una imagen médica
   * @param {string} pacienteId - ID del paciente
   * @param {string} imagenId - ID de la imagen
   * @param {Object} nuevaMetadata - Nueva metadata
   * @returns {Promise<boolean>} True si se actualizó correctamente
   */
  async actualizarMetadataImagen(pacienteId, imagenId, nuevaMetadata) {
    try {
      console.log(`🔄 Actualizando metadata de imagen ${imagenId}...`);

      const imagenesCollection = collection(db, 'imagenes_medicas');
      const q = query(imagenesCollection, where('pacienteId', '==', pacienteId), where('imagenId', '==', imagenId));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        throw new Error('Registro de imagen no encontrado');
      }

      const registroDoc = snapshot.docs[0];
      const updateData = {
        ...nuevaMetadata,
        fechaActualizacion: new Date().toISOString(),
        actualizadoPor: this.getCurrentUserName(),
        updatedAt: serverTimestamp()
      };

      await updateDoc(registroDoc.ref, updateData);

      console.log(`✅ Metadata de imagen ${imagenId} actualizada exitosamente`);
      return true;

    } catch (error) {
      console.error('❌ Error actualizando metadata de imagen:', error);
      throw error;
    }
  },

  // Función eliminada: getEstadisticasImagenesPaciente - Ya no se usa con el nuevo sistema de fotos de perfil

  /**
   * Obtiene el nombre del usuario actual
   * @returns {string} Nombre del usuario
   */
  getCurrentUserName() {
    try {
      const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
      return currentUser.nombre || 'Sistema';
    } catch (error) {
      return 'Sistema';
    }
  },

  // === FUNCIONES PARA FOTO DE PERFIL ===

  /**
   * Actualiza la foto de perfil de un paciente
   * @param {string} pacienteId - ID del paciente
   * @param {File} imagenFile - Archivo de imagen
   * @param {Object} metadata - Metadata adicional
   * @returns {Promise<Object>} Resultado de la actualización
   */
  async actualizarFotoPerfil(pacienteId, imagenFile, metadata = {}) {
    try {
      console.log(`📸 Actualizando foto de perfil del paciente ${pacienteId}...`);
      console.log('📋 Metadata recibida:', metadata);
      console.log('📄 Archivo de imagen:', {
        name: imagenFile.name,
        size: imagenFile.size,
        type: imagenFile.type
      });
      
      // Verificar que el paciente existe
      const paciente = await this.getPaciente(pacienteId);
      if (!paciente) {
        throw new Error('Paciente no encontrado');
      }

      // Eliminar foto anterior si existe (nuevo sistema)
      if (paciente.fotoPerfilId) {
        try {
          await imageStorageModel.eliminarImagen(paciente.fotoPerfilId);
          console.log('✅ Foto anterior eliminada');
        } catch (error) {
          console.warn('⚠️ No se pudo eliminar la foto anterior:', error);
        }
      }
      // Fallback: eliminar del sistema anterior si existe
      else if (paciente.imagenPerfil && paciente.imagenPerfil.filePath) {
        try {
          await imageStorageModel.eliminarImagen(paciente.imagenPerfil.filePath);
          console.log('✅ Foto anterior (sistema legacy) eliminada');
        } catch (error) {
          console.warn('⚠️ No se pudo eliminar la foto anterior:', error);
        }
      }

      // Subir nueva imagen
      const imageMetadata = {
        pacienteNombre: `${paciente.nombre} ${paciente.apellidos || ''}`.trim(),
        pacienteMatricula: paciente.matricula,
        tipoImagen: 'perfil',
        categoria: 'foto_perfil',
        descripcion: 'Foto de perfil del paciente',
        usuarioId: metadata.usuarioId || this.getCurrentUserId(),
        usuarioNombre: metadata.usuarioNombre || this.getCurrentUserName()
      };

      console.log('📤 Metadata para imageStorage:', imageMetadata);

      // Usar método nuevo sistema de almacenamiento local
      const imagenSubida = await imageStorageModel.subirFotoPerfil(
        imagenFile,
        pacienteId, 
        imageMetadata
      );

      console.log('📥 Resultado del nuevo sistema local:', imagenSubida);

      // Actualizar información del paciente con nuevo sistema local
      const updateData = {
        // Solo los campos del nuevo sistema de almacenamiento local
        fotoPerfilId: imagenSubida.imageId
      };

      console.log('📝 Actualizando paciente con nueva foto de perfil...');
      await this.updatePaciente(pacienteId, updateData);

      console.log('✅ Foto de perfil actualizada exitosamente');
      return {
        success: true,
        fotoPerfilId: updateData.fotoPerfilId
      };

    } catch (error) {
      console.error('❌ Error actualizando foto de perfil:', error);
      throw error;
    }
  },

  /**
   * Elimina la foto de perfil de un paciente
   * @param {string} pacienteId - ID del paciente
   * @returns {Promise<boolean>} True si se eliminó correctamente
   */
  async eliminarFotoPerfil(pacienteId) {
    try {
      console.log(`🗑️ Eliminando foto de perfil del paciente ${pacienteId}...`);

      const paciente = await this.getPaciente(pacienteId);
      if (!paciente) {
        throw new Error('Paciente no encontrado');
      }

      let imagenEliminada = false;

      // Eliminar imagen del nuevo sistema si existe
      if (paciente.fotoPerfilId) {
        try {
          await imageStorageModel.eliminarImagen(paciente.fotoPerfilId);
          imagenEliminada = true;
          console.log('✅ Imagen eliminada del nuevo sistema');
        } catch (error) {
          console.warn('⚠️ Error eliminando imagen del nuevo sistema:', error);
        }
      }

      // Eliminar imagen del sistema anterior si existe (fallback)
      if (paciente.imagenPerfil && paciente.imagenPerfil.filePath) {
        try {
          await imageStorageModel.eliminarImagen(paciente.imagenPerfil.filePath);
          imagenEliminada = true;
          console.log('✅ Imagen eliminada del sistema anterior');
        } catch (error) {
          console.warn('⚠️ Error eliminando imagen del sistema anterior:', error);
        }
      }

      if (!imagenEliminada) {
        throw new Error('El paciente no tiene foto de perfil');
      }

      // Limpiar referencias en el paciente
      const updateData = {
        fotoPerfilId: null
      };

      await this.updatePaciente(pacienteId, updateData);

      console.log('✅ Foto de perfil eliminada exitosamente');
      return true;

    } catch (error) {
      console.error('❌ Error eliminando foto de perfil:', error);
      throw error;
    }
  },

  /**
   * Obtiene el ID del usuario actual
   * @returns {string} ID del usuario
   */
  getCurrentUserId() {
    try {
      const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
      return currentUser.uid || currentUser.id || 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }
};