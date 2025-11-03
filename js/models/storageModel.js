// js/models/storageModel.js - VERSIÓN FINAL REFACTORIZADA

// --- IMPORTS ---
// Se importa la DB, el servicio de Auth, y todas las funciones necesarias.
import { db, auth } from './firebaseConfig.js';
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
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

// --- CONSTANTES ---
const USERS_COLLECTION = "usuarios";
const ACTIVIDADES_COLLECTION = "actividades";
const CURRENT_USER_KEY = "currentUser";

// --- COLECCIONES DE FIRESTORE ---
const usuariosCollection = collection(db, USERS_COLLECTION);
const actividadesCollection = collection(db, ACTIVIDADES_COLLECTION);

// --- MODELO DE AUTENTICACIÓN EXPORTADO ---
export const authModel = {
    /**
     * Valida las credenciales del usuario usando Firebase Auth
     * @param {string} emailOrMatricula - Email o matrícula del usuario
     * @param {string} password - Contraseña del usuario
     * @returns {Promise<Object|null>} Usuario válido o null
     */
    async validateUser(emailOrMatricula, password) {
        try {
            let email = emailOrMatricula;
            let userDataFromFirestore = null;

            // Si no es un email (no contiene @), buscar por matrícula
            if (!emailOrMatricula.includes('@')) {
                // Buscar usuario por matrícula para obtener su email
                const q = query(usuariosCollection, where('matricula', '==', emailOrMatricula));
                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    throw new Error('Usuario no encontrado con esa matrícula');
                }

                const userDoc = snapshot.docs[0];
                userDataFromFirestore = userDoc.data();

                // Usar el correo almacenado en Firestore para autenticar
                if (!userDataFromFirestore.correo) {
                    throw new Error('Usuario no tiene correo registrado');
                }

                email = userDataFromFirestore.correo;
            }

            // Verificar si el usuario tiene una contraseña temporal pendiente
            let finalPassword = password;
            let passwordChanged = false;

            if (userDataFromFirestore && userDataFromFirestore.passwordResetRequired && userDataFromFirestore.temporaryPassword) {
                console.log('🔄 Usuario tiene contraseña temporal pendiente, aplicando nueva contraseña');
                finalPassword = userDataFromFirestore.temporaryPassword;
                passwordChanged = true;
            }

            // Autenticar con Firebase Auth usando el email y la contraseña final
            const userCredential = await signInWithEmailAndPassword(auth, email, finalPassword);
            const firebaseUser = userCredential.user;

            // Obtener datos adicionales del usuario desde Firestore
            const userDoc = await getDoc(doc(usuariosCollection, firebaseUser.uid));

            if (!userDoc.exists()) {
                throw new Error('Datos de usuario no encontrados en Firestore');
            }

            const userData = userDoc.data();

            // Si se aplicó una contraseña temporal, actualizar la contraseña en Firebase Auth
            // y limpiar los flags de reset
            if (passwordChanged) {
                try {
                    // Actualizar la contraseña en Firebase Auth con la nueva contraseña temporal
                    await updatePassword(firebaseUser, userData.temporaryPassword);

                    // Limpiar los flags de reset de contraseña en Firestore
                    await updateDoc(doc(usuariosCollection, firebaseUser.uid), {
                        passwordResetRequired: false,
                        temporaryPassword: null,
                        passwordResetTimestamp: null,
                        updatedAt: serverTimestamp()
                    });

                    console.log('✅ Contraseña temporal aplicada correctamente');
                } catch (passwordUpdateError) {
                    console.error('Error actualizando contraseña en Firebase Auth:', passwordUpdateError);
                    // No fallar el login por esto, pero registrar el error
                }
            }

            // Combinar datos de Firebase Auth y Firestore
            const usuario = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                passwordResetRequired: userData.passwordResetRequired || false,
                ...userData
            };

            // Guardar en sessionStorage para acceso rápido
            sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(usuario));

            // Nota: El registro de login se maneja en authController.js con ActivityLogger.loginActivity()
            // para evitar duplicados y mantener consistencia

            return usuario;
        } catch (error) {
            console.error('Error en validateUser:', error);
            throw error;
        }
    },

    /**
     * Proceso de login (alias para validateUser)
     */
    async login(emailOrMatricula, password) {
        return await this.validateUser(emailOrMatricula, password);
    },

    /**
     * Cierra la sesión del usuario
     */
    async logout() {
        try {
            const currentUser = this.getCurrentUser();

            if (currentUser) {
                // Registrar actividad de logout
                await this.registrarActividad({
                    accion: 'logout',
                    descripcion: `Usuario ${currentUser.nombre} cerró sesión`,
                    userId: currentUser.uid
                });
            }

            // Cerrar sesión en Firebase Auth
            await signOut(auth);

            // Limpiar sessionStorage
            sessionStorage.removeItem(CURRENT_USER_KEY);

            console.log('Logout exitoso');
        } catch (error) {
            console.error('Error en logout:', error);
            throw error;
        }
    },

    /**
     * Cierra la sesión del usuario SIN registrar actividad (para evitar duplicados)
     */
    async logoutSilent() {
        try {
            // Cerrar sesión en Firebase Auth
            await signOut(auth);

            // Limpiar sessionStorage
            sessionStorage.removeItem(CURRENT_USER_KEY);

            console.log('Logout silencioso exitoso');
        } catch (error) {
            console.error('Error en logout silencioso:', error);
            throw error;
        }
    },

    /**
     * Obtiene el usuario actual desde sessionStorage
     * @returns {Object|null} Usuario actual o null
     */
    getCurrentUser() {
        try {
            const userString = sessionStorage.getItem(CURRENT_USER_KEY);
            return userString ? JSON.parse(userString) : null;
        } catch (error) {
            console.error('Error obteniendo usuario actual:', error);
            return null;
        }
    },

    /**
     * Obtiene todos los usuarios desde Firestore
     * @returns {Promise<Array>} Array de usuarios
     */
    async getAllUsers() {
        try {
            const snapshot = await getDocs(usuariosCollection);
            return snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error obteniendo usuarios:', error);
            if (error.code === 'unavailable') {
                console.log('Usando datos en cache offline para usuarios');
            }
            throw new Error('No se pudieron obtener los usuarios: ' + error.message);
        }
    },

    /**
     * Genera una contraseña temporal segura
     * @returns {string} Contraseña generada
     */
    generateTemporaryPassword() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
        let password = '';
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    },

    /**
     * Añade un nuevo usuario
     * @param {Object} userData - Datos del usuario
     * @returns {Promise<Object>} Usuario creado con contraseña temporal
     */
    async addUser(userData) {
        try {
            // Validar campos requeridos
            if (!userData.email || !userData.nombre) {
                throw new Error('Email y nombre son obligatorios');
            }

            // Generar contraseña temporal si no se proporciona una
            const temporaryPassword = userData.password || this.generateTemporaryPassword();

            // Validar que la matrícula no esté duplicada
            if (userData.matricula) {
                const q = query(usuariosCollection, where('matricula', '==', userData.matricula));
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    throw new Error('Ya existe un usuario con esa matrícula');
                }
            }

            // Crear usuario en Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                userData.email,
                temporaryPassword
            );

            const firebaseUser = userCredential.user;

            // Preparar datos del documento para Firestore
            const userDoc = {
                apellidos: userData.apellidos || '',
                correo: userData.email, // Guardar el correo también en Firestore
                edad: userData.edad || null,
                matricula: userData.matricula || '',
                nombre: userData.nombre,
                rol: userData.rol || 'admin',
                sexo: userData.sexo || '',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            // Manejar consistencia entre grupoId y grupo_trabajo
            if (userData.grupoId) {
                try {
                    // Obtener información del grupo desde la colección grupos
                    const grupoRef = doc(db, 'grupos', userData.grupoId);
                    const grupoDoc = await getDoc(grupoRef);

                    if (grupoDoc.exists()) {
                        const grupoData = grupoDoc.data();
                        userDoc.grupoId = userData.grupoId;
                        userDoc.grupo_trabajo = grupoData.nombre || 'GRUPO_SIN_NOMBRE';
                        console.log(`Usuario creado con grupo: ${userDoc.grupo_trabajo}`);
                    } else {
                        console.warn(`Grupo con ID ${userData.grupoId} no encontrado`);
                        userDoc.grupoId = userData.grupoId;
                        userDoc.grupo_trabajo = 'GRUPO_NO_ENCONTRADO';
                    }
                } catch (grupoError) {
                    console.error('Error obteniendo datos del grupo:', grupoError);
                    userDoc.grupoId = userData.grupoId;
                    userDoc.grupo_trabajo = 'ERROR_GRUPO';
                }
            } else {
                // Si no se especifica grupoId, usar el valor legacy de grupo_trabajo si existe
                userDoc.grupo_trabajo = userData.grupo_trabajo || '';
                userDoc.grupoId = '';
            }

            await setDoc(doc(usuariosCollection, firebaseUser.uid), userDoc);

            // Registrar actividad
            await this.registrarActividad({
                accion: 'create_user',
                descripcion: `Usuario ${userData.nombre} creado`,
                userId: firebaseUser.uid
            });

            return {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                temporaryPassword: temporaryPassword, // Incluir la contraseña temporal en la respuesta
                ...userDoc
            };
        } catch (error) {
            console.error('Error creando usuario:', error);
            throw error;
        }
    },

    /**
     * Actualiza un usuario existente
     * @param {string} uid - UID del usuario
     * @param {Object} userData - Datos actualizados
     * @returns {Promise<boolean>} true si se actualizó correctamente
     */
    async updateUser(uid, userData) {
        try {
            const userRef = doc(usuariosCollection, uid);

            // Verificar que el usuario existe
            const userDoc = await getDoc(userRef);
            if (!userDoc.exists()) {
                throw new Error('Usuario no encontrado');
            }

            // Preparar datos para actualización
            const updateData = { ...userData };

            // Si se está actualizando el grupoId, también actualizar grupo_trabajo
            if (userData.grupoId) {
                try {
                    // Obtener información del grupo desde la colección grupos
                    const grupoRef = doc(db, 'grupos', userData.grupoId);
                    const grupoDoc = await getDoc(grupoRef);

                    if (grupoDoc.exists()) {
                        const grupoData = grupoDoc.data();
                        updateData.grupo_trabajo = grupoData.nombre || 'GRUPO_SIN_NOMBRE';
                        console.log(`Actualizando grupo_trabajo a: ${updateData.grupo_trabajo}`);
                    } else {
                        console.warn(`Grupo con ID ${userData.grupoId} no encontrado`);
                        updateData.grupo_trabajo = 'GRUPO_NO_ENCONTRADO';
                    }
                } catch (grupoError) {
                    console.error('Error obteniendo datos del grupo:', grupoError);
                    updateData.grupo_trabajo = 'ERROR_GRUPO';
                }
            } else if (userData.grupoId === '') {
                // Si se está quitando el grupo (grupoId vacío)
                updateData.grupo_trabajo = null;
                console.log('Removiendo asignación de grupo');
            }

            // Agregar timestamp de actualización
            updateData.updatedAt = serverTimestamp();

            // Actualizar documento
            await updateDoc(userRef, updateData);

            // Registrar actividad
            await this.registrarActividad({
                accion: 'update_user',
                descripcion: `Usuario ${userData.nombre || userDoc.data().nombre} actualizado`,
                userId: uid
            });

            return true;
        } catch (error) {
            console.error('Error actualizando usuario:', error);
            throw error;
        }
    },

    /**
     * Resetea la contraseña de un usuario y genera una nueva temporal
     * @param {string} uid - UID del usuario
     * @returns {Promise<Object>} Usuario con nueva contraseña temporal
     */
    async resetUserPassword(uid) {
        try {
            // Verificar que el usuario existe
            const userRef = doc(usuariosCollection, uid);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) {
                throw new Error('Usuario no encontrado');
            }

            const userData = userDoc.data();
            const newPassword = this.generateTemporaryPassword();

            // Almacenar la nueva contraseña temporal en Firestore
            await updateDoc(userRef, {
                temporaryPassword: newPassword,
                passwordResetRequired: true,
                passwordResetTimestamp: new Date().toISOString(),
                updatedAt: serverTimestamp()
            });

            // Registrar actividad
            await this.registrarActividad({
                accion: 'password_reset',
                descripcion: `Contraseña resetada para usuario ${userData.nombre}`,
                userId: uid
            });

            return {
                uid: uid,
                email: userData.correo,
                nombre: userData.nombre,
                temporaryPassword: newPassword,
                resetTimestamp: new Date().toISOString(),
                ...userData
            };
        } catch (error) {
            console.error('Error reseteando contraseña:', error);
            throw error;
        }
    },

    /**
     * Cambia la contraseña del usuario actual
     * @param {string} currentPassword - Contraseña actual
     * @param {string} newPassword - Nueva contraseña
     * @returns {Promise<boolean>} true si se cambió correctamente
     */
    async changePassword(currentPassword, newPassword) {
        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error('No hay usuario autenticado');
            }

            // Reautenticar al usuario con su contraseña actual
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);

            // Actualizar la contraseña
            await updatePassword(user, newPassword);

            // Registrar actividad
            await this.registrarActividad({
                accion: 'password_changed',
                descripcion: `Usuario ${user.email} cambió su contraseña`,
                userId: user.uid
            });

            return true;
        } catch (error) {
            console.error('Error cambiando contraseña:', error);
            throw error;
        }
    },

    /**
     * Obtiene el usuario actual autenticado
     * @returns {Object|null} Usuario actual o null
     */
    getCurrentUser() {
        try {
            const sessionUser = JSON.parse(sessionStorage.getItem(CURRENT_USER_KEY) || 'null');
            return sessionUser;
        } catch (error) {
            console.error('Error obteniendo usuario actual:', error);
            return null;
        }
    },

    /**
     * Inicializa el listener de estado de autenticación
     */
    initAuthStateListener() {
        onAuthStateChanged(auth, (user) => {
            console.log('Estado de autenticación de Firebase cambió:', user ? user.email : 'Usuario no autenticado');

            if (!user) {
                // Si Firebase Auth no tiene usuario, limpiar sessionStorage
                const sessionUser = sessionStorage.getItem(CURRENT_USER_KEY);
                if (sessionUser) {
                    console.log('Limpiando sesión por cambio en Firebase Auth');
                    sessionStorage.removeItem(CURRENT_USER_KEY);
                }
            }
        });
    },

    /**
     * Elimina un usuario completamente de Firestore
     * @param {string} uid - UID del usuario
     * @returns {Promise<boolean>} true si se eliminó correctamente
     */
    async deleteUser(uid) {
        try {
            const userRef = doc(usuariosCollection, uid);

            // Verificar que el usuario existe
            const userDoc = await getDoc(userRef);
            if (!userDoc.exists()) {
                throw new Error('Usuario no encontrado');
            }

            // Eliminar completamente el documento de Firestore
            await deleteDoc(userRef);

            // Registrar actividad
            await this.registrarActividad({
                accion: 'delete_user',
                descripcion: `Usuario ${userDoc.data().nombre} eliminado`,
                userId: uid
            });

            return true;
        } catch (error) {
            console.error('Error eliminando usuario:', error);
            throw error;
        }
    },

    /**
     * Registra una actividad en el sistema
     * @param {Object} actividad - Datos de la actividad
     * @returns {Promise<Object>} Actividad registrada
     */
    async registrarActividad(actividad) {
        try {
            // Usar el nuevo ActivityLogger centralizado
            const { default: ActivityLogger } = await import('../utils/activityLogger.js');
            
            return await ActivityLogger.log({
                accion: actividad.accion,
                descripcion: actividad.descripcion,
                modulo: this.getModuleFromAction(actividad.accion),
                recursoId: actividad.recursoId,
                recursoTipo: actividad.recursoTipo,
                detalles: actividad.detalles
            });
            
        } catch (error) {
            console.error('Error registrando actividad:', error);
            
            // Fallback: mantener el sistema anterior como respaldo
            console.log('📝 Actividad registrada (fallback):', actividad.descripcion);
            return {
                id: 'fallback-' + Date.now(),
                ...actividad,
                timestamp: new Date().toISOString()
            };
        }
    },

    /**
     * Obtiene el módulo basado en el tipo de acción
     * @param {string} accion - Tipo de acción
     * @returns {string} Nombre del módulo
     */
    getModuleFromAction(accion) {
        const actionModuleMap = {
            'login': 'autenticacion',
            'logout': 'autenticacion',
            'create_user': 'usuarios',
            'update_user': 'usuarios',
            'delete_user': 'usuarios',
            'create_paciente': 'pacientes',
            'update_paciente': 'pacientes',
            'delete_paciente': 'pacientes',
            'create_registro_medico': 'pacientes',
            'update_registro_medico': 'pacientes',
            'delete_registro_medico': 'pacientes',
            'exportar': 'reportes',
            'consulta': 'reportes'
        };
        
        return actionModuleMap[accion] || 'general';
    },

    /**
     * Obtiene las actividades del sistema
     * @param {Object} filtros - Filtros opcionales
     * @returns {Promise<Array>} Array de actividades
     */
    async getActividades(filtros = {}) {
        try {
            let q = actividadesCollection;

            // Aplicar filtros si se proporcionan
            if (filtros.userId) {
                q = query(q, where('userId', '==', filtros.userId));
            }

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                // Convertir timestamp de Firestore si es necesario
                timestamp: doc.data().timestamp?.toDate?.() || doc.data().timestamp
            }));
        } catch (error) {
            console.error('Error obteniendo actividades:', error);
            if (error.code === 'unavailable') {
                console.log('Usando datos en cache offline para actividades');
            }
            throw new Error('No se pudieron obtener las actividades: ' + error.message);
        }
    },

    /**
     * Busca usuarios por criterios
     * @param {Object} criterios - Criterios de búsqueda
     * @returns {Promise<Array>} Array de usuarios encontrados
     */
    async buscarUsuarios(criterios) {
        try {
            let q = usuariosCollection;

            if (criterios.rol) {
                q = query(q, where('rol', '==', criterios.rol));
            }

            if (criterios.matricula) {
                q = query(q, where('matricula', '==', criterios.matricula));
            }

            if (criterios.correo) {
                q = query(q, where('correo', '==', criterios.correo));
            }

            if (criterios.grupo_trabajo) {
                q = query(q, where('grupo_trabajo', '==', criterios.grupo_trabajo));
            }

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error buscando usuarios:', error);
            throw error;
        }
    },

    /**
     * Busca un usuario por matrícula o correo
     * @param {string} identifier - Matrícula o correo del usuario
     * @returns {Promise<Object|null>} Usuario encontrado o null
     */
    async buscarUsuarioPorIdentificador(identifier) {
        try {
            let q;

            if (identifier.includes('@')) {
                // Es un correo
                q = query(usuariosCollection, where('correo', '==', identifier));
            } else {
                // Es una matrícula
                q = query(usuariosCollection, where('matricula', '==', identifier));
            }

            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                return null;
            }

            const userDoc = snapshot.docs[0];
            return {
                uid: userDoc.id,
                ...userDoc.data()
            };
        } catch (error) {
            console.error('Error buscando usuario por identificador:', error);
            throw error;
        }
    }
};

// --- FUNCIONALIDAD OFFLINE ---
export const offlineStorage = {
    // Claves para localStorage
    OFFLINE_PATIENTS_KEY: 'offline_patients',
    OFFLINE_MEDICAL_RECORDS_KEY: 'offline_medical_records',
    OFFLINE_PENDING_OPERATIONS_KEY: 'offline_pending_operations',

    // Guardar paciente en localStorage
    savePatientOffline(patient) {
        try {
            const patients = this.getOfflinePatients();
            const patientId = patient.id || `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            patient.id = patientId;
            patient.isOffline = true;
            patient.timestamp = new Date().toISOString();

            patients[patientId] = patient;
            localStorage.setItem(this.OFFLINE_PATIENTS_KEY, JSON.stringify(patients));

            console.log('👤 Paciente guardado offline:', patientId);
            return patient;
        } catch (error) {
            console.error('Error guardando paciente offline:', error);
            throw error;
        }
    },

    // Obtener pacientes offline
    getOfflinePatients() {
        try {
            const stored = localStorage.getItem(this.OFFLINE_PATIENTS_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Error obteniendo pacientes offline:', error);
            return {};
        }
    },

    // Obtener todos los pacientes (online + offline)
    getAllPatients(onlinePatients = []) {
        const offlinePatients = this.getOfflinePatients();
        const allPatients = [...onlinePatients];

        // Agregar pacientes offline que no estén duplicados
        Object.values(offlinePatients).forEach(offlinePatient => {
            const exists = onlinePatients.find(p => p.matricula === offlinePatient.matricula);
            if (!exists) {
                allPatients.push(offlinePatient);
            }
        });

        return allPatients;
    },

    // Guardar registro médico offline
    saveMedicalRecordOffline(record) {
        try {
            const records = this.getOfflineMedicalRecords();
            const recordId = record.id || `offline_record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            record.id = recordId;
            record.isOffline = true;
            record.timestamp = new Date().toISOString();

            records[recordId] = record;
            localStorage.setItem(this.OFFLINE_MEDICAL_RECORDS_KEY, JSON.stringify(records));

            console.log('🏥 Registro médico guardado offline:', recordId);
            return record;
        } catch (error) {
            console.error('Error guardando registro médico offline:', error);
            throw error;
        }
    },

    // Obtener registros médicos offline
    getOfflineMedicalRecords() {
        try {
            const stored = localStorage.getItem(this.OFFLINE_MEDICAL_RECORDS_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Error obteniendo registros médicos offline:', error);
            return {};
        }
    },

    // Limpiar datos offline después de sincronizar
    clearOfflineData(type) {
        try {
            switch (type) {
                case 'patients':
                    localStorage.removeItem(this.OFFLINE_PATIENTS_KEY);
                    break;
                case 'medical_records':
                    localStorage.removeItem(this.OFFLINE_MEDICAL_RECORDS_KEY);
                    break;
                case 'all':
                    localStorage.removeItem(this.OFFLINE_PATIENTS_KEY);
                    localStorage.removeItem(this.OFFLINE_MEDICAL_RECORDS_KEY);
                    localStorage.removeItem(this.OFFLINE_PENDING_OPERATIONS_KEY);
                    break;
            }
            console.log(`🧹 Datos offline limpiados: ${type}`);
        } catch (error) {
            console.error('Error limpiando datos offline:', error);
        }
    },

    // Verificar si hay datos offline pendientes
    hasPendingOfflineData() {
        const patients = this.getOfflinePatients();
        const records = this.getOfflineMedicalRecords();

        return Object.keys(patients).length > 0 || Object.keys(records).length > 0;
    }
};

// --- MODELO DE INSTRUMENTOS ---
export const instrumentosModel = {
    /**
     * Guardar checklist de instrumentos en Firebase
     * @param {Object} checklistData - Datos del checklist
     * @returns {Promise<Object|null>} Registro guardado o null
     */
    async saveChecklist(checklistData) {
        try {
            console.log('💾 Guardando checklist de instrumentos en Firebase...');
            
            const currentUser = authModel.getCurrentUser();
            if (!currentUser) {
                throw new Error('Usuario no autenticado');
            }

            const registro = {
                usuarioId: currentUser.uid,
                usuarioNombre: currentUser.nombre,
                usuarioMatricula: currentUser.matricula,
                moduloId: checklistData.moduloId,
                moduloNombre: checklistData.moduloNombre,
                ubicacion: checklistData.ubicacion,
                instrumentos: checklistData.instrumentos || {},
                insumos: checklistData.insumos || {},
                observaciones: checklistData.observaciones || '',
                fecha: new Date().toISOString(),
                timestamp: serverTimestamp(),
                tipo: 'checklist_instrumentos'
            };

            const registroInstrumentosCollection = collection(db, 'registro_instrumentos');
            const docRef = await addDoc(registroInstrumentosCollection, registro);

            console.log('✅ Checklist guardado en Firebase con ID:', docRef.id);
            return { id: docRef.id, ...registro };

        } catch (error) {
            console.error('❌ Error guardando checklist en Firebase:', error);
            
            // Fallback a localStorage
            try {
                const fallbackData = {
                    id: 'offline-' + Date.now(),
                    ...checklistData,
                    offline: true,
                    timestamp: new Date().toISOString()
                };
                
                const offlineChecklists = JSON.parse(localStorage.getItem('offline_checklists') || '[]');
                offlineChecklists.push(fallbackData);
                localStorage.setItem('offline_checklists', JSON.stringify(offlineChecklists));
                
                console.log('📱 Checklist guardado offline para sincronización posterior');
                return fallbackData;
            } catch (fallbackError) {
                console.error('❌ Error en fallback de checklist:', fallbackError);
                throw error;
            }
        }
    },

    /**
     * Obtener registros de instrumentos
     * @param {Object} filtros - Filtros de búsqueda
     * @returns {Promise<Array>} Array de registros
     */
    async getRegistros(filtros = {}) {
        try {
            console.log('📋 Obteniendo registros de instrumentos desde Firebase...');
            
            // Verificar si Firebase está disponible
            if (!db) {
                throw new Error('Firebase no está inicializado');
            }
            
            const registroInstrumentosCollection = collection(db, 'registro_instrumentos');
            let q = registroInstrumentosCollection;

            // Aplicar filtros si existen
            if (filtros.usuarioId) {
                q = query(q, where('usuarioId', '==', filtros.usuarioId));
            }
            if (filtros.moduloId) {
                q = query(q, where('moduloId', '==', filtros.moduloId));
            }
            if (filtros.fecha) {
                const fechaInicio = new Date(filtros.fecha + 'T00:00:00');
                const fechaFin = new Date(filtros.fecha + 'T23:59:59');
                q = query(q, where('timestamp', '>=', fechaInicio), where('timestamp', '<=', fechaFin));
            }

            console.log('🔍 Ejecutando consulta a Firestore...');
            const snapshot = await getDocs(q);
            
            const registros = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp)
            }));

            console.log(`✅ ${registros.length} registros de instrumentos obtenidos desde Firebase`);
            return registros;

        } catch (error) {
            console.error('❌ Error obteniendo registros de instrumentos:', error);
            console.log('🔄 Intentando fallback a localStorage...');
            
            // Fallback a localStorage
            const offlineChecklists = JSON.parse(localStorage.getItem('offline_checklists') || '[]');
            console.log(`📦 ${offlineChecklists.length} registros obtenidos desde localStorage`);
            return offlineChecklists;
        }
    },

    /**
     * Obtener el último registro de checklist de un usuario para un módulo específico
     * @param {string} usuarioId - ID del usuario
     * @param {string} moduloId - ID del módulo
     * @returns {Promise<Object|null>} Último registro o null
     */
    async getLastChecklistRecord(usuarioId, moduloId) {
        try {
            console.log('📋 Obteniendo último registro de checklist...');
            
            const registroInstrumentosCollection = collection(db, 'registro_instrumentos');
            const q = query(
                registroInstrumentosCollection,
                where('usuarioId', '==', usuarioId),
                where('moduloId', '==', moduloId),
                orderBy('timestamp', 'desc'),
                limit(1)
            );

            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                const data = {
                    id: doc.id,
                    ...doc.data(),
                    timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp)
                };
                
                console.log('✅ Último registro encontrado:', data.id);
                return data;
            }

            console.log('ℹ️ No se encontró registro previo');
            return null;

        } catch (error) {
            console.error('❌ Error obteniendo último registro:', error);
            
            // Fallback a localStorage
            const offlineChecklists = JSON.parse(localStorage.getItem('offline_checklists') || '[]');
            const userModuleChecklists = offlineChecklists.filter(item => 
                item.usuarioId === usuarioId && item.moduloId === moduloId
            );
            
            if (userModuleChecklists.length > 0) {
                // Ordenar por timestamp y tomar el más reciente
                userModuleChecklists.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                return userModuleChecklists[0];
            }
            
            return null;
        }
    }
};

// --- MODELO DE OBSERVACIONES Y REPORTES ---
export const observacionesModel = {
    /**
     * Guardar observación/reporte en Firebase
     * @param {Object} observacionData - Datos de la observación
     * @returns {Promise<Object|null>} Observación guardada o null
     */
    async saveObservacion(observacionData) {
        try {
            console.log('💾 Guardando observación en Firebase...');
            
            const currentUser = authModel.getCurrentUser();
            if (!currentUser) {
                throw new Error('Usuario no autenticado');
            }

            const observacion = {
                usuarioId: currentUser.uid,
                usuarioNombre: currentUser.nombre,
                usuarioMatricula: currentUser.matricula,
                moduloId: observacionData.moduloId,
                moduloNombre: observacionData.moduloNombre,
                ubicacion: observacionData.ubicacion,
                descripcion: observacionData.descripcion,
                prioridad: observacionData.prioridad,
                categoria: observacionData.categoria || 'general',
                estado: 'pendiente',
                fecha: new Date().toISOString(),
                timestamp: serverTimestamp(),
                tipo: 'observacion_reporte'
            };

            const observacionesCollection = collection(db, 'observaciones_reportes');
            const docRef = await addDoc(observacionesCollection, observacion);

            console.log('✅ Observación guardada en Firebase con ID:', docRef.id);
            return { id: docRef.id, ...observacion };

        } catch (error) {
            console.error('❌ Error guardando observación en Firebase:', error);
            
            // Fallback a localStorage
            try {
                const fallbackData = {
                    id: 'offline-' + Date.now(),
                    ...observacionData,
                    offline: true,
                    timestamp: new Date().toISOString(),
                    estado: 'pendiente'
                };
                
                const offlineObservaciones = JSON.parse(localStorage.getItem('offline_observaciones') || '[]');
                offlineObservaciones.push(fallbackData);
                localStorage.setItem('offline_observaciones', JSON.stringify(offlineObservaciones));
                
                console.log('📱 Observación guardada offline para sincronización posterior');
                return fallbackData;
            } catch (fallbackError) {
                console.error('❌ Error en fallback de observación:', fallbackError);
                throw error;
            }
        }
    },

    /**
     * Obtener observaciones/reportes
     * @param {Object} filtros - Filtros de búsqueda
     * @returns {Promise<Array>} Array de observaciones
     */
    async getObservaciones(filtros = {}) {
        try {
            console.log('📋 Obteniendo observaciones desde Firebase...');
            
            const observacionesCollection = collection(db, 'observaciones_reportes');
            let q = observacionesCollection;

            // Aplicar filtros si existen
            if (filtros.usuarioId) {
                q = query(q, where('usuarioId', '==', filtros.usuarioId));
            }
            if (filtros.moduloId) {
                q = query(q, where('moduloId', '==', filtros.moduloId));
            }
            if (filtros.estado) {
                q = query(q, where('estado', '==', filtros.estado));
            }
            if (filtros.prioridad) {
                q = query(q, where('prioridad', '==', filtros.prioridad));
            }

            const snapshot = await getDocs(q);
            const observaciones = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp)
            }));

            console.log(`✅ ${observaciones.length} observaciones obtenidas desde Firebase`);
            return observaciones;

        } catch (error) {
            console.error('❌ Error obteniendo observaciones:', error);
            
            // Fallback a localStorage
            const offlineObservaciones = JSON.parse(localStorage.getItem('offline_observaciones') || '[]');
            return offlineObservaciones;
        }
    },

    /**
     * Actualizar estado de observación
     * @param {string} observacionId - ID de la observación
     * @param {string} nuevoEstado - Nuevo estado
     * @param {string} comentarios - Comentarios opcionales
     * @returns {Promise<boolean>} True si se actualizó correctamente
     */
    async updateEstado(observacionId, nuevoEstado, comentarios = '') {
        try {
            console.log(`🔄 Actualizando estado de observación ${observacionId} a ${nuevoEstado}...`);
            
            const observacionRef = doc(db, 'observaciones_reportes', observacionId);
            const updateData = {
                estado: nuevoEstado,
                fechaResolucion: nuevoEstado === 'resuelto' ? new Date().toISOString() : null,
                comentariosResolucion: comentarios,
                timestampActualizacion: serverTimestamp()
            };

            await updateDoc(observacionRef, updateData);
            console.log('✅ Estado de observación actualizado en Firebase');
            return true;

        } catch (error) {
            console.error('❌ Error actualizando estado de observación:', error);
            return false;
        }
    }
};

// Inicializar listener de cambios de autenticación
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('Usuario autenticado:', user.email);
    } else {
        console.log('Usuario no autenticado');
        sessionStorage.removeItem(CURRENT_USER_KEY);
    }
});