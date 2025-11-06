// js/models/operacionesModel.js
import performanceMonitor from '../utils/performanceMonitor.js';
import { db } from './firebaseConfig.js';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, limit, Timestamp } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';
import { authModel } from './storageModel.js';
import { gestionModel } from './gestionModel.js';

export function getRegistroEntradasSalidas() {
  console.warn('getRegistroEntradasSalidas: Función obsoleta, use getAsistencias() para Firebase');
  return [];
}

export function registrarEntrada() {
  console.warn('registrarEntrada: Función obsoleta, use registrarEntradaAsistencia() para Firebase');
  return null;
}

export function registrarSalida() {
  console.warn('registrarSalida: Función obsoleta, use registrarSalidaAsistencia() para Firebase');
  return null;
}

export function eliminarRegistro() {
  console.warn('eliminarRegistro: Función obsoleta, use eliminarAsistencia() para Firebase');
  return false;
}

export function limpiarRegistros() {
  console.warn('limpiarRegistros: Función obsoleta, no aplica para Firebase');
  return false;
}

export function getModulosSalud() {
  console.warn('getModulosSalud: Función obsoleta, use gestionModel.getModulos() para Firebase');
  return [];
}

export function getMesasSalud() {
  return getModulosSalud();
}

export function exportarDatosCSV() {
  console.warn('exportarDatosCSV: Función obsoleta, use funciones de exportación específicas para Firebase');
  return false;
}

/**
 * Devuelve el registro de asistencia activo para un usuario ID (desde Firebase)
 */
export async function getRegistroActivoPorUsuarioId(usuarioId) {
  try {
    console.log('OperacionesModel: Buscando asistencia activa para usuario ID:', usuarioId);

    // Buscar asistencia activa por el ID del usuario directamente
    const asistenciasActivas = await getAsistencias({
      usuarioId: usuarioId,
      estado: 'activa',
      limit: 1
    });

    if (asistenciasActivas.length > 0) {
      const asistencia = asistenciasActivas[0];
      console.log('OperacionesModel: Encontrada asistencia activa:', asistencia.id);

      return {
        id: asistencia.id,
        nombre: asistencia.nombreUsuario,
        matricula: asistencia.matricula,
        entrada: asistencia.horaEntrada ? new Date(asistencia.horaEntrada).toLocaleString() : null,
        entradaIso: asistencia.horaEntrada,
        entradaTimestamp: asistencia.horaEntrada ? new Date(asistencia.horaEntrada).getTime() : null,
        salida: null,
        estado: 'activa'
      };
    }

    console.log('OperacionesModel: No se encontró asistencia activa para usuario ID:', usuarioId);
    return null;
  } catch (error) {
    console.error('Error obteniendo registro activo por usuario ID:', error);
    return null;
  }
}

/**
 * Registra entrada de asistencia (estructura: id, nombre, matricula, modulo, entrada, salida)
 */
export async function registrarEntradaAsistencia(usuario) {
  try {
    console.log('OperacionesModel: Registrando entrada de asistencia para:', usuario);

    // Obtener el usuario completo desde Firebase para tener acceso a grupoId y nombre completo
    const allUsers = await authModel.getAllUsers();
    const usuarioCompleto = allUsers.find(u => u.uid === usuario.id || u.matricula === usuario.matricula);

    if (!usuarioCompleto) {
      throw new Error('Usuario no encontrado en la base de datos');
    }

    // Obtener el usuario actual (quien está registrando la asistencia)
    const usuarioActual = authModel.getCurrentUser();
    const registradoPor = usuarioActual ? `${usuarioActual.nombre} (${usuarioActual.matricula})` : 'Sistema';

    // Obtener el módulo del usuario desde su grupo asignado
    let moduloId = null;
    if (usuarioCompleto.grupoId) {
      try {
        const grupo = await gestionModel.getGrupoById(usuarioCompleto.grupoId);
        if (grupo) {
          // Buscar módulos asignados a este grupo
          const modulos = await gestionModel.getModulos();
          const moduloAsignado = modulos.find(m => m.grupoAsignadoId === usuarioCompleto.grupoId);
          if (moduloAsignado) {
            moduloId = moduloAsignado.id;
            console.log('OperacionesModel: Módulo encontrado para el grupo:', moduloId);
          }
        }
      } catch (error) {
        console.warn('OperacionesModel: Error obteniendo módulo del grupo:', error);
      }
    }

    // Crear el registro de asistencia en Firebase
    const asistencia = {
      usuarioId: usuarioCompleto.uid || usuarioCompleto.id, // Usar el ID único del usuario
      nombreUsuario: `${usuarioCompleto.nombre} ${usuarioCompleto.apellidos || ''}`.trim(), // Nombre completo
      matricula: usuarioCompleto.matricula,
      moduloId: moduloId,
      fecha: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      horaEntrada: new Date().toISOString(),
      horaSalida: null,
      estado: 'activa',
      registradoPor: registradoPor, // Usuario actual que registra
      observaciones: ''
    };

    const resultado = await registrarAsistencia(asistencia);

    if (resultado) {
      console.log('OperacionesModel: Entrada de asistencia registrada exitosamente:', resultado.id);
      return {
        id: resultado.id,
        nombre: asistencia.nombreUsuario,
        matricula: usuarioCompleto.matricula,
        entrada: new Date(resultado.horaEntrada).toLocaleString(),
        entradaIso: resultado.horaEntrada,
        entradaTimestamp: new Date(resultado.horaEntrada).getTime(),
        salida: null,
        estado: 'activa'
      };
    }

    return null;
  } catch (error) {
    console.error('Error registrando entrada de asistencia:', error);
    return null;
  }
}

/**
 * Registra salida de asistencia para un usuario ID
 */
export async function registrarSalidaAsistencia(usuarioId) {
  try {
    console.log('OperacionesModel: Registrando salida de asistencia para usuario ID:', usuarioId);

    // Buscar la asistencia activa para este usuario por su ID
    const asistenciasActivas = await getAsistencias({
      usuarioId: usuarioId,
      estado: 'activa',
      limit: 1
    });

    if (asistenciasActivas.length === 0) {
      console.warn('OperacionesModel: No se encontró asistencia activa para usuario ID:', usuarioId);
      return null;
    }

    const asistenciaActiva = asistenciasActivas[0];
    const horaSalida = new Date().toISOString();

    // Calcular duración
    const entradaTime = new Date(asistenciaActiva.horaEntrada);
    const salidaTime = new Date(horaSalida);
    const diffMs = salidaTime - entradaTime;
    const horas = Math.floor(diffMs / (1000 * 60 * 60));
    const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const duracion = `${horas}h ${minutos}m`;

    // Actualizar la asistencia con la salida
    const updates = {
      horaSalida: horaSalida,
      estado: 'completada',
      observaciones: `Duración: ${duracion}`
    };

    const exito = await actualizarAsistencia(asistenciaActiva.id, updates);

    if (exito) {
      console.log('OperacionesModel: Salida de asistencia registrada exitosamente');
      return {
        id: asistenciaActiva.id,
        matricula: asistenciaActiva.matricula,
        salida: salidaTime.toLocaleString(),
        salidaIso: horaSalida,
        salidaTimestamp: salidaTime.getTime(),
        duracion: duracion,
        estado: 'completada'
      };
    }

    return null;
  } catch (error) {
    console.error('Error registrando salida de asistencia:', error);
    return null;
  }
}

/**
 * Migración: Normaliza usuarios y registros para asegurar que todos los usuarios
 * tengan un campo `moduloId` cuando sea posible y que los registros del historial
 * contengan `moduloId` y `mesainfo` para una visualización consistente.
 * Esta función es segura/reversible: sólo modifica localStorage y se puede ejecutar
 * varias veces sin daño.
 */
// NOTE: La funcionalidad de migración explícita fue eliminada. El código
// mantiene pequeñas normalizaciones cuando se cargan registros en
// `getRegistroEntradasSalidas`, pero no hay una función pública de "migración"
// ejecutable desde controladores.

/**
 * OBTIENE TODAS LAS ASISTENCIAS DESDE FIREBASE
 * @returns {Promise<Array>} Array de asistencias
 */
export async function getAsistencias(filtros = {}) {
  return performanceMonitor.measureFunction('firebaseQuery', async () => {
    try {
      console.log('OperacionesModel: Obteniendo asistencias con filtros:', filtros);

      let q = collection(db, 'asistencias_usuarios');
      let constraints = [];

      // IMPORTANTE: Firebase requiere índices compuestos para combinaciones de where + orderBy
      // Los índices necesarios son:
      // 1. (estado, fecha) - para filtrar por estado y ordenar por fecha
      // 2. (usuarioId, fecha) - para filtrar por usuario y ordenar por fecha
      // 3. (usuarioId, estado, fecha) - para filtrar por usuario y estado, ordenar por fecha

      // Aplicar filtros en orden específico para optimizar índices
      if (filtros.usuarioId) {
        constraints.push(where('usuarioId', '==', filtros.usuarioId));
      }
      
      if (filtros.estado) {
        constraints.push(where('estado', '==', filtros.estado));
      }
      
      if (filtros.fecha) {
        constraints.push(where('fecha', '==', filtros.fecha));
      }

      // Determinar ordenamiento basado en los filtros aplicados
      if (filtros.usuarioId) {
        // Cuando se filtra por usuario específico, ordenar descendente (más recientes primero)
        constraints.push(orderBy('fecha', 'desc'));
      } else if (filtros.estado) {
        // Cuando se filtra solo por estado, ordenar ascendente
        constraints.push(orderBy('fecha', 'asc'));
      } else {
        // Sin filtros específicos, ordenar descendente por defecto
        constraints.push(orderBy('fecha', 'desc'));
      }

      // Limitar resultados si se especifica
      if (filtros.limit) {
        constraints.push(limit(filtros.limit));
      }

      q = query(q, ...constraints);

      const querySnapshot = await getDocs(q);
      const asistencias = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        asistencias.push({
          id: doc.id,
          ...data,
          // Convertir Timestamps a fechas legibles
          fecha: data.fecha?.toDate?.() || data.fecha,
          horaEntrada: data.horaEntrada?.toDate?.() || data.horaEntrada,
          horaSalida: data.horaSalida?.toDate?.() || data.horaSalida,
          fechaCreacion: data.fechaCreacion?.toDate?.() || data.fechaCreacion
        });
      });

      console.log(`OperacionesModel: ${asistencias.length} asistencias obtenidas`);
      return asistencias;

    } catch (error) {
      console.error('Error obteniendo asistencias:', error);
      console.error('Detalles del error:', error.message);

      // Si es error de índice, proporcionar instrucciones claras
      if (error.message && error.message.includes('requires an index')) {
        console.error('🔧 SOLUCIÓN: Crear índice compuesto en Firebase Console');
        console.error('Ir a: https://console.firebase.google.com/');
        console.error('Proyecto: medicalweboffline > Firestore Database > Índices');
        console.error('Crear índices para: (estado, fecha), (usuarioId, fecha), (usuarioId, estado, fecha)');
      }

      return [];
    }
  });
}

/**
 * REGISTRA UNA NUEVA ASISTENCIA EN FIREBASE
 * @param {Object} asistencia - Datos de la asistencia
 * @returns {Promise<Object>} Asistencia creada
 */
export async function registrarAsistencia(asistencia) {
  try {
    console.log('OperacionesModel: Registrando nueva asistencia:', asistencia);
    
    const asistenciaData = {
      usuarioId: asistencia.usuarioId,
      nombreUsuario: asistencia.nombreUsuario,
      matricula: asistencia.matricula,
      moduloId: asistencia.moduloId || null,
      fecha: Timestamp.fromDate(new Date(asistencia.fecha)),
      horaEntrada: asistencia.horaEntrada ? Timestamp.fromDate(new Date(asistencia.horaEntrada)) : null,
      horaSalida: asistencia.horaSalida ? Timestamp.fromDate(new Date(asistencia.horaSalida)) : null,
      estado: asistencia.estado || 'activa',
      observaciones: asistencia.observaciones || '',
      registradoPor: asistencia.registradoPor,
      fechaCreacion: Timestamp.fromDate(new Date())
    };
    
    const docRef = await addDoc(collection(db, 'asistencias_usuarios'), asistenciaData);
    
    console.log('OperacionesModel: Asistencia registrada con ID:', docRef.id);
    return {
      id: docRef.id,
      ...asistenciaData,
      fecha: asistenciaData.fecha.toDate(),
      horaEntrada: asistenciaData.horaEntrada?.toDate(),
      horaSalida: asistenciaData.horaSalida?.toDate(),
      fechaCreacion: asistenciaData.fechaCreacion.toDate()
    };
    
  } catch (error) {
    console.error('Error registrando asistencia:', error);
    return null;
  }
}

/**
 * ACTUALIZA UNA ASISTENCIA EXISTENTE
 * @param {string} asistenciaId - ID de la asistencia
 * @param {Object} updates - Campos a actualizar
 * @returns {Promise<boolean>} Éxito de la operación
 */
export async function actualizarAsistencia(asistenciaId, updates) {
  try {
    console.log('OperacionesModel: Actualizando asistencia:', asistenciaId, updates);
    
    const asistenciaRef = doc(db, 'asistencias_usuarios', asistenciaId);
    
    // Convertir fechas a Timestamps si es necesario
    const updatesData = { ...updates };
    if (updatesData.fecha) {
      updatesData.fecha = Timestamp.fromDate(new Date(updatesData.fecha));
    }
    if (updatesData.horaEntrada) {
      updatesData.horaEntrada = Timestamp.fromDate(new Date(updatesData.horaEntrada));
    }
    if (updatesData.horaSalida) {
      updatesData.horaSalida = Timestamp.fromDate(new Date(updatesData.horaSalida));
    }
    
    await updateDoc(asistenciaRef, updatesData);
    
    console.log('OperacionesModel: Asistencia actualizada exitosamente');
    return true;
    
  } catch (error) {
    console.error('Error actualizando asistencia:', error);
    return false;
  }
}

/**
 * ELIMINA UNA ASISTENCIA
 * @param {string} asistenciaId - ID de la asistencia
 * @returns {Promise<boolean>} Éxito de la operación
 */
export async function eliminarAsistencia(asistenciaId) {
  try {
    console.log('OperacionesModel: Eliminando asistencia:', asistenciaId);
    
    await deleteDoc(doc(db, 'asistencias_usuarios', asistenciaId));
    
    console.log('OperacionesModel: Asistencia eliminada exitosamente');
    return true;
    
  } catch (error) {
    console.error('Error eliminando asistencia:', error);
    return false;
  }
}

/**
 * OBTIENE ASISTENCIAS POR USUARIO
 * @param {string} usuarioId - ID del usuario
 * @param {Object} filtros - Filtros adicionales
 * @returns {Promise<Array>} Asistencias del usuario
 */
export async function getAsistenciasPorUsuario(usuarioId, filtros = {}) {
  return getAsistencias({ ...filtros, usuarioId });
}

/**
 * OBTIENE ASISTENCIAS POR FECHA
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @returns {Promise<Array>} Asistencias de la fecha
 */
export async function getAsistenciasPorFecha(fecha) {
  const fechaInicio = new Date(fecha);
  fechaInicio.setHours(0, 0, 0, 0);
  
  const fechaFin = new Date(fecha);
  fechaFin.setHours(23, 59, 59, 999);
  
  return getAsistencias({
    fechaDesde: fechaInicio.toISOString(),
    fechaHasta: fechaFin.toISOString()
  });
}

/**
 * OBTIENE ESTADÍSTICAS DE ASISTENCIAS
 * @param {Object} filtros - Filtros opcionales para las estadísticas
 * @returns {Promise<Object>} Estadísticas de asistencias
 */
export async function getEstadisticasAsistencias(filtros = {}) {
  try {
    console.log('📊 OperacionesModel: Obteniendo estadísticas de asistencias con filtros:', filtros);

    // Obtener todas las asistencias con los filtros aplicados
    const asistencias = await getAsistencias({ ...filtros, limit: 1000 });

    // Calcular estadísticas
    const estadisticas = {
      total: asistencias.length,
      activas: asistencias.filter(a => a.estado === 'activa').length,
      completadas: asistencias.filter(a => a.estado === 'completada').length,
      usuariosUnicos: new Set(asistencias.map(a => a.usuarioId || a.matricula)).size
    };

    console.log('📊 Estadísticas calculadas:', estadisticas);
    return estadisticas;

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas de asistencias:', error);
    throw new Error('No se pudieron obtener las estadísticas: ' + error.message);
  }
}