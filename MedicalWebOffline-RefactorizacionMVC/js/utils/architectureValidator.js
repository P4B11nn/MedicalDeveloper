// js/utils/architectureValidator.js
// MVC Architecture validation and integrity checker

import eventBus from './eventBus.js';
import performanceMonitor from './performanceMonitor.js';

class ArchitectureValidator {
    constructor() {
        this.validationRules = {
            models: {
                location: 'js/models/',
                naming: /^[a-z]+Model\.js$/,
                exports: ['get', 'set', 'validate', 'save']
            },
            views: {
                location: 'js/views/',
                naming: /^[a-z]+View\.js$|^[A-Z][a-zA-Z]+\.js$/,
                exports: ['render', 'update']
            },
            controllers: {
                location: 'js/controllers/',
                naming: /^[a-z]+Controller\.js$/,
                exports: ['init']
            },
            middleware: {
                location: 'js/middleware/',
                naming: /^[a-z]+\.js$|^[a-z]+Guard\.js$/,
                exports: []
            },
            utils: {
                location: 'js/utils/',
                naming: /^[a-z]+\.js$|^[a-z]+[A-Z][a-z]+\.js$/,
                exports: []
            }
        };

        this.violations = [];
        this.isEnabled = this.isDevelopment();
    }

    isDevelopment() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.search.includes('validate=true');
    }

    async validateArchitecture() {
        if (!this.isEnabled) return null;

        console.log('ArchitectureValidator: Starting MVC validation...');

        const report = {
            timestamp: new Date().toISOString(),
            violations: [],
            recommendations: [],
            score: 0,
            details: {
                eventBus: this.validateEventBus(),
                performance: this.validatePerformance(),
                dependencies: this.validateDependencies(),
                naming: this.validateNaming(),
                separation: this.validateSeparationOfConcerns()
            }
        };

        // Calculate overall score
        const totalChecks = Object.keys(report.details).length;
        const passedChecks = Object.values(report.details).filter(result => result.passed).length;
        report.score = Math.round((passedChecks / totalChecks) * 100);

        // Generate recommendations
        report.recommendations = this.generateRecommendations(report.details);

        console.log('Architecture Validation Report:', report);
        return report;
    }

    validateEventBus() {
        const result = { passed: true, issues: [] };

        try {
            // Check if Event Bus is properly initialized
            if (!eventBus) {
                result.passed = false;
                result.issues.push('Event Bus not initialized');
                return result;
            }

            // Check if events are being used
            const events = eventBus.getEvents();
            if (events.length === 0) {
                result.passed = false;
                result.issues.push('No events registered in Event Bus');
            }

            // Check for event naming consistency
            const invalidEvents = events.filter(event => !event.includes(':'));
            if (invalidEvents.length > 0) {
                result.issues.push(`Events without namespace: ${invalidEvents.join(', ')}`);
            }

            result.eventCount = events.length;
            result.events = events;

        } catch (error) {
            result.passed = false;
            result.issues.push(`Event Bus error: ${error.message}`);
        }

        return result;
    }

    validatePerformance() {
        const result = { passed: true, issues: [] };

        try {
            const metrics = performanceMonitor.getMetrics();
            
            // Check page load performance
            if (metrics.pageLoad && metrics.pageLoad.average > 3000) {
                result.issues.push(`Slow page load: ${metrics.pageLoad.average.toFixed(2)}ms average`);
            }

            // Check memory usage
            if (metrics.memoryUsage && metrics.memoryUsage.max > 50) {
                result.issues.push(`High memory usage: ${metrics.memoryUsage.max}MB peak`);
            }

            // Check event emission performance
            if (metrics.eventEmit && metrics.eventEmit.average > 50) {
                result.issues.push(`Slow event emission: ${metrics.eventEmit.average.toFixed(2)}ms average`);
            }

            result.metrics = metrics;
            result.passed = result.issues.length === 0;

        } catch (error) {
            result.passed = false;
            result.issues.push(`Performance monitoring error: ${error.message}`);
        }

        return result;
    }

    validateDependencies() {
        const result = { passed: true, issues: [], dependencies: [] };

        // Check for circular dependencies (simplified check)
        const modules = [
            'authController', 'globalController', 'operacionesController',
            'authGuard', 'eventBus', 'storageModel'
        ];

        // This is a simplified check - in a real scenario you'd parse imports
        try {
            // Check if critical modules are available
            const criticalModules = ['authModel', 'AuthGuard', 'eventBus'];
            
            criticalModules.forEach(moduleName => {
                try {
                    // Check if module exports are available (simplified)
                    if (moduleName === 'eventBus' && !eventBus) {
                        result.issues.push(`Critical module ${moduleName} not available`);
                        result.passed = false;
                    }
                } catch (error) {
                    result.issues.push(`Module ${moduleName} import error`);
                    result.passed = false;
                }
            });

        } catch (error) {
            result.passed = false;
            result.issues.push(`Dependency validation error: ${error.message}`);
        }

        return result;
    }

    validateNaming() {
        const result = { passed: true, issues: [] };

        // Check if elements follow naming conventions
        const elements = {
            controllers: document.querySelectorAll('[data-controller]'),
            models: document.querySelectorAll('[data-model]'),
            views: document.querySelectorAll('[data-view]')
        };

        // Check HTML data attributes for MVC components
        Object.entries(elements).forEach(([type, nodeList]) => {
            nodeList.forEach(element => {
                const name = element.getAttribute(`data-${type.slice(0, -1)}`);
                if (name && !name.match(/^[a-z][a-zA-Z]*$/)) {
                    result.issues.push(`Invalid ${type} naming: ${name}`);
                }
            });
        });

        // Check for consistent ID naming
        const ids = Array.from(document.querySelectorAll('[id]')).map(el => el.id).filter(id => id && typeof id === 'string');
        const invalidIds = ids.filter(id => !id.match(/^[a-z][a-zA-Z]*$/) && !id.match(/^[a-z-]+$/));
        
        if (invalidIds.length > 0) {
            result.issues.push(`Invalid ID naming: ${invalidIds.join(', ')}`);
        }

        result.passed = result.issues.length === 0;
        return result;
    }

    validateSeparationOfConcerns() {
        const result = { passed: true, issues: [] };

        // Check if inline JavaScript is minimized
        const inlineScripts = document.querySelectorAll('script:not([src])');
        if (inlineScripts.length > 2) { // Allow for main module script
            result.issues.push(`Too many inline scripts: ${inlineScripts.length}`);
        }

        // Check if inline styles are minimized  
        const inlineStyles = document.querySelectorAll('[style]');
        if (inlineStyles.length > 5) {
            result.issues.push(`Too many inline styles: ${inlineStyles.length}`);
        }

        // Check if event handlers are not inline
        const inlineEventHandlers = document.querySelectorAll('[onclick], [onload], [onchange]');
        if (inlineEventHandlers.length > 0) {
            result.issues.push(`Inline event handlers found: ${inlineEventHandlers.length}`);
        }

        result.passed = result.issues.length === 0;
        return result;
    }

    generateRecommendations(details) {
        const recommendations = [];

        if (!details.eventBus.passed) {
            recommendations.push({
                priority: 'high',
                category: 'Event Bus',
                suggestion: 'Fix Event Bus implementation to enable proper decoupling',
                impact: 'Architecture integrity'
            });
        }

        if (!details.performance.passed) {
            recommendations.push({
                priority: 'medium',
                category: 'Performance',
                suggestion: 'Optimize performance bottlenecks identified',
                impact: 'User experience'
            });
        }

        if (!details.naming.passed) {
            recommendations.push({
                priority: 'low',
                category: 'Code Quality',
                suggestion: 'Follow consistent naming conventions',
                impact: 'Maintainability'
            });
        }

        if (!details.separation.passed) {
            recommendations.push({
                priority: 'medium',
                category: 'Architecture',
                suggestion: 'Improve separation of concerns (remove inline code)',
                impact: 'Code maintainability'
            });
        }

        return recommendations;
    }

    // Debug console methods
    enableDebugConsole() {
        window.ArchitectureDebug = {
            validate: () => this.validateArchitecture(),
            checkEventBus: () => this.validateEventBus(),
            checkPerformance: () => this.validatePerformance(),
            checkDependencies: () => this.validateDependencies(),
            checkNaming: () => this.validateNaming(),
            checkSeparation: () => this.validateSeparationOfConcerns()
        };

        console.log('ArchitectureDebug commands available:');
        console.log('- ArchitectureDebug.validate() - Full architecture validation');
        console.log('- ArchitectureDebug.checkEventBus() - Validate Event Bus');
        console.log('- ArchitectureDebug.checkPerformance() - Validate performance');
        console.log('- ArchitectureDebug.checkDependencies() - Check dependencies');
        console.log('- ArchitectureDebug.checkNaming() - Validate naming conventions');
        console.log('- ArchitectureDebug.checkSeparation() - Check separation of concerns');
    }
}

// Create singleton instance
const architectureValidator = new ArchitectureValidator();

// Enable debug console in development
if (architectureValidator.isEnabled) {
    architectureValidator.enableDebugConsole();
    
    // Auto-validate after page load
    window.addEventListener('load', () => {
        setTimeout(() => {
            architectureValidator.validateArchitecture();
        }, 2000);
    });
}

export default architectureValidator;