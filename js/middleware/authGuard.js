// js/middleware/authGuard.js
// Middleware de autenticación reactivado con mejoras y Event Bus
import { authModel } from '../models/storageModel.js';
import eventBus, { EVENT_NAMES } from '../utils/eventBus.js';

console.log('AuthGuard: Middleware de autenticación cargado');

// Configuración de rutas protegidas y roles permitidos
const PROTECTED_ROUTES = {
    'categoria-usuarios-personal.html': ['admin'],
    'categoria-reportes.html': ['admin', 'practicante'],
    'categoria-operaciones-control.html': ['admin', 'practicante'],
    'categoria-pacientes.html': ['admin', 'practicante'],
    'menuInicio.html': ['admin', 'practicante']
};

// Páginas públicas que no requieren autenticación
const PUBLIC_PAGES = ['index.html', ''];

export class AuthGuard {
    static init() {
        console.log('AuthGuard: Inicializando sistema de autenticación');
        AuthGuard.checkAuthentication();
        AuthGuard.setupAuthListeners();
    }

    static checkAuthentication() {
        const currentPath = window.location.pathname;
        const fileName = currentPath.split('/').pop() || 'index.html';
        
        // Verificar si JWT está habilitado y manejar la autenticación correspondiente
        let usuarioActual;
        if (authModel.isJWTEnabled()) {
            console.log('AuthGuard: JWT habilitado, verificando token');
            
            // Verificar si la sesión JWT es válida
            if (authModel.isJWTSessionValid()) {
                usuarioActual = authModel.getCurrentUserFromJWT();
                console.log('AuthGuard: Usuario obtenido de JWT:', usuarioActual);
                
                // Intentar renovar token si es necesario
                authModel.renewJWTIfNeeded();
            } else {
                console.warn('AuthGuard: Sesión JWT inválida o expirada');
                usuarioActual = null;
            }
        } else {
            // Usar sistema legacy
            usuarioActual = authModel.getCurrentUser();
            console.log('AuthGuard: Usando sistema legacy, usuario:', usuarioActual);
        }
        
        console.log(`AuthGuard: Verificando ruta "${fileName}"`);
        console.log('AuthGuard: Usuario actual:', usuarioActual);
        
        // Emitir evento de carga de página
        eventBus.emit(EVENT_NAMES.PAGE_LOAD, { page: fileName, user: usuarioActual });
        
        // Si es página pública, permitir acceso
        if (PUBLIC_PAGES.includes(fileName)) {
            console.log('AuthGuard: Página pública, acceso permitido');
            return true;
        }
        
        // Si no hay usuario autenticado, redirigir a login
        if (!usuarioActual) {
            console.warn('AuthGuard: Usuario no autenticado, redirigiendo a login');
            eventBus.emit(EVENT_NAMES.SESSION_EXPIRED, { reason: 'no_user', page: fileName });
            AuthGuard.redirectToLogin();
            return false;
        }
        
        // Verificar si el usuario tiene acceso a la ruta
        const allowedRoles = PROTECTED_ROUTES[fileName];
        if (allowedRoles && !allowedRoles.includes(usuarioActual.rol)) {
            console.error(`AuthGuard: Acceso denegado. Rol "${usuarioActual.rol}" no autorizado para "${fileName}"`);
            eventBus.emit(EVENT_NAMES.PERMISSION_DENIED, { 
                user: usuarioActual, 
                page: fileName, 
                requiredRoles: allowedRoles 
            });
            AuthGuard.showAccessDenied();
            return false;
        }
        
        console.log(`AuthGuard: Acceso autorizado para rol "${usuarioActual.rol}"`);
        
        // Registrar actividad de acceso exitoso con información JWT si está habilitado
        const actividadData = {
            accion: authModel.isJWTEnabled() ? 'page_access_jwt' : 'page_access_legacy',
            descripcion: `Acceso a página: ${fileName}`,
            sistemaAuth: authModel.isJWTEnabled() ? 'JWT' : 'Legacy'
        };
        
        // Si JWT está habilitado, agregar información del token
        if (authModel.isJWTEnabled()) {
            const tokenInfo = authModel.getJWTInfo();
            if (tokenInfo && tokenInfo.valid) {
                actividadData.tokenId = tokenInfo.payload.jti;
                actividadData.tokenExp = new Date(tokenInfo.payload.exp * 1000).toISOString();
                actividadData.tiempoRestante = tokenInfo.timeLeft;
            }
        }
        
        authModel.registrarActividad(actividadData);
        
        // Emitir evento de acceso exitoso
        eventBus.emit(EVENT_NAMES.USER_LOGIN, { user: usuarioActual, page: fileName });
        
        return true;
    }

    static redirectToLogin() {
        // Guardar la URL actual para redirigir después del login
        sessionStorage.setItem('redirectAfterLogin', window.location.href);
        
        // Determinar la ruta correcta según la ubicación actual
        const currentPath = window.location.pathname;
        const isInPagesFolder = currentPath.includes('/pages/');
        const loginPath = isInPagesFolder ? '../index.html' : 'index.html';
        
        console.log(`AuthGuard: Redirigiendo a login: ${loginPath}`);
        window.location.href = loginPath;
    }

    static showAccessDenied() {
        alert('Acceso denegado: No tienes permisos para acceder a esta página.');
        
        // Redirigir al menú principal
        const currentPath = window.location.pathname;
        const isInPagesFolder = currentPath.includes('/pages/');
        const menuPath = isInPagesFolder ? '../menuInicio.html' : 'menuInicio.html';
        
        window.location.href = menuPath;
    }

    static setupAuthListeners() {
        console.log('AuthGuard: Configurando listeners de autenticación');
        
        // Detectar cambios en localStorage (logout desde otra pestaña)
        window.addEventListener('storage', (e) => {
            // Manejar logout legacy
            if (e.key === 'usuarioActual' && e.newValue === null) {
                console.log('AuthGuard: Sesión legacy cerrada en otra pestaña, redirigiendo');
                eventBus.emit(EVENT_NAMES.SESSION_EXPIRED, { reason: 'external_logout' });
                AuthGuard.redirectToLogin();
            }
            
            // Manejar logout JWT
            if (e.key === 'jwtToken' && e.newValue === null && authModel.isJWTEnabled()) {
                console.log('AuthGuard: Token JWT eliminado en otra pestaña, redirigiendo');
                eventBus.emit(EVENT_NAMES.SESSION_EXPIRED, { reason: 'jwt_token_removed' });
                AuthGuard.redirectToLogin();
            }
            
            // Manejar deshabilitado de JWT
            if (e.key === 'jwtEnabled' && e.newValue === 'false') {
                console.log('AuthGuard: JWT deshabilitado en otra pestaña');
                // Recargar la página para usar el sistema legacy
                window.location.reload();
            }
        });
        
        // Verificar autenticación periódicamente (cada 30 segundos)
        setInterval(() => {
            AuthGuard.checkAuthentication();
        }, 30000);
    }

    static logout() {
        console.log('AuthGuard: Cerrando sesión');
        
        // Obtener usuario antes del logout
        let usuario;
        if (authModel.isJWTEnabled()) {
            usuario = authModel.getCurrentUserFromJWT();
        } else {
            usuario = authModel.getCurrentUser();
        }
        
        if (usuario) {
            authModel.registrarActividad({
                accion: 'logout',
                descripcion: `Cierre de sesión manual (${authModel.isJWTEnabled() ? 'JWT' : 'Legacy'})`
            });
            
            // Emitir evento de logout antes de limpiar la sesión
            eventBus.emit(EVENT_NAMES.USER_LOGOUT, { user: usuario, timestamp: new Date().toISOString() });
        }
        
        // Logout según el sistema activo
        if (authModel.isJWTEnabled()) {
            authModel.logoutJWT();
        } else {
            authModel.logout();
        }
        
        // Emitir evento de limpieza de página
        eventBus.emit(EVENT_NAMES.PAGE_UNLOAD, { reason: 'logout' });
        
        AuthGuard.redirectToLogin();
    }

    static getCurrentUserRole() {
        let usuario;
        if (authModel.isJWTEnabled()) {
            usuario = authModel.getCurrentUserFromJWT();
        } else {
            usuario = authModel.getCurrentUser();
        }
        return usuario ? usuario.rol : null;
    }

    static isUserAuthorized(requiredRoles) {
        const currentRole = AuthGuard.getCurrentUserRole();
        if (!currentRole) return false;
        
        return Array.isArray(requiredRoles) ? 
            requiredRoles.includes(currentRole) : 
            currentRole === requiredRoles;
    }

    static validateSession() {
        let usuario;
        if (authModel.isJWTEnabled()) {
            // Validación JWT
            if (!authModel.isJWTSessionValid()) {
                console.warn('AuthGuard: Sesión JWT inválida');
                return false;
            }
            
            usuario = authModel.getCurrentUserFromJWT();
            if (!usuario) {
                console.warn('AuthGuard: No se pudo obtener usuario de JWT');
                return false;
            }
            
            // Renovar token automáticamente si es necesario
            authModel.renewJWTIfNeeded();
            
        } else {
            // Validación legacy
            usuario = authModel.getCurrentUser();
            if (!usuario) {
                console.warn('AuthGuard: No hay sesión legacy activa');
                return false;
            }
            
            // Verificar si el usuario aún existe en la base de datos
            const usuarioEnBD = authModel.validateUser(usuario.matricula || usuario.id, usuario.contrasena);
            if (!usuarioEnBD) {
                console.error('AuthGuard: Usuario no encontrado en base de datos, cerrando sesión');
                AuthGuard.logout();
                return false;
            }
        }
        
        console.log(`AuthGuard: Sesión ${authModel.isJWTEnabled() ? 'JWT' : 'legacy'} validada exitosamente`);
        return true;
    }

    static hasPermission(requiredRoles) {
        let usuario;
        if (authModel.isJWTEnabled()) {
            usuario = authModel.getCurrentUserFromJWT();
        } else {
            usuario = authModel.getCurrentUser();
        }
        
        if (!usuario) return false;
        
        return Array.isArray(requiredRoles) ? 
            requiredRoles.includes(usuario.rol) : 
            usuario.rol === requiredRoles;
    }

    static requirePermission(requiredRoles, errorMessage = 'No tienes permisos para realizar esta acción.') {
        if (!AuthGuard.hasPermission(requiredRoles)) {
            alert(errorMessage);
            console.error(`AuthGuard: Acceso denegado. Roles requeridos: ${requiredRoles}, Rol actual: ${AuthGuard.getCurrentUserRole()}`);
            return false;
        }
        return true;
    }
}

// Auto-inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('AuthGuard: DOM listo, inicializando autenticación');
    AuthGuard.init();
});

// Exportar también para uso directo
export default AuthGuard;