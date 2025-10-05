// js/middleware/authGuard.js
import { authModel } from '../models/storageModel.js';

export class AuthGuard {
    static checkAuthentication() {
        console.log('AuthGuard: Verificando autenticacion');
        const user = authModel.getCurrentUser();
        console.log('AuthGuard: Usuario actual:', user);
        
        if (!user) {
            console.warn('AuthGuard: No hay usuario autenticado');
            return false;
        }
        
        console.log('AuthGuard: Usuario autenticado correctamente');
        return true;
    }
    
    static validateSession(requiredRoles = null) {
        console.log('AuthGuard: Validando sesión', requiredRoles ? `con roles: ${requiredRoles}` : '');
        const user = authModel.getCurrentUser();
        
        if (!user) {
            console.warn('AuthGuard: Sesión inválida, redirigiendo al login');
            this.redirectToLogin();
            return false;
        }
        
        // Si se especifican roles requeridos, verificar permisos
        if (requiredRoles && Array.isArray(requiredRoles)) {
            if (!requiredRoles.includes(user.rol)) {
                console.error(`AuthGuard: Acceso denegado. Rol "${user.rol}" no autorizado. Roles requeridos: ${requiredRoles.join(', ')}`);
                alert('No tienes permisos para acceder a esta sección.');
                return false;
            }
        }
        
        console.log('AuthGuard: Sesión válida para usuario:', user.nombre);
        return true;
    }
    
    static redirectToLogin() {
        console.log('AuthGuard: Redirigiendo al login');
        window.location.href = '/index.html';
    }
    
    static hasPermission(requiredRoles) {
        const user = authModel.getCurrentUser();
        if (!user) return false;
        
        if (Array.isArray(requiredRoles)) {
            return requiredRoles.includes(user.rol);
        }
        
        return true;
    }
    
    static requirePermission(requiredRoles, errorMessage = 'No tienes permisos para realizar esta acción.') {
        if (!this.hasPermission(requiredRoles)) {
            alert(errorMessage);
            return false;
        }
        return true;
    }
}
