// js/controllers/authController.js
// Controller for authentication handling

import { authModel } from '../models/storageModel.js';

/**
 * Initialize the authentication controller
 */
export function initAuthController() {
  console.log('Initializing auth controller...');
  
  // Usamos el botón en lugar del formulario para prevenir la redirección accidental
  const btnLogin = document.getElementById('btnLogin');
  if (!btnLogin) return;
  
  btnLogin.addEventListener('click', handleLogin);
  
  // También permitimos presionar Enter en los campos para iniciar sesión
  const inputMatricula = document.getElementById('matriculaInput');
  const inputContrasena = document.getElementById('contrasenaInput');
  
  if (inputMatricula) {
    inputMatricula.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleLogin();
      }
    });
  }
  
  if (inputContrasena) {
    inputContrasena.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleLogin();
      }
    });
  }
}

/**
 * Handle login form submission
 */
function handleLogin() {
  // Ya no necesitamos prevenir el envío del formulario porque usamos un botón
  
  const matriculaInput = document.getElementById('matriculaInput');
  const contrasenaInput = document.getElementById('contrasenaInput');
  
  if (!matriculaInput || !contrasenaInput) return;
  
  const matriculaOId = matriculaInput.value.trim();
  const contrasena = contrasenaInput.value.trim();
  
  console.log('🔐 Intento de login con:', matriculaOId);
  console.log('🔐 Sistema JWT habilitado:', authModel.isJWTEnabled());
  
  if (!matriculaOId || !contrasena) {
    // Usar el sistema de mensajes si está disponible, sino usar alert
    if (typeof mostrarMensaje === 'function') {
      mostrarMensaje('warning', '⚠️ Campos Requeridos', 'Por favor ingresa tu matrícula/ID y contraseña para continuar.');
    } else {
      alert('Por favor ingresa matrícula/ID y contraseña');
    }
    return;
  }
  
  // Usar JWT si está habilitado, sino usar sistema legacy
  if (authModel.isJWTEnabled()) {
    // ================================
    // LOGIN CON JWT
    // ================================
    console.log('🔐 Iniciando login con JWT...');
    
    try {
      const jwtResult = authModel.loginWithJWT(matriculaOId, contrasena);
      
      if (jwtResult.success) {
        console.log('✅ Login JWT exitoso');
        console.log('👤 Usuario:', jwtResult.usuario.nombre);
        console.log('🏷️ Rol:', jwtResult.usuario.rol);
        console.log('🆔 ID:', jwtResult.usuario.id);
        
        // Manejar fallback si JWT tuvo problemas técnicos
        if (jwtResult.fallback) {
          console.warn('⚠️ Login con fallback:', jwtResult.warning);
          // No mostrar error al usuario, pero registrar en consola
        }
        
        // Verificar que el token se guardó correctamente (solo si no es fallback)
        if (!jwtResult.fallback) {
          setTimeout(() => {
            const tokenInfo = authModel.getJWTInfo();
            if (tokenInfo && tokenInfo.valid) {
              console.log('🔐 Token JWT verificado y funcionando');
              console.log('⏰ Válido hasta:', new Date(tokenInfo.payload.exp * 1000).toLocaleString());
              console.log('🕐 Tiempo restante:', tokenInfo.timeFormatted);
              console.log('🔑 JTI (Token ID):', tokenInfo.payload.jti);
              
              // Abrir panel de control JWT automáticamente
              if (typeof window.showJWTPanel === 'function') {
                console.log('📱 Abriendo panel de control JWT...');
                window.showJWTPanel();
              }
            }
          }, 1000);
        }
        
        // Registrar actividad
        authModel.registrarActividad({
          accion: jwtResult.fallback ? 'login_fallback' : 'login_jwt',
          descripcion: `Login ${jwtResult.fallback ? 'fallback' : 'JWT'} exitoso como ${jwtResult.usuario.rol}`
        });
        
        // Redirigir al menú principal
        console.log('🔗 Redirigiendo a menuInicio.html...');
        window.location.href = '/menuInicio.html';
        return; // Salir aquí para evitar mostrar errores
        
      } else {
        console.error('❌ Login JWT falló:', jwtResult.error);
        
        // Solo mostrar error si realmente falló la autenticación de credenciales
        if (jwtResult.error.includes('Credenciales inválidas')) {
          if (typeof mostrarMensaje === 'function') {
            mostrarMensaje('error', '❌ Credenciales Incorrectas', 'Usuario o contraseña incorrectos');
          } else {
            alert('❌ Credenciales incorrectas');
          }
          return;
        } else {
          // Para otros errores técnicos, continuar con login legacy
          console.warn('⚠️ Error técnico en JWT, continuando con login legacy');
        }
      }
    } catch (error) {
      console.error('❌ Error crítico en login JWT:', error);
      // No mostrar el error al usuario, continuar con el flujo legacy
    }
    
  } else {
    // ================================
    // LOGIN LEGACY (localStorage)
    // ================================
    console.log('🔓 Usando sistema de login legacy...');
    const usuarioValido = authModel.validateUser(matriculaOId, contrasena);
    console.log('Usuario validado:', usuarioValido ? 'Válido' : 'Inválido');
    
    if (usuarioValido) {
      const userData = {
        nombre: usuarioValido.nombre,
        rol: usuarioValido.rol,
        id: usuarioValido.id,
        matricula: usuarioValido.matricula,
        contrasena: usuarioValido.contrasena,  // Incluir contraseña para validación futura
        apellidos: usuarioValido.apellidos || '',
        estado: usuarioValido.estado || 'activo'
      };
      
      console.log('✅ Login legacy exitoso');
      console.log('👤 Usuario:', userData.nombre);
      console.log('🏷️ Rol:', userData.rol);
      console.log('🆔 ID:', userData.id);
      
      // Registrar la actividad de inicio de sesión
      authModel.registrarActividad({
        accion: 'login_legacy',
        descripcion: `Login legacy como ${usuarioValido.rol}`
      });
      
      // Guardar información del usuario actual
      authModel.setCurrentUser(userData);
      
      // Verificar que se guardó correctamente
      const usuarioGuardado = authModel.getCurrentUser();
      console.log('📝 Usuario guardado en localStorage:', usuarioGuardado);
      
      // Redireccionar al menú principal usando redirección directa
      console.log('🔗 Redirigiendo a menuInicio.html...');
      try {
        // Redirigir directamente usando window.location
        window.location.href = '/menuInicio.html';
      } catch (error) {
        console.error('Error al redirigir:', error);
        if (typeof mostrarMensaje === 'function') {
          mostrarMensaje('error', '❌ Error de Redirección', 'Error al acceder al menú principal. Actualiza la página e intenta nuevamente.');
        } else {
          alert('Error al redirigir al menú. Por favor intente de nuevo.');
        }
      }
    } else {
      console.error('❌ Login legacy falló: credenciales inválidas');
      
      if (typeof mostrarMensaje === 'function') {
        mostrarMensaje('error', '❌ Credenciales Incorrectas', 'ID/Matrícula o contraseña incorrecta. Verifica tus datos e intenta nuevamente.');
      } else {
        alert('ID/Matrícula o contraseña incorrecta.');
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('Página de login cargada.');
  initAuthController();
});

/**
 * Get the role of the current user
 * @returns {string} - The user's role or empty string if not authenticated
 */
export function getCurrentUserRole() {
  let currentUser;
  
  if (authModel.isJWTEnabled()) {
    currentUser = authModel.getCurrentUserFromJWT();
  } else {
    currentUser = authModel.getCurrentUser();
  }
  
  return currentUser ? currentUser.rol : '';
}

/**
 * Get the current authenticated user
 * @returns {object|null} - The current user object or null if not authenticated
 */
export function getCurrentUser() {
  if (authModel.isJWTEnabled()) {
    return authModel.getCurrentUserFromJWT();
  } else {
    return authModel.getCurrentUser();
  }
}

/**
 * Check if user is authenticated
 * @returns {boolean} - True if user is authenticated, false otherwise
 */
export function isAuthenticated() {
  if (authModel.isJWTEnabled()) {
    return authModel.isJWTSessionValid();
  } else {
    return !!authModel.getCurrentUser();
  }
}

/**
 * Log out the current user
 */
export function logout() {
  console.log('🔐 AuthController: Iniciando proceso de logout');
  
  // Obtener usuario antes del logout según el sistema activo
  let usuario;
  if (authModel.isJWTEnabled()) {
    usuario = authModel.getCurrentUserFromJWT();
    console.log('🔐 Logout JWT para usuario:', usuario?.nombre);
  } else {
    usuario = authModel.getCurrentUser();
    console.log('🔓 Logout legacy para usuario:', usuario?.nombre);
  }
  
  if (usuario) {
    authModel.registrarActividad({
      accion: authModel.isJWTEnabled() ? 'logout_jwt' : 'logout_legacy',
      descripcion: `Cierre de sesión desde authController (${authModel.isJWTEnabled() ? 'JWT' : 'Legacy'})`
    });
  }
  
  // Logout según el sistema activo
  if (authModel.isJWTEnabled()) {
    authModel.logoutJWT();
    console.log('🔐 JWT tokens eliminados');
  } else {
    authModel.logout();
    console.log('🔓 Sesión legacy eliminada');
  }
  
  // Limpiar cualquier redirección pendiente
  sessionStorage.removeItem('redirectAfterLogin');
  
  console.log('🔗 Redirigiendo a index.html...');
  
  // Redirigir a la página de login
  window.location.href = 'index.html';
}