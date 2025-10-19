// js/models/operacionesModel.js
import performanceMonitor from '../utils/performanceMonitor.js';

export function getRegistroEntradasSalidas() {
  return performanceMonitor.measureFunction('dataLoad', () => {
    try {
      let historial = JSON.parse(localStorage.getItem('servicioHistorial')) || [];

      // Normalizar valores de 'modulo' en registros para que concuerden con modulos configurados
      try {
        import('./gestionModel.js').then(({ gestionModel }) => {
          try {
            const modulos = gestionModel.getModulos() || [];

            let changed = false;
            const normalized = historial.map(reg => {
              const r = { ...reg };
              const raw = (r.modulo || r.mesa || r.moduloId || r.grupoId || '').toString().trim();
              if (raw) {
                const mMatch = raw.match(/(\d+)/);
                if (mMatch) {
                  const num = parseInt(mMatch[1], 10);
                  if (!isNaN(num)) {
                    const padded = `M${String(num).padStart(2,'0')}`;
                    const found = modulos.find(m => (m.id||'').toUpperCase() === padded.toUpperCase());
                    if (found) {
                      r.moduinfo = `${found.id} - ${found.nombre}`;
                      r.moduloId = found.id;
                      r.modulo = found.id; // asegurar campo 'modulo' con id del módulo
                      changed = true;
                    }
                  }
                } else {
                  const byId = modulos.find(m => (m.id||'').toLowerCase() === raw.toLowerCase());
                    if (byId) {
                    r.moduinfo = `${byId.id} - ${byId.nombre}`;
                    r.moduloId = byId.id;
                    r.modulo = byId.id;
                    changed = true;
                  }
                  else {
                    // If raw looks like a group id, try to map via grupoAsignadoId
                    const byGroup = modulos.find(m => (m.grupoAsignadoId || '').toString() === raw.toString());
                    if (byGroup) {
                      r.moduinfo = `${byGroup.id} - ${byGroup.nombre}`;
                      r.moduloId = byGroup.id;
                      r.modulo = byGroup.id;
                      changed = true;
                    }
                  }
                }
              }
              return r;
            });

            if (changed) {
              historial = normalized;
              localStorage.setItem('servicioHistorial', JSON.stringify(historial));
              console.log('OperacionesModel: Historial normalizado y guardado para consistencia de módulos');
            }
          } catch(innerErr) {
            console.warn('OperacionesModel: Error normalizando historial:', innerErr);
          }
        }).catch(err => {
          console.warn('OperacionesModel: No se pudo importar gestionModel para normalizar historial:', err);
        });
      } catch (e) {
        console.warn('OperacionesModel: No se pudo normalizar historial contra gestionModel:', e);
      }

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
    // Importar authModel para verificar JWT
    import('./storageModel.js').then(({ authModel }) => {
      try {
        let historial = JSON.parse(localStorage.getItem('servicioHistorial')) || [];
        const now = new Date();

        // Cerrar cualquier registro abierto anterior para este usuario
        historial.forEach(reg => {
          if (reg.matricula === usuario.matricula && reg.salida === null) {
            reg.salida = now.toLocaleString();
            reg.salidaIso = now.toISOString();
            reg.salidaTimestamp = now.getTime();
            reg.duracion = 'Cerrado automáticamente por nueva entrada';
            reg.salidaConTokenValido = false;
          }
        });

        const registro = {
          id: `ES${Date.now()}`,
          nombre: usuario.nombre,
          matricula: usuario.matricula,
          modulo: usuario.modulo || usuario.moduloId || usuario.mesa || 'No asignada',
          grupoId: usuario.grupoId || null,
          rol: usuario.rol,
          entrada: now.toLocaleString(),
          entradaIso: now.toISOString(),
          entradaTimestamp: now.getTime(),
          salida: null,
          salidaIso: null,
          salidaTimestamp: null,
          duracion: 'En servicio',
          sistemaAuth: authModel.isJWTEnabled() ? 'JWT' : 'Legacy'
        };

        // Si JWT está habilitado, agregar información del token
        if (authModel.isJWTEnabled()) {
          const tokenInfo = authModel.getJWTInfo();
          if (tokenInfo && tokenInfo.valid) {
            registro.tokenId = tokenInfo.payload.jti;
            registro.tokenEntrada = tokenInfo.payload.iat;
            registro.tokenExpiracion = tokenInfo.payload.exp;
            registro.tiempoSesionRestante = tokenInfo.timeLeft;
            registro.autenticacionSegura = true;
            // Logs mejorados para JWT
            console.log('🔐 OperacionesModel: Entrada JWT registrada para', usuario.nombre);
            console.log('🔑 Token ID:', tokenInfo.payload.jti);
            console.log('⏰ Tiempo de sesión restante:', tokenInfo.timeFormatted);
          }
        } else {
          registro.autenticacionSegura = false;
          console.log('🔓 OperacionesModel: Entrada Legacy registrada para', usuario.nombre);
        }

        historial.push(registro);
        localStorage.setItem('servicioHistorial', JSON.stringify(historial));
        return registro;
      } catch (error) {
        console.error('Error registrando entrada:', error);
        return null;
      }
    }).catch(err => {
      console.warn('No se pudo importar authModel para registro de entrada:', err);
      // Fallback sin información JWT
      let historial = JSON.parse(localStorage.getItem('servicioHistorial')) || [];
      const now = new Date();
      // Cerrar cualquier registro abierto anterior para este usuario
      historial.forEach(reg => {
        if (reg.matricula === usuario.matricula && reg.salida === null) {
          reg.salida = now.toLocaleString();
          reg.salidaIso = now.toISOString();
          reg.salidaTimestamp = now.getTime();
          reg.duracion = 'Cerrado automáticamente por nueva entrada';
          reg.salidaConTokenValido = false;
        }
      });
      const registro = {
        id: `ES${Date.now()}`,
        nombre: usuario.nombre,
        matricula: usuario.matricula,
        modulo: usuario.modulo || usuario.moduloId || usuario.mesa || 'No asignada',
        grupoId: usuario.grupoId || null,
        rol: usuario.rol,
        entrada: now.toLocaleString(),
        entradaIso: now.toISOString(),
        entradaTimestamp: now.getTime(),
        salida: null,
        salidaIso: null,
        salidaTimestamp: null,
        duracion: 'En servicio',
        sistemaAuth: 'Legacy',
        autenticacionSegura: false
      };
      historial.push(registro);
      localStorage.setItem('servicioHistorial', JSON.stringify(historial));
      console.log('🔓 OperacionesModel: Entrada Legacy (fallback) registrada para', usuario.nombre);
      return registro;
    });
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
    // Importar authModel para verificar JWT
    import('./storageModel.js').then(({ authModel }) => {
      try {
        let historial = JSON.parse(localStorage.getItem('servicioHistorial')) || [];
        const salidaTime = new Date();
        let registrosCerrados = 0;
        historial.forEach(registro => {
          if (registro.matricula === usuarioId && registro.salida === null) {
            // Calcular duración
            let entradaMs = registro.entradaTimestamp || Date.parse(registro.entradaIso) || Date.parse(registro.entrada);
            let duracionStr = 'N/A';
            if (entradaMs) {
              const duracionMs = salidaTime.getTime() - entradaMs;
              const horas = Math.floor(duracionMs / (1000 * 60 * 60));
              const minutos = Math.floor((duracionMs % (1000 * 60 * 60)) / (1000 * 60));
              duracionStr = `${horas}h ${minutos}m`;
            }
            registro.salida = salidaTime.toLocaleString();
            registro.salidaIso = salidaTime.toISOString();
            registro.salidaTimestamp = salidaTime.getTime();
            registro.duracion = duracionStr;
            // Actualizar información JWT si está disponible
            if (authModel.isJWTEnabled()) {
              const tokenInfo = authModel.getJWTInfo();
              if (tokenInfo && tokenInfo.valid) {
                registro.tokenSalida = tokenInfo.payload.jti;
                registro.tiempoSesionAlSalir = tokenInfo.timeLeft;
                registro.salidaConTokenValido = true;
                console.log('🔐 OperacionesModel: Salida JWT registrada para', registro.nombre);
                console.log('🔑 Token ID al salir:', tokenInfo.payload.jti);
                console.log('⏰ Tiempo de sesión restante al salir:', tokenInfo.timeFormatted);
              } else {
                registro.salidaConTokenValido = false;
                console.log('⚠️ OperacionesModel: Salida con token JWT inválido para', registro.nombre);
              }
            } else {
              registro.salidaConTokenValido = false;
              console.log('🔓 OperacionesModel: Salida Legacy registrada para', registro.nombre);
            }
            registrosCerrados++;
          }
        });
        localStorage.setItem('servicioHistorial', JSON.stringify(historial));
        return registrosCerrados > 0 ? true : null;
      } catch (error) {
        console.error('Error registrando salida:', error);
        return null;
      }
    }).catch(err => {
      console.warn('No se pudo importar authModel para registro de salida:', err);
      // Fallback sin información JWT
      let historial = JSON.parse(localStorage.getItem('servicioHistorial')) || [];
      const salidaTime = new Date();
      let registrosCerrados = 0;
      historial.forEach(registro => {
        if (registro.matricula === usuarioId && registro.salida === null) {
          let entradaMs = registro.entradaTimestamp || Date.parse(registro.entradaIso) || Date.parse(registro.entrada);
          let duracionStr = 'N/A';
          if (entradaMs) {
            const duracionMs = salidaTime.getTime() - entradaMs;
            const horas = Math.floor(duracionMs / (1000 * 60 * 60));
            const minutos = Math.floor((duracionMs % (1000 * 60 * 60)) / (1000 * 60));
            duracionStr = `${horas}h ${minutos}m`;
          }
          registro.salida = salidaTime.toLocaleString();
          registro.salidaIso = salidaTime.toISOString();
          registro.salidaTimestamp = salidaTime.getTime();
          registro.duracion = duracionStr;
          registro.salidaConTokenValido = false;
          registrosCerrados++;
          console.log('🔓 OperacionesModel: Salida Legacy (fallback) registrada para', registro.nombre);
        }
      });
      localStorage.setItem('servicioHistorial', JSON.stringify(historial));
      return registrosCerrados > 0 ? true : null;
    });
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

export function getModulosSalud() {
  try {
    let usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    const historial = getRegistroEntradasSalidas();
    const mesasMap = new Map();

    // Si no hay usuarios, crear datos de prueba
    if (usuarios.length === 0) {
      usuarios = [
        { id: 'U001', nombre: 'Juan Pérez', apellidos: '', modulo: 1, rol: 'admin' },
        { id: 'U002', nombre: 'María González', apellidos: '', modulo: 2, rol: 'practicante' },
        { id: 'U003', nombre: 'Carlos López', apellidos: '', modulo: 3, rol: 'practicante' }
      ];
      localStorage.setItem('usuarios', JSON.stringify(usuarios));
    }

  // Construir mapa de módulos (compatibilidad con usuarios que usen campo 'mesa')
    const modulosMap = new Map();

    usuarios.forEach(usuario => {
      const modRaw = usuario.modulo || usuario.mesa;
      if (modRaw) {
        const num = parseInt(modRaw);
        const key = isNaN(num) ? modRaw : num;
        if (!modulosMap.has(key)) {
          modulosMap.set(key, {
            id: key,
            asignado: usuario,
            estado: 'en-servicio',
            ultimaActividad: null
          });
        }
      }
    });

    historial.forEach(registro => {
      const regMod = registro.modulo || registro.mesa;
      if (regMod && !registro.salida) {
        const mKey = parseInt(regMod);
        const key = isNaN(mKey) ? regMod : mKey;
        if (modulosMap.has(key)) {
          modulosMap.get(key).estado = 'ocupada';
          modulosMap.get(key).ultimaActividad = registro.entrada;
        }
      }
    });

    // Si aún no hay módulos, crear módulos por defecto
    if (modulosMap.size === 0) {
      for (let i = 1; i <= 3; i++) {
        modulosMap.set(i, {
          id: i,
          asignado: null,
          estado: 'fuera-servicio',
          ultimaActividad: null
        });
      }
    }

    return Array.from(modulosMap.values()).sort((a, b) => (a.id || a.numero) - (b.id || b.numero));
  } catch (e) {
    console.error('Error al obtener modulos de salud:', e);
    return [];
  }
}
// Compatibilidad: alias antiguo
export function getMesasSalud() {
  return getModulosSalud();
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

/**
 * Devuelve el registro de asistencia activo para una matrícula (si existe)
 */
export function getRegistroActivoPorMatricula(matricula) {
  try {
    const historial = JSON.parse(localStorage.getItem('servicioHistorial')) || [];
    return historial
      .filter(r => r.matricula === matricula && r.salida === null)
      .sort((a, b) => new Date(b.entrada) - new Date(a.entrada))[0] || null;
  } catch (e) {
    console.error('Error getRegistroActivoPorMatricula', e);
    return null;
  }
}

/**
 * Registra entrada de asistencia (estructura: id, nombre, matricula, modulo, entrada, salida)
 */
export function registrarEntradaAsistencia(usuario) {
  // Reuse registrarEntrada but ensure field names match
  return registrarEntrada(usuario);
}

/**
 * Registra salida de asistencia para una matrícula
 */
export function registrarSalidaAsistencia(matricula) {
  return registrarSalida(matricula);
}

/**
 * Elimina todos los registros que fueron generados con el modo Legacy (sin JWT)
 * @returns {Object} Resultado de la operación con estadísticas
 */
export function eliminarRegistrosLegacy() {
  try {
    const historial = JSON.parse(localStorage.getItem('servicioHistorial')) || [];
    const historialActividad = JSON.parse(localStorage.getItem('actividadHistorial')) || [];
    
    console.log('🗑️ Iniciando eliminación de registros Legacy...');
    console.log(`📊 Estado inicial: ${historial.length} registros de operaciones, ${historialActividad.length} actividades`);
    
    // Filtrar registros de operaciones (entradas/salidas)
    const registrosJWT = historial.filter(registro => {
      // Mantener solo registros JWT o que tengan tokenId
      return registro.sistemaAuth === 'JWT' || registro.tokenId;
    });
    
    // Filtrar actividades
    const actividadesJWT = historialActividad.filter(actividad => {
      // Mantener solo actividades JWT o que tengan tokenId
      return actividad.sistemaAuth === 'JWT' || actividad.tokenId;
    });
    
    const registrosEliminados = historial.length - registrosJWT.length;
    const actividadesEliminadas = historialActividad.length - actividadesJWT.length;
    
    // Guardar los registros filtrados
    localStorage.setItem('servicioHistorial', JSON.stringify(registrosJWT));
    localStorage.setItem('actividadHistorial', JSON.stringify(actividadesJWT));
    
    const resultado = {
      exito: true,
      registrosEliminados,
      actividadesEliminadas,
      registrosRestantes: registrosJWT.length,
      actividadesRestantes: actividadesJWT.length
    };
    
    console.log('✅ Eliminación completada:');
    console.log(`   🗑️ Registros eliminados: ${registrosEliminados}`);
    console.log(`   🗑️ Actividades eliminadas: ${actividadesEliminadas}`);
    console.log(`   ✅ Registros restantes (JWT): ${registrosJWT.length}`);
    console.log(`   ✅ Actividades restantes (JWT): ${actividadesJWT.length}`);
    
    return resultado;
    
  } catch (error) {
    console.error('❌ Error eliminando registros Legacy:', error);
    return {
      exito: false,
      error: error.message,
      registrosEliminados: 0,
      actividadesEliminadas: 0
    };
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