// js/utils/activityLogger.js
// Sistema centralizado de registro de actividades para Firebase

import { db } from '../models/firebaseConfig.js';
import { authModel } from '../models/storageModel.js';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  limit as firestoreLimit
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import eventBus, { EVENT_NAMES } from './eventBus.js';

// Referencia a la colección de actividades
const actividadesCollection = collection(db, 'registro_actividades');

/**
 * Sistema centralizado de registro de actividades
 */
export const ActivityLogger = {
  
  /**
   * Registra una actividad en Firebase
   * @param {Object} activityData - Datos de la actividad
   * @param {string} activityData.accion - Tipo de acción (login, logout, create, update, delete, etc.)
   * @param {string} activityData.descripcion - Descripción detallada de la actividad
   * @param {string} activityData.modulo - Módulo donde ocurrió la actividad (pacientes, usuarios, reportes, etc.)
   * @param {string} [activityData.recursoId] - ID del recurso afectado (pacienteId, usuarioId, etc.)
   * @param {string} [activityData.recursoTipo] - Tipo de recurso (paciente, usuario, registro_medico, etc.)
   * @param {Object} [activityData.detalles] - Detalles adicionales en formato JSON
   * @returns {Promise<Object|null>} Actividad registrada o null si hay error
   */
  async log(activityData) {
    try {
      const currentUser = authModel.getCurrentUser();
      
      const actividad = {
        // Información de la actividad
        accion: activityData.accion,
        descripcion: activityData.descripcion,
        modulo: activityData.modulo || 'general',
        
        // Información del recurso afectado
        recursoId: activityData.recursoId || null,
        recursoTipo: activityData.recursoTipo || null,
        detalles: activityData.detalles || null,
        
        // Información del usuario
        usuarioId: currentUser?.uid || 'anonimo',
        usuarioNombre: currentUser?.nombre || 'Usuario Anónimo',
        usuarioMatricula: currentUser?.matricula || 'N/A',
        usuarioRol: currentUser?.rol || 'N/A',
        
        // Información temporal y técnica
        timestamp: serverTimestamp(),
        fecha: new Date().toISOString(),
        ip: await this.getClientIP(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        
        // Metadatos del sistema
        sistemaVersion: '1.0.0',
        dispositivo: this.getDeviceType()
      };

      const docRef = await addDoc(actividadesCollection, actividad);
      
      console.log(`📝 Actividad registrada: ${actividad.accion} - ${actividad.descripcion}`);
      
      // Emitir evento para notificar que se registró una actividad
      eventBus.emit(EVENT_NAMES.ACTIVITY_LOGGED, {
        id: docRef.id,
        ...actividad,
        timestamp: new Date() // Convertir para el evento
      });
      
      return { id: docRef.id, ...actividad };
      
    } catch (error) {
      console.error('Error registrando actividad:', error);
      
      // Fallback: guardar en localStorage si Firebase falla
      try {
        const fallbackActivity = {
          id: 'offline-' + Date.now(),
          ...activityData,
          timestamp: new Date().toISOString(),
          offline: true
        };
        
        const offlineActivities = JSON.parse(localStorage.getItem('offline_activities') || '[]');
        offlineActivities.push(fallbackActivity);
        localStorage.setItem('offline_activities', JSON.stringify(offlineActivities));
        
        console.log('💾 Actividad guardada offline para sincronización posterior');
        return fallbackActivity;
        
      } catch (fallbackError) {
        console.error('Error en fallback de actividad:', fallbackError);
        return null;
      }
    }
  },

  /**
   * Obtiene actividades con filtros
   * @param {Object} filtros - Filtros de búsqueda
   * @param {string} [filtros.fechaInicio] - Fecha de inicio (ISO string)
   * @param {string} [filtros.fechaFin] - Fecha de fin (ISO string)
   * @param {string} [filtros.usuarioId] - ID del usuario
   * @param {string} [filtros.usuarioNombre] - Nombre del usuario
   * @param {string} [filtros.accion] - Tipo de acción
   * @param {string} [filtros.modulo] - Módulo específico
   * @param {number} [filtros.limit] - Límite de resultados (default: 100)
   * @returns {Promise<Array>} Array de actividades
   */
  async getActivities(filtros = {}) {
    try {
      console.log('🔍 ActivityLogger.getActivities con filtros:', filtros);
      
      let q = actividadesCollection;
      const conditions = [];
      
      // Convertir fechas a formato Timestamp para Firebase
      if (filtros.fechaInicio) {
        const fechaInicio = new Date(filtros.fechaInicio + 'T00:00:00');
        conditions.push(where('timestamp', '>=', fechaInicio));
        console.log('📅 Filtro fecha inicio:', fechaInicio);
      }
      
      if (filtros.fechaFin) {
        const fechaFin = new Date(filtros.fechaFin + 'T23:59:59');
        conditions.push(where('timestamp', '<=', fechaFin));
        console.log('📅 Filtro fecha fin:', fechaFin);
      }
      
      if (filtros.usuarioId) {
        conditions.push(where('usuarioId', '==', filtros.usuarioId));
        console.log('👤 Filtro usuario ID:', filtros.usuarioId);
      }
      
      if (filtros.usuarioNombre) {
        conditions.push(where('usuarioNombre', '==', filtros.usuarioNombre));
        console.log('👤 Filtro usuario nombre:', filtros.usuarioNombre);
      }
      
      if (filtros.accion) {
        conditions.push(where('accion', '==', filtros.accion));
        console.log('⚡ Filtro acción:', filtros.accion);
      }
      
      if (filtros.modulo) {
        conditions.push(where('modulo', '==', filtros.modulo));
        console.log('📦 Filtro módulo:', filtros.modulo);
      }

      // Construir query con condiciones
      if (conditions.length > 0) {
        q = query(q, ...conditions, orderBy('timestamp', 'desc'));
      } else {
        q = query(q, orderBy('timestamp', 'desc'));
      }

      // Aplicar límite
      if (filtros.limit) {
        q = query(q, firestoreLimit(filtros.limit));
      } else {
        q = query(q, firestoreLimit(100)); // Límite por defecto
      }

      console.log('🔍 Ejecutando query de Firebase...');
      const snapshot = await getDocs(q);
      
      const activities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp)
      }));

      console.log(`📊 Firebase devolvió ${activities.length} actividades`);

      // Filtrar actividades offline que coincidan con los filtros
      let offlineActivities = JSON.parse(localStorage.getItem('offline_activities') || '[]');
      
      if (offlineActivities.length > 0) {
        // Aplicar filtros a actividades offline
        offlineActivities = offlineActivities.filter(activity => {
          const activityDate = new Date(activity.timestamp);
          
          // Filtro de fecha inicio
          if (filtros.fechaInicio) {
            const fechaInicio = new Date(filtros.fechaInicio + 'T00:00:00');
            if (activityDate < fechaInicio) return false;
          }
          
          // Filtro de fecha fin
          if (filtros.fechaFin) {
            const fechaFin = new Date(filtros.fechaFin + 'T23:59:59');
            if (activityDate > fechaFin) return false;
          }
          
          // Filtro de usuario
          if (filtros.usuarioId && activity.usuarioId !== filtros.usuarioId) return false;
          if (filtros.usuarioNombre && activity.usuarioNombre !== filtros.usuarioNombre) return false;
          
          // Filtro de acción
          if (filtros.accion && activity.accion !== filtros.accion) return false;
          
          // Filtro de módulo
          if (filtros.modulo && activity.modulo !== filtros.modulo) return false;
          
          return true;
        });
        
        console.log(`📱 Actividades offline filtradas: ${offlineActivities.length}`);
      }
      
      const allActivities = [...activities, ...offlineActivities].sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateB - dateA; // Más recientes primero
      });

      // DEBUG: Mostrar qué actividades se encontraron
      console.log(`✅ Total de actividades devueltas: ${allActivities.length}`);
      console.log('🔍 DEBUG - Resumen de actividades por usuario:');
      const usuariosEnActividades = {};
      allActivities.forEach(activity => {
        if (!usuariosEnActividades[activity.usuarioNombre]) {
          usuariosEnActividades[activity.usuarioNombre] = 0;
        }
        usuariosEnActividades[activity.usuarioNombre]++;
      });
      console.table(usuariosEnActividades);
      
      return allActivities;

    } catch (error) {
      console.error('❌ Error obteniendo actividades:', error);
      
      // Fallback: solo actividades offline con filtros aplicados
      let offlineActivities = JSON.parse(localStorage.getItem('offline_activities') || '[]');
      
      if (offlineActivities.length > 0) {
        // Aplicar filtros a actividades offline
        offlineActivities = offlineActivities.filter(activity => {
          const activityDate = new Date(activity.timestamp);
          
          if (filtros.fechaInicio) {
            const fechaInicio = new Date(filtros.fechaInicio + 'T00:00:00');
            if (activityDate < fechaInicio) return false;
          }
          
          if (filtros.fechaFin) {
            const fechaFin = new Date(filtros.fechaFin + 'T23:59:59');
            if (activityDate > fechaFin) return false;
          }
          
          if (filtros.usuarioId && activity.usuarioId !== filtros.usuarioId) return false;
          if (filtros.usuarioNombre && activity.usuarioNombre !== filtros.usuarioNombre) return false;
          if (filtros.accion && activity.accion !== filtros.accion) return false;
          if (filtros.modulo && activity.modulo !== filtros.modulo) return false;
          
          return true;
        });
      }
      
      return offlineActivities;
    }
  },

  /**
   * Sincroniza actividades offline con Firebase
   * @returns {Promise<number>} Número de actividades sincronizadas
   */
  async syncOfflineActivities() {
    try {
      const offlineActivities = JSON.parse(localStorage.getItem('offline_activities') || '[]');
      
      if (offlineActivities.length === 0) {
        return 0;
      }

      let syncedCount = 0;
      
      for (const activity of offlineActivities) {
        try {
          // Remover campos offline-specific antes de sincronizar
          const { id, offline, ...activityData } = activity;
          activityData.timestamp = serverTimestamp();
          
          await addDoc(actividadesCollection, activityData);
          syncedCount++;
          
        } catch (syncError) {
          console.error('Error sincronizando actividad:', syncError);
        }
      }

      // Limpiar actividades sincronizadas
      if (syncedCount > 0) {
        localStorage.removeItem('offline_activities');
        console.log(`✅ ${syncedCount} actividades sincronizadas con Firebase`);
      }

      return syncedCount;
      
    } catch (error) {
      console.error('Error en sincronización de actividades:', error);
      return 0;
    }
  },

  /**
   * Obtiene estadísticas de actividades
   * @param {Object} filtros - Filtros para las estadísticas
   * @returns {Promise<Object>} Estadísticas de actividades
   */
  async getActivityStats(filtros = {}) {
    try {
      const activities = await this.getActivities(filtros);
      
      const stats = {
        total: activities.length,
        porAccion: {},
        porModulo: {},
        porUsuario: {},
        porDia: {},
        usuarios: new Set(), // Todos los usuarios con actividades
        usuariosConLogin: new Set(), // Usuarios que han hecho login alguna vez
        usuariosActivos: new Set(), // Usuarios actualmente conectados (login sin logout)
        fechaInicio: null,
        fechaFin: null
      };

      // Rastrear sesiones de usuarios para determinar quién está actualmente activo
      const sesionesUsuarios = {};

      activities.forEach(activity => {
        // Contar por acción
        stats.porAccion[activity.accion] = (stats.porAccion[activity.accion] || 0) + 1;
        
        // Contar por módulo
        stats.porModulo[activity.modulo] = (stats.porModulo[activity.modulo] || 0) + 1;
        
        // Contar por usuario
        stats.porUsuario[activity.usuarioNombre] = (stats.porUsuario[activity.usuarioNombre] || 0) + 1;
        
        // Contar por día
        const fecha = new Date(activity.timestamp).toISOString().split('T')[0];
        stats.porDia[fecha] = (stats.porDia[fecha] || 0) + 1;
        
        // Agregar usuario único
        stats.usuarios.add(activity.usuarioNombre);
        
        // Rastrear sesiones de login/logout para usuarios activos
        if (activity.accion === 'login' || activity.accion === 'logout') {
          const usuario = activity.usuarioNombre;
          const timestamp = new Date(activity.timestamp);
          
          if (!sesionesUsuarios[usuario]) {
            sesionesUsuarios[usuario] = [];
          }
          
          sesionesUsuarios[usuario].push({
            accion: activity.accion,
            timestamp: timestamp
          });
          
          // Si hizo login alguna vez, agregarlo a usuariosConLogin
          if (activity.accion === 'login') {
            stats.usuariosConLogin.add(usuario);
          }
        }
        
        // Actualizar fechas extremas
        const activityDate = new Date(activity.timestamp);
        if (!stats.fechaInicio || activityDate < stats.fechaInicio) {
          stats.fechaInicio = activityDate;
        }
        if (!stats.fechaFin || activityDate > stats.fechaFin) {
          stats.fechaFin = activityDate;
        }
      });

      // Determinar usuarios actualmente activos analizando sesiones
      for (const [usuario, sesiones] of Object.entries(sesionesUsuarios)) {
        // Ordenar sesiones por timestamp (más reciente primero)
        sesiones.sort((a, b) => b.timestamp - a.timestamp);
        
        // Si la sesión más reciente es un login, el usuario está activo
        if (sesiones.length > 0 && sesiones[0].accion === 'login') {
          stats.usuariosActivos.add(usuario);
          console.log(`🟢 Usuario actualmente activo: ${usuario} (último: ${sesiones[0].accion} a las ${sesiones[0].timestamp.toLocaleString()})`);
        } else if (sesiones.length > 0) {
          console.log(`🔴 Usuario no activo: ${usuario} (último: ${sesiones[0].accion} a las ${sesiones[0].timestamp.toLocaleString()})`);
        }
      }

      // Convertir Sets a Arrays
      stats.usuarios = Array.from(stats.usuarios);
      stats.usuariosConLogin = Array.from(stats.usuariosConLogin);
      stats.usuariosActivos = Array.from(stats.usuariosActivos);
      
      // DEBUG: Mostrar análisis de usuarios
      console.log('👥 DEBUG - Todos los usuarios únicos:', stats.usuarios);
      console.log('� DEBUG - Usuarios que han hecho login:', stats.usuariosConLogin);
      console.log('🟢 DEBUG - Usuarios actualmente activos:', stats.usuariosActivos);
      console.log('� DEBUG - Total usuarios activos:', stats.usuariosActivos.length);
      
      return stats;
      
    } catch (error) {
      console.error('Error obteniendo estadísticas de actividades:', error);
      return {
        total: 0,
        porAccion: {},
        porModulo: {},
        porUsuario: {},
        porDia: {},
        usuarios: [],
        usuariosConLogin: [],
        usuariosActivos: [],
        fechaInicio: null,
        fechaFin: null
      };
    }
  },

  /**
   * Obtiene la IP del cliente (aproximada)
   * @returns {Promise<string>} IP del cliente
   */
  async getClientIP() {
    try {
      // En un entorno real, podrías usar un servicio como ipify
      // Por ahora, devolvemos un placeholder
      return 'localhost';
    } catch (error) {
      return 'unknown';
    }
  },

  /**
   * Detecta el tipo de dispositivo
   * @returns {string} Tipo de dispositivo
   */
  getDeviceType() {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('mobile')) return 'mobile';
    if (userAgent.includes('tablet')) return 'tablet';
    return 'desktop';
  },

  // Métodos de conveniencia para acciones comunes
  
  /**
   * Registra un login
   * @param {Object} userData - Datos del usuario
   * @returns {Promise<Object|null>} Actividad registrada
   */
  async logLogin(userData) {
    return this.log({
      accion: 'login',
      descripcion: `Inicio de sesión: ${userData.nombre} (${userData.matricula})`,
      modulo: 'autenticacion',
      recursoId: userData.uid,
      recursoTipo: 'usuario',
      detalles: {
        rol: userData.rol,
        metodoAutenticacion: 'formulario'
      }
    });
  },

  /**
   * Registra un logout
   * @param {Object} userData - Datos del usuario
   * @returns {Promise<Object|null>} Actividad registrada
   */
  async logLogout(userData) {
    return this.log({
      accion: 'logout',
      descripcion: `Cierre de sesión: ${userData.nombre}`,
      modulo: 'autenticacion',
      recursoId: userData.uid,
      recursoTipo: 'usuario'
    });
  },

  /**
   * Registra creación de un recurso
   * @param {string} resourceType - Tipo de recurso
   * @param {string} resourceId - ID del recurso
   * @param {string} description - Descripción
   * @param {Object} details - Detalles adicionales
   * @returns {Promise<Object|null>} Actividad registrada
   */
  async logCreate(resourceType, resourceId, description, details = {}) {
    return this.log({
      accion: 'create',
      descripcion: description,
      modulo: this.getModuleFromResourceType(resourceType),
      recursoId: resourceId,
      recursoTipo: resourceType,
      detalles: details
    });
  },

  /**
   * Registra actualización de un recurso
   * @param {string} resourceType - Tipo de recurso
   * @param {string} resourceId - ID del recurso
   * @param {string} description - Descripción
   * @param {Object} details - Detalles adicionales
   * @returns {Promise<Object|null>} Actividad registrada
   */
  async logUpdate(resourceType, resourceId, description, details = {}) {
    return this.log({
      accion: 'update',
      descripcion: description,
      modulo: this.getModuleFromResourceType(resourceType),
      recursoId: resourceId,
      recursoTipo: resourceType,
      detalles: details
    });
  },

  /**
   * Registra eliminación de un recurso
   * @param {string} resourceType - Tipo de recurso
   * @param {string} resourceId - ID del recurso
   * @param {string} description - Descripción
   * @param {Object} details - Detalles adicionales
   * @returns {Promise<Object|null>} Actividad registrada
   */
  async logDelete(resourceType, resourceId, description, details = {}) {
    return this.log({
      accion: 'delete',
      descripcion: description,
      modulo: this.getModuleFromResourceType(resourceType),
      recursoId: resourceId,
      recursoTipo: resourceType,
      detalles: details
    });
  },

  /**
   * Obtiene el módulo basado en el tipo de recurso
   * @param {string} resourceType - Tipo de recurso
   * @returns {string} Nombre del módulo
   */
  getModuleFromResourceType(resourceType) {
    const moduleMap = {
      'paciente': 'pacientes',
      'usuario': 'usuarios',
      'registro_medico': 'pacientes',
      'cita': 'pacientes',
      'reporte': 'reportes',
      'entrada': 'operaciones',
      'salida': 'operaciones',
      'mesa_salud': 'operaciones'
    };
    
    return moduleMap[resourceType] || 'general';
  },

  // ==========================================
  // MÉTODOS DE CONVENIENCIA
  // ==========================================

  /**
   * Registra actividad de login
   * @param {string} userId - ID del usuario
   * @param {string} platform - Plataforma (web, mobile, etc.)
   * @returns {Promise<Object|null>} Actividad registrada
   */
  async loginActivity(userId, platform = 'web') {
    return this.log({
      accion: 'login',
      descripcion: `Inicio de sesión en plataforma ${platform}`,
      modulo: 'autenticacion',
      recursoId: userId,
      recursoTipo: 'usuario',
      detalles: { platform }
    });
  },

  /**
   * Registra actividad de logout
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object|null>} Actividad registrada
   */
  async logoutActivity(userId) {
    return this.log({
      accion: 'logout',
      descripcion: 'Cierre de sesión',
      modulo: 'autenticacion',
      recursoId: userId,
      recursoTipo: 'usuario'
    });
  },

  /**
   * Registra creación de paciente
   * @param {string} pacienteId - ID del paciente
   * @param {string} nombre - Nombre del paciente
   * @param {string} matricula - Matrícula del paciente
   * @returns {Promise<Object|null>} Actividad registrada
   */
  async createPatientActivity(pacienteId, nombre, matricula) {
    return this.log({
      accion: 'create_paciente',
      descripcion: `Paciente registrado: ${nombre} (${matricula})`,
      modulo: 'pacientes',
      recursoId: pacienteId,
      recursoTipo: 'paciente',
      detalles: { nombre, matricula }
    });
  },

  /**
   * Registra eliminación de paciente
   * @param {string} pacienteId - ID del paciente
   * @param {string} nombre - Nombre del paciente
   * @param {string} matricula - Matrícula del paciente
   * @returns {Promise<Object|null>} Actividad registrada
   */
  async deletePatientActivity(pacienteId, nombre, matricula) {
    return this.log({
      accion: 'delete_paciente',
      descripcion: `Paciente eliminado: ${nombre} (${matricula})`,
      modulo: 'pacientes',
      recursoId: pacienteId,
      recursoTipo: 'paciente',
      detalles: { nombre, matricula }
    });
  },

  /**
   * Registra creación de registro médico
   * @param {string} pacienteId - ID del paciente
   * @param {string} nombrePaciente - Nombre del paciente
   * @param {Array} campos - Campos registrados
   * @returns {Promise<Object|null>} Actividad registrada
   */
  async createMedicalRecordActivity(pacienteId, nombrePaciente, campos = []) {
    return this.log({
      accion: 'create_registro_medico',
      descripcion: `Datos médicos registrados para ${nombrePaciente}`,
      modulo: 'pacientes',
      recursoId: pacienteId,
      recursoTipo: 'registro_medico',
      detalles: { campos, nombrePaciente }
    });
  },

  /**
   * Registra actualización de registro médico
   * @param {string} pacienteId - ID del paciente
   * @param {string} nombrePaciente - Nombre del paciente
   * @param {Array} campos - Campos actualizados
   * @returns {Promise<Object|null>} Actividad registrada
   */
  async updateMedicalRecordActivity(pacienteId, nombrePaciente, campos = []) {
    return this.log({
      accion: 'update_registro_medico',
      descripcion: `Datos médicos actualizados para ${nombrePaciente}`,
      modulo: 'pacientes',
      recursoId: pacienteId,
      recursoTipo: 'registro_medico',
      detalles: { campos, nombrePaciente }
    });
  },

  /**
   * Registra eliminación de registro médico
   * @param {string} registroId - ID del registro médico
   * @param {string} pacienteId - ID del paciente
   * @param {string} nombrePaciente - Nombre del paciente
   * @param {string} tipoRegistro - Tipo de registro eliminado
   * @returns {Promise<Object|null>} Actividad registrada
   */
  async deleteMedicalRecordActivity(registroId, pacienteId, nombrePaciente, tipoRegistro = 'historial') {
    return this.log({
      accion: 'delete_registro_medico',
      descripcion: `Registro médico eliminado de ${nombrePaciente}`,
      modulo: 'pacientes',
      recursoId: registroId,
      recursoTipo: 'registro_medico',
      detalles: { 
        pacienteId, 
        nombrePaciente, 
        tipoRegistro,
        registroEliminado: registroId
      }
    });
  },

  /**
   * Registra creación de usuario
   * @param {string} userId - ID del usuario
   * @param {string} nombre - Nombre del usuario
   * @param {string} rol - Rol del usuario
   * @returns {Promise<Object|null>} Actividad registrada
   */
  async createUserActivity(userId, nombre, rol) {
    return this.log({
      accion: 'create_user',
      descripcion: `Usuario creado: ${nombre} (${rol})`,
      modulo: 'usuarios',
      recursoId: userId,
      recursoTipo: 'usuario',
      detalles: { nombre, rol }
    });
  },

  /**
   * Registra actualización de usuario
   * @param {string} userId - ID del usuario
   * @param {string} nombre - Nombre del usuario
   * @param {string} rol - Rol del usuario
   * @param {Array} cambios - Campos modificados
   * @returns {Promise<Object|null>} Actividad registrada
   */
  async updateUserActivity(userId, nombre, rol, cambios = []) {
    return this.log({
      accion: 'update_user',
      descripcion: `Usuario actualizado: ${nombre} (${rol})`,
      modulo: 'usuarios',
      recursoId: userId,
      recursoTipo: 'usuario',
      detalles: { nombre, rol, cambios }
    });
  },

  /**
   * Registra eliminación de usuario
   * @param {string} userId - ID del usuario
   * @param {string} nombre - Nombre del usuario
   * @param {string} rol - Rol del usuario
   * @returns {Promise<Object|null>} Actividad registrada
   */
  async deleteUserActivity(userId, nombre, rol) {
    return this.log({
      accion: 'delete_user',
      descripcion: `Usuario eliminado: ${nombre} (${rol})`,
      modulo: 'usuarios',
      recursoId: userId,
      recursoTipo: 'usuario',
      detalles: { nombre, rol }
    });
  },

  /**
   * Registra actividad de exportación
   * @param {string} tipo - Tipo de datos exportados
   * @param {number} cantidad - Cantidad de registros
   * @returns {Promise<Object|null>} Actividad registrada
   */
  async exportActivity(tipo, cantidad = 0) {
    return this.log({
      accion: 'exportar',
      descripcion: `Exportación de ${tipo}: ${cantidad} registros`,
      modulo: 'reportes',
      detalles: { tipo, cantidad }
    });
  },

  /**
   * Registra actividad de consulta
   * @param {string} tipo - Tipo de consulta
   * @param {Object} filtros - Filtros aplicados
   * @param {number} resultados - Número de resultados
   * @returns {Promise<Object|null>} Actividad registrada
   */
  async consultaActivity(tipo, filtros = {}, resultados = 0) {
    return this.log({
      accion: 'consulta',
      descripcion: `Consulta de ${tipo}: ${resultados} resultados`,
      modulo: 'reportes',
      detalles: { tipo, filtros, resultados }
    });
  }
};

// Inicializar sincronización automática cuando se restablece la conexión
window.addEventListener('online', () => {
  ActivityLogger.syncOfflineActivities().catch(console.error);
});

export default ActivityLogger;