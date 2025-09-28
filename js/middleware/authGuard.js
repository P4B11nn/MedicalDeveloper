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
        const usuarioActual = authModel.getCurrentUser();
        
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
        
        // Registrar actividad de acceso exitoso
        authModel.registrarActividad({
            accion: 'page_access',
            descripcion: `Acceso a página: ${fileName}`
        });
        
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
            if (e.key === 'usuarioActual' && e.newValue === null) {
                console.log('AuthGuard: Sesión cerrada en otra pestaña, redirigiendo');
                eventBus.emit(EVENT_NAMES.SESSION_EXPIRED, { reason: 'external_logout' });
                AuthGuard.redirectToLogin();
            }
        });
        
        // Verificar autenticación periódicamente (cada 30 segundos)
        setInterval(() => {
            AuthGuard.checkAuthentication();
        }, 30000);
    }

    static logout() {
        console.log('AuthGuard: Cerrando sesión');
        
        const usuario = authModel.getCurrentUser();
        if (usuario) {
            authModel.registrarActividad({
                accion: 'logout',
                descripcion: 'Cierre de sesión manual'
            });
            
            // Emitir evento de logout antes de limpiar la sesión
            eventBus.emit(EVENT_NAMES.USER_LOGOUT, { user: usuario, timestamp: new Date().toISOString() });
        }
        
        authModel.logout();
        
        // Emitir evento de limpieza de página
        eventBus.emit(EVENT_NAMES.PAGE_UNLOAD, { reason: 'logout' });
        
        AuthGuard.redirectToLogin();
    }

    static getCurrentUserRole() {
        const usuario = authModel.getCurrentUser();
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
        const usuario = authModel.getCurrentUser();
        if (!usuario) {
            console.warn('AuthGuard: No hay sesión activa');
            return false;
        }
        
        // Verificar si el usuario aún existe en la base de datos
        const usuarioEnBD = authModel.validateUser(usuario.matricula || usuario.id, usuario.contrasena);
        if (!usuarioEnBD) {
            console.error('AuthGuard: Usuario no encontrado en base de datos, cerrando sesión');
            AuthGuard.logout();
            return false;
        }
        
        // Verificar si el estado del usuario es activo
        if (usuarioEnBD.estado !== 'activo') {
            console.error('AuthGuard: Usuario inactivo, cerrando sesión');
            alert('Su cuenta ha sido desactivada. Contacte al administrador.');
            AuthGuard.logout();
            return false;
        }
        
        console.log('AuthGuard: Sesión validada exitosamente');
        return true;
    }

    static hasPermission(requiredRoles) {
        const usuario = authModel.getCurrentUser();
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