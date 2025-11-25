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

// --- CONSTANTES DE CACHÉ ---
const CACHE_KEY = 'pacientes_cache';
const CACHE_TIMESTAMP_KEY = 'pacientes_cache_timestamp';
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000; // 24 horas en milisegundos

// --- SINGLETON PATTERN PARA PREVENIR CARGAS MÚLTIPLES ---
let pacientesCache = null; // Caché en memoria de pacientes
let pacientesPromise = null; // Promesa de carga en progreso
let isPacientesLoading = false; // Bandera para prevenir cargas simultáneas

// --- PREVENCIÓN DE CARGAS DUPLICADAS DE PACIENTE INDIVIDUAL ---
const pacienteLoadingMap = new Map(); // Map de promesas de carga por pacienteId

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

  // Pacientes - FIREBASE VERSION con CACHÉ MEJORADO
  async getPacientes(forceRefresh = false) {
    // Verificar estado de conexión más preciso
    const isOnline = navigator.onLine;
    
    // Mostrar notificación de modo offline si es necesario
    if (!isOnline) {
      this.showOfflineMessage();
    }
    
    // Si estamos offline, usar caché directamente
    if (!isOnline) {
      console.log('📱 Modo offline detectado - cargando desde caché...');
      const cachedPacientes = this.loadFromCache();
      if (cachedPacientes && cachedPacientes.length > 0) {
        console.log(`📱 ${cachedPacientes.length} pacientes cargados desde caché (offline)`);
        this.showOfflineDataMessage(cachedPacientes.length);
        return cachedPacientes;
      }
      
      // Si no hay caché válido en modo offline, intentar localStorage legacy
      console.log('🔄 Caché no disponible, intentando localStorage legacy...');
      try {
        const pacientesLocal = read('pacientes') || [];
        if (pacientesLocal.length > 0) {
          console.log(`📱 ${pacientesLocal.length} pacientes obtenidos desde localStorage legacy (offline)`);
          this.showOfflineDataMessage(pacientesLocal.length);
          // Cachear los datos legacy para uso futuro
          this.cacheAllPacientes(pacientesLocal);
          return this._sortByName(pacientesLocal);
        }
      } catch (localError) {
        console.error('❌ Error obteniendo pacientes desde localStorage:', localError);
      }
      
      // Si no hay datos en absoluto offline
      console.warn('⚠️ No hay datos de pacientes disponibles offline');
      this.showNoOfflineDataMessage();
      // Siempre devolver un array vacío válido
      return [];
    }
    
    // Si estamos online, intentar Firebase
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

      // Actualizar caché con los datos frescos de Firebase
      this.cacheAllPacientes(pacientes);

      return this._sortByName(pacientes);
    } catch (error) {
      console.error('❌ Error obteniendo pacientes desde Firebase:', error);

      // Si falla Firebase, intentar caché
      console.log('🔄 Intentando cargar desde caché (fallback)...');
      const cachedPacientes = this.loadFromCache();
      if (cachedPacientes && cachedPacientes.length > 0) {
        console.log(`📱 ${cachedPacientes.length} pacientes cargados desde caché (fallback)`);
        this.showFallbackDataMessage(cachedPacientes.length);
        return cachedPacientes;
      }

      // Último recurso: localStorage legacy
      console.log('🔄 Intentando fallback a localStorage legacy...');
      try {
        const pacientesLocal = read('pacientes') || [];
        if (pacientesLocal.length > 0) {
          console.log(`📱 ${pacientesLocal.length} pacientes obtenidos desde localStorage legacy`);
          this.showFallbackDataMessage(pacientesLocal.length);
          // Cachear los datos legacy para uso futuro
          this.cacheAllPacientes(pacientesLocal);
          return this._sortByName(pacientesLocal);
        }
      } catch (localError) {
        console.error('❌ Error obteniendo pacientes desde localStorage:', localError);
      }
      
      // Si no hay datos en absoluto
      console.warn('⚠️ No hay datos de pacientes disponibles');
      this.showNoDataMessage();
      return [];
    }
  },

  // Función para invalidar el caché en memoria (útil después de crear/actualizar/eliminar)
  invalidateCache() {
    console.log('🔄 Invalidando caché de pacientes en memoria...');
    pacientesCache = null;
    isPacientesLoading = false;
    pacientesPromise = null;
  },

  async getPaciente(id) {
    if (!id) return null;

    // ✅ PREVENIR EJECUCIÓN DUPLICADA: Si ya hay una carga en progreso para este ID, esperar esa promesa
    if (pacienteLoadingMap.has(id)) {
      console.log(`⏭️ Carga de paciente ${id} ya en progreso, esperando...`);
      return pacienteLoadingMap.get(id);
    }

    // Crear la promesa de carga y guardarla en el Map
    const loadPromise = this._fetchPaciente(id);
    pacienteLoadingMap.set(id, loadPromise);

    try {
      const paciente = await loadPromise;
      return paciente;
    } finally {
      // Limpiar la promesa del Map después de completar
      pacienteLoadingMap.delete(id);
    }
  },

  // Función interna para realizar la carga real de un paciente
  async _fetchPaciente(id) {
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

    // ============ DEBUG DETALLADO DE CAMPOS CRÍTICOS ============
    console.log('📝 addPaciente llamado con paciente completo:', JSON.stringify(paciente, null, 2));
    console.log('🔍 DEBUG - Análisis de campos críticos:');
    console.log(`  • grado: "${paciente.grado}" (tipo: ${typeof paciente.grado})`);
    console.log(`  • grupo: "${paciente.grupo}" (tipo: ${typeof paciente.grupo})`);
    console.log(`  • semestre: "${paciente.semestre}" (tipo: ${typeof paciente.semestre})`);
    console.log(`  • antecedentes: "${paciente.antecedentes}" (tipo: ${typeof paciente.antecedentes})`);
    
    // Verificar campos vacíos o undefined CRÍTICOS
    const camposProblematicos = [];
    if (!paciente.grado || paciente.grado === '' || paciente.grado === 'undefined') {
      camposProblematicos.push(`grado: "${paciente.grado}"`);
      console.error('🚨 GRADO CRÍTICO FALTANTE:', paciente.grado);
    }
    if (!paciente.grupo || paciente.grupo === '' || paciente.grupo === 'undefined') {
      camposProblematicos.push(`grupo: "${paciente.grupo}"`);
      console.error('🚨 GRUPO CRÍTICO FALTANTE:', paciente.grupo);
    }
    
    if (camposProblematicos.length > 0) {
      console.error('❌ CAMPOS CRÍTICOS FALTANTES - REGISTRO BLOQUEADO:', camposProblematicos);
      throw new Error(`Campos críticos faltantes: ${camposProblematicos.join(', ')}. No se puede proceder con el registro.`);
    } else {
      console.log('✅ Todos los campos críticos tienen valores válidos');
    }

    // ============ VALIDACIÓN ESPECÍFICA DE IMAGEN ============
    if (paciente._imagenFile) {
      console.log('🖼️ PROCESANDO IMAGEN:', {
        archivo: paciente._imagenFile.name,
        tamaño: paciente._imagenFile.size,
        tipo: paciente._imagenFile.type,
        esOffline: !navigator.onLine
      });
    } else {
      console.log('📷 No hay archivo de imagen para procesar');
    }

    // Verificar estado de conexión
    const isOnline = navigator.onLine;
    
    if (!isOnline) {
      // Modo offline: guardar en cola de sincronización
      console.log('📱 Modo offline detectado - Guardando paciente localmente...');
      return this.addPacienteOffline(paciente);
    }

    try {
      console.log('🔄 Agregando paciente a Firebase...');

      // No asignar ID manualmente, Firebase lo hace automáticamente
      // Remover cualquier ID existente y campos temporales para evitar conflictos
      const pacienteParaGuardar = { ...paciente };
      delete pacienteParaGuardar.id;
      delete pacienteParaGuardar._imagenFile;
      delete pacienteParaGuardar._hasOfflineImage;

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
      
      // ============ PROCESAR IMAGEN SI EXISTE ============
      if (paciente._imagenFile) {
        console.log('🖼️ Procesando imagen para el paciente recién creado...');
        try {
          // Crear metadata para la imagen
          const imageMetadata = {
            pacienteId: docRef.id,
            fechaSubida: new Date().toISOString(),
            usuarioId: this.getCurrentUserId() || 'unknown',
            usuarioNombre: this.getCurrentUserName() || 'Usuario'
          };

          // Subir imagen usando el sistema de almacenamiento
          const imagenSubida = await imageStorageModel.subirFotoPerfil(
            paciente._imagenFile,
            docRef.id, 
            imageMetadata
          );

          console.log('✅ Imagen subida exitosamente:', imagenSubida.imageId);

          // Actualizar el paciente con el ID de la imagen
          const pacienteRef = doc(pacientesCollection, docRef.id);
          await updateDoc(pacienteRef, {
            fotoPerfilId: imagenSubida.imageId,
            updatedAt: serverTimestamp()
          });

          console.log('✅ fotoPerfilId actualizado en el paciente:', imagenSubida.imageId);

        } catch (imagenError) {
          console.error('⚠️ Error procesando imagen, pero paciente ya creado:', imagenError);
          // El paciente se creó exitosamente, solo falló la imagen
        }
      }

      this.showNotification('✅ Paciente registrado exitosamente en el servidor', 'success');

      return {
        id: docRef.id,
        ...pacienteParaGuardar
      };
    } catch (error) {
      console.error('❌ Error agregando paciente a Firebase:', error);
      console.log('🔄 Sin conexión - Guardando paciente localmente...');
      
      // Si falla Firebase, usar modo offline
      return this.addPacienteOffline(paciente);
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
      
      // Actualizar directamente en Firebase para mayor seguridad
      try {
        const pacienteRef = doc(pacientesCollection, pacienteId);
        await updateDoc(pacienteRef, {
          fotoPerfilId: imagenSubida.imageId,
          updatedAt: serverTimestamp()
        });
        console.log(`✅ Campo fotoPerfilId actualizado directamente en Firebase: ${imagenSubida.imageId}`);
      } catch (updateError) {
        console.warn('⚠️ Error actualizando directamente, usando método fallback:', updateError);
        // Fallback al método original
        await this.updatePaciente(pacienteId, updateData);
      }

      console.log('✅ Foto de perfil actualizada exitosamente');
      
      // Verificar que la actualización fue exitosa leyendo el documento
      try {
        const verificacion = await getDoc(doc(pacientesCollection, pacienteId));
        if (verificacion.exists() && verificacion.data().fotoPerfilId) {
          console.log(`✅ Verificación exitosa - fotoPerfilId en Firebase: ${verificacion.data().fotoPerfilId}`);
        } else {
          console.warn(`⚠️ Verificación fallida - fotoPerfilId no encontrado en Firebase`);
        }
      } catch (errorVerif) {
        console.warn('⚠️ Error verificando actualización:', errorVerif);
      }
      
      return {
        success: true,
        fotoPerfilId: imagenSubida.imageId,
        imageId: imagenSubida.imageId // Añadir ambos para compatibilidad
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
  },

  // ==========================================
  // FUNCIONES DE CACHÉ OFFLINE
  // ==========================================

  /**
   * Cachea todos los pacientes en localStorage
   * @param {Array} pacientes - Lista de pacientes a cachear
   * @returns {boolean} true si se guardó correctamente
   */
  cacheAllPacientes(pacientes) {
    try {
      console.log(`💾 Cacheando ${pacientes.length} pacientes...`);
      
      // Guardar datos
      localStorage.setItem(CACHE_KEY, JSON.stringify(pacientes));
      
      // Guardar timestamp
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      
      console.log('✅ Caché de pacientes actualizado');
      return true;
    } catch (error) {
      console.error('❌ Error cacheando pacientes:', error);
      return false;
    }
  },

  /**
   * Carga pacientes desde el caché si es válido
   * @returns {Array|null} Lista de pacientes o null si no hay caché válido
   */
  loadFromCache() {
    try {
      // Verificar si el caché es válido
      if (!this.isCacheValid()) {
        console.log('⚠️ Caché de pacientes expirado o inválido');
        return null;
      }

      // Cargar datos del caché
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (!cachedData) {
        console.log('⚠️ No hay datos en caché');
        return null;
      }

      const pacientes = JSON.parse(cachedData);
      console.log(`📱 ${pacientes.length} pacientes cargados desde caché`);
      
      return this._sortByName(pacientes);
    } catch (error) {
      console.error('❌ Error cargando desde caché:', error);
      return null;
    }
  },

  /**
   * Verifica si el caché es válido (no expirado)
   * @returns {boolean} true si el caché es válido
   */
  isCacheValid() {
    try {
      const timestampStr = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      if (!timestampStr) {
        return false;
      }

      const timestamp = parseInt(timestampStr);
      const now = Date.now();
      const age = now - timestamp;

      const isValid = age < CACHE_EXPIRATION;
      
      if (!isValid) {
        console.log(`⏰ Caché expirado: ${Math.round(age / 1000 / 60)} minutos de antigüedad`);
      } else {
        console.log(`✅ Caché válido: ${Math.round(age / 1000 / 60)} minutos de antigüedad`);
      }

      return isValid;
    } catch (error) {
      console.error('❌ Error verificando validez del caché:', error);
      return false;
    }
  },

  /**
   * Limpia el caché de pacientes
   * @returns {boolean} true si se limpió correctamente
   */
  clearCache() {
    try {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      console.log('🗑️ Caché de pacientes limpiado');
      return true;
    } catch (error) {
      console.error('❌ Error limpiando caché:', error);
      return false;
    }
  },

  /**
   * Obtiene información sobre el caché
   * @returns {Object} Información del caché
   */
  getCacheInfo() {
    try {
      const timestampStr = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      const cachedData = localStorage.getItem(CACHE_KEY);
      
      if (!timestampStr || !cachedData) {
        return {
          exists: false,
          count: 0,
          age: 0,
          valid: false,
          size: 0
        };
      }

      const timestamp = parseInt(timestampStr);
      const now = Date.now();
      const age = now - timestamp;
      const pacientes = JSON.parse(cachedData);
      
      return {
        exists: true,
        count: pacientes.length,
        age: Math.round(age / 1000 / 60), // minutos
        valid: age < CACHE_EXPIRATION,
        size: Math.round(cachedData.length / 1024), // KB aproximados
        timestamp: new Date(timestamp).toLocaleString()
      };
    } catch (error) {
      console.error('❌ Error obteniendo info del caché:', error);
      return {
        exists: false,
        count: 0,
        age: 0,
        valid: false,
        size: 0,
        error: error.message
      };
    }
  },

  // ==========================================
  // FUNCIONES DE MANEJO OFFLINE
  // ==========================================

  /**
   * Agrega un paciente en modo offline
   * @param {Object} paciente - Datos del paciente
   * @returns {Object} Paciente guardado con ID temporal
   */
  async addPacienteOffline(paciente) {
    try {
      // Generar ID temporal único
      const tempId = 'TEMP_' + Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9);
      
      // ============ PROCESAR IMAGEN OFFLINE SI EXISTE ============
      let fotoPerfilId = null;
      let hasOfflineImage = false;
      
      if (paciente._imagenFile) {
        try {
          console.log('📸 Procesando imagen offline para paciente...');
          
          // Importar el sistema de almacenamiento local
          const { imageStorage } = await import('./imageStorageAlternative.js');
          
          // Subir imagen al almacenamiento local IndexedDB
          const resultadoImagen = await imageStorage.uploadImage(tempId, paciente._imagenFile, {
            tipo: 'perfil',
            descripcion: 'Foto de perfil (offline)',
            categoria: 'paciente',
            usuarioId: paciente.usuarioRegistro || 'offline_user',
            usuarioNombre: paciente.usuarioRegistro || 'Usuario Offline'
          });
          
          if (resultadoImagen && resultadoImagen.id) {
            fotoPerfilId = resultadoImagen.id;
            hasOfflineImage = true;
            console.log('✅ Imagen offline guardada con ID:', fotoPerfilId);
          }
          
        } catch (errorImagen) {
          console.error('❌ Error guardando imagen offline:', errorImagen);
          // No fallar el registro por una imagen, solo advertir
        }
      }
      
      // ============ DEBUG ESPECÍFICO ANTES DE CONSTRUCCIÓN OFFLINE ============
      console.log('🔍 DEBUG addPacienteOffline - Valores recibidos:');
      console.log(`  • grado original: "${paciente.grado}"`);
      console.log(`  • grupo original: "${paciente.grupo}"`);
      console.log(`  • semestre original: "${paciente.semestre}"`);
      
      // ============ VALIDACIÓN CRÍTICA ANTES DE CONSTRUCCIÓN ============
      if (!paciente.grado || paciente.grado.trim() === '') {
        console.error('🚨 GRADO FALTANTE EN addPacienteOffline!');
        throw new Error('No se puede crear paciente offline sin grado válido');
      }
      if (!paciente.grupo || paciente.grupo.trim() === '') {
        console.error('🚨 GRUPO FALTANTE EN addPacienteOffline!');
        throw new Error('No se puede crear paciente offline sin grupo válido');
      }

      // Preparar paciente para almacenamiento offline CON ESTRUCTURA COMPLETA
      const pacienteOffline = {
        ...paciente,
        id: tempId,
        
        // ============ ESTRUCTURA IDÉNTICA AL REGISTRO ONLINE ============
        fechaRegistro: paciente.fechaRegistro || new Date().toISOString(),
        usuarioRegistro: paciente.usuarioRegistro || 'Usuario Offline',
        status: 'sin_datos_medicos',
        
        // ============ CAMPOS CRÍTICOS VALIDADOS ============
        grado: paciente.grado, // NO usar fallback - debe venir con valor válido
        grupo: paciente.grupo, // NO usar fallback - debe venir con valor válido
        
        // Campos opcionales
        antecedentes: paciente.antecedentes || '',
        semestre: paciente.semestre || '',
        
        // Campo legacy para compatibilidad
        fotoPerfil: null,
        
        // Datos médicos iniciales
        datosMedicos: {
          temperatura: null,
          presion: null,
          peso: null,
          talla: null,
          frecuenciaRespiratoria: null,
          examenVista: null,
          examenOido: null,
          fechaRegistroMedico: null
        },
        
        // ============ ID DE IMAGEN (CRÍTICO) ============
        fotoPerfilId: fotoPerfilId,
        
        // ============ METADATOS OFFLINE ============
        _isOffline: true,
        _tempId: tempId,
        _createdOffline: new Date().toISOString(),
        _hasOfflineImage: hasOfflineImage
      };
      
      console.log('🏗️ DEBUG addPacienteOffline - Objeto final construido:');
      console.log(`  • grado final: "${pacienteOffline.grado}"`);
      console.log(`  • grupo final: "${pacienteOffline.grupo}"`);
      console.log(`  • semestre final: "${pacienteOffline.semestre}"`);
      console.log(`  • fotoPerfilId: "${pacienteOffline.fotoPerfilId}"`);
      
      // Verificación final crítica
      if (!pacienteOffline.grado || !pacienteOffline.grupo) {
        console.error('🚨 OBJETO FINAL CORRUPTO - GRADO O GRUPO PERDIDO!');
        console.error('Objeto completo:', pacienteOffline);
        throw new Error('Error crítico: Se perdieron campos obligatorios durante la construcción');
      }
      
      // Limpiar campo temporal de imagen
      delete pacienteOffline._imagenFile;

      // Guardar en localStorage legacy para compatibilidad
      const lista = read('pacientes') || [];
      lista.push(pacienteOffline);
      write('pacientes', lista);

      // Agregar a cola de sincronización offline si existe
      if (window.offlineSyncService && typeof window.offlineSyncService.addPatientToQueue === 'function') {
        window.offlineSyncService.addPatientToQueue(pacienteOffline);
      }

      console.log('📱 Paciente guardado offline con ID temporal:', tempId);
      
      // Mostrar notificación de guardado offline
      this.showNotification('📱 Paciente guardado localmente - Se sincronizará cuando se restablezca la conexión', 'info', 6000);
      
      return pacienteOffline;
    } catch (error) {
      console.error('❌ Error guardando paciente offline:', error);
      this.showNotification('❌ Error al guardar paciente localmente', 'error');
      throw error;
    }
  },

  /**
   * Sincroniza pacientes offline con Firebase
   * @returns {Object} Resultado de la sincronización
   */
  async syncOfflinePatients() {
    try {
      const isOnline = navigator.onLine;
      
      if (!isOnline) {
        console.log('⚠️ Sin conexión - No se puede sincronizar');
        return { synced: 0, failed: 0, message: 'Sin conexión' };
      }

      // Obtener pacientes offline
      const lista = read('pacientes') || [];
      const pacientesOffline = lista.filter(p => p._isOffline && !p._synced);
      
      if (pacientesOffline.length === 0) {
        console.log('✅ No hay pacientes offline pendientes de sincronización');
        return { synced: 0, failed: 0, message: 'No hay pacientes pendientes' };
      }

      console.log(`🔄 Sincronizando ${pacientesOffline.length} pacientes offline...`);
      this.showNotification(`🔄 Sincronizando ${pacientesOffline.length} pacientes guardados localmente...`, 'info');
      
      let synced = 0;
      let failed = 0;
      const updatedLista = [...lista];

      for (const pacienteOffline of pacientesOffline) {
        try {
          // Preparar paciente para Firebase (remover campos offline)
          const pacienteParaFirebase = { ...pacienteOffline };
          delete pacienteParaFirebase.id;
          delete pacienteParaFirebase._isOffline;
          delete pacienteParaFirebase._tempId;
          delete pacienteParaFirebase._createdOffline;
          delete pacienteParaFirebase._synced;
          delete pacienteParaFirebase._firebaseId;
          delete pacienteParaFirebase._syncedAt;
          delete pacienteParaFirebase._imagenFile;
          delete pacienteParaFirebase._hasOfflineImage;
          
          // ============ ASEGURAR ESTRUCTURA COMPLETA COMO REGISTRO ONLINE ============
          
          // Campos básicos requeridos
          if (!pacienteParaFirebase.grado || pacienteParaFirebase.grado === 'undefined' || pacienteParaFirebase.grado === '') {
            pacienteParaFirebase.grado = '1er Semestre';
            console.warn(`⚠️ Corrigiendo grado undefined para paciente ${pacienteParaFirebase.matricula}`);
          }
          if (!pacienteParaFirebase.grupo || pacienteParaFirebase.grupo === 'undefined' || pacienteParaFirebase.grupo === '') {
            pacienteParaFirebase.grupo = 'A';
            console.warn(`⚠️ Corrigiendo grupo undefined para paciente ${pacienteParaFirebase.matricula}`);
          }
          
          // Asegurar campos de string vacíos en lugar de undefined
          pacienteParaFirebase.email = pacienteParaFirebase.email || '';
          pacienteParaFirebase.genero = pacienteParaFirebase.genero || '';
          pacienteParaFirebase.antecedentes = pacienteParaFirebase.antecedentes || '';
          
          // ============ CAMPOS FALTANTES CRÍTICOS ============
          
          // Usuario que registra (CRÍTICO para auditoría)
          if (!pacienteParaFirebase.usuarioRegistro) {
            pacienteParaFirebase.usuarioRegistro = pacienteOffline.usuarioRegistro || 'Usuario Offline';
          }
          
          // Fecha de registro original (CRÍTICO para historial)  
          if (!pacienteParaFirebase.fechaRegistro) {
            pacienteParaFirebase.fechaRegistro = pacienteOffline.fechaRegistro || pacienteOffline._createdOffline || new Date().toISOString();
          }
          
          // Campo fotoPerfil legacy (mantener consistencia)
          if (!pacienteParaFirebase.hasOwnProperty('fotoPerfil')) {
            pacienteParaFirebase.fotoPerfil = null;
          }
          
          // Preservar fotoPerfilId si existe (CRÍTICO para imágenes)
          if (pacienteOffline.fotoPerfilId && !pacienteParaFirebase.fotoPerfilId) {
            pacienteParaFirebase.fotoPerfilId = pacienteOffline.fotoPerfilId;
            console.log(`✅ Preservando fotoPerfilId offline: ${pacienteOffline.fotoPerfilId}`);
          }
          
          // Asegurar estructura de datos médicos
          if (!pacienteParaFirebase.datosMedicos) {
            pacienteParaFirebase.datosMedicos = {
              temperatura: null,
              presion: null,
              peso: null,
              talla: null,
              frecuenciaRespiratoria: null,
              examenVista: null,
              examenOido: null,
              fechaRegistroMedico: null
            };
          }
          
          // Asegurar status por defecto
          if (!pacienteParaFirebase.status) {
            pacienteParaFirebase.status = 'sin_datos_medicos';
          }
          
          // Agregar timestamps de Firebase
          pacienteParaFirebase.createdAt = serverTimestamp();
          pacienteParaFirebase.updatedAt = serverTimestamp();

          // Verificar si ya existe por matrícula para evitar duplicados
          if (pacienteParaFirebase.matricula) {
            const q = query(pacientesCollection, where('matricula', '==', pacienteParaFirebase.matricula));
            const snapshot = await getDocs(q);
            
            if (!snapshot.empty) {
              console.log(`⏭️ Paciente con matrícula ${pacienteParaFirebase.matricula} ya existe, marcando como sincronizado`);
              
              // Marcar como sincronizado en localStorage
              const index = updatedLista.findIndex(p => p._tempId === pacienteOffline._tempId);
              if (index !== -1) {
                updatedLista[index]._synced = true;
                updatedLista[index]._syncedAt = new Date().toISOString();
              }
              
              synced++;
              continue;
            }
          }

          // Subir a Firebase
          const docRef = await addDoc(pacientesCollection, pacienteParaFirebase);
          console.log(`✅ Paciente offline sincronizado con ID Firebase: ${docRef.id}`);
          
          // ============ SINCRONIZAR IMAGEN OFFLINE SI EXISTE ============
          if (pacienteOffline.fotoPerfilId && pacienteOffline._hasOfflineImage) {
            try {
              console.log(`📸 Sincronizando imagen offline del paciente ${docRef.id}...`);
              
              // Importar el sistema de almacenamiento
              const { imageStorage } = await import('./imageStorageAlternative.js');
              
              // Obtener la imagen del almacenamiento local
              const imagenLocal = await imageStorage.getImageById(pacienteOffline.fotoPerfilId);
              
              if (imagenLocal && imagenLocal.blob) {
                // Crear un File objeto desde el blob para subirlo a Firebase
                const file = new File([imagenLocal.blob], imagenLocal.filename || 'photo.jpg', {
                  type: imagenLocal.blob.type || 'image/jpeg'
                });
                
                console.log(`📤 Subiendo imagen offline a Firebase Storage...`);
                
                // Subir imagen a Firebase usando el nuevo ID del paciente
                const resultadoImagenFirebase = await this.actualizarFotoPerfil(docRef.id, file, {
                  usuarioId: pacienteOffline.usuarioRegistro || 'offline_user',
                  usuarioNombre: pacienteOffline.usuarioRegistro || 'Usuario Offline',
                  sincronizadaDesdeOffline: true
                });
                
                console.log(`✅ Imagen offline sincronizada para paciente ${docRef.id}:`, resultadoImagenFirebase);
                
                // ============ VERIFICAR QUE EL CAMPO SE ACTUALIZÓ EN FIREBASE ============
                if (resultadoImagenFirebase && resultadoImagenFirebase.fotoPerfilId) {
                  // Verificar que el documento de Firebase tiene el fotoPerfilId correcto
                  const pacienteActualizado = await getDoc(doc(pacientesCollection, docRef.id));
                  if (pacienteActualizado.exists()) {
                    const data = pacienteActualizado.data();
                    if (data.fotoPerfilId) {
                      console.log(`✅ Campo fotoPerfilId confirmado en Firebase: ${data.fotoPerfilId}`);
                    } else {
                      console.warn(`⚠️ Campo fotoPerfilId no encontrado en Firebase, actualizando manualmente...`);
                      
                      // Actualizar manualmente el campo fotoPerfilId
                      await updateDoc(doc(pacientesCollection, docRef.id), {
                        fotoPerfilId: resultadoImagenFirebase.fotoPerfilId,
                        updatedAt: serverTimestamp()
                      });
                      
                      console.log(`✅ Campo fotoPerfilId actualizado manualmente: ${resultadoImagenFirebase.fotoPerfilId}`);
                    }
                  }
                } else {
                  console.warn(`⚠️ No se recibió fotoPerfilId del resultado de actualizarFotoPerfil`);
                }
                
              } else {
                console.warn(`⚠️ Imagen offline no encontrada para paciente ${docRef.id}: ${pacienteOffline.fotoPerfilId}`);
              }
              
            } catch (errorImagen) {
              console.error(`❌ Error sincronizando imagen del paciente ${docRef.id}:`, errorImagen);
              // No fallar toda la sincronización por una imagen, solo advertir
            }
          }
          
          // Marcar como sincronizado en localStorage
          const index = updatedLista.findIndex(p => p._tempId === pacienteOffline._tempId);
          if (index !== -1) {
            updatedLista[index]._synced = true;
            updatedLista[index]._firebaseId = docRef.id;
            updatedLista[index]._syncedAt = new Date().toISOString();
          }
          
          synced++;
          
        } catch (error) {
          console.error(`❌ Error sincronizando paciente ${pacienteOffline._tempId}:`, error);
          failed++;
        }
      }

      // Actualizar localStorage
      write('pacientes', updatedLista);
      
      // Mostrar resultado
      if (synced > 0) {
        this.showNotification(`✅ ${synced} pacientes sincronizados exitosamente`, 'success');
      }
      if (failed > 0) {
        this.showNotification(`⚠️ ${failed} pacientes no pudieron sincronizarse`, 'warning');
      }

      return { synced, failed, message: `${synced} sincronizados, ${failed} fallos` };
      
    } catch (error) {
      console.error('❌ Error en sincronización de pacientes offline:', error);
      this.showNotification('❌ Error en sincronización de pacientes', 'error');
      return { synced: 0, failed: 0, error: error.message };
    }
  },

  /**
   * Obtiene el número de pacientes offline pendientes de sincronización
   * @returns {number} Número de pacientes pendientes
   */
  getPendingOfflinePatients() {
    try {
      const lista = read('pacientes') || [];
      const pending = lista.filter(p => p._isOffline && !p._synced);
      return pending.length;
    } catch (error) {
      console.error('❌ Error obteniendo pacientes offline pendientes:', error);
      return 0;
    }
  },

  // ==========================================
  // FUNCIONES DE NOTIFICACIÓN OFFLINE
  // ==========================================

  /**
   * Muestra mensaje de modo offline
   */
  showOfflineMessage() {
    this.showNotification('📱 Modo offline - Mostrando datos guardados localmente', 'info');
  },

  /**
   * Muestra mensaje con datos offline
   * @param {number} count - Número de pacientes cargados
   */
  showOfflineDataMessage(count) {
    this.showNotification(`📱 ${count} pacientes cargados desde datos offline`, 'success');
  },

  /**
   * Muestra mensaje de datos fallback
   * @param {number} count - Número de pacientes cargados
   */
  showFallbackDataMessage(count) {
    this.showNotification(`⚠️ ${count} pacientes cargados desde caché (sin conexión a servidor)`, 'warning');
  },

  /**
   * Muestra mensaje de sin datos offline
   */
  showNoOfflineDataMessage() {
    this.showNotification('⚠️ Sin datos offline disponibles. Los datos se mostrarán cuando se restablezca la conexión.', 'warning');
  },

  /**
   * Muestra mensaje de sin datos
   */
  showNoDataMessage() {
    this.showNotification('❌ No se pudieron cargar los datos de pacientes', 'error');
  },

  /**
   * Actualiza un paciente en localStorage (para uso offline)
   * @param {string} pacienteId - ID del paciente
   * @param {Object} datos - Datos a actualizar
   * @returns {Promise<boolean>} Éxito de la operación
   */
  async updatePacienteLocal(pacienteId, datos) {
    try {
      const lista = read('pacientes') || [];
      const index = lista.findIndex(p => p.id === pacienteId || p._tempId === pacienteId);
      
      if (index === -1) {
        console.warn(`⚠️ Paciente no encontrado en localStorage: ${pacienteId}`);
        return false;
      }
      
      // Actualizar datos
      lista[index] = { ...lista[index], ...datos };
      write('pacientes', lista);
      
      console.log(`✅ Paciente actualizado en localStorage:`, { id: pacienteId, datos });
      return true;
    } catch (error) {
      console.error('❌ Error actualizando paciente en localStorage:', error);
      return false;
    }
  },

  /**
   * Función helper para mostrar notificaciones
   * @param {string} message - Mensaje a mostrar
   * @param {string} type - Tipo de notificación
   * @param {number} duration - Duración en milisegundos (opcional)
   */
  showNotification(message, type = 'info', duration = 4000) {
    try {
      console.log(`📢 NOTIFICACIÓN: ${message} (${type})`);
      
      let notificationShown = false;
      
      // 1. Usar el sistema de notificaciones del app si está disponible
      if (window.firebaseSyncManager && typeof window.firebaseSyncManager.showSyncMessage === 'function') {
        window.firebaseSyncManager.showSyncMessage(message, type, '', duration);
        notificationShown = true;
      }
      
      // 2. Usar advancedOfflineIndicator si está disponible
      if (!notificationShown && window.advancedOfflineIndicator && typeof window.advancedOfflineIndicator.showMessage === 'function') {
        window.advancedOfflineIndicator.showMessage(message, type, duration);
        notificationShown = true;
      }
      
      // 3. Fallback al sistema de notificaciones offline si existe
      if (!notificationShown && window.offlineNotificationManager && typeof window.offlineNotificationManager.showNotification === 'function') {
        window.offlineNotificationManager.showNotification(message, type);
        notificationShown = true;
      }
      
      // 4. SIEMPRE crear notificación visual directa en el DOM como backup
      this.createVisualNotification(message, type, duration);
      
      // 5. Si no se mostró ninguna notificación, intentar de nuevo en 100ms
      if (!notificationShown) {
        setTimeout(() => {
          this.createVisualNotification(message, type, duration);
        }, 100);
      }
      
    } catch (error) {
      console.error('❌ Error mostrando notificación:', error);
      // Fallback básico a console y DOM
      const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
      console.log(`${prefix} ${message}`);
      
      // Forzar notificación DOM en caso de error
      try {
        this.createVisualNotification(message, type, duration);
      } catch (domError) {
        console.error('❌ Error crítico en notificación DOM:', domError);
      }
    }
  },
  
  /**
   * Crear notificación visual directa en el DOM
   * @param {string} message - Mensaje a mostrar
   * @param {string} type - Tipo de notificación
   * @param {number} duration - Duración en milisegundos
   */
  createVisualNotification(message, type = 'info', duration = 4000) {
    // Crear o encontrar contenedor de notificaciones
    let container = document.getElementById('offline-notifications-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'offline-notifications-container';
      container.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        z-index: 9999;
        max-width: 350px;
      `;
      document.body.appendChild(container);
    }
    
    // Crear elemento de notificación
    const notification = document.createElement('div');
    const bgColor = type === 'error' ? '#ef4444' : 
                   type === 'warning' ? '#f59e0b' : 
                   type === 'success' ? '#10b981' : '#3b82f6';
    
    notification.style.cssText = `
      background: ${bgColor};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 8px;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease-out;
      cursor: pointer;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 16px;">
          ${type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️'}
        </span>
        <span>${message}</span>
        <span style="margin-left: auto; font-size: 18px; opacity: 0.7;">×</span>
      </div>
    `;
    
    // Agregar estilos de animación si no existen
    if (!document.getElementById('notification-styles')) {
      const styles = document.createElement('style');
      styles.id = 'notification-styles';
      styles.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(styles);
    }
    
    // Manejar click para cerrar
    notification.addEventListener('click', () => {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    });
    
    // Agregar al contenedor
    container.appendChild(notification);
    
    // Auto-cerrar después de la duración especificada
    if (duration > 0) {
      setTimeout(() => {
        if (notification.parentNode) {
          notification.style.animation = 'slideOut 0.3s ease-in';
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 300);
        }
      }, duration);
    }
  }
};
