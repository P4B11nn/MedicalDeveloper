/**
 * OfflineSyncService - Servicio de sincronización de datos offline
 * Gestiona la sincronización de datos almacenados localmente con Firebase
 * cuando se restablece la conexión
 */

import eventBus, { EVENT_NAMES } from './eventBus.js';

// Obtener Firebase desde el contexto global cuando esté disponible
function getFirebaseServices() {
  if (window.firebaseServices) {
    return window.firebaseServices;
  }
  
  // Fallback para Firebase v8 compatibility
  if (typeof firebase !== 'undefined') {
    return {
      db: firebase.firestore(),
      collection: (db, path) => firebase.firestore().collection(path),
      doc: (db, path) => firebase.firestore().doc(path),
      getDocs: (query) => query.get(),
      getDoc: (docRef) => docRef.get(),
      addDoc: (collection, data) => collection.add(data),
      setDoc: (docRef, data) => docRef.set(data),
      updateDoc: (docRef, data) => docRef.update(data),
      deleteDoc: (docRef) => docRef.delete(),
      query: (collection, ...constraints) => {
        let q = collection;
        constraints.forEach(constraint => {
          if (constraint.field && constraint.op && constraint.value !== undefined) {
            q = q.where(constraint.field, constraint.op, constraint.value);
          }
        });
        return q;
      },
      where: (field, op, value) => ({ field, op, value }),
      orderBy: (field, direction) => ({ field, direction }),
      limit: (num) => ({ limit: num }),
      serverTimestamp: () => firebase.firestore.FieldValue.serverTimestamp(),
      Timestamp: firebase.firestore.Timestamp
    };
  }
  
  throw new Error('Firebase services not available');
}

class OfflineSyncService {
  constructor() {
    this.isInitialized = false;
    this.isSyncing = false;
  }

  /**
   * Inicializa el servicio de sincronización
   * Conecta con FirebaseSyncManager y escucha eventos de reconexión
   */
  init() {
    if (this.isInitialized) {

      return;
    }



    // Integración con FirebaseSyncManager
    if (window.firebaseSyncManager) {
      this._registerWithFirebaseSyncManager();
    } else {
      // Reintentar inicialización si firebaseSyncManager no está disponible aún
      this._retryFirebaseSyncManagerIntegration();
    }

    // Escuchar evento 'online' del navegador
    window.addEventListener('online', async () => {
      console.log('🌐 OfflineSyncService: Conexión restaurada detectada');
      
      // Verificar si hay datos pendientes antes de sincronizar
      const hasPending = await this.hasPendingSync();
      
      if (hasPending) {
        console.log('📋 OfflineSyncService: Datos pendientes detectados - iniciando sincronización');
        
        // Emitir evento personalizado para que otros componentes lo escuchen
        const syncEvent = new CustomEvent('offlineSyncPending', {
          detail: {
            service: this,
            summary: await this.getPendingSummary()
          }
        });
        window.dispatchEvent(syncEvent);
        
        // Intentar sincronización
        if (window.firebaseSyncManager) {
          // Si firebaseSyncManager existe, usar su método attemptPendingSyncs
          window.firebaseSyncManager.attemptPendingSyncs();
        } else {
          // Si no existe, invocar flushAll directamente
          console.log('🔄 OfflineSyncService: Sincronizando directamente...');
          this.flushAll().then(result => {
            console.log('✅ OfflineSyncService: Sincronización automática completada:', result);
          }).catch(error => {
            console.error('❌ OfflineSyncService: Error en sincronización automática:', error);
          });
        }
      } else {
        console.log('✅ OfflineSyncService: No hay datos pendientes');
      }
    });

    this.isInitialized = true;
  }

  /**
   * Registra el servicio con FirebaseSyncManager
   * @private
   */
  _registerWithFirebaseSyncManager() {


    // Registrar función de sincronización pendiente
    if (typeof window.firebaseSyncManager.addPendingSync === 'function') {
      window.firebaseSyncManager.addPendingSync(
        () => this.flushAll(),
        'Sincronización de datos offline'
      );

    }

    // Registrar callback para refresco de contenido
    if (typeof window.firebaseSyncManager.onContentRefresh === 'function') {
      window.firebaseSyncManager.onContentRefresh(() => {
        const summary = this.getPendingSummary();

        return summary;
      });
      
    }
  }

  /**
   * Reintenta la integración con FirebaseSyncManager si no está disponible inicialmente
   * @private
   */
  _retryFirebaseSyncManagerIntegration() {
    let attempts = 0;
    const maxAttempts = 3;
    const retryInterval = 500; // 500ms entre intentos



    const retryTimer = setInterval(() => {
      attempts++;

      if (window.firebaseSyncManager) {
        clearInterval(retryTimer);
        this._registerWithFirebaseSyncManager();

      } else if (attempts >= maxAttempts) {
        clearInterval(retryTimer);
        console.warn('⚠️ FirebaseSyncManager no disponible después de múltiples intentos');
        console.warn('⚠️ La sincronización funcionará pero sin integración completa');
      }
    }, retryInterval);
  }

  /**
   * Obtiene un resumen de las colas pendientes de sincronización
   * @returns {Object} Resumen con conteos por cola
   */
  getPendingSummary() {
    try {
      // Leer colas de localStorage
      const activities = this._readLocalArray('offline_activities');
      const patientsMap = this._readLocalMap('offline_patients');
      const medicalRecordsMap = this._readLocalMap('offline_medical_records');
      const checklists = this._readLocalArray('offline_checklists');
      const observaciones = this._readLocalArray('offline_observaciones');
      
      // Leer nuevas colas para controladores
      const medicalDataMap = this._readLocalMap('offline_medical_data');
      const patientUpdatesMap = this._readLocalMap('offline_patient_updates');

      // Leer colas legacy
      const legacyPacientes = this._readLocalArray('pacientes');
      const legacyCitas = this._readLocalArray('citas');

      // Calcular conteos
      const summary = {
        activities: activities.length,
        patients: Object.keys(patientsMap).length,
        medicalRecords: Object.keys(medicalRecordsMap).length,
        medicalData: Object.keys(medicalDataMap).length,
        patientUpdates: Object.keys(patientUpdatesMap).length,
        checklists: checklists.length,
        observaciones: observaciones.length,
        legacy: {
          pacientes: legacyPacientes.length,
          citas: legacyCitas.length
        }
      };

      // Calcular total
      summary.total = summary.activities + summary.patients + summary.medicalRecords +
                     summary.medicalData + summary.patientUpdates +
                     summary.checklists + summary.observaciones +
                     summary.legacy.pacientes + summary.legacy.citas;

      return summary;
    } catch (error) {
      console.error('❌ Error obteniendo resumen de colas pendientes:', error);
      return {
        activities: 0,
        patients: 0,
        medicalRecords: 0,
        medicalData: 0,
        patientUpdates: 0,
        checklists: 0,
        observaciones: 0,
        legacy: { pacientes: 0, citas: 0 },
        total: 0
      };
    }
  }

  /**
   * Ejecuta la sincronización de todas las colas pendientes
   * @param {Object} options - Opciones de sincronización
   * @param {boolean} options.aggressive - Si es true, fuerza la sincronización
   * @returns {Promise<Object>} Resumen de la sincronización
   */
  async flushAll({ aggressive = false } = {}) {


    // Verificar conexión
    if (!navigator.onLine) {
      console.warn('⚠️ Sin conexión a internet, no se puede sincronizar');
      this._show('Sin conexión, no se puede sincronizar', 'warning');
      return this.getPendingSummary();
    }

    // Verificar si ya hay una sincronización en curso
    if (this.isSyncing) {

      return this.getPendingSummary();
    }

    this.isSyncing = true;
    const errors = [];
    const processed = {
      activities: 0,
      patients: 0,
      medicalRecords: 0,
      checklists: 0,
      observaciones: 0,
      legacy: 0
    };

    try {
      // Obtener resumen inicial
      const initialSummary = this.getPendingSummary();


      // Emitir evento de inicio de sincronización
      eventBus.emit(EVENT_NAMES.SYNC_STARTED, {
        startedAt: new Date(),
        queues: initialSummary
      });

      // Mostrar mensaje informativo
      this._show('Iniciando sincronización de datos offline', 'sync', 0);

      // Ejecutar sincronización en orden seguro

      try {
        const actResult = await this.flushActivities();
        processed.activities = actResult.processed || 0;
      } catch (error) {
        console.error('❌ Error en flushActivities:', error);
        errors.push({ queue: 'activities', error: error.message });
      }


      try {
        const patResult = await this.flushPatients();
        processed.patients = patResult.processed || 0;
      } catch (error) {
        console.error('❌ Error en flushPatients:', error);
        errors.push({ queue: 'patients', error: error.message });
      }


      try {
        const medResult = await this.flushMedicalRecords();
        processed.medicalRecords = medResult.processed || 0;
      } catch (error) {
        console.error('❌ Error en flushMedicalRecords:', error);
        errors.push({ queue: 'medicalRecords', error: error.message });
      }


      try {
        const checkResult = await this.flushChecklists();
        processed.checklists = checkResult.processed || 0;
      } catch (error) {
        console.error('❌ Error en flushChecklists:', error);
        errors.push({ queue: 'checklists', error: error.message });
      }


      try {
        const obsResult = await this.flushObservaciones();
        processed.observaciones = obsResult.processed || 0;
      } catch (error) {
        console.error('❌ Error en flushObservaciones:', error);
        errors.push({ queue: 'observaciones', error: error.message });
      }


      try {
        const legResult = await this.flushLegacyLists();
        processed.legacy = legResult.processed || 0;
      } catch (error) {
        console.error('❌ Error en flushLegacyLists:', error);
        errors.push({ queue: 'legacy', error: error.message });
      }

      // Obtener resumen final
      const finalSummary = this.getPendingSummary();

      // Emitir evento de finalización de sincronización
      eventBus.emit(EVENT_NAMES.SYNC_COMPLETED, {
        finishedAt: new Date(),
        queues: finalSummary,
        processed,
        errors
      });

      // Mostrar mensaje final
      const totalProcessed = Object.values(processed).reduce((a, b) => a + b, 0);
      if (errors.length === 0) {
        this._show('Sincronización completada exitosamente', 'success', 4000);
        
      } else {
        this._show(`Sincronización completada con ${errors.length} errores`, 'warning', 5000);
        console.warn(`⚠️ flushAll completado con errores: ${totalProcessed} procesados, ${errors.length} errores`);
      }

      // Refrescar contenido si FirebaseSyncManager existe
      if (window.firebaseSyncManager && typeof window.firebaseSyncManager.refreshContent === 'function') {
        setTimeout(() => {
          window.firebaseSyncManager.refreshContent();
        }, 500);
      }

      return { processed, errors, finalSummary };
    } catch (error) {
      console.error('❌ Error general durante flushAll:', error);

      this._show('Error durante la sincronización', 'error', 5000);

      eventBus.emit(EVENT_NAMES.SYNC_COMPLETED, {
        finishedAt: new Date(),
        queues: this.getPendingSummary(),
        processed,
        errors: [...errors, { queue: 'general', error: error.message }]
      });

      return { processed, errors: [...errors, { queue: 'general', error: error.message }] };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sincroniza la cola de actividades
   * @returns {Promise<Object>} Resultado con cantidad procesada
   */
  async flushActivities() {
    const activities = this._readLocalArray('offline_activities');
    if (activities.length === 0) {

      return { processed: 0, failed: 0 };
    }


    this._show(`Sincronizando actividades: ${activities.length} pendientes`, 'sync', 0);

    let processed = 0;
    let failed = 0;
    const remaining = [];

    const { db, collection, addDoc, serverTimestamp } = getFirebaseServices();
    const actividadesCol = collection(db, 'registro_actividades');

    for (const activity of activities) {
      try {
        // Preparar documento para Firestore
        const activityDoc = {
          accion: activity.accion || activity.action || 'Acción sin descripción',
          descripcion: activity.descripcion || activity.description || '',
          modulo: activity.modulo || activity.module || 'Sistema',
          timestamp: serverTimestamp(),
          fecha: new Date().toISOString()
        };

        // Agregar información del usuario si está disponible
        if (activity.usuarioId) activityDoc.usuarioId = activity.usuarioId;
        if (activity.usuarioNombre) activityDoc.usuarioNombre = activity.usuarioNombre;
        if (activity.usuarioMatricula) activityDoc.usuarioMatricula = activity.usuarioMatricula;

        // Subir a Firestore
        await addDoc(actividadesCol, activityDoc);
        processed++;

        eventBus.emit(EVENT_NAMES.SYNC_ITEM_SUCCESS, {
          queue: 'activities',
          accion: activityDoc.accion
        });


      } catch (error) {
        console.error('❌ Error sincronizando actividad:', error);
        failed++;
        remaining.push(activity);

        eventBus.emit(EVENT_NAMES.SYNC_ITEM_ERROR, {
          queue: 'activities',
          error: error.message
        });
      }
    }

    // Actualizar localStorage
    if (remaining.length === 0) {
      this._removeLocalKey('offline_activities');

    } else {
      this._writeLocalKey('offline_activities', remaining);
      console.log(`⚠️ ${remaining.length} actividades no pudieron sincronizarse`);
    }

    this._emitQueueChange();
    return { processed, failed };
  }

  /**
   * Sincroniza la cola de pacientes con deduplicación por matrícula
   * @returns {Promise<Object>} Resultado con cantidad procesada
   */
  async flushPatients() {
    const patientsMap = this._readLocalMap('offline_patients');
    const patientIds = Object.keys(patientsMap);

    if (patientIds.length === 0) {
      console.log('ℹ️ No hay pacientes pendientes');
      return { processed: 0, failed: 0, skipped: 0 };
    }

    console.log(`👥 Sincronizando ${patientIds.length} pacientes...`);
    this._show(`Sincronizando pacientes: ${patientIds.length} pendientes`, 'sync', 0);

    let processed = 0;
    let failed = 0;
    let skipped = 0;
    const remaining = {};

    const { db, collection, addDoc, serverTimestamp } = getFirebaseServices();
    const pacientesCol = collection(db, 'pacientes');

    for (const key of patientIds) {
      const patient = patientsMap[key];

      try {
        // Deduplicación por matrícula
        if (patient.matricula) {
          const exists = await this._existsPacienteByMatricula(patient.matricula);
          if (exists) {
            console.log(`⏭️ Paciente con matrícula ${patient.matricula} ya existe, omitiendo`);
            skipped++;
            continue; // No agregar a remaining
          }
        }

        // Preparar documento para Firestore
        const patientDoc = {
          nombre: patient.nombre || '',
          apellidos: patient.apellidos || '',
          matricula: patient.matricula || '',
          carrera: patient.carrera || '',
          facultad: patient.facultad || '',
          semestre: patient.semestre || '',
          telefono: patient.telefono || '',
          email: patient.email || '',
          fechaNacimiento: patient.fechaNacimiento || '',
          genero: patient.genero || '',
          status: 'sin_datos_medicos',
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
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        // Subir a Firestore
        await addDoc(pacientesCol, patientDoc);
        processed++;

        eventBus.emit(EVENT_NAMES.SYNC_ITEM_SUCCESS, {
          queue: 'patients',
          descripcion: `Paciente: ${patient.nombre} ${patient.apellidos}`
        });

        console.log(`✅ Paciente sincronizado: ${patient.nombre} ${patient.apellidos}`);
      } catch (error) {
        console.error('❌ Error sincronizando paciente:', error);
        failed++;
        remaining[key] = patient;

        eventBus.emit(EVENT_NAMES.SYNC_ITEM_ERROR, {
          queue: 'patients',
          error: error.message
        });
      }
    }

    // Actualizar localStorage
    if (Object.keys(remaining).length === 0) {
      this._removeLocalKey('offline_patients');
      console.log('✅ Cola de pacientes vaciada completamente');
    } else {
      this._writeLocalKey('offline_patients', remaining);
      console.log(`⚠️ ${Object.keys(remaining).length} pacientes no pudieron sincronizarse`);
    }

    this._emitQueueChange();
    return { processed, failed, skipped };
  }

  /**
   * Sincroniza la cola de registros médicos con resolución de pacienteId
   * @returns {Promise<Object>} Resultado con cantidad procesada
   */
  async flushMedicalRecords() {
    const recordsMap = this._readLocalMap('offline_medical_records');
    const recordIds = Object.keys(recordsMap);

    if (recordIds.length === 0) {
      console.log('ℹ️ No hay registros médicos pendientes');
      return { processed: 0, failed: 0, postponed: 0 };
    }

    console.log(`📋 Sincronizando ${recordIds.length} registros médicos...`);
    this._show(`Sincronizando registros médicos: ${recordIds.length} pendientes`, 'sync', 0);

    let processed = 0;
    let failed = 0;
    let postponed = 0;
    const remaining = {};

    const { db, collection, addDoc, updateDoc, doc, query, where, limit, getDocs, serverTimestamp, Timestamp } = getFirebaseServices();
    const registrosMedicosCol = collection(db, 'registros_medicos');
    const pacientesCol = collection(db, 'pacientes');

    for (const key of recordIds) {
      const record = recordsMap[key];

      try {
        // Resolver pacienteId
        let pacienteId = record.pacienteId;

        if (!pacienteId && record.pacienteMatricula) {
          // Buscar por matrícula
          const q = query(pacientesCol, where('matricula', '==', record.pacienteMatricula), limit(1));
          const snapshot = await getDocs(q);

          if (!snapshot.empty) {
            pacienteId = snapshot.docs[0].id;
          } else {
            console.warn(`⏸️ Paciente no encontrado con matrícula ${record.pacienteMatricula}, posponiendo`);
            postponed++;
            remaining[key] = { ...record, cause: 'missing_patient' };
            continue;
          }
        }

        if (!pacienteId) {
          console.warn('⏸️ No se pudo resolver pacienteId, posponiendo');
          postponed++;
          remaining[key] = { ...record, cause: 'invalid_payload' };
          continue;
        }

        // Obtener fecha del registro médico
        const fechaISO = record.fechaRegistroMedico || this._todayISO();

        // Deduplicación: verificar si ya existe un registro similar
        const exists = await this._existsRegistroMedicoSimilar(pacienteId, fechaISO, record.datosMedicos || {});
        if (exists) {
          console.log(`⏭️ Registro médico duplicado para paciente ${pacienteId}, omitiendo`);
          processed++; // Contar como procesado aunque se omita
          continue;
        }

        // Preparar documento para Firestore
        const medicalRecordDoc = {
          pacienteId,
          datosMedicos: record.datosMedicos || {},
          datosMedicosAnteriores: record.datosMedicosAnteriores || {},
          tipoRegistro: record.tipoRegistro || 'actualizacion',
          fecha: Timestamp.fromDate(new Date(fechaISO)),
          createdAt: serverTimestamp()
        };

        // Subir a Firestore
        await addDoc(registrosMedicosCol, medicalRecordDoc);

        // Actualizar documento del paciente
        const pacienteRef = doc(pacientesCol, pacienteId);
        await updateDoc(pacienteRef, {
          datosMedicos: record.datosMedicos || {},
          status: 'con_datos_medicos',
          updatedAt: serverTimestamp()
        });

        processed++;

        eventBus.emit(EVENT_NAMES.SYNC_ITEM_SUCCESS, {
          queue: 'medicalRecords',
          descripcion: `Registro médico para paciente ${pacienteId}`
        });

        console.log(`✅ Registro médico sincronizado para paciente ${pacienteId}`);
      } catch (error) {
        console.error('❌ Error sincronizando registro médico:', error);
        failed++;
        remaining[key] = record;

        eventBus.emit(EVENT_NAMES.SYNC_ITEM_ERROR, {
          queue: 'medicalRecords',
          error: error.message
        });
      }
    }

    // Actualizar localStorage
    if (Object.keys(remaining).length === 0) {
      this._removeLocalKey('offline_medical_records');
      console.log('✅ Cola de registros médicos vaciada completamente');
    } else {
      this._writeLocalKey('offline_medical_records', remaining);
      console.log(`⚠️ ${Object.keys(remaining).length} registros médicos no pudieron sincronizarse`);
    }

    this._emitQueueChange();
    return { processed, failed, postponed };
  }

  /**
   * Sincroniza la cola de checklists con deduplicación por usuario/módulo/día
   * @returns {Promise<Object>} Resultado con cantidad procesada
   */
  async flushChecklists() {
    const checklists = this._readLocalArray('offline_checklists');
    if (checklists.length === 0) {
      console.log('ℹ️ No hay checklists pendientes');
      return { processed: 0, failed: 0, skipped: 0 };
    }

    console.log(`✅ Sincronizando ${checklists.length} checklists...`);
    this._show(`Sincronizando checklists: ${checklists.length} pendientes`, 'sync', 0);

    let processed = 0;
    let failed = 0;
    let skipped = 0;
    const remaining = [];

    const { db, collection, addDoc, serverTimestamp } = getFirebaseServices();
    const registroInstrumentosCol = collection(db, 'registro_instrumentos');

    for (const checklist of checklists) {
      try {
        // Validar campos esenciales
        if (!checklist.usuarioId || !checklist.moduloId) {
          console.warn('⚠️ Checklist sin usuarioId o moduloId, omitiendo');
          failed++;
          remaining.push({ ...checklist, cause: 'invalid_payload' });
          continue;
        }

        const dayISO = checklist.fecha || this._todayISO();

        // Deduplicación por usuario/módulo/día
        const exists = await this._existsChecklistSimilar(checklist.usuarioId, checklist.moduloId, dayISO);
        if (exists) {
          console.log(`⏭️ Checklist duplicado para usuario ${checklist.usuarioId}, módulo ${checklist.moduloId} en ${dayISO}, omitiendo`);
          skipped++;
          continue;
        }

        // Preparar documento para Firestore
        const checklistDoc = {
          usuarioId: checklist.usuarioId,
          usuarioNombre: checklist.usuarioNombre || '',
          usuarioMatricula: checklist.usuarioMatricula || '',
          moduloId: checklist.moduloId,
          moduloNombre: checklist.moduloNombre || '',
          fecha: dayISO,
          instrumentos: checklist.instrumentos || [],
          completado: checklist.completado || false,
          timestamp: serverTimestamp()
        };

        // Subir a Firestore
        await addDoc(registroInstrumentosCol, checklistDoc);
        processed++;

        eventBus.emit(EVENT_NAMES.SYNC_ITEM_SUCCESS, {
          queue: 'checklists',
          descripcion: `Checklist de ${checklist.usuarioNombre} en ${checklist.moduloNombre}`
        });

        console.log(`✅ Checklist sincronizado: ${checklist.usuarioNombre} - ${checklist.moduloNombre}`);
      } catch (error) {
        console.error('❌ Error sincronizando checklist:', error);
        failed++;
        remaining.push(checklist);

        eventBus.emit(EVENT_NAMES.SYNC_ITEM_ERROR, {
          queue: 'checklists',
          error: error.message
        });
      }
    }

    // Actualizar localStorage
    if (remaining.length === 0) {
      this._removeLocalKey('offline_checklists');
      console.log('✅ Cola de checklists vaciada completamente');
    } else {
      this._writeLocalKey('offline_checklists', remaining);
      console.log(`⚠️ ${remaining.length} checklists no pudieron sincronizarse`);
    }

    this._emitQueueChange();
    return { processed, failed, skipped };
  }

  /**
   * Sincroniza la cola de observaciones con deduplicación
   * @returns {Promise<Object>} Resultado con cantidad procesada
   */
  async flushObservaciones() {
    const observaciones = this._readLocalArray('offline_observaciones');
    if (observaciones.length === 0) {
      console.log('ℹ️ No hay observaciones pendientes');
      return { processed: 0, failed: 0, skipped: 0 };
    }

    console.log(`📝 Sincronizando ${observaciones.length} observaciones...`);
    this._show(`Sincronizando observaciones: ${observaciones.length} pendientes`, 'sync', 0);

    let processed = 0;
    let failed = 0;
    let skipped = 0;
    const remaining = [];

    const { db, collection, addDoc, serverTimestamp } = getFirebaseServices();
    const observacionesCol = collection(db, 'observaciones_reportes');

    for (const obs of observaciones) {
      try {
        const dayISO = obs.fecha || this._todayISO();
        const descripcionNormalizada = this._safeToString(obs.descripcion).toLowerCase().trim();

        // Deduplicación por usuario/módulo/día/descripción
        const exists = await this._existsObservacionSimilar(
          obs.usuarioId,
          obs.moduloId,
          dayISO,
          descripcionNormalizada
        );

        if (exists) {
          console.log(`⏭️ Observación duplicada, omitiendo`);
          skipped++;
          continue;
        }

        // Preparar documento para Firestore
        const obsDoc = {
          usuarioId: obs.usuarioId || '',
          usuarioNombre: obs.usuarioNombre || '',
          moduloId: obs.moduloId || '',
          moduloNombre: obs.moduloNombre || '',
          descripcion: obs.descripcion || '',
          fecha: dayISO,
          tipo: obs.tipo || 'observacion',
          timestamp: serverTimestamp()
        };

        // Subir a Firestore
        await addDoc(observacionesCol, obsDoc);
        processed++;

        eventBus.emit(EVENT_NAMES.SYNC_ITEM_SUCCESS, {
          queue: 'observaciones',
          descripcion: `Observación de ${obs.usuarioNombre}`
        });

        console.log(`✅ Observación sincronizada`);
      } catch (error) {
        console.error('❌ Error sincronizando observación:', error);
        failed++;
        remaining.push(obs);

        eventBus.emit(EVENT_NAMES.SYNC_ITEM_ERROR, {
          queue: 'observaciones',
          error: error.message
        });
      }
    }

    // Actualizar localStorage
    if (remaining.length === 0) {
      this._removeLocalKey('offline_observaciones');
      console.log('✅ Cola de observaciones vaciada completamente');
    } else {
      this._writeLocalKey('offline_observaciones', remaining);
      console.log(`⚠️ ${remaining.length} observaciones no pudieron sincronizarse`);
    }

    this._emitQueueChange();
    return { processed, failed, skipped };
  }

  /**
   * Sincroniza las colas legacy (pacientes y citas antiguas)
   * Migra arrays legacy a colas 'offline_*' modernas
   * @returns {Promise<Object>} Resultado con cantidad procesada
   */
  async flushLegacyLists() {
    console.log('🗄️ Migrando y sincronizando datos legacy...');

    let processed = 0;
    let migrated = 0;

    // Migrar pacientes legacy
    const legacyPacientes = this._readLocalArray('pacientes');
    if (legacyPacientes.length > 0) {
      console.log(`🗄️ Encontrados ${legacyPacientes.length} pacientes legacy`);

      const offlinePatients = this._readLocalMap('offline_patients');

      for (const paciente of legacyPacientes) {
        // Solo migrar si no está marcado como sincronizado
        if (!paciente.synced && !paciente.offlineQueued) {
          const offlineId = `legacy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          offlinePatients[offlineId] = {
            ...paciente,
            isOffline: true,
            timestamp: new Date().toISOString(),
            source: 'legacy_migration'
          };
          migrated++;
        }
      }

      // Guardar pacientes migrados en la nueva cola
      if (migrated > 0) {
        this._writeLocalKey('offline_patients', offlinePatients);
        console.log(`✅ ${migrated} pacientes legacy migrados a offline_patients`);

        // Limpiar array legacy (mantener solo los ya sincronizados)
        const remainingLegacy = legacyPacientes.filter(p => p.synced || p.offlineQueued);
        if (remainingLegacy.length === 0) {
          this._removeLocalKey('pacientes');
        } else {
          this._writeLocalKey('pacientes', remainingLegacy);
        }
      }
    }

    // Migrar citas legacy
    const legacyCitas = this._readLocalArray('citas');
    if (legacyCitas.length > 0) {
      console.log(`🗄️ Encontradas ${legacyCitas.length} citas legacy`);

      const offlineCitas = this._readLocalArray('offline_citas');

      for (const cita of legacyCitas) {
        if (!cita.synced && !cita.offlineQueued) {
          offlineCitas.push({
            ...cita,
            isOffline: true,
            timestamp: new Date().toISOString(),
            source: 'legacy_migration'
          });
          migrated++;
        }
      }

      // Guardar citas migradas
      if (offlineCitas.length > 0) {
        this._writeLocalKey('offline_citas', offlineCitas);
        console.log(`✅ Citas legacy migradas a offline_citas`);

        // Limpiar array legacy
        const remainingCitas = legacyCitas.filter(c => c.synced || c.offlineQueued);
        if (remainingCitas.length === 0) {
          this._removeLocalKey('citas');
        } else {
          this._writeLocalKey('citas', remainingCitas);
        }
      }
    }

    // Después de migrar, sincronizar los datos migrados
    if (migrated > 0) {
      console.log('🔄 Sincronizando datos legacy migrados...');

      // Sincronizar pacientes migrados
      const patResult = await this.flushPatients();
      processed += patResult.processed || 0;

      // Sincronizar citas migradas (si existe la implementación)
      if (typeof this.flushCitas === 'function') {
        const citResult = await this.flushCitas();
        processed += citResult.processed || 0;
      }
    }

    this._emitQueueChange();
    return { processed, migrated };
  }

  // ============= HELPERS PRIVADOS =============

  /**
   * Lee un array desde localStorage
   * @param {string} key - Clave en localStorage
   * @returns {Array} Array leído o array vacío
   * @private
   */
  _readLocalArray(key) {
    try {
      const data = localStorage.getItem(key);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error(`❌ Error leyendo array de localStorage [${key}]:`, error);
      return [];
    }
  }

  /**
   * Lee un objeto/mapa desde localStorage
   * @param {string} key - Clave en localStorage
   * @returns {Object} Objeto leído o objeto vacío
   * @private
   */
  _readLocalMap(key) {
    try {
      const data = localStorage.getItem(key);
      if (!data) return {};
      const parsed = JSON.parse(data);
      return typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
      console.error(`❌ Error leyendo mapa de localStorage [${key}]:`, error);
      return {};
    }
  }

  /**
   * Escribe un valor en localStorage
   * @param {string} key - Clave en localStorage
   * @param {any} value - Valor a escribir
   * @private
   */
  _writeLocalKey(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`❌ Error escribiendo en localStorage [${key}]:`, error);
      return false;
    }
  }

  /**
   * Elimina una clave de localStorage
   * @param {string} key - Clave a eliminar
   * @private
   */
  _removeLocalKey(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`❌ Error eliminando de localStorage [${key}]:`, error);
      return false;
    }
  }

  /**
   * Retorna fecha en formato ISO (YYYY-MM-DD)
   * @param {Date} date - Fecha a convertir (default: hoy)
   * @returns {string} Fecha en formato ISO
   * @private
   */
  _todayISO(date = new Date()) {
    return date.toISOString().split('T')[0];
  }

  /**
   * Convierte cualquier valor a string de forma segura
   * @param {any} x - Valor a convertir
   * @returns {string} String resultante
   * @private
   */
  _safeToString(x) {
    if (x === null || x === undefined) return '';
    if (typeof x === 'string') return x;
    try {
      return String(x);
    } catch (error) {
      return '';
    }
  }

  /**
   * Emite evento de cambio en las colas offline
   * @private
   */
  _emitQueueChange() {
    try {
      const summary = this.getPendingSummary();
      eventBus.emit(EVENT_NAMES.OFFLINE_QUEUE_CHANGED, summary);
      console.log('📡 Evento OFFLINE_QUEUE_CHANGED emitido:', summary);
    } catch (error) {
      console.error('❌ Error emitiendo evento de cambio de cola:', error);
    }
  }

  /**
   * Muestra un mensaje utilizando FirebaseSyncManager
   * @param {string} msg - Mensaje a mostrar
   * @param {string} type - Tipo de mensaje (info, success, error, warning, sync)
   * @param {number} duration - Duración en milisegundos (0 = permanente)
   * @private
   */
  _show(msg, type = 'info', duration = 3000) {
    try {
      if (window.firebaseSyncManager && typeof window.firebaseSyncManager.showSyncMessage === 'function') {
        window.firebaseSyncManager.showSyncMessage(msg, type, '', duration);
      } else {
        console.log(`💬 [${type.toUpperCase()}] ${msg}`);
      }
    } catch (error) {
      console.error('❌ Error mostrando mensaje:', error);
    }
  }

  // ============= MÉTODOS DE DEDUPLICACIÓN =============

  /**
   * Verifica si existe un paciente con la matrícula dada
   * @param {string} matricula - Matrícula a buscar
   * @returns {Promise<boolean>} true si existe
   * @private
   */
  async _existsPacienteByMatricula(matricula) {
    try {
      const pacientesCol = collection(db, 'pacientes');
      const q = query(pacientesCol, where('matricula', '==', matricula), limit(1));
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('❌ Error verificando paciente por matrícula:', error);
      return false;
    }
  }

  /**
   * Verifica si existe un registro médico similar
   * @param {string} pacienteId - ID del paciente
   * @param {string} fechaISO - Fecha en formato YYYY-MM-DD
   * @param {Object} datosMedicos - Datos médicos para comparar
   * @returns {Promise<boolean>} true si existe
   * @private
   */
  async _existsRegistroMedicoSimilar(pacienteId, fechaISO, datosMedicos) {
    try {
      const registrosCol = collection(db, 'registros_medicos');

      // Convertir fecha ISO a rango de Timestamp (todo el día)
      const startOfDay = Timestamp.fromDate(new Date(fechaISO + 'T00:00:00'));
      const endOfDay = Timestamp.fromDate(new Date(fechaISO + 'T23:59:59'));

      // Consultar registros del paciente en ese día
      const q = query(
        registrosCol,
        where('pacienteId', '==', pacienteId),
        where('fecha', '>=', startOfDay),
        where('fecha', '<=', endOfDay),
        limit(10)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) return false;

      // Comparar datos médicos para detectar duplicados exactos
      // Si hay algún registro muy similar (mismos campos no vacíos), considerar duplicado
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const existingDatos = data.datosMedicos || {};

        // Comparar campos clave
        const keysToCompare = ['temperatura', 'presion', 'peso', 'talla'];
        let matchCount = 0;

        for (const key of keysToCompare) {
          if (datosMedicos[key] && existingDatos[key] &&
              String(datosMedicos[key]) === String(existingDatos[key])) {
            matchCount++;
          }
        }

        // Si coinciden 2 o más campos clave, considerar duplicado
        if (matchCount >= 2) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('❌ Error verificando registro médico:', error);
      // En caso de error, asumir que no existe para intentar subir
      return false;
    }
  }

  /**
   * Verifica si existe un checklist similar
   * @param {string} usuarioId - ID del usuario
   * @param {string} moduloId - ID del módulo
   * @param {string} dayISO - Día en formato YYYY-MM-DD
   * @returns {Promise<boolean>} true si existe
   * @private
   */
  async _existsChecklistSimilar(usuarioId, moduloId, dayISO) {
    try {
      const registrosCol = collection(db, 'registro_instrumentos');

      // Consultar por usuario, módulo y fecha
      const q = query(
        registrosCol,
        where('usuarioId', '==', usuarioId),
        where('moduloId', '==', moduloId),
        where('fecha', '==', dayISO),
        limit(1)
      );

      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('❌ Error verificando checklist:', error);
      // Si falla la consulta compuesta, intentar con heurística en cliente
      try {
        const registrosCol = collection(db, 'registro_instrumentos');
        const q = query(
          registrosCol,
          where('usuarioId', '==', usuarioId),
          where('fecha', '==', dayISO),
          limit(20)
        );
        const snapshot = await getDocs(q);

        for (const doc of snapshot.docs) {
          if (doc.data().moduloId === moduloId) {
            return true;
          }
        }
        return false;
      } catch (fallbackError) {
        console.error('❌ Error en fallback de verificación de checklist:', fallbackError);
        return false;
      }
    }
  }

  /**
   * Verifica si existe una observación similar
   * @param {string} usuarioId - ID del usuario
   * @param {string} moduloId - ID del módulo
   * @param {string} dayISO - Día en formato YYYY-MM-DD
   * @param {string} descripcionHash - Descripción normalizada para comparar
   * @returns {Promise<boolean>} true si existe
   * @private
   */
  async _existsObservacionSimilar(usuarioId, moduloId, dayISO, descripcionHash) {
    try {
      const observacionesCol = collection(db, 'observaciones_reportes');

      // Consultar observaciones del usuario en ese módulo y día
      const q = query(
        observacionesCol,
        where('usuarioId', '==', usuarioId),
        where('moduloId', '==', moduloId),
        where('fecha', '==', dayISO),
        limit(20)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) return false;

      // Comparar descripciones normalizadas
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const existingDesc = this._safeToString(data.descripcion).toLowerCase().trim();

        if (existingDesc === descripcionHash) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('❌ Error verificando observación:', error);
      return false;
    }
  }

  // ==========================================
  // MÉTODOS HELPER PARA CONTROLLERS
  // ==========================================

  /**
   * Agrega un paciente a la cola offline
   * @param {Object} patientData - Datos del paciente
   * @returns {string} ID temporal asignado
   */
  addPatientToQueue(patientData) {
    try {
      // Generar ID temporal único
      const tempId = `TEMP_PACIENTE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Leer cola actual
      const patientsMap = this._readLocalMap('offline_patients');

      // Agregar paciente con ID temporal
      const patientWithId = {
        ...patientData,
        id: patientData.id || tempId,
        _tempId: tempId,
        _offlineCreated: true,
        _offlineTimestamp: Date.now()
      };

      patientsMap[tempId] = patientWithId;

      // Guardar cola actualizada
      this._writeLocalKey('offline_patients', patientsMap);

      // Emitir evento de cambio en cola
      this._emitQueueChange();


      return tempId;
    } catch (error) {
      console.error('❌ Error agregando paciente a cola offline:', error);
      throw error;
    }
  }

  /**
   * Agrega un registro médico a la cola offline
   * @param {Object} recordData - Datos del registro médico
   * @returns {string} ID temporal asignado
   */
  addMedicalRecordToQueue(recordData) {
    try {
      // Generar ID temporal único
      const tempId = `TEMP_REGISTRO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Leer cola actual
      const recordsMap = this._readLocalMap('offline_medical_records');

      // Agregar registro con ID temporal
      const recordWithId = {
        ...recordData,
        id: recordData.id || tempId,
        _tempId: tempId,
        _offlineCreated: true,
        _offlineTimestamp: Date.now()
      };

      recordsMap[tempId] = recordWithId;

      // Guardar cola actualizada
      this._writeLocalKey('offline_medical_records', recordsMap);

      // Emitir evento de cambio en cola
      this._emitQueueChange();


      return tempId;
    } catch (error) {
      console.error('❌ Error agregando registro médico a cola offline:', error);
      throw error;
    }
  }

  /**
   * Agrega un checklist a la cola offline
   * @param {Object} checklistData - Datos del checklist
   * @returns {string} ID temporal asignado
   */
  addChecklistToQueue(checklistData) {
    try {
      // Generar ID temporal único
      const tempId = `TEMP_CHECKLIST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Leer cola actual
      const checklists = this._readLocalArray('offline_checklists');

      // Agregar checklist con ID temporal
      const checklistWithId = {
        ...checklistData,
        id: checklistData.id || tempId,
        _tempId: tempId,
        _offlineCreated: true,
        _offlineTimestamp: Date.now()
      };

      checklists.push(checklistWithId);

      // Guardar cola actualizada
      this._writeLocalKey('offline_checklists', checklists);

      // Emitir evento de cambio en cola
      this._emitQueueChange();


      return tempId;
    } catch (error) {
      console.error('❌ Error agregando checklist a cola offline:', error);
      throw error;
    }
  }

  /**
   * Agrega una observación a la cola offline
   * @param {Object} observacionData - Datos de la observación
   * @returns {string} ID temporal asignado
   */
  addObservacionToQueue(observacionData) {
    try {
      // Generar ID temporal único
      const tempId = `TEMP_OBSERVACION_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Leer cola actual
      const observaciones = this._readLocalArray('offline_observaciones');

      // Agregar observación con ID temporal
      const observacionWithId = {
        ...observacionData,
        id: observacionData.id || tempId,
        _tempId: tempId,
        _offlineCreated: true,
        _offlineTimestamp: Date.now()
      };

      observaciones.push(observacionWithId);

      // Guardar cola actualizada
      this._writeLocalKey('offline_observaciones', observaciones);

      // Emitir evento de cambio en cola
      this._emitQueueChange();


      return tempId;
    } catch (error) {
      console.error('❌ Error agregando observación a cola offline:', error);
      throw error;
    }
  }

  /**
   * Agrega una actividad a la cola offline
   * @param {Object} activityData - Datos de la actividad
   * @returns {string} ID temporal asignado
   */
  addActivityToQueue(activityData) {
    try {
      // Generar ID temporal único
      const tempId = `TEMP_ACTIVITY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Leer cola actual
      const activities = this._readLocalArray('offline_activities');

      // Agregar actividad con ID temporal
      const activityWithId = {
        ...activityData,
        id: activityData.id || tempId,
        _tempId: tempId,
        _offlineCreated: true,
        _offlineTimestamp: Date.now()
      };

      activities.push(activityWithId);

      // Guardar cola actualizada
      this._writeLocalKey('offline_activities', activities);

      // Emitir evento de cambio en cola
      this._emitQueueChange();


      return tempId;
    } catch (error) {
      console.error('❌ Error agregando actividad a cola offline:', error);
      throw error;
    }
  }

  /**
   * Agrega datos médicos a la cola offline (usado por pacienteController)
   * @param {Object} medicalData - Datos médicos del paciente
   * @returns {string} ID temporal asignado
   */
  addMedicalDataToQueue(medicalData) {
    try {
      // Generar ID temporal único
      const tempId = `TEMP_MEDICAL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Leer cola actual
      const medicalQueue = this._readLocalMap('offline_medical_data');

      // Agregar datos médicos con ID temporal
      const medicalWithId = {
        ...medicalData,
        id: medicalData.id || tempId,
        _tempId: tempId,
        _offlineCreated: true,
        _offlineTimestamp: Date.now(),
        _type: 'medical_data'
      };

      medicalQueue[tempId] = medicalWithId;

      // Guardar cola actualizada
      this._writeLocalKey('offline_medical_data', medicalQueue);

      // Emitir evento de cambio en cola
      this._emitQueueChange();


      return tempId;
    } catch (error) {
      console.error('❌ Error agregando datos médicos a cola offline:', error);
      throw error;
    }
  }

  /**
   * Agrega una actualización de paciente a la cola offline (usado por pacienteController)
   * @param {Object} updateData - Datos de actualización del paciente
   * @returns {string} ID temporal asignado
   */
  addPatientUpdateToQueue(updateData) {
    try {
      // Generar ID temporal único
      const tempId = `TEMP_UPDATE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Leer cola actual
      const updateQueue = this._readLocalMap('offline_patient_updates');

      // Agregar actualización con ID temporal
      const updateWithId = {
        ...updateData,
        _tempId: tempId,
        _offlineCreated: true,
        _offlineTimestamp: Date.now(),
        _type: 'patient_update'
      };

      updateQueue[tempId] = updateWithId;

      // Guardar cola actualizada
      this._writeLocalKey('offline_patient_updates', updateQueue);

      // Emitir evento de cambio en cola
      this._emitQueueChange();

      console.log(`✅ Actualización de paciente agregada a cola offline con ID temporal: ${tempId}`);
      return tempId;
    } catch (error) {
      console.error('❌ Error agregando actualización de paciente a cola offline:', error);
      throw error;
    }
  }

  /**
   * Verifica si hay elementos pendientes de sincronización
   * @returns {boolean} true si hay elementos pendientes
   */
  hasPendingSync() {
    const summary = this.getPendingSummary();
    return summary.total > 0;
  }

  /**
   * Obtiene el contador de elementos pendientes por tipo
   * @returns {Object} Objeto con contadores
   */
  getPendingCounts() {
    const summary = this.getPendingSummary();
    return {
      activities: summary.activities,
      patients: summary.patients,
      medicalRecords: summary.medicalRecords,
      medicalData: summary.medicalData,
      patientUpdates: summary.patientUpdates,
      checklists: summary.checklists,
      observaciones: summary.observaciones,
      legacy: summary.legacy.pacientes + summary.legacy.citas,
      total: summary.total
    };
  }
}

// Crear instancia singleton
const offlineSyncService = new OfflineSyncService();

// Inicializar automáticamente cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    offlineSyncService.init();
    console.log('🔄 OfflineSyncService auto-inicializado en DOMContentLoaded');
  });
} else {
  // DOM ya está listo
  setTimeout(() => {
    offlineSyncService.init();
    console.log('🔄 OfflineSyncService auto-inicializado inmediatamente');
  }, 100);
}

// Exportar el singleton
export default offlineSyncService;

// Exponer en window para acceso global
window.offlineSyncService = offlineSyncService;

console.log('✅ OfflineSyncService cargado y disponible en window.offlineSyncService');
