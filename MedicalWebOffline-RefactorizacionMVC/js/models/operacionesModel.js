// js/models/operacionesModel.js - MIGRADO A FIREBASE
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
    orderBy,
    serverTimestamp,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import performanceMonitor from '../utils/performanceMonitor.js';

// --- CONSTANTES ---
const REGISTROS_COLLECTION = "registros_entrada_salida";
const MESAS_COLLECTION = "mesas_salud";
const USUARIOS_COLLECTION = "usuarios";

// --- COLECCIONES DE FIRESTORE ---
const registrosCollection = collection(db, REGISTROS_COLLECTION);
const mesasCollection = collection(db, MESAS_COLLECTION);
const usuariosCollection = collection(db, USUARIOS_COLLECTION);

/**
 * Obtiene el historial de registros de entrada/salida desde Firestore
 * @returns {Promise<Array>} Array de registros
 */
export async function getRegistroEntradasSalidas() {
  return performanceMonitor.measureFunction('dataLoad', async () => {
    try {
      const q = query(registrosCollection, orderBy('entrada', 'desc'));
      const snapshot = await getDocs(q);
      
      const historial = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convertir timestamps de Firestore a strings si es necesario
        entrada: doc.data().entrada?.toDate?.() ? doc.data().entrada.toDate().toLocaleString() : doc.data().entrada,
        salida: doc.data().salida?.toDate?.() ? doc.data().salida.toDate().toLocaleString() : doc.data().salida
      }));
      
      console.log('OperacionesModel: Cargando historial desde Firestore:', historial.length, 'registros');
      return historial;
    } catch (error) {
      console.error('Error cargando historial:', error);
      if (error.code === 'unavailable') {
        console.log('Usando datos en cache offline para historial');
        // Firestore manejará automáticamente el cache offline
      }
      throw new Error('No se pudo cargar el historial: ' + error.message);
    }
  });
}

/**
 * Registra la entrada de un usuario
 * @param {Object} usuario - Datos del usuario
 * @returns {Promise<Object|null>} El registro creado o null si hay error
 */
export async function registrarEntrada(usuario) {
  // TEMPORALMENTE DESHABILITADO - Solo para colección usuarios
  console.log('🚪 Entrada registrada (deshabilitado):', usuario.nombre);
  return {
    id: 'temp-entrada-' + Date.now(),
    nombre: usuario.nombre,
    matricula: usuario.matricula,
    mesa: usuario.mesa || 'No asignada',
    rol: usuario.rol,
    entrada: new Date().toISOString(),
    salida: null,
    duracion: 'En servicio',
    status: 'activo'
  };
  
  /* CÓDIGO ORIGINAL COMENTADO:
  try {
    const registro = {
      nombre: usuario.nombre,
      matricula: usuario.matricula,
      mesa: usuario.mesa || 'No asignada',
      rol: usuario.rol,
      entrada: serverTimestamp(),
      salida: null,
      duracion: 'En servicio',
      status: 'activo'
    };
    
    const docRef = await addDoc(registrosCollection, registro);
    
    console.log('OperacionesModel: Entrada registrada para', usuario.nombre);
    return { id: docRef.id, ...registro };
  } catch (error) {
    console.error('Error registrando entrada:', error);
    if (error.code === 'unavailable') {
      console.log('Entrada será registrada cuando se restablezca la conexión');
    }
    throw new Error('No se pudo registrar la entrada: ' + error.message);
  }
  */
}

/**
 * Registra la salida de un usuario
 * @param {string} usuarioId - ID o matrícula del usuario
 * @returns {Promise<Object|null>} El registro actualizado o null si hay error
 */
export async function registrarSalida(usuarioId) {
  // TEMPORALMENTE DESHABILITADO - Solo para colección usuarios
  console.log('🚪 Salida registrada (deshabilitado) para usuario:', usuarioId);
  return {
    id: 'temp-salida-' + Date.now(),
    usuarioId: usuarioId,
    salida: new Date().toISOString(),
    status: 'completado'
  };
  
  /* CÓDIGO ORIGINAL COMENTADO:
  try {
    // Buscar el registro de entrada activo más reciente
    const q = query(
      registrosCollection,
      where('matricula', '==', usuarioId),
      where('salida', '==', null),
      orderBy('entrada', 'desc')
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      throw new Error('No se encontró un registro de entrada activo para este usuario');
    }
    
    const registroDoc = snapshot.docs[0];
    const registroData = registroDoc.data();
    
    const salidaTime = new Date();
    const entradaTime = registroData.entrada?.toDate?.() || new Date(registroData.entrada);
    const duracionMs = salidaTime - entradaTime;
    const horas = Math.floor(duracionMs / (1000 * 60 * 60));
    const minutos = Math.floor((duracionMs % (1000 * 60 * 60)) / (1000 * 60));
    
    // Actualizar el registro con la salida
    await updateDoc(registroDoc.ref, {
      salida: serverTimestamp(),
      duracion: `${horas}h ${minutos}m`,
      updatedAt: serverTimestamp()
    });
    
    console.log('OperacionesModel: Salida registrada para', registroData.nombre);
    
    return {
      id: registroDoc.id,
      ...registroData,
      salida: salidaTime.toLocaleString(),
      duracion: `${horas}h ${minutos}m`
    };
  } catch (error) {
    console.error('Error registrando salida:', error);
    if (error.code === 'unavailable') {
      console.log('Salida será registrada cuando se restablezca la conexión');
    }
    throw new Error('No se pudo registrar la salida: ' + error.message);
  }
  */
}

/**
 * Elimina un registro específico por ID
 * @param {string} registroId - ID del registro
 * @returns {Promise<boolean>} true si se eliminó correctamente
 */
export async function eliminarRegistro(registroId) {
  try {
    const docRef = doc(registrosCollection, registroId);
    
    // Verificar que el documento existe
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error(`Registro con ID ${registroId} no encontrado`);
    }
    
    await deleteDoc(docRef);
    
    console.log('OperacionesModel: Registro eliminado:', registroId);
    return true;
  } catch (error) {
    console.error('Error eliminando registro:', error);
    if (error.code === 'unavailable') {
      console.log('Eliminación será aplicada cuando se restablezca la conexión');
    }
    throw new Error('No se pudo eliminar el registro: ' + error.message);
  }
}

/**
 * Limpiar todos los registros existentes
 * @returns {Promise<boolean>} true si se limpiaron correctamente
 */
export async function limpiarRegistros() {
  try {
    const snapshot = await getDocs(registrosCollection);
    
    // Eliminar todos los documentos en lotes
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    console.log('OperacionesModel: Registros limpiados');
    return true;
  } catch (error) {
    console.error('Error limpiando registros:', error);
    if (error.code === 'unavailable') {
      console.log('Limpieza será aplicada cuando se restablezca la conexión');
    }
    throw new Error('No se pudieron limpiar los registros: ' + error.message);
  }
}

/**
 * Obtiene las mesas de salud y su estado actual
 * @returns {Promise<Array>} Array de mesas con su información
 */
export async function getMesasSalud() {
  try {
    // Obtener usuarios desde Firestore
    const usuariosSnapshot = await getDocs(usuariosCollection);
    let usuarios = usuariosSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Si no hay usuarios, crear datos de prueba (solo en desarrollo)
    if (usuarios.length === 0) {
      console.log('No hay usuarios en Firestore, creando datos de ejemplo...');
      usuarios = [
        { id: 'U001', nombre: 'Juan Pérez', apellidos: '', mesa: 1, rol: 'admin' },
        { id: 'U002', nombre: 'María González', apellidos: '', mesa: 2, rol: 'practicante' },
        { id: 'U003', nombre: 'Carlos López', apellidos: '', mesa: 3, rol: 'practicante' }
      ];
    }

    // Obtener historial de registros
    const historial = await getRegistroEntradasSalidas();
    const mesasMap = new Map();

    // Crear mesas basadas en usuarios asignados
    usuarios.forEach(usuario => {
      if (usuario.mesa) {
        const mesa = parseInt(usuario.mesa);
        if (!mesasMap.has(mesa)) {
          mesasMap.set(mesa, { 
            numero: mesa, 
            asignado: usuario, 
            estado: 'en-servicio', 
            ultimaActividad: null 
          });
        }
      }
    });

    // Actualizar estado de mesas basado en registros activos
    historial.forEach(registro => {
      if (registro.mesa && !registro.salida) {
        const mesa = parseInt(registro.mesa);
        if (mesasMap.has(mesa)) {
          mesasMap.get(mesa).estado = 'ocupada';
          mesasMap.get(mesa).ultimaActividad = registro.entrada;
        }
      }
    });

    // Si aún no hay mesas, crear mesas por defecto
    if (mesasMap.size === 0) {
      for (let i = 1; i <= 3; i++) {
        mesasMap.set(i, { 
          numero: i, 
          asignado: null, 
          estado: 'fuera-servicio', 
          ultimaActividad: null 
        });
      }
    }

    return Array.from(mesasMap.values()).sort((a, b) => a.numero - b.numero);
  } catch (error) {
    console.error('Error al obtener mesas de salud:', error);
    if (error.code === 'unavailable') {
      console.log('Usando datos en cache offline para mesas de salud');
    }
    throw new Error('No se pudieron obtener las mesas de salud: ' + error.message);
  }
}

/**
 * Exporta datos a CSV (mantiene la funcionalidad original)
 * @param {Array} datos - Datos a exportar
 * @param {string} nombreArchivo - Nombre del archivo
 */
export function exportarDatosCSV(datos, nombreArchivo) {
    console.log(`Iniciando exportación CSV: ${nombreArchivo}`);
    console.log(`Datos recibidos: ${datos ? datos.length : 0} registros`);

    if (!datos || datos.length === 0) {
        console.error('No hay datos para exportar');
        alert('No hay datos para exportar.');
        return;
    }

    try {
        const headers = Object.keys(datos[0]);
        console.log(`Headers detectados: ${headers.join(', ')}`);

        const csvRows = [headers.join(',')];

        for (const row of datos) {
            const values = headers.map(header => {
                const value = row[header] === null || row[header] === undefined ? '' : row[header];
                const escaped = ('' + value).replaceAll('"', '""');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        }

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', nombreArchivo);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        console.log('Exportación CSV completada.');

    } catch (error) {
        console.error('Error al exportar datos CSV:', error);
        alert('Ocurrió un error durante la exportación de datos.');
    }
}

/**
 * Registra una actividad en el sistema
 * @param {string} tipoActividad - Tipo de actividad
 * @param {string} descripcion - Descripción de la actividad
 * @returns {Promise<Object>} La actividad registrada
 */
export const registrarActividad = async (tipoActividad, descripcion) => {
    try {
        const actividad = {
            tipo: tipoActividad,
            descripcion: descripcion,
            fecha: serverTimestamp(),
            timestamp: new Date().toISOString()
        };

        // Guardar en Firestore (colección de actividades)
        const actividadesCollection = collection(db, 'actividades');
        const docRef = await addDoc(actividadesCollection, actividad);

        console.log(`Actividad registrada: ${tipoActividad} - ${descripcion}`);
        return { id: docRef.id, ...actividad };
    } catch (error) {
        console.error("Error al registrar actividad:", error);
        if (error.code === 'unavailable') {
            console.log('Actividad será registrada cuando se restablezca la conexión');
        }
        throw new Error('No se pudo registrar la actividad: ' + error.message);
    }
};
