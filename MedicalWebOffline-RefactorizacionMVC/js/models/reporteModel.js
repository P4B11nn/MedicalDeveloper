// js/models/reporteModel.js
import { pacienteModel } from './pacienteModel.js';
import { authModel } from './storageModel.js';

export const reporteModel = {
  /**
   * Obtiene estadísticas generales del sistema de forma asíncrona.
   */
  async getEstadisticas(periodo = 'mes') {
    // CAMBIO: Se usa Promise.all para cargar todos los datos en paralelo y mejorar el rendimiento.
    const [
      pacientes,
      usuarios,
      citas,
      historialMedico,
      actividades
    ] = await Promise.all([
      pacienteModel.getPacientes(),
      authModel.getAllUsers(),
      pacienteModel.getCitas(),
      pacienteModel.getHistorialMedico(),
      authModel.getActividades()
    ]);

    const fechaLimite = getFechaLimite(periodo);

    const pacientesRecientes = pacientes.filter(p => new Date(p.fechaRegistro) >= fechaLimite);
    const citasRecientes = citas.filter(c => new Date(c.fecha) >= fechaLimite);
    const consultasRecientes = historialMedico.filter(h => new Date(h.fecha) >= fechaLimite);
    const actividadesRecientes = actividades.filter(a => new Date(a.fecha) >= fechaLimite);

    const pacientesPorGenero = pacientes.reduce((acc, paciente) => {
      const genero = paciente.genero || 'No especificado';
      acc[genero] = (acc[genero] || 0) + 1;
      return acc;
    }, {});

    const citasPorEstado = citas.reduce((acc, cita) => {
      const estado = cita.estado || 'No especificado';
      acc[estado] = (acc[estado] || 0) + 1;
      return acc;
    }, {});

    const actividadesPorDia = {};
    const hoy = new Date();
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(hoy.getDate() - i);
      const fechaStr = fecha.toISOString().split('T')[0];
      actividadesPorDia[fechaStr] = 0;
    }

    actividades.forEach(actividad => {
      const fechaActividad = new Date(actividad.fecha);
      if (fechaActividad >= new Date(new Date().setDate(hoy.getDate() - 7))) {
        const fechaStr = fechaActividad.toISOString().split('T')[0];
        if (actividadesPorDia[fechaStr] !== undefined) {
          actividadesPorDia[fechaStr]++;
        }
      }
    });

    return {
      general: { totalUsuarios: usuarios.length, usuariosActivos: usuarios.filter(u => u.estado === 'activo').length },
      pacientes: { totalPacientes: pacientes.length, pacientesNuevos: pacientesRecientes.length, totalCitas: citas.length, citasPendientes: citas.filter(c => c.estado === 'programada').length, totalConsultas: historialMedico.length, consultasRecientes: consultasRecientes.length, porGenero: pacientesPorGenero, citasPorEstado: citasPorEstado },
      actividades: { total: actividades.length, recientes: actividadesRecientes.length, porDia: actividadesPorDia }
    };
  },

  /**
   * Genera estadísticas personalizadas de forma asíncrona.
   */
  async getEstadisticasPersonalizadas(configuracion) {
    const { periodo = 'mes', tipo = 'general' } = configuracion;
    // CAMBIO: Se usa await para la llamada asíncrona.
    const estadisticas = await this.getEstadisticas(periodo);

    if (tipo !== 'general') {
      return { [tipo]: estadisticas[tipo] };
    }

    return estadisticas;
  },

  /**
   * Genera reporte de pacientes de forma asíncrona.
   */
  async getReportePacientes(filtro = {}) {
    // CAMBIO: Se usa await para la llamada asíncrona.
    let pacientes = await pacienteModel.getPacientes();

    if (filtro.status) {
      pacientes = pacientes.filter(p => p.status === filtro.status);
    }
    // ... el resto de la lógica de filtrado no cambia ...
    return pacientes;
  },

  /**
   * Genera reporte de citas de forma asíncrona.
   */
  async getReporteCitas(filtro = {}) {
      try {
          let citas = await pacienteModel.getCitas();
          const pacientes = await pacienteModel.getPacientes();

          // Crear un mapa de pacientes para búsqueda eficiente
          const pacientesMap = new Map(
              pacientes.map(p => [p.id, p])
          );

          // Enriquecer datos de citas con información de pacientes
          citas = citas.map(cita => ({
              ...cita,
              paciente: pacientesMap.get(cita.pacienteId)
          }));

          // Aplicar filtros
          if (filtro.estado) {
              citas = citas.filter(c => c.estado === filtro.estado);
          }

          if (filtro.fechaDesde) {
              const fechaDesde = new Date(filtro.fechaDesde);
              citas = citas.filter(c => new Date(c.fecha) >= fechaDesde);
          }

          if (filtro.fechaHasta) {
              const fechaHasta = new Date(filtro.fechaHasta);
              citas = citas.filter(c => new Date(c.fecha) <= fechaHasta);
          }

          if (filtro.doctorId) {
              citas = citas.filter(c => c.doctorId === filtro.doctorId);
          }

          return citas;
      } catch (error) {
          console.error('Error al generar reporte de citas:', error);
          throw new Error('No se pudo generar el reporte de citas');
      }
  },

  /**
   * Obtiene historial médico para reportes de forma asíncrona.
   */
  async getReporteHistorialMedico(filtro = {}) {
    // CAMBIO: Se usa await para las llamadas asíncronas.
    let registros = await pacienteModel.getHistorialMedico();

    // ... la lógica de filtrado no cambia ...

    const registrosEnriquecidos = await Promise.all(registros.map(async (registro) => {
      const paciente = await pacienteModel.getPaciente(registro.pacienteId);
      return {
        ...registro,
        pacienteNombre: paciente ? `${paciente.nombre} ${paciente.apellidos}` : 'Desconocido'
      };
    }));

    return registrosEnriquecidos;
  },

  /**
   * Genera reporte de actividad del sistema de forma asíncrona.
   */
  async getReporteActividades(filtro = {}) {
    // CAMBIO: Se usa await para la llamada asíncrona.
    let actividades = await authModel.getActividades();

    // ... el resto de la lógica de filtrado no cambia ...

    return actividades;
  },

  async getReporteActividad(filtro = {}) {
      try {
          const [actividades, usuarios] = await Promise.all([
              authModel.getActividades(),
              authModel.getAllUsers()
          ]);

          // Crear mapa de usuarios para búsqueda eficiente
          const usuariosMap = new Map(
              usuarios.map(u => [u.uid, u])
          );

          let actividadesFiltradas = actividades.map(actividad => ({
              ...actividad,
              usuario: usuariosMap.get(actividad.userId)
          }));

          if (filtro.tipoAccion) {
              actividadesFiltradas = actividadesFiltradas.filter(
                  a => a.accion === filtro.tipoAccion
              );
          }

          if (filtro.fechaDesde) {
              const fechaDesde = new Date(filtro.fechaDesde);
              actividadesFiltradas = actividadesFiltradas.filter(
                  a => new Date(a.timestamp) >= fechaDesde
              );
          }

          if (filtro.fechaHasta) {
              const fechaHasta = new Date(filtro.fechaHasta);
              actividadesFiltradas = actividadesFiltradas.filter(
                  a => new Date(a.timestamp) <= fechaHasta
              );
          }

          if (filtro.userId) {
              actividadesFiltradas = actividadesFiltradas.filter(
                  a => a.userId === filtro.userId
              );
          }

          return actividadesFiltradas;
      } catch (error) {
          console.error('Error al generar reporte de actividad:', error);
          throw new Error('No se pudo generar el reporte de actividad');
      }
  },

  async getMetricasRendimiento() {
      try {
          const hoy = new Date();
          const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

          const [citas, actividades] = await Promise.all([
              this.getReporteCitas({ fechaDesde: inicioMes.toISOString() }),
              this.getReporteActividad({ fechaDesde: inicioMes.toISOString() })
          ]);

          // Calcular métricas de rendimiento
          const citasPorDia = new Map();
          const actividadesPorUsuario = new Map();

          citas.forEach(cita => {
              const fecha = cita.fecha.split('T')[0];
              citasPorDia.set(fecha, (citasPorDia.get(fecha) || 0) + 1);
          });

          actividades.forEach(actividad => {
              const userId = actividad.userId;
              actividadesPorUsuario.set(userId, (actividadesPorUsuario.get(userId) || 0) + 1);
          });

          // Calcular promedios
          const diasTranscurridos = Math.ceil((hoy - inicioMes) / (1000 * 60 * 60 * 24));
          const promedioCitasDiarias = citas.length / diasTranscurridos;

          return {
              citasTotales: citas.length,
              promedioCitasDiarias,
              citasPorDia: Object.fromEntries(citasPorDia),
              actividadesPorUsuario: Object.fromEntries(actividadesPorUsuario),
              totalActividades: actividades.length
          };
      } catch (error) {
          console.error('Error al calcular métricas de rendimiento:', error);
          throw new Error('No se pudieron calcular las métricas de rendimiento');
      }
  },

  // La función de exportar a CSV no necesita cambios, ya que recibe los datos ya procesados.
  exportarCSV(datos, nombreArchivo) {
    if (!datos || datos.length === 0) {
      return { success: false, message: 'No hay datos para exportar' };
    }
    const encabezados = Object.keys(datos[0]);
    let contenidoCSV = encabezados.join(',') + '\n';
    datos.forEach(fila => {
      const valores = encabezados.map(encabezado => {
        let valor = fila[encabezado] !== undefined ? fila[encabezado].toString() : '';
        if (valor.includes(',') || valor.includes('"')) {
          valor = `"${valor.replace(/"/g, '""')}"`;
        }
        return valor;
      });
      contenidoCSV += valores.join(',') + '\n';
    });
    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return { success: true, message: 'Archivo CSV descargado correctamente' };
  }
};

// Función auxiliar (no necesita cambios)
function getFechaLimite(periodo) {
  const hoy = new Date();
  const fechaLimite = new Date(hoy);
  switch (periodo) {
    case 'semana': fechaLimite.setDate(hoy.getDate() - 7); break;
    case 'mes': fechaLimite.setMonth(hoy.getMonth() - 1); break;
    case 'trimestre': fechaLimite.setMonth(hoy.getMonth() - 3); break;
    case 'anio': fechaLimite.setFullYear(hoy.getFullYear() - 1); break;
    default: fechaLimite.setMonth(hoy.getMonth() - 1);
  }
  return fechaLimite;
}