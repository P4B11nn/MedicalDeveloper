// js/models/reporteModel.js
import { pacienteModel } from './pacienteModel.js';
import { authModel } from './storageModel.js';

export const reporteModel = {
  // Obtener estadísticas generales del sistema
  getEstadisticas: async (periodo = 'mes') => {
    const pacientes = pacienteModel.getPacientes();
    const usuarios = await authModel.getAllUsers();
    const citas = pacienteModel.getCitas();
    const historialMedico = pacienteModel.getHistorialMedico();
    const actividades = await authModel.getActividades();
    
    // Fecha para filtrar por periodo
    const fechaLimite = getFechaLimite(periodo);
    
    // Filtrar datos por periodo si es necesario
    const pacientesRecientes = pacientes.filter(p => new Date(p.fechaRegistro) >= fechaLimite);
    const citasRecientes = citas.filter(c => new Date(c.fecha) >= fechaLimite);
    const consultasRecientes = historialMedico.filter(h => new Date(h.fecha) >= fechaLimite);
    const actividadesRecientes = actividades.filter(a => new Date(a.fecha) >= fechaLimite);
    
    // Estadísticas de género de pacientes
    const pacientesPorGenero = pacientes.reduce((acc, paciente) => {
      const genero = paciente.genero || 'No especificado';
      acc[genero] = (acc[genero] || 0) + 1;
      return acc;
    }, {});
    
    // Estadísticas de citas por estado
    const citasPorEstado = citas.reduce((acc, cita) => {
      const estado = cita.estado || 'No especificado';
      acc[estado] = (acc[estado] || 0) + 1;
      return acc;
    }, {});
    
    // Actividad por día (últimos 7 días)
    const actividadesPorDia = {};
    const hoy = new Date();
    
    // Inicializar los últimos 7 días
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date(hoy);
      fecha.setDate(fecha.getDate() - i);
      const fechaStr = fecha.toISOString().split('T')[0];
      actividadesPorDia[fechaStr] = 0;
    }
    
    // Contar actividades por día
    actividades.forEach(actividad => {
      const fechaActividad = new Date(actividad.fecha);
      // Solo contamos actividades de los últimos 7 días
      if (fechaActividad >= new Date(hoy.setDate(hoy.getDate() - 7))) {
        const fechaStr = fechaActividad.toISOString().split('T')[0];
        if (actividadesPorDia[fechaStr] !== undefined) {
          actividadesPorDia[fechaStr]++;
        }
      }
    });
    
    return {
      general: {
        totalUsuarios: usuarios.length,
        usuariosActivos: usuarios.filter(u => u.estado === 'activo').length
      },
      pacientes: {
        totalPacientes: pacientes.length,
        pacientesNuevos: pacientesRecientes.length,
        totalCitas: citas.length,
        citasPendientes: citas.filter(c => c.estado === 'programada').length,
        totalConsultas: historialMedico.length,
        consultasRecientes: consultasRecientes.length,
        porGenero: pacientesPorGenero,
        citasPorEstado: citasPorEstado
      },
      actividades: {
        total: actividades.length,
        recientes: actividadesRecientes.length,
        porDia: actividadesPorDia
      }
    };
  },
  
  // Generar estadísticas personalizadas
  getEstadisticasPersonalizadas: (configuracion) => {
    const { periodo = 'mes', tipo = 'general' } = configuracion;
    const estadisticas = reporteModel.getEstadisticas(periodo);
    
    // Si solo se quiere un tipo específico de estadísticas, lo filtramos
    if (tipo !== 'general') {
      return { [tipo]: estadisticas[tipo] };
    }
    
    return estadisticas;
  },
  
  // Generar reporte de pacientes
  getReportePacientes: (filtro = {}) => {
    let pacientes = pacienteModel.getPacientes();
    
    // Aplicar filtros
    if (filtro.status) {
      pacientes = pacientes.filter(p => p.status === filtro.status);
    }
    
    if (filtro.genero) {
      pacientes = pacientes.filter(p => p.genero === filtro.genero);
    }
    
    if (filtro.edadMin || filtro.edadMax) {
      pacientes = pacientes.filter(p => {
        if (!p.fechaNacimiento) return true;
        
        const fechaNac = new Date(p.fechaNacimiento);
        const hoy = new Date();
        const edad = hoy.getFullYear() - fechaNac.getFullYear();
        
        if (filtro.edadMin && edad < filtro.edadMin) return false;
        if (filtro.edadMax && edad > filtro.edadMax) return false;
        
        return true;
      });
    }
    
    // Ordenar resultados
    if (filtro.ordenarPor) {
      pacientes = pacientes.sort((a, b) => {
        const campo = filtro.ordenarPor;
        const direccion = filtro.direccion === 'desc' ? -1 : 1;
        
        if (campo === 'fechaNacimiento' || campo === 'fechaRegistro') {
          return (new Date(a[campo]) - new Date(b[campo])) * direccion;
        }
        
        if (a[campo] < b[campo]) return -1 * direccion;
        if (a[campo] > b[campo]) return 1 * direccion;
        return 0;
      });
    }
    
    return pacientes;
  },
  
  // Generar reporte de citas
  getReporteCitas: (filtro = {}) => {
    let citas = pacienteModel.getCitas();
    
    // Aplicar filtros
    if (filtro.estado) {
      citas = citas.filter(c => c.estado === filtro.estado);
    }
    
    if (filtro.fecha) {
      const fechaFiltro = new Date(filtro.fecha).toISOString().split('T')[0];
      citas = citas.filter(c => {
        const fechaCita = new Date(c.fecha).toISOString().split('T')[0];
        return fechaCita === fechaFiltro;
      });
    }
    
    if (filtro.rangoFechas) {
      const fechaInicio = new Date(filtro.rangoFechas.inicio);
      const fechaFin = new Date(filtro.rangoFechas.fin);
      
      citas = citas.filter(c => {
        const fechaCita = new Date(c.fecha);
        return fechaCita >= fechaInicio && fechaCita <= fechaFin;
      });
    }
    
    if (filtro.pacienteId) {
      citas = citas.filter(c => c.pacienteId === filtro.pacienteId);
    }
    
    // Ordenar resultados
    if (filtro.ordenarPor) {
      citas = citas.sort((a, b) => {
        const campo = filtro.ordenarPor;
        const direccion = filtro.direccion === 'desc' ? -1 : 1;
        
        if (campo === 'fecha') {
          return (new Date(a.fecha) - new Date(b.fecha)) * direccion;
        }
        
        if (a[campo] < b[campo]) return -1 * direccion;
        if (a[campo] > b[campo]) return 1 * direccion;
        return 0;
      });
    }
    
    // Enriquecer con datos de pacientes
    return citas.map(cita => {
      const paciente = pacienteModel.getPaciente(cita.pacienteId);
      return {
        ...cita,
        pacienteNombre: paciente ? `${paciente.nombre} ${paciente.apellidos}` : 'Desconocido'
      };
    });
  },
  
  // Obtener historial médico para reportes
  getReporteHistorialMedico: (filtro = {}) => {
    let registros = pacienteModel.getHistorialMedico();
    
    if (filtro.pacienteId) {
      registros = registros.filter(r => r.pacienteId === filtro.pacienteId);
    }
    
    if (filtro.rangoFechas) {
      const fechaInicio = new Date(filtro.rangoFechas.inicio);
      const fechaFin = new Date(filtro.rangoFechas.fin);
      
      registros = registros.filter(r => {
        const fechaRegistro = new Date(r.fecha);
        return fechaRegistro >= fechaInicio && fechaRegistro <= fechaFin;
      });
    }
    
    // Ordenar por fecha más reciente primero por defecto
    registros = registros.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    // Enriquecer con datos de pacientes
    return registros.map(registro => {
      const paciente = pacienteModel.getPaciente(registro.pacienteId);
      return {
        ...registro,
        pacienteNombre: paciente ? `${paciente.nombre} ${paciente.apellidos}` : 'Desconocido'
      };
    });
  },
  
  // Generar reporte de actividad del sistema (todos los registros)
  getReporteActividades: (filtro = {}) => {
    // Usar todos los registros generados por storageModel/authModel
    return authModel.getActividades(filtro);
  },
  
  // Exportar a CSV un conjunto de datos
  exportarCSV: (datos, nombreArchivo) => {
    if (!datos || datos.length === 0) {
      return { success: false, message: 'No hay datos para exportar' };
    }
    
    // Obtener encabezados
    const encabezados = Object.keys(datos[0]);
    
    // Crear contenido CSV
    let contenidoCSV = encabezados.join(',') + '\n';
    
    // Agregar filas
    datos.forEach(fila => {
      const valores = encabezados.map(encabezado => {
        // Escapar comas y comillas en los valores
        let valor = fila[encabezado] !== undefined ? fila[encabezado].toString() : '';
        if (valor.includes(',') || valor.includes('"')) {
          valor = `"${valor.replace(/"/g, '""')}"`;
        }
        return valor;
      });
      
      contenidoCSV += valores.join(',') + '\n';
    });
    
    // Crear Blob y URL
    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Crear enlace y disparar descarga
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return { success: true, message: 'Archivo CSV descargado correctamente' };
  }
};

// Función auxiliar para obtener la fecha límite según el periodo
function getFechaLimite(periodo) {
  const hoy = new Date();
  const fechaLimite = new Date(hoy);
  
  switch (periodo) {
    case 'semana':
      fechaLimite.setDate(hoy.getDate() - 7);
      break;
    case 'mes':
      fechaLimite.setMonth(hoy.getMonth() - 1);
      break;
    case 'trimestre':
      fechaLimite.setMonth(hoy.getMonth() - 3);
      break;
    case 'anio':
      fechaLimite.setFullYear(hoy.getFullYear() - 1);
      break;
    default:
      fechaLimite.setMonth(hoy.getMonth() - 1); // Por defecto, último mes
  }
  
  return fechaLimite;
}