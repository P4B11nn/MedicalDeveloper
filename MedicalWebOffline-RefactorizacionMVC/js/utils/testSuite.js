// js/utils/testSuite.js
// Automated testing suite for MVC components

import eventBus, { EVENT_NAMES } from './eventBus.js';
import performanceMonitor from './performanceMonitor.js';
import architectureValidator from './architectureValidator.js';

class TestSuite {
    constructor() {
        this.tests = [];
        this.results = [];
        this.isRunning = false;
        this.enabled = this.isDevelopment();
    }

    isDevelopment() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.search.includes('test=true');
    }

    /**
     * Register a test
     */
    test(name, testFn, options = {}) {
        this.tests.push({
            name,
            testFn,
            timeout: options.timeout || 5000,
            skip: options.skip || false,
            category: options.category || 'general'
        });
    }

    /**
     * Run all tests
     */
    async runAll() {
        if (!this.enabled) {
            console.log('TestSuite: Testing disabled in production');
            return null;
        }

        if (this.isRunning) {
            console.warn('TestSuite: Tests already running');
            return null;
        }

        this.isRunning = true;
        this.results = [];
        const startTime = performance.now();

        console.log(`TestSuite: Running ${this.tests.length} tests...`);

        for (const test of this.tests) {
            if (test.skip) {
                this.results.push({
                    name: test.name,
                    status: 'skipped',
                    duration: 0,
                    error: null
                });
                continue;
            }

            const result = await this.runSingleTest(test);
            this.results.push(result);
        }

        const totalTime = performance.now() - startTime;
        const report = this.generateReport(totalTime);
        
        this.isRunning = false;
        return report;
    }

    /**
     * Run a single test
     */
    async runSingleTest(test) {
        const startTime = performance.now();
        
        try {
            // Set timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Test timeout')), test.timeout);
            });

            // Run test
            const testPromise = Promise.resolve(test.testFn());
            
            await Promise.race([testPromise, timeoutPromise]);

            return {
                name: test.name,
                category: test.category,
                status: 'passed',
                duration: performance.now() - startTime,
                error: null
            };

        } catch (error) {
            return {
                name: test.name,
                category: test.category,
                status: 'failed',
                duration: performance.now() - startTime,
                error: error.message
            };
        }
    }

    /**
     * Generate test report
     */
    generateReport(totalTime) {
        const passed = this.results.filter(r => r.status === 'passed').length;
        const failed = this.results.filter(r => r.status === 'failed').length;
        const skipped = this.results.filter(r => r.status === 'skipped').length;

        const report = {
            timestamp: new Date().toISOString(),
            totalTime: totalTime,
            summary: {
                total: this.tests.length,
                passed,
                failed,
                skipped,
                passRate: passed / (passed + failed) * 100
            },
            results: this.results,
            categories: this.groupByCategory()
        };

        // Log summary
        console.log(`TestSuite: ${passed}/${this.tests.length} tests passed (${report.summary.passRate.toFixed(1)}%)`);
        if (failed > 0) {
            console.error(`TestSuite: ${failed} tests failed`);
            this.results.filter(r => r.status === 'failed').forEach(result => {
                console.error(`  ❌ ${result.name}: ${result.error}`);
            });
        }

        return report;
    }

    /**
     * Group results by category
     */
    groupByCategory() {
        const categories = {};
        
        this.results.forEach(result => {
            const category = result.category || 'general';
            if (!categories[category]) {
                categories[category] = { passed: 0, failed: 0, skipped: 0 };
            }
            categories[category][result.status]++;
        });

        return categories;
    }

    /**
     * Setup default tests
     */
    setupDefaultTests() {
        // Event Bus tests
        this.test('EventBus - Basic functionality', () => {
            if (!eventBus) throw new Error('EventBus not available');
            
            let eventFired = false;
            const unsubscribe = eventBus.on('test:event', () => {
                eventFired = true;
            });
            
            eventBus.emit('test:event');
            unsubscribe();
            
            if (!eventFired) throw new Error('Event not fired');
        }, { category: 'eventbus' });

        // Performance tests
        this.test('Performance - Page load under threshold', () => {
            const metrics = performanceMonitor.getMetrics('pageLoad');
            if (metrics && metrics.average > 5000) {
                throw new Error(`Page load too slow: ${metrics.average}ms`);
            }
        }, { category: 'performance' });

        // Architecture tests
        this.test('Architecture - Event Bus integrity', async () => {
            const validation = await architectureValidator.validateEventBus();
            if (!validation.passed) {
                throw new Error(`Event Bus validation failed: ${validation.issues.join(', ')}`);
            }
        }, { category: 'architecture' });

        // DOM tests
        this.test('DOM - Required elements present', () => {
            const requiredElements = ['#userName', '.back-btn', '#logoutBtn'];
            const missing = requiredElements.filter(selector => !document.querySelector(selector));
            
            if (missing.length > 0) {
                throw new Error(`Missing elements: ${missing.join(', ')}`);
            }
        }, { category: 'dom' });

        // Authentication tests
        this.test('Auth - Current user exists', () => {
            const currentUser = JSON.parse(localStorage.getItem('usuarioActual'));
            if (!currentUser) {
                // No es un error crítico si no hay usuario logueado
                console.warn('No current user found - this is normal if no one is logged in');
                return true; // Pasa el test
            }
            if (!currentUser.rol) {
                throw new Error('User has no role');
            }
            return true;
        }, { category: 'auth' });

        // LocalStorage tests
        this.test('Storage - Basic functionality', () => {
            const testKey = 'test-key-' + Date.now();
            const testValue = { test: true };
            
            localStorage.setItem(testKey, JSON.stringify(testValue));
            const retrieved = JSON.parse(localStorage.getItem(testKey));
            localStorage.removeItem(testKey);
            
            if (!retrieved || !retrieved.test) {
                throw new Error('LocalStorage read/write failed');
            }
        }, { category: 'storage' });
    }

    /**
     * Enable debug console
     */
    enableDebugConsole() {
        window.TestSuite = {
            runAll: () => this.runAll(),
            runCategory: (category) => this.runCategory(category),
            getResults: () => this.results,
            addTest: (name, fn, options) => this.test(name, fn, options),
            listTests: () => this.tests.map(t => ({ 
                name: t.name, 
                category: t.category, 
                skip: t.skip 
            }))
        };

        console.log('TestSuite commands available:');
        console.log('- TestSuite.runAll() - Run all tests');
        console.log('- TestSuite.runCategory(category) - Run tests by category');
        console.log('- TestSuite.getResults() - Get last test results');
        console.log('- TestSuite.addTest(name, fn, options) - Add custom test');
        console.log('- TestSuite.listTests() - List all registered tests');
    }

    /**
     * Run tests by category
     */
    async runCategory(category) {
        const categoryTests = this.tests.filter(t => t.category === category);
        
        if (categoryTests.length === 0) {
            console.warn(`TestSuite: No tests found for category '${category}'`);
            return null;
        }

        console.log(`TestSuite: Running ${categoryTests.length} tests for category '${category}'`);
        
        const originalTests = this.tests;
        this.tests = categoryTests;
        
        const result = await this.runAll();
        
        this.tests = originalTests;
        return result;
    }
}

// Create singleton instance
const testSuite = new TestSuite();

// Setup default tests and enable console
if (testSuite.enabled) {
    testSuite.setupDefaultTests();
    testSuite.enableDebugConsole();
    
    // Auto-run basic tests after page load
    window.addEventListener('load', () => {
        setTimeout(() => {
            console.log('TestSuite: Auto-running basic validation tests...');
            testSuite.runCategory('dom').then(() => {
                testSuite.runCategory('auth');
            });
        }, 3000);
    });
}

export default testSuite;