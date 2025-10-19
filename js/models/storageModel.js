// js/models/storageModel.js

// --- Gestión de Usuarios y Actividades ---
// Importar utilidad JWT
import { jwtUtil } from '../utils/jwtUtil.js';

const USERS_KEY = 'usuarios';
const CURRENT_USER_KEY = 'usuarioActual';
const ACTIVITY_LOG_KEY = 'registroActividad';
const JWT_TOKEN_KEY = 'jwtToken';
const JWT_ENABLED_KEY = 'jwtEnabled';

// Datos iniciales para asegurar que siempre haya usuarios de prueba
// NOTA: Estos usuarios tienen IDs temporales y deberían ser reemplazados por usuarios con IDs dinámicos
const usuariosFijos = [
  { id: 'U12345678', nombre: 'Administrador', apellidos: 'Sistema', matricula: 'admin', contrasena: 'admin123', rol: 'admin', estado: 'activo' },
  { id: 'U87654321', nombre: 'Practicante', apellidos: 'Principal', matricula: 'pract', contrasena: 'pract123', rol: 'practicante', estado: 'activo', grupoId: 'grupo-1', activo: true }
];

// Inicializar usuarios si no existen
if (!localStorage.getItem(USERS_KEY)) {
  localStorage.setItem(USERS_KEY, JSON.stringify(usuariosFijos));
}

// Inicializar registro de actividad si no existe
if (!localStorage.getItem(ACTIVITY_LOG_KEY)) {
  localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify([]));
}

export const authModel = {
  // Helper: ordenar por nombre + apellidos (locale 'es', case-insensitive)
  _sortUsersByName: (arr) => {
    return (arr || []).slice().sort((a, b) => {
      const nameA = ((a.nombre || '') + ' ' + (a.apellidos || '')).trim().toLowerCase();
      const nameB = ((b.nombre || '') + ' ' + (b.apellidos || '')).trim().toLowerCase();
      return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
    });
  },

  getUsers: () => authModel._sortUsersByName(JSON.parse(localStorage.getItem(USERS_KEY)) || []),
  
  getAllUsers: () => authModel._sortUsersByName(JSON.parse(localStorage.getItem(USERS_KEY)) || []),
  
  // Generar ID único automático para usuarios
  generateUserId: () => {
    const usuarios = authModel.getUsers();
    let newId;
    let attempts = 0;
    const maxAttempts = 100;
    
    do {
      // Generar número aleatorio de 8 dígitos
      const randomNumber = Math.floor(10000000 + Math.random() * 90000000);
      newId = `U${randomNumber}`;
      attempts++;
      
      if (attempts >= maxAttempts) {
        // Fallback: usar timestamp + random para asegurar unicidad
        newId = `U${Date.now()}${Math.floor(Math.random() * 1000)}`;
        break;
      }
    } while (usuarios.some(u => u.id === newId));
    
    return newId;
  },
  
  // Función para limpiar usuarios con IDs incorretos (no dinámicos)
  cleanupIncorrectUserIds: () => {
    const usuarios = authModel.getUsers();
    const usuariosValidos = usuarios.filter(u => {
      // Mantener solo usuarios con IDs en formato "U" seguido de números
      return /^U\d+$/.test(u.id);
    });
    
    const usuariosEliminados = usuarios.length - usuariosValidos.length;
    
    if (usuariosEliminados > 0) {
      localStorage.setItem(USERS_KEY, JSON.stringify(usuariosValidos));
      console.log(`🧹 Limpieza completada: ${usuariosEliminados} usuarios con IDs incorretos eliminados`);
      
      // Registrar la limpieza
      authModel.registrarActividad({
        accion: 'cleanup',
        descripcion: `Limpieza automática: ${usuariosEliminados} usuarios con IDs incorretos eliminados`
      });
      
      return usuariosEliminados;
    }
    
    console.log('✅ No se encontraron usuarios con IDs incorretos');
    return 0;
  },
  
  validateUser: (matriculaOId, contrasena) => {
    const usuarios = authModel.getUsers();
    return usuarios.find(u => 
      ((u.rol === 'admin' && (u.id === matriculaOId || u.matricula === matriculaOId)) || 
       (u.rol === 'practicante' && u.matricula === matriculaOId)) && 
      u.contrasena === contrasena
    );
  },

  setCurrentUser: (usuario) => {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(usuario));
  },

  getCurrentUser: () => JSON.parse(localStorage.getItem(CURRENT_USER_KEY)),

  logout: () => {
    // Registrar solo la actividad de logout, sin registrar salida en operaciones/asistencia
    const usuario = authModel.getCurrentUser();
    if (usuario) {
      authModel.registrarActividad({
        accion: 'logout',
        descripcion: 'Cierre de sesión'
      });
    }
    localStorage.removeItem(CURRENT_USER_KEY);
    // También limpiar JWT si está habilitado
    if (authModel.isJWTEnabled()) {
      localStorage.removeItem(JWT_TOKEN_KEY);
    }
  },
  
  // ================================
  // FUNCIONES JWT (NUEVAS)
  // ================================
  
  /**
   * Verificar si JWT está habilitado
   */
  isJWTEnabled: () => {
    return localStorage.getItem(JWT_ENABLED_KEY) === 'true';
  },
  
  /**
   * Habilitar/deshabilitar JWT
   */
  setJWTEnabled: (enabled) => {
    localStorage.setItem(JWT_ENABLED_KEY, enabled.toString());
    if (enabled) {
      console.log('🔐 JWT habilitado');
    } else {
      console.log('🔓 JWT deshabilitado - usando sistema legacy');
      // Limpiar token si se deshabilita
      localStorage.removeItem(JWT_TOKEN_KEY);
    }
  },
  
  /**
   * Verificar si hay una sesión JWT activa (verificación simple)
   */
  hasActiveJWTSession: () => {
    const token = localStorage.getItem(JWT_TOKEN_KEY);
    const user = localStorage.getItem(CURRENT_USER_KEY);
    
    if (!token || !user) {
      return false;
    }
    
    try {
      // Verificación básica sin validación completa
      const parts = token.split('.');
      if (parts.length !== 3) {
        return false;
      }
      
      // Decodificar payload sin validar firma
      let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      
      const payload = JSON.parse(atob(base64));
      const now = Math.floor(Date.now() / 1000);
      
      // Solo verificar expiración
      return payload.exp && payload.exp > now;
      
    } catch (error) {
      console.warn('⚠️ Error verificando sesión JWT:', error.message);
      return false;
    }
  },

  /**
   * Limpiar completamente todos los datos de autenticación
   * Útil para resolver problemas de sesiones conflictivas
   */
  clearAllAuthData: () => {
    console.log('🧹 Limpiando todos los datos de autenticación...');
    
    // Limpiar tokens JWT
    localStorage.removeItem(JWT_TOKEN_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(JWT_ENABLED_KEY);
    
    // Limpiar cualquier otra clave de sesión que pueda existir
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('jwt') || key.includes('auth') || key.includes('user'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      console.log('🧹 Eliminando clave:', key);
      localStorage.removeItem(key);
    });
    
    console.log('✅ Limpieza de datos de autenticación completada');
  },

  /**
   * Login con JWT
   */
  loginWithJWT: (matriculaOId, contrasena) => {
    console.log('🔐 === INICIO LOGIN JWT ===');
    console.log('🔐 Usuario solicitado:', matriculaOId);
    
    // Limpiar cualquier sesión anterior para evitar conflictos
    console.log('🧹 Limpiando sesión anterior...');
    localStorage.removeItem(JWT_TOKEN_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
    
    const usuario = authModel.validateUser(matriculaOId, contrasena);
    if (!usuario) {
      console.log('❌ Credenciales inválidas para:', matriculaOId);
      return { success: false, error: 'Credenciales inválidas' };
    }
    
    console.log('✅ Usuario validado:', usuario.nombre, '(', usuario.rol, ')');
    
    try {
      console.log('🔧 Preparando payload para JWT...');
      const tokenPayload = {
        sub: usuario.id,
        nombre: usuario.nombre,
        apellidos: usuario.apellidos || '',
        rol: usuario.rol,
        matricula: usuario.matricula,
        estado: usuario.estado || 'activo',
        grupoId: usuario.grupoId || null
      };
      
      console.log('🔧 Generando token JWT...');
      const token = jwtUtil.generateToken(tokenPayload, '8h');
      
      if (!token) {
        throw new Error('No se pudo generar el token');
      }
      
      console.log('✅ Token JWT generado exitosamente');
      
      // Guardar token y usuario
      console.log('💾 Guardando token y usuario en localStorage...');
      localStorage.setItem(JWT_TOKEN_KEY, token);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(usuario));
      
      // Verificar que se guardó correctamente
      const savedToken = localStorage.getItem(JWT_TOKEN_KEY);
      const savedUser = localStorage.getItem(CURRENT_USER_KEY);
      
      if (!savedToken || !savedUser) {
        throw new Error('Error guardando datos en localStorage');
      }
      
      console.log('✅ Datos guardados correctamente en localStorage');
      
      // Registrar login con JWT
      authModel.registrarActividad({
        accion: 'login-jwt',
        descripcion: `Inicio de sesión JWT: ${usuario.nombre} (${usuario.rol})`
      });
      
      // Ya no registrar entrada en operaciones/asistencia aquí. Solo registrar actividad de login.
      
      console.log('🔐 === LOGIN JWT COMPLETADO EXITOSAMENTE ===');
      return { usuario, token, success: true };
      
    } catch (error) {
      console.error('❌ === ERROR EN LOGIN JWT ===');
      console.error('❌ Error:', error.message);
      
      // En caso de error técnico, intentar login sin JWT
      console.log('🔄 Intentando login simple sin JWT...');
      
      try {
        // Guardar usuario sin token JWT
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(usuario));
        
        authModel.registrarActividad({
          accion: 'login-fallback',
          descripcion: `Login sin JWT (fallback): ${usuario.nombre} (${usuario.rol})`
        });
        
        // Marcar que JWT falló pero el login fue exitoso
        return { 
          usuario, 
          token: null, 
          success: true,
          fallback: true,
          warning: 'Login exitoso pero con limitaciones técnicas en JWT'
        };
        
      } catch (fallbackError) {
        console.error('❌ Error en fallback:', fallbackError.message);
        
        // Limpiar datos en caso de error total
        localStorage.removeItem(JWT_TOKEN_KEY);
        localStorage.removeItem(CURRENT_USER_KEY);
        
        return { 
          success: false, 
          error: 'Error técnico en el sistema de autenticación'
        };
      }
    }
  },
  
  /**
   * Obtener usuario actual desde JWT
   */
  getCurrentUserFromJWT: () => {
    const token = localStorage.getItem(JWT_TOKEN_KEY);
    if (!token) {
      console.log('🔐 No hay token JWT disponible');
      return null;
    }
    
    try {
      const payload = jwtUtil.validateToken(token);
      const usuario = {
        id: payload.sub,
        nombre: payload.nombre,
        apellidos: payload.apellidos,
        rol: payload.rol,
        matricula: payload.matricula,
        estado: payload.estado,
        grupoId: payload.grupoId
      };
      
      console.log('🔐 Usuario obtenido desde JWT:', usuario.nombre);
      return usuario;
    } catch (error) {
      console.warn('🔐 Token JWT inválido:', error.message);
      // ELIMINAMOS la llamada recursiva que causa el bucle infinito
      // authModel.logoutJWT(); // <-- ESTO CAUSABA EL PROBLEMA
      
      // En su lugar, simplemente limpiamos el token inválido sin llamar al logout completo
      localStorage.removeItem(JWT_TOKEN_KEY);
      console.log('🔐 Token JWT inválido eliminado del localStorage');
      return null;
    }
  },
  
  /**
   * Logout con JWT
   */
  logoutJWT: () => {
    // Obtener usuario antes de limpiarlo para registrar actividad
    // Evitamos getCurrentUserFromJWT() para prevenir recursión circular
    let usuario = null;
    
    // Intentar obtener usuario desde el token directamente sin validación estricta
    const token = localStorage.getItem(JWT_TOKEN_KEY);
    if (token) {
      try {
        // Decodificar de forma simple sin validación completa
        const parts = token.split('.');
        if (parts.length === 3) {
          // Decodificación simple sin usar las funciones problemáticas
          let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          while (base64.length % 4) {
            base64 += '=';
          }
          
          const payloadStr = atob(base64);
          const payload = JSON.parse(payloadStr);
          
          usuario = {
            id: payload.sub,
            nombre: payload.nombre,
            apellidos: payload.apellidos,
            rol: payload.rol,
            matricula: payload.matricula,
            estado: payload.estado,
            grupoId: payload.grupoId
          };
        }
      } catch (error) {
        console.warn('🔐 No se pudo decodificar token para logout:', error.message);
      }
    }
    
    // Si no tenemos usuario desde JWT, intentar desde localStorage normal
    if (!usuario) {
      usuario = authModel.getCurrentUser();
    }
    
    if (usuario) {
      authModel.registrarActividad({
        accion: 'logout-jwt',
        descripcion: 'Cierre de sesión JWT'
      });
      
      // Registrar salida en el sistema de operaciones
      try {
        // Importar dinámicamente el modelo de operaciones para evitar dependencias circulares
        import('../models/operacionesModel.js').then(({ registrarSalida }) => {
          console.log('🚪 Registrando salida JWT automática...');
          const resultadoSalida = registrarSalida(usuario.matricula || usuario.id);
          if (resultadoSalida) {
            console.log('✅ Salida JWT registrada exitosamente');
          } else {
            console.warn('⚠️ No se pudo registrar la salida automáticamente');
          }
        }).catch(error => {
          console.error('❌ Error importando operacionesModel para salida:', error);
        });
      } catch (error) {
        console.error('❌ Error registrando salida automática:', error);
      }
    }
    
    localStorage.removeItem(JWT_TOKEN_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
    console.log('🔐 Logout JWT completado');
  },
  
  /**
   * Verificar si la sesión JWT es válida
   */
  isJWTSessionValid: () => {
    const token = localStorage.getItem(JWT_TOKEN_KEY);
    if (!token) return false;
    
    try {
      jwtUtil.validateToken(token);
      return true;
    } catch (error) {
      console.warn('🔐 Sesión JWT inválida:', error.message);
      return false;
    }
  },
  
  /**
   * Obtener información del token JWT
   */
  getJWTInfo: () => {
    const token = localStorage.getItem(JWT_TOKEN_KEY);
    if (!token) return null;
    
    try {
      const decoded = jwtUtil.decodeToken(token);
      const timeRemaining = jwtUtil.getTokenTimeRemaining(token);
      const timeFormatted = jwtUtil.formatTimeRemaining(timeRemaining);
      
      return {
        valid: !jwtUtil.isTokenExpired(token),
        payload: decoded.payload,
        timeRemaining,
        timeFormatted,
        token: token.substring(0, 20) + '...' // Token truncado para seguridad
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  },
  
  /**
   * Renovar token JWT si está próximo a expirar
   */
  renewJWTIfNeeded: () => {
    if (!authModel.isJWTEnabled()) return false;
    
    const token = localStorage.getItem(JWT_TOKEN_KEY);
    if (!token) return false;
    
    try {
      const timeRemaining = jwtUtil.getTokenTimeRemaining(token);
      // Renovar si quedan menos de 30 minutos
      if (timeRemaining > 0 && timeRemaining < 1800) {
        const currentUser = authModel.getCurrentUserFromJWT();
        if (currentUser) {
          const newToken = jwtUtil.generateToken({
            sub: currentUser.id,
            nombre: currentUser.nombre,
            apellidos: currentUser.apellidos,
            rol: currentUser.rol,
            matricula: currentUser.matricula,
            estado: currentUser.estado,
            grupoId: currentUser.grupoId
          }, '8h');
          
          localStorage.setItem(JWT_TOKEN_KEY, newToken);
          console.log('🔐 Token JWT renovado automáticamente');
          return true;
        }
      }
    } catch (error) {
      console.warn('🔐 Error al renovar token:', error.message);
    }
    
    return false;
  },
  
  // ================================
  // FIN FUNCIONES JWT
  // ================================
  
  // Funciones para el registro de actividad
  registrarActividad: (datos = {}) => {
    // Obtener usuario según el sistema activo
    let usuarioActual;
    if (authModel.isJWTEnabled()) {
      usuarioActual = authModel.getCurrentUserFromJWT() || { id: 'sistema', nombre: 'Sistema' };
    } else {
      usuarioActual = authModel.getCurrentUser() || { id: 'sistema', nombre: 'Sistema' };
    }
    
    const registro = {
      fecha: new Date().toISOString(),
      usuario: datos.usuario || usuarioActual.nombre,
      usuarioId: datos.usuarioId || usuarioActual.id,
      accion: datos.accion || 'acción',
      descripcion: datos.descripcion || 'Sin detalles',
      ip: datos.ip || '127.0.0.1',
      sistemaAuth: authModel.isJWTEnabled() ? 'JWT' : 'Legacy'
    };
    
    // Si JWT está habilitado, agregar información del token
    if (authModel.isJWTEnabled()) {
      const tokenInfo = authModel.getJWTInfo();
      if (tokenInfo && tokenInfo.valid) {
        registro.tokenId = tokenInfo.payload.jti;
        registro.tokenExp = new Date(tokenInfo.payload.exp * 1000).toISOString();
        registro.tiempoRestanteToken = tokenInfo.timeLeft;
        registro.rolToken = tokenInfo.payload.rol;
        registro.matriculaToken = tokenInfo.payload.matricula;
      }
      
      // Agregar campos adicionales de JWT si se proporcionan
      if (datos.tokenId) registro.tokenId = datos.tokenId;
      if (datos.tokenExp) registro.tokenExp = datos.tokenExp;
      if (datos.tiempoRestante) registro.tiempoRestanteToken = datos.tiempoRestante;
      if (datos.sistemaAuth) registro.sistemaAuth = datos.sistemaAuth;
    }
    
    const registros = JSON.parse(localStorage.getItem(ACTIVITY_LOG_KEY)) || [];
    registros.push(registro);
    localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(registros));
    
    console.log(`📝 Actividad registrada (${registro.sistemaAuth}):`, registro.accion, '-', registro.descripcion);
    
    return registro;
  },
  
  // ...existing code...
  
  // Nuevo método para obtener actividades
  getActividades: (filtro = {}) => {
    const registros = JSON.parse(localStorage.getItem(ACTIVITY_LOG_KEY)) || [];
    
    // Si no hay filtros, devolver todos los registros
    if (!filtro || Object.keys(filtro).length === 0) {
      return registros;
    }
    
    // Aplicar filtros
    return registros.filter(reg => {
      let coincide = true;
      
      if (filtro.fechaInicio) {
        const desde = new Date(filtro.fechaInicio);
        const fechaReg = new Date(reg.fecha);
        if (fechaReg < desde) {
          coincide = false;
        }
      }
      
      if (filtro.fechaFin) {
        const hasta = new Date(filtro.fechaFin);
        hasta.setHours(23, 59, 59); // Para incluir todo el día final
        const fechaReg = new Date(reg.fecha);
        if (fechaReg > hasta) {
          coincide = false;
        }
      }
      
      if (filtro.usuario && reg.usuario !== filtro.usuario) {
        coincide = false;
      }
      
      if (filtro.accion && !reg.accion.toLowerCase().includes(filtro.accion.toLowerCase())) {
        coincide = false;
      }
      
      return coincide;
    });
  },

  addUser: (newUser) => {
    const usuarios = authModel.getUsers();
    
    // Generar ID automático si no existe
    if (!newUser.id) {
      newUser.id = authModel.generateUserId();
    }
    
    // Verificar que la matrícula no exista (el ID ya es único por generación)
    if (usuarios.some(u => u.matricula === newUser.matricula)) {
      alert('Error: La matrícula ya existe.');
      return false;
    }
    
    // Asegurar que tenga el campo estado
    if (!newUser.estado) {
      newUser.estado = 'activo';
    }
    
    usuarios.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(usuarios));
    
    // Registrar actividad
    authModel.registrarActividad({
      accion: 'create',
      descripcion: `Creación de usuario: ${newUser.nombre} (${newUser.id})`
    });
    
    return true;
  },

  deleteUser: (userIndex) => {
    let usuarios = authModel.getUsers();
    const userToDelete = usuarios[userIndex];
    const currentUser = authModel.getCurrentUser();
    
    if (userToDelete.id === currentUser.id) {
      alert('No puedes eliminar tu propia cuenta de administrador.');
      return false;
    }
    
    usuarios.splice(userIndex, 1);
    localStorage.setItem(USERS_KEY, JSON.stringify(usuarios));
    
    // Registrar actividad
    authModel.registrarActividad({
      accion: 'delete',
      descripcion: `Eliminación de usuario: ${userToDelete.nombre} (${userToDelete.id})`
    });
    
    return true;
  },

  updateUser: (userIndex, updatedUser) => {
    let usuarios = authModel.getUsers();
    const userToUpdate = usuarios[userIndex];
    const currentUser = authModel.getCurrentUser();
    
    // Verificar si está intentando modificar su propia matrícula o ID siendo administrador
    if (userToUpdate.id === currentUser.id && 
        (userToUpdate.matricula !== updatedUser.matricula || userToUpdate.id !== updatedUser.id)) {
        alert('No puedes modificar tu propia matrícula o ID como administrador.');
        return false;
    }
    
    // Verificar que la nueva matrícula o ID no existan ya (excepto el usuario actual)
    const duplicado = usuarios.find((u, i) => 
        i !== parseInt(userIndex) && 
        (u.matricula === updatedUser.matricula || u.id === updatedUser.id)
    );
    
    if (duplicado) {
        alert('Error: La matrícula o el ID ya existen en otro usuario.');
        return false;
    }
    
    // Actualizar el usuario
    const usuarioAnterior = {...usuarios[userIndex]};
    usuarios[userIndex] = {
        ...userToUpdate,
        ...updatedUser
    };
    
    localStorage.setItem(USERS_KEY, JSON.stringify(usuarios));
    
    // Si se modificó el usuario actual, actualizar la sesión
    if (userToUpdate.id === currentUser.id) {
        authModel.setCurrentUser(usuarios[userIndex]);
    }
    
    // Registrar actividad
    authModel.registrarActividad({
      accion: 'update',
      descripcion: `Actualización de usuario: ${updatedUser.nombre} (${updatedUser.id})`
    });
    
    return true;
  },

  getUserByIndex: (userIndex) => {
    const usuarios = authModel.getUsers();
    return usuarios[userIndex] || null;
  }
};

// Notificar que authModel está listo
window.authModelReady = true;
window.dispatchEvent(new Event('authModelLoaded'));

console.log('🔐 AuthModel cargado y listo');
console.log('✅ JWT functions available:', {
  isJWTEnabled: typeof authModel.isJWTEnabled,
  setJWTEnabled: typeof authModel.setJWTEnabled,
  loginWithJWT: typeof authModel.loginWithJWT,
  getJWTInfo: typeof authModel.getJWTInfo
});