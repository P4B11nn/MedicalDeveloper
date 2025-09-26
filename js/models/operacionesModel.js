// js/models/operacionesModel.js
// Modelo para la sección de operaciones y control

// Obtener información del usuario actual
export function getUsuarioActual() {
  let usuarioActual = null;
  try {
    usuarioActual = JSON.parse(localStorage.getItem('usuarioActual')) || null;
  } catch (e) {
    console.error('Error al obtener el usuario actual:', e);
  }
  return usuarioActual;
}

// Obtener registros de entradas y salidas
export function getRegistroEntradasSalidas() {
  let historial = [];
  try {
    historial = JSON.parse(localStorage.getItem('servicioHistorial')) || [];
  } catch (e) {
    console.error('Error al obtener el historial de servicios:', e);
  }
  return historial;
}

// Obtener estado de las mesas de salud
export function getMesasSalud() {
  // Obtener usuarios para conocer las mesas asignadas
  let usuarios = [];
  try {
    usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
  } catch (e) {
    console.error('Error al obtener usuarios:', e);
  }
  
  // Obtener historial de servicios para saber quién está activo
  let historial = [];
  try {
    historial = JSON.parse(localStorage.getItem('servicioHistorial')) || [];
  } catch (e) {
    console.error('Error al obtener historial de servicios:', e);
  }
  
  // Crear un mapa de mesas
  const mesasMap = new Map();
  
  // Inicializar mesas basándose en usuarios registrados
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
  
  // Verificar estado actual basándose en el historial
  historial.forEach(registro => {
    if (registro.mesa && !registro.salida) {
      // Si hay entrada pero no salida, está ocupada
      const mesa = parseInt(registro.mesa);
      if (mesasMap.has(mesa)) {
        mesasMap.get(mesa).estado = 'ocupada';
        mesasMap.get(mesa).ultimaActividad = registro.entrada;
      }
    }
  });
  
  // Si no hay mesas, mostrar mesas por defecto
  if (mesasMap.size === 0) {
    for (let i = 1; i <= 3; i++) {
      mesasMap.set(i, {
        numero: i,
        asignado: null,
        estado: 'en-servicio',
        ultimaActividad: null
      });
    }
  }
  
  // Convertir el mapa a un array ordenado
  return Array.from(mesasMap.values()).sort((a, b) => a.numero - b.numero);
}

// Función para registrar nueva actividad en el historial
export function registrarActividad(actividad) {
  let historial = [];
  try {
    historial = JSON.parse(localStorage.getItem('servicioHistorial')) || [];
  } catch (e) {
    console.error('Error al obtener el historial de servicios:', e);
  }
  
  historial.push(actividad);
  localStorage.setItem('servicioHistorial', JSON.stringify(historial));
  return historial;
}