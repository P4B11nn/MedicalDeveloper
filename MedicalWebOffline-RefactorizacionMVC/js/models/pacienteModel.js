// js/models/pacienteModel.js

// --- IMPORTS ---
import { db } from './firebaseConfig.js';
import { authModel } from './storageModel.js';
import {
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
    updateDoc,
    getDoc,
    setDoc,
    query,
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// --- MODELO EXPORTADO ---
export const pacienteModel = {
    /**
     * Agrega un nuevo paciente a Firestore después de validar los datos.
     * @param {Object} pacienteData - Datos del paciente a agregar.
     * @returns {Promise<Object|null>} El documento del paciente creado o null si hay error.
     */
    async addPaciente(pacienteData) {
        console.log('pacienteModel.addPaciente llamado con:', pacienteData);
        
        // 1. Validación de campos obligatorios - Solo datos personales
        const camposRequeridos = [
            'id', 'matricula', 'nombre', 'grado', 'grupo', 'telefono', 'facultad'
        ];
        
        const camposFaltantes = camposRequeridos.filter(campo => !pacienteData[campo]);
        console.log('Campos faltantes:', camposFaltantes);
        
        if (camposFaltantes.length > 0) {
            const error = new Error(`Campos obligatorios faltantes: ${camposFaltantes.join(', ')}`);
            console.error('Error de validación:', error.message);
            throw error;
        }

        // Verificar conexión
        const isOnline = window.ConnectionManager ? window.ConnectionManager.online : navigator.onLine;
        
        try {
            console.log('Iniciando proceso de creación del paciente...');
            const pacienteConDefaults = {
                status: 'activo',
                fechaRegistro: new Date().toISOString(),
                createdAt: isOnline ? serverTimestamp() : new Date(),
                lastUpdate: Date.now(),
                ...pacienteData,
                // Convertir valores numéricos solo si están presentes
                temperatura_corporal: pacienteData.temperatura_corporal ? parseFloat(pacienteData.temperatura_corporal) : null,
                peso: pacienteData.peso ? parseFloat(pacienteData.peso) : null,
                talla: pacienteData.talla ? parseInt(pacienteData.talla) : null,
                frecuencia_respiratoria: pacienteData.frecuencia_respiratoria ? parseInt(pacienteData.frecuencia_respiratoria) : null
            };

            console.log('Datos finales del paciente:', pacienteConDefaults);

            if (isOnline) {
                // Modo online: guardar en Firestore
                console.log('Guardando en Firestore con ID:', pacienteData.id);
                await setDoc(doc(db, 'pacientes', pacienteData.id), pacienteConDefaults);
                console.log('Paciente guardado exitosamente en Firestore');

                // Registrar actividad
                console.log('Registrando actividad...');
                await authModel.registrarActividad({
                    accion: 'create_paciente',
                    descripcion: `Se registró al paciente ${pacienteData.nombre} (${pacienteData.matricula}) con ID ${pacienteData.id}`,
                    pacienteId: pacienteData.id
                });
                console.log('Actividad registrada');
            } else {
                // Modo offline: guardar en localStorage
                console.log('🔄 Sin conexión - Guardando paciente offline');
                const { offlineStorage } = await import('./storageModel.js');
                offlineStorage.savePatientOffline(pacienteConDefaults);
                
                // Agregar a cola de operaciones pendientes
                if (window.ConnectionManager) {
                    window.ConnectionManager.addPendingOperation({
                        type: 'create_patient',
                        data: pacienteConDefaults,
                        description: `Crear paciente: ${pacienteData.nombre} (${pacienteData.matricula})`
                    });
                }
                
                console.log('Paciente guardado offline y agregado a cola de sincronización');
            }

            const resultado = { success: true, id: pacienteData.id, isOffline: !isOnline };
            console.log('Retornando resultado:', resultado);
            return resultado;

        } catch (error) {
            console.error("Error al agregar paciente:", error);
            await authModel.registrarActividad({ 
                accion: 'error', 
                descripcion: `Error al crear paciente: ${error.message}` 
            });
            throw new Error('No se pudo agregar el paciente: ' + error.message);
        }
    },

    /**
     * Obtiene todos los pacientes desde Firestore y localStorage.
     * @returns {Promise<Array>} Un array con todos los pacientes (online + offline).
     */
    async getPacientes(includeInactive = false) {
        const isOnline = window.ConnectionManager ? window.ConnectionManager.online : navigator.onLine;
        let onlinePatients = [];
        
        // Intentar obtener pacientes online
        if (isOnline) {
            try {
                let q = collection(db, 'pacientes');
                if (!includeInactive) {
                    q = query(q, where('status', '==', 'activo'));
                }

                const snapshot = await getDocs(q);
                onlinePatients = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    isOffline: false
                }));
                
                console.log(`📊 ${onlinePatients.length} pacientes obtenidos de Firestore`);
            } catch (error) {
                console.error('Error al obtener pacientes online:', error);
                if (error.code === 'unavailable') {
                    console.log('🔄 Usando solo datos offline para pacientes');
                }
            }
        }
        
        // Obtener pacientes offline y combinar
        try {
            const { offlineStorage } = await import('./storageModel.js');
            const allPatients = offlineStorage.getAllPatients(onlinePatients);
            
            const offlineCount = allPatients.length - onlinePatients.length;
            if (offlineCount > 0) {
                console.log(`📱 ${offlineCount} pacientes adicionales desde almacenamiento offline`);
            }
            
            // Mostrar estado de conexión si hay datos offline
            if (!isOnline && allPatients.length > 0) {
                console.log('📵 Trabajando en modo offline con datos locales');
            }
            
            return allPatients;
        } catch (error) {
            console.error('Error combinando datos online/offline:', error);
            
            // Si falla todo, retornar solo los datos online
            if (onlinePatients.length > 0) {
                return onlinePatients;
            }
            
            throw new Error('No se pudieron obtener los pacientes: ' + error.message);
        }
    },

    /**
     * Obtiene un paciente específico por su ID.
     * @param {string} id - El ID del documento del paciente en Firestore.
     * @returns {Promise<Object|null>} El objeto del paciente o null si no se encuentra.
     */
    async getPacienteById(id) {
        try {
            const docRef = doc(db, 'pacientes', id);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                throw new Error('Paciente no encontrado');
            }
            return { id: docSnap.id, ...docSnap.data() };
        } catch (error) {
            console.error('Error al obtener paciente:', error);
            throw new Error('No se pudo obtener el paciente: ' + error.message);
        }
    },

    /**
     * Actualiza los datos de un paciente en Firestore.
     * @param {string} id - El ID del paciente a actualizar.
     * @param {Object} updatedData - Los campos a actualizar.
     * @returns {Promise<boolean>} True si la actualización fue exitosa, false si no.
     */
    async updatePaciente(id, updatedData) {
        try {
            // Validación de campos obligatorios
            if (updatedData.nombre === '' || updatedData.apellidos === '') {
                throw new Error('Nombre y apellidos son campos obligatorios');
            }

            const docRef = doc(db, 'pacientes', id);
            const currentDoc = await getDoc(docRef);

            if (!currentDoc.exists()) {
                throw new Error('Paciente no encontrado');
            }

            const currentData = currentDoc.data();
            const currentUser = authModel.getCurrentUser();
            
            // Preservar campos que no deben modificarse
            const updatePayload = {
                ...updatedData,
                status: currentData.status, // Preservar el estado actual
                lastUpdate: Date.now(),
                updatedBy: currentUser?.uid || 'sistema',
                updatedAt: serverTimestamp()
            };

            await updateDoc(docRef, updatePayload);

            // Si se están actualizando datos médicos, registrar en el historial
            const camposMedicos = ['temperatura_corporal', 'presion_arterial', 'peso', 'talla', 'frecuencia_respiratoria', 'examen_vista', 'examen_oido'];
            const datosMedicosActualizados = {};
            let hayDatosMedicos = false;

            camposMedicos.forEach(campo => {
                if (updatedData.hasOwnProperty(campo) && updatedData[campo] !== null && updatedData[campo] !== '') {
                    datosMedicosActualizados[campo] = updatedData[campo];
                    hayDatosMedicos = true;
                }
            });

            if (hayDatosMedicos) {
                console.log('Registrando en historial médico...');
                console.log('Datos médicos actualizados:', datosMedicosActualizados);
                console.log('Datos actuales del paciente:', currentData);
                
                // Comparar datos médicos anteriores con los nuevos
                // Los datos médicos se guardan directamente en el documento del paciente
                
                // Campos médicos a comparar
                const camposMedicos = [
                    'temperatura_corporal',
                    'presion_arterial',
                    'peso',
                    'talla',
                    'frecuencia_respiratoria',
                    'examen_vista',
                    'examen_oido'
                ];
                
                const camposModificados = [];
                
                // Verificar si el paciente ya tiene datos médicos previos
                const tieneDatosMedicosPrevios = camposMedicos.some(campo => 
                    currentData[campo] !== undefined && 
                    currentData[campo] !== null && 
                    currentData[campo] !== ''
                );
                
                const esRegistroNuevo = !tieneDatosMedicosPrevios;
                console.log('Es registro nuevo:', esRegistroNuevo);
                console.log('Tiene datos médicos previos:', tieneDatosMedicosPrevios);
                
                // Identificar qué campos cambiaron (solo si no es registro nuevo)
                if (!esRegistroNuevo) {
                    console.log('Comparando datos médicos...');
                    camposMedicos.forEach(campo => {
                        const valorAnterior = currentData[campo];
                        const valorNuevo = datosMedicosActualizados[campo];
                        
                        console.log(`Campo ${campo}: anterior="${valorAnterior}", nuevo="${valorNuevo}"`);
                        
                        // Solo considerar como cambio si realmente hay un valor nuevo diferente
                        if (valorNuevo !== undefined && valorAnterior !== valorNuevo) {
                            camposModificados.push({
                                campo: campo,
                                valorAnterior: valorAnterior || null,
                                valorNuevo: valorNuevo || null
                            });
                        }
                    });
                    console.log('Campos modificados:', camposModificados);
                }
                
                // Crear objeto con datos médicos anteriores para referencia
                const datosMedicosAnterioresObj = {};
                if (!esRegistroNuevo) {
                    camposMedicos.forEach(campo => {
                        if (currentData[campo] !== undefined && currentData[campo] !== null && currentData[campo] !== '') {
                            datosMedicosAnterioresObj[campo] = currentData[campo];
                        }
                    });
                }
                
                const historialEntry = {
                    pacienteId: id,
                    paciente: `${updatedData.nombre || currentData.nombre} ${updatedData.apellidos || currentData.apellidos}`,
                    pacienteNombre: `${updatedData.nombre || currentData.nombre} ${updatedData.apellidos || currentData.apellidos}`,
                    pacienteMatricula: updatedData.matricula || currentData.matricula,
                    fecha: new Date(),
                    timestamp: serverTimestamp(),
                    datosMedicos: datosMedicosActualizados,
                    registradoPor: currentUser?.uid || 'sistema',
                    practicante: currentUser?.nombre || 'Sistema',
                    registradoPorNombre: currentUser?.nombre || 'Sistema',
                    // Nuevos campos para seguimiento
                    tipoRegistro: esRegistroNuevo ? 'nuevo' : 'actualizacion',
                    camposModificados: camposModificados,
                    totalCamposModificados: camposModificados.length,
                    datosMedicosAnteriores: esRegistroNuevo ? null : datosMedicosAnterioresObj
                };

                console.log('Entrada del historial a guardar:', historialEntry);
                await addDoc(collection(db, 'registros_medicos'), historialEntry);
                console.log(`Historial médico registrado exitosamente - Tipo: ${historialEntry.tipoRegistro}, Campos modificados: ${camposModificados.length}`);
            }

            await authModel.registrarActividad({
                accion: 'update_paciente',
                descripcion: `Se actualizó la información del paciente ${updatedData.nombre || currentData.nombre} ${updatedData.apellidos || currentData.apellidos}`,
                pacienteId: id,
                cambios: Object.keys(updatedData).join(', ')
            });

            return { success: true, id };
        } catch (error) {
            console.error('Error al actualizar paciente:', error);
            await authModel.registrarActividad({
                accion: 'error_update_paciente',
                descripcion: `Error al actualizar paciente: ${error.message}`,
                pacienteId: id
            });
            throw new Error('No se pudo actualizar el paciente: ' + error.message);
        }
    },

    /**
     * Elimina un paciente de Firestore.
     * Práctica recomendada: En lugar de borrar, se cambia el estado a 'inactivo'.
     * @param {string} id - El ID del paciente a eliminar/inactivar.
     * @returns {Promise<boolean>} True si la operación fue exitosa.
     */
    async deletePaciente(id) {
        try {
            const docRef = doc(db, 'pacientes', id);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                throw new Error('Paciente no encontrado');
            }

            const currentUser = authModel.getCurrentUser();

            // Implementación de borrado suave
            await updateDoc(docRef, {
                status: 'inactivo',
                deletedAt: serverTimestamp(),
                deletedBy: currentUser?.uid || 'sistema',
                lastUpdate: Date.now()
            });

            await authModel.registrarActividad({
                accion: 'delete_paciente',
                descripcion: `Se marcó como inactivo al paciente ${docSnap.data().nombre} ${docSnap.data().apellidos}`,
                pacienteId: id
            });

            return { success: true };
        } catch (error) {
            console.error('Error al eliminar paciente:', error);
            await authModel.registrarActividad({
                accion: 'error_delete_paciente',
                descripcion: `Error al eliminar paciente: ${error.message}`,
                pacienteId: id
            });
            throw new Error('No se pudo eliminar el paciente: ' + error.message);
        }
    },

    /**
     * Reactiva un paciente inactivo
     * @param {string} id - El ID del paciente a reactivar
     * @returns {Promise<boolean>} True si la reactivación fue exitosa
     */
    async reactivarPaciente(id) {
        try {
            const docRef = doc(db, 'pacientes', id);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                throw new Error('Paciente no encontrado');
            }

            if (docSnap.data().status === 'activo') {
                throw new Error('El paciente ya está activo');
            }

            const currentUser = authModel.getCurrentUser();

            await updateDoc(docRef, {
                status: 'activo',
                reactivatedAt: serverTimestamp(),
                reactivatedBy: currentUser?.uid || 'sistema',
                lastUpdate: Date.now()
            });

            await authModel.registrarActividad({
                accion: 'reactivate_paciente',
                descripcion: `Se reactivó al paciente ${docSnap.data().nombre} ${docSnap.data().apellidos}`,
                pacienteId: id
            });

            return { success: true };
        } catch (error) {
            console.error('Error al reactivar paciente:', error);
            await authModel.registrarActividad({
                accion: 'error_reactivate_paciente',
                descripcion: `Error al reactivar paciente: ${error.message}`,
                pacienteId: id
            });
            throw new Error('No se pudo reactivar el paciente: ' + error.message);
        }
    },

    /**
     * Busca pacientes por criterios específicos
     * @param {Object} criterios - Criterios de búsqueda
     * @returns {Promise<Array>} Array de pacientes encontrados
     */
    async buscarPacientes(criterios) {
        try {
            let q = collection(db, 'pacientes');

            if (!criterios.incluirInactivos) {
                q = query(q, where('status', '==', 'activo'));
            }

            if (criterios.nombre) {
                q = query(q, where('nombre', '>=', criterios.nombre), 
                         where('nombre', '<=', criterios.nombre + '\uf8ff'));
            }

            if (criterios.fechaDesde) {
                q = query(q, where('fechaRegistro', '>=', criterios.fechaDesde));
            }

            if (criterios.fechaHasta) {
                q = query(q, where('fechaRegistro', '<=', criterios.fechaHasta));
            }

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error en la búsqueda de pacientes:', error);
            throw new Error('Error al buscar pacientes: ' + error.message);
        }
    },

    /**
     * Obtiene todas las citas desde Firestore
     * @returns {Promise<Array>} Array de citas
     */
    async getCitas() {
        try {
            const snapshot = await getDocs(collection(db, 'citas'));
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                // Convertir timestamps si es necesario
                fecha: doc.data().fecha?.toDate?.() || doc.data().fecha
            }));
        } catch (error) {
            console.error('Error obteniendo citas:', error);
            if (error.code === 'unavailable') {
                console.log('Usando datos en cache offline para citas');
            }
            throw new Error('No se pudieron obtener las citas: ' + error.message);
        }
    },

    /**
     * Obtiene el historial médico desde Firestore
     * @returns {Promise<Array>} Array de registros del historial médico
     */
    async getHistorialMedico() {
        try {
            const snapshot = await getDocs(collection(db, 'registros_medicos'));
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                // Convertir timestamps si es necesario
                fecha: doc.data().fecha?.toDate?.() || doc.data().fecha
            }));
        } catch (error) {
            console.error('Error obteniendo historial médico:', error);
            if (error.code === 'unavailable') {
                console.log('Usando datos en cache offline para historial médico');
            }
            throw new Error('No se pudo obtener el historial médico: ' + error.message);
        }
    }
};
