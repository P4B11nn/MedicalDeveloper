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
            
            // Si no es un email (no contiene @), buscar por matrícula
            if (!emailOrMatricula.includes('@')) {
                // Buscar usuario por matrícula para obtener su email
                const q = query(usuariosCollection, where('matricula', '==', emailOrMatricula));
                const snapshot = await getDocs(q);
                
                if (snapshot.empty) {
                    throw new Error('Usuario no encontrado con esa matrícula');
                }
                
                const userDoc = snapshot.docs[0];
                const userData = userDoc.data();
                
                // Usar el correo almacenado en Firestore para autenticar
                if (!userData.correo) {
                    throw new Error('Usuario no tiene correo registrado');
                }
                
                email = userData.correo;
            }
            
            // Autenticar con Firebase Auth usando el email
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;
            
            // Obtener datos adicionales del usuario desde Firestore
            const userDoc = await getDoc(doc(usuariosCollection, firebaseUser.uid));
            
            if (!userDoc.exists()) {
                throw new Error('Datos de usuario no encontrados en Firestore');
            }
            
            const userData = userDoc.data();
            
            // Combinar datos de Firebase Auth y Firestore
            const usuario = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                ...userData
            };
            
            // Guardar en sessionStorage para acceso rápido
            sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(usuario));
            
            // Registrar actividad de login
            await this.registrarActividad({
                accion: 'login',
                descripcion: `Usuario ${userData.nombre} inició sesión`,
                userId: firebaseUser.uid
            });
            
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
            
            // NOTA: Para realmente cambiar la contraseña en Firebase Auth 
            // se necesitaría Firebase Admin SDK en el backend
            // Por ahora, registramos la actividad y retornamos la nueva contraseña
            
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
        // TEMPORALMENTE DESHABILITADO - Solo para colección usuarios
        console.log('📝 Actividad registrada (deshabilitado):', actividad.descripcion);
        return { 
            id: 'temp-' + Date.now(), 
            ...actividad,
            timestamp: new Date().toISOString()
        };
        
        /* CÓDIGO ORIGINAL COMENTADO:
        try {
            const actividadData = {
                accion: actividad.accion,
                descripcion: actividad.descripcion,
                userId: actividad.userId || null,
                timestamp: serverTimestamp(),
                fecha: new Date().toISOString(),
                ip: 'N/A', // Podrías obtener la IP si es necesario
                userAgent: navigator.userAgent
            };
            
            const docRef = await addDoc(actividadesCollection, actividadData);
            
            return { id: docRef.id, ...actividadData };
        } catch (error) {
            console.error('Error registrando actividad:', error);
            // No lanzar error para no interrumpir el flujo principal
            return null;
        }
        */
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

// Inicializar listener de cambios de autenticación
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('Usuario autenticado:', user.email);
    } else {
        console.log('Usuario no autenticado');
        sessionStorage.removeItem(CURRENT_USER_KEY);
    }
});