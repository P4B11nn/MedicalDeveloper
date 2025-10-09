// js/models/gestionModel.js
import { authModel } from './storageModel.js';

const GRUPOS_KEY = 'grupos';
const MODULOS_KEY = 'modulos';

// 🔧 CONFIGURACIÓN: Cambiar a true para usar IDs aleatorios
const USE_RANDOM_IDS = false;

/**
 * Genera un ID aleatorio para grupos o módulos
 * @param {string} prefix - Prefijo ('G' para grupos, 'M' para módulos)
 * @returns {string} ID aleatorio único
 */
function generateRandomId(prefix) {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substr(2, 5);
    return `${prefix}_${timestamp}_${randomPart}`;
}

/**
 * Genera un ID secuencial tradicional
 * @param {Array} items - Array de elementos existentes
 * @param {string} prefix - Prefijo ('G' para grupos, 'M' para módulos)
 * @returns {string} ID secuencial
 */
function generateSequentialId(items, prefix) {
    if (prefix === 'G') {
        const lastId = items.length > 0 
            ? Math.max(...items.map(g => {
                const match = g.id.match(/^G(\d+)$/);
                return match ? parseInt(match[1]) : 0;
            })) 
            : 0;
        return `G${String(lastId + 1).padStart(3, '0')}`;
    } else if (prefix === 'M') {
        const lastId = items.length > 0 
            ? Math.max(...items.map(m => {
                const match = m.id.match(/^M(\d+)$/);
                return match ? parseInt(match[1]) : 0;
            })) 
            : 0;
        return `M${String(lastId + 1).padStart(2, '0')}`;
    }
    return `${prefix}001`;
}

/**
 * Genera un ID único (aleatorio o secuencial según configuración)
 * @param {Array} items - Array de elementos existentes
 * @param {string} prefix - Prefijo ('G' para grupos, 'M' para módulos)
 * @returns {string} ID único
 */
function generateUniqueId(items, prefix) {
    if (USE_RANDOM_IDS) {
        let newId;
        do {
            newId = generateRandomId(prefix);
        } while (items.some(item => item.id === newId));
        return newId;
    } else {
        return generateSequentialId(items, prefix);
    }
}

function inicializarDatos() {
    if (!localStorage.getItem(GRUPOS_KEY)) {
        localStorage.setItem(GRUPOS_KEY, JSON.stringify([
            { id: "G001", nombre: "Grupo Alpha", turno: "Matutino", horario: "08:00 - 16:00", miembros: ["pract"] }
        ]));
    }
    if (!localStorage.getItem(MODULOS_KEY)) {
        localStorage.setItem(MODULOS_KEY, JSON.stringify([
            { 
                id: "M01", 
                nombre: "Módulo 1", 
                grupoAsignadoId: "G001", 
                ubicacion: "latitud: 21.1619, longitud: -86.8515, Facultad de Medicina - UAT", 
                latitud: "21.1619",
                longitud: "-86.8515",
                lugar: "Facultad de Medicina - UAT",
                estado: "Activo" 
            },
            { 
                id: "M02", 
                nombre: "Módulo 2", 
                grupoAsignadoId: null, 
                ubicacion: "latitud: 21.1620, longitud: -86.8516, Hospital General", 
                latitud: "21.1620",
                longitud: "-86.8516",
                lugar: "Hospital General",
                estado: "Inactivo" 
            }
        ]));
    }
}
inicializarDatos();

export const gestionModel = {
    // --- Lógica de Grupos ---
    getGrupos: () => JSON.parse(localStorage.getItem(GRUPOS_KEY)) || [],
    getGrupoById: (id) => gestionModel.getGrupos().find(g => g.id === id),
    
    /**
     * Crea un nuevo grupo
     * @param {Object} grupo - Datos del grupo a crear
     * @returns {Object} El grupo creado con su ID
     */
    createGrupo: (grupo) => {
        try {
            const grupos = gestionModel.getGrupos();
            
            // Validar campos requeridos
            if (!grupo.nombre || !grupo.turno || !grupo.horario) {
                throw new Error('Nombre, turno y horario son campos obligatorios');
            }
            
            // Generar ID único (formato configurable)
            const newId = generateUniqueId(grupos, 'G');
            
            // Crear grupo con valores por defecto
            const newGrupo = {
                id: newId,
                nombre: grupo.nombre,
                turno: grupo.turno,
                horario: grupo.horario,
                miembros: grupo.miembros || []
            };
            
            // Guardar en localStorage
            grupos.push(newGrupo);
            localStorage.setItem(GRUPOS_KEY, JSON.stringify(grupos));
            
            return newGrupo;
        } catch (error) {
            console.error('Error al crear grupo:', error);
            return null;
        }
    },
    
    /**
     * Actualiza un grupo existente
     * @param {string} id - ID del grupo a actualizar
     * @param {Object} datosActualizados - Nuevos datos del grupo
     * @returns {boolean} true si la actualización fue exitosa
     */
    updateGrupo: (id, datosActualizados) => {
        try {
            const grupos = gestionModel.getGrupos();
            const grupoIndex = grupos.findIndex(g => g.id === id);
            
            if (grupoIndex === -1) {
                throw new Error(`Grupo con ID ${id} no encontrado`);
            }
            
            // Validar campos requeridos
            if (datosActualizados.nombre === '' || 
                datosActualizados.turno === '' || 
                datosActualizados.horario === '') {
                throw new Error('Nombre, turno y horario son campos obligatorios');
            }
            
            // Actualizar grupo manteniendo el ID y los campos no actualizados
            grupos[grupoIndex] = {
                ...grupos[grupoIndex],
                ...datosActualizados,
                id // Asegurar que el ID no cambie
            };
            
            // Guardar cambios
            localStorage.setItem(GRUPOS_KEY, JSON.stringify(grupos));
            
            return true;
        } catch (error) {
            console.error('Error al actualizar grupo:', error);
            return false;
        }
    },
    
    /**
     * Elimina un grupo
     * @param {string} id - ID del grupo a eliminar
     * @returns {boolean} true si la eliminación fue exitosa
     */
    deleteGrupo: (id) => {
        try {
            let grupos = gestionModel.getGrupos();
            const grupoIndex = grupos.findIndex(g => g.id === id);
            
            if (grupoIndex === -1) {
                throw new Error(`Grupo con ID ${id} no encontrado`);
            }
            
            // Verificar si hay módulos asociados a este grupo
            const modulos = gestionModel.getModulos();
            const modulosAsociados = modulos.filter(m => m.grupoAsignadoId === id);
            
            if (modulosAsociados.length > 0) {
                // Actualizar módulos que usan este grupo
                modulosAsociados.forEach(modulo => {
                    gestionModel.updateModulo(modulo.id, { grupoAsignadoId: null });
                });
                console.warn(`Se han actualizado ${modulosAsociados.length} módulos que usaban este grupo`);
            }
            
            // 🔧 SOLUCIÓN: Desasignar usuarios del grupo eliminado
            const usuarios = authModel.getAllUsers();
            const usuariosAfectados = usuarios.filter(u => u.grupoId === id);
            
            if (usuariosAfectados.length > 0) {
                usuariosAfectados.forEach((usuario) => {
                    const userIndex = usuarios.findIndex(u => u.id === usuario.id);
                    if (userIndex !== -1) {
                        const updatedUser = { ...usuario, grupoId: null };
                        authModel.updateUser(userIndex, updatedUser);
                    }
                });
                console.warn(`Se han desasignado ${usuariosAfectados.length} usuarios del grupo eliminado`);
            }
            
            // Eliminar grupo
            grupos.splice(grupoIndex, 1);
            localStorage.setItem(GRUPOS_KEY, JSON.stringify(grupos));
            
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
     * @returns {boolean} true si la asignación fue exitosa
     */
    asignarUsuarioAGrupo: (grupoId, usuarioId) => {
        try {
            const grupos = gestionModel.getGrupos();
            const grupoIndex = grupos.findIndex(g => g.id === grupoId);
            
            if (grupoIndex === -1) {
                throw new Error(`Grupo con ID ${grupoId} no encontrado`);
            }
            
            // Verificar si el usuario ya está asignado
            if (!grupos[grupoIndex].miembros.includes(usuarioId)) {
                grupos[grupoIndex].miembros.push(usuarioId);
                localStorage.setItem(GRUPOS_KEY, JSON.stringify(grupos));
            }
            
            return true;
        } catch (error) {
            console.error('Error al asignar usuario a grupo:', error);
            return false;
        }
    },
    
    /**
     * Quita un usuario de un grupo
     * @param {string} grupoId - ID del grupo
     * @param {string} usuarioId - ID del usuario
     * @returns {boolean} true si la eliminación fue exitosa
     */
    quitarUsuarioDeGrupo: (grupoId, usuarioId) => {
        try {
            const grupos = gestionModel.getGrupos();
            const grupoIndex = grupos.findIndex(g => g.id === grupoId);
            
            if (grupoIndex === -1) {
                throw new Error(`Grupo con ID ${grupoId} no encontrado`);
            }
            
            // Quitar el usuario del grupo
            grupos[grupoIndex].miembros = grupos[grupoIndex].miembros.filter(id => id !== usuarioId);
            localStorage.setItem(GRUPOS_KEY, JSON.stringify(grupos));
            
            return true;
        } catch (error) {
            console.error('Error al quitar usuario de grupo:', error);
            return false;
        }
    },

    // --- Lógica de Módulos ---
    getModulos: () => JSON.parse(localStorage.getItem(MODULOS_KEY)) || [],
    getModuloById: (id) => gestionModel.getModulos().find(m => m.id === id),
    
    /**
     * Crea un nuevo módulo
     * @param {Object} modulo - Datos del módulo a crear
     * @returns {Object} El módulo creado con su ID
     */
    createModulo: (modulo) => {
        try {
            const modulos = gestionModel.getModulos();
            
            // Validar campos requeridos
            if (!modulo.nombre || !modulo.ubicacion) {
                throw new Error('Nombre, ubicación y horario de atención son campos obligatorios');
            }
            
            // Generar ID único (formato configurable)
            const newId = generateUniqueId(modulos, 'M');
            
            // Crear módulo con valores por defecto
            const newModulo = {
                id: newId,
                nombre: modulo.nombre,
                ubicacion: modulo.ubicacion,
                latitud: modulo.latitud || null,
                longitud: modulo.longitud || null,
                lugar: modulo.lugar || modulo.ubicacion,
                estado: modulo.estado || 'Inactivo',
                grupoAsignadoId: modulo.grupoAsignadoId || null,
                horaInicio: modulo.horaInicio || null,
                horaFin: modulo.horaFin || null,
                diasAtencion: modulo.diasAtencion || []
            };
            
            // Guardar en localStorage
            modulos.push(newModulo);
            localStorage.setItem(MODULOS_KEY, JSON.stringify(modulos));
            
            return newModulo;
        } catch (error) {
            console.error('Error al crear módulo:', error);
            return null;
        }
    },
    
    /**
     * Actualiza un módulo existente
     * @param {string} id - ID del módulo a actualizar
     * @param {Object} datosActualizados - Nuevos datos del módulo
     * @returns {boolean} true si la actualización fue exitosa
     */
    updateModulo: (id, datosActualizados) => {
        try {
            const modulos = gestionModel.getModulos();
            const moduloIndex = modulos.findIndex(m => m.id === id);
            
            if (moduloIndex === -1) {
                throw new Error(`Módulo con ID ${id} no encontrado`);
            }
            
            // Validar campos requeridos si están presentes
            if (datosActualizados.nombre === '' || datosActualizados.ubicacion === '') {
                throw new Error('Nombre y ubicación no pueden estar vacíos');
            }
            
            // Actualizar módulo manteniendo el ID y los campos no actualizados
            modulos[moduloIndex] = {
                ...modulos[moduloIndex],
                ...datosActualizados,
                id // Asegurar que el ID no cambie
            };
            
            // Guardar cambios
            localStorage.setItem(MODULOS_KEY, JSON.stringify(modulos));
            
            return true;
        } catch (error) {
            console.error('Error al actualizar módulo:', error);
            return false;
        }
    },
    
    /**
     * Elimina un módulo
     * @param {string} id - ID del módulo a eliminar
     * @returns {boolean} true si la eliminación fue exitosa
     */
    deleteModulo: (id) => {
        try {
            let modulos = gestionModel.getModulos();
            const moduloIndex = modulos.findIndex(m => m.id === id);
            
            if (moduloIndex === -1) {
                throw new Error(`Módulo con ID ${id} no encontrado`);
            }
            
            // Eliminar módulo
            modulos.splice(moduloIndex, 1);
            localStorage.setItem(MODULOS_KEY, JSON.stringify(modulos));
            
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
     * @returns {boolean} true si la asignación fue exitosa
     */
    asignarGrupoAModulo: (moduloId, grupoId) => {
        try {
            // Verificar que existan tanto el módulo como el grupo
            const modulo = gestionModel.getModuloById(moduloId);
            const grupo = gestionModel.getGrupoById(grupoId);
            
            if (!modulo) {
                throw new Error(`Módulo con ID ${moduloId} no encontrado`);
            }
            
            if (!grupo && grupoId !== null) {
                throw new Error(`Grupo con ID ${grupoId} no encontrado`);
            }
            
            // Actualizar la asignación
            return gestionModel.updateModulo(moduloId, { grupoAsignadoId: grupoId });
            
        } catch (error) {
            console.error('Error al asignar grupo a módulo:', error);
            return false;
        }
    }
};