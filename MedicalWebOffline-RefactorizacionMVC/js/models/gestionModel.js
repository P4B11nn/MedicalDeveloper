// js/models/gestionModel.js - MIGRADO A FIREBASE
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
    serverTimestamp,
    setDoc,
    GeoPoint
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// --- CONSTANTES ---
const GRUPOS_COLLECTION = "grupos";
const MODULOS_COLLECTION = "modulos";

// --- COLECCIONES DE FIRESTORE ---
const gruposCollection = collection(db, GRUPOS_COLLECTION);
const modulosCollection = collection(db, MODULOS_COLLECTION);

// Inicializar datos de ejemplo si es necesario
async function inicializarDatos() {
    try {
        // Verificar si ya existen datos
        const gruposSnapshot = await getDocs(gruposCollection);
        if (gruposSnapshot.empty) {
            console.log('Inicializando datos de ejemplo para grupos...');
            await setDoc(doc(gruposCollection, 'G001'), {
                nombre: "Grupo Alpha",
                turno: "Matutino", 
                horario: "08:00 - 16:00",
                miembros: ["pract"],
                createdAt: serverTimestamp(),
                status: 'activo'
            });
        }

        const modulosSnapshot = await getDocs(modulosCollection);
        if (modulosSnapshot.empty) {
            console.log('Inicializando datos de ejemplo para módulos...');
            await setDoc(doc(modulosCollection, 'M01'), {
                nombre: "Módulo Medicina General",
                grupoAsignadoId: "G001",
                localizacion: new GeoPoint(25.686613, -100.316113), // Monterrey, México (ejemplo)
                horario: {
                    lunes: { inicio: '08:00', fin: '17:00' },
                    martes: { inicio: '08:00', fin: '17:00' },
                    miercoles: { inicio: '08:00', fin: '17:00' },
                    jueves: { inicio: '08:00', fin: '17:00' },
                    viernes: { inicio: '08:00', fin: '17:00' },
                    sabado: { inicio: '08:00', fin: '12:00' },
                    domingo: { activo: false }
                },
                activo: true,
                createdAt: serverTimestamp()
            });
            await setDoc(doc(modulosCollection, 'M02'), {
                nombre: "Módulo Especialidades", 
                grupoAsignadoId: null,
                localizacion: new GeoPoint(25.687613, -100.315113), // Ubicación cercana (ejemplo)
                horario: {
                    lunes: { inicio: '09:00', fin: '18:00' },
                    martes: { inicio: '09:00', fin: '18:00' },
                    miercoles: { inicio: '09:00', fin: '18:00' },
                    jueves: { inicio: '09:00', fin: '18:00' },
                    viernes: { inicio: '09:00', fin: '16:00' },
                    sabado: { activo: false },
                    domingo: { activo: false }
                },
                activo: false,
                createdAt: serverTimestamp()
            });
        }
    } catch (error) {
        console.error('Error inicializando datos:', error);
    }
}

// TEMPORALMENTE DESHABILITADO - Solo para colección usuarios
// inicializarDatos();

export const gestionModel = {
    // --- Lógica de Grupos ---
    
    /**
     * Obtiene todos los grupos desde Firestore
     * @returns {Promise<Array>} Array de grupos
     */
    getGrupos: async () => {
        try {
            const snapshot = await getDocs(gruposCollection);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error obteniendo grupos:', error);
            // Si hay error de conectividad, Firestore maneja el cache automáticamente
            if (error.code === 'unavailable') {
                console.log('Usando datos en cache offline para grupos');
            }
            throw new Error('No se pudieron obtener los grupos: ' + error.message);
        }
    },

    /**
     * Obtiene un grupo por ID
     * @param {string} id - ID del grupo
     * @returns {Promise<Object|null>} El grupo o null si no existe
     */
    getGrupoById: async (id) => {
        try {
            const docRef = doc(gruposCollection, id);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            } else {
                return null;
            }
        } catch (error) {
            console.error('Error obteniendo grupo por ID:', error);
            throw new Error('No se pudo obtener el grupo: ' + error.message);
        }
    },
    
    /**
     * Crea un nuevo grupo
     * @param {Object} grupo - Datos del grupo a crear
     * @returns {Promise<Object>} El grupo creado con su ID
     */
    createGrupo: async (grupo) => {
        try {
            // Validar campos requeridos
            if (!grupo.nombre || !grupo.turno || !grupo.horario) {
                throw new Error('Nombre, turno y horario son campos obligatorios');
            }
            
            // Generar ID único (formato G001, G002, etc.)
            const grupos = await gestionModel.getGrupos();
            const lastId = grupos.length > 0 
                ? Math.max(...grupos.map(g => parseInt(g.id.replace('G', '')))) 
                : 0;
            const newId = `G${String(lastId + 1).padStart(3, '0')}`;
            
            // Crear grupo con valores por defecto
            const newGrupo = {
                nombre: grupo.nombre,
                turno: grupo.turno,
                horario: grupo.horario,
                miembros: grupo.miembros || [],
                createdAt: serverTimestamp(),
                status: 'activo'
            };
            
            // Guardar en Firestore con ID personalizado
            await setDoc(doc(gruposCollection, newId), newGrupo);
            
            return { id: newId, ...newGrupo };
        } catch (error) {
            console.error('Error creando grupo:', error);
            if (error.code === 'unavailable') {
                console.log('Grupo será creado cuando se restablezca la conexión');
            }
            throw new Error('No se pudo crear el grupo: ' + error.message);
        }
    },
    
    /**
     * Actualiza un grupo existente
     * @param {string} id - ID del grupo a actualizar
     * @param {Object} datosActualizados - Nuevos datos del grupo
     * @returns {Promise<boolean>} true si la actualización fue exitosa
     */
    updateGrupo: async (id, datosActualizados) => {
        try {
            // Validar campos requeridos
            if (datosActualizados.nombre === '' || 
                datosActualizados.turno === '' || 
                datosActualizados.horario === '') {
                throw new Error('Nombre, turno y horario son campos obligatorios');
            }
            
            const docRef = doc(gruposCollection, id);
            
            // Verificar que el documento existe
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) {
                throw new Error(`Grupo con ID ${id} no encontrado`);
            }
            
            // Actualizar documento
            await updateDoc(docRef, {
                ...datosActualizados,
                updatedAt: serverTimestamp()
            });
            
            return true;
        } catch (error) {
            console.error('Error actualizando grupo:', error);
            if (error.code === 'unavailable') {
                console.log('Actualización será aplicada cuando se restablezca la conexión');
            }
            throw new Error('No se pudo actualizar el grupo: ' + error.message);
        }
    },
    
    /**
     * Elimina un grupo
     * @param {string} id - ID del grupo a eliminar
     * @returns {Promise<boolean>} true si la eliminación fue exitosa
     */
    deleteGrupo: async (id) => {
        try {
            const docRef = doc(gruposCollection, id);
            
            // Verificar que el documento existe
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) {
                throw new Error(`Grupo con ID ${id} no encontrado`);
            }
            
            // Verificar si hay módulos asociados a este grupo
            const q = query(modulosCollection, where("grupoAsignadoId", "==", id));
            const modulosSnapshot = await getDocs(q);
            
            if (!modulosSnapshot.empty) {
                // Actualizar módulos que usan este grupo
                const updatePromises = modulosSnapshot.docs.map(moduloDoc => 
                    updateDoc(moduloDoc.ref, { 
                        grupoAsignadoId: null,
                        updatedAt: serverTimestamp()
                    })
                );
                await Promise.all(updatePromises);
                console.warn(`Se han actualizado ${modulosSnapshot.size} módulos que usaban este grupo`);
            }
            
            // Eliminar grupo
            await deleteDoc(docRef);
            
            return true;
        } catch (error) {
            console.error('Error eliminando grupo:', error);
            if (error.code === 'unavailable') {
                console.log('Eliminación será aplicada cuando se restablezca la conexión');
            }
            throw new Error('No se pudo eliminar el grupo: ' + error.message);
        }
    },
    
    /**
     * Asigna un usuario a un grupo
     * @param {string} grupoId - ID del grupo
     * @param {string} usuarioId - ID del usuario
     * @returns {Promise<boolean>} true si la asignación fue exitosa
     */
    asignarUsuarioAGrupo: async (grupoId, usuarioId) => {
        try {
            const docRef = doc(gruposCollection, grupoId);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                throw new Error(`Grupo con ID ${grupoId} no encontrado`);
            }
            
            const grupoData = docSnap.data();
            const miembros = grupoData.miembros || [];
            
            // Verificar si el usuario ya está asignado
            if (!miembros.includes(usuarioId)) {
                miembros.push(usuarioId);
                await updateDoc(docRef, { 
                    miembros: miembros,
                    updatedAt: serverTimestamp()
                });
            }
            
            return true;
        } catch (error) {
            console.error('Error asignando usuario a grupo:', error);
            throw new Error('No se pudo asignar el usuario al grupo: ' + error.message);
        }
    },
    
    /**
     * Quita un usuario de un grupo
     * @param {string} grupoId - ID del grupo
     * @param {string} usuarioId - ID del usuario
     * @returns {Promise<boolean>} true si la eliminación fue exitosa
     */
    quitarUsuarioDeGrupo: async (grupoId, usuarioId) => {
        try {
            const docRef = doc(gruposCollection, grupoId);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                throw new Error(`Grupo con ID ${grupoId} no encontrado`);
            }
            
            const grupoData = docSnap.data();
            const miembros = grupoData.miembros || [];
            
            // Quitar el usuario del grupo
            const nuevosMiembros = miembros.filter(id => id !== usuarioId);
            await updateDoc(docRef, { 
                miembros: nuevosMiembros,
                updatedAt: serverTimestamp()
            });
            
            return true;
        } catch (error) {
            console.error('Error quitando usuario de grupo:', error);
            throw new Error('No se pudo quitar el usuario del grupo: ' + error.message);
        }
    },

    // --- Lógica de Módulos ---
    
    /**
     * Obtiene todos los módulos desde Firestore
     * @returns {Promise<Array>} Array de módulos
     */
    getModulos: async () => {
        try {
            const snapshot = await getDocs(modulosCollection);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error obteniendo módulos:', error);
            if (error.code === 'unavailable') {
                console.log('Usando datos en cache offline para módulos');
            }
            throw new Error('No se pudieron obtener los módulos: ' + error.message);
        }
    },

    /**
     * Obtiene un módulo por ID
     * @param {string} id - ID del módulo
     * @returns {Promise<Object|null>} El módulo o null si no existe
     */
    getModuloById: async (id) => {
        try {
            const docRef = doc(modulosCollection, id);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            } else {
                return null;
            }
        } catch (error) {
            console.error('Error obteniendo módulo por ID:', error);
            throw new Error('No se pudo obtener el módulo: ' + error.message);
        }
    },
    
    /**
     * Crea un nuevo módulo
     * @param {Object} modulo - Datos del módulo a crear
     * @returns {Promise<Object>} El módulo creado con su ID
     */
    createModulo: async (modulo) => {
        try {
            // Validar campos requeridos
            if (!modulo.nombre || !modulo.localizacion) {
                throw new Error('Nombre y localización son campos obligatorios');
            }
            
            // Validar que la localización tenga lat y lng
            if (!modulo.localizacion.lat || !modulo.localizacion.lng) {
                throw new Error('La localización debe incluir latitud y longitud');
            }
            
            // Generar ID único (formato M01, M02, etc.)
            const modulos = await gestionModel.getModulos();
            const lastId = modulos.length > 0 
                ? Math.max(...modulos.map(m => parseInt(m.id.replace('M', '')))) 
                : 0;
            const newId = `M${String(lastId + 1).padStart(2, '0')}`;
            
            // Crear módulo con valores por defecto
            console.log('Creando GeoPoint con:', modulo.localizacion);
            const newModulo = {
                nombre: modulo.nombre,
                localizacion: new GeoPoint(modulo.localizacion.lat, modulo.localizacion.lng),
                horario: modulo.horario || {
                    lunes: { inicio: '08:00', fin: '17:00' },
                    martes: { inicio: '08:00', fin: '17:00' },
                    miercoles: { inicio: '08:00', fin: '17:00' },
                    jueves: { inicio: '08:00', fin: '17:00' },
                    viernes: { inicio: '08:00', fin: '17:00' },
                    sabado: { inicio: '08:00', fin: '12:00' },
                    domingo: { activo: false }
                },
                activo: modulo.activo !== undefined ? modulo.activo : true,
                grupoAsignadoId: modulo.grupoAsignadoId || null,
                createdAt: serverTimestamp()
            };
            
            // Guardar en Firestore con ID personalizado
            await setDoc(doc(modulosCollection, newId), newModulo);
            
            return { id: newId, ...newModulo };
        } catch (error) {
            console.error('Error creando módulo:', error);
            if (error.code === 'unavailable') {
                console.log('Módulo será creado cuando se restablezca la conexión');
            }
            throw new Error('No se pudo crear el módulo: ' + error.message);
        }
    },
    
    /**
     * Actualiza un módulo existente
     * @param {string} id - ID del módulo a actualizar
     * @param {Object} datosActualizados - Nuevos datos del módulo
     * @returns {Promise<boolean>} true si la actualización fue exitosa
     */
    updateModulo: async (id, datosActualizados) => {
        try {
            // Validar campos requeridos si están presentes
            if (datosActualizados.nombre === '' || datosActualizados.ubicacion === '') {
                throw new Error('Nombre y ubicación no pueden estar vacíos');
            }
            
            const docRef = doc(modulosCollection, id);
            
            // Verificar que el documento existe
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) {
                throw new Error(`Módulo con ID ${id} no encontrado`);
            }
            
            // Actualizar documento
            await updateDoc(docRef, {
                ...datosActualizados,
                updatedAt: serverTimestamp()
            });
            
            return true;
        } catch (error) {
            console.error('Error actualizando módulo:', error);
            if (error.code === 'unavailable') {
                console.log('Actualización será aplicada cuando se restablezca la conexión');
            }
            throw new Error('No se pudo actualizar el módulo: ' + error.message);
        }
    },
    
    /**
     * Elimina un módulo
     * @param {string} id - ID del módulo a eliminar
     * @returns {Promise<boolean>} true si la eliminación fue exitosa
     */
    deleteModulo: async (id) => {
        try {
            const docRef = doc(modulosCollection, id);
            
            // Verificar que el documento existe
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) {
                throw new Error(`Módulo con ID ${id} no encontrado`);
            }
            
            // Eliminar módulo
            await deleteDoc(docRef);
            
            return true;
        } catch (error) {
            console.error('Error eliminando módulo:', error);
            if (error.code === 'unavailable') {
                console.log('Eliminación será aplicada cuando se restablezca la conexión');
            }
            throw new Error('No se pudo eliminar el módulo: ' + error.message);
        }
    },
    
    /**
     * Asigna un grupo a un módulo
     * @param {string} moduloId - ID del módulo
     * @param {string} grupoId - ID del grupo
     * @returns {Promise<boolean>} true si la asignación fue exitosa
     */
    asignarGrupoAModulo: async (moduloId, grupoId) => {
        try {
            // Verificar que exista el módulo
            const modulo = await gestionModel.getModuloById(moduloId);
            if (!modulo) {
                throw new Error(`Módulo con ID ${moduloId} no encontrado`);
            }
            
            // Verificar que exista el grupo (si no es null)
            if (grupoId !== null) {
                const grupo = await gestionModel.getGrupoById(grupoId);
                if (!grupo) {
                    throw new Error(`Grupo con ID ${grupoId} no encontrado`);
                }
            }
            
            // Actualizar la asignación
            return await gestionModel.updateModulo(moduloId, { grupoAsignadoId: grupoId });
            
        } catch (error) {
            console.error('Error asignando grupo a módulo:', error);
            throw new Error('No se pudo asignar el grupo al módulo: ' + error.message);
        }
    }
};