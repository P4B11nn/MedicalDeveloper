// js/models/reporteModel.js
import { pacienteModel } from './pacienteModel.js';
import { authModel } from './storageModel.js';
import ActivityLogger from '../utils/activityLogger.js';

export const reporteModel = {
  // Obtener estadísticas generales del sistema
  getEstadisticas: async (periodo = 'mes') => {
    // Obtener datos desde los modelos (estos ya manejan Firestore + fallback)
    const pacientes = await pacienteModel.getPacientes();
    const usuarios = await authModel.getAllUsers();
    const citas = await pacienteModel.getCitas();
    const historialMedico = await pacienteModel.getHistorialMedico();
    const actividades = await ActivityLogger.getActivities({ limit: 100 });
    
    // Obtener registros médicos de Firebase para estadísticas más precisas
    const registrosMedicos = await pacienteModel.getHistorialMedico();
    
    // Fecha para filtrar por periodo
    const fechaLimite = getFechaLimite(periodo);
    
    // Filtrar datos por periodo si es necesario
    const pacientesRecientes = pacientes.filter(p => new Date(p.fechaRegistro) >= fechaLimite);
    const citasRecientes = citas.filter(c => new Date(c.fecha) >= fechaLimite);
    const consultasRecientes = historialMedico.filter(h => new Date(h.fecha) >= fechaLimite);
    const actividadesRecientes = actividades.filter(a => new Date(a.timestamp) >= fechaLimite);
    
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
  
  // Nueva función para obtener datos médicos para gráficas de evolución
  getEvolucionMedicaPaciente: async (pacienteId) => {
    try {
      console.log(`📊 Obteniendo evolución médica del paciente ${pacienteId}...`);
      
      // Obtener registros médicos específicos del paciente desde Firebase
      const registrosMedicos = await pacienteModel.getRegistrosMedicosPaciente(pacienteId);
      
      if (!registrosMedicos || registrosMedicos.length === 0) {
        console.log(`⚠️ No se encontraron registros médicos para el paciente ${pacienteId}`);
        return {
          temperatura: [],
          peso: [],
          talla: [],
          frecuenciaRespiratoria: [],
          presion: [],
          glucosa: []
        };
      }

      console.log(`📋 Procesando ${registrosMedicos.length} registros médicos para paciente ${pacienteId}:`, registrosMedicos);

      // Procesar y organizar los datos por parámetro
      const evolucion = {
        temperatura: [],
        peso: [],
        talla: [],
        frecuenciaRespiratoria: [],
        presion: [],
        glucosa: []
      };

      // Ordenar registros por fecha (usar timestamp o fecha)
      registrosMedicos.sort((a, b) => {
        const fechaA = new Date(a.timestamp?.toDate?.() || a.fecha?.toDate?.() || a.timestamp || a.fecha || 0);
        const fechaB = new Date(b.timestamp?.toDate?.() || b.fecha?.toDate?.() || b.timestamp || b.fecha || 0);
        return fechaA - fechaB;
      });

      registrosMedicos.forEach((registro, index) => {
        console.log(`🔍 Procesando registro ${index + 1}:`, registro);
        
        // Extraer fecha del registro (puede ser timestamp de Firestore)
        let fecha = null;
        if (registro.timestamp?.toDate) {
          fecha = registro.timestamp.toDate();
        } else if (registro.fecha?.toDate) {
          fecha = registro.fecha.toDate();
        } else if (registro.timestamp) {
          fecha = new Date(registro.timestamp);
        } else if (registro.fecha) {
          fecha = new Date(registro.fecha);
        }
        
        if (!fecha || isNaN(fecha.getTime())) {
          console.warn(`⚠️ Fecha inválida en registro ${index + 1}, saltando...`);
          return;
        }

        const fechaFormateada = fecha.toLocaleDateString('es-ES');
        const fechaRaw = fecha.toISOString();

        console.log(`📅 Procesando datos médicos del ${fechaFormateada}:`, registro.datosMedicos);

        // Extraer datos médicos de la estructura de Firebase
        const datosMedicos = registro.datosMedicos || {};

        // Temperatura corporal
        if (datosMedicos.temperatura_corporal && !isNaN(parseFloat(datosMedicos.temperatura_corporal))) {
          evolucion.temperatura.push({
            fecha: fechaFormateada,
            valor: parseFloat(datosMedicos.temperatura_corporal),
            fechaRaw: fechaRaw
          });
          console.log(`🌡️ Temperatura: ${datosMedicos.temperatura_corporal}°C`);
        }

        // Peso
        if (datosMedicos.peso && !isNaN(parseFloat(datosMedicos.peso))) {
          evolucion.peso.push({
            fecha: fechaFormateada,
            valor: parseFloat(datosMedicos.peso),
            fechaRaw: fechaRaw
          });
          console.log(`⚖️ Peso: ${datosMedicos.peso}kg`);
        }

        // Talla
        if (datosMedicos.talla && !isNaN(parseFloat(datosMedicos.talla))) {
          evolucion.talla.push({
            fecha: fechaFormateada,
            valor: parseFloat(datosMedicos.talla),
            fechaRaw: fechaRaw
          });
          console.log(`📏 Talla: ${datosMedicos.talla}cm`);
        }

        // Frecuencia respiratoria
        if (datosMedicos.frecuencia_respiratoria && !isNaN(parseFloat(datosMedicos.frecuencia_respiratoria))) {
          evolucion.frecuenciaRespiratoria.push({
            fecha: fechaFormateada,
            valor: parseFloat(datosMedicos.frecuencia_respiratoria),
            fechaRaw: fechaRaw
          });
          console.log(`🫁 Frecuencia respiratoria: ${datosMedicos.frecuencia_respiratoria}rpm`);
        }

        // Presión arterial
        if (datosMedicos.presion_arterial) {
          let presionValor = null;
          const presionStr = String(datosMedicos.presion_arterial).trim();
          
          if (presionStr.includes('/')) {
            const partes = presionStr.split('/');
            if (partes.length >= 2) {
              const sistolica = parseFloat(partes[0].trim());
              const diastolica = parseFloat(partes[1].trim());
              if (!isNaN(sistolica) && !isNaN(diastolica)) {
                presionValor = sistolica; // Usar presión sistólica para la gráfica principal
              }
            }
          } else if (!isNaN(parseFloat(presionStr))) {
            presionValor = parseFloat(presionStr);
          }

          if (presionValor !== null) {
            evolucion.presion.push({
              fecha: fechaFormateada,
              valor: presionValor,
              presionCompleta: datosMedicos.presion_arterial,
              fechaRaw: fechaRaw
            });
            console.log(`💓 Presión arterial: ${datosMedicos.presion_arterial}`);
          }
        }

        // Glucosa (no está en el ejemplo pero por si existe)
        if (datosMedicos.glucosa && !isNaN(parseFloat(datosMedicos.glucosa))) {
          evolucion.glucosa.push({
            fecha: fechaFormateada,
            valor: parseFloat(datosMedicos.glucosa),
            fechaRaw: fechaRaw
          });
          console.log(`🩸 Glucosa: ${datosMedicos.glucosa}mg/dL`);
        }
      });

      console.log(`✅ Evolución médica procesada para paciente ${pacienteId}:`, evolucion);
      
      // Verificar que tengamos datos para mostrar
      const totalPuntos = Object.values(evolucion).reduce((total, parametro) => total + parametro.length, 0);
      console.log(`📊 Total de puntos de datos extraídos: ${totalPuntos}`);
      
      return evolucion;

    } catch (error) {
      console.error('❌ Error obteniendo evolución médica del paciente:', error);
      return {
        temperatura: [],
        peso: [],
        talla: [],
        frecuenciaRespiratoria: [],
        presion: [],
        glucosa: []
      };
    }
  },

  // Función para obtener todos los pacientes con sus datos de evolución médica
  getTodosPacientesConEvolucion: async () => {
    try {
      console.log('📊 Obteniendo evolución médica de todos los pacientes...');
      
      const pacientes = await pacienteModel.getPacientes();
      console.log(`👥 Total de pacientes encontrados: ${pacientes.length}`);
      
      const pacientesConEvolucion = [];

      for (const paciente of pacientes) {
        console.log(`🔍 Procesando paciente: ${paciente.nombre} (ID: ${paciente.id})`);
        
        const evolucion = await reporteModel.getEvolucionMedicaPaciente(paciente.id);
        
        // Solo incluir pacientes que tengan al menos algunos datos médicos
        const tieneRegistros = Object.values(evolucion).some(parametro => parametro.length > 0);
        
        if (tieneRegistros) {
          const totalPuntos = Object.values(evolucion).reduce((total, parametro) => total + parametro.length, 0);
          console.log(`✅ Paciente ${paciente.nombre} incluido con ${totalPuntos} puntos de datos médicos`);
          
          pacientesConEvolucion.push({
            ...paciente,
            evolucionMedica: evolucion
          });
        } else {
          console.log(`⚠️ Paciente ${paciente.nombre} excluido - sin registros médicos`);
        }
      }

      console.log(`✅ ${pacientesConEvolucion.length} pacientes con datos médicos obtenidos de ${pacientes.length} total`);
      return pacientesConEvolucion;

    } catch (error) {
      console.error('❌ Error obteniendo pacientes con evolución médica:', error);
      return [];
    }
  },
  getEstadisticasPersonalizadas: async (configuracion) => {
    const { periodo = 'mes', tipo = 'general' } = configuracion;
    const estadisticas = await reporteModel.getEstadisticas(periodo);

    // Si solo se quiere un tipo específico de estadísticas, lo filtramos
    if (tipo !== 'general') {
      return { [tipo]: estadisticas[tipo] };
    }

    return estadisticas;
  },
  
  // Generar reporte de pacientes
  getReportePacientes: async (filtro = {}) => {
    let pacientes = await pacienteModel.getPacientes();
    
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
  getReporteCitas: async (filtro = {}) => {
    let citas = await pacienteModel.getCitas();
    
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
    
    // Enriquecer con datos de pacientes (asíncrono)
    const enriched = await Promise.all(citas.map(async (cita) => {
      const paciente = await pacienteModel.getPaciente(cita.pacienteId);
      return {
        ...cita,
        pacienteNombre: paciente ? `${paciente.nombre} ${paciente.apellidos}` : 'Desconocido'
      };
    }));

    return enriched;
  },
  
  // Obtener historial médico para reportes
  getReporteHistorialMedico: async (filtro = {}) => {
    let registros = await pacienteModel.getHistorialMedico();

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
    
    // Enriquecer con datos de pacientes (asíncrono)
    const enriched = await Promise.all(registros.map(async (registro) => {
      const paciente = await pacienteModel.getPaciente(registro.pacienteId);
      return {
        ...registro,
        pacienteNombre: paciente ? `${paciente.nombre} ${paciente.apellidos}` : 'Desconocido'
      };
    }));

    return enriched;
  },
  
  // Generar reporte de actividad del sistema (solo registros de storageModel)
  getReporteActividades: async (filtro = {}) => {
    try {
      // Usar el nuevo ActivityLogger para obtener actividades de Firebase
      console.log('📊 Obteniendo reporte de actividades con filtros:', filtro);
      
      // Convertir filtros del formato anterior al nuevo formato
      const activityFilters = {};
      
      if (filtro.fechaInicio) {
        activityFilters.fechaInicio = filtro.fechaInicio;
      }
      
      if (filtro.fechaFin) {
        activityFilters.fechaFin = filtro.fechaFin;
      }
      
      // Verificar si hay filtro de usuario
      if (filtro.usuarioNombre && filtro.usuarioNombre.trim() !== '') {
        // Buscar por nombre de usuario en el nuevo sistema
        // El select puede enviar "Nombre" o "Nombre (matricula)", pero en Firebase 
        // solo se guarda el nombre sin matrícula
        let nombreUsuario = filtro.usuarioNombre.trim();
        
        // Si el filtro incluye matrícula entre paréntesis, extraer solo el nombre
        const matchNombre = nombreUsuario.match(/^(.+?)\s*\([^)]+\)$/);
        if (matchNombre) {
          nombreUsuario = matchNombre[1].trim();
        }
        
        if (nombreUsuario && nombreUsuario.trim() !== '') {
          activityFilters.usuarioNombre = nombreUsuario;
        }
      }
      
      if (filtro.accion) {
        activityFilters.accion = filtro.accion;
      }
      
      if (filtro.modulo) {
        activityFilters.modulo = filtro.modulo;
      }
      
      // Pasar el límite si existe
      if (filtro.limit) {
        activityFilters.limit = filtro.limit;
      }
      
      console.log('🔍 Filtros convertidos para ActivityLogger:', activityFilters);
      
      // Obtener actividades usando el nuevo sistema
      const actividades = await ActivityLogger.getActivities(activityFilters);
      
      console.log(`📊 ActivityLogger devolvió ${actividades.length} actividades`);
      
      // Convertir al formato esperado por la vista
      const actividadesConvertidas = actividades.map(actividad => ({
        id: actividad.id,
        fecha: actividad.timestamp,
        usuario: actividad.usuarioNombre || actividad.usuarioMatricula,
        accion: actividad.accion,
        descripcion: actividad.descripcion,
        modulo: actividad.modulo,
        detalles: actividad.detalles,
        // Mantener compatibilidad con código anterior
        sistemaAuth: 'Firebase'
      }));
      
      console.log(`✅ Retornando ${actividadesConvertidas.length} actividades convertidas`);
      return actividadesConvertidas;
      
    } catch (error) {
      console.error('❌ Error obteniendo reporte de actividades:', error);
      
      // Fallback: usar método anterior si el nuevo falla
      try {
        console.log('🔄 Intentando fallback con authModel...');
        const actividades = await authModel.getActividades(filtro);
        return actividades.filter(a => a.sistemaAuth === 'JWT');
      } catch (fallbackError) {
        console.error('❌ Error en fallback de actividades:', fallbackError);
        return [];
      }
    }
  },
  
  // Exportar a PDF (abre una vista imprimible; el usuario puede elegir "Guardar como PDF").
  // Genera un layout tipo informe médico: encabezado con título de la app, cada registro como lista,
  // el campo 'id' se omite visualmente y se añade un pie de página.
  exportarPDF: async (datos, nombreArchivo) => {
    if (!datos || datos.length === 0) {
      return { success: false, message: 'No hay datos para exportar' };
    }
    const registros = Array.isArray(datos) ? datos : [datos];
    const appTitle = (typeof document !== 'undefined' && document.title) ? document.title : 'Medical App';

    // Helper: generar SVG simple (line) para una serie de valores {fecha,valor}
    function generarSVGSerie(puntos, opts = {}) {
      const width = opts.width || 520;
      const height = opts.height || 120;
      const padding = 20; // Aumentado para etiquetas
      
      // Debug: verificar datos recibidos
      console.log('🎨 generarSVGSerie recibió:', { 
        puntos: puntos?.length || 0, 
        primerosElementos: puntos?.slice(0, 3),
        formatosFecha: puntos?.slice(0, 3).map(p => ({ fecha: p.fecha, fechaRaw: p.fechaRaw }))
      });
      
      if (!puntos || puntos.length === 0) {
        return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="${width/2}" y="${height/2}" font-size="12" text-anchor="middle" fill="#888">Sin datos</text></svg>`;
      }

      // Extraer valores numéricos
      const vals = puntos.map(p => Number(p.valor)).filter(v => !isNaN(v));
      if (vals.length === 0) return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="${width/2}" y="${height/2}" font-size="12" text-anchor="middle" fill="#888">Sin datos numéricos</text></svg>`;

      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const range = max - min || 1;

      // Área de gráfico
      const chartWidth = width - padding * 2;
      const chartHeight = height - padding * 2;

      // Mapear puntos a coordenadas
      const stepX = chartWidth / (vals.length - 1 || 1);
      const coords = vals.map((v, i) => {
        const x = padding + i * stepX;
        const y = padding + chartHeight * (1 - (v - min) / range);
        return { x, y, v };
      });

      const pathD = coords.map((c, i) => (i === 0 ? `M ${c.x} ${c.y}` : `L ${c.x} ${c.y}`)).join(' ');

      // Build simple svg with area fill and path
      const stroke = opts.stroke || '#06b6d4';
      const fill = opts.fill || 'rgba(6,182,212,0.12)';

      // Area path (close to bottom)
      const areaD = coords.map((c, i) => (i === 0 ? `M ${c.x} ${c.y}` : `L ${c.x} ${c.y}`)).join(' ') + ` L ${padding + (coords.length - 1) * stepX} ${padding + chartHeight} L ${padding} ${padding + chartHeight} Z`;

      // Generar cuadrícula del eje Y (5 líneas horizontales)
      let gridY = '';
      for (let i = 0; i <= 4; i++) {
        const y = padding + (chartHeight * i / 4);
        const valor = max - (range * i / 4);
        gridY += `<line x1="${padding}" y1="${y}" x2="${padding + chartWidth}" y2="${y}" stroke="#e5e7eb" stroke-width="0.5"/>`;
        gridY += `<text x="${padding - 5}" y="${y + 3}" font-size="9" text-anchor="end" fill="#6b7280">${valor.toFixed(1)}</text>`;
      }

      // Generar cuadrícula del eje X (máximo 6 puntos para no sobrecargar)
      let gridX = '';
      const maxXPoints = Math.min(6, puntos.length);
      const xStep = Math.max(1, Math.floor(puntos.length / maxXPoints));
      for (let i = 0; i < puntos.length; i += xStep) {
        const x = padding + i * stepX;
        gridX += `<line x1="${x}" y1="${padding}" x2="${x}" y2="${padding + chartHeight}" stroke="#e5e7eb" stroke-width="0.5"/>`;
        
        // Mejorar formateo de fecha con validación
        let fecha = `P${i+1}`;
        try {
          if (puntos[i].fechaRaw) {
            // Usar fechaRaw si está disponible (formato ISO)
            fecha = new Date(puntos[i].fechaRaw).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
          } else if (puntos[i].fecha) {
            // Intentar parsear fecha formateada, manejando formato DD/MM/YYYY
            const fechaStr = String(puntos[i].fecha);
            if (fechaStr.includes('/')) {
              const partes = fechaStr.split('/');
              if (partes.length === 3) {
                // Asumir formato DD/MM/YYYY y convertir a MM/DD/YYYY para Date()
                const fechaISO = `${partes[2]}-${partes[1].padStart(2,'0')}-${partes[0].padStart(2,'0')}`;
                const fechaObj = new Date(fechaISO);
                if (!isNaN(fechaObj.getTime())) {
                  fecha = fechaObj.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
                }
              }
            } else {
              // Intentar parseo directo
              const fechaObj = new Date(fechaStr);
              if (!isNaN(fechaObj.getTime())) {
                fecha = fechaObj.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
              }
            }
          }
        } catch (e) {
          console.warn('Error formateando fecha:', puntos[i].fecha, e);
          fecha = `P${i+1}`;
        }
        
        gridX += `<text x="${x}" y="${padding + chartHeight + 15}" font-size="8" text-anchor="middle" fill="#6b7280">${fecha}</text>`;
      }

      const gradientId = `g${Math.random().toString(36).slice(2,8)}`;

      return `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background:transparent">
          <defs>
            <linearGradient id="${gradientId}" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stop-color="${stroke}" stop-opacity="0.18" />
              <stop offset="100%" stop-color="${stroke}" stop-opacity="0" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="transparent" />
          
          <!-- Cuadrícula -->
          ${gridY}
          ${gridX}
          
          <!-- Área y línea -->
          <path d="${areaD}" fill="url(#${gradientId})" stroke="none" />
          <path d="${pathD}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          
          <!-- Puntos de datos -->
          ${coords.map(c => `<circle cx="${c.x}" cy="${c.y}" r="2" fill="${stroke}" stroke="white" stroke-width="1"/>`).join('')}
        </svg>
      `;
    }

    // Generador de SVG para presión arterial combinada (muestra ambos valores y etiqueta "SYS/DIA" en cada punto)
    function generarSVGPresionCombinada(puntos, opts = {}) {
      const width = opts.width || 520;
      const height = opts.height || 120;
      const padding = 25; // Aumentado para etiquetas más grandes
      
      // Debug: verificar datos recibidos
      console.log('🩺 generarSVGPresionCombinada recibió:', { 
        puntos: puntos?.length || 0, 
        primerosElementos: puntos?.slice(0, 3),
        formatosFecha: puntos?.slice(0, 3).map(p => ({ fecha: p.fecha, fechaRaw: p.fechaRaw }))
      });
      
      if (!puntos || puntos.length === 0) {
        return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="${width/2}" y="${height/2}" font-size="12" text-anchor="middle" fill="#888">Sin datos</text></svg>`;
      }

      // Extraer valores numéricos para escalado (usar ambos sys y dia)
      const valsSys = puntos.map(p => Number(p.systolic)).filter(v => !isNaN(v));
      const valsDia = puntos.map(p => Number(p.diastolic)).filter(v => !isNaN(v));
      const allVals = valsSys.concat(valsDia);
      if (allVals.length === 0) return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="${width/2}" y="${height/2}" font-size="12" text-anchor="middle" fill="#888">Sin datos numéricos</text></svg>`;

      const min = Math.min(...allVals);
      const max = Math.max(...allVals);
      const range = max - min || 1;

      // Área de gráfico
      const chartWidth = width - padding * 2;
      const chartHeight = height - padding * 2;

      const stepX = chartWidth / (puntos.length - 1 || 1);
      const coordsSys = puntos.map((p, i) => ({ 
        x: padding + i * stepX, 
        y: padding + chartHeight * (1 - ((Number(p.systolic) - min) / range)), 
        v: p.systolic 
      }));
      const coordsDia = puntos.map((p, i) => ({ 
        x: padding + i * stepX, 
        y: padding + chartHeight * (1 - ((Number(p.diastolic) - min) / range)), 
        v: p.diastolic 
      }));

      const pathSys = coordsSys.map((c, i) => (i === 0 ? `M ${c.x} ${c.y}` : `L ${c.x} ${c.y}`)).join(' ');
      const pathDia = coordsDia.map((c, i) => (i === 0 ? `M ${c.x} ${c.y}` : `L ${c.x} ${c.y}`)).join(' ');

      // Generar cuadrícula del eje Y (5 líneas horizontales)
      let gridY = '';
      for (let i = 0; i <= 4; i++) {
        const y = padding + (chartHeight * i / 4);
        const valor = max - (range * i / 4);
        gridY += `<line x1="${padding}" y1="${y}" x2="${padding + chartWidth}" y2="${y}" stroke="#e5e7eb" stroke-width="0.5"/>`;
        gridY += `<text x="${padding - 5}" y="${y + 3}" font-size="9" text-anchor="end" fill="#6b7280">${valor.toFixed(0)}</text>`;
      }

      // Generar cuadrícula del eje X
      let gridX = '';
      const maxXPoints = Math.min(6, puntos.length);
      const xStep = Math.max(1, Math.floor(puntos.length / maxXPoints));
      for (let i = 0; i < puntos.length; i += xStep) {
        const x = padding + i * stepX;
        gridX += `<line x1="${x}" y1="${padding}" x2="${x}" y2="${padding + chartHeight}" stroke="#e5e7eb" stroke-width="0.5"/>`;
        
        // Mejorar formateo de fecha con validación (mismo que generarSVGSerie)
        let fecha = `P${i+1}`;
        try {
          if (puntos[i].fechaRaw) {
            // Usar fechaRaw si está disponible (formato ISO)
            fecha = new Date(puntos[i].fechaRaw).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
          } else if (puntos[i].fecha) {
            // Intentar parsear fecha formateada, manejando formato DD/MM/YYYY
            const fechaStr = String(puntos[i].fecha);
            if (fechaStr.includes('/')) {
              const partes = fechaStr.split('/');
              if (partes.length === 3) {
                // Asumir formato DD/MM/YYYY y convertir a MM/DD/YYYY para Date()
                const fechaISO = `${partes[2]}-${partes[1].padStart(2,'0')}-${partes[0].padStart(2,'0')}`;
                const fechaObj = new Date(fechaISO);
                if (!isNaN(fechaObj.getTime())) {
                  fecha = fechaObj.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
                }
              }
            } else {
              // Intentar parseo directo
              const fechaObj = new Date(fechaStr);
              if (!isNaN(fechaObj.getTime())) {
                fecha = fechaObj.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
              }
            }
          }
        } catch (e) {
          console.warn('Error formateando fecha en presión:', puntos[i].fecha, e);
          fecha = `P${i+1}`;
        }
        
        gridX += `<text x="${x}" y="${padding + chartHeight + 15}" font-size="8" text-anchor="middle" fill="#6b7280">${fecha}</text>`;
      }

      // Labels: min/max
      const minLabel = min.toFixed(0);
      const maxLabel = max.toFixed(0);

      // Build SVG with two lines and combined labels at each point
      let pointsLabels = '';
      puntos.forEach((p, i) => {
        const cs = coordsSys[i];
        const cd = coordsDia[i];
        const label = (p.systolic || p.diastolic) ? `${p.systolic || '-'}/${p.diastolic || '-'}` : '-';
        // Posicionar etiqueta encima del punto más alto con más espacio
        const topY = Math.min(cs.y, cd.y) - 12;
        pointsLabels += `<text x="${cs.x}" y="${topY}" font-size="9" text-anchor="middle" fill="#0f172a" font-weight="500">${label}</text>`;
      });

      return `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="background:transparent">
          <rect width="100%" height="100%" fill="transparent" />
          
          <!-- Cuadrícula -->
          ${gridY}
          ${gridX}
          
          <!-- Líneas de presión -->
          <path d="${pathDia}" fill="none" stroke="#a78bfa" stroke-width="2" stroke-dasharray="4 2" stroke-linecap="round" stroke-linejoin="round" />
          <path d="${pathSys}" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          
          <!-- Puntos de datos -->
          ${coordsSys.map(c => `<circle cx="${c.x}" cy="${c.y}" r="2.5" fill="#7c3aed" stroke="white" stroke-width="1"/>`).join('')}
          ${coordsDia.map(c => `<circle cx="${c.x}" cy="${c.y}" r="2.5" fill="#a78bfa" stroke="white" stroke-width="1"/>`).join('')}
          
          <!-- Etiquetas de valores -->
          ${pointsLabels}
          
          <!-- Leyenda -->
          <text x="${padding}" y="${height - 5}" font-size="9" fill="#7c3aed">● Sistólica</text>
          <text x="${padding + 60}" y="${height - 5}" font-size="9" fill="#a78bfa">● Diastólica</text>
        </svg>
      `;
    }

    // Intentar capturar canvases de Chart.js para fidelidad visual.
    // Construiremos un mapa patientId -> { paramKey: dataURL }
    function capturarGraficasPaciente(pacienteId) {
      const keys = ['peso','imc','presion','glucosa','frecuencia','frecuenciaRespiratoria','presion_sistolica','presion_diastolica','temperatura','talla'];
      const out = {};
      if (!pacienteId) return out;
      keys.forEach(k => {
        // Comprobar varios patrones de id usados en la vista
        const idsToTry = [
          `chart-${pacienteId}-${k}`,
          `chart-single-${pacienteId}-${k}`,
          `chart-${pacienteId}-${k.toLowerCase()}`
        ];
        for (const id of idsToTry) {
          try {
            const el = document.getElementById(id);
            if (el && el.tagName && el.tagName.toLowerCase() === 'canvas') {
              try { out[k] = el.toDataURL('image/png'); break; } catch (e) { /* cross-origin or other */ }
            }
          } catch (e) { /* noop */ }
        }
      });
      // También intentar localizar un canvas genérico dentro del contenedor del paciente
      try {
        const container = document.querySelector(`#patient-params-${pacienteId}`) || document.querySelector(`#patient-params-single-${pacienteId}`) || document.querySelector(`#patient-params-${pacienteId}`);
        if (container) {
          const canv = container.querySelector('canvas');
          if (canv && canv.toDataURL) {
            out['any'] = canv.toDataURL('image/png');
          }
        }
      } catch (e) {}
      return out;
    }

    const imagesMap = {};
    try {
      registros.forEach(r => {
        const pid = (r && r.paciente && (r.paciente.id || r.paciente.matricula)) || (r && (r.id || r.matricula || r.pacienteId));
        if (pid) imagesMap[pid] = capturarGraficasPaciente(pid);
      });
    } catch (e) { /* noop */ }

    let html = `<!doctype html><html><head><meta charset="utf-8"><title>${nombreArchivo}</title>`;
    html += `<style>
      body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#111;background:#fff}
      header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:1px solid #eee;padding-bottom:8px}
      header .branding{display:flex;align-items:center;gap:12px}
      header h1{font-size:18px;margin:0}
      header .meta{font-size:12px;color:#666}
      footer{position:fixed;left:0;right:0;bottom:0;padding:8px 24px;font-size:11px;color:#666;border-top:1px solid #eee;background:#fff}
      section.record{page-break-inside:avoid;margin-bottom:18px;padding:12px;border:1px solid #f0f0f0;border-radius:6px;background:#fff;position:relative}
      section.record h2{margin:0 0 8px 0;font-size:16px}
      ul.record-list{list-style:none;padding:0;margin:0;display:block}
      ul.record-list li{padding:4px 0;border-bottom:1px dashed #f3f3f3;font-size:13px}
      ul.record-list li strong{display:inline-block;width:160px;color:#374151}
      .graphs-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;align-items:start;margin-top:8px}
      .graphs-grid .graph-card{background:#fff;border:1px solid #f3f4f6;border-radius:6px;padding:8px}
      .patient-photo{position:absolute;right:16px;top:16px;width:96px;height:96px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;background:#f3f4f6;display:flex;align-items:center;justify-content:center}
      .patient-photo img{width:100%;height:100%;object-fit:cover}
    </style>`;
    html += `</head><body>`;

    html += `<header><h1>${appTitle}</h1><div class="meta">Exportado: ${new Date().toLocaleString()}</div></header>`;

  for (let idx = 0; idx < registros.length; idx++) {
      const fila = registros[idx];
      // Si el registro es un objeto enriquecido para exportar historial de un paciente
      if (fila && fila.paciente && fila.parametrosSeries) {
        const paciente = fila.paciente || {};
        html += `<section class="record" style="position:relative">`;
        const tituloP = `${paciente.nombre || paciente.pacienteNombre || 'Paciente'} ${paciente.apellidos || ''}`.trim();
        // Área para fotografía del paciente (arriba derecha). Si existe url en paciente.photo/paciente.foto/paciente.imagen la mostramos; si no, silueta gris.
        try {
          const photoSrc = paciente.photo || paciente.photoUrl || paciente.foto || paciente.imagen || null;

          
          if (photoSrc) {
            html += `<div style="position:absolute;right:16px;top:16px;width:96px;height:96px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;background:#fff"><img src="${photoSrc}" style="width:100%;height:100%;object-fit:cover"/></div>`;
          } else {
            html += `<div style="position:absolute;right:16px;top:16px;width:96px;height:96px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#f3f4f6"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5z" fill="#9CA3AF"/><path d="M3 20c0-3.866 3.582-7 9-7s9 3.134 9 7v1H3v-1z" fill="#D1D5DB"/></svg></div>`;
          }
        } catch (e) { /* noop */ }

        html += `<h2>${tituloP}</h2>`;

        // Información básica del paciente
        html += `<ul class="record-list">`;
        if (paciente.matricula) html += `<li><strong>Matrícula:</strong> ${paciente.matricula}</li>`;
        if (paciente.fechaNacimiento) html += `<li><strong>Fecha de Nacimiento:</strong> ${paciente.fechaNacimiento}</li>`;
        if (paciente.facultad) html += `<li><strong>Facultad:</strong> ${paciente.facultad}</li>`;
        if (paciente.carrera) html += `<li><strong>Carrera:</strong> ${paciente.carrera}</li>`;
        html += `</ul>`;

  // Sección de gráficas por parámetro (usar imagen de canvas si está disponible para fidelidad)
  html += `<div style="margin-top:12px"><h3>Gráficas por parámetro</h3><div class="graphs-grid">`;
        const ps = fila.parametrosSeries || {};
        const pid = paciente.id || paciente.matricula || paciente.pacienteId || paciente.pacienteNombre || tituloP;
        const imgs = imagesMap[pid] || {};

        // Debug: verificar datos de parámetros
        console.log('📈 Datos para gráficas PDF:', { 
          pacienteId: pid, 
          parametrosSeries: ps,
          tieneImagenes: Object.keys(imgs).length > 0,
          parametrosConDatos: Object.entries(ps).filter(([k,v]) => Array.isArray(v) && v.length > 0).map(([k,v]) => `${k}: ${v.length} puntos`)
        });

        // Helper para renderizar imagen o fallback SVG
        const renderImgOrSVG = (imgKey, svgHtml) => {
          if (imgs && imgs[imgKey]) return `<div><img src="${imgs[imgKey]}" style="max-width:520px;height:auto;display:block;border:1px solid #eee;border-radius:4px"/></div>`;
          if (imgs && imgs['any']) return `<div><img src="${imgs['any']}" style="max-width:520px;height:auto;display:block;border:1px solid #eee;border-radius:4px"/></div>`;
          return svgHtml;
        };

        // temperatura
        html += `<div style="margin:8px 0"><strong>Temperatura (°C)</strong><div>${renderImgOrSVG('temperatura', generarSVGSerie(ps.temperatura || [], { width:520, height:120, stroke: '#ef4444' }))}</div></div>`;
        // peso
        html += `<div style="margin:8px 0"><strong>Peso (kg)</strong><div>${renderImgOrSVG('peso', generarSVGSerie(ps.peso || [], { width:520, height:120, stroke: '#10b981' }))}</div></div>`;
        // talla
        html += `<div style="margin:8px 0"><strong>Talla (cm)</strong><div>${renderImgOrSVG('talla', generarSVGSerie(ps.talla || [], { width:520, height:120, stroke: '#3b82f6' }))}</div></div>`;
        // IMC (calcular a partir de peso/talla si no existe explícitamente)
        try {
          const tallaMap = {};
          (ps.talla || []).forEach(t => { if (t && t.fecha) tallaMap[t.fecha] = Number(t.valor); });
          let lastT = null;
          const imcSeries = (ps.peso || []).map(p => {
            const f = p.fecha; const pesoV = Number(p.valor);
            if (tallaMap[f]) lastT = tallaMap[f];
            const tallaV = lastT || (ps.talla && ps.talla.length ? Number(ps.talla[ps.talla.length - 1].valor) : null);
            const imc = (pesoV && tallaV) ? parseFloat((pesoV / Math.pow((tallaV/100),2)).toFixed(1)) : null;
            return imc !== null ? { fecha: f, valor: imc } : null;
          }).filter(x=>x);
          html += `<div style="margin:8px 0"><strong>IMC</strong><div>${renderImgOrSVG('imc', generarSVGSerie(imcSeries || [], { width:520, height:120, stroke: '#8b5cf6' }))}</div></div>`;
        } catch(e) { /* noop */ }

        // glucosa
        html += `<div style="margin:8px 0"><strong>Glucosa (mg/dL)</strong><div>${renderImgOrSVG('glucosa', generarSVGSerie(ps.glucosa || [], { width:520, height:120, stroke: '#f97316' }))}</div></div>`;

        // frecuencia respiratoria
        html += `<div style="margin:8px 0"><strong>Frecuencia Respiratoria (rpm)</strong><div>${renderImgOrSVG('frecuencia', generarSVGSerie(ps.frecuenciaRespiratoria || [], { width:520, height:120, stroke: '#f59e0b' }))}</div></div>`;

        // presión combinada (usar imagen si existe)
        try {
          const combined = [];
          if (ps.presion && Array.isArray(ps.presion) && ps.presion.length) {
            ps.presion.forEach(p => {
              const v = String(p.valor || p).trim();
              const m = v.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
              combined.push({ fecha: p.fecha, systolic: m ? Number(m[1]) : (isFinite(Number(p.valor))?Number(p.valor):null), diastolic: m ? Number(m[2]) : null });
            });
          } else if ((ps.presion_sistolica || []).length || (ps.presion_diastolica || []).length) {
            const byFechaSys = {};
            (ps.presion_sistolica || []).forEach(s => { if (s && s.fecha) byFechaSys[s.fecha] = Number(s.valor); });
            const byFechaDia = {};
            (ps.presion_diastolica || []).forEach(d => { if (d && d.fecha) byFechaDia[d.fecha] = Number(d.valor); });
            const fechas = new Set([...Object.keys(byFechaSys), ...Object.keys(byFechaDia)]);
            Array.from(fechas).sort().forEach(f => { combined.push({ fecha: f, systolic: byFechaSys[f] || null, diastolic: byFechaDia[f] || null }); });
          }
          html += `<div style="margin:8px 0"><strong>Presión Arterial (Sistólica/Diastólica)</strong><div>${renderImgOrSVG('presion', generarSVGPresionCombinada(combined || [], { width:520, height:120 }))}</div></div>`;
        } catch(e) { /* noop */ }
  html += `</div></div>`;

        // Observaciones del personal médico
        html += `<div style="margin-top:12px"><h3>Observaciones del personal médico</h3>`;
        const obs = fila.observaciones || [];

        // Helper to render a list of observations
        function renderObsList(arr) {
          let out = '';
          out += `<ul class="record-list">`;
          arr.forEach(o => {
            const f = o && o.fecha ? new Date(o.fecha).toLocaleString() : '';
            out += `<li><strong>${f}</strong> — ${String(o.texto)}</li>`;
          });
          out += `</ul>`;
          return out;
        }

        // If obs is an array (legacy), render as before
        if (Array.isArray(obs)) {
          if (obs.length === 0) {
            html += `<div class="muted-text">No hay observaciones registradas.</div>`;
          } else {
            html += renderObsList(obs);
          }
        } else if (typeof obs === 'object' && obs !== null) {
          // Expecting grouped object: { examenVista: [], examenOido: [], general: [] }
          const gv = obs;
          const hasVista = gv.examenVista && gv.examenVista.length;
          const hasOido = gv.examenOido && gv.examenOido.length;
          const hasGen = gv.general && gv.general.length;

          if (!hasVista && !hasOido && !hasGen) {
            html += `<div class="muted-text">No hay observaciones registradas.</div>`;
          } else {
            // Examen de Oído
            if (hasOido) {
              html += `<div style="margin-top:8px"><h4>Examen de Oído</h4>`;
              html += renderObsList(gv.examenOido);
              html += `</div>`;
            }

            // Examen de Vista
            if (hasVista) {
              html += `<div style="margin-top:8px"><h4>Examen de Vista</h4>`;
              html += renderObsList(gv.examenVista);
              html += `</div>`;
            }

            // Observaciones generales
            if (hasGen) {
              html += `<div style="margin-top:8px"><h4>Observación General</h4>`;
              html += renderObsList(gv.general);
              html += `</div>`;
            }
          }
        } else {
          html += `<div class="muted-text">No hay observaciones registradas.</div>`;
        }

        html += `</div>`;

        // Historial: listado cronológico si existe
        const hist = fila.historial || [];
        if (hist.length > 0) {
          html += `<div style="margin-top:12px"><h3>Historial</h3><ul class="record-list">`;
          hist.forEach(r => {
            const f = r.fecha ? new Date(r.fecha).toLocaleString() : '';
            const tipo = r.tipo || '';
            const notas = r.notas || r.descripcion || '';
            html += `<li><strong>${f} • ${tipo}</strong><div style="margin-left:8px;color:#333">${String(notas)}</div></li>`;
          });
          html += `</ul></div>`;
        }

        html += `</section>`;
        continue; // pasar al siguiente
      }

      // Comportamiento por defecto (anteriores formatos)
      html += `<section class="record" style="position:relative">`;
      const titulo = (fila.nombre || fila.pacienteNombre) ? `${fila.nombre || fila.pacienteNombre} ${fila.apellidos || ''}`.trim() : (fila.matricula || fila.pacienteNombre || `Registro ${idx + 1}`);
      // Marco de fotografía genérico para registros/pacientes (arriba derecha)
      try {
        const photoSrcDefault = fila.photo || fila.photoUrl || fila.foto || fila.imagen || null;
        if (photoSrcDefault) {
          html += `<div style="position:absolute;right:16px;top:16px;width:96px;height:96px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;background:#fff"><img src="${photoSrcDefault}" style="width:100%;height:100%;object-fit:cover"/></div>`;
        } else {
          html += `<div style="position:absolute;right:16px;top:16px;width:96px;height:96px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#f3f4f6"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5z" fill="#9CA3AF"/><path d="M3 20c0-3.866 3.582-7 9-7s9 3.134 9 7v1H3v-1z" fill="#D1D5DB"/></svg></div>`;
        }
      } catch (e) { /* noop */ }

      html += `<h2>${titulo}</h2>`;
      html += `<ul class="record-list">`;

      Object.keys(fila).forEach(key => {
        const keyLower = key.toLowerCase();
        // ocultar campos de identificación que no deben verse en el PDF
        if (keyLower === 'id' || keyLower === 'pacienteid' || keyLower === 'paciente_id') return;

        let label = key;
        const labels = {
          matricula: 'Matrícula', nombre: 'Nombre', apellidos: 'Apellidos', fechaNacimiento: 'Fecha de Nacimiento', grado: 'Grado', grupo: 'Grupo', facultad: 'Facultad', carrera: 'Carrera', telefono: 'Teléfono', antecedentes: 'Antecedentes', fechaRegistro: 'Fecha de Registro', usuarioRegistro: 'Usuario Registro', pacienteNombre: 'Paciente', tipo: 'Tipo', fecha: 'Fecha', descripcion: 'Descripción'
        };
        if (labels[key]) label = labels[key];

        let valor = fila[key];
        if (valor === null || valor === undefined || valor === '') valor = '-';
        if (typeof valor === 'object' && !Array.isArray(valor)) {
          if (valor.temperatura || valor.presion || valor.peso || valor.talla) {
            const parts = [];
            if (valor.temperatura) parts.push(`Temperatura: ${valor.temperatura}°C`);
            if (valor.presion) parts.push(`Presión: ${valor.presion}`);
            if (valor.peso) parts.push(`Peso: ${valor.peso} kg`);
            if (valor.talla) parts.push(`Talla: ${valor.talla} cm`);
            valor = parts.join(' • ');
          } else {
            try { valor = JSON.stringify(valor); } catch (e) { valor = String(valor); }
          }
        }

        html += `<li><strong>${label}:</strong> ${String(valor)}</li>`;
      });

      html += `</ul>`;

      // Si el objeto paciente tiene historialCambios o datosMedicos, generar gráficas y observaciones
      const posiblePacienteId = fila.id || fila.matricula || fila.pacienteId;
      const tieneCambios = Array.isArray(fila.historialCambios) && fila.historialCambios.length > 0;
      const tieneDatosMedicos = fila.datosMedicos && Object.keys(fila.datosMedicos).length > 0;
      if (tieneCambios || tieneDatosMedicos) {
        // Construir series
        const ps = { temperatura: [], peso: [], talla: [], frecuenciaRespiratoria: [], presion_combined: [], glucosa: [] };

        (fila.historialCambios || []).forEach(cambio => {
          const fecha = cambio.fecha || cambio.datos?.fechaRegistroMedico || null;
          const datos = cambio.datos || cambio;
          if (datos.temperatura) ps.temperatura.push({ fecha, valor: parseFloat(datos.temperatura) });
          if (datos.peso) ps.peso.push({ fecha, valor: parseFloat(datos.peso) });
          if (datos.talla) ps.talla.push({ fecha, valor: parseFloat(datos.talla) });
          if (datos.frecuenciaRespiratoria) ps.frecuenciaRespiratoria.push({ fecha, valor: parseFloat(datos.frecuenciaRespiratoria) });
          if (datos.glucosa) ps.glucosa.push({ fecha, valor: parseFloat(datos.glucosa) });
          if (datos.presion) {
            const m = String(datos.presion).match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
            if (m) { ps.presion_combined.push({ fecha, systolic: parseInt(m[1]), diastolic: parseInt(m[2]) }); }
            else if (!isNaN(Number(datos.presion))) { ps.presion_combined.push({ fecha, systolic: Number(datos.presion), diastolic: null }); }
          }
        });

        // incluir datosMedicos actuales
        if (fila.datosMedicos && fila.datosMedicos.fechaRegistroMedico) {
          const dm = fila.datosMedicos;
          const fecha = dm.fechaRegistroMedico;
          if (dm.temperatura) ps.temperatura.push({ fecha, valor: parseFloat(dm.temperatura) });
          if (dm.peso) ps.peso.push({ fecha, valor: parseFloat(dm.peso) });
          if (dm.talla) ps.talla.push({ fecha, valor: parseFloat(dm.talla) });
          if (dm.frecuenciaRespiratoria) ps.frecuenciaRespiratoria.push({ fecha, valor: parseFloat(dm.frecuenciaRespiratoria) });
          if (dm.glucosa) ps.glucosa.push({ fecha, valor: parseFloat(dm.glucosa) });
          if (dm.presion) {
            const m = String(dm.presion).match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
            if (m) { ps.presion_combined.push({ fecha, systolic: parseInt(m[1]), diastolic: parseInt(m[2]) }); }
            else if (!isNaN(Number(dm.presion))) { ps.presion_combined.push({ fecha, systolic: Number(dm.presion), diastolic: null }); }
          }
        }

        Object.keys(ps).forEach(k => {
          if (Array.isArray(ps[k])) ps[k].sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
        });

  html += `<div style="margin-top:12px"><h3>Gráficas por parámetro</h3><div class="graphs-grid">`;
        const imgsHist = imagesMap[posiblePacienteId] || {};
        const renderImgOrSVGHist = (imgKey, svgHtml) => {
          if (imgsHist && imgsHist[imgKey]) return `<div><img src="${imgsHist[imgKey]}" style="max-width:520px;height:auto;display:block;border:1px solid #eee;border-radius:4px"/></div>`;
          if (imgsHist && imgsHist['any']) return `<div><img src="${imgsHist['any']}" style="max-width:520px;height:auto;display:block;border:1px solid #eee;border-radius:4px"/></div>`;
          return svgHtml;
        };

        html += `<div style="margin:8px 0"><strong>Temperatura (°C)</strong><div>${renderImgOrSVGHist('temperatura', generarSVGSerie(ps.temperatura || [], { width:520, height:120, stroke: '#ef4444' }))}</div></div>`;
        html += `<div style="margin:8px 0"><strong>Peso (kg)</strong><div>${renderImgOrSVGHist('peso', generarSVGSerie(ps.peso || [], { width:520, height:120, stroke: '#10b981' }))}</div></div>`;
        html += `<div style="margin:8px 0"><strong>Talla (cm)</strong><div>${renderImgOrSVGHist('talla', generarSVGSerie(ps.talla || [], { width:520, height:120, stroke: '#3b82f6' }))}</div></div>`;
        // IMC
        try {
          const tallaMap = {};
          (ps.talla || []).forEach(t => { if (t && t.fecha) tallaMap[t.fecha] = Number(t.valor); });
          let lastT = null;
          const imcSeries = (ps.peso || []).map(p => {
            const f = p.fecha; const pesoV = Number(p.valor);
            if (tallaMap[f]) lastT = tallaMap[f];
            const tallaV = lastT || (ps.talla && ps.talla.length ? Number(ps.talla[ps.talla.length - 1].valor) : null);
            const imc = (pesoV && tallaV) ? parseFloat((pesoV / Math.pow((tallaV/100),2)).toFixed(1)) : null;
            return imc !== null ? { fecha: f, valor: imc } : null;
          }).filter(x=>x);
          html += `<div style="margin:8px 0"><strong>IMC</strong><div>${renderImgOrSVGHist('imc', generarSVGSerie(imcSeries || [], { width:520, height:120, stroke: '#8b5cf6' }))}</div></div>`;
        } catch(e) { /* noop */ }

        html += `<div style="margin:8px 0"><strong>Glucosa (mg/dL)</strong><div>${renderImgOrSVGHist('glucosa', generarSVGSerie(ps.glucosa || [], { width:520, height:120, stroke: '#f97316' }))}</div></div>`;
        html += `<div style="margin:8px 0"><strong>Frecuencia Respiratoria (rpm)</strong><div>${renderImgOrSVGHist('frecuencia', generarSVGSerie(ps.frecuenciaRespiratoria || [], { width:520, height:120, stroke: '#f59e0b' }))}</div></div>`;
        html += `<div style="margin:8px 0"><strong>Presión Arterial (Sistólica/Diastólica)</strong><div>${renderImgOrSVGHist('presion', generarSVGPresionCombinada(ps.presion_combined || [], { width:520, height:120 }))}</div></div>`;
  html += `</div></div>`;

        // Observaciones desde historial central
        let observCentral = [];
        try {
          const allHist = await pacienteModel.getHistorialMedico();
          observCentral = (allHist || []).filter(h => (h.pacienteId === posiblePacienteId || h.pacienteId === fila.id || h.pacienteId === fila.matricula)).map(r => ({ fecha: r.fecha, texto: r.notas || r.descripcion || '' })).filter(o => o.texto);
        } catch(e) { observCentral = []; }

        html += `<div style="margin-top:12px"><h3>Observaciones del personal médico</h3>`;
        if (observCentral.length === 0) {
          html += `<div class="muted-text">No hay observaciones registradas.</div>`;
        } else {
          html += `<ul class="record-list">`;
          observCentral.forEach(o => { const f = o.fecha ? new Date(o.fecha).toLocaleString() : ''; html += `<li><strong>${f}</strong> — ${String(o.texto)}</li>`; });
          html += `</ul>`;
        }
        html += `</div>`;
      }

      html += `</section>`;
  }

    html += `<footer>${appTitle} • Generado el ${new Date().toLocaleString()}</footer>`;
    html += `</body></html>`;

    const newWin = window.open('', '_blank');
    if (!newWin) {
      return { success: false, message: 'No se pudo abrir la ventana de impresión. Desactive el bloqueador de ventanas emergentes.' };
    }

    newWin.document.open();
    newWin.document.write(html);
    newWin.document.close();

    setTimeout(() => {
      try { newWin.focus(); newWin.print(); } catch (e) { /* noop */ }
    }, 500);

    return { success: true, message: 'Se ha abierto la vista para imprimir. Use la opción "Guardar como PDF" en la impresora.' };
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
