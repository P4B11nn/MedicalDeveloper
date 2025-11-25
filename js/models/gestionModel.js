// js/models/gestionModel.js
import { db } from './firebaseConfig.js';
import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, where, GeoPoint } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';
import { authModel } from './storageModel.js';
import eventBus, { EVENT_NAMES } from '../utils/eventBus.js';
// import globalOfflineSync - ELIMINADO: Solo funcionalidad offline de pacientes

// Colecciones de Firebase
const MODULOS_COLLECTION = 'modulos';
const GRUPOS_COLLECTION = 'grupos';

export const gestionModel = {
    // --- Lógica de Grupos ---

    /**
     * Obtiene todos los grupos desde Firebase
     * @returns {Promise<Array>} Array de grupos
     */
    getGrupos: async () => {
        try {
            const gruposRef = collection(db, GRUPOS_COLLECTION);
            const snapshot = await getDocs(gruposRef);
            const grupos = [];
            
            snapshot.forEach(doc => {
                grupos.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return grupos;
        } catch (error) {
            console.error('Error al obtener grupos:', error);
            return [];
        }
    },

    /**
     * Obtiene un grupo por su ID desde Firebase
     * @param {string} id - ID del grupo
     * @returns {Promise<Object|null>} El grupo encontrado o null
     */
    getGrupoById: async (id) => {
        try {
            const grupoRef = doc(db, GRUPOS_COLLECTION, id);
            const grupoSnap = await getDoc(grupoRef);
            
            if (grupoSnap.exists()) {
                return {
                    id: grupoSnap.id,
                    ...grupoSnap.data()
                };
            }
            
            return null;
        } catch (error) {
            console.error('Error al obtener grupo por ID:', error);
            return null;
        }
    },
    
    /**
     * Crea un nuevo grupo en Firebase
     * @param {Object} grupo - Datos del grupo a crear
     * @returns {Promise<Object>} El grupo creado con su ID
     */
    createGrupo: async (grupo) => {
        try {
            // Validar campos requeridos
            if (!grupo.nombre || !grupo.turno || !grupo.horario) {
                throw new Error('Nombre, turno y horario son campos obligatorios');
            }

            // Preparar datos del grupo
            const grupoData = {
                nombre: grupo.nombre,
                turno: grupo.turno,
                horario: grupo.horario,
                miembros: [], // Array de IDs de usuarios asignados
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Verificar conexión
            const isOnline = navigator.onLine && (!window.connectionIndicator || window.connectionIndicator.isOnline !== false);

            if (isOnline) {
                // Modo online: guardar en Firebase
                const docRef = await addDoc(collection(db, GRUPOS_COLLECTION), {
                    ...grupoData,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });

                const newGrupo = {
                    id: docRef.id,
                    ...grupoData
                };

                // Emitir evento de grupo creado
                eventBus.emit(EVENT_NAMES.GROUP_CREATED, { group: newGrupo });
                console.log('✅ Grupo creado online:', newGrupo.id);
                return newGrupo;
            } else {
                // Modo offline: usar el servicio global de sincronización
                console.log('📱 Sin conexión - Guardando grupo offline');
                // const offlineGrupo = await globalOfflineSync.saveOfflineData('gestion', grupoData); // ELIMINADO
                
                // Emitir evento de grupo creado
                eventBus.emit(EVENT_NAMES.GROUP_CREATED, { group: offlineGrupo });
                console.log('✅ Grupo guardado offline:', offlineGrupo.id);
                return offlineGrupo;
            }
        } catch (error) {
            console.error('❌ Error al crear grupo:', error);
            
            // Si falla online, intentar guardar offline como respaldo
            if (navigator.onLine) {
                console.log('🔄 Error online - Intentando guardar grupo offline como respaldo');
                try {
                    const grupoData = {
                        nombre: grupo.nombre,
                        turno: grupo.turno,
                        horario: grupo.horario,
                        miembros: [],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                    throw error; // Sin funcionalidad offline para gestión
                } catch (offlineError) {
                    console.error('❌ Error guardando grupo offline como respaldo:', offlineError);
                }
            }
            return null;
        }
    },
    
    /**
     * Actualiza un grupo existente en Firebase
     * @param {string} id - ID del grupo a actualizar
     * @param {Object} datosActualizados - Nuevos datos del grupo
     * @returns {Promise<boolean>} true si la actualización fue exitosa
     */
    updateGrupo: async (id, datosActualizados) => {
        try {
            // Verificar que el grupo existe
            const grupoRef = doc(db, GRUPOS_COLLECTION, id);
            const grupoSnap = await getDoc(grupoRef);
            
            if (!grupoSnap.exists()) {
                throw new Error(`Grupo con ID ${id} no encontrado`);
            }

            // Validar campos requeridos
            if (datosActualizados.nombre === '' || 
                datosActualizados.turno === '' || 
                datosActualizados.horario === '') {
                throw new Error('Nombre, turno y horario son campos obligatorios');
            }

            // Preparar datos de actualización
            const updateData = {
                ...datosActualizados,
                updatedAt: new Date()
            };

            // Actualizar en Firebase
            await updateDoc(grupoRef, updateData);

            // Emitir evento de grupo actualizado
            const updatedGrupo = {
                id: id,
                ...grupoSnap.data(),
                ...updateData
            };
            eventBus.emit(EVENT_NAMES.GROUP_UPDATED, { group: updatedGrupo });

            return true;
        } catch (error) {
            console.error('Error al actualizar grupo:', error);
            return false;
        }
    },
    
    /**
     * Elimina un grupo de Firebase
     * @param {string} id - ID del grupo a eliminar
     * @returns {Promise<boolean>} true si la eliminación fue exitosa
     */
    deleteGrupo: async (id) => {
        try {
            // Verificar que el grupo existe
            const grupoRef = doc(db, GRUPOS_COLLECTION, id);
            const grupoSnap = await getDoc(grupoRef);
            
            if (!grupoSnap.exists()) {
                throw new Error(`Grupo con ID ${id} no encontrado`);
            }

            // Verificar si hay módulos asociados a este grupo
            const modulosRef = collection(db, MODULOS_COLLECTION);
            const modulosQuery = query(modulosRef, where('grupoAsignadoId', '==', id));
            const modulosSnapshot = await getDocs(modulosQuery);
            
            if (!modulosSnapshot.empty) {
                // Actualizar módulos que usan este grupo
                const updatePromises = [];
                modulosSnapshot.forEach(moduloDoc => {
                    const moduloRef = doc(db, MODULOS_COLLECTION, moduloDoc.id);
                    updatePromises.push(updateDoc(moduloRef, { 
                        grupoAsignadoId: null,
                        updatedAt: new Date()
                    }));
                });
                await Promise.all(updatePromises);
                console.warn(`Se han actualizado ${modulosSnapshot.size} módulos que usaban este grupo`);
            }

            // Desasignar usuarios del grupo eliminado
            const usuarios = await authModel.getAllUsers();
            const usuariosAfectados = usuarios.filter(u => u.grupoId === id);
            
            if (usuariosAfectados.length > 0) {
                for (const usuario of usuariosAfectados) {
                    const updatedUser = { ...usuario, grupoId: null };
                    await authModel.updateUser(usuario.uid, updatedUser);
                }
                console.warn(`Se han desasignado ${usuariosAfectados.length} usuarios del grupo eliminado`);
            }

            // Eliminar grupo de Firebase
            await deleteDoc(grupoRef);

            // Emitir evento de grupo eliminado
            eventBus.emit(EVENT_NAMES.GROUP_DELETED, { id: id });

            return true;
        } catch (error) {
            console.error('Error al eliminar grupo:', error);
            return false;
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
            // Verificar que el grupo existe
            const grupo = await gestionModel.getGrupoById(grupoId);
            if (!grupo) {
                throw new Error(`Grupo con ID ${grupoId} no encontrado`);
            }

            // Obtener todos los usuarios
            const usuarios = await authModel.getAllUsers();
            const usuarioIndex = usuarios.findIndex(u => u.uid === usuarioId);

            if (usuarioIndex === -1) {
                throw new Error(`Usuario con ID ${usuarioId} no encontrado`);
            }

            // Verificar que es un practicante
            if (usuarios[usuarioIndex].rol !== 'practicante') {
                throw new Error('Solo se pueden asignar practicantes a grupos');
            }

            // Asignar el grupo al usuario
            const usuarioActualizado = { ...usuarios[usuarioIndex], grupoId: grupoId };
            const resultado = authModel.updateUser(usuarios[usuarioIndex].uid, usuarioActualizado);

            if (resultado) {
                // Actualizar el array de miembros en el grupo de Firebase
                const grupoRef = doc(db, GRUPOS_COLLECTION, grupoId);
                const currentMiembros = grupo.miembros || [];
                if (!currentMiembros.includes(usuarioId)) {
                    await updateDoc(grupoRef, {
                        miembros: [...currentMiembros, usuarioId],
                        updatedAt: new Date()
                    });
                }

                console.log(`✅ Usuario ${usuarioId} asignado al grupo ${grupoId}`);
            }

            return resultado;
        } catch (error) {
            console.error('Error al asignar usuario a grupo:', error);
            return false;
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
            // Verificar que el grupo existe
            const grupo = await gestionModel.getGrupoById(grupoId);
            if (!grupo) {
                throw new Error(`Grupo con ID ${grupoId} no encontrado`);
            }

            // Obtener todos los usuarios
            const usuarios = await authModel.getAllUsers();
            const usuarioIndex = usuarios.findIndex(u => u.uid === usuarioId);

            if (usuarioIndex === -1) {
                throw new Error(`Usuario con ID ${usuarioId} no encontrado`);
            }

            // Verificar que el usuario está asignado a este grupo
            if (usuarios[usuarioIndex].grupoId !== grupoId) {
                console.warn(`El usuario ${usuarioId} no está asignado al grupo ${grupoId}`);
                return false;
            }

            // Quitar la asignación del grupo (establecer grupoId como null)
            const usuarioActualizado = { ...usuarios[usuarioIndex], grupoId: null };
            const resultado = authModel.updateUser(usuarios[usuarioIndex].uid, usuarioActualizado);

            if (resultado) {
                // Actualizar el array de miembros en el grupo de Firebase
                const grupoRef = doc(db, GRUPOS_COLLECTION, grupoId);
                const currentMiembros = grupo.miembros || [];
                const updatedMiembros = currentMiembros.filter(id => id !== usuarioId);

                await updateDoc(grupoRef, {
                    miembros: updatedMiembros,
                    updatedAt: new Date()
                });

                console.log(`✅ Usuario ${usuarioId} removido del grupo ${grupoId}`);
            }

            return resultado;
        } catch (error) {
            console.error('Error al quitar usuario de grupo:', error);
            return false;
        }
    },    // --- Lógica de Módulos ---

    /**
     * Obtiene todos los módulos desde Firebase
     * @returns {Promise<Array>} Array de módulos
     */
    getModulos: async () => {
        try {
            const modulosRef = collection(db, MODULOS_COLLECTION);
            const snapshot = await getDocs(modulosRef);
            const modulos = [];
            
            snapshot.forEach(doc => {
                const moduloData = doc.data();
                // Migrar estructura antigua a nueva si es necesario
                const moduloMigrado = migrarEstructuraHorario(moduloData);
                
                // Convertir GeoPoint a formato legible para la vista
                const moduloConUbicacion = convertirGeoPointALegible(moduloMigrado);
                
                modulos.push({
                    id: doc.id,
                    ...moduloConUbicacion
                });
            });
            
            return modulos;
        } catch (error) {
            console.error('Error al obtener módulos:', error);
            return [];
        }
    },

    /**
     * Obtiene un módulo por su ID desde Firebase
     * @param {string} id - ID del módulo
     * @returns {Promise<Object|null>} El módulo encontrado o null
     */
    getModuloById: async (id) => {
        try {
            const moduloRef = doc(db, MODULOS_COLLECTION, id);
            const moduloSnap = await getDoc(moduloRef);
            
            if (moduloSnap.exists()) {
                const moduloData = moduloSnap.data();
                // Migrar estructura antigua a nueva si es necesario
                const moduloMigrado = migrarEstructuraHorario(moduloData);
                
                // Convertir GeoPoint a formato legible para la vista
                const moduloConUbicacion = convertirGeoPointALegible(moduloMigrado);
                
                return {
                    id: moduloSnap.id,
                    ...moduloConUbicacion
                };
            }
            
            return null;
        } catch (error) {
            console.error('Error al obtener módulo por ID:', error);
            return null;
        }
    },
    
    /**
     * Crea un nuevo módulo en Firebase
     * @param {Object} modulo - Datos del módulo a crear
     * @returns {Promise<Object>} El módulo creado con su ID
     */
    createModulo: async (modulo) => {
        try {
            // Validar campos requeridos
            if (!modulo.nombre || !modulo.nombreLugar) {
                throw new Error('Nombre y nombre del lugar son campos obligatorios');
            }

            // Asegurar que el nombre sea una cadena de texto
            const nombreModulo = typeof modulo.nombre === 'string' ? 
                modulo.nombre.trim() : 
                String(modulo.nombre || '').trim();

            // Preparar datos del módulo
            const moduloData = {
                nombre: nombreModulo,
                nombreLugar: modulo.nombreLugar,
                // Ubicación como objeto plano para compatibilidad offline
                ubicacion: (modulo.latitud && modulo.longitud) ? 
                    {
                        latitude: parseFloat(modulo.latitud),
                        longitude: parseFloat(modulo.longitud),
                        _type: 'geopoint'
                    } : null,
                estado: modulo.estado || 'Inactivo',
                grupoAsignadoId: modulo.grupoAsignadoId || null,
                // Nueva estructura: horario como mapa por día
                horarioPorDia: modulo.horarioPorDia || {},
                // Mantener compatibilidad con campos antiguos
                horaInicio: modulo.horaInicio || null,
                horaFin: modulo.horaFin || null,
                diasAtencion: modulo.diasAtencion || [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Verificar conexión
            const isOnline = navigator.onLine && (!window.connectionIndicator || window.connectionIndicator.isOnline !== false);

            if (isOnline) {
                // Modo online: convertir ubicación a GeoPoint y guardar en Firebase
                const firestoreData = {
                    ...moduloData,
                    ubicacion: (moduloData.ubicacion) ? 
                        new GeoPoint(moduloData.ubicacion.latitude, moduloData.ubicacion.longitude) : null,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                const docRef = await addDoc(collection(db, MODULOS_COLLECTION), firestoreData);

                const newModulo = {
                    id: docRef.id,
                    ...moduloData
                };

                // Emitir evento de módulo creado
                eventBus.emit(EVENT_NAMES.MODULE_CREATED, { module: newModulo });
                console.log('✅ Módulo creado online:', newModulo.id);
                return newModulo;
            } else {
                // Modo offline: usar el servicio global de sincronización
                console.log('📱 Sin conexión - Guardando módulo offline');
                // const offlineModulo = await globalOfflineSync.saveOfflineData('gestion', moduloData); // ELIMINADO
                
                // Emitir evento de módulo creado
                eventBus.emit(EVENT_NAMES.MODULE_CREATED, { module: offlineModulo });
                console.log('✅ Módulo guardado offline:', offlineModulo.id);
                return offlineModulo;
            }
        } catch (error) {
            console.error('❌ Error al crear módulo:', error);
            
            // Si falla online, intentar guardar offline como respaldo
            if (navigator.onLine) {
                console.log('🔄 Error online - Intentando guardar módulo offline como respaldo');
                try {
                    throw error; // Sin funcionalidad offline para gestión
                } catch (offlineError) {
                    console.error('❌ Error guardando módulo offline como respaldo:', offlineError);
                }
            }
            return null;
        }
    },
    
    /**
     * Actualiza un módulo existente en Firebase
     * @param {string} id - ID del módulo a actualizar
     * @param {Object} datosActualizados - Nuevos datos del módulo
     * @returns {Promise<boolean>} true si la actualización fue exitosa
     */
    updateModulo: async (id, datosActualizados) => {
        try {
            // Verificar que el módulo existe
            const moduloRef = doc(db, MODULOS_COLLECTION, id);
            const moduloSnap = await getDoc(moduloRef);
            
            if (!moduloSnap.exists()) {
                throw new Error(`Módulo con ID ${id} no encontrado`);
            }

            // Validar campos requeridos si están presentes
            if (datosActualizados.nombre === '' || datosActualizados.nombreLugar === '') {
                throw new Error('Nombre y nombre del lugar no pueden estar vacíos');
            }

            // Asegurar que el nombre sea una cadena de texto si se está actualizando
            if (datosActualizados.nombre !== undefined) {
                datosActualizados.nombre = typeof datosActualizados.nombre === 'string' ? 
                    datosActualizados.nombre.trim() : 
                    String(datosActualizados.nombre || '').trim();
            }

            // Preparar datos de actualización con nueva estructura de horario
            const updateData = {
                ...datosActualizados,
                updatedAt: new Date()
            };

            // Si se están actualizando coordenadas, crear GeoPoint
            if (datosActualizados.latitud !== undefined || datosActualizados.longitud !== undefined) {
                const currentData = moduloSnap.data();
                const lat = datosActualizados.latitud !== undefined ? datosActualizados.latitud : 
                           (currentData.ubicacion?.latitude || null);
                const lng = datosActualizados.longitud !== undefined ? datosActualizados.longitud : 
                           (currentData.ubicacion?.longitude || null);
                
                if (lat && lng) {
                    updateData.ubicacion = new GeoPoint(parseFloat(lat), parseFloat(lng));
                } else {
                    updateData.ubicacion = null;
                }
                
                // Remover campos antiguos
                delete updateData.latitud;
                delete updateData.longitud;
            }

            // Si se está actualizando horarioPorDia, asegurar que sea un objeto válido
            if (datosActualizados.horarioPorDia !== undefined) {
                updateData.horarioPorDia = datosActualizados.horarioPorDia || {};
            }

            // Actualizar en Firebase
            await updateDoc(moduloRef, updateData);

            // Emitir evento de módulo actualizado
            const updatedModulo = {
                id: id,
                ...moduloSnap.data(),
                ...updateData
            };
            eventBus.emit(EVENT_NAMES.MODULE_UPDATED, { module: updatedModulo });

            return true;
        } catch (error) {
            console.error('Error al actualizar módulo:', error);
            return false;
        }
    },
    
    /**
     * Elimina un módulo de Firebase
     * @param {string} id - ID del módulo a eliminar
     * @returns {Promise<boolean>} true si la eliminación fue exitosa
     */
    deleteModulo: async (id) => {
        try {
            // Verificar que el módulo existe
            const moduloRef = doc(db, MODULOS_COLLECTION, id);
            const moduloSnap = await getDoc(moduloRef);
            
            if (!moduloSnap.exists()) {
                throw new Error(`Módulo con ID ${id} no encontrado`);
            }

            // Eliminar módulo de Firebase
            await deleteDoc(moduloRef);

            // Emitir evento de módulo eliminado
            eventBus.emit(EVENT_NAMES.MODULE_DELETED, { id: id });

            return true;
        } catch (error) {
            console.error('Error al eliminar módulo:', error);
            return false;
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
            // Verificar que existan tanto el módulo como el grupo
            const modulo = await gestionModel.getModuloById(moduloId);
            const grupo = grupoId ? await gestionModel.getGrupoById(grupoId) : null;

            if (!modulo) {
                throw new Error(`Módulo con ID ${moduloId} no encontrado`);
            }

            if (!grupo && grupoId !== null) {
                throw new Error(`Grupo con ID ${grupoId} no encontrado`);
            }

            // Actualizar la asignación en Firebase
            const resultado = await gestionModel.updateModulo(moduloId, { grupoAsignadoId: grupoId });

            return resultado;
        } catch (error) {
            console.error('Error al asignar grupo a módulo:', error);
            return false;
        }
    }
};

/**
 * Migra la estructura antigua de horario a la nueva estructura horarioPorDia
 * @param {Object} moduloData - Datos del módulo desde Firebase
 * @returns {Object} Datos del módulo con estructura migrada
 */
function migrarEstructuraHorario(moduloData) {
    // Si ya tiene la nueva estructura, devolver como está
    if (moduloData.horarioPorDia && Object.keys(moduloData.horarioPorDia).length > 0) {
        return moduloData;
    }

    // Si tiene la estructura antigua, migrar
    if (moduloData.diasAtencion && moduloData.diasAtencion.length > 0 && 
        moduloData.horaInicio && moduloData.horaFin) {
        
        console.log(`Migrando módulo "${moduloData.nombre}" a nueva estructura de horario`);
        
        const horarioPorDia = {};
        moduloData.diasAtencion.forEach(dia => {
            horarioPorDia[dia] = {
                inicio: moduloData.horaInicio,
                fin: moduloData.horaFin
            };
        });

        // Retornar datos migrados
        return {
            ...moduloData,
            horarioPorDia: horarioPorDia
        };
    }

    // Si no tiene ninguna estructura de horario, devolver como está
    return moduloData;
}

/**
 * Convierte un GeoPoint de Firebase a un formato legible para la vista
 * @param {Object} moduloData - Datos del módulo desde Firebase
 * @returns {Object} Datos del módulo con ubicación legible
 */
function convertirGeoPointALegible(moduloData) {
    const moduloConUbicacion = { ...moduloData };
    
    // Si tiene un GeoPoint, convertirlo a campos separados para la vista
    if (moduloData.ubicacion && typeof moduloData.ubicacion === 'object' && 
        moduloData.ubicacion.latitude !== undefined && moduloData.ubicacion.longitude !== undefined) {
        moduloConUbicacion.latitud = moduloData.ubicacion.latitude;
        moduloConUbicacion.longitud = moduloData.ubicacion.longitude;
    } else {
        moduloConUbicacion.latitud = null;
        moduloConUbicacion.longitud = null;
    }
    
    // Asegurar que tenga nombreLugar (antes era 'lugar')
    if (!moduloConUbicacion.nombreLugar && moduloData.lugar) {
        moduloConUbicacion.nombreLugar = moduloData.lugar;
    }
    
    return moduloConUbicacion;
}