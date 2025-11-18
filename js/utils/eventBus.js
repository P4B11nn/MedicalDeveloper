// js/utils/eventBus.js
// Event Bus pattern implementation for decoupling components

class EventBus {
    constructor() {
        this.events = {};
        this.debug = true; // Set to false in production
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @param {Object} context - Context for the callback (optional)
     * @returns {Function} - Unsubscribe function
     */
    on(event, callback, context = null) {
        if (typeof callback !== 'function') {
            console.error('EventBus: Callback must be a function');
            return;
        }

        if (!this.events[event]) {
            this.events[event] = [];
        }

        const listener = {
            callback,
            context,
            id: Date.now() + Math.random()
        };

        this.events[event].push(listener);

        if (this.debug) {
            console.log(`EventBus: Subscribed to '${event}' (ID: ${listener.id})`);
        }

        // Return unsubscribe function
        return () => this.off(event, listener.id);
    }

    /**
     * Subscribe to an event only once
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @param {Object} context - Context for the callback (optional)
     * @returns {Function} - Unsubscribe function
     */
    once(event, callback, context = null) {
        const unsubscribe = this.on(event, (...args) => {
            unsubscribe();
            callback.apply(context, args);
        }, context);

        return unsubscribe;
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {string|number} listenerId - Listener ID (optional, removes all if not provided)
     */
    off(event, listenerId = null) {
        if (!this.events[event]) {
            return;
        }

        if (listenerId) {
            this.events[event] = this.events[event].filter(listener => listener.id !== listenerId);
            if (this.debug) {
                console.log(`EventBus: Unsubscribed from '${event}' (ID: ${listenerId})`);
            }
        } else {
            // Remove all listeners for this event
            const count = this.events[event].length;
            this.events[event] = [];
            if (this.debug) {
                console.log(`EventBus: Removed all ${count} listeners for '${event}'`);
            }
        }

        // Clean up empty event arrays
        if (this.events[event].length === 0) {
            delete this.events[event];
        }
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {...any} args - Arguments to pass to callbacks
     * @returns {number} - Number of listeners called
     */
    emit(event, ...args) {
        if (!this.events[event] || this.events[event].length === 0) {
            if (this.debug) {
                console.log(`EventBus: No listeners for event '${event}'`);
            }
            return 0;
        }

        const listeners = [...this.events[event]]; // Create a copy to avoid issues with modifications during iteration
        let calledCount = 0;

        if (this.debug) {
            console.log(`EventBus: Emitting '${event}' to ${listeners.length} listeners`, args);
        }

        listeners.forEach(listener => {
            try {
                if (listener.context) {
                    listener.callback.apply(listener.context, args);
                } else {
                    listener.callback(...args);
                }
                calledCount++;
            } catch (error) {
                console.error(`EventBus: Error in listener for '${event}':`, error);
            }
        });

        return calledCount;
    }

    /**
     * Get all registered events
     * @returns {Array} - Array of event names
     */
    getEvents() {
        return Object.keys(this.events);
    }

    /**
     * Get listener count for an event
     * @param {string} event - Event name
     * @returns {number} - Number of listeners
     */
    getListenerCount(event) {
        return this.events[event] ? this.events[event].length : 0;
    }

    /**
     * Clear all events and listeners
     */
    clear() {
        const eventCount = Object.keys(this.events).length;
        this.events = {};
        
        if (this.debug) {
            console.log(`EventBus: Cleared all events (${eventCount} events removed)`);
        }
    }

    /**
     * Enable or disable debug logging
     * @param {boolean} enabled - Whether to enable debug logging
     */
    setDebug(enabled) {
        this.debug = enabled;
        console.log(`EventBus: Debug logging ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get debug information about current state
     * @returns {Object} - Debug information
     */
    getDebugInfo() {
        const info = {
            eventCount: Object.keys(this.events).length,
            events: {}
        };

        Object.keys(this.events).forEach(event => {
            info.events[event] = {
                listenerCount: this.events[event].length,
                listeners: this.events[event].map(l => ({
                    id: l.id,
                    hasContext: !!l.context
                }))
            };
        });

        return info;
    }
}

// Create and export singleton instance
const eventBus = new EventBus();

// Define standard event names to prevent typos
export const EVENT_NAMES = {
    // Authentication events
    USER_LOGIN: 'user:login',
    USER_LOGOUT: 'user:logout',
    SESSION_EXPIRED: 'session:expired',
    PERMISSION_DENIED: 'permission:denied',

    // Navigation events
    PAGE_LOAD: 'page:load',
    PAGE_UNLOAD: 'page:unload',
    NAVIGATE_TO: 'navigate:to',
    BACK_BUTTON_CLICKED: 'navigate:back',

    // Data events
    DATA_LOADED: 'data:loaded',
    DATA_SAVED: 'data:saved',
    DATA_DELETED: 'data:deleted',
    DATA_ERROR: 'data:error',

    // UI events
    SIDEBAR_TOGGLE: 'ui:sidebar:toggle',
    MODAL_OPEN: 'ui:modal:open',
    MODAL_CLOSE: 'ui:modal:close',
    FILTER_CHANGED: 'ui:filter:changed',
    EXPORT_REQUESTED: 'ui:export:requested',
    USER_DISPLAY_UPDATED: 'ui:user:display:updated',
    USER_DROPDOWN_TOGGLED: 'ui:user:dropdown:toggled',

    // Specific module events
    PACIENTE_CREATED: 'paciente:created',
    PACIENTE_UPDATED: 'paciente:updated',
    PACIENTE_DELETED: 'paciente:deleted',

    USER_CREATED: 'user:created',
    USER_UPDATED: 'user:updated',
    USER_DELETED: 'user:deleted',
    USER_EDIT_REQUESTED: 'user:edit:requested',
    USER_DELETE_REQUESTED: 'user:delete:requested',

    OPERACION_CREATED: 'operacion:created',
    OPERACION_UPDATED: 'operacion:updated',
    OPERACION_DELETED: 'operacion:deleted',

    REPORTE_GENERATED: 'reporte:generated',
    REPORTE_EXPORTED: 'reporte:exported',

    // --- NUEVOS EVENTOS PARA GESTIÓN ---
    MODULE_CREATED: 'module:created',
    MODULE_UPDATED: 'module:updated',
    MODULE_DELETED: 'module:deleted',
    GROUP_CREATED: 'group:created',
    GROUP_UPDATED: 'group:updated',
    GROUP_DELETED: 'group:deleted',
    GROUP_ASSIGNED: 'group:assigned',

    // Activity logging events
    ACTIVITY_LOGGED: 'activity:logged',
    ACTIVITY_SYNC_COMPLETED: 'activity:sync:completed',
    
    // Offline sync events
    OFFLINE_DATA_SAVED: 'offline:data:saved',
    SYNC_STARTED: 'sync:started',
    SYNC_PROGRESS: 'sync:progress',
    SYNC_COMPLETED: 'sync:completed',
    SYNC_FAILED: 'sync:failed',
    CONNECTION_STATUS_CHANGED: 'connection:status:changed'
};

export default eventBus;
export { EventBus, eventBus };