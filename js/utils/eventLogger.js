// js/utils/eventLogger.js
// Módulo para registrar eventos del sistema en la consola

import eventBus, { EVENT_NAMES } from './eventBus.js';

/**
 * Configura el registro de eventos específicos en la consola
 */
export function setupEventLogging() {
    // Eventos de usuarios
    eventBus.on(EVENT_NAMES.USER_EDIT_REQUESTED, (data) => {
        console.group('🖋️ Solicitud de Edición de Usuario');
        console.log('Usuario:', data.user);
        console.log('Índice:', data.userIndex);
        console.log('Hora:', new Date(data.timestamp).toLocaleTimeString());
        console.groupEnd();
    });

    eventBus.on(EVENT_NAMES.USER_DELETE_REQUESTED, (data) => {
        console.group('🗑️ Solicitud de Eliminación de Usuario');
        console.log('Usuario:', data.user);
        console.log('Hora:', new Date(data.timestamp).toLocaleTimeString());
        console.groupEnd();
    });

    eventBus.on(EVENT_NAMES.USER_UPDATED, (data) => {
        if (data.success) {
            console.group('✅ Usuario Actualizado');
            console.log('Usuario Original:', data.original);
            console.log('Usuario Actualizado:', data.updated);
            console.log('Cambios Aplicados:', data.changes);
            console.log('Hora:', new Date(data.timestamp).toLocaleTimeString());
            console.groupEnd();
        } else {
            console.group('❌ Error al Actualizar Usuario');
            console.log('Índice:', data.userIndex);
            console.log('Cambios Intentados:', data.changes);
            console.log('Error:', data.error);
            console.log('Hora:', new Date(data.timestamp).toLocaleTimeString());
            console.groupEnd();
        }
    });

    eventBus.on(EVENT_NAMES.USER_DELETED, (data) => {
        if (data.success) {
            console.group('✅ Usuario Eliminado');
            console.log('Usuario:', data.user);
            console.log('Hora:', new Date(data.timestamp).toLocaleTimeString());
            console.groupEnd();
        } else {
            console.group('❌ Error al Eliminar Usuario');
            console.log('Índice:', data.userIndex);
            console.log('Error:', data.error);
            console.log('Hora:', new Date(data.timestamp).toLocaleTimeString());
            console.groupEnd();
        }
    });

    // --- NUEVO BLOQUE PARA EVENTOS DE GESTIÓN ---
    // Eventos de Gestión Administrativa
    eventBus.on(EVENT_NAMES.MODULE_CREATED, (data) => {
        console.group('🏗️ Módulo Creado');
        console.log('Datos del Módulo:', data.module);
        console.log('Hora:', new Date().toLocaleTimeString());
        console.groupEnd();
    });

    eventBus.on(EVENT_NAMES.MODULE_UPDATED, (data) => {
        console.group('🔄 Módulo Actualizado');
        console.log('Datos del Módulo:', data.module);
        console.log('Hora:', new Date().toLocaleTimeString());
        console.groupEnd();
    });

    eventBus.on(EVENT_NAMES.MODULE_DELETED, (data) => {
        console.group('🗑️ Módulo Eliminado');
        console.log('Módulo:', data.module);
        console.log('Hora:', new Date().toLocaleTimeString());
        console.groupEnd();
    });

    eventBus.on(EVENT_NAMES.GROUP_CREATED, (data) => {
        console.group('👥 Grupo Creado');
        console.log('Datos del Grupo:', data.group);
        console.log('Hora:', new Date().toLocaleTimeString());
        console.groupEnd();
    });
    
    eventBus.on(EVENT_NAMES.GROUP_UPDATED, (data) => {
        console.group('🔄 Grupo Actualizado');
        console.log('Datos del Grupo:', data.group);
        console.log('Hora:', new Date().toLocaleTimeString());
        console.groupEnd();
    });

    eventBus.on(EVENT_NAMES.GROUP_DELETED, (data) => {
        console.group('🗑️ Grupo Eliminado');
        console.log('Grupo:', data.group);
        console.log('Hora:', new Date().toLocaleTimeString());
        console.groupEnd();
    });
    
    eventBus.on(EVENT_NAMES.GROUP_ASSIGNED, (data) => {
        console.group('🔗 Grupo Asignado a Módulo');
        console.log('Módulo ID:', data.moduloId);
        console.log('Grupo ID:', data.grupoId);
        console.log('Hora:', new Date().toLocaleTimeString());
        console.groupEnd();
    });
    // --- FIN DEL NUEVO BLOQUE ---

    // Más eventos pueden agregarse aquí según sea necesario
    
    console.log('🔄 Sistema de registro de eventos inicializado');
}

export default { setupEventLogging };