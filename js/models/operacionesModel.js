// js/models/operacionesModel.js
import performanceMonitor from '../utils/performanceMonitor.js';

export function getRegistroEntradasSalidas() {
  return performanceMonitor.measureFunction('dataLoad', () => {
    try {
      let historial = JSON.parse(localStorage.getItem('servicioHistorial')) || [];
      
      console.log('OperacionesModel: Cargando historial real de actividades:', historial.length, 'registros');
      return historial;
    } catch (error) {
      console.error('Error cargando historial:', error);
      return [];
    }
  });
}

/**
 * Registra la entrada de un usuario
 */
export function registrarEntrada(usuario) {
  try {
    let historial = JSON.parse(localStorage.getItem('servicioHistorial')) || [];
    
    const registro = {
      id: `ES${Date.now()}`,
      nombre: usuario.nombre,
      matricula: usuario.matricula,
      mesa: usuario.mesa || 'No asignada',
      rol: usuario.rol,
      entrada: new Date().toLocaleString(),
      salida: null,
      duracion: 'En servicio'
    };
    
    historial.push(registro);
    localStorage.setItem('servicioHistorial', JSON.stringify(historial));
    
    console.log('OperacionesModel: Entrada registrada para', usuario.nombre);
    return registro;
  } catch (error) {
    console.error('Error registrando entrada:', error);
    return null;
  }
}

/**
 * Registra la salida de un usuario
 */
export function registrarSalida(usuarioId) {
  try {
    let historial = JSON.parse(localStorage.getItem('servicioHistorial')) || [];
    
    // Buscar el registro de entrada activo más reciente
    const registroActivo = historial
      .filter(r => r.matricula === usuarioId && r.salida === null)
      .sort((a, b) => new Date(b.entrada) - new Date(a.entrada))[0];
    
    if (registroActivo) {
      const salidaTime = new Date();
      const entradaTime = new Date(registroActivo.entrada);
      const duracionMs = salidaTime - entradaTime;
      const horas = Math.floor(duracionMs / (1000 * 60 * 60));
      const minutos = Math.floor((duracionMs % (1000 * 60 * 60)) / (1000 * 60));
      
      registroActivo.salida = salidaTime.toLocaleString();
      registroActivo.duracion = `${horas}h ${minutos}m`;
      
      localStorage.setItem('servicioHistorial', JSON.stringify(historial));
      
      console.log('OperacionesModel: Salida registrada para', registroActivo.nombre);
      return registroActivo;
    }
    
    return null;
  } catch (error) {
    console.error('Error registrando salida:', error);
    return null;
  }
}

/**
 * Elimina un registro específico por ID
 */
export function eliminarRegistro(registroId) {
  try {
    let historial = JSON.parse(localStorage.getItem('servicioHistorial')) || [];
    
    const initialLength = historial.length;
    historial = historial.filter(registro => registro.id !== registroId);
    
    if (historial.length < initialLength) {
      localStorage.setItem('servicioHistorial', JSON.stringify(historial));
      console.log('OperacionesModel: Registro eliminado:', registroId);
      return true;
    }
    
    console.warn('OperacionesModel: Registro no encontrado:', registroId);
    return false;
  } catch (error) {
    console.error('Error eliminando registro:', error);
    return false;
  }
}

/**
 * Limpiar todos los registros existentes
 */
export function limpiarRegistros() {
  try {
    localStorage.removeItem('servicioHistorial');
    console.log('OperacionesModel: Registros limpiados');
    return true;
  } catch (error) {
    console.error('Error limpiando registros:', error);
    return false;
  }
}

export function getMesasSalud() {
  try {
    let usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    const historial = getRegistroEntradasSalidas();
    const mesasMap = new Map();

    // Si no hay usuarios, crear datos de prueba
    if (usuarios.length === 0) {
      usuarios = [
        { id: 'U001', nombre: 'Juan Pérez', apellidos: '', mesa: 1, rol: 'admin' },
        { id: 'U002', nombre: 'María González', apellidos: '', mesa: 2, rol: 'practicante' },
        { id: 'U003', nombre: 'Carlos López', apellidos: '', mesa: 3, rol: 'practicante' }
      ];
      localStorage.setItem('usuarios', JSON.stringify(usuarios));
    }

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
  } catch (e) {
    console.error('Error al obtener mesas de salud:', e);
    return [];
  }
}

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
                const escaped = ('' + (row[header] || '')).replace(/"/g, '\\"');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        }

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log(`Archivo CSV exportado exitosamente: ${a.download}`);
        
    } catch (error) {
        console.error('Error durante la exportación CSV:', error);
        alert('Error al exportar los datos. Consulte la consola para más detalles.');
    }
}