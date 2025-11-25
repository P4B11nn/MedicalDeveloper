// js/utils/eventBusManager.js
// Event Bus Manager for monitoring and debugging

import eventBus, { EVENT_NAMES } from './eventBus.js';

class EventBusManager {
    constructor() {
        this.eventHistory = [];
        this.maxHistorySize = 100;
        this.isLogging = true;
        this.setupGlobalListeners();
    }

    /**
     * Configure listeners for all standard events for monitoring
     */
    setupGlobalListeners() {
        Object.values(EVENT_NAMES).forEach(eventName => {
            eventBus.on(eventName, (...args) => {
                this.logEvent(eventName, args);
            });
        });
    }

    /**
     * Log event to history
     */
    logEvent(eventName, args) {
        if (!this.isLogging) return;

        const logEntry = {
            event: eventName,
            args: args,
            timestamp: new Date().toISOString(),
            listeners: eventBus.getListenerCount(eventName)
        };

        this.eventHistory.unshift(logEntry);

        // Maintain history size
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory = this.eventHistory.slice(0, this.maxHistorySize);
        }

        console.log(`EventBusManager: ${eventName}`, args);
    }

    /**
     * Get event history
     */
    getEventHistory(limit = 20) {
        return this.eventHistory.slice(0, limit);
    }

    /**
     * Get events by type
     */
    getEventsByType(eventName, limit = 10) {
        return this.eventHistory
            .filter(entry => entry.event === eventName)
            .slice(0, limit);
    }

    /**
     * Get event statistics
     */
    getEventStats() {
        const stats = {};
        
        this.eventHistory.forEach(entry => {
            if (!stats[entry.event]) {
                stats[entry.event] = {
                    count: 0,
                    lastTriggered: null
                };
            }
            stats[entry.event].count++;
            if (!stats[entry.event].lastTriggered || 
                new Date(entry.timestamp) > new Date(stats[entry.event].lastTriggered)) {
                stats[entry.event].lastTriggered = entry.timestamp;
            }
        });

        return stats;
    }

    /**
     * Create debug console commands
     */
    enableDebugConsole() {
        // Add global debugging functions
        window.EventBusDebug = {
            history: () => this.getEventHistory(),
            stats: () => this.getEventStats(),
            events: () => eventBus.getEvents(),
            listeners: (event) => eventBus.getListenerCount(event),
            info: () => eventBus.getDebugInfo(),
            emit: (event, ...args) => eventBus.emit(event, ...args),
            clear: () => {
                this.eventHistory = [];
                console.log('Event history cleared');
            },
            setLogging: (enabled) => {
                this.isLogging = enabled;
                console.log(`Event logging ${enabled ? 'enabled' : 'disabled'}`);
            }
        };

        console.log('EventBusDebug commands available:');
        console.log('- EventBusDebug.history() - Get event history');
        console.log('- EventBusDebug.stats() - Get event statistics');
        console.log('- EventBusDebug.events() - Get all event names');
        console.log('- EventBusDebug.listeners(event) - Get listener count');
        console.log('- EventBusDebug.info() - Get debug info');
        console.log('- EventBusDebug.emit(event, ...args) - Emit event');
        console.log('- EventBusDebug.clear() - Clear history');
        console.log('- EventBusDebug.setLogging(boolean) - Enable/disable logging');
    }

    /**
     * Monitor performance issues
     */
    monitorPerformance() {
        const performanceThreshold = 100; // ms
        
        // Override emit to monitor performance
        const originalEmit = eventBus.emit.bind(eventBus);
        eventBus.emit = (event, ...args) => {
            const start = performance.now();
            const result = originalEmit(event, ...args);
            const duration = performance.now() - start;
            
            if (duration > performanceThreshold) {
                console.warn(`EventBus: Slow event '${event}' took ${duration.toFixed(2)}ms`);
            }
            
            return result;
        };
    }

    /**
     * Generate report for debugging
     */
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            eventBusInfo: eventBus.getDebugInfo(),
            recentHistory: this.getEventHistory(10),
            statistics: this.getEventStats(),
            performance: {
                totalEvents: this.eventHistory.length,
                uniqueEvents: new Set(this.eventHistory.map(e => e.event)).size
            }
        };

        console.log('Event Bus Report:', report);
        return report;
    }
}

// Create singleton instance
const eventBusManager = new EventBusManager();

// Enable debug console in development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    eventBusManager.enableDebugConsole();
    eventBusManager.monitorPerformance();
}

export default eventBusManager;
